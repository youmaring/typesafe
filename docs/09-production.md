# 운영 환경 구성과 관측성

## 1. 권장 서비스 구조

```text
Client
  -> Application API
  -> 입력 검증과 민감정보 필터링
  -> TypeSafe service module
  -> confidence policy
  -> 업무 handler
  -> 데이터베이스 또는 외부 API
```

TypeSafe SDK 호출을 여러 route에 직접 흩어 놓지 말고 service module로 감싸는 것이 좋습니다.

```ts
export class TicketAnalyzer {
  constructor(private readonly client: TypeSafeClient) {}

  async analyze(ticket: Ticket) {
    return this.client.systemOne({
      state: buildTicketState(ticket),
      questions: triageQuestions,
    });
  }
}
```

## 2. 설정 관리

환경별로 관리할 항목:

- API key
- base URL
- model 또는 고정 버전
- timeout
- retry
- log level
- use case별 threshold
- 자동화 기능 활성화 여부

threshold를 코드 상수 또는 검증된 설정 저장소에서 관리합니다.

```ts
export const TRIAGE_POLICY = {
  departmentConfidenceFloor: 0.6,
  urgentYes: 0.8,
  urgentNo: 0.2,
  frustrationConfidenceFloor: 0.65,
} as const;
```

## 3. 비밀정보 관리

- API 키는 secret manager 또는 서버 환경변수 사용
- 저장소에 커밋하지 않음
- 로그에 출력하지 않음
- 개발, staging, production 키 분리
- 노출 의심 시 즉시 회전
- 필요한 서비스 계정만 접근 허용

## 4. Timeout 설계

SDK timeout은 시도당 적용됩니다. retry가 있으면 전체 응답 시간은 더 길어질 수 있습니다.

동기 API 예시:

```text
사용자 요청 전체 제한
  > TypeSafe 각 시도 timeout
  > downstream 처리 시간
```

AbortSignal을 연결해 클라이언트 연결이 끊기면 불필요한 모델 호출을 취소합니다.

## 5. Retry 설계

SDK 기본 retry 뒤에 애플리케이션 retry를 무조건 추가하면 요청이 과도하게 늘어날 수 있습니다.

구분:

- 사용자 동기 요청: 짧은 제한과 빠른 fallback
- 비동기 queue: 더 긴 backoff와 재처리 가능
- batch: 실패 항목만 별도 재실행

최종 업무 부작용은 idempotency key로 보호합니다.

## 6. Fallback

모델 호출 실패 시 정책을 미리 정합니다.

가능한 fallback:

- 사람 검토 queue
- 기존 rule-based 분류기
- 안전한 기본 범주
- 기능 일시 비활성화
- 사용자에게 추가 정보 요청

고위험 업무에서 네트워크 실패를 자동 승인으로 처리하면 안 됩니다.

```ts
try {
  return await analyzeAndRoute(input);
} catch {
  return routeToHumanReview(input);
}
```

## 7. 로깅

권장 로그:

- 내부 request ID
- use case 이름
- 모델 실제 버전
- 질문 세트 버전
- 처리 시간
- 토큰 사용량
- answer type
- confidence와 확률
- 최종 업무 결정
- 자동 처리 여부
- fallback 여부
- 오류 종류
- 제공되는 경우 TypeSafe request ID

주의:

- 전체 state를 기본 로그에 남기지 않음
- debug 모드는 요청 body를 포함할 수 있음
- 인증 정보와 개인정보를 마스킹
- 보관 기간과 접근 권한 제한

## 8. Metrics

추천 지표:

### 기술 지표

- 요청 수
- 성공률
- timeout 비율
- rate limit 비율
- 재시도 비율
- p50, p95, p99 latency
- input token 사용량
- use case별 비용

### 품질 지표

- 자동 처리율
- 사람 검토율
- confidence 분포
- Noul review 구간 비율
- 사람 수정률
- 자동 처리 취소율
- 클래스 분포 변화
- 평가셋 회귀 성능

## 9. Alert

알림 후보:

- 인증 오류 급증
- rate limit 증가
- timeout 증가
- 사람 검토율 급증
- 특정 Choice 범주 비율 급변
- confidence 평균 급락
- input token 급증
- 모델 버전이 예상과 다름

분류 비율 변화는 입력 데이터 변화나 질문 품질 문제를 발견하는 데 유용합니다.

## 10. 모델 버전 관리

탐색:

```text
jev-latest
```

운영:

```text
검증한 버전 ID 고정 고려
```

버전 변경 절차:

1. 평가셋 실행
2. 오류 사례 비교
3. threshold 검토
4. 제한된 트래픽에 적용
5. 품질과 운영 지표 확인
6. 전체 배포

## 11. 질문 세트 배포

질문 변경도 배포 단위로 취급합니다.

```ts
export const QUESTION_SET_VERSION = "ticket-triage-v1";
```

A/B 또는 shadow 평가 방식:

- 운영 결정은 기존 질문이 수행
- 새 질문도 같은 입력에 실행
- 결과만 기록하고 행동에는 사용하지 않음
- 충분한 비교 후 전환

## 12. Context 크기 관리

- 필요한 필드만 state에 포함
- 긴 문서는 검색이나 필터링 후 전달
- 반복되는 정책 문서는 필요한 부분만 선택
- 질문별로 필요 정보가 크게 다르면 요청 분리 검토
- token 사용량을 use case별로 모니터링

## 13. Rate limit 관리

- SDK retry 사용
- batch 가능한 질문은 한 요청에 합침
- 같은 state에 대한 중복 호출 방지
- queue와 concurrency limit 사용
- 대량 batch에서 실패 항목만 재실행
- rate limit 값이 고정이라고 가정하지 않음

## 14. 비용 관리

현재 과금은 주로 input token에 영향을 받으므로 다음이 중요합니다.

- state 중복 제거
- 무관한 필드 제거
- 긴 criteria의 실제 효과 평가
- 같은 state의 질문을 병렬 batch
- 개발 중 debug 호출량 관리
- use case와 고객별 token 사용량 추적

## 15. 사람 검토 화면

사람 검토자에게 보여주면 좋은 정보:

- 원본 입력의 필요한 부분
- 모델 선택값
- 전체 확률 분포
- confidence
- review 사유
- 질문과 criteria 버전
- 가능한 수정 선택지

모델 내부 추론 설명을 기대하기보다 구조화된 결과와 입력 근거를 보여줍니다.

## 16. 운영 체크리스트

- 서버에서만 API 키 사용
- timeout과 AbortSignal 적용
- retry 중복 여부 확인
- fallback 경로 구현
- threshold 중앙 관리
- 질문 버전 기록
- 모델 실제 버전 기록
- 민감정보 로그 차단
- token과 latency 모니터링
- 사람 수정 결과 수집
- 모델 및 질문 변경 회귀 테스트
