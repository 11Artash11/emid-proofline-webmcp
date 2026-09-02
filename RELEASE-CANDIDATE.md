# Release candidate — EMID Proofline

Status: **prepared locally; not published, uploaded, registered, or submitted**.

## Verified in the compiled app

- The page renders at desktop and mobile widths with no horizontal overflow.
- All five top-level WebMCP tools are discoverable by the browser.
- `get_case_status` returns the literal `under_administrative_review` status.
- `trace_claim_to_sources` keeps CLM-003 at declaration level and does not infer approval.
- `list_evidence_gaps` identifies the two critical missing records.
- `propose_next_steps` reports `action_taken: false`.
- `prepare_case_change` creates PRP-001 with `applied: false`,
  `external_action: false`, and `next_required_actor: human_reviewer`.
- Human approval changes only the proposal label to
  “Approved as proposal · not executed.”

## Public-safe scope

The publishable source is exactly the set of files tracked by Git. The private
working folders `docs/`, `examples/`, `tools/`, and `video/`, along with build
output and local dependencies, remain excluded by `.gitignore`.

The demonstration uses only the fictional Project Horizon dataset. The footer
and README state that EMID is a local/offline prototype with no documented
clients, sales, pilots, or commercial validation.

## Demo sequence

Use the 2:35 storyboard in [`DEMO.md`](DEMO.md) and these prompts:

1. “Use the site tools to trace CLM-003 to its sources. Is funding approval documented?”
2. “List the critical evidence gaps and tell me exactly what would close them.”
3. “Propose the next steps for status and timing.”
4. “Prepare a proposal to request a completeness confirmation for GAP-001.”

## Actions still requiring explicit approval

Each of these remains a separate external action:

1. Create or expose a public source repository.
2. Publish the site and disclose the resulting public URL.
3. Record and export the final demo video.
4. Upload the video to an external service.
5. Register for or submit the challenge entry.

Before any of those steps, confirm the exact destination, account, files, text,
and visibility with Artashes Nazaryan.
