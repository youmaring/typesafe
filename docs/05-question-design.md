# 좋은 질문과 기준을 설계하는 방법

TypeSafe 통합 품질은 SDK 호출 문법보다 질문과 criteria 설계에 더 크게 좌우될 수 있습니다.

## 1. 하나의 질문에는 하나의 판단만 넣습니다

나쁜 예:

```text
이 고객 문의를 분석하고 담당 부서와 긴급도와 환불 가능성을 결정하라.
```

문제가 되는 이유:

- 여러 판단이 하나의 출력에 섞임
- 어떤 부분이 틀렸는지 알기 어려움
- 각 판단에 다른 임계값을 적용할 수 없음
- 업무 정책 변경 시 질문 전체를 다시 설계해야 함

좋은 예:

```text
Choice: 어느 부서가 담당해야 하는가
Noul: 긴급성을 명시적으로 표현했는가
Noul: 환불을 요청했는가
Score: 불만 정도는 어느 수준인가
```

## 2. 질문 ID에 의미를 맡기지 않습니다

질문 ID는 코드가 결과를 찾기 위한 키입니다.

```ts
const questions = {
  refundRequested: noul("Does the customer explicitly request a refund?"),
};
```

다음 형태는 피합니다.

```ts
const questions = {
  refundRequested: noul("Check this"),
};
```

모델이 ID를 보고 빠진 의도를 보충할 것이라고 가정하면 안 됩니다.

## 3. state의 대상을 정확히 지목합니다

```ts
noul("Does `ticket.messages[0].text` request a refund?")
```

여러 필드를 비교해야 한다면 모두 적습니다.

```ts
noul(
  "Does `refundPolicy` allow the remedy requested in `ticket.message`, given `order.charges`?",
)
```

경로를 명시하면 질문 범위를 좁히고 재현하기 쉬워집니다.

## 4. 사람이 빠르게 판단할 수 있는 질문으로 만듭니다

좋은 System One 질문:

- 관련 정보가 주어지면 빠르게 답할 수 있음
- 긴 계획이나 다단계 추론이 필요 없음
- 정답 후보가 제한됨
- 경계 조건을 설명할 수 있음

나쁜 질문:

```text
이 회사의 장기 성장 가능성을 종합적으로 평가하라.
```

분해 예:

- 시장 수요는 어느 수준인가
- 제품 차별성은 어느 수준인가
- 기술 실행 가능성은 어느 수준인가
- 규제 위험이 높은가

그 뒤 코드에서 가중치를 적용합니다.

## 5. 질문을 문자 그대로 읽어도 올바르게 작성합니다

Jev는 질문의 숨은 의도보다 작성된 문장을 문자 그대로 처리할 수 있습니다.

모호한 예:

```text
Is this a good customer?
```

개선 예:

```text
Based only on `customer.paymentHistory`, has the customer paid invoices without repeated delays?
```

잘못된 답을 보고 다음과 같이 설명하게 된다면 그 설명을 질문이나 criteria에 포함해야 합니다.

```text
내가 의미한 것은 장기 고객이 아니라 최근 결제 이력이 좋은 고객이었다.
```

## 6. Choice 경계를 분명하게 만듭니다

겹치는 선택지:

```ts
{
  payment_issue: "Payment issues",
  refund_issue: "Refund issues",
}
```

환불은 결제 문제에 포함될 수 있어 경계가 겹칩니다.

개선:

```ts
{
  payment_failure: {
    what: "A payment cannot be completed or is rejected",
    not_for: "A completed payment that the customer wants returned",
  },
  refund_request: {
    what: "The customer asks to reverse a completed payment",
    not_for: "A payment that never completed",
  },
}
```

## 7. Score 수준을 관찰 가능한 신호로 작성합니다

나쁜 rubric:

```ts
["bad", "okay", "good"]
```

개선:

```ts
[
  {
    level: "insufficient",
    signals: ["No concrete evidence", "Only generic claims"],
  },
  {
    level: "adequate",
    signals: ["At least one concrete example", "Relevant but limited evidence"],
  },
  {
    level: "strong",
    signals: ["Several concrete examples", "Direct evidence of repeated success"],
  },
] as const
```

