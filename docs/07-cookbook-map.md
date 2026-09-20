# Cookbook과 활용 사례 지도

이 문서는 공식 cookbook을 문제 유형별로 정리한 적용 가이드입니다.

## 1. Batching과 일관성

### Parallel questions

문제:

- 하나의 문서에 대해 여러 분석을 순차 호출함
- state를 반복 전송함
- 전체 지연이 커짐

접근:

- Noul, Choice, Score를 한 요청에 함께 전송
- 각 답은 독립적으로 평가
- 코드가 필요한 결과만 사용

적용 분야:

- 문서 분석
- 고객 문의 triage
- 규정 검토
- 이력서 분석

### Choice self-consistency

문제:

- 같은 입력을 반복 평가했을 때 분류가 흔들림
- 자동화와 abstention 기준이 필요함

접근:

- 동일 Choice를 반복 실행
- 결과 분포와 일치율 측정
- 의견이 갈리면 사람 검토

주의:

반복 호출은 비용과 지연을 늘립니다. 기본 운영 방식이라기보다 중요한 use case의 안정성 분석 또는 선택적 재검증에 적합합니다.

### Noul self-consistency

문제:

- yes/no 확률이 경계 근처에 있음
- 단일 결과만으로 고위험 행동을 결정하기 어려움

접근:

- 반복 Noul 결과의 안정성을 확인
- review 구간을 정의
- 불안정한 결과는 자동 처리하지 않음

## 2. Classification

### Classification using confidence

문제:

- 세부 taxonomy의 정답을 확신하기 어려움
- 틀린 세부 분류보다 맞는 상위 분류가 더 유용함

접근:

```text
세부 Choice confidence 높음
  -> 세부 범주 사용

세부 Choice confidence 낮음
  -> 더 넓은 상위 범주 사용
```

적용:

- 산업 분류
- 상품 카테고리
- 문서 유형
- 지원 문의 유형

### Hierarchical classification

문제:

- 선택지가 너무 많음
- 계층 구조가 깊음
- 한 번의 flat Choice가 비효율적임

접근:

- 현재 계층의 자식만 Choice로 제공
- 확률이 높은 여러 경로를 유지
- 다음 단계에서 세부 분류

적용:

- 특허 분류
- 상품 taxonomy
- 의료 코드
- 소스 코드 분류

### Classifying RAG passages

문제:

- 검색 결과가 질의와 무관할 수 있음
- 질의와 모순되는 passage가 있을 수 있음
- 검색된 텍스트에 prompt injection이 포함될 수 있음

접근:

각 passage에 대해 독립 질문을 사용합니다.

- 질의와 관련 있는가
- 답변에 필요한 정보를 포함하는가
- 다른 passage와 모순되는가
- 모델을 조종하려는 문구가 있는가
- 위험 수준은 어느 정도인가

통과한 passage만 생성형 모델에 전달합니다.

### Entity alignment

문제:

- 서로 다른 데이터 소스의 레코드가 같은 대상을 가리키는지 판단해야 함

접근:

- 병합 가능성 Score
- 이름 불일치 Noul
- 위치 불일치 Noul
- 식별자 불일치 Noul

적용:

- 중복 제거
- 상품 카탈로그 병합
- 고객 레코드 정리
- 지식 그래프 구축

## 3. Extraction과 formatting

### Pre-parsed value extraction

문제:

- 생성형 모델이 값을 다시 작성하면서 원문과 다른 문자열을 만들 수 있음

접근:

1. regex, 파서, OCR 등으로 후보를 추출
2. 후보 목록 중 올바른 값을 Choice로 선택
3. 정규화와 검증은 코드로 처리

적용:

- 이메일 주소
- 전화번호
- 금액
- 식별자
- 코드와 상품명

### Date extraction

문제:

- 날짜 표현은 의미 판단과 정확한 계산이 함께 필요함

접근:

- 모델은 월, 일, 연도, 상대 표현 등 제한된 구성요소를 Choice로 선택
- 코드는 실제 날짜 객체 생성, 유효성 검증, 순서 비교, 기간 계산을 담당

핵심:

날짜를 이해하는 의미 판단과 날짜 산술을 분리합니다.

### Autoformat

문제:

- OCR 또는 복사 과정에서 문단과 Markdown 구조가 사라짐
- 생성형 모델로 다시 쓰면 원문이 변할 수 있음

