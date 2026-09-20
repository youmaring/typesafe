import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { TypeSafeClient, TypeSafeError } from "@typesafe-ai/sdk";

import { decideTriage } from "../src/decision.js";
import { KO_QUESTION_SET_VERSION, triageQuestionsKo } from "../src/questions-ko.js";
import { QUESTION_SET_VERSION, triageQuestions } from "../src/questions.js";
import {
  choiceMetrics,
  confidenceSweep,
  formatSweep,
  noulBands,
  scoreGateMetrics,
  scoreMetrics,
  type ChoiceRow,
  type NoulRow,
  type ScoreRow,
} from "./metrics.js";
import type { CaseOutcome, Department, EvaluationCase, EvaluationRun } from "./types.js";

/**
 * 이 파일은 소스에서 직접 실행될 수도 있고 dist로 빌드된 뒤 실행될 수도 있습니다.
 * 두 경우 모두에서 같은 데이터 파일을 보도록 evaluation 디렉터리를 찾습니다.
 */
async function resolveEvaluationDir(): Promise<string> {
  const candidates = [
    import.meta.dirname,
    path.resolve(import.meta.dirname, "..", "..", "evaluation"),
    path.resolve(process.cwd(), "evaluation"),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, "cases.jsonl"));
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    `cases.jsonl not found. Looked in: ${candidates.join(", ")}. Run the command from the project root.`,
  );
}

const CONCURRENCY = 4;
const CONFIDENCE_THRESHOLDS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

interface RunOptions {
  questionSet: "en" | "ko";
  languageFilter: "all" | "ko" | "en";
}

function parseArgs(argv: readonly string[]): RunOptions {
  let questionSet: RunOptions["questionSet"] = "en";
  let languageFilter: RunOptions["languageFilter"] = "all";

  for (const arg of argv) {
    if (arg === "--set=ko" || arg === "--ko") questionSet = "ko";
    if (arg === "--set=en" || arg === "--en") questionSet = "en";
    if (arg === "--lang=ko") languageFilter = "ko";
    if (arg === "--lang=en") languageFilter = "en";
  }

  return { questionSet, languageFilter };
}

async function loadCases(
  casesPath: string,
  filter: RunOptions["languageFilter"],
): Promise<EvaluationCase[]> {
  const raw = await fs.readFile(casesPath, "utf8");
  const cases = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as EvaluationCase);

  if (filter === "all") return cases;
  return cases.filter((item) => item.language === filter);
}

