# 주요 패턴과 실제 적용 구조

## 1. 기본 원칙

TypeSafe 패턴의 공통점은 모델이 전체 업무를 통제하지 않는다는 것입니다.

```text
입력 수집
  -> 코드에서 state 정리
  -> Jev로 좁은 판단 수행
  -> 코드에서 확률과 confidence 해석
  -> 코드가 최종 처리기 선택
  -> 권한 검사 후 부작용 실행
```

## 2. Speculative fan-out

### 무엇인가

현재 입력에 필요할 수도 있고 필요하지 않을 수도 있는 독립 질문을 한 요청에 같이 보내는 방식입니다.

고객 문의 예시:

- 문의 유형 Choice
- 버그 심각도 Score
- 재현 단계 포함 여부 Noul
- 환불 요청 여부 Noul
- 불만 정도 Score

문의가 billing이면 버그 관련 답은 사용하지 않습니다. 문의가 technical이면 환불 답은 무시할 수 있습니다.

### 왜 사용하는가

순차 방식:

```text
문의 유형 요청
  -> technical인지 확인
  -> 버그 심각도 요청
  -> 재현 가능 여부 요청
```

fan-out 방식:

```text
문의 유형 + 버그 심각도 + 재현 가능 여부 + 환불 여부
  -> 한 요청
  -> 코드에서 필요한 답만 사용
```

장점:

- 네트워크 왕복 감소
- 전체 지연 감소
- 분기별 요청 코드 단순화
- 같은 state를 반복 전송하지 않음

### TypeScript 예시

```ts
const result = await client.systemOne({
  state: { ticket },
  questions: {
    category: choice("What is the main category of `ticket.message`?", {
      bug: "A product defect or unexpected behavior",
      billing: "Payments, invoices, or refunds",
      feature: "A requested new capability",
      other: "None of the above",
    }),
    bugSeverity: score(
      "If `ticket.message` describes a bug, how severe is it?",
      ["Minor", "Major", "Critical"] as const,
    ),
    hasReproductionSteps: noul(
      "Does `ticket.message` provide concrete steps to reproduce the problem?",
    ),
    refundRequested: noul(
      "Does `ticket.message` request a refund or credit?",
    ),
  },
});
```

```ts
const { answers } = result;

switch (answers.category.choice) {
  case "bug":
    return routeBug({
      severity: answers.bugSeverity.score,
      reproducible: answers.hasReproductionSteps.noul >= 0.7,
    });
  case "billing":
    return routeBilling({
      refundLikely: answers.refundRequested.noul >= 0.8,
    });
  default:
    return routeGeneral();
}
```

### 사용하지 말아야 하는 경우

- 앞 답이 다음 질문의 선택지를 실제로 결정함
- 첫 답으로 외부 데이터를 조회해야 다음 state가 만들어짐
- 모든 speculative 질문을 넣으면 context 제한을 크게 소비함
- 질문이 독립적이지 않고 이전 답을 반드시 참조해야 함

## 3. Confidence-gated routing

### 무엇인가

모델의 confidence와 행동 위험도를 함께 고려해 자동 처리 여부를 결정합니다.

### 기본 세 구간

```text
높은 신뢰도
  -> 자동 처리

중간 신뢰도
  -> 사용자 확인 또는 추가 정보 요청

낮은 신뢰도
  -> 사람 검토 또는 다른 시스템
```

### 위험도별 기준

```ts
const intent = answers.intent;

if (intent.confidence < 0.6) {
  return routeToHuman();
}

if (intent.choice === "show_balance") {
  return showBalance();
}

if (intent.choice === "approve_transfer") {
  if (intent.confidence >= 0.9) {
    return requestFinalUserConfirmation();
  }

  return routeToHuman();
}
```

낮은 위험 행동과 높은 위험 행동에 같은 임계값을 쓰지 않습니다.

### 권장 정책 분류

| 행동 유형 | 예시 | 정책 |
| --- | --- | --- |
| 읽기 전용 | 화면 이동, 정보 조회 | 비교적 낮은 기준 가능 |
| 가역적 변경 | 임시 태그, 초안 생성 | 중간 기준과 실행 취소 |
| 외부 통신 | 메시지 발송 | 높은 기준과 미리보기 |
| 금전 및 권한 | 결제, 환불, 계정 권한 | 높은 기준, 재확인, 별도 권한 검사 |
| 규제 및 안전 | 신고, 차단, 의료 판단 | 사람 검토 중심 |

## 4. Composite scoring

### 무엇인가

복잡한 하나의 평가를 여러 독립 Score로 나눈 뒤 코드에서 가중합합니다.

나쁜 질문:

