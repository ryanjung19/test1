# 결제·Push·보존 경계

## 결제

`RecurringBillingAdapter`는 빌링키 발급, 멱등 청구, 빌링키 해지, 결제 조회를 정의합니다. `MockBillingAdapter`는 메모리 테스트용이며 HTTP 요청으로 선택하거나 이용권을 발급하는 경로가 없습니다. `PortOneSandboxAdapter`와 `TossSandboxAdapter`는 명시적으로 주입한 `SandboxTransport`를 사용합니다. 실제 provider 네트워크 transport와 청구 스케줄러는 아직 연결되지 않았습니다. raw 카드 정보와 실제 billingKey를 로그·공개 테이블에 넣지 않습니다.

`POST /api/billing/webhook`은 **PortOne V2 전용**입니다. 공식 `@portone/server-sdk`가 raw body와 webhook-id/timestamp/signature를 검증합니다. 서명 검증 후에도 이용권은 부여하지 않고, 본문 hash와 식별자만 `billing_webhook_inbox`에 멱등 저장합니다. 202/pending_verification은 결제 처리 완료가 아닙니다. Toss 직접 웹훅은 이 엔드포인트로 보내지 않습니다.

서버 작업자는 `processBillingEvent(inboxId, adapter)`를 호출합니다. provider 결제 API의 readback을 가져온 뒤 `apply_billing_payment`가 서버 생성 주문의 provider/paymentId/storeId/amount/currency와 대조합니다. 주문·구독·inbox 잠금 아래 구독 상태, 이용권, 보존 증빙, 처리 상태를 한 transaction에서 갱신합니다. 오류는 완료로 표시하지 않고 pending에 남기므로 작업자 재시도/운영 모니터링이 필요합니다. 부분환불·분쟁처럼 확정 상태로 정규화할 수 없는 provider 응답은 transport에서 실패시켜 운영 검토로 남겨야 합니다.

구독 상태 전이는 DB의 `billing_next_status`가 담당합니다. 미결제 → 결제 확인 → active, 실패 → past_due, 기간 말 해지 → cancel_at_period_end, 환불·취소 → canceled, 기간 종료 → expired입니다. canceled/expired 계약은 paid로 재활성화하지 않고 새 계약을 생성합니다. 실제 이용권은 별도 entitlements의 시작·종료·회수 시각으로 판정하며, 만료는 worker 실행 없이 즉시 차단됩니다. 해지 스케줄러와 고객 결제/해지 화면은 출시 전 추가 연결 대상입니다.

## Push

계정 화면은 브라우저 permission 요청 → `/sw.js` 등록 → PushSubscription 생성 → 서버 저장까지 연결되어 있습니다. 서버는 인증·동일 출처·body 크기·HTTPS endpoint 허용목록·키 포맷을 검증합니다. 동일 endpoint의 소유자를 다른 회원으로 바꿀 수 없고 회원당 10기기로 제한합니다. 새 공급자는 검토 후 허용목록에 추가합니다.

`deliverMarketEvent(userId, eventId)`는 저장된 Market Event와 이용권·알림설정·한국시간 방해금지 시간을 확인해 `web-push` sender에 전달합니다. 중복 event/device는 다시 보내지 않습니다. 404/410은 endpoint를 제거하며 발송 로그는 남습니다. `accepted`는 Push 사업자가 접수한 상태이며 실제 기기 표시/열람 보장이 아닙니다. 실패·프로세스 중단의 pending 기록은 자동 재발송하지 않으므로 별도 재처리 정책이 필요합니다. 서비스 워커는 Premium 응답을 캐싱하지 않습니다.

## 동의와 탈퇴

`POST /api/consents`는 요청자의 인증된 ID, 서버 문서의 버전/SHA-256, DB의 accepted_at, 서버가 만든 request_id/action/source를 저장합니다. accept와 withdraw는 새 행이며, 기존 receipt를 update/delete할 수 없습니다. 철회는 본인 기존 accept를 참조해야 합니다. 현재 문서보다 오래된 버전에 대한 새 요청은 409로 거절합니다. 실제 구매 동의는 향후 checkout에서 서버가 검증한 주문/계약 ID를 transaction_context에 연결해야 합니다.

과거 self-insert 동의는 `legacy_unverified`로 유지하고 원문 스냅샷을 archive에 복사합니다. 존재하지 않았던 hash나 동의 시각을 소급 생성하지 않습니다. 유료 계약 동의로 재사용하지 않습니다.

auth.users 삭제 시 profiles/entitlements/기기 등 운영 데이터는 삭제됩니다. subscriptions는 사용자 연결만 해제되며, 별도 `legal_archive.subjects` 및 `records`, 불변 consent receipts는 cascade에 포함되지 않습니다. 서버 탈퇴 경로는 진행 중 구독을 먼저 정리하도록 안내합니다. 이 단계에서는 자동 결제가 활성화되지 않습니다.

archive는 계약·결제·환불·분쟁 구분과 retain_until/legal_hold 메타데이터를 갖습니다. 계약/결제 샘플 정책은 5년입니다. 분쟁 기록은 실제 운영 확정 정책에 맞는 만료 시각을 부여해야 합니다. 서비스 계정과 일반 관리자는 archive 원문을 직접 조회/수정/삭제할 권한이 없습니다. 보존기간 만료 파기는 DB 소유자 권한을 통제하는 별도 작업으로 구현·감사해야 하며, 현재 자동 파기는 없습니다. 모든 동의가 일률적으로 법정 5년 보관 대상이라는 뜻은 아닙니다. 출시 전 문서 유형별 대상·최소 식별정보·기산점·보존기간을 검토해야 합니다.

근거: [PortOne V2 웹훅](https://developers.portone.io/opi/ko/integration/webhook/readme-v2), [Toss 정기결제](https://docs.tosspayments.com/guides/billing/overview), [web-push API](https://github.com/web-push-libs/web-push#api-reference), [국가법령정보센터 전자상거래법 시행령](https://www.law.go.kr/법령/전자상거래등에서의소비자보호에관한법률시행령).
