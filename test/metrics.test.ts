import assert from "node:assert/strict";
import test from "node:test";

import {
  choiceMetrics,
  confidenceSweep,
  expectedCost,
  noulBands,
  scoreGateMetrics,
  scoreMetrics,
} from "../evaluation/metrics.js";

test("choiceMetrics computes accuracy and per-class precision and recall", () => {
  const metrics = choiceMetrics([
    { id: "1", expected: "billing", predicted: "billing", confidence: 0.9 },
    { id: "2", expected: "billing", predicted: "technical", confidence: 0.4 },
    { id: "3", expected: "technical", predicted: "technical", confidence: 0.8 },
    { id: "4", expected: "account", predicted: "account", confidence: 0.7 },
  ]);

  assert.equal(metrics.total, 4);
  assert.equal(metrics.correct, 3);
  assert.equal(metrics.accuracy, 0.75);

  assert.equal(metrics.perClass.billing?.support, 2);
  assert.equal(metrics.perClass.billing?.recall, 0.5);
  assert.equal(metrics.perClass.billing?.precision, 1);

  assert.equal(metrics.perClass.technical?.precision, 0.5);
  assert.equal(metrics.perClass.technical?.recall, 1);

  assert.equal(metrics.confusion.billing?.technical, 1);
});

test("choiceMetrics handles an empty input without dividing by zero", () => {
  const metrics = choiceMetrics([]);
  assert.equal(metrics.total, 0);
  assert.equal(metrics.accuracy, 0);
  assert.deepEqual(metrics.perClass, {});
});

test("confidenceSweep separates automated cases from review cases", () => {
  const rows = [
    { id: "1", expected: "a", predicted: "a", confidence: 0.95 },
    { id: "2", expected: "a", predicted: "b", confidence: 0.5 },
    { id: "3", expected: "b", predicted: "b", confidence: 0.85 },
  ];

  const [low, high] = confidenceSweep(rows, [0.4, 0.9]);

  assert.equal(low?.automated, 3);
  assert.equal(low?.automatedErrors, 1);
  assert.equal(low?.review, 0);

  assert.equal(high?.automated, 1);
  assert.equal(high?.automatedAccuracy, 1);
  assert.equal(high?.review, 2);
  assert.equal(high?.reviewContainedErrors, 1);
});

test("expectedCost grows when automation errors and review volume increase", () => {
  const rows = [
    { id: "1", expected: "a", predicted: "b", confidence: 0.95 },
    { id: "2", expected: "b", predicted: "b", confidence: 0.4 },
  ];

  const weights = { falsePositive: 10, falseNegative: 10, humanReview: 1 };
  const [permissive, strict] = confidenceSweep(rows, [0.3, 0.99]);

  assert.ok(permissive);
  assert.ok(strict);
  assert.equal(expectedCost(permissive, weights), 10);
  assert.equal(expectedCost(strict, weights), 2);
});

test("noulBands reports precision for both automated bands", () => {
  const result = noulBands(
    [
      { id: "1", expected: true, value: 0.95 },
      { id: "2", expected: false, value: 0.85 },
      { id: "3", expected: false, value: 0.05 },
      { id: "4", expected: true, value: 0.5 },
    ],
    0.8,
    0.2,
  );

  assert.equal(result.yesCount, 2);
  assert.equal(result.yesPrecision, 0.5);
  assert.equal(result.noCount, 1);
  assert.equal(result.noPrecision, 1);
  assert.equal(result.reviewCount, 1);
  assert.equal(result.reviewRate, 0.25);
  assert.equal(result.automationRate, 0.75);
  assert.equal(result.missedPositives, 0);
});

test("noulBands rejects an inverted band configuration", () => {
  assert.throws(() => noulBands([], 0.2, 0.8));
});

test("scoreMetrics measures absolute error against the rubric levels", () => {
  const metrics = scoreMetrics(
    [
      { id: "1", expected: 1, predicted: 1.2, confidence: 0.8 },
      { id: "2", expected: 2, predicted: 1.0, confidence: 0.6 },
    ],
    0.5,
  );

  assert.equal(metrics.meanAbsoluteError, 0.6);
  assert.equal(metrics.withinTolerance, 1);
  assert.equal(metrics.withinToleranceRate, 0.5);
});

test("scoreGateMetrics evaluates the business threshold instead of raw error", () => {
  const gate = scoreGateMetrics(
    [
      { id: "1", expected: 2, predicted: 1.8, confidence: 0.9 },
      { id: "2", expected: 0, predicted: 0.2, confidence: 0.9 },
      { id: "3", expected: 2, predicted: 1.1, confidence: 0.5 },
      { id: "4", expected: 1, predicted: 1.7, confidence: 0.5 },
    ],
    2,
    1.5,
  );

  assert.equal(gate.truePositive, 1);
  assert.equal(gate.falseNegative, 1);
  assert.equal(gate.falsePositive, 1);
  assert.equal(gate.trueNegative, 1);
  assert.equal(gate.accuracy, 0.5);
});
