# EMID Proofline — Integrity Before Intelligence

EMID Proofline is an agent-native evidence workspace. A person and an agent can
inspect the same fictional case, trace claims to sources, identify evidence
gaps, rank next steps, and prepare changes that remain subject to explicit human
approval.

The demo uses only **Project Horizon**, a fictional case. It contains no
production records, customer data, or real case material.

## WebMCP site tools

The top-level page registers five tools through
`document.modelContext.registerTool`:

- `get_case_status`
- `trace_claim_to_sources`
- `list_evidence_gaps`
- `propose_next_steps`
- `prepare_case_change`

The first four are read-only. `prepare_case_change` creates a reversible review
proposal in the visible interface; it never applies a record change or performs
an external action.

The under-three-minute live demo plan is in [`DEMO.md`](DEMO.md).

## Local development

Requirements: Node.js 22.13 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Run the production checks with:

```bash
pnpm test
pnpm lint
```

## Status and safety

EMID is a local/offline prototype. There are no documented customers, sales,
pilots, or commercial validation. Any action that would alter a record is
prepared as a proposal and remains pending until a person explicitly approves
it.

The private working archive, source documents, correspondence, and video files
are excluded from this repository by `.gitignore`.

## License

MIT. See `LICENSE`.
