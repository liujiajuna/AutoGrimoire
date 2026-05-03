import type {
  ActionStep,
  ExecutionPlan,
  MemoryRecord,
  RuleDecision,
  TaskInput
} from "../core/types.js";

interface RiskSignals {
  hasDependencyRisk: boolean;
  hasExternalServiceRisk: boolean;
  hasBroadChangeRisk: boolean;
}

const DEPENDENCY_KEYWORDS = [
  "add dependency",
  "dependency",
  "dependencies",
  "install package",
  "npm install",
  "package",
  "library",
  "framework",
  "upgrade"
];

const EXTERNAL_SERVICE_KEYWORDS = [
  "api",
  "cloud",
  "database",
  "db",
  "external service",
  "github api",
  "oauth",
  "postgres",
  "redis",
  "s3",
  "webhook"
];

const BROAD_CHANGE_KEYWORDS = [
  "all files",
  "architecture",
  "entire repo",
  "large-scale",
  "migration",
  "refactor",
  "rewrite",
  "whole project"
];

function taskSearchText(task: TaskInput): string {
  return [task.id, task.title, task.description, task.requestedBy, ...(task.tags ?? [])]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function includesKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    if (/^[a-z0-9]+$/.test(keyword)) {
      return new RegExp(`\\b${keyword}\\b`).test(text);
    }

    return text.includes(keyword);
  });
}

function detectRiskSignals(task: TaskInput): RiskSignals {
  const text = taskSearchText(task);

  return {
    hasDependencyRisk: includesKeyword(text, DEPENDENCY_KEYWORDS),
    hasExternalServiceRisk: includesKeyword(text, EXTERNAL_SERVICE_KEYWORDS),
    hasBroadChangeRisk: includesKeyword(text, BROAD_CHANGE_KEYWORDS)
  };
}

function hasAnyRiskSignal(signals: RiskSignals): boolean {
  return signals.hasDependencyRisk || signals.hasExternalServiceRisk || signals.hasBroadChangeRisk;
}

function prioritizeSafetyStep(task: TaskInput, signals: RiskSignals): ActionStep {
  const requiresApproval = task.priority === "high" || hasAnyRiskSignal(signals);

  return {
    id: "step-safety-check",
    title: "Validate constraints and blast radius",
    rationale: requiresApproval
      ? `Task '${task.id}' has elevated risk signals; confirm constraints and approval before execution.`
      : `Task priority is '${task.priority}', so a standard safety review is sufficient before execution.`,
    requiresApproval
  };
}

function memoryReviewStep(memory: MemoryRecord[]): ActionStep {
  return {
    id: "step-memory-review",
    title: "Review relevant repository memory",
    rationale:
      memory.length > 0
        ? `Loaded ${memory.length} memory file(s); review them for existing constraints and conventions.`
        : "No memory files provided; proceed with explicit assumptions and request missing context.",
    requiresApproval: false
  };
}

function implementationPlanStep(task: TaskInput): ActionStep {
  return {
    id: "step-implementation-plan",
    title: "Produce minimal implementation plan",
    rationale: `Create a small, reviewable plan for task '${task.id}' before writing changes.`,
    requiresApproval: task.priority !== "low"
  };
}

function addDecision(decisions: RuleDecision[], decision: RuleDecision): void {
  decisions.push(decision);
}

function buildPriorityDecision(task: TaskInput): RuleDecision {
  if (task.priority === "high") {
    return {
      id: "rule-priority-risk",
      passed: false,
      message: "High priority task requires explicit human approval before execution.",
      severity: "warning"
    };
  }

  return {
    id: "rule-priority-risk",
    passed: true,
    message:
      task.priority === "medium"
        ? "Medium priority task should remain small and reviewable."
        : "Low priority task can proceed with standard planning controls.",
    severity: "info"
  };
}

function buildKeywordDecision(
  id: string,
  passed: boolean,
  passMessage: string,
  warningMessage: string
): RuleDecision {
  return {
    id,
    passed,
    message: passed ? passMessage : warningMessage,
    severity: passed ? "info" : "warning"
  };
}

function determineRiskLevel(
  task: TaskInput,
  warnings: string[],
  signals: RiskSignals
): ExecutionPlan["riskLevel"] {
  const signalCount = [
    signals.hasDependencyRisk,
    signals.hasExternalServiceRisk,
    signals.hasBroadChangeRisk
  ].filter(Boolean).length;

  if (task.priority === "high" || signalCount >= 2) {
    return "high";
  }

  if (task.priority === "medium" || warnings.length > 0 || signalCount === 1) {
    return "medium";
  }

  return "low";
}

export function applyBasicRules(task: TaskInput, memory: MemoryRecord[]): {
  decisions: RuleDecision[];
  plan: ExecutionPlan;
} {
  const decisions: RuleDecision[] = [];
  const signals = detectRiskSignals(task);

  addDecision(decisions, {
    id: "rule-task-description-length",
    passed: task.description.length >= 20,
    message:
      task.description.length >= 20
        ? "Task description includes enough detail for planning."
        : "Task description is short; output should include a clarification warning.",
    severity: task.description.length >= 20 ? "info" : "warning"
  });

  addDecision(decisions, {
    id: "rule-memory-presence",
    passed: memory.length > 0,
    message:
      memory.length > 0
        ? "Repository memory/context is available."
        : "No memory provided; plan should explicitly note assumptions.",
    severity: memory.length > 0 ? "info" : "warning"
  });

  addDecision(decisions, buildPriorityDecision(task));
  addDecision(
    decisions,
    buildKeywordDecision(
      "rule-dependency-policy",
      !signals.hasDependencyRisk,
      "Task does not appear to introduce dependency or package changes.",
      "Task mentions dependency or package changes; keep dependency policy review explicit."
    )
  );
  addDecision(
    decisions,
    buildKeywordDecision(
      "rule-external-service-boundary",
      !signals.hasExternalServiceRisk,
      "Task does not appear to require external services or cloud resources.",
      "Task mentions external services or infrastructure; avoid hidden network/cloud assumptions."
    )
  );
  addDecision(
    decisions,
    buildKeywordDecision(
      "rule-blast-radius",
      !signals.hasBroadChangeRisk,
      "Task scope does not appear to require broad repository-wide changes.",
      "Task mentions broad changes; constrain scope before implementation."
    )
  );

  const warnings = decisions.filter((d) => !d.passed).map((d) => d.message);

  const steps: ActionStep[] = [
    prioritizeSafetyStep(task, signals),
    memoryReviewStep(memory),
    implementationPlanStep(task)
  ];

  const riskLevel = determineRiskLevel(task, warnings, signals);

  const requiresHumanApproval =
    steps.some((step) => step.requiresApproval) || riskLevel === "high";

  const plan: ExecutionPlan = {
    summary: `Prepared ${steps.length} step(s) for task '${task.title}'.`,
    riskLevel,
    warnings,
    steps,
    requiresHumanApproval
  };

  return { decisions, plan };
}
