export type TaskPriority = "low" | "medium" | "high";

export interface TaskInput {
  id: string;
  title: string;
  description: string;
  requestedBy?: string;
  priority: TaskPriority;
  tags?: string[];
}

export interface MemoryRecord {
  path: string;
  kind: "json" | "markdown" | "text";
  content: string;
}

export interface RuleDecision {
  id: string;
  passed: boolean;
  message: string;
  severity: "info" | "warning";
}

export interface ActionStep {
  id: string;
  title: string;
  rationale: string;
  requiresApproval: boolean;
}

export interface ExecutionPlan {
  summary: string;
  riskLevel: "low" | "medium" | "high";
  warnings: string[];
  steps: ActionStep[];
  requiresHumanApproval: boolean;
}

export interface ExecutionResult {
  task: TaskInput;
  memory: {
    filesLoaded: number;
    filePaths: string[];
  };
  decisions: RuleDecision[];
  plan: ExecutionPlan;
  generatedAt: string;
}
