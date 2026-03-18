# AI Anonymous Matching App — 개발 가이드

## 프로젝트 개요

SMS 기반 AI 익명 매칭 앱. 사용자가 특정 전화번호로 문자를 보내면 AI 에이전트와 대화하며
익명 프로필을 만들고, AI가 최적 매칭을 찾아 가상 번호 샌드박스에서 대화를 연결.
AI가 대화 품질을 모니터링하다가 적절한 시점에 정보 교환을 추천.

---

## 기술 스택

| 역할 | 기술 |
|---|---|
| 런타임 | Node.js 22 + TypeScript 5 |
| 웹 프레임워크 | Express.js 4 |
| SMS | Twilio (수신 webhook + 발신 REST API) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| DB | SQLite (`better-sqlite3`) |
| 실시간 채팅 | WebSocket (`ws`) |
| 유효성 검증 | Zod |
| 개발 실행 | tsx (ts-node 대체) |

---

## 디렉터리 구조

```
/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── data/                          # SQLite DB 파일 (gitignore)
└── src/
    ├── index.ts                   # Express 앱 진입점
    ├── config/
    │   └── index.ts               # 환경변수 로딩 + Zod 검증
    ├── types/
    │   └── index.ts               # 모든 공유 TS 인터페이스/enum
    ├── db/
    │   ├── client.ts              # SQLite 연결 싱글톤
    │   ├── migrate.ts             # 마이그레이션 실행기
    │   └── migrations/
    │       ├── 001_create_users.sql
    │       ├── 002_create_profiles.sql
    │       ├── 003_create_matches.sql
    │       ├── 004_create_messages.sql
    │       └── 005_create_conversation_state.sql
    ├── repositories/
    │   ├── userRepo.ts
    │   ├── profileRepo.ts
    │   ├── matchRepo.ts
    │   ├── messageRepo.ts
    │   └── stateRepo.ts
    ├── prompts/
    │   ├── onboarding.ts          # Claude 온보딩 시스템 프롬프트
    │   ├── matching.ts            # 호환성 점수 계산 프롬프트
    │   └── monitor.ts             # 채팅 품질 모니터링 프롬프트
    ├── services/
    │   ├── sms.ts                 # Twilio 발신 추상화
    │   ├── claude.ts              # Anthropic SDK 래퍼 (3가지 호출)
    │   ├── stateMachine.ts        # 인바운드 SMS 상태 디스패처
    │   ├── onboarding.ts          # 멀티턴 온보딩 루프
    │   ├── matching.ts            # 매칭 탐색 + 점수 계산
    │   ├── chat.ts                # 익명 메시지 라우팅
    │   └── monitor.ts             # 채팅 품질 체크 + 추천
    ├── routes/
    │   ├── webhook.ts             # POST /webhook/sms
    │   ├── chat.ts                # GET /chat/:token (웹 샌드박스)
    │   └── health.ts              # GET /health
    └── middleware/
        ├── twilioSignature.ts     # Twilio 서명 검증
        └── errorHandler.ts        # 전역 에러 핸들러
```

---

## 데이터베이스 스키마

