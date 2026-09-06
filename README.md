# StockPulse MVP

급상승 종목과 거래량 이상 움직임을 탐지해 PC/모바일에 알리는 구독형 시장 정보 서비스의 초기 UI MVP입니다.

## 현재 구현

- 반응형 PC / 모바일 UI
- PWA manifest
- 랜딩 / 로그인
- 급상승 종목 랭킹 및 KOSPI/KOSDAQ 필터
- 등락률 / 거래량 기준 정렬
- 종목 상세 및 `왜 움직이나?` 영역
- 관련 뉴스 / DART 공시 연결 자리
- 관심종목
- 알림 이력
- 알림 유형 / 기기 설정
- Premium 구독 관리 화면
- 샘플 데이터 기반 인터랙션

## 실행

```bash
npm install
npm run dev
```

Production 검증:

```bash
npm run typecheck
npm run build
npm start
```

## 다음 연동 지점

1. **Supabase Auth / DB** — Kakao, Google, Email 로그인 / 회원 / 관심종목 / 기기 / 알림 설정
2. **Market Data Adapter** — 국내 실시간 또는 준실시간 시세 공급자 연결
3. **Detection Engine API** — 가격 변화율, 거래량, 거래대금 이벤트 점수화
4. **OpenDART** — 관련 기업 최신 공시 조회
5. **News Provider** — 종목별 관련 뉴스 수집 및 시간 정렬
6. **Web Push** — PC Chrome/Edge 및 모바일 PWA Push subscription 관리
7. **PortOne V2 + Toss Payments** — Premium 구독 및 billing 상태 동기화

## 제품 원칙

- 매수/매도 추천 문구를 사용하지 않는다.
- 객관적인 가격·거래량 이상 움직임과 관련 정보 전달에 집중한다.
- 외부 데이터는 라이선스와 재배포 조건을 검토한 공급자만 사용한다.
- UI에 노출되는 시장 데이터에는 기준 시각과 출처를 제공한다.

> 현재 화면의 시세 및 뉴스/공시 내용은 UI 검증용 샘플 데이터이며 실제 시장 데이터가 아닙니다.
