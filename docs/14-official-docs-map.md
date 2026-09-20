# 공식 문서 지도

이 저장소 문서는 공식 문서를 조사해 정리한 것입니다. 원문을 직접 확인해야 할 때 이 페이지에서 해당 항목을 찾습니다.

요금, 한도, 모델 버전처럼 변경될 수 있는 값은 항상 원문을 기준으로 확인하는 것이 안전합니다.

## Introduction

| 문서 | 내용 | 관련 문서 |
| --- | --- | --- |
| [Introduction](https://docs.typesafe.ai/introduction) | 전체 개념과 세 primitive | [01](./01-overview.md) |
| [Quick start](https://docs.typesafe.ai/introduction/quickstart) | Playground, API 키, 첫 요청 | [04](./04-javascript-sdk.md) |
| [AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer) | 보정된 확률을 목표로 하는 학습 관점 | [01](./01-overview.md) |

## Concepts

| 문서 | 내용 | 관련 문서 |
| --- | --- | --- |
| [System One](https://docs.typesafe.ai/concepts/system-one) | 모델의 성격과 범위 | [01](./01-overview.md) |
| [State](https://docs.typesafe.ai/concepts/state) | 입력 구성 방법 | [02](./02-core-concepts.md) |
| [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) | 코드가 제어 흐름을 소유하는 아키텍처 | [01](./01-overview.md), [06](./06-patterns.md) |
| [Example use cases](https://docs.typesafe.ai/concepts/use-case-map) | 적용 분야 지도 | [07](./07-cookbook-map.md) |

## Primitives

| 문서 | 내용 | 관련 문서 |
| --- | --- | --- |
| [Primitives](https://docs.typesafe.ai/primitives) | 질문 타입 선택과 병렬 질문 | [03](./03-primitives.md) |
| [Choice](https://docs.typesafe.ai/primitives/choice) | 고정 선택지 분류 | [03](./03-primitives.md) |
| [Score](https://docs.typesafe.ai/primitives/score) | 순서형 rubric 평가 | [03](./03-primitives.md) |
| [Noul](https://docs.typesafe.ai/primitives/noul) | yes 확률 판단 | [03](./03-primitives.md) |
| [Advanced structure](https://docs.typesafe.ai/primitives/advanced) | 구조화된 instructions와 criteria | [05](./05-question-design.md) |

## Foundations

| 문서 | 내용 | 관련 문서 |
| --- | --- | --- |
| [Confidence](https://docs.typesafe.ai/confidence) | 확률 분포와 임계값 설계 | [02](./02-core-concepts.md), [08](./08-evaluation.md) |
| [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13) | 알려진 실패 모드 | [11](./11-troubleshooting.md) |

## Patterns

| 문서 | 내용 | 관련 문서 |
| --- | --- | --- |
| [Patterns](https://docs.typesafe.ai/patterns) | 전체 설계 원칙 | [06](./06-patterns.md) |
| [Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out) | 질문 묶어 보내기 | [06](./06-patterns.md) |
| [Confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing) | 위험도별 임계값 | [06](./06-patterns.md) |
| [Composite scoring](https://docs.typesafe.ai/patterns/composite-scoring) | 다차원 점수 조합 | [06](./06-patterns.md) |
| [Intent routing](https://docs.typesafe.ai/patterns/intent-routing) | 처리기 선택 | [06](./06-patterns.md) |

## Reference

| 문서 | 내용 | 관련 문서 |
| --- | --- | --- |
| [Client SDKs](https://docs.typesafe.ai/sdk) | SDK 개요 | [04](./04-javascript-sdk.md) |
| [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript) | 설치와 기본 사용 | [04](./04-javascript-sdk.md) |
| [JS API reference](https://docs.typesafe.ai/sdk/javascript/api) | 클래스와 타입 | [04](./04-javascript-sdk.md) |
| [Models](https://docs.typesafe.ai/models) | 모델, 가격, 한도 | [12](./12-limits-reference.md) |
| [HTTP API](https://docs.typesafe.ai/api) | 요청과 응답 스키마 | [04](./04-javascript-sdk.md), [12](./12-limits-reference.md) |
| [Agent skill](https://docs.typesafe.ai/agent-skill) | 코딩 에이전트용 skill | [04](./04-javascript-sdk.md) |
| [Legal](https://docs.typesafe.ai/legal) | DPA, 개인정보, 고객 계약 | [10](./10-security.md) |

## Demos

| 문서 | 내용 | 관련 문서 |
| --- | --- | --- |
| [Demos](https://docs.typesafe.ai/demos) | 데모 목록 | [06](./06-patterns.md) |
| [Smart home assistant](https://docs.typesafe.ai/demos/smart-home) | speculative fan-out 실제 예시 | [06](./06-patterns.md) |

## Cookbooks

문제 유형별 정리는 [07 Cookbook 지도](./07-cookbook-map.md)에 있습니다.

### Batching과 일관성

- [Parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions)
- [Choice self-consistency](https://docs.typesafe.ai/cookbooks/consistency_choice_cookbook)
- [Noul self-consistency](https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook)

### Classification

- [Classification using confidence](https://docs.typesafe.ai/cookbooks/classification_using_confidence)
- [Hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification)
- [Classifying RAG passages](https://docs.typesafe.ai/cookbooks/classifying_rag_passages)
- [Entity alignment](https://docs.typesafe.ai/cookbooks/entity_alignment)

### Extraction과 formatting

- [Pre-parsed value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook)
- [Date extraction](https://docs.typesafe.ai/cookbooks/date_extraction_cookbook)
- [Autoformat](https://docs.typesafe.ai/cookbooks/autoformat)
- [Semantic find](https://docs.typesafe.ai/cookbooks/semantic_find)

### Retrieval과 verification

- [Rerank](https://docs.typesafe.ai/cookbooks/rerank_typesafe)
- [Citation check](https://docs.typesafe.ai/cookbooks/citation_check)
- [SDE cascade](https://docs.typesafe.ai/cookbooks/sde_cascade)

### Agent와 LLM 시스템

- [Function calling](https://docs.typesafe.ai/cookbooks/function_calling)
- [LLM guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails)
- [Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion)

### Research

- [AutoResearch feature discovery](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery)
