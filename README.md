# StockPulse MVP

급상승 종목과 거래량 이상 움직임을 탐지해 PC/모바일에 알리는 구독형 시장 정보 서비스입니다.

## 현재 구현

- 반응형 PC / 모바일 UI
- PWA manifest
- 랜딩 및 데모 서비스 화면
- 급상승 종목 랭킹 / KOSPI·KOSDAQ 필터 / 정렬
- 종목 상세 및 `왜 움직이나?` 영역
- 관심종목 / 알림 이력 / 알림 설정 / 구독 관리 UI
- **Supabase SSR Auth 기반 실제 `/auth` 화면**
  - Kakao OAuth
  - Google OAuth
  - Email + Password
  - Email Magic Link
- **보호된 `/account` 페이지 및 서버 로그아웃**
- **Supabase 초기 DB migration + RLS**
  - profiles
  - subscriptions
  - watchlist
  - notification_preferences
  - push_subscriptions
  - consents
  - alert_deliveries
- GitHub Actions typecheck + production build

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

Production 검증:

```bash
npm run typecheck
npm run build
npm start
```

## Supabase 연결

1. Supabase 프로젝트를 생성합니다. 한국 사용자 중심 서비스라면 Seoul (`ap-northeast-2`) 리전을 권장합니다.
2. `.env.local`에 아래 값을 입력합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. `supabase/migrations/202609070001_initial.sql`을 Supabase SQL Editor에서 실행하거나 Supabase CLI migration으로 적용합니다.
4. Supabase Auth Providers에서 Google / Kakao를 사용할 경우 각 provider 설정을 완료합니다.
5. Auth Redirect URL에 다음을 등록합니다.

```text
http://localhost:3000/auth/callback
https://YOUR_DOMAIN/auth/callback
```

> Service Role Key, Toss secret, PortOne API secret 같은 서버 비밀키는 저장소나 `NEXT_PUBLIC_*` 환경변수에 넣지 않습니다.

## 데이터 권한 원칙

- 브라우저 회원은 본인의 관심종목·알림설정·Push subscription만 조작할 수 있습니다.
- 구독 상태와 알림 발송 기록의 생성은 서버/service role에서 처리합니다.
- 노출 스키마는 RLS를 활성화하고 `auth.uid()` 기준으로 사용자 행을 격리합니다.
- 결제 상태를 브라우저 요청만으로 Premium으로 변경할 수 없도록 설계합니다.

## 다음 개발 순서

1. 랜딩의 시작 버튼을 실제 `/auth` 플로우와 통합
2. Supabase 실제 프로젝트 연결 및 Auth E2E 검증
3. 회원 관심종목 / 알림설정 UI를 Supabase DB와 동기화
4. Market Data Adapter 연결
5. Detection Engine — 가격 변화·거래량·거래대금 이벤트 감지
6. OpenDART + News Provider 연결
7. Web Push subscription / 발송 worker 연결
8. PortOne V2 + Toss Billing 연결
9. 운영 관리자 / 알림 threshold 관리 화면

## 제품 원칙

- 매수/매도 추천 문구를 사용하지 않는다.
- 객관적인 가격·거래량 이상 움직임과 관련 정보 전달에 집중한다.
- 외부 데이터는 라이선스와 재배포 조건을 검토한 공급자만 사용한다.
- UI에 노출되는 시장 데이터에는 기준 시각과 출처를 제공한다.

> 현재 메인 화면의 시세 및 뉴스/공시 내용은 UI 검증용 샘플 데이터이며 실제 시장 데이터가 아닙니다.
