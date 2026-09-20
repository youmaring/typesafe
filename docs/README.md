# TypeSafe AI / Jev 상세 문서

이 폴더는 TypeSafe AI와 Jev를 처음 접하는 개발자가 개념을 이해하고, JavaScript 또는 TypeScript 프로젝트에 적용하고, 운영 단계까지 확장할 수 있도록 구성한 문서 모음입니다.

## 가장 먼저 알아야 할 내용

TypeSafe AI는 자유로운 문장을 생성하는 챗봇 API가 아닙니다. Jev는 주어진 `state`를 읽고 개발자가 정의한 질문에 대해 제한된 형태의 답과 확률을 반환합니다.

```text
업무 데이터
  -> state 구성
  -> Choice / Score / Noul 질문 정의
  -> Jev 평가
  -> 확률과 confidence 확인
  -> 코드에서 자동 처리, 재확인, 사람 검토 결정
```

모델은 의미 판단을 담당하고, 애플리케이션 코드는 다음을 담당합니다.

- 제어 흐름
- 권한과 인증
- 계산과 날짜 처리
- 임계값과 업무 정책
- 외부 API 호출
- 데이터 변경
- 사람 검토와 감사 로그

## 문서 목차

1. [TypeSafe AI와 Jev란 무엇인가](./01-overview.md)
2. [핵심 개념: State, Question, Answer](./02-core-concepts.md)
3. [Choice, Score, Noul 상세 사용법](./03-primitives.md)
4. [JavaScript / TypeScript SDK 사용법](./04-javascript-sdk.md)
5. [좋은 질문과 기준을 설계하는 방법](./05-question-design.md)
6. [주요 패턴과 실제 적용 구조](./06-patterns.md)
7. [Cookbook과 활용 사례 지도](./07-cookbook-map.md)
8. [평가 데이터와 임계값 테스트](./08-evaluation.md)
9. [운영 환경 구성과 관측성](./09-production.md)
10. [보안, 데이터 처리, 법무 체크리스트](./10-security.md)
11. [한계, 실패 모드, 문제 해결](./11-troubleshooting.md)

## 추천 학습 경로

### 처음 사용하는 경우

1. `01-overview.md`
2. `02-core-concepts.md`
3. `03-primitives.md`
4. `04-javascript-sdk.md`
5. 현재 프로젝트의 `src/questions.ts`와 `src/decision.ts`

### 실제 서비스에 적용하려는 경우

1. `05-question-design.md`
2. `06-patterns.md`
3. `08-evaluation.md`
4. `09-production.md`
5. `10-security.md`
6. `11-troubleshooting.md`

### 적용 사례를 찾는 경우

- 고객 문의 분류: `06-patterns.md`의 intent routing
- 다중 조건 평가: `06-patterns.md`의 composite scoring
- RAG 필터링: `07-cookbook-map.md`
- 함수 호출: `07-cookbook-map.md`
- LLM 안전 장치: `07-cookbook-map.md`
- 문서 분류와 추출: `07-cookbook-map.md`

## 프로젝트 예제와의 연결

```text
src/questions.ts
  질문과 criteria를 중앙 관리합니다.

src/decision.ts
  모델의 확률과 confidence를 업무 정책으로 변환합니다.

src/index.ts
  TypeSafeClient를 만들고 state와 questions를 전송합니다.

test/decision.test.ts
  API를 호출하지 않고 업무 정책을 검증합니다.
```

문서를 읽은 뒤에는 질문 정의부터 변경해 보는 것이 좋습니다. 모델 호출 코드보다 질문 경계와 임계값 설계가 실제 품질에 더 큰 영향을 줄 수 있습니다.