### users
```sql
CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  phone      TEXT NOT NULL UNIQUE,   -- E.164 형식 (+821012345678)
  state      TEXT NOT NULL DEFAULT 'onboarding',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**state 값:**
- `onboarding` — AI 에이전트와 프로필 작성 중
- `waiting` — 프로필 완성, 매칭 대기 중
- `matched` — 매칭 완료, 첫 메시지 전
- `chatting` — 매칭 상대와 대화 중
- `info_exchange` — AI가 정보 교환 추천 후
- `inactive` — STOP 명령으로 비활성화

### profiles
```sql
CREATE TABLE profiles (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL UNIQUE REFERENCES users(id),
  display_name TEXT,
  age_range    TEXT,                 -- "20-25", "30-35" 등
  looking_for  TEXT,                 -- "friends" | "dating" | "both"
  interests    TEXT NOT NULL,        -- JSON 배열 ["독서", "여행", ...]
  personality  TEXT NOT NULL,        -- JSON 객체 {traits: [...]}
  bio_summary  TEXT NOT NULL,        -- Claude가 생성한 2-3줄 요약
  completed    INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
```

### matches
```sql
CREATE TABLE matches (
  id                   TEXT PRIMARY KEY,
  user_a_id            TEXT NOT NULL REFERENCES users(id),
  user_b_id            TEXT NOT NULL REFERENCES users(id),
  score                REAL NOT NULL,             -- 0.0~1.0 호환성 점수
  channel_token        TEXT NOT NULL UNIQUE,       -- 웹 채팅 URL용 토큰
  proxy_number_a       TEXT,                       -- A에게 할당된 가상번호
  proxy_number_b       TEXT,                       -- B에게 할당된 가상번호
  status               TEXT NOT NULL DEFAULT 'active',
  message_count        INTEGER NOT NULL DEFAULT 0,
  recommendation_sent  INTEGER NOT NULL DEFAULT 0,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL,
  UNIQUE(user_a_id, user_b_id)
);
```

### messages
```sql
CREATE TABLE messages (
  id         TEXT PRIMARY KEY,
  match_id   TEXT NOT NULL REFERENCES matches(id),
  sender_id  TEXT NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  channel    TEXT NOT NULL,          -- "sms" | "web"
  created_at INTEGER NOT NULL
);
```

### conversation_state
```sql
CREATE TABLE conversation_state (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL UNIQUE REFERENCES users(id),
  history    TEXT NOT NULL DEFAULT '[]',  -- JSON: [{role, content}, ...]
  turn_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
```

---

## 상태 머신 흐름

```
[첫 문자]
    ↓
onboarding ──(프로필 완성)──→ waiting ──(매칭 발견)──→ matched
                                  ↑                        ↓
                             (매칭 없음)              (첫 메시지)
                                                          ↓
                                                      chatting
                                                          ↓
                                                 (N개 메시지 후 AI 판단)
                                                          ↓
                                                    info_exchange
```

**특수 명령 (상태에 관계없이 항상 처리):**
- `STOP` → `inactive` 상태로 전환
- `START` → 재활성화 (프로필 있으면 `waiting`, 없으면 `onboarding`)
- `HELP` → 도움말 문자 발송
- `LEAVE` → 현재 매칭 종료 후 `waiting`으로 복귀

---

## Claude API 통합

### 1. 온보딩 턴 (`onboardingTurn`)

멀티턴 대화로 프로필 추출. Claude는 **반드시 아래 JSON 형식**으로 응답해야 함:

```json
{
  "message": "사용자에게 보낼 대화 텍스트",
  "extracted": {
    "interests": ["독서", "카페투어"],
    "personality": { "traits": ["내향적", "창의적"] },
    "looking_for": "friends",
    "age_range": "25-30",
    "display_name": "별이"
  },
  "profileComplete": false
}
```

- `extracted`는 정보가 충분할 때만 채움 (초반 턴은 `null`)
- `profileComplete: true`가 되면 온보딩 종료
- JSON 파싱 실패 시 → `message`를 raw text로 사용 (graceful fallback)

**시스템 프롬프트 핵심 지침:**
```
당신은 'Spark'라는 친근한 AI 매칭 어시스턴트입니다.
6~10번의 대화 안에 상대방의 관심사, 성격, 원하는 관계를 파악하세요.
절대 물어보면 안 되는 것: 본명, 주소, 직장명, 학교명.
물어봐야 하는 것: 관심사/취미, 성격, 원하는 관계(친구/연애), 나이대, 중요하게 생각하는 것.
```

### 2. 호환성 점수 계산 (`scoreCompatibility`)

```typescript
// 입력: 두 프로필의 bio_summary + interests + personality
// 출력: { score: 0.0~1.0, reasoning: "이유 설명" }
// MATCH_THRESHOLD (기본값 0.65) 이상이면 매칭 실행
```

### 3. 채팅 모니터링 (`monitorChat`)

```typescript
// MONITOR_INTERVAL(기본값 10)개 메시지마다 호출
// 입력: 최근 N개 메시지 + 두 프로필
// 출력: { recommend: boolean, reason: string, summary: string }
// recommend: true → 두 사용자에게 정보 교환 추천 SMS 발송
```

---

## SMS 프록시 전략

### Option A: Twilio Proxy (권장, 프로덕션용)
- `TWILIO_PROXY_SERVICE_SID` 환경변수 설정 시 활성화
- Twilio가 번호 마스킹 + 라우팅 자동 처리
- 비용: 세션당 + 메시지당 추가 과금

### Option B: 수동 라우팅 (기본값, 단순)
- Twilio에서 가상번호 풀 구매 (예: 5~10개)
- 매칭 생성 시 `proxy_number_a`, `proxy_number_b` 할당
- 인바운드 메시지의 `To` 필드로 어떤 매치인지 식별
- 소규모(~100명 동시 매칭)에 적합

---

## 환경변수 (`.env`)

```bash
# 서버
PORT=3000
NODE_ENV=development

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1800xxxxxxx        # 사용자가 문자 보내는 번호
TWILIO_PROXY_SERVICE_SID=               # 선택사항 (Option A 시)

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
CLAUDE_MODEL=claude-sonnet-4-6

# 데이터베이스
DATABASE_URL=./data/app.db

# 매칭 설정
MATCH_THRESHOLD=0.65         # 0.0~1.0, 이 점수 이상이면 매칭
MONITOR_INTERVAL=10          # N개 메시지마다 채팅 품질 체크
ONBOARDING_MAX_TURNS=12      # 최대 온보딩 턴 수

# 기능 플래그
ENABLE_WEB_CHAT=true         # 웹 채팅 샌드박스 활성화
ENABLE_PROXY_SMS=true        # SMS 프록시 라우팅 활성화
```

---

## package.json 의존성

```json
{
  "name": "ai-matching-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "tsx src/db/migrate.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "twilio": "^5.4.0",
    "express": "^4.21.0",
    "better-sqlite3": "^11.0.0",
    "uuid": "^10.0.0",
    "dotenv": "^16.4.0",
    "ws": "^8.18.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/express": "^5.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/uuid": "^10.0.0",
    "@types/ws": "^8.5.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0"
  }
}
```

---

## Twilio Webhook 설정

### 인바운드 SMS 처리 흐름

```
사용자 문자
    ↓
Twilio
    ↓ POST (application/x-www-form-urlencoded)
POST /webhook/sms
    Body: {
      From: "+821012345678",
      To: "+1800xxxxxxx",
      Body: "안녕하세요",
      MessageSid: "SMxxxx"
    }
    ↓
X-Twilio-Signature 검증 (middleware)
    ↓
특수 명령 체크 (STOP/START/HELP/LEAVE)
    ↓
stateMachine.handleIncomingMessage(from, body)
    ↓
200 OK 즉시 응답 (빈 TwiML)
    ↓ (비동기)
AI 처리 → Twilio REST API로 응답 문자 발송
```

**중요:** Twilio는 15초 내 응답 없으면 재시도. AI 처리는 반드시 비동기로 실행하고 즉시 200 OK 반환.

### Webhook URL 등록 방법
1. `ngrok http 3000` 으로 로컬 터널 생성
2. Twilio Console → Phone Numbers → Active Numbers → 번호 선택
3. Messaging → Webhook URL: `https://xxxx.ngrok.io/webhook/sms`
4. Method: HTTP POST

---

## 구현 순서

구현은 이 순서대로 진행하면 의존성 문제 없음:

### Phase 1: 기반 설정
1. `package.json` + `tsconfig.json` + `.env.example` + `.gitignore`
2. `src/types/index.ts` — `UserState` enum, `User`, `Profile`, `Match`, `Message`, `ConversationState` 인터페이스
3. `src/config/index.ts` — `dotenv` + Zod로 환경변수 검증
4. `src/db/migrations/` — SQL 파일 5개
5. `src/db/client.ts` — SQLite 싱글톤 + `query` 헬퍼
6. `src/db/migrate.ts` — 마이그레이션 실행기

### Phase 2: 데이터 레이어
7. `src/repositories/userRepo.ts`
8. `src/repositories/profileRepo.ts`
9. `src/repositories/matchRepo.ts`
10. `src/repositories/messageRepo.ts`
11. `src/repositories/stateRepo.ts`

### Phase 3: 외부 서비스
12. `src/services/sms.ts` — Twilio `sendMessage(to, body, from?)`
13. `src/prompts/onboarding.ts` — 시스템 프롬프트 + JSON 형식 지정
14. `src/prompts/matching.ts`
15. `src/prompts/monitor.ts`
16. `src/services/claude.ts` — `onboardingTurn()`, `scoreCompatibility()`, `monitorChat()`

### Phase 4: 핵심 비즈니스 로직
17. `src/services/onboarding.ts` — 멀티턴 루프
18. `src/services/stateMachine.ts` — 상태 디스패처
19. `src/services/matching.ts` — 매칭 탐색 + 알림
20. `src/services/chat.ts` — 프록시 메시지 라우팅
21. `src/services/monitor.ts` — 품질 체크 + 추천

### Phase 5: HTTP 레이어
22. `src/middleware/twilioSignature.ts`
23. `src/middleware/errorHandler.ts`
24. `src/routes/webhook.ts`
25. `src/routes/health.ts`
26. `src/index.ts` — Express 앱 부트스트랩

### Phase 6: 선택사항
27. `src/routes/chat.ts` — 웹 채팅 샌드박스
28. WebSocket 서버 통합

---

## 각 파일 상세 명세

### `src/types/index.ts`

```typescript
export enum UserState {
  ONBOARDING = 'onboarding',
  WAITING = 'waiting',
  MATCHED = 'matched',
  CHATTING = 'chatting',
  INFO_EXCHANGE = 'info_exchange',
  INACTIVE = 'inactive',
}

export interface User {
  id: string;
  phone: string;           // E.164
  state: UserState;
  created_at: number;
  updated_at: number;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  age_range: string | null;
  looking_for: 'friends' | 'dating' | 'both' | null;
  interests: string[];     // 파싱된 JSON 배열
  personality: { traits: string[] };  // 파싱된 JSON
  bio_summary: string;
  completed: boolean;
  created_at: number;
  updated_at: number;
}

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  score: number;
  channel_token: string;
  proxy_number_a: string | null;
  proxy_number_b: string | null;
  status: 'active' | 'info_exchange' | 'closed';
  message_count: number;
  recommendation_sent: boolean;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  channel: 'sms' | 'web';
  created_at: number;
}

export interface ConversationState {
  id: string;
  user_id: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  turn_count: number;
  updated_at: number;
}

// Claude onboarding 응답 형식
export interface OnboardingResponse {
  message: string;
  extracted: {
    interests?: string[];
    personality?: { traits: string[] };
    looking_for?: 'friends' | 'dating' | 'both';
    age_range?: string;
    display_name?: string;
  } | null;
  profileComplete: boolean;
}
```

### `src/services/claude.ts` 핵심 구조

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

// Zod 스키마 정의
const OnboardingResponseSchema = z.object({
  message: z.string(),
  extracted: z.object({
    interests: z.array(z.string()).optional(),
    personality: z.object({ traits: z.array(z.string()) }).optional(),
    looking_for: z.enum(['friends', 'dating', 'both']).optional(),
    age_range: z.string().optional(),
    display_name: z.string().optional(),
  }).nullable(),
  profileComplete: z.boolean(),
});

export async function onboardingTurn(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<OnboardingResponse> {
  const response = await client.messages.create({
    model: config.CLAUDE_MODEL,
    max_tokens: 1024,
    system: ONBOARDING_SYSTEM_PROMPT,
    messages: [
      ...history,
      { role: 'user', content: userMessage }
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // JSON 파싱 시도, 실패 시 fallback
  try {
    const json = JSON.parse(text);
    return OnboardingResponseSchema.parse(json);
  } catch {
    return { message: text, extracted: null, profileComplete: false };
  }
}

export async function scoreCompatibility(
  profileA: Profile,
  profileB: Profile
): Promise<{ score: number; reasoning: string }> { ... }

export async function monitorChat(
  messages: Message[],
  profileA: Profile,
  profileB: Profile
): Promise<{ recommend: boolean; reason: string; summary: string }> { ... }
```

### `src/routes/webhook.ts` 핵심 구조

```typescript
router.post('/', validateTwilioSignature, async (req, res) => {
  // 즉시 200 응답 (빈 TwiML)
  res.type('text/xml').send('<Response/>');

  // 비동기로 처리
  const { From: from, Body: body } = req.body;

  setImmediate(async () => {
    try {
      // 특수 명령 체크
      const command = body.trim().toUpperCase();
      if (command === 'STOP') return handleStop(from);
      if (command === 'START') return handleStart(from);
      if (command === 'HELP') return handleHelp(from);
      if (command === 'LEAVE') return handleLeave(from);

      await stateMachine.handleIncomingMessage(from, body.trim());
    } catch (err) {
      console.error('webhook error:', err);
      await sms.sendMessage(from, '오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  });
});
```

---

## 테스트 방법

### 로컬 개발 환경

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에 API 키 입력

# 3. DB 마이그레이션
npm run migrate

# 4. 개발 서버 시작
npm run dev

# 5. ngrok으로 외부 노출 (별도 터미널)
ngrok http 3000

# 6. Twilio Console에서 webhook URL 설정
# https://xxxx.ngrok.io/webhook/sms
```

### 테스트 시나리오

1. **온보딩 테스트**: Twilio 번호로 문자 → AI 대화 6~10턴 → "대기 중" 알림 확인
2. **매칭 테스트**: 다른 테스트 번호로 온보딩 완료 → 두 사용자 매칭 알림 확인
3. **채팅 테스트**: 매칭된 두 번호에서 메시지 교환 → 상대방에게 전달 확인
4. **모니터링 테스트**: 10개 이상 메시지 교환 → 정보 교환 추천 SMS 확인
5. **특수 명령 테스트**: `HELP`, `LEAVE`, `STOP`, `START` 동작 확인

### Health Check

```bash
curl http://localhost:3000/health
# { "status": "ok", "uptime": 123, "db": "ok" }
```

---

## 주요 설계 결정 사항

### 1. 비동기 처리
Twilio는 15초 내 응답 필요 → 즉시 200 반환 후 `setImmediate`로 AI 처리.
프로덕션에서는 BullMQ + Redis로 교체 권장.

### 2. Claude 구조화 출력
JSON 파싱 실패 시 raw text를 message로 사용하는 graceful fallback 필수.

### 3. 매칭 알고리즘 확장
소규모: 모든 `waiting` 사용자 대상 Claude 호환성 점수 계산 (O(N) API 호출).
대규모: `bio_summary` 임베딩 생성 → 코사인 유사도로 상위 10명 필터링 → Claude 점수는 그 10명만 계산.
`profiles.embedding BLOB` 컬럼은 이 업그레이드를 위해 예약.

### 4. 익명성 보장
- 실제 번호는 절대 상대방에게 노출되지 않음
- 프록시 번호 또는 Twilio Proxy를 통해서만 통신
- 온보딩 중 AI는 본명/주소/직장을 절대 요청하지 않음

---

## 에러 처리 가이드

| 상황 | 처리 방법 |
|---|---|
| Claude API 타임아웃 | "잠시 후 다시 시도해주세요" SMS 발송, 상태 유지 |
| Twilio 발송 실패 | 3회 재시도 (2s, 4s, 8s 대기) |
| JSON 파싱 실패 | raw text를 message로 사용, extracted=null |
| 매칭 상대 없음 | "현재 매칭을 찾고 있어요" 알림 후 waiting 유지 |
| DB 에러 | 500 응답, 사용자에게 오류 SMS |
| 잘못된 Twilio 서명 | 403 응답, 처리 중단 |
