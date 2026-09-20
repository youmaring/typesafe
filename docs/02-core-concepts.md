# 핵심 개념: State, Question, Answer

## 1. 전체 요청 구조

TypeSafe System One 요청은 크게 세 부분으로 나뉩니다.

```ts
const result = await client.systemOne({
  state,
  questions,
  model: "jev-latest",
});
```

- `state`: 판단할 대상과 참고 정보
- `questions`: state에 대해 수행할 독립적인 판단
- `model`: 사용할 모델 이름 또는 버전

## 2. State란 무엇인가

State는 Jev가 판단할 때 읽는 자료입니다. 단일 문자열, JSON 객체, 배열을 사용할 수 있습니다.

### 문자열 state

하나의 문장이나 짧은 문서를 판단할 때 적합합니다.

```ts
const state = "My payment failed and I need help.";
```

장점:

- 간단함
- 작은 예제를 빠르게 시험하기 좋음

단점:

- 여러 정보의 관계를 구분하기 어려움
- 질문에서 특정 필드를 명시하기 어려움

### 객체 state

대부분의 실제 서비스에서 권장되는 형태입니다.

```ts
const state = {
  ticket: {
    subject: "Payment failure",
    message: "My card keeps failing.",
    channel: "email",
  },
  customer: {
    plan: "business",
    openOrders: 2,
  },
  policy: {
    urgentTerms: ["ASAP", "immediately"],
  },
};
```

장점:

- 정보의 의미와 관계가 명확함
- 질문에서 `ticket.message`처럼 정확히 참조 가능
- 필요 없는 필드를 제거하기 쉬움
- 로그와 재현이 쉬움

### 배열 state

대화 기록, 문단 목록, 후보 목록처럼 순서가 있는 텍스트에 적합합니다.

```ts
const state = {
  messages: [
    { role: "customer", text: "My card failed." },
    { role: "support", text: "Please retry." },
    { role: "customer", text: "It still fails." },
  ],
};
```

## 3. State 설계 원칙

### 필요한 정보만 전달합니다

state가 크다고 항상 좋은 것은 아닙니다. 질문과 무관한 정보가 많으면 모델이 중요한 부분을 구분하기 어려워질 수 있습니다.

나쁜 예:

```ts
const state = entireCustomerDatabaseRecord;
```

좋은 예:

```ts
const state = {
  ticket: {
    message: ticket.message,
    sender: ticket.sender,
  },
  relevantOrders: customer.orders.filter((order) => order.status !== "closed"),
  refundPolicy: policy.refund,
};
```

### 의미 있는 필드명을 사용합니다

```ts
// 피해야 할 형태
{ a: "...", b: "...", c: "..." }

// 권장 형태
{
  ticketMessage: "...",
  refundPolicy: "...",
  recentCharges: ["..."]
}
```

### 계산된 값은 코드에서 미리 만듭니다

Jev에게 합계나 날짜 차이를 계산하게 하지 말고 코드가 계산한 결과를 전달합니다.

```ts
const state = {
  invoiceText,
  overdueDays: calculateOverdueDays(invoice),
  totalAmount: sumInvoice(invoice),
};
```

의미 판단만 Jev에 맡깁니다.

```text
`overdueDays`와 고객 메시지를 고려할 때 즉시 연락이 필요한가?
```

### 민감정보를 최소화합니다

질문에 필요 없는 개인정보, 인증 정보, 결제 정보는 전송하지 않습니다.

## 4. Question이란 무엇인가

Question은 state에 대해 Jev가 수행할 하나의 판단입니다.

```ts
const questions = {
  isUrgent: noul("Does `ticket.message` express urgency?"),
};
```

`isUrgent`는 응답을 찾기 위한 애플리케이션 키입니다. 모델은 이 키의 의미에 의존하지 않습니다. 실제 질문은 `instructions`에 완전하게 작성해야 합니다.

나쁜 예:

```ts
{
  urgent: noul("Check it"),
}
```

좋은 예:

```ts
{
  urgent: noul(
    "Does `ticket.message` explicitly express urgency or immediate business impact?",
  ),
}
```

