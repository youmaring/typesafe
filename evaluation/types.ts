export type Department = "billing" | "technical" | "account" | "other";

export type CaseLanguage = "ko" | "en";

export interface EvaluationCase {
  /** 사례 식별자 */
  id: string;
  /** 입력 언어 */
  language: CaseLanguage;
  /** 고객 문의 원문 */
  message: string;
  /** 사람이 정한 정답 */
  expected: {
    department: Department;
    urgent: boolean;
    /** Score 정답 수준. 0은 침착, 1은 불만, 2는 매우 화남 */
    frustration: number;
  };
  /** 왜 이 사례를 포함했는지에 대한 메모 */
  notes?: string;
}

export interface CaseOutcome {
  id: string;
  language: CaseLanguage;
  expected: EvaluationCase["expected"];
  predicted: {
    department: Department;
    departmentConfidence: number;
    departmentProbabilities: Record<string, number>;
    urgentNoul: number;
    frustrationScore: number;
    frustrationConfidence: number;
  };
  decision: {
    route: string;
    priority: string;
  };
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface EvaluationRun {
  questionSet: string;
  questionSetVersion: string;
  model: string;
  caseCount: number;
  failureCount: number;
  outcomes: CaseOutcome[];
}