수준 이름보다 수준을 구분하는 실제 신호가 중요합니다.

## 8. Noul에서 true와 false 의미를 일치시킵니다

```ts
noul("Does the message request a refund?", {
  true: "The customer asks for money back",
  false: "The customer does not ask for money back",
});
```

질문은 긍정형으로 작성하는 편이 이해하기 쉽습니다.

피해야 할 형태:

```text
Does this not fail to avoid being non-compliant?
```

복잡한 부정은 여러 질문으로 나눕니다.

## 9. 예시는 경계 사례 중심으로 사용합니다

criteria에 예시를 넣을 때 쉬운 사례만 반복하면 경계 개선에 도움이 적습니다.

좋은 예시 구성:

- 명확한 정답 사례
- 이웃 범주와 혼동하기 쉬운 사례
- 해당 선택지에 포함되면 안 되는 사례
- 정보가 부족한 사례

예시는 학습 데이터가 아니라 요청 문맥의 일부입니다. 너무 많은 예시를 넣으면 비용과 문맥 크기가 증가하므로 실제 개선이 있는지 평가해야 합니다.

## 10. 구조화된 instructions 사용

```ts
const suspiciousRequest = noul({
  question: "Does the message request a sensitive credential?",
  inspect: "`ticket.message`",
  compareAgainst: "`policy.sensitiveCredentials`",
  focus: "Look for requests to disclose the credential itself.",
});
```

구조화를 사용하기 좋은 경우:

- 질문과 참고 데이터를 분리해야 함
- 비교 대상이 여러 개임
- focus와 제외 조건을 따로 표현해야 함
- taxonomy의 일부를 JSON으로 전달함

단순 질문까지 무조건 구조화할 필요는 없습니다.

## 11. 질문 간 독립성을 고려합니다

같은 요청 안의 질문은 서로의 답을 보지 않습니다.

잘못된 기대:

```text
department가 technical이면 bug severity를 평가하라.
```

`bugSeverity` 질문은 department 답을 알 수 없습니다.

대신 다음 중 하나를 선택합니다.

### speculative 질문

모든 ticket에 `bugSeverity`를 물은 뒤 technical일 때만 사용합니다.

### 두 번째 요청

첫 답이 다음 요청의 state나 선택지를 실제로 결정해야 하는 경우에만 사용합니다.

## 12. 질문 버전 관리

질문 변경은 모델 동작 변경과 같습니다.

권장 구조:

```ts
export const QUESTION_SET_VERSION = "triage-v1";
```

로그에 함께 기록:

```ts
{
  questionSetVersion: QUESTION_SET_VERSION,
  model: result.model,
  answers: result.answers,
}
```

질문 또는 criteria를 바꿀 때:

1. 기존 평가셋을 다시 실행
2. 이전 버전과 결과 비교
3. 임계값 재검토
4. 자동 처리율과 오류율 비교
5. 문제 없을 때 배포

## 13. 언어 선택

한국어 입력은 그대로 state에 넣을 수 있습니다. 다만 실제 데이터로 정확도를 확인해야 합니다.

검토할 실험:

- 한국어 state + 한국어 질문
- 한국어 state + 영어 질문
- 도메인 용어를 원문으로 유지한 질문
- 경계 설명을 더 구체적으로 만든 질문

어떤 방식이 더 좋은지는 use case별로 평가합니다.

## 14. 최종 체크리스트

- 질문 하나가 판단 하나만 포함하는가
- 질문 ID 없이 instructions만 읽어도 의미가 완전한가
- state에서 판단 대상을 명시했는가
- 선택지 또는 수준의 경계가 겹치지 않는가
- other 또는 unknown이 필요한가
- true와 false 의미가 질문 방향과 일치하는가
- 계산이나 날짜 처리를 모델에 맡기지 않았는가
- 관련 없는 state를 제거했는가
- 낮은 confidence와 중간 Noul 처리 경로가 있는가
- 실제 정답 데이터로 검증했는가