```text
이 후보자가 좋은 엔지니어인가?
```

분해:

- 기술 깊이
- 시스템 설계 경험
- 협업 경험
- 리더십 경험
- 역할 관련성

### TypeScript 예시

```ts
const maxScore = 4;

const technical = answers.technicalDepth.score / maxScore;
const architecture = answers.architecture.score / maxScore;
const collaboration = answers.collaboration.score / maxScore;
const leadership = answers.leadership.score / maxScore;

const seniorIcScore =
  technical * 0.4 +
  architecture * 0.35 +
  collaboration * 0.15 +
  leadership * 0.1;
```

장점:

- 최종 점수의 근거 확인 가능
- 직무별 가중치 변경 가능
- 질문 전체를 다시 작성하지 않고 정책 변경 가능
- 어떤 차원이 품질을 낮추는지 분석 가능

### confidence 포함

```ts
const lowConfidence = [
  answers.technicalDepth,
  answers.architecture,
  answers.collaboration,
  answers.leadership,
].some((answer) => answer.confidence < 0.6);

if (lowConfidence) {
  return "human_review";
}
```

고위험 평가에서는 점수뿐 아니라 구성 요소 confidence도 검사합니다.

## 5. Intent routing

### 무엇인가

모든 요청을 같은 비싼 처리기로 보내지 않고, 먼저 의도와 복잡도를 판단해 적합한 경로로 보냅니다.

```text
간단한 조회
  -> 일반 코드 또는 데이터베이스

전문 설명
  -> 특정 문맥을 가진 LLM

복잡한 민원
  -> 사람 상담원

불확실한 요청
  -> 사람 검토
```

### TypeScript 예시

```ts
const intent = answers.intent;
const complexity = answers.complexity;

if (intent.confidence < 0.55) {
  return routeToHuman();
}

switch (intent.choice) {
  case "order_status":
    return handleWithDatabase();
  case "product_question":
    return handleWithProductLlm();
  case "complaint":
    if (complexity.confidence < 0.6 || complexity.score >= 1.5) {
      return routeToHuman();
    }
    return handleWithComplaintLlm();
  default:
    return routeToHuman();
}
```

## 6. Hierarchical classification

선택지가 너무 많거나 계층 구조일 때 단계별 Choice를 사용합니다.

```text
1단계: 큰 분류
2단계: 선택된 큰 분류의 하위 분류
3단계: 세부 분류
```

단순 greedy 방식은 각 단계의 1위만 선택합니다. 더 안정적인 방식은 확률이 높은 여러 경로를 유지하는 beam search입니다.

코드가 담당할 일:

- 현재 노드의 자식 선택지 생성
- 확률 누적
- 상위 K개 경로 유지
- 종료 노드 판정
- confidence가 낮으면 상위 범주로 후퇴

## 7. Cascade

저비용 처리기부터 시작하고 불확실하거나 어려운 입력만 더 비싼 처리기로 올립니다.

```text
정규식 또는 파서
  -> Jev 검증
  -> 전문 생성형 모델
  -> 사람 검토
```

예시:

1. regex가 금액 후보를 추출
2. Jev Choice가 문맥상 올바른 후보를 선택
3. 확률이 낮으면 생성형 추출 모델 사용
4. 여전히 불확실하면 사람 검토

## 8. Function routing

자연어 요청을 함수 호출로 연결할 때 Jev는 허용된 함수와 닫힌 인자를 선택하는 데 사용할 수 있습니다.

```ts
const action = choice("Which allowed operation matches `request`?", {
  get_order_status: "Read the current order status",
  cancel_order: "Request cancellation of an eligible order",
  update_address: "Change the delivery address before shipment",
  unsupported: "No allowed operation matches",
});
```

모델이 선택했다고 바로 실행하지 않습니다.

```ts
if (answer.confidence < 0.8) return requireConfirmation();
if (!userCanPerform(answer.choice)) return deny();
if (!operationIsValidForState(answer.choice, order)) return deny();

return executeAllowedOperation(answer.choice);
```

## 9. 패턴 선택 가이드

| 상황 | 권장 패턴 |
| --- | --- |
| 분기마다 필요한 질문이 다름 | Speculative fan-out |
| 잘못된 자동화 비용이 큼 | Confidence-gated routing |
| 여러 평가 요소를 합쳐야 함 | Composite scoring |
| 요청을 코드, LLM, 사람에게 나눔 | Intent routing |
| 분류 계층이 깊음 | Hierarchical classification |
| 쉬운 입력과 어려운 입력 비용 차이가 큼 | Cascade |
| 자연어를 안전한 함수로 연결 | Function routing |