/** 동시 실행 수를 제한하면서 각 사례를 평가합니다. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await worker(item, index);
    }
  });

  await Promise.all(runners);
  return results;
}

async function evaluateCase(
  client: TypeSafeClient,
  questions: typeof triageQuestions | typeof triageQuestionsKo,
  testCase: EvaluationCase,
): Promise<CaseOutcome> {
  const startedAt = Date.now();

  const response = await client.systemOne({
    state: { ticket: { message: testCase.message } },
    questions,
  });

  const answers = response.answers;
  const decision = decideTriage(answers);

  return {
    id: testCase.id,
    language: testCase.language,
    expected: testCase.expected,
    predicted: {
      department: answers.department.choice as Department,
      departmentConfidence: answers.department.confidence,
      departmentProbabilities: { ...answers.department.probabilities },
      urgentNoul: answers.isUrgent.noul,
      frustrationScore: answers.frustration.score,
      frustrationConfidence: answers.frustration.confidence,
    },
    decision: {
      route: decision.route,
      priority: decision.priority,
    },
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: Date.now() - startedAt,
  };
}

function report(run: EvaluationRun): void {
  const outcomes = run.outcomes;

  const choiceRows: ChoiceRow[] = outcomes.map((outcome) => ({
    id: outcome.id,
    expected: outcome.expected.department,
    predicted: outcome.predicted.department,
    confidence: outcome.predicted.departmentConfidence,
  }));

  const noulRows: NoulRow[] = outcomes.map((outcome) => ({
    id: outcome.id,
    expected: outcome.expected.urgent,
    value: outcome.predicted.urgentNoul,
  }));

  const scoreRows: ScoreRow[] = outcomes.map((outcome) => ({
    id: outcome.id,
    expected: outcome.expected.frustration,
    predicted: outcome.predicted.frustrationScore,
    confidence: outcome.predicted.frustrationConfidence,
  }));

  const department = choiceMetrics(choiceRows);
  const sweep = confidenceSweep(choiceRows, CONFIDENCE_THRESHOLDS);
  const urgency = noulBands(noulRows, 0.8, 0.2);
  const frustration = scoreMetrics(scoreRows, 0.5);
  const frustrationGate = scoreGateMetrics(scoreRows, 2, 1.5);

  const totalInputTokens = outcomes.reduce((acc, item) => acc + item.inputTokens, 0);
  const averageLatency =
    outcomes.length === 0
      ? 0
      : Math.round(outcomes.reduce((acc, item) => acc + item.latencyMs, 0) / outcomes.length);

  console.log("");
  console.log(`question set      : ${run.questionSet} (${run.questionSetVersion})`);
  console.log(`model             : ${run.model}`);
  console.log(`cases             : ${run.caseCount} (failures: ${run.failureCount})`);
  console.log(`input tokens      : ${totalInputTokens}`);
  console.log(`average latency   : ${averageLatency} ms`);

  console.log("");
  console.log("department choice");
  console.log(`  accuracy        : ${department.accuracy}`);
  for (const [label, metric] of Object.entries(department.perClass)) {
    console.log(
      `  ${label.padEnd(10)} support=${metric.support} precision=${metric.precision} recall=${metric.recall}`,
    );
  }

  console.log("");
  console.log("confidence sweep");
  console.log(formatSweep(sweep));

  console.log("");
  console.log("urgency noul bands (yes>=0.8, no<=0.2)");
  console.log(`  automation rate : ${urgency.automationRate}`);
  console.log(`  yes precision   : ${urgency.yesPrecision} (${urgency.yesCount} cases)`);
  console.log(`  no precision    : ${urgency.noPrecision} (${urgency.noCount} cases)`);
  console.log(`  review rate     : ${urgency.reviewRate}`);
  console.log(`  missed positives: ${urgency.missedPositives}`);

  console.log("");
  console.log("frustration score");
  console.log(`  mean abs error  : ${frustration.meanAbsoluteError}`);
  console.log(`  within ${frustration.tolerance}     : ${frustration.withinToleranceRate}`);
  console.log(
    `  high gate       : precision=${frustrationGate.precision} recall=${frustrationGate.recall}`,
  );

  const mistakes = outcomes.filter(
    (outcome) => outcome.expected.department !== outcome.predicted.department,
  );

  if (mistakes.length > 0) {
    console.log("");
    console.log("misclassified cases");
    for (const mistake of mistakes) {
      console.log(
        `  ${mistake.id}: expected=${mistake.expected.department} predicted=${mistake.predicted.department} confidence=${mistake.predicted.departmentConfidence}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const evaluationDir = await resolveEvaluationDir();
  const cases = await loadCases(path.join(evaluationDir, "cases.jsonl"), options.languageFilter);

  if (cases.length === 0) {
    console.error("No evaluation cases matched the given filter.");
    process.exitCode = 1;
    return;
  }

  const useKorean = options.questionSet === "ko";
  const questions = useKorean ? triageQuestionsKo : triageQuestions;
  const questionSetVersion = useKorean ? KO_QUESTION_SET_VERSION : QUESTION_SET_VERSION;

  const client = new TypeSafeClient({ timeout: 15_000 });

  const settled = await mapWithConcurrency(cases, CONCURRENCY, async (testCase) => {
    try {
      return { ok: true as const, outcome: await evaluateCase(client, questions, testCase) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`case ${testCase.id} failed: ${message}`);
      return { ok: false as const };
    }
  });

  const outcomes = settled.flatMap((item) => (item.ok ? [item.outcome] : []));
  const failureCount = settled.length - outcomes.length;

  if (outcomes.length === 0) {
    console.error("All evaluation calls failed. Check the API key and network access.");
    process.exitCode = 1;
    return;
  }

  const run: EvaluationRun = {
    questionSet: options.questionSet,
    questionSetVersion,
    model: outcomes[0]?.model ?? "unknown",
    caseCount: outcomes.length,
    failureCount,
    outcomes,
  };

  const resultsDir = path.join(evaluationDir, "results");
  await fs.mkdir(resultsDir, { recursive: true });
  const resultPath = path.join(resultsDir, `${options.questionSet}-${options.languageFilter}.json`);
  await fs.writeFile(resultPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");

  report(run);

  console.log("");
  console.log(`saved: ${resultPath}`);
}

main().catch((error: unknown) => {
  if (error instanceof TypeSafeError) {
    console.error(`TypeSafe SDK error: ${error.message}`);
  } else {
    console.error("Unexpected evaluation error:", error);
  }

  process.exitCode = 1;
});