## 5. 질문은 독립적으로 평가됩니다

한 요청에 여러 질문을 넣어도 각 질문은 다른 질문의 답을 보지 않습니다.

```ts
const questions = {
  department: choice(...),
  bugSeverity: score(...),
  refundRequested: noul(...),
};
```

`bugSeverity`는 `department`가 bug라고 답했는지 알지 못합니다. 모든 질문은 같은 state만 보고 독립적으로 답합니다.

이 특성 때문에 다음 방식이 권장됩니다.

- 같은 state를 보는 독립 질문은 한 요청에 넣음
- 분류 결과에 따라 필요 없는 답은 코드가 무시함
- 앞 답이 다음 state 또는 선택지를 실제로 바꾸는 경우만 두 번째 요청 사용

## 6. 구조화된 instructions

단순한 질문은 문자열로 충분합니다.

```ts
noul("Does `ticket.message` request a refund?")
```

여러 정보와 관점을 분리하고 싶다면 객체를 사용할 수 있습니다.

```ts
noul({
  question: "Does the customer explicitly request a refund?",
  inspect: "`ticket.message`",
  focus: "Require a requested remedy, not a billing complaint alone.",
})
```

`question`, `inspect`, `focus`는 예약된 이름이 아닙니다. 개발자가 읽기 좋은 이름을 선택하면 됩니다.

## 7. Answer란 무엇인가

응답은 질문 ID와 같은 키 아래에 반환됩니다.

```ts
const result = await client.systemOne({ state, questions });

result.answers.department;
result.answers.isUrgent;
result.answers.frustration;
```

TypeScript SDK는 질문 정의를 보고 각 응답 타입을 추론합니다.

```ts
result.answers.department.choice;
result.answers.department.confidence;
result.answers.isUrgent.noul;
result.answers.frustration.score;
```

잘못된 필드는 컴파일 단계에서 발견할 수 있습니다.

```ts
// Noul에는 confidence가 없으므로 타입 오류
result.answers.isUrgent.confidence;
```

## 8. probabilities와 confidence

### probabilities

Choice와 Score는 전체 확률 분포를 제공합니다.

```ts
{
  choice: "billing",
  probabilities: {
    billing: 0.55,
    technical: 0.4,
    other: 0.05,
  },
}
```

선택값 하나만 보는 것보다 다음 정보를 얻을 수 있습니다.

- 1위와 2위가 얼마나 가까운가
- 다른 팀에도 공유할 필요가 있는가
- 분류 체계가 겹치는가
- 입력이 여러 성격을 동시에 가지는가

### confidence

Choice와 Score의 분포 모양을 하나의 값으로 요약합니다.

높은 confidence:

- 한 선택지 또는 수준에 확률이 집중됨

낮은 confidence:

- 여러 선택지 또는 수준에 확률이 분산됨
- 문맥이 부족할 수 있음
- 질문 또는 criteria 경계가 모호할 수 있음
- 입력이 실제로 여러 범주에 걸칠 수 있음

confidence는 정답 확률 자체가 아닙니다. 높은 confidence 결과도 틀릴 수 있으므로 실제 평가 데이터가 필요합니다.

## 9. Model과 version

탐색 단계에서는 기본 alias인 `jev-latest`를 사용할 수 있습니다.

```ts
const client = new TypeSafeClient();
```

운영 임계값을 특정 모델 결과에 맞춰 조정했다면 검증한 버전 ID를 고정하는 편이 안전합니다.

```ts
const client = new TypeSafeClient({
  defaultModel: "jev-1.13.0",
});
```

응답의 `model` 필드를 로그에 남겨 실제로 어느 버전이 처리했는지 기록합니다.

## 10. Usage

응답에는 토큰 사용량이 포함됩니다.

```ts
console.log(result.usage.input_tokens);
console.log(result.usage.output_tokens);
```

운영에서는 다음을 함께 기록하는 것이 좋습니다.

- use case 이름
- 요청 ID
- 모델 버전
- 질문 세트 버전
- input token
- output token
- 지연 시간
- probabilities
- confidence
- 코드가 선택한 최종 행동
- 사람 검토 결과
