/**
 * 평가 지표 계산 함수 모음.
 *
 * 이 파일은 API를 호출하지 않는 순수 함수만 포함합니다.
 * 덕분에 모델 응답 없이도 단위 테스트로 검증할 수 있습니다.
 */

export interface ChoiceRow {
  id: string;
  expected: string;
  predicted: string;
  confidence: number;
}

export interface ClassMetric {
  support: number;
  predictedCount: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ChoiceMetrics {
  total: number;
  correct: number;
  accuracy: number;
  perClass: Record<string, ClassMetric>;
  confusion: Record<string, Record<string, number>>;
}

export interface ConfidenceGateResult {
  threshold: number;
  automated: number;
  automationRate: number;
  automatedCorrect: number;
  automatedErrors: number;
  automatedAccuracy: number;
  review: number;
  reviewRate: number;
  reviewContainedErrors: number;
}

export interface NoulRow {
  id: string;
  expected: boolean;
  value: number;
}

export interface NoulBandResult {
  yesThreshold: number;
  noThreshold: number;
  yesCount: number;
  yesPrecision: number;
  noCount: number;
  noPrecision: number;
  reviewCount: number;
  reviewRate: number;
  automationRate: number;
  automatedErrors: number;
  missedPositives: number;
}

export interface ScoreRow {
  id: string;
  expected: number;
  predicted: number;
  confidence: number;
}

export interface ScoreMetrics {
  total: number;
  meanAbsoluteError: number;
  withinTolerance: number;
  withinToleranceRate: number;
  tolerance: number;
}

export interface ScoreGateMetrics {
  total: number;
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  precision: number;
  recall: number;
  accuracy: number;
}

export interface CostWeights {
  falsePositive: number;
  falseNegative: number;
  humanReview: number;
}

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

const round = (value: number, digits = 4): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Choice 정확도, 클래스별 precision/recall, confusion matrix를 계산합니다. */
export function choiceMetrics(rows: readonly ChoiceRow[]): ChoiceMetrics {
  const labels = new Set<string>();
  for (const row of rows) {
    labels.add(row.expected);
    labels.add(row.predicted);
  }

  const confusion: Record<string, Record<string, number>> = {};
  for (const expected of labels) {
    confusion[expected] = {};
    for (const predicted of labels) {
      confusion[expected][predicted] = 0;
    }
  }

  let correct = 0;
  for (const row of rows) {
    const expectedRow = confusion[row.expected];
    if (expectedRow) {
      expectedRow[row.predicted] = (expectedRow[row.predicted] ?? 0) + 1;
    }
    if (row.expected === row.predicted) correct += 1;
  }

  const perClass: Record<string, ClassMetric> = {};
  for (const label of labels) {
    const support = rows.filter((row) => row.expected === label).length;
    const predictedCount = rows.filter((row) => row.predicted === label).length;
    const truePositive = rows.filter(
      (row) => row.expected === label && row.predicted === label,
    ).length;

    const precision = ratio(truePositive, predictedCount);
    const recall = ratio(truePositive, support);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    perClass[label] = {
      support,
      predictedCount,
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
    };
  }

  return {
    total: rows.length,
    correct,
    accuracy: round(ratio(correct, rows.length)),
    perClass,
    confusion,
  };
}

/**
 * confidence 임계값별로 자동 처리량과 자동 처리 정확도를 계산합니다.
 * 임계값 이상은 자동 처리, 미만은 사람 검토로 간주합니다.
 */
export function confidenceSweep(
  rows: readonly ChoiceRow[],
  thresholds: readonly number[],
): ConfidenceGateResult[] {
  return thresholds.map((threshold) => {
    const automatedRows = rows.filter((row) => row.confidence >= threshold);
    const reviewRows = rows.filter((row) => row.confidence < threshold);
    const automatedCorrect = automatedRows.filter((row) => row.expected === row.predicted).length;
    const automatedErrors = automatedRows.length - automatedCorrect;
    const reviewContainedErrors = reviewRows.filter(
      (row) => row.expected !== row.predicted,
    ).length;

    return {
      threshold,
      automated: automatedRows.length,
      automationRate: round(ratio(automatedRows.length, rows.length)),
      automatedCorrect,
      automatedErrors,
      automatedAccuracy: round(ratio(automatedCorrect, automatedRows.length)),
      review: reviewRows.length,
      reviewRate: round(ratio(reviewRows.length, rows.length)),
      reviewContainedErrors,
    };
  });
}

/**
 * Noul을 yes / review / no 세 구간으로 나눠 자동 처리 품질을 계산합니다.
 * yesThreshold 이상은 yes, noThreshold 이하는 no, 사이 값은 사람 검토입니다.
 */
export function noulBands(
  rows: readonly NoulRow[],
  yesThreshold: number,
  noThreshold: number,
): NoulBandResult {
  if (yesThreshold < noThreshold) {
    throw new Error("yesThreshold must be greater than or equal to noThreshold");
  }

  const yesRows = rows.filter((row) => row.value >= yesThreshold);
  const noRows = rows.filter((row) => row.value <= noThreshold);
  const reviewRows = rows.filter(
    (row) => row.value < yesThreshold && row.value > noThreshold,
  );

  const yesCorrect = yesRows.filter((row) => row.expected).length;
  const noCorrect = noRows.filter((row) => !row.expected).length;
  const automated = yesRows.length + noRows.length;
  const automatedErrors = yesRows.length - yesCorrect + (noRows.length - noCorrect);
  const missedPositives = noRows.filter((row) => row.expected).length;

  return {
    yesThreshold,
    noThreshold,
    yesCount: yesRows.length,
    yesPrecision: round(ratio(yesCorrect, yesRows.length)),
    noCount: noRows.length,
    noPrecision: round(ratio(noCorrect, noRows.length)),
    reviewCount: reviewRows.length,
    reviewRate: round(ratio(reviewRows.length, rows.length)),
    automationRate: round(ratio(automated, rows.length)),
    automatedErrors,
    missedPositives,
  };
}

/** Score 예측과 정답 수준의 차이를 계산합니다. */
export function scoreMetrics(rows: readonly ScoreRow[], tolerance = 0.5): ScoreMetrics {
  const absoluteErrors = rows.map((row) => Math.abs(row.predicted - row.expected));
  const within = absoluteErrors.filter((error) => error <= tolerance).length;
  const sum = absoluteErrors.reduce((acc, error) => acc + error, 0);

  return {
    total: rows.length,
    meanAbsoluteError: round(ratio(sum, rows.length)),
    withinTolerance: within,
    withinToleranceRate: round(ratio(within, rows.length)),
    tolerance,
  };
}

/**
 * Score를 실제 업무 분기 기준으로 평가합니다.
 * raw 오차보다 임계값 통과 여부가 중요한 경우에 사용합니다.
 */
export function scoreGateMetrics(
  rows: readonly ScoreRow[],
  expectedThreshold: number,
  predictedThreshold: number,
): ScoreGateMetrics {
  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;

  for (const row of rows) {
    const expectedHigh = row.expected >= expectedThreshold;
    const predictedHigh = row.predicted >= predictedThreshold;

    if (expectedHigh && predictedHigh) truePositive += 1;
    else if (!expectedHigh && predictedHigh) falsePositive += 1;
    else if (!expectedHigh && !predictedHigh) trueNegative += 1;
    else falseNegative += 1;
  }

  return {
    total: rows.length,
    truePositive,
    falsePositive,
    trueNegative,
    falseNegative,
    precision: round(ratio(truePositive, truePositive + falsePositive)),
    recall: round(ratio(truePositive, truePositive + falseNegative)),
    accuracy: round(ratio(truePositive + trueNegative, rows.length)),
  };
}

/**
 * 오류 종류별 비용을 반영한 기대 비용입니다.
 * 임계값 후보를 업무 비용 기준으로 비교할 때 사용합니다.
 */
export function expectedCost(
  result: ConfidenceGateResult,
  weights: CostWeights,
): number {
  const automationCost = result.automatedErrors * weights.falsePositive;
  const reviewCost = result.review * weights.humanReview;
  const missedCost = result.reviewContainedErrors * 0;

  return round(automationCost + reviewCost + missedCost, 3);
}

/** 사람이 읽기 좋은 요약 문자열을 만듭니다. */
export function formatSweep(results: readonly ConfidenceGateResult[]): string {
  const header = "threshold  automated  autoAcc  errors  review";
  const lines = results.map((result) =>
    [
      result.threshold.toFixed(2).padStart(9),
      String(result.automated).padStart(10),
      result.automatedAccuracy.toFixed(3).padStart(8),
      String(result.automatedErrors).padStart(7),
      String(result.review).padStart(7),
    ].join(""),
  );

  return [header, ...lines].join("\n");
}
