# TypeSafe AI / Jev TypeScript Starter

TypeSafe AI의 Jev를 JS/TS에서 익히기 위한 최소 실행 프로젝트입니다.

## 상세 문서

개념부터 운영 적용까지는 [`docs/README.md`](./docs/README.md)에서 시작할 수 있습니다.

- TypeSafe AI와 Jev의 역할
- State, Question, Answer 설계
- Choice, Score, Noul 상세 사용법
- JavaScript / TypeScript SDK
- 질문과 criteria 설계
- 주요 패턴과 cookbook
- 평가 데이터와 임계값 테스트
- 운영, 보안, 문제 해결

이 예제는 고객 문의 한 건을 하나의 `state`로 보내고, 같은 요청 안에서 다음 세 판단을 병렬로 수행합니다.

- `Choice`: 담당 부서 분류
- `Noul`: 긴급성 여부의 확률
- `Score`: 고객 불만 정도

모델 결과는 직접 업무를 실행하지 않습니다. `src/decision.ts`의 일반 TypeScript 코드가 신뢰도와 확률을 기준으로 자동 라우팅 또는 사람 검토를 결정합니다.

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

API 키는 서버 환경에서만 사용하세요. 브라우저 번들 또는 프론트엔드 환경변수에 넣으면 안 됩니다.

## 실행

기본 예제 문의로 실행:

```bash
npm run dev
```

직접 문장을 넘겨 실행:

```bash
npm run dev -- "I was charged twice and need help today."
```

출력에는 다음이 포함됩니다.

- 실제 응답 모델 버전
- 토큰 사용량
- Choice, Noul, Score 원본 응답
- 코드에서 계산한 최종 라우팅과 우선순위

## 검증

```bash
npm run typecheck
npm test
npm run build
```

## 파일 구조

```text
src/questions.ts   질문과 평가 기준을 한곳에서 관리
src/decision.ts    임계값, 라우팅, 사람 검토 정책
src/index.ts       SDK 호출과 CLI 입출력

test/decision.test.ts  API 호출 없이 정책 코드 테스트
docs/README.md         상세 문서 목차와 학습 경로
docs/*.md              주제별 상세 사용 가이드
REPORT.md              조사 내용 요약과 공식 문서 지도
```

## 학습 순서

1. `src/questions.ts`의 설명과 기준을 바꿉니다.
2. Playground에서 실제 데이터를 넣어 확률 분포를 확인합니다.
3. 정답이 있는 검증 데이터셋을 만듭니다.
4. `src/decision.ts`의 임계값을 데이터로 조정합니다.
5. 안정성이 필요한 경우 `jev-latest` 대신 검증한 버전 ID를 고정합니다.
6. 실제 부작용은 인증, 권한, 정책 검사를 통과한 일반 코드에서만 실행합니다.

## 주의 사항

- Jev는 텍스트 생성 모델이 아니라 구조화된 판단 모델입니다.
- 계산, 카운팅, 날짜 비교, 권한 검사, 최종 업무 실행은 코드가 담당해야 합니다.
- Noul의 `0.5`는 중간 정도가 아니라 yes/no 판단이 불확실하다는 뜻입니다.
- Choice와 Score의 `confidence`는 정답 보장이 아닙니다.
- 한국어와 CJK 입력은 지원하지만 영어보다 정확도가 낮을 수 있어 별도 검증이 필요합니다.
- 운영에서는 입력, 실제 모델 버전, 확률, confidence, 최종 행동을 함께 기록하는 편이 좋습니다.
