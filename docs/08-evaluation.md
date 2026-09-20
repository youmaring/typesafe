# 평가 데이터와 임계값 테스트

TypeSafe 통합에서 가장 중요한 운영 작업은 실제 업무 데이터로 질문과 임계값을 평가하는 것입니다.

## 1. confidence만 보고 품질을 판단하면 안 됩니다

confidence는 확률 분포가 얼마나 한 결과에 집중되어 있는지 보여줍니다. 정답 여부를 직접 보장하지 않습니다.

따라서 다음을 구분해야 합니다.

- 모델 confidence
- 실제 정확도
- 자동 처리율
- 오류 비용
- 사람 검토 비율

## 2. 평가 데이터셋 만들기

### 최소 필드

```ts
interface EvaluationCase {
  id: string;
  state: unknown;
  expected: {
    department?: "billing" | "technical" | "account" | "other";
    urgent?: boolean;
    frustrationRange?: [number, number];
  };
  notes?: string;
}
```

### 데이터 구성

평가셋에는 쉬운 사례만 넣지 않습니다.

- 명확한 정답
- 범주 경계 사례
- 정보 부족 사례
- 여러 범주를 동시에 포함한 사례
- 한국어 표현과 도메인 은어
- 오탈자와 짧은 문장
- 긴 문서
- 적대적 문구 또는 prompt injection
- 실제 운영에서 자주 틀린 사례

### 데이터 분리

- 질문과 criteria를 개선할 때 보는 개발셋
- 최종 성능을 확인하는 검증셋
- 운영 중 새로 수집되는 회귀셋

같은 사례를 계속 보며 질문을 고치면 과적합될 수 있습니다.

## 3. Choice 평가

기본 지표:

- accuracy
- 클래스별 precision
- 클래스별 recall
- confusion matrix
- confidence 구간별 accuracy
- human review 비율

### confidence threshold 평가

```ts
function shouldAutomate(confidence: number, threshold: number) {
  return confidence >= threshold;
}
```

threshold 후보마다 측정합니다.

```text
threshold
자동 처리된 건수
자동 처리 정확도
사람 검토 건수
고위험 오류 건수
```

목표는 정확도 하나가 아니라 허용 가능한 오류와 검토량의 균형입니다.

### 상위 확률 활용

다중 라벨 성격이 있는 업무에서는 1위 외의 확률도 분석합니다.

```ts
const sorted = Object.entries(answer.probabilities)
  .sort((a, b) => b[1] - a[1]);

const margin = sorted[0][1] - sorted[1][1];
```

작은 margin은 선택지 경계가 겹친다는 신호가 될 수 있습니다.

## 4. Noul 평가

Noul을 boolean으로 변환하려면 threshold가 필요합니다.

```ts
const predictedYes = answer.noul >= threshold;
```

업무 목적에 따라 다르게 최적화합니다.

### 놓치면 위험한 탐지

예시:

- 안전 위험
- 개인정보 노출
- prompt injection

높은 recall이 중요할 수 있으므로 yes threshold를 낮추고 사람 검토를 늘릴 수 있습니다.

### 오탐이 위험한 자동 차단

예시:

- 사용자 계정 정지
- 결제 거부
- 콘텐츠 삭제

높은 precision이 중요하므로 yes threshold를 높이고 중간 구간은 사람에게 보냅니다.

### 세 구간 평가

```ts
function route(value: number) {
  if (value >= 0.8) return "yes";
  if (value <= 0.2) return "no";
  return "review";
}
```

평가할 값:

- yes 자동 처리 precision
- no 자동 처리 precision
- review 비율
- review에 포함된 실제 오류 비율

## 5. Score 평가

Score는 실제 숫자 예측이 아니라 정의한 rubric 위의 의미적 위치입니다.

평가 방법:

- 정답 수준과의 평균 절대 차이
- 허용 범위 안 비율
- 임계값 기반 업무 결과 정확도
- confidence가 낮은 항목의 오류율
- rubric 단계별 confusion

예시:

```ts
const expectedHighPriority = expectedSeverity >= 2;
const predictedHighPriority = answer.score >= 1.5;
```

업무가 실제로 임계값만 사용한다면 raw score 오차보다 최종 분기 정확도가 더 중요할 수 있습니다.

## 6. 비용 민감 평가

모든 오류의 비용이 같지 않습니다.

```ts
const COST = {
  falsePositive: 2,
  falseNegative: 10,
  humanReview: 1,
};
```

threshold별 기대 비용을 계산할 수 있습니다.

```text
총 비용 =
  false positive 수 * 비용
  + false negative 수 * 비용
  + human review 수 * 비용
```

실제 업무 정책에 맞는 threshold를 선택합니다.

## 7. 질문 변경 비교

질문 버전 A와 B를 같은 평가셋에 실행합니다.

비교 항목:

- 전체 정확도
- 클래스별 변화
- 자동 처리율
- review 비율
- 고위험 오류
- token 사용량
- 평균 지연
- 긴 입력과 한국어 입력 성능

새 질문이 평균 정확도는 높지만 중요한 소수 클래스 recall을 낮출 수 있습니다.

## 8. 모델 버전 회귀 테스트

alias는 다른 모델 버전으로 이동할 수 있습니다.

운영 절차:

1. 현재 운영 버전을 기록
2. 후보 버전을 평가셋에 실행
3. 질문별 결과 변화 비교
4. threshold 재검토
5. 중요한 오류 사례 수동 검토
6. 승인 후 버전 변경

## 9. 온라인 모니터링

운영 중 기록할 데이터:

```ts
interface DecisionLog {
  requestId: string;
  useCase: string;
  model: string;
  questionSetVersion: string;
  answers: unknown;
  decision: string;
  automated: boolean;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}
```

민감정보는 제외하거나 마스킹합니다.

추가로 수집하면 좋은 피드백:

- 사람 검토자가 수정한 최종 라벨
- 사용자가 취소하거나 되돌린 행동
- downstream 업무 성공 여부
- 고객 불만 또는 escalation

## 10. 평가 자동화 예시 구조

```text
evaluation/
  cases.jsonl
  run.ts
  metrics.ts
  reports/
```

`run.ts`:

- 동일 질문 세트로 모든 사례 호출
- 원본 응답 저장
- 요청 실패와 재시도 기록

`metrics.ts`:

- primitive별 지표 계산
- threshold sweep
- 오류 사례 출력
- 이전 실행과 비교

## 11. 배포 전 기준 예시

- 고위험 자동 처리 precision이 목표 이상
- 필수 탐지 recall이 목표 이상
- 사람 검토율이 운영 가능한 수준
- 한국어 평가셋에서 별도 기준 충족
- 긴 state에서 성능 하락 확인
- prompt injection 사례에서 안전 경로 확인
- timeout과 rate limit fallback 확인
- 모델 버전과 질문 버전 기록 확인
