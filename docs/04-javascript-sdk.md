# JavaScript / TypeScript SDK 사용법

## 1. 요구 사항

- Node.js 20 이상
- TypeSafe 계정과 API 키
- 서버 또는 안전한 백엔드 실행 환경

설치:

```bash
npm install @typesafe-ai/sdk
```

이 프로젝트는 환경변수 파일을 읽기 위해 `dotenv`도 사용합니다.

```bash
npm install dotenv
```

## 2. API 키 설정

프로젝트 루트에 `.env`를 만듭니다.

```dotenv
TYPESAFE_API_KEY=your_api_key
TYPESAFE_DEFAULT_MODEL=jev-latest
TYPESAFE_LOG_LEVEL=warn
```

`.env`는 Git에 커밋하지 않습니다.

```gitignore
.env
```

API 키를 프론트엔드 번들, React 환경변수, 브라우저 localStorage에 넣지 않습니다.

## 3. Client 생성

```ts
import "dotenv/config";
import { TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();
```

SDK는 기본적으로 다음 환경변수를 사용합니다.

- `TYPESAFE_API_KEY`
- `TYPESAFE_BASE_URL`
- `TYPESAFE_DEFAULT_MODEL`
- `TYPESAFE_LOG_LEVEL`

코드 설정은 환경변수보다 우선합니다.

```ts
const client = new TypeSafeClient({
  apiKey: process.env.TYPESAFE_API_KEY,
  defaultModel: "jev-latest",
  timeout: 10_000,
  logLevel: "warn",
  retry: {
    maxRetries: 2,
  },
});
```

## 4. 첫 요청

```ts
import "dotenv/config";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();

const response = await client.systemOne({
  state: {
    document: "I was charged twice. Please help.",
  },
  questions: {
    category: choice("What is `document` mainly about?", {
      billing: "Payments, invoices, refunds, and duplicate charges",
      technical: "Product bugs or integration failures",
      other: "None of the above",
    }),
  },
});

console.log(response.answers.category.choice);
console.log(response.answers.category.probabilities);
console.log(response.answers.category.confidence);
```

## 5. 세 primitive 함께 사용

```ts
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";

const questions = {
  department: choice("Which team should handle `ticket.message`?", {
    billing: "Payments and refunds",
    technical: "Bugs, outages, and integrations",
    account: "Login, profile, and permissions",
    other: "None of the above",
  }),
  urgent: noul(
    "Does `ticket.message` express clear urgency or immediate impact?",
  ),
  frustration: score(
    "How frustrated does the customer appear in `ticket.message`?",
    ["Calm", "Frustrated", "Very angry"] as const,
  ),
} as const;

const client = new TypeSafeClient();

const result = await client.systemOne({
  state: {
    ticket: {
      message: "The integration is failing and we are losing sales.",
    },
  },
  questions,
});
```

## 6. TypeScript 타입 추론

helper 함수로 질문을 만들면 선택지와 rubric 타입이 응답에 연결됩니다.

```ts
const answer = result.answers.department;

// "billing" | "technical" | "account" | "other"
const selected = answer.choice;

// 모든 선택지 키가 타입에 보존됨
const technicalProbability = answer.probabilities.technical;
```

Score tuple에 `as const`를 붙이면 rubric 길이와 인덱스 타입을 더 잘 보존할 수 있습니다.

## 7. 질문을 별도 파일로 분리

```ts
// questions.ts
import { choice, noul, score } from "@typesafe-ai/sdk";

export const triageQuestions = {
  department: choice(...),
  urgent: noul(...),
  frustration: score(...),
} as const;
```

```ts
// service.ts
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { triageQuestions } from "./questions.js";

const client = new TypeSafeClient();

export async function analyzeTicket(message: string) {
  return client.systemOne({
    state: { ticket: { message } },
    questions: triageQuestions,
  });
}
```

장점:

- 질문 변경 이력 관리
- 평가 스크립트에서 재사용
- 서비스 로직과 질문 설계 분리
- 코드 리뷰 범위 명확화

## 8. 결과 타입 재사용

```ts
import type { SystemOneResult } from "@typesafe-ai/sdk";
import type { triageQuestions } from "./questions.js";

export type TriageResult = SystemOneResult<typeof triageQuestions>;
export type TriageAnswers = TriageResult["answers"];
```

```ts
export function decide(answers: TriageAnswers) {
  if (answers.department.confidence < 0.6) {
    return { route: "human_review" as const };
  }

  return {
    route: answers.department.choice,
    urgent: answers.urgent.noul >= 0.8,
  };
}
```

