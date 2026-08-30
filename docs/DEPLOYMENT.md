# Vassment One Booking OS — Production Deployment Gate

이 문서는 VASSMENT ONE Booking OS를 실제 운영에 투입하기 전에 반드시 통과해야 하는 release gate입니다.

## 0. 절대 조건

- 운영 고객정보·DB 비밀번호·PG secret을 현재 PUBLIC 테스트 저장소에 커밋하지 않는다.
- 실제 운영 전 코드는 PRIVATE 전용 저장소 또는 적절하게 접근 제한된 저장소로 이전한다.
- 카드번호(PAN), CVC, 카드 유효기간을 Booking OS DB나 로그에 저장하지 않는다.
- production DB에 `db:push`를 사용하지 않는다. 검토된 migration만 적용한다.
- `main` 배포 전에 CI가 PostgreSQL integration smoke test까지 모두 통과해야 한다.

## 1. 운영 인프라

필수 구성:

1. HTTPS가 적용된 Application URL
2. PostgreSQL 17 호환 관리형 DB
3. 애플리케이션 secret 저장소
4. 정기 job 실행 수단
5. DB 자동 백업
6. 오류/가용성 모니터링

CI는 PostgreSQL 17 컨테이너에서 schema, bootstrap, hardening, 핵심 예약/결제 흐름을 검증한다.

## 2. 필수 환경변수

```text
DATABASE_URL
APP_URL
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
CUSTOMER_PORTAL_SECRET
INTEGRATION_WEBHOOK_SECRET
AUTOMATION_SECRET
TOSS_CLIENT_KEY
TOSS_SECRET_KEY
```

권장 규칙:

- `APP_URL`: production HTTPS origin, trailing slash 없음
- `ADMIN_PASSWORD`: 충분히 긴 무작위 비밀번호
- `ADMIN_SESSION_SECRET`: 최소 32 random bytes
- `CUSTOMER_PORTAL_SECRET`: admin secret과 다른 최소 32 random bytes
- `INTEGRATION_WEBHOOK_SECRET`: chatbot/backend 전용 무작위 값
- `AUTOMATION_SECRET`: cron/job 전용 무작위 값
- Toss 테스트 단계: `test_ck...`, `test_sk...`
- Toss 라이브 단계: `live_ck...`, `live_sk...`

Secret은 배포 플랫폼 secret store에만 저장한다.

## 3. Production DB release 절차

### 최초 구축

1. 현재 schema에서 migration SQL 생성
2. SQL을 사람이 검토
3. backup/restore 가능한 production DB 준비
4. migration 적용
5. `db/bootstrap.sql`을 최초 1회 적용
6. `db/hardening.sql` 적용
7. B1 / 1F 초기 공간 ID 확인
8. `/api/health`가 HTTP 200인지 확인

### 이후 배포

- schema 변경은 migration 파일로만 배포
- destructive migration은 백업 후 별도 승인
- `db/bootstrap.sql`을 반복해서 운영 데이터 초기화 용도로 사용하지 않는다
- production에 `drizzle-kit push --force`를 사용하지 않는다

## 4. Booking E2E gate

실제 production-like staging DB에서 아래를 순서대로 실행한다.

1. 홈페이지 문의 생성
2. 관리자 CRM에 inbound lead 생성 확인
3. inquiry booking 확인
4. inquiry → HOLD 승격
5. B1/1F calendar block 확인
6. 동일 공간·중복 시간 예약이 거절되는지 확인
7. 다른 공간의 같은 시간 예약은 허용되는지 확인
8. HOLD 연장
9. HOLD → confirmed
10. setup / teardown 점유시간 확인
11. 예약 취소 시 schedule block 해제 확인
12. 만료 HOLD job 실행 후 자동 해제 확인

## 5. HOLD 자동만료 job

Endpoint:

```http
POST /api/jobs/expire-holds
x-automation-secret: <AUTOMATION_SECRET>
```

운영에서는 최소 5~15분 간격의 scheduler를 권장한다.

검증 항목:

- 잘못된 secret → 401
- 정상 secret → 200
- 만료 전 HOLD는 유지
- 만료된 HOLD만 cancelled
- 해당 schedule block의 `cancelled_at` 반영

## 6. Toss Payments 테스트 → 라이브 gate

### 테스트 환경

1. Toss 개발자센터에서 테스트 client/secret key 발급
2. `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`에 테스트키 설정
3. 고객 예약 포털에서 미수금 청구 생성
4. 카드결제 페이지 진입
5. 결제 승인
6. Booking OS payment request가 `paid` 또는 `partially_paid`로 변경되는지 확인
7. 관리자 화면에서 부분환불
8. Toss 취소 성공 후에만 refund 거래가 생성되는지 확인
9. 전액환불 확인
10. 같은 요청 재시도 시 이중 결제/이중 환불이 발생하지 않는지 확인

