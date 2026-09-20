# Choice, Score, Noul 상세 사용법

## 1. 어떤 primitive를 선택해야 하는가

| 필요한 답 | 사용 타입 | 예시 |
| --- | --- | --- |
| 고정된 후보 중 하나 | Choice | 담당 팀, 문서 유형, 의도 |
| 순서가 있는 단계 | Score | 심각도, 만족도, 숙련도 |
| yes일 가능성 | Noul | 환불 요청, 개인정보 포함, 관련성 |

빠른 판단 방법:

```text
답이 이름 있는 여러 범주 중 하나인가?
  -> Choice

답이 낮음부터 높음까지 이어지는 척도인가?
  -> Score

명확한 명제가 참인지 묻는가?
  -> Noul
```

## 2. Choice

### 무엇인가

Choice는 개발자가 미리 정의한 선택지 중 가장 적합한 하나를 고릅니다. 선택된 값뿐 아니라 모든 선택지의 확률과 confidence를 반환합니다.

### 기본 사용법

```ts
import { choice } from "@typesafe-ai/sdk";

const department = choice("Which team should handle `ticket.message`?", {
  billing: "Payments, invoices, refunds, and subscriptions",
  technical: "Bugs, outages, and failed integrations",
  account: "Login, profile, permissions, and security",
  other: "Requests that do not fit another option",
});
```

### 결과 읽기

```ts
const answer = result.answers.department;

console.log(answer.choice);
console.log(answer.probabilities);
console.log(answer.confidence);
```

### 좋은 criteria 작성법

선택지 이름만으로 충분히 구분되면 `null`을 사용할 수 있습니다.

```ts
choice("What is the tone?", {
  calm: null,
  frustrated: null,
  angry: null,
});
```

경계가 겹치면 설명을 추가합니다.

```ts
choice("What is the main return topic?", {
  return_policy: {
    what: "General eligibility, deadlines, or return rules",
    not_for: "The progress of an already submitted return",
    examples: ["Can I return an opened item?"],
  },
  return_status: {
    what: "The progress or payment status of an existing return",
    not_for: "General questions about eligibility",
    examples: ["Where is my refund?"],
  },
});
```

### other 선택지가 필요한 경우

분류 체계가 모든 입력을 완전히 포괄한다고 확신할 수 없다면 `other` 또는 `none_of_the_above`를 넣습니다.

없으면 모델은 부적합한 입력도 기존 선택지 중 하나로 강제 분류해야 합니다.

### 확률을 활용하는 방법

```ts
const department = result.answers.department;

if (department.confidence < 0.6) {
  return "human_review";
}

for (const [team, probability] of Object.entries(department.probabilities)) {
  if (team !== department.choice && probability >= 0.25) {
    notifySecondaryTeam(team);
  }
}
```

### Choice를 피해야 하는 경우

- yes/no만 필요한데 yes/no Choice를 만드는 경우
- 순서가 있는 수준을 비순서형 이름으로 만드는 경우
- 수백 단계 taxonomy를 한 번에 평탄화하는 경우
- 선택지 설명이 서로 중복되는 경우

## 3. Score

### 무엇인가

Score는 개발자가 정의한 순서형 rubric 위에서 입력의 위치를 평가합니다.

### 기본 사용법

```ts
import { score } from "@typesafe-ai/sdk";

const frustration = score(
  "How frustrated does the customer appear in `ticket.message`?",
  [
    "Calm and matter-of-fact",
    "Frustrated but civil",
    "Very angry, hostile, or threatening to leave",
  ] as const,
);
```

### 결과 읽기

```ts
const answer = result.answers.frustration;

console.log(answer.score);
console.log(answer.legend);
console.log(answer.probabilities);
console.log(answer.confidence);
```

`score`는 정수일 필요가 없습니다. 예를 들어 1단계와 2단계에 확률이 나뉘면 중간 값이 반환될 수 있습니다.

### 좋은 수준 설계

좋은 rubric은 각 수준의 경계가 설명되어 있습니다.

```ts
score("How severe is the reported bug?", [
  {
    level: "minor",
    meaning: "Cosmetic issue or easy workaround",
    impact: "Core workflow remains usable",
  },
  {
    level: "major",
    meaning: "Important workflow is blocked for some users",
    impact: "A workaround may exist",
  },
  {
    level: "critical",
    meaning: "Core service is unavailable or data is at risk",
    impact: "No acceptable workaround",
  },
] as const);
```

### Score 임계값

```ts
const severity = result.answers.severity;

if (severity.confidence < 0.65) {
  return "human_review";
}

if (severity.score >= 1.5) {
  return "high_priority";
}

return "normal_priority";
```