접근:

- 줄바꿈이 문장 중간인지 Noul로 판단
- block 유형을 Choice로 분류
- 렌더링은 코드가 수행

적용:

- 문서 구조 복구
- OCR 후처리
- 원문 보존이 중요한 formatting

### Semantic find

문제:

- 긴 문서에서 자연어 질의에 답하는 특정 줄을 찾고 싶음

접근:

- line ID를 Choice 선택지로 제공
- 답이 실제로 존재하는지 Noul로 확인
- 선택된 원문 줄을 그대로 반환

적용:

- 계약서 검색
- 운영 문서 찾기
- 내부 지식 검색

## 4. Retrieval과 verification

### Rerank TypeSafe

문제:

- 빠른 lexical 검색은 후보를 잘 모으지만 최종 순위의 의미 정확도가 부족함

접근:

1. BM25 또는 기존 검색으로 후보 생성
2. 각 후보에 질의 관련성 Noul
3. 확률로 재정렬
4. 상위 결과만 사용

적용:

- RAG
- 법률 문서 검색
- 사내 검색
- 고객 지원 지식 검색

### Citation check

문제:

- 생성된 답변의 인용이 실제 주장을 뒷받침하지 않을 수 있음

접근:

Choice로 다음과 같은 상태를 분류합니다.

- 직접 지원
- 부분 지원
- 관련 있지만 지원하지 않음
- 모순
- 판단할 정보 부족

confidence가 낮거나 모순이면 사람 검토 또는 답변 재생성을 수행합니다.

### SDE cascade

문제:

- 모든 구조화 추출을 고비용 모델로 처리하면 비효율적임

접근:

```text
작은 추출 모델
  -> Jev 의미 검증
  -> 실패 또는 불확실한 항목만 고비용 모델
```

적용:

- 대량 문서 추출
- 청구서와 계약서 처리
- 쉬운 레코드가 대부분인 파이프라인

## 5. Agent와 LLM 시스템

### Function calling

문제:

- 사용자의 자연어를 안전한 함수 호출로 바꿔야 함

접근:

- 함수 이름 Choice
- 닫힌 인자 Choice
- confidence gate
- 실행 전 인증과 비즈니스 규칙 검사

TypeSafe가 담당하지 않는 것:

- 권한 부여
- 외부 API의 실제 호출 안전성
- transaction
- idempotency

### LLM guardrails

문제:

- LLM 입력과 출력의 위험을 자동으로 검사해야 함

접근:

- prompt injection Noul
- 개인정보 포함 Noul
- 유해 콘텐츠 Noul
- 위험 심각도 Score
- 정책 위반 유형 Choice

코드가 threshold에 따라 차단, 마스킹, 재작성, 사람 검토를 선택합니다.

### Skill suggestion

문제:

- agent가 많은 skill 중 불필요한 skill을 로드하거나 잘못 선택함

접근:

1. 전체 skill 이름과 설명을 Choice로 1차 순위화
2. 상위 후보의 상세 내용을 조회
3. 후보별 Noul로 실제 필요 여부 확인
4. 하나도 필요하지 않으면 skill을 사용하지 않음

## 6. Research와 downstream ML

### AutoResearch feature discovery

문제:

- 텍스트에서 전통적인 ML 모델에 넣을 유용한 특징을 찾기 어려움

접근:

- 여러 Noul과 Score를 텍스트 특징으로 사용
- 모델 오류를 분석해 새로운 질문 후보 생성
- downstream 분류기의 성능 변화로 특징 유용성을 평가

적용:

- tabular ML과 텍스트 결합
- 리스크 모델
- 우선순위 예측
- 품질 예측

## 7. Use case 선택표

| 만들고 싶은 기능 | 우선 볼 항목 |
| --- | --- |
| 고객 문의 자동 분류 | Parallel questions, confidence classification |
| RAG 안전성과 품질 개선 | Classifying RAG passages, rerank, citation check |
| 대량 문서 값 추출 | Pre-parsed extraction, SDE cascade |
| 자연어 함수 호출 | Function calling |
| LLM 입출력 검사 | LLM guardrails |
| 깊은 taxonomy | Hierarchical classification |
| 원문을 보존한 문서 복구 | Autoformat |
| 의미 기반 문서 위치 찾기 | Semantic find |
| 여러 평가 기준으로 순위화 | Composite scoring, feature discovery |
