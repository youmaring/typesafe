# TypeSafe AI / Jev 조사 보고서

대상: [TypeSafe 공식 문서](https://docs.typesafe.ai/introduction)  
개발 기준: JavaScript / TypeScript, Node.js 서버 환경

주제별 상세 설명과 사용법은 [`docs/README.md`](./docs/README.md)에서 확인할 수 있습니다.

## 1. 한 줄 결론

TypeSafe AI의 Jev는 대화형 LLM이나 자율 에이전트가 아니라, 비정형 텍스트와 JSON 상태를 보고 빠르게 구조화된 판단을 반환하는 모델입니다.

핵심 흐름은 다음과 같습니다.

```text
state + 여러 typed questions
  -> Jev가 병렬 평가
  -> Choice / Score / Noul 결과와 확률
  -> 일반 코드가 분기, 임계값, 라우팅, 부작용을 통제
```

Jev를 기존 LLM의 JSON 출력 대체재로만 보기보다, 애플리케이션 안에 넣는 의미 판단 함수로 이해하는 편이 정확합니다.

## 2. 무엇을 잘하고 무엇을 하지 않는가

### 잘 맞는 일

- 문서, 메시지, 레코드의 분류
- yes/no 성격의 의미 탐지
- 정해진 척도에 따른 평가
- 의도 라우팅
- 검색 결과 재정렬과 관련성 판단
- 여러 독립 차원의 병렬 평가
- 신뢰도에 따른 자동 처리와 사람 검토 분기

### 맡기면 안 되는 일

- 자유로운 텍스트 생성
- 자율적인 다음 행동 선택
- 정확한 계산과 카운팅
- 날짜와 시간 산술
- 권한 검사와 결제 같은 최종 부작용
- 긴 다단계 추론
- 관련 없는 대량 문맥을 넣고 중요한 사실 찾기

## 3. 핵심 데이터 모델

### State

한 요청에서 판단할 대상입니다. 문자열, JSON 객체, 텍스트 배열을 사용할 수 있습니다. 단순한 경우가 아니면 의미 있는 필드명을 가진 객체가 권장됩니다.

```ts
const state = {
  ticket: {
    message: "I was charged twice.",
    orderId: "A-104",
  },
  policy: "Duplicate charges are refundable.",
};
```

관련 정보만 포함해야 합니다. 큰 state와 무관한 세부 정보는 정확도를 떨어뜨릴 수 있습니다.

### Questions

모든 질문은 같은 state를 보지만 서로의 답은 보지 못합니다. 독립 질문은 한 요청에 함께 넣습니다.

### Answers

질문 ID와 같은 키로 결과가 돌아옵니다. 질문 ID 자체는 추론에 사용되지 않으므로 `instructions`는 질문 ID 없이도 완전한 문장이어야 합니다.

## 4. 세 가지 primitive

### Choice

정해진 비순서형 선택지 중 하나를 고릅니다.

적용 예:

- 담당 부서
- 문서 유형
- 의도
- 프로그래밍 언어

반환값:

```ts
{
  type: "choice",
  choice: "technical",
  probabilities: { billing: 0.1, technical: 0.85, other: 0.05 },
  confidence: 0.78
}
```

운영 지침:

- 최대 255개 선택지를 지원합니다.
- 분류 목록이 모든 경우를 포괄하지 않으면 `other` 또는 `none_of_the_above`를 둡니다.
- 서로 비슷한 선택지는 `what`, `not_for`, `examples` 같은 구조화된 설명으로 경계를 명확히 합니다.
- 깊은 분류 체계는 한 번에 평탄화하지 말고 단계별 Choice로 탐색합니다.

### Score

정의한 순서형 척도 위에서 상태를 평가합니다.

적용 예:

- 불만 정도
- 버그 심각도
- 후보자의 경험 수준
- 문서 품질

반환값의 `score`는 정수 레벨 사이의 소수일 수 있습니다.

```ts
{
  type: "score",
  score: 1.4,
  legend: { "0": "calm", "1": "frustrated", "2": "very angry" },
  probabilities: { "0": 0.0, "1": 0.6, "2": 0.4 },
  confidence: 0.7
}
```

운영 지침:

- 최소 2개, 최대 10개 수준을 정의합니다.
- 배열 순서가 척도의 의미입니다.
- 여러 Score를 조합할 때 각 범위를 0부터 1로 정규화한 뒤 코드에서 가중합합니다.
- 소수 score를 실제 수량의 정확한 보간값으로 해석하면 안 됩니다.

### Noul

yes일 확률을 0부터 1로 반환합니다.

적용 예:

- 환불을 요청했는가
- 개인정보가 포함됐는가
- 긴급성을 표현했는가
- 문서가 질의와 관련 있는가

```ts
{
  type: "noul",
  noul: 0.92
}
```

운영 지침:

- boolean으로 즉시 변환하지 말고 yes, no, 검토 구간을 둡니다.
- Noul에는 별도 `confidence`가 없습니다.
- `0.5`는 강도의 중간이 아니라 yes와 no가 비슷하게 불확실하다는 뜻입니다.
- 정도를 재고 싶다면 Score를 사용합니다.

## 5. 권장 설계 원칙

1. 정상적인 소프트웨어를 먼저 설계합니다.
2. 비정형 데이터에 대한 의미 판단 지점에만 Jev를 넣습니다.
3. 넓은 판단을 원자적인 질문으로 나눕니다.
4. 같은 state를 보는 질문은 한 번에 보냅니다.
5. 확률과 confidence를 기준으로 자동화와 사람 검토를 나눕니다.
6. 최종 권한, 정책, 계산, 부작용은 코드가 소유합니다.
7. 정답 데이터셋으로 질문 문구와 임계값을 검증합니다.

## 6. 대표 패턴 페이지

### [Patterns](https://docs.typesafe.ai/patterns)

Choice, Score, Noul을 일반 코드와 조합하는 전체 설계 원칙입니다.

### [Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out)

나중에 필요할 수도 있는 독립 질문까지 한 요청에 같이 보냅니다. 분류 결과에 따라 불필요한 답은 코드에서 무시합니다. 순차 호출보다 지연과 비용을 줄이는 핵심 패턴입니다.

### [Confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing)

행동의 위험도에 따라 서로 다른 confidence 임계값을 사용합니다. 조회 같은 가역적 행동은 낮은 기준, 송금 승인 같은 고위험 행동은 높은 기준과 재확인을 사용합니다.

### [Composite scoring](https://docs.typesafe.ai/patterns/composite-scoring)

여러 독립 Score를 정규화하고 코드에서 가중합합니다. 최종 점수의 근거와 가중치를 코드로 명확히 관리할 수 있습니다.

### [Intent routing](https://docs.typesafe.ai/patterns/intent-routing)

요청 의도와 복잡도를 먼저 판단해 일반 코드, 전문 LLM, 사람 상담원 중 적절한 처리기로 보냅니다.

## 7. 공식 문서 페이지별 요약

### Introduction

- [Introduction](https://docs.typesafe.ai/introduction): Jev와 System One의 전체 개념, 세 primitive, 원자적 질문 원칙
- [Quick start](https://docs.typesafe.ai/introduction/quickstart): Playground, API 키, `/v1/systemone`, 예제 요청과 응답
- [AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer): 텍스트 생성보다 구조, 보정된 확률, 속도, 일관성을 목표로 하는 학습 관점

### TypeSafe concepts

- [System One](https://docs.typesafe.ai/concepts/system-one): Jev는 빠르고 구조화된 판단 모델이며 생성 모델이 아님
- [State](https://docs.typesafe.ai/concepts/state): 문자열, 객체, 배열 state 구성과 관련 문맥만 전달하는 방법
- [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one): 제어 흐름은 코드, 좁은 의미 판단은 모델이라는 전체 아키텍처
- [Example use cases](https://docs.typesafe.ai/concepts/use-case-map): 지원, 채용, 규정, 검색, 사기 탐지, 라우팅 등의 적용 지도

### Primitives

- [Primitives](https://docs.typesafe.ai/primitives): 세 질문 타입 선택법과 병렬 질문 구성
- [Choice](https://docs.typesafe.ai/primitives/choice): 고정 선택지 분류, 전체 확률 분포, taxonomy 설계
- [Score](https://docs.typesafe.ai/primitives/score): 순서형 rubric, 소수 점수, 복합 점수 구성
- [Noul](https://docs.typesafe.ai/primitives/noul): yes 확률, 검토 구간, boolean 오용 방지
- [Advanced structure](https://docs.typesafe.ai/primitives/advanced): 문자열 대신 객체와 배열로 instructions와 criteria를 구조화하는 방법

### Foundations

- [Confidence](https://docs.typesafe.ai/confidence): Choice와 Score의 분포 집중도를 단일 confidence로 사용하는 방법
- [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13): 현재 모델의 알려진 실패 모드와 우회 방법

### Demos

- [Demos](https://docs.typesafe.ai/demos): 공식 데모 목록
- [Smart home assistant](https://docs.typesafe.ai/demos/smart-home): 요청 유형, 방, 장치, 행동을 병렬로 판정하고 생성이 필요한 경우만 LLM으로 넘기는 예시

### Client SDKs and reference

- [Client SDKs](https://docs.typesafe.ai/sdk): SDK 사용 이유와 지원 언어
- [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript): 설치, 환경변수, 기본 호출
- [JavaScript API](https://docs.typesafe.ai/sdk/javascript/api): 클래스, 타입, helper, 오류 레퍼런스
- [Models](https://docs.typesafe.ai/models): 모델 ID, 가격, rate limit, context, alias, 언어 지원
- [HTTP API](https://docs.typesafe.ai/api): 요청과 응답 스키마, 오류 코드
- [Agent skill](https://docs.typesafe.ai/agent-skill): 코딩 에이전트에 TypeSafe 사용 규칙을 설치하는 방법
- [Legal](https://docs.typesafe.ai/legal): DPA, 고객 계약, 개인정보 처리방침, enterprise ZDR 안내

## 8. Cookbook 페이지별 적용 지도

### Batching and consistency

- [Parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions): 여러 독립 질문을 한 호출에 묶는 성능과 비용 비교
- [Choice self-consistency](https://docs.typesafe.ai/cookbooks/consistency_choice_cookbook): 반복 Choice 결과의 안정성과 검토 전략
- [Noul self-consistency](https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook): 반복 yes/no 판단의 일관성과 임계값 전략

### Classification

- [Classification using confidence](https://docs.typesafe.ai/cookbooks/classification_using_confidence): 세부 분류 confidence가 낮으면 상위 분류로 후퇴
- [Hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification): Choice 확률을 이용한 계층형 beam search
- [Classifying RAG passages](https://docs.typesafe.ai/cookbooks/classifying_rag_passages): 관련성, 모순, prompt injection 위험을 판정해 RAG 문맥 필터링
- [Entity alignment](https://docs.typesafe.ai/cookbooks/entity_alignment): 서로 다른 카탈로그 레코드의 동일 엔티티 여부 판단

### Extraction and formatting

- [Pre-parsed value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook): regex 등이 만든 후보 중 올바른 값을 Choice로 선택
- [Date extraction](https://docs.typesafe.ai/cookbooks/date_extraction_cookbook): 날짜 구성요소를 추출하고 실제 날짜 계산은 코드로 처리
- [Autoformat](https://docs.typesafe.ai/cookbooks/autoformat): 원문을 생성형으로 다시 쓰지 않고 문단과 Markdown 구조를 복구
- [Semantic find](https://docs.typesafe.ai/cookbooks/semantic_find): 문서 라인 ID를 Choice로 선택하고 답 존재 여부를 Noul로 확인

### Retrieval and verification

- [Rerank TypeSafe](https://docs.typesafe.ai/cookbooks/rerank_typesafe): BM25 등 1차 검색 후보를 Noul 관련성으로 재정렬
- [Citation check](https://docs.typesafe.ai/cookbooks/citation_check): 인용 문맥이 주장과 실제로 부합하는지 판정
- [SDE cascade](https://docs.typesafe.ai/cookbooks/sde_cascade): 저비용 추출, Jev 검증, 고비용 모델 escalation의 cascade

### Agents and LLM systems

- [Function calling](https://docs.typesafe.ai/cookbooks/function_calling): 함수명과 닫힌 인자를 Choice로 고르고 실행 권한은 코드가 검사
- [LLM guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails): 입력과 출력의 위험 Noul, 심각도 Score, 정책 기반 차단
- [Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion): 많은 agent skill 중 관련 후보를 선별하고 실제로 필요한지 재검증

### Research and downstream ML

- [AutoResearch feature discovery](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery): 텍스트에서 Score와 Noul 특징을 만들어 전통 ML 모델에 사용

## 9. JS/TS SDK 핵심

현재 공식 패키지:

```bash
npm install @typesafe-ai/sdk
```

요구 사항:

- Node.js 20 이상
- 현재 확인한 SDK 버전 0.6.0
- 서버 환경의 `TYPESAFE_API_KEY`

기본 호출:

```ts
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();

const response = await client.systemOne({
  state: { message: "I was charged twice." },
  questions: {
    category: choice("What is `message` about?", {
      billing: "Payments and refunds",
      technical: "Bugs and integrations",
      other: "None of the above",
    }),
    asksForRefund: noul("Does `message` ask for a refund?"),
    frustration: score("How frustrated is the customer in `message`?", [
      "Calm",
      "Frustrated",
      "Very angry",
    ] as const),
  },
});
```

SDK 특징:

- 질문 정의에서 응답 타입을 추론합니다.
- 기본 모델은 `jev-latest`입니다.
- 기본 timeout은 시도당 10초입니다.
- 기본 재시도는 최초 요청 뒤 최대 2회입니다.
- 408, 429, 5xx, 연결 실패, timeout을 기본적으로 backoff 재시도합니다.
- `AbortSignal`, 호출별 timeout, retry override를 지원합니다.
- ESM, CommonJS, TypeScript 선언을 포함합니다.

보안 지침:

- 브라우저 사용은 기본 거부됩니다.
- `dangerouslyAllowBrowser: true`는 API 키를 사용자에게 노출하므로 사용하지 않는 것이 좋습니다.
- debug 로그는 인증 헤더를 가리지만 요청 본문은 가리지 않습니다.

## 10. 모델, 비용, 용량

문서상 현재 안정 모델:

- 버전: `jev-1.13.0`
- alias: `jev-latest`
- 가격: input 100만 토큰당 0.042 USD
- output token: 무료
- context: 요청 전체 64k token
- 추가 제한: state와 가장 긴 단일 질문의 합 32k token
- 입력: 텍스트, JSON 객체, 텍스트 배열
- 이미지, 오디오, 비디오: 미지원

rate limit 문서값:

- 초당 250,000 token
- 분당 1,200 request

rate limit은 동적으로 바뀔 수 있습니다. alias도 새 모델 출시 시 이동하므로 운영 임계값을 특정 버전에 맞췄다면 버전 ID를 고정해야 합니다.

## 11. 한국어 적용 시 주의

Jev는 CJK를 포함한 비영어 입력을 받지만 영어가 주 학습 언어이며 정확도가 더 높다고 명시합니다.

권장 방법:

1. 실제 한국어 업무 데이터로 별도 평가셋을 만듭니다.
2. 한글 instructions와 영문 instructions를 각각 시험합니다.
3. confidence만 보지 말고 실제 precision, recall, 오탐 비용을 측정합니다.
4. 고위험 업무는 넓은 사람 검토 구간으로 시작합니다.
5. 필요한 경우 state의 원문은 한국어로 두고 기준 설명을 더 명시적으로 작성합니다.

## 12. 알려진 Jev 1.13 실패 모드

공식 jaggedness 문서가 명시한 주요 약점:

- 질문을 의도보다 문자 그대로 읽을 수 있음
- 계산, 카운팅, 수치 정밀도가 약함
- 날짜 비교와 시간 산술이 약함
- 다단계 간접 추론이 약함
- 관련 없는 큰 state에서 정확도가 하락함
- state 안의 adversarial 또는 prompt injection 문구에 영향을 받을 수 있음
- instructions와 criteria가 충돌하면 혼란스러움
- 서로 다른 질문 결과 사이의 수학적 일관성이 보장되지 않음
- 텍스트 생성에 적합하지 않음

중요한 결과:

- `Noul(X)`와 `1 - Noul(not X)`가 같다고 가정하면 안 됩니다.
- yes/no Choice의 yes 확률과 같은 의미의 Noul 값을 동일 임계값으로 취급하면 안 됩니다.
- 별도 Noul 여러 개의 합이 1이 된다고 가정하면 안 됩니다.
- 날짜, 수량, 합계는 추출만 모델에 맡기고 계산은 코드에서 해야 합니다.

## 13. 데이터와 법무

공식 문서는 고객 요청과 응답으로 Jev를 학습하지 않는다고 설명합니다. Enterprise 고객에는 zero data retention 옵션이 제공됩니다.

운영 전 확인할 항목:

- DPA와 개인정보 처리방침
- 저장 기간과 삭제 정책
- 미국 내 호스팅 및 국제 데이터 이전
- subprocessor
- 민감정보 전송 여부
- 조직에서 ZDR이 필요한지 여부
- API 키 보관과 회전 정책

공식 계약은 출력이 부정확하거나 고유하지 않을 수 있으므로 독립적으로 평가할 책임이 고객에게 있음을 명시합니다.

## 14. 이 프로젝트 초안에 적용한 내용

현재 폴더에 다음 초안을 구성했습니다.

- npm + TypeScript + Node.js 20
- `@typesafe-ai/sdk@0.6.0`
- 한 요청에 Choice, Noul, Score 병렬 구성
- state 내부 필드를 backtick path로 명시
- 낮은 Choice confidence를 사람 검토로 라우팅
- Noul 중간 확률 구간을 사람 검토로 라우팅
- Score와 confidence를 함께 사용해 우선순위 계산
- 모델 결과와 업무 결정 코드를 분리
- 순수 결정 코드 단위 테스트
- API 키를 `.env`로 관리하고 git에서 제외

검증 완료:

```text
npm run typecheck  성공
npm test           3개 테스트 성공
npm run build      성공
```

실제 API 호출은 API 키를 넣은 뒤 실행해야 합니다.

## 15. 다음 단계 권장안

1. TypeSafe Playground에서 실제 한국어 데이터 20개 이상을 시험합니다.
2. 첫 실제 use case 하나를 선택합니다.
3. 사람이 정한 정답 데이터 100개 이상을 준비합니다.
4. 질문, criteria, 임계값을 중앙화합니다.
5. 자동 처리, 확인 요청, 사람 검토의 3단계 정책을 만듭니다.
6. `jev-latest`로 탐색한 뒤 운영 전 버전 고정을 검토합니다.
7. 실제 확률 분포, confidence, 모델 버전, 결과 행동을 로깅합니다.
8. 모델 업데이트마다 동일 평가셋으로 회귀 테스트합니다.

가장 쉬운 첫 적용은 현재 초안처럼 고객 문의 triage, 문서 분류, RAG passage 필터링 중 하나입니다.
