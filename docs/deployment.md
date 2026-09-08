# Preview 배포

프리뷰는 Next.js 전체 앱을 배포합니다. 정적 HTML 복제본은 더 이상 제품 화면의 원본이 아닙니다.

## Vercel 프로젝트 연결

1. Vercel에 `ryanjung19/test1`을 Import합니다. Framework는 Next.js, Root Directory는 저장소 루트입니다.
2. Node.js 22를 선택합니다. 저장소의 `vercel.json`은 `npm ci`와 `npm run build`를 사용합니다.
3. `feat/stock-alert-mvp`에 생성된 Preview Deployment의 **branch URL**을 공유합니다. 커밋별 URL과 rawcdn.githack.com URL을 고정 프리뷰 주소로 사용하지 않습니다. branch URL은 프로젝트 연결 후 Vercel이 실제 발급한 값을 사용합니다.
4. 첫 공개 Preview는 Supabase·결제·VAPID 키 없이 운영할 수 있습니다. `/`, `/demo`, `/auth` 안내 화면이 작동하며, Premium API와 운영 API는 503으로 닫힙니다. `/preview/index.html`은 `/demo`로 임시 리다이렉트합니다.
5. 필요할 때 Preview 전용 Supabase 프로젝트와 테스트 계정만 연결합니다. Production DB·결제 비밀키를 Preview에 공유하지 않습니다. `NEXT_PUBLIC_*`는 빌드 시점에 브라우저 번들에 포함되므로 변경 후 재배포합니다.
6. 서비스 URL을 `NEXT_PUBLIC_APP_URL`에 설정하고 Supabase Auth의 허용 redirect URL에 `https://실제-브랜치-주소/auth/callback`을 등록합니다. OAuth 공급자에도 대응하는 설정이 필요합니다.

Vercel 계정 연결과 실제 배포 도메인 발급은 이 저장소만으로 완료되지 않습니다. `vercel.json`이 있다고 배포된 것은 아닙니다.

## 배포 후 확인

```bash
curl -i https://YOUR_PREVIEW_DOMAIN/api/health
curl -i https://YOUR_PREVIEW_DOMAIN/api/market/hot
curl -i https://YOUR_PREVIEW_DOMAIN/preview/index.html
```

health는 200, 인증 없는 Premium API는 401(미설정이면 503), 이전 preview 경로는 `/demo`로 307이어야 합니다. `/demo`는 모든 기기에서 DEMO 표시, 종목 필터와 정렬, 실제 `/auth` 링크를 확인합니다. `/admin`에는 관리자 정보가 노출되면 안 됩니다.

## Supabase 적용

`supabase/migrations`의 파일을 이름순으로 모두 적용합니다. 기존 DB는 initial migration을 재실행하지 않고 추가 migration을 순서대로 적용합니다. 먼저 백업 후 별도 staging DB에서 테스트합니다. 이 변경은 `profiles.plan`과 `subscriptions.status`를 사용하는 기존 클라이언트와 호환되지 않으므로 DB와 앱 배포를 조정해야 합니다.

새 권한 원본은 `entitlements`입니다. `subscriptions.billing_status`는 회계·구독 수명주기이며 접근 권한 조회에 사용하지 않습니다. 기존 `active`/`cancel_at_period_end` 중 유효한 기간이 있는 구독만 migration에서 이용권으로 변환합니다. 시작/종료일이 비어 있거나 `profiles.plan`만 premium인 계정은 자동 승격하지 않습니다.

관리자는 Supabase SQL Editor 등 통제된 관리자 경로에서 부여합니다. 계정의 실제 UUID를 먼저 확인한 뒤 적용합니다.

```sql
insert into public.member_roles(user_id,role)
values ('REPLACE_WITH_VERIFIED_USER_UUID'::uuid,'admin');
```

초기 관리자, 테스트 Premium 이용권, 가짜 결제는 공개 앱에서 생성하지 않습니다. 관리자 화면은 현황 조회 전용입니다. 법정 archive의 읽기·파기는 별도 제한된 운영 절차로 처리합니다.

## 외부 계약 및 출시 전 체크

- Supabase 실제 프로젝트: 이메일/OAuth, 세션 갱신·탈퇴, 두 계정 간 RLS 검증.
- 정식 시장 데이터 계약과 재배포 라이선스; OpenDART·뉴스 연결 및 탐지 worker 스케줄링.
- PortOne/Toss 상점·빌링 권한·테스트 키: SandboxTransport 연결, 카드 인증, 청구/실패/취소/환불 E2E, webhook 작업자 스케줄링과 재처리 모니터링. 현재 자동 청구는 실행되지 않습니다.
- VAPID 키 발급과 HTTPS 도메인, 기기별 수신 확인, worker 스케줄링. iOS는 홈 화면에 추가한 PWA 조건을 확인합니다.
- Kakao OAuth 앱 설정·검수 및 Kakao 알림 채널을 추가할 경우 별도 정책 검토. Web Push와 Kakao 메시지는 다른 채널입니다.
- 사업자 고지, 유료 요금·철회·환불 정책, 개인정보 문서·이전 고지, 데이터 보존의 대상·기산점·파기 작업을 확정합니다. 현재 법률 문서는 초안입니다.

참고: [Next.js/Vercel Preview](https://nextjs.org/learn/pages-router/deploying-nextjs-app-platform-details), [Next.js 환경변수](https://nextjs.org/docs/15/app/guides/environment-variables), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
