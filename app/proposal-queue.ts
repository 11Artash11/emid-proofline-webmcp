export const MAX_PROPOSALS = 20;

export type Proposal = {
  id: string;
  title: string;
  targetId: string;
  rationale: string;
  status: "awaiting_human_approval" | "approved" | "rejected";
  createdBy: "agent" | "human";
};

type Result = { proposal: Proposal; created: boolean } | { error: string; code: "invalid_input" | "queue_full" };

// Enforce bounds at execution time, even when a caller bypasses the tool schema.
export function createProposal(current: readonly Proposal[], input: Record<string, unknown>, createdBy: Proposal["createdBy"]): Result {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Invalid proposal input. No proposal was created.", code: "invalid_input" };
  }
  const fields = [["title", 8, 100], ["target_id", 3, 30], ["rationale", 12, 280]] as const;
  for (const [field, min, max] of fields) {
    const value = input[field];
    if (typeof value !== "string" || value.length > max || value.trim().length < min) {
      return { error: `Invalid ${field}. Use ${min}–${max} characters. No proposal was created.`, code: "invalid_input" };
    }
  }
  const title = (input.title as string).trim();
  const targetId = (input.target_id as string).trim();
  const rationale = (input.rationale as string).trim();
  const existing = current.find((proposal) => proposal.title === title && proposal.targetId === targetId && proposal.rationale === rationale);
  if (existing) return { proposal: existing, created: false };
  // Reviewed items also count: retaining them must never grow the session queue.
  if (current.length >= MAX_PROPOSALS) {
    return { error: "Review queue full. Existing proposals remain available for human review. No proposal was created.", code: "queue_full" };
  }
  return {
    proposal: {
      id: `PRP-${String(current.length + 1).padStart(3, "0")}`,
      title, targetId, rationale, createdBy,
      status: "awaiting_human_approval",
    },
    created: true,
  };
}
