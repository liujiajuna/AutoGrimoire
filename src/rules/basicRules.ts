import type {
  ActionStep,
  ExecutionPlan,
  MemoryRecord,
  RuleDecision,
  TaskInput
} from "../core/types.js";

function prioritizeSafetyStep(task: TaskInput): ActionStep {
  return {
    id: "step-safety-check",
    title: "Validate constraints and blast radius",
    rationale: `Task priority is '${task.priority}', so safety checks are required before execution.`,
    requiresApproval: task.priority === "high"
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

export function applyBasicRules(task: TaskInput, memory: MemoryRecord[]): {
  decisions: RuleDecision[];
  plan: ExecutionPlan;
} {
  const decisions: RuleDecision[] = [];

  decisions.push({
    id: "rule-task-description-length",
    passed: task.description.length >= 20,
    message:
      task.description.length >= 20
        ? "Task description includes enough detail for planning."
        : "Task description is short; output should include a clarification warning.",
    severity: task.description.length >= 20 ? "info" : "warning"
  });

  decisions.push({
    id: "rule-memory-presence",
    passed: memory.length > 0,
    message:
      memory.length > 0
        ? "Repository memory/context is available."
        : "No memory provided; plan should explicitly note assumptions.",
    severity: memory.length > 0 ? "info" : "warning"
  });

  const warnings = decisions.filter((d) => !d.passed).map((d) => d.message);

  const steps: ActionStep[] = [
    prioritizeSafetyStep(task),
    memoryReviewStep(memory),
    implementationPlanStep(task)
  ];

  const riskLevel: ExecutionPlan["riskLevel"] =
    task.priority === "high" ? "high" : warnings.length > 0 ? "medium" : "low";

  const requiresHumanApproval = steps.some((step) => step.requiresApproval) || riskLevel === "high";

  const plan: ExecutionPlan = {
    summary: `Prepared ${steps.length} step(s) for task '${task.title}'.`,
    riskLevel,
    warnings,
    steps,
    requiresHumanApproval
  };

  return { decisions, plan };
}