### 여러 Score 조합

각 Score의 최대 인덱스로 나눠 0부터 1 범위로 정규화할 수 있습니다.

```ts
const technical = answers.technicalDepth.score / 4;
const leadership = answers.leadership.score / 4;
const architecture = answers.architecture.score / 4;

const composite =
  technical * 0.4 +
  leadership * 0.2 +
  architecture * 0.4;
```

가중치는 질문이나 prompt가 아니라 코드에서 관리합니다.

### Score를 피해야 하는 경우

- 정확한 금액, 개수, 시간 차이를 얻으려는 경우
- 척도 각 단계의 의미가 불명확한 경우
- yes/no 판단을 중간 점수로 표현하려는 경우
- 순서가 없는 범주를 숫자로 억지 변환하는 경우

## 4. Noul

### 무엇인가

Noul은 명제가 참일 확률을 0부터 1 사이 값으로 반환합니다.

### 기본 사용법

```ts
import { noul } from "@typesafe-ai/sdk";

const refundRequested = noul(
  "Does `ticket.message` explicitly request a refund or account credit?",
);
```

### true와 false 경계 추가

```ts
const refundRequested = noul(
  "Does `ticket.message` explicitly request a refund or account credit?",
  {
    true: {
      meaning: "The customer asks for money back or credit",
      examples: ["Please refund the duplicate charge"],
    },
    false: {
      meaning: "The customer does not request money back",
      not_for: "A billing complaint without a requested remedy",
      examples: ["Why was I charged twice?"],
    },
  },
);
```

### 결과 읽기

```ts
const probability = result.answers.refundRequested.noul;
```

Noul에는 별도 confidence가 없습니다. yes 확률 자체를 사용합니다.

### 세 구간 정책

```ts
function classifyNoul(value: number): "yes" | "review" | "no" {
  if (value >= 0.8) return "yes";
  if (value <= 0.2) return "no";
  return "review";
}
```

임계값은 업무 위험에 따라 달라집니다.

- 놓치면 큰 문제가 되는 탐지: yes 기준을 낮출 수 있음
- 오탐 시 큰 문제가 되는 차단: yes 기준을 높여야 함
- 고위험 업무: review 구간을 넓게 설정

### Noul의 흔한 오해

`0.5`는 절반 정도의 강도를 뜻하지 않습니다.

예시:

```text
질문: 이 후보자의 Python 실력은 높은가?
Noul: 0.5
```

이 값은 중급 실력을 뜻하지 않습니다. high인지 아닌지 불확실하다는 뜻입니다. 실력의 정도가 필요하면 Score를 사용합니다.

### Noul 간 수학 관계를 가정하지 않습니다

다음이 항상 성립한다고 가정하면 안 됩니다.

```text
Noul(X) + Noul(not X) = 1
```

각 질문은 독립적인 자연어 판단입니다. 하나의 완전한 상대 분포가 필요하면 Choice가 더 적합할 수 있습니다.

## 5. 여러 primitive를 함께 사용하기

```ts
const questions = {
  department: choice("Which team should handle `ticket.message`?", {
    billing: "Payments and refunds",
    technical: "Bugs and integrations",
    account: "Login and permissions",
    other: "None of the above",
  }),
  refundRequested: noul(
    "Does `ticket.message` explicitly request a refund?",
  ),
  frustration: score(
    "How frustrated is the customer in `ticket.message`?",
    ["Calm", "Frustrated", "Very angry"] as const,
  ),
};
```

모든 질문을 한 번에 보내고 코드가 필요한 답만 사용합니다.

```ts
if (answers.department.choice === "billing") {
  const refundLikely = answers.refundRequested.noul >= 0.8;
  return routeToBilling({ refundLikely });
}
```

## 6. Primitive 선택 체크리스트

### Choice 체크리스트

- 선택지가 서로 배타적인가
- 목록이 빠진 범주 없이 충분한가
- 필요하면 other가 있는가
- 선택지 설명이 겹치지 않는가
- 결과를 바로 코드 분기에 사용할 수 있는가

### Score 체크리스트

- 수준에 명확한 순서가 있는가
- 각 단계의 경계가 설명되어 있는가
- 최대와 최소의 의미가 분명한가
- 정확한 수량 대신 의미적 수준을 재는가
- confidence가 낮을 때 처리 경로가 있는가

### Noul 체크리스트

- 하나의 명제만 묻는가
- 높은 값이 항상 yes를 의미하는가
- true와 false의 경계가 필요한가
- 중간 확률을 처리하는 review 경로가 있는가
- 정도를 묻는 질문을 잘못 사용하고 있지 않은가
