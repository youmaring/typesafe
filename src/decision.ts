import type { SystemOneResult } from "@typesafe-ai/sdk";
import type { triageQuestions } from "./questions.js";

export type TriageResult = SystemOneResult<typeof triageQuestions>;
export type TriageAnswers = TriageResult["answers"];

export type TriageRoute = "billing" | "technical" | "account" | "other";

/**
 * 정책 코드가 실제로 읽는 최소 신호만 정의합니다.
 * 영어와 한국어 질문 세트처럼 criteria 설명이 달라도
 * 같은 라우팅 로직을 그대로 재사용할 수 있습니다.
 */
export interface TriageSignals {
  department: { choice: TriageRoute; confidence: number };
  isUrgent: { noul: number };
  frustration: { score: number; confidence: number };
}

export interface TriageDecision {
  route: TriageRoute | "human_review";
  priority: "normal" | "high" | "human_review";
  reasons: string[];
}

/**
 * 모델은 판단값만 제공합니다. 실제 라우팅과 부작용은 결정론적 코드가 소유합니다.
 * 임계값은 시작점일 뿐이며 실제 데이터셋으로 보정해야 합니다.
 */
export function decideTriage(answers: TriageSignals): TriageDecision {
  const reasons: string[] = [];
  const urgencyIsAmbiguous = answers.isUrgent.noul > 0.35 && answers.isUrgent.noul < 0.65;

  if (answers.department.confidence < 0.6) {
    reasons.push(`department confidence ${answers.department.confidence.toFixed(2)} < 0.60`);
  }

  if (urgencyIsAmbiguous) {
    reasons.push(`urgency probability ${answers.isUrgent.noul.toFixed(2)} is ambiguous`);
  }

  if (answers.department.confidence < 0.6 || urgencyIsAmbiguous) {
    return {
      route: "human_review",
      priority: "human_review",
      reasons,
    };
  }

  const urgent = answers.isUrgent.noul >= 0.7;
  const stronglyFrustrated =
    answers.frustration.confidence >= 0.65 && answers.frustration.score >= 1.5;

  if (urgent) reasons.push(`urgency probability ${answers.isUrgent.noul.toFixed(2)} >= 0.70`);
  if (stronglyFrustrated) {
    reasons.push(
      `frustration score ${answers.frustration.score.toFixed(2)} with confidence ${answers.frustration.confidence.toFixed(2)}`,
    );
  }

  if (reasons.length === 0) reasons.push("no high-risk signal crossed its threshold");

  return {
    route: answers.department.choice,
    priority: urgent || stronglyFrustrated ? "high" : "normal",
    reasons,
  };
}
