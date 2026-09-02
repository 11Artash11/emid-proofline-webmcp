# Submission draft — WebMCP Challenge 2026

This is prepared copy only. It has not been entered, saved, or submitted on
Devpost.

## Project name

EMID Proofline — Integrity Before Intelligence

## Tagline

Trace claims, expose evidence gaps, and keep every consequential change under
human control.

## Short description

EMID Proofline is an agent-native evidence workspace where a person and an
agent inspect the same case record. The agent can read the literal status,
trace a claim to its sources, identify missing evidence, rank safe next steps,
and prepare a reversible change proposal. It cannot silently upgrade uncertain
information or perform an external action.

The public demo uses Project Horizon, a wholly fictional administrative case.
It contains no customer data, production records, or private case material.

## Why this is a strong fit for WebMCP

Evidence review is difficult to automate through visual clicking alone. The
meaning of an action depends on distinctions such as documented fact,
declaration, inference, open question, prepared proposal, and executed change.
WebMCP lets the site expose those distinctions as narrow, typed operations with
explicit results and side-effect boundaries.

Instead of asking an agent to infer meaning from interface geometry, Proofline
provides structured access to the same evidence model a person can inspect on
screen. The normal human interface remains complete and usable.

## What people and agents can do together

A person can select and inspect a claim while an agent traces the same claim to
the underlying sources and states the reasoning limit. The agent can identify
which exact record would close an evidence gap and prepare a next move. A human
then reviews, approves, or rejects that proposal. Approval in this demo changes
only the proposal state; it never sends, files, uploads, publishes, or changes
the underlying case status.

This creates a shared, inspectable chain of custody between human judgment and
agent assistance.

## WebMCP implementation

The top-level page registers five tools through
`document.modelContext.registerTool`:

1. `get_case_status` — returns the literal status and its evidence boundary.
2. `trace_claim_to_sources` — links one claim to sources and reasoning limits.
3. `list_evidence_gaps` — lists unresolved gaps and the record needed to close each one.
4. `propose_next_steps` — ranks evidence-safe actions without executing them.
5. `prepare_case_change` — creates a reversible proposal for human review.

The first four tools are read-only. The fifth returns `applied: false`,
`external_action: false`, and `next_required_actor: human_reviewer`, while also
placing the proposal in the visible review queue.

## Testing instructions

1. Open the live URL in ChatGPT’s in-app browser with WebMCP support.
2. Ask: “Use the site tools to trace CLM-003 to its sources. Is funding approval documented?”
3. Confirm that the result cites SRC-004 and keeps the statement at declaration level.
4. Ask: “List the critical evidence gaps and tell me exactly what would close them.”
5. Ask: “Prepare a proposal to request a completeness confirmation for GAP-001.”
6. Confirm that the proposal appears in the human review queue.
7. Approve the proposal and confirm the label reads “Approved as proposal · not executed.”

No account, credentials, personal data, or payment is required for the demo.

## Work completed during the challenge period

- Created a public-safe fictional demo baseline on September 1, 2026.
- Added the evidence workspace, five WebMCP tools, and approval boundary on September 1, 2026.
- Completed compiled browser testing and release-candidate documentation on September 2, 2026.

The dated Git history distinguishes the WebMCP implementation from any earlier
EMID concepts or private prototypes. Only the work in this repository is part
of this submission.

## Technology

- WebMCP `document.modelContext.registerTool`
- React and Next.js-compatible Vinext
- TypeScript
- Cloudflare Workers-compatible output
- ChatGPT Sites-ready hosting configuration

## Links to complete after approval

- Live application: `[PUBLIC LIVE URL]`
- Public source repository: `[PUBLIC REPOSITORY URL]`
- Public YouTube demo: `[PUBLIC VIDEO URL]`

## License and author

MIT License. Public demonstration by Artashes Nazaryan.

## Official requirements checked

- Challenge overview: <https://openai.com/webmcp-challenge/>
- Official rules: <https://webmcp.devpost.com/rules>
