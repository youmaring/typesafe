# 평가 스크립트

질문 세트와 임계값을 실제 데이터로 검증하기 위한 최소 평가 도구입니다.

## 구성

```text
cases.jsonl   사람이 정답을 단 평가 사례
types.ts      사례와 결과 타입
metrics.ts    지표 계산 순수 함수 (API 호출 없음)
run.ts        평가 실행과 리포트 출력
results/      실행 결과 JSON (git 제외)
```

## 실행

```bash
npm run eval           # 영어 질문 세트, 전체 사례
npm run eval:ko        # 한국어 질문 세트, 전체 사례
npm run eval:ko-cases  # 한국어 질문 세트, 한국어 사례만
```

옵션을 직접 지정할 수도 있습니다.

```bash
node dist/evaluation/run.js --set=ko --lang=en
```

- `--set=en` 또는 `--set=ko`: 질문 세트 선택
- `--lang=ko` 또는 `--lang=en`: 평가 사례 언어 필터

실행에는 `TYPESAFE_API_KEY`가 필요하며 사례 수만큼 API를 호출합니다.

## 출력 지표

### 부서 분류 Choice

- 전체 정확도
- 클래스별 precision, recall, support
- confidence 임계값별 자동 처리량과 자동 처리 정확도
- 오분류 사례 목록과 해당 confidence

### 긴급도 Noul

- yes와 no 구간의 precision
- 사람 검토로 빠지는 비율
- 자동 처리 비율
- 놓친 긍정 사례 수

### 불만 Score

- 평균 절대 오차
- 허용 오차 내 비율
- 실제 업무 임계값 기준 precision과 recall

## 사례 추가 방법

`cases.jsonl`에 한 줄씩 추가합니다.

```json
{"id":"ko-011","language":"ko","message":"고객 문의 원문","expected":{"department":"billing","urgent":false,"frustration":1},"notes":"왜 포함했는지"}
```

- `department`: `billing`, `technical`, `account`, `other`
- `urgent`: 긴급 여부 정답
- `frustration`: 0은 침착, 1은 불만, 2는 매우 화남

쉬운 사례만 넣지 말고 경계 사례, 정보 부족 사례, 적대적 문구 사례를 함께 포함하는 것이 좋습니다.

## 지표 코드 테스트

`metrics.ts`는 API를 호출하지 않는 순수 함수라 단위 테스트로 검증합니다.

```bash
npm test
```

## 사용 순서 예시

1. 평가셋에 실제 업무 사례를 추가합니다.
2. 현재 질문 세트로 실행해 기준선을 기록합니다.
3. 질문이나 criteria를 수정합니다.
4. 다시 실행해 같은 지표로 비교합니다.
5. 임계값을 조정하고 자동 처리량과 오류를 함께 확인합니다.
6. 결과 JSON과 질문 세트 버전을 함께 보관합니다.