### 웹훅

등록 URL:

```text
<APP_URL>/api/webhooks/toss
```

등록 이벤트:

```text
PAYMENT_STATUS_CHANGED
```

일반 결제 웹훅 본문은 직접 신뢰하지 않는다. Endpoint는 `paymentKey`로 Toss Payment 조회 API를 다시 호출한 결과를 기준으로 reconciliation 한다.

검증 항목:

- 동일 웹훅 반복 전송 → refund 중복 생성 없음
- Toss 관리자 화면에서 외부 부분취소 → Booking OS에서 취소 총액 차액만 자동 보정
- PG 조회 실패/DB 장애 → 5xx로 처리되어 재시도 가능

### Live 전환

아래가 모두 통과한 뒤에만 live key로 변경한다.

- 테스트 카드 승인
- 부분환불
- 전액환불
- 웹훅 reconciliation
- 모바일 결제 리다이렉트
- 고객 포털 복귀
- 관리자 payment ledger 일치

## 7. 기존 VASSMENT ONE 홈페이지 연결

고객 예약 모듈:

```text
/reserve
```

권장 방식:

- 홈페이지와 동일 origin/path 아래에서 route 또는 reverse proxy로 노출
- 단순 cross-origin iframe은 최후의 대안
- PC: 예약 폼 + 요약 패널
- Mobile: single-column flow

연결 후 확인:

- 홈페이지 CTA → `/reserve`
- availability 정상
- 문의 생성 정상
- 완료 화면 reference 표시
- 다른 고객 예약 상세/HOLD 정보 미노출

## 8. 고객 예약 포털

형식:

```text
/reservation/<booking-id>?token=<signed-token>
```

검증:

- 만료/변조 token 차단
- 견적 `sent/accepted`만 고객에게 노출
- 계약 `sent/signed`만 고객에게 노출
- 결제 요청/수납 현황 표시
- 온라인 카드 미수금만 결제 가능
- 고객 portal token을 Toss success/fail URL에 그대로 전달하지 않음

## 9. 기존 챗봇 연결

Trusted backend header:

```text
x-integration-secret: <INTEGRATION_WEBHOOK_SECRET>
```

주요 API:

```text
GET   /api/availability
POST  /api/bookings
PATCH /api/bookings/<booking-id>
```

챗봇은 자체 예약 DB를 만들지 않는다. Booking OS가 Source of Truth다.

## 10. 외부 영업 채널

Production launch 이후 또는 별도 gate로 연결:

- email adapter
- Kakao Channel adapter
- SNS adapter
- prospect discovery provider

자동 발송은 suppression/중복/승인 gate를 둔 뒤 활성화한다.

## 11. 보안 gate

- 관리자 URL HTTPS only
- HttpOnly/Secure session cookie 확인
- admin password brute-force 방어는 edge/WAF rate limit 적용
- `/reserve` inquiry bot/spam 방어 적용
- API secret은 로그 출력 금지
- Toss secret은 브라우저 bundle에 포함되지 않는지 확인
- customer portal token이 access log/referrer를 통해 외부로 전달되지 않도록 정책 확인
- production error response에 stack trace/secret 미노출

## 12. Backup / Restore

Go-live 전 최소 1회 restore drill을 한다.

필수:

- 자동 일간 백업
- point-in-time recovery 가능 여부 확인
- restore 절차 문서화
- DB 복구 후 `/api/health` + Booking E2E smoke 수행

## 13. 관측성

최소 모니터링:

- `/api/health`
- HTTP 5xx
- DB connection failure
- Toss confirm/cancel/query failure
- HOLD expiry job failure
- webhook reconciliation failure
- inquiry API 오류율

## 14. Go / No-Go

### GO

- CI 전체 green
- production migration review 완료
- DB backup/restore 확인
- HTTPS/domain 확인
- admin login 확인
- 홈페이지 inquiry E2E 확인
- HOLD/confirmed/cancel 확인
- Toss test 승인/환불/webhook 확인
- cron 확인
- chatbot integration 확인

### NO-GO

아래 하나라도 해당되면 live 전환하지 않는다.

- DB migration 미검토
- backup 없음
- Toss test refund 미검증
- webhook 미등록/미검증
- HOLD job 미실행
- admin/customer secret 누락
- PUBLIC 저장소에 production secret/고객정보 존재

## 15. Rollback

문제 발생 시 우선순위:

1. 고객 `/reserve` CTA 비활성화
2. Toss live 결제 버튼 비활성화 또는 키 제거
3. outbound automation 중지
4. 직전 안정 application release로 rollback
5. DB schema는 임의 downgrade하지 말고 migration/backup 계획에 따라 복구
6. 필요한 경우 수동 예약/결제 운영으로 전환

Booking OS의 DB를 Source of Truth로 유지하고, 복구 중 별도 임시 예약 DB를 만들지 않는다.
