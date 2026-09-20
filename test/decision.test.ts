import assert from "node:assert/strict";
import test from "node:test";

import { decideTriage, type TriageAnswers } from "../src/decision.js";

function answers(overrides: Partial<TriageAnswers> = {}): TriageAnswers {
  return {
    department: {
      type: "choice",
      choice: "technical",
      confidence: 0.9,
      probabilities: {
        billing: 0.03,
        technical: 0.9,
        account: 0.03,
        other: 0.04,
      },
    },
    isUrgent: { type: "noul", noul: 0.8 },
    frustration: {
      type: "score",
      score: 1.7,
      confidence: 0.8,
      legend: {
        0: "Calm and matter-of-fact",
        1: "Frustrated but civil",
        2: "Very angry, hostile, or threatening to leave",
      },
      probabilities: { 0: 0.0, 1: 0.3, 2: 0.7 },
    },
    ...overrides,
  };
}

test("routes a confident urgent ticket automatically", () => {
  const decision = decideTriage(answers());
  assert.equal(decision.route, "technical");
  assert.equal(decision.priority, "high");
});

test("sends low-confidence classification to human review", () => {
  const decision = decideTriage(
    answers({
      department: {
        type: "choice",
        choice: "other",
        confidence: 0.4,
        probabilities: {
          billing: 0.2,
          technical: 0.25,
          account: 0.2,
          other: 0.35,
        },
      },
    }),
  );

  assert.equal(decision.route, "human_review");
  assert.equal(decision.priority, "human_review");
});

test("sends an ambiguous noul result to human review", () => {
  const decision = decideTriage(answers({ isUrgent: { type: "noul", noul: 0.5 } }));
  assert.equal(decision.route, "human_review");
});
