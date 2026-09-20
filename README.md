# TypeSafe AI / Jev TypeScript Starter

TypeSafe AI의 Jev를 JavaScript와 TypeScript에서 익히기 위한 실행 가능한 예제 프로젝트입니다.

고객 문의 한 건을 하나의 `state`로 보내고, 같은 요청 안에서 세 가지 판단을 병렬로 수행합니다.

- `Choice`: 담당 부서 분류
- `Noul`: 긴급성 여부의 확률
- `Score`: 고객 불만 정도

모델 결과는 직접 업무를 실행하지 않습니다. `src/decision.ts`의 일반 TypeScript 코드가 확률과 신뢰도를 기준으로 자동 라우팅 또는 사람 검토를 결정합니다.

## 문서

개념부터 운영까지는 [`docs/README.md`](./docs/README.md)에서 시작합니다.

- TypeSafe AI와 Jev의 역할
- State, Question, Answer 설계
- Choice, Score, Noul 상세 사용법
- JavaScript / TypeScript SDK
- 질문과 criteria 설계
- 주요 패턴과 cookbook 지도
- 평가 데이터와 임계값 테스트
- 운영, 보안, 문제 해결
- 모델과 한도 레퍼런스
- 한국어 워크로드 가이드
- 공식 문서 지도

## 요구 사항

- Node.js 20 이상
- TypeSafe API 키

## 설치

```bash
npm install
cp .env.example .env
```

`.env`에 콘솔에서 발급한 키를 넣습니다.

```dotenv
TYPESAFE_API_KEY=your_api_key
```

API 키는 서버 환경에서만 사용합니다. 브라우저 번들이나 프론트엔드 환경변수에 넣으면 안 됩니다.

## 실행

기본 예제 문의로 실행:

```bash
npm run dev
```

직접 문장을 넘겨 실행:

```bash
npm run dev -- "결제가 3일째 실패합니다. 급하게 확인 부탁드립니다."
```

출력에는 실제 응답 모델 버전, 토큰 사용량, 원본 응답, 코드가 계산한 최종 라우팅이 포함됩니다.

## 평가

질문 세트와 임계값을 실제 데이터로 검증합니다.

```bash
npm run eval           # 영어 질문 세트
npm run eval:ko        # 한국어 질문 세트
npm run eval:ko-cases  # 한국어 질문 세트로 한국어 사례만
```

평가 사례 추가 방법과 지표 설명은 [`evaluation/README.md`](./evaluation/README.md)에 있습니다.

## 검증

```bash
npm run typecheck
npm test
npm run build
```

## 파일 구조

```text
src/questions.ts        영어 instructions 질문 세트
src/questions-ko.ts     한국어 instructions 질문 세트
src/decision.ts         임계값, 라우팅, 사람 검토 정책
src/index.ts            SDK 호출과 CLI 입출력

evaluation/cases.jsonl  사람이 정답을 단 평가 사례
evaluation/metrics.ts   지표 계산 순수 함수
evaluation/run.ts       평가 실행과 리포트

test/decision.test.ts   업무 정책 테스트
test/metrics.test.ts    지표 계산 테스트

docs/                   개념부터 운영까지 상세 문서
```

## 설계 원칙

1. 모델은 의미 판단만 담당합니다.
2. 제어 흐름, 권한, 계산, 부작용은 코드가 담당합니다.
3. 넓은 판단은 원자적인 질문으로 나눕니다.
4. 같은 state를 보는 독립 질문은 한 요청에 묶습니다.
5. 낮은 confidence와 애매한 확률은 사람 검토로 보냅니다.
6. 임계값은 실제 평가 데이터로 정합니다.

## 주의 사항

- Jev는 텍스트 생성 모델이 아니라 구조화된 판단 모델입니다.
- 계산, 카운팅, 날짜 비교, 권한 검사는 코드가 담당해야 합니다.
- Noul의 `0.5`는 중간 정도가 아니라 판단이 불확실하다는 뜻입니다.
- Choice와 Score의 `confidence`는 정답 보장이 아닙니다.
- 한국어 입력은 지원하지만 영어보다 정확도가 낮을 수 있어 별도 검증이 필요합니다.
- 질문 세트를 바꾸면 임계값을 다시 검증해야 합니다.
