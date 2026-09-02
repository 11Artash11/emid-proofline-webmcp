export type EvidenceLevel =
  | "documented"
  | "corroborated"
  | "declaration"
  | "inference"
  | "hypothesis"
  | "open";

export type Source = {
  id: string;
  title: string;
  kind: string;
  date: string;
  excerpt: string;
  integrity: string;
};

export type Claim = {
  id: string;
  statement: string;
  level: EvidenceLevel;
  levelLabel: string;
  status: "supported" | "partial" | "unsupported" | "open";
  sourceIds: string[];
  reasoning: string;
};

export const sources: Source[] = [
  {
    id: "SRC-001",
    title: "Project Horizon program guide",
    kind: "Policy PDF",
    date: "2026-01-08",
    excerpt: "Administrative review begins after the required files are received.",
    integrity: "SHA-256 verified",
  },
  {
    id: "SRC-002",
    title: "Submission receipt",
    kind: "Portal receipt",
    date: "2026-01-14",
    excerpt: "Application HZ-204 was received with four attachments.",
    integrity: "Original preserved",
  },
  {
    id: "SRC-003",
    title: "Review status notice",
    kind: "Email export",
    date: "2026-02-02",
    excerpt: "The application remains under administrative review.",
    integrity: "Headers preserved",
  },
  {
    id: "SRC-004",
    title: "Applicant call note",
    kind: "Declared note",
    date: "2026-02-05",
    excerpt: "The applicant recalls being told that approval was likely.",
    integrity: "Authorship recorded",
  },
  {
    id: "SRC-005",
    title: "Portal status capture",
    kind: "Screenshot",
    date: "2026-02-10",
    excerpt: "Documents received. Review in progress.",
    integrity: "Capture hash recorded",
  },
];

export const claims: Claim[] = [
  {
    id: "CLM-001",
    statement: "Application HZ-204 was received on January 14.",
    level: "corroborated",
    levelLabel: "Corroborated fact",
    status: "supported",
    sourceIds: ["SRC-002", "SRC-005"],
    reasoning: "Two independent records support receipt. Neither proves eligibility or approval.",
  },
  {
    id: "CLM-002",
    statement: "The application is still in administrative review.",
    level: "documented",
    levelLabel: "Documented fact",
    status: "supported",
    sourceIds: ["SRC-003", "SRC-005"],
    reasoning: "The latest dated records use the same literal status: review in progress.",
  },
  {
    id: "CLM-003",
    statement: "Project Horizon has been approved for funding.",
    level: "declaration",
    levelLabel: "Personal declaration",
    status: "unsupported",
    sourceIds: ["SRC-004"],
    reasoning: "A recollection that approval was likely is not a decision notice or funding award.",
  },
  {
    id: "CLM-004",
    statement: "A substantive answer should arrive by February 20.",
    level: "inference",
    levelLabel: "Inference",
    status: "partial",
    sourceIds: ["SRC-001", "SRC-002"],
    reasoning: "The guide describes a target interval, but the trigger depends on file completeness, which is not documented.",
  },
  {
    id: "CLM-005",
    statement: "All eligibility documents were accepted as complete.",
    level: "open",
    levelLabel: "Open question",
    status: "open",
    sourceIds: [],
    reasoning: "Receipt of attachments does not establish completeness or acceptance.",
  },
];

export const gaps = [
  {
    id: "GAP-001",
    severity: "critical",
    title: "No completeness confirmation",
    impact: "The review clock cannot be calculated reliably.",
    closesWith: "A dated notice explicitly confirming that the file is complete.",
    relatedClaims: ["CLM-004", "CLM-005"],
  },
  {
    id: "GAP-002",
    severity: "critical",
    title: "No approval decision",
    impact: "Funding approval remains unsupported.",
    closesWith: "A signed decision, portal resolution, or equivalent primary record.",
    relatedClaims: ["CLM-003"],
  },
  {
    id: "GAP-003",
    severity: "watch",
    title: "Phone statement has no direct record",
    impact: "The statement can be preserved as a declaration, but not upgraded.",
    closesWith: "A contemporaneous recording, written confirmation, or named follow-up.",
    relatedClaims: ["CLM-003"],
  },
];

export const nextSteps = [
  {
    id: "STEP-001",
    priority: 1,
    title: "Request a literal completeness status",
    rationale: "Closes the timing gap without presuming a favorable decision.",
    safeDraft: "Please confirm whether file HZ-204 is complete for administrative review and identify any missing item.",
  },
  {
    id: "STEP-002",
    priority: 2,
    title: "Keep the current case status unchanged",
    rationale: "The latest evidence supports ‘under review,’ not ‘approved.’",
    safeDraft: "No record change proposed.",
  },
  {
    id: "STEP-003",
    priority: 3,
    title: "Ask for the decision channel and reference",
    rationale: "A future decision should be traceable to a primary record.",
    safeDraft: "Please identify where and under which reference a final decision will be issued.",
  },
];

export const levelOrder: EvidenceLevel[] = [
  "documented",
  "corroborated",
  "declaration",
  "inference",
  "hypothesis",
  "open",
];

export const levelLabels: Record<EvidenceLevel, string> = {
  documented: "Documented fact",
  corroborated: "Corroborated fact",
  declaration: "Declaration",
  inference: "Inference",
  hypothesis: "Hypothesis",
  open: "Open question",
};
