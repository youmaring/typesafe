# 한계, 실패 모드, 문제 해결

## 1. API 키 오류

증상:

```text
No API key was provided
401 Unauthorized
```

확인:

- `.env`에 `TYPESAFE_API_KEY`가 있는지
- `dotenv/config`를 import했는지
- 실행 위치가 프로젝트 루트인지
- 값 앞뒤에 불필요한 공백이 없는지
- 키가 폐기되거나 회전되지 않았는지

코드에서 키 자체를 출력하지 않습니다.

## 2. 요청 validation 오류

증상:

```text
422 Unprocessable Entity
```

확인:

- `questions`가 비어 있지 않은지
- Score에 최소 두 수준이 있는지
- Choice criteria가 객체인지
- state와 instructions가 JSON 직렬화 가능한지
- 함수, BigInt, 순환 참조가 포함되지 않았는지
- 직접 HTTP 호출 시 `model` 필드가 있는지

## 3. Rate limit과 overload

증상:

```text
429 Too Many Requests
529 Overloaded
```

대응:

- SDK의 기본 retry 사용
- 질문을 같은 state 기준으로 batch
- concurrency 제한
- queue 도입
- 실패한 batch 항목만 재실행
- 애플리케이션 retry가 SDK retry와 중복되지 않는지 확인

rate limit 값은 변할 수 있으므로 고정 상수로만 운영하지 않습니다.

## 4. Timeout

확인:

- state와 질문이 지나치게 큰지
- 네트워크 문제인지
- 재시도 때문에 전체 시간이 길어진 것인지
- 동기 API에 맞지 않는 timeout인지

대응:

```ts
await client.systemOne(
  { state, questions },
  { timeout: 5_000 },
);
```

전체 요청 deadline과 SDK의 시도별 timeout을 함께 설계합니다.

## 5. 브라우저 runtime 오류

증상:

```text
TypeSafeClient is running in a browser
```

원인:

SDK가 API 키 노출을 막기 위해 브라우저 실행을 거부합니다.

해결:

- 호출 코드를 서버 route로 이동
- 프론트엔드는 자체 백엔드만 호출
- API 키를 public 환경변수에 두지 않음

`dangerouslyAllowBrowser`는 일반적인 해결책이 아닙니다.

## 6. Choice confidence가 낮음

가능한 원인:

- 선택지 경계가 겹침
- 입력이 여러 범주를 동시에 포함
- other 선택지가 없음
- state에 필요한 정보가 없음
- 질문이 너무 넓음
- 관련 없는 state가 많음

개선 순서:

1. probabilities에서 1위와 2위 확인
2. 실제 입력을 사람이 분류해 봄
3. 각 선택지에 `what`과 `not_for` 추가
4. 경계 예시 추가
5. multi-label 성격이면 여러 Noul로 분리 검토
6. 낮은 confidence는 사람 검토로 보냄

## 7. Score가 기대와 다름

가능한 원인:

- 수준 설명이 추상적임
- 단계 간 간격이 모호함
- 서로 다른 차원을 하나의 Score로 합침
- 정확한 숫자를 얻으려 함

개선:

- 관찰 가능한 신호 추가
- 복합 판단을 여러 Score로 분리
- rubric을 낮음에서 높음 순으로 확인
- score뿐 아니라 probabilities 확인
- confidence가 낮으면 자동 처리하지 않음

## 8. Noul이 계속 중간값

가능한 원인:

- 질문 경계가 불명확함
- yes와 no를 판단할 정보가 state에 없음
- 하나의 질문에 여러 조건이 들어감
- 정도를 묻는 질문을 Noul로 만듦

개선:

```ts
noul(question, {
  true: "명확한 yes 조건",
  false: "명확한 no 조건",
});
```

필요하면 질문을 나눕니다.

```text
결제에 실패했는가
환불을 요청했는가
즉시 처리를 요구했는가
```

## 9. 계산과 카운팅 오류

Jev는 계산기나 정확한 카운터로 사용하지 않습니다.

나쁜 예:

```text
이 문서에 오류가 몇 개 있는가?
```

개선:

1. 코드가 검사 후보를 생성
2. 각 후보를 Noul로 판단
3. 코드는 yes 결과를 집계

금액 합계, 평균, 날짜 차이, 문자 개수는 코드에서 계산합니다.

## 10. 날짜 판단 오류

모델에게 날짜 순서나 기간을 직접 계산하게 하지 않습니다.

권장:

- 월 Choice
- 일 Choice
- 연도 Choice
- not_stated 선택지
- 코드에서 실제 날짜 생성
- 코드에서 비교와 기간 계산

## 11. 긴 state에서 품질 하락

증상:

- 짧은 예제에서는 맞지만 실제 문서에서 틀림
- 관련 없는 문단에 영향을 받음
- confidence가 낮아짐

개선:

- 검색으로 관련 구간만 선택
- state의 불필요한 metadata 제거
- 질문 대상 경로 명시
- 문서를 chunk로 나눠 독립 평가
- passage relevance Noul로 1차 필터

## 12. Literal interpretation

Jev는 의도보다 작성된 조건을 문자 그대로 읽을 수 있습니다.

문제가 생기면 다음을 확인합니다.

- 숨은 전제가 있는가
- 사람이 알아서 보완할 것을 기대했는가
- 복잡한 부정문인가
- 경계 조건이 criteria에 없는가

잘못된 결과를 설명할 때 사용한 문장을 질문에 추가하는 것이 좋은 개선 방법입니다.

## 13. 질문 사이의 결과가 수학적으로 맞지 않음

다음 관계를 기대하면 안 됩니다.

```text
Noul(X) = 1 - Noul(not X)
```

또한 yes/no Choice의 yes 확률과 Noul 값을 동일한 값으로 기대하면 안 됩니다.

이유:

- Choice는 선택지 간 상대 경쟁
- Noul은 하나의 명제에 대한 절대 판단
- 질문 표현과 criteria가 다름
- 각 질문은 독립 평가

한 가지 의미는 한 가지 방식으로 질문하고 별도 평가를 통해 threshold를 조정합니다.

## 14. Adversarial content에 영향받음

state 안의 텍스트가 모델을 조종하려 할 수 있습니다.

대응:

- 입력을 신뢰하지 않음
- 질문의 판단 기준을 명확히 작성
- prompt injection 탐지 질문 추가
- 고위험 자동화 금지
- 적대적 평가셋 운영
- 권한과 정책은 코드에서 재검사

## 15. 텍스트 생성이 필요함

Jev로 문장을 생성하려 하지 않습니다.

권장 조합:

```text
Jev
  -> 의도, 위험, 사실 여부, 라우팅 판단

생성형 LLM
  -> 최종 설명 또는 답변 작성

코드
  -> 허용된 문맥 구성과 정책 검사
```

## 16. 한국어 성능이 기대보다 낮음

대응:

- 실제 한국어 데이터 평가셋 생성
- 한국어 질문과 영어 질문 비교
- 도메인 약어 설명
- 애매한 criteria 구체화
- review 구간 확대
- 중요한 업무는 사람 검토

## 17. 결과가 변경됨

가능한 원인:

- alias가 다른 모델 버전을 가리킴
- 질문 또는 criteria 변경
- state 전처리 변경
- 입력 데이터 분포 변화
- SDK 또는 timeout 정책 변경

확인할 로그:

- 실제 `result.model`
- 질문 세트 버전
- 전처리 버전
- probabilities와 confidence
- token 사용량
- 최종 업무 결정

## 18. 문제 해결 순서

1. 실패 사례의 원본 state를 안전하게 확보
2. 실제 모델 버전 확인
3. probabilities와 confidence 확인
4. 질문이 원자적인지 확인
5. state가 필요한 정보만 포함하는지 확인
6. criteria 경계 확인
7. 계산 또는 날짜 문제인지 확인
8. adversarial 문구 확인
9. 평가셋에서 변경 전후 비교
10. 불확실하면 자동화 범위를 줄이고 사람 검토
