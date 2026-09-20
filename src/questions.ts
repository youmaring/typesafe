import { choice, noul, score } from "@typesafe-ai/sdk";

/**
 * 같은 state를 보는 독립 질문은 한 요청에 함께 보냅니다.
 * 질문 ID는 모델 추론에 쓰이지 않으므로 instructions 자체가 완전해야 합니다.
 */
export const triageQuestions = {
  department: choice("Which team should handle `ticket.message`?", {
    billing: "Payments, invoices, subscriptions, duplicate charges, or refunds",
    technical: "Bugs, outages, failed integrations, or unexpected product behavior",
    account: "Login, permissions, profile, or account security",
    other: "A request that does not fit the other teams",
  }),

  isUrgent: noul("Does `ticket.message` express clear urgency or time sensitivity?", {
    true: "The message explicitly needs prompt action or describes immediate impact",
    false: "The message has no meaningful time pressure",
  }),

  frustration: score("How frustrated does the customer appear in `ticket.message`?", [
    "Calm and matter-of-fact",
    "Frustrated but civil",
    "Very angry, hostile, or threatening to leave",
  ] as const),
} as const;

/** 질문과 criteria를 바꿀 때마다 올려서 로그와 평가 결과에 기록합니다. */
export const QUESTION_SET_VERSION = "ticket-triage-en-v1";
