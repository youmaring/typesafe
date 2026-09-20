import { choice, noul, score } from "@typesafe-ai/sdk";

/**
 * 한국어 instructions 버전 질문 세트.
 *
 * 선택지 키는 영어 식별자를 그대로 유지합니다.
 * 키는 코드 분기에 사용되고 설명만 모델이 읽기 때문에,
 * 같은 라우팅 코드로 영어 세트와 한국어 세트를 비교할 수 있습니다.
 */
export const triageQuestionsKo = {
  department: choice("`ticket.message`는 어느 팀이 처리해야 하는가?", {
    billing: "결제, 청구서, 환불, 구독 관련 문의",
    technical: "버그, 장애, 연동 실패 등 제품 기술 문제",
    account: "로그인, 프로필, 권한, 계정 보안 문제",
    other: "위 세 팀에 해당하지 않는 문의",
  }),

  isUrgent: noul("`ticket.message`가 명확한 긴급성이나 즉각적인 영향을 표현하는가?", {
    true: "즉시 처리가 필요하거나 현재 업무에 실질적인 피해가 발생하고 있음",
    false: "시간적 압박이 뚜렷하지 않음",
  }),

  frustration: score("`ticket.message`에서 고객의 불만 정도는 어느 수준인가?", [
    "침착하고 사실 위주로 설명함",
    "불만을 표현하지만 정중함",
    "매우 화가 났거나 해지 또는 이탈을 언급함",
  ] as const),
} as const;

export const KO_QUESTION_SET_VERSION = "ticket-triage-ko-v1";