## 9. 모델 지정

호출별 지정:

```ts
await client.systemOne({
  state,
  questions,
  model: "jev-1.13.0",
});
```

Client 기본값 지정:

```ts
const client = new TypeSafeClient({
  defaultModel: "jev-1.13.0",
});
```

탐색 단계에서는 alias가 편리하지만, 운영 임계값을 특정 모델에 맞췄다면 검증한 버전을 고정하는 것이 좋습니다.

## 10. Timeout과 AbortSignal

호출별 timeout:

```ts
await client.systemOne(
  { state, questions },
  { timeout: 5_000 },
);
```

timeout은 전체 재시도 합계가 아니라 각 시도에 적용됩니다.

사용자 요청이 취소되면 모델 호출도 취소할 수 있습니다.

```ts
const controller = new AbortController();

const pending = client.systemOne(
  { state, questions },
  { signal: controller.signal },
);

controller.abort();
await pending;
```

웹 서버에서는 HTTP 요청 종료 시 AbortSignal을 연결하면 불필요한 작업을 줄일 수 있습니다.

## 11. Retry

SDK는 연결 실패, timeout, rate limit, 재시도 가능한 서버 오류에 기본 retry 정책을 제공합니다.

호출별 override:

```ts
await client.systemOne(
  { state, questions },
  {
    retry: {
      maxRetries: 4,
      backoffInitialMs: 500,
      backoffMaxMs: 5_000,
    },
  },
);
```

주의:

- 비동기 업무 큐라면 SDK retry 뒤 애플리케이션 retry 정책도 고려
- 사용자의 동기 요청이면 전체 응답 시간 상한을 고려
- 같은 업무의 중복 부작용은 모델 호출 뒤 코드에서 idempotency로 방지

## 12. Error 처리

```ts
import {
  AuthenticationError,
  RateLimitError,
  TypeSafeError,
  UnprocessableEntityError,
} from "@typesafe-ai/sdk";

try {
  const result = await client.systemOne({ state, questions });
  return result;
} catch (error) {
  if (error instanceof AuthenticationError) {
    throw new Error("TypeSafe API key is invalid");
  }

  if (error instanceof UnprocessableEntityError) {
    throw new Error(`Invalid TypeSafe request: ${error.message}`);
  }

  if (error instanceof RateLimitError) {
    throw new Error("TypeSafe rate limit exceeded after retries");
  }

  if (error instanceof TypeSafeError) {
    throw new Error(`TypeSafe SDK error: ${error.message}`);
  }

  throw error;
}
```

운영 로그에는 credential이나 민감한 state를 그대로 기록하지 않도록 주의합니다.

## 13. 모델 목록 조회

```ts
const models = await client.models.list();

for (const model of models) {
  console.log(model.name);
  console.log(model.description);
  console.log(model.release_date);
}
```

계정에서 사용할 수 있는 alias와 모델 정보를 확인할 수 있습니다.

## 14. 브라우저에서 직접 호출하면 안 되는 이유

SDK는 브라우저 사용을 기본적으로 거부합니다. 브라우저에서 API 키를 사용하면 페이지 이용자가 키를 추출할 수 있습니다.

권장 구조:

```text
Browser / Mobile
  -> 자체 백엔드 API
  -> TypeSafe SDK
  -> 결과를 필요한 형태로 축소
  -> Browser / Mobile
```

백엔드는 다음을 담당해야 합니다.

- 사용자 인증
- 요청 크기 제한
- 허용된 질문 세트 선택
- 민감정보 필터링
- rate limit
- 감사 로그
- 최종 권한 검사

## 15. 이 프로젝트 실행

```bash
npm install
cp .env.example .env
npm run dev
```

직접 입력:

```bash
npm run dev -- "My account is locked and I need access immediately."
```

검증:

```bash
npm run typecheck
npm test
npm run build
```

## 16. HTTP API를 직접 사용할 경우

SDK를 사용할 수 없는 환경에서는 다음 endpoint를 직접 호출할 수 있습니다.

```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

```ts
const response = await fetch("https://api.typesafe.ai/v1/systemone", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    state,
    model: "jev-latest",
    questions,
  }),
});
```

직접 호출 시에는 timeout, retry, `Retry-After`, 오류 body 파싱, 요청 ID 로깅을 직접 구현해야 하므로 일반적인 Node.js 프로젝트에서는 SDK 사용이 권장됩니다.
