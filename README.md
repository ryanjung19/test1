# StockPulse

급상승 감지·거래량 급증·관련 뉴스/공시를 제공하는 유료 구독형 시장정보 서비스의 구현 기반입니다. 공개 UI는 단일 StockPulse 서비스이며 전문가 실명을 노출하지 않습니다. 현재 시장 데이터는 모두 DEMO이고 유료 판매·자동 청구는 시작되지 않았습니다.

## 실행과 검증

Node.js 22.12+ 또는 24를 사용합니다. CI는 Node 22입니다.

```bash
npm ci
npm test
npm run typecheck
npm run build
npm start
```

개발은 `npm run dev`입니다. 개발 서버와 production build를 같은 디렉터리에서 동시에 실행하면 .next 산출물이 충돌하므로 분리합니다. Supabase 키 없이도 공개 화면을 확인할 수 있습니다. 개인 설정은 .env.local에 저장하며 .env.example에는 값 없는 항목만 둡니다.

## 경로와 현재 동작

| 경로 | 동작 |
|---|---|
| / | 서비스 소개·DEMO 진입·실제 /auth 링크 |
| /demo | 공개 샘플 시세, 시장 필터·정렬, 종목 상세, 관심종목·알림설정 체험. 변경은 메모리에만 유지 |
| /preview/* | /demo로 리다이렉트. 별도 정적 제품 UI는 폐기 |
| /auth | Supabase 이메일·OAuth 로그인. 키가 없으면 연결 대기 안내 |
| /app | 인증 및 entitlements 확인 후 회원 시장 화면. 이용권 없으면 안내 |
| /account | 같은 entitlement 기준의 이용권 표시, Push 등록·해제, 문서 동의, 탈퇴 |
| /legal/terms, /legal/privacy | 버전이 있는 준비 단계 문서 초안 |
| /admin | DB 관리자 역할만 접근하는 구독·이용권·결제 검증·Push 운영 현황. 조회 전용 |
| /api/market/hot | 인증 + 유효 이용권 필요. 401/403/503은 데이터 없이 반환, private/no-store |
| /api/consents | 본인 기록 조회 및 서버 append-only 동의/철회 |
| /api/account | 확인 문구와 동일 출처를 검증하는 DELETE. 진행 중 구독은 먼저 정리 필요 |
| /api/push/subscriptions | 인증된 기기의 안전한 등록·해제 |
| /api/billing/webhook | 공식 SDK로 PortOne 서명 검증 후 멱등 inbox 접수. 접수만으로 권한 부여 안 함 |
| /api/admin | DB 관리자 역할을 검증한 집계 및 최근 20건 |
| /api/health | 프로세스 health. 외부 통합의 정상 작동을 뜻하지 않음 |

## 데이터 및 보안

- `entitlements`가 접근 권한의 단일 정본입니다. `profiles.plan`은 제거했고, 구독의 `billing_status`는 결제 수명주기만 나타냅니다. 로그인·프로필·JWT의 사용자 메타데이터로 Premium/admin을 결정하지 않습니다.
- 회원 삭제와 보존 증빙을 분리했습니다. `legal_archive`는 일반 Data API에서 접근하지 못하며 계약·결제·환불·분쟁 기록을 위한 별도 구조입니다. 기존 동의는 legacy_unverified로 표시합니다.
- 신규 consent는 서버의 문서 버전/hash, DB 시각, 요청 context를 저장하며 update/delete를 막습니다. 현재 약관은 실제 판매용 최종 문서가 아닙니다.
- 미래 전문가 구조는 `experts`, `expert_contents`, `subscriptions.expert_id`, `entitlements.expert_id`로 준비했습니다. 기본 service identity는 StockPulse 하나이며 EXPERT_MARKETPLACE_ENABLED=false입니다. flag를 true로 바꾸어도 아직 marketplace UI는 제공되지 않습니다.
- `market_events`와 `expert_contents`는 독립 모델이며 코멘트는 event를 선택적으로 참조합니다.
- Push는 service worker·브라우저 등록·VAPID sender·멱등 발송 로그가 있습니다. accepted는 사업자 접수이며 실제 단말 수신이 아닙니다.
- 결제 adapter/interface, mock, 상태 머신, 공식 webhook 서명 검증, 주문 금액 대조·멱등 DB 갱신 경로가 있습니다. 실제 PortOne/Toss transport와 자동 작업자는 미연결입니다.
- CI는 lockfile 기반 npm ci, 권한·DB·결제·동의·Push 테스트, typecheck, production build를 실행합니다. DB 테스트는 PGlite PostgreSQL 엔진에 모든 migration과 Supabase auth/role 최소 fixture를 적용합니다. 실제 Supabase 서비스 E2E와는 다릅니다.

## Preview와 운영 연결

[Preview 배포 절차](docs/deployment.md)를 따라 Vercel 프로젝트를 연결하면 branch Preview URL을 사용할 수 있습니다. 도메인은 연결 후 발급받은 실제 값을 사용합니다. 이 저장소에는 배포 설정과 절차가 있으며, 그 자체로 외부 배포 완료를 의미하지 않습니다.

Supabase migration은 파일명 순서대로 적용합니다. 기존 DB는 백업·staging 검증이 우선이며, profiles.plan/status 변경에 맞춰 앱과 DB 배포를 조정합니다. 상세한 처리·재시도·보존 경계는 [통합 문서](docs/integrations.md)를 참고하세요.

## 아직 외부 연결이 필요한 부분

- Supabase project와 실제 로그인·세션·권한·탈퇴 E2E, 관리자 계정 지정.
- 정식 market data license, 뉴스/OpenDART 공급자, 탐지 작업자, 실제 회원 관심종목/알림설정 UI의 DB 동기화.
- PortOne/Toss credentials 및 sandbox transport, 실제 결제·해지·환불 UI, 청구/웹훅 작업자와 모니터링.
- VAPID 키·HTTPS 도메인, 실제 브라우저/모바일 수신 검증과 발송 스케줄러.
- Kakao 앱 설정/검수 및 향후 알림 채널 정책 검토.
- 유료 상품 가격·정책·사업자 고지·최종 개인정보/동의 문서와 보존기간 만료 파기 작업.

비밀키, billingKey, 세션 쿠키, 실사용자 데이터는 Git에 넣지 않습니다. `NEXT_PUBLIC_*`에는 서버 비밀정보를 두지 않습니다. 공개 UI는 정보 제공 표현만 사용하고 샘플은 DEMO로 표시합니다.
