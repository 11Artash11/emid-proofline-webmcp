"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createProposal, MAX_PROPOSALS, type Proposal } from "./proposal-queue";
import { claims, gaps, levelLabels, levelOrder, nextSteps, sources } from "./proofline-data";

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, boolean>;
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool: (definition: ToolDefinition) => Promise<void> | void;
      unregisterTool?: (name: string) => Promise<void> | void;
    };
  }
}

type ActivityEvent = {
  id: number;
  tool: string;
  summary: string;
  kind: "read" | "gap" | "proposal";
};

const toolNames = [
  "get_case_status",
  "trace_claim_to_sources",
  "list_evidence_gaps",
  "propose_next_steps",
  "prepare_case_change",
];

const interfaceProposal = {
  title: "Request a completeness confirmation",
  targetId: "GAP-001",
  rationale: "The dated evidence does not establish that the submitted file is complete.",
} as const;

function sourceFor(id: string) {
  return sources.find((source) => source.id === id);
}

function claimFor(id: string) {
  return claims.find((claim) => claim.id === id);
}

export default function Proofline() {
  const [selectedClaimId, setSelectedClaimId] = useState("CLM-003");
  const [toolSupport, setToolSupport] = useState<"checking" | "available" | "unavailable">("checking");
  const [lastTool, setLastTool] = useState("No site tool used in this session.");
  const [guidedReviewComplete, setGuidedReviewComplete] = useState(false);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const proposalsRef = useRef<Proposal[]>([]);
  const activityCounter = useRef(0);
  const tracePanelRef = useRef<HTMLElement>(null);

  const selectedClaim = claimFor(selectedClaimId) ?? claims[0];
  const selectedSources = useMemo(
    () => selectedClaim.sourceIds.map(sourceFor).filter(Boolean),
    [selectedClaim],
  );

  function recordActivity(tool: string, summary: string, kind: ActivityEvent["kind"] = "read") {
    activityCounter.current += 1;
    const event = { id: activityCounter.current, tool, summary, kind };
    setActivities((current) => [...current.slice(-3), event]);
  }

  function runGuidedReview() {
    setSelectedClaimId("CLM-003");
    setGuidedReviewComplete(true);
    setLastTool("The claim is not proven. Approval needs a signed decision or equivalent primary record.");
    recordActivity("trace_claim_to_sources", "1 declared note traced; no decision record found.", "read");
    recordActivity("list_evidence_gaps", "2 approval-related gaps surfaced.", "gap");
    recordActivity("propose_next_steps", "A verification request was ranked first; nothing was sent.", "read");
  }

  function prepareProposal(input: Record<string, unknown>, createdBy: Proposal["createdBy"]) {
    const result = createProposal(proposalsRef.current, input, createdBy);
    if (!("error" in result) && result.created) {
      proposalsRef.current = [...proposalsRef.current, result.proposal];
      setProposals(proposalsRef.current);
    }
    return result;
  }

  useEffect(() => {
    const modelContext = document.modelContext;
    if (typeof modelContext?.registerTool !== "function") {
      queueMicrotask(() => setToolSupport("unavailable"));
      return;
    }

    const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
      type: "object",
      properties,
      required,
      additionalProperties: false,
    });

    const definitions: ToolDefinition[] = [
      {
        name: "get_case_status",
        description: "Read the literal current status and evidence summary for the fictional Project Horizon case.",
        inputSchema: objectSchema({}),
        annotations: { readOnlyHint: true },
        execute: async () => {
          setLastTool("get_case_status read the current case state.");
          recordActivity("get_case_status", "Literal status read: under administrative review.");
          return {
            case_id: "HZ-204",
            case_name: "Project Horizon",
            fictional_demo: true,
            literal_status: "under_administrative_review",
            status_label: "Under administrative review",
            last_dated_evidence: "2026-02-10",
            supported_claims: claims.filter((claim) => claim.status === "supported").length,
            open_gaps: gaps.length,
            boundary: "Receipt and review are documented. Completeness, approval, and funding are not documented.",
          };
        },
      },
      {
        name: "trace_claim_to_sources",
        description: "Trace one Project Horizon claim to its supporting sources, evidence level, and explicit reasoning limits.",
        inputSchema: objectSchema({ claim_id: { type: "string", description: "Claim identifier.", enum: claims.map((claim) => claim.id) } }, ["claim_id"]),
        annotations: { readOnlyHint: true },
        execute: async (input) => {
          const claim = claimFor(String(input.claim_id));
          if (!claim) return { error: "Claim not found", available_claim_ids: claims.map((item) => item.id) };
          setSelectedClaimId(claim.id);
          setLastTool(`trace_claim_to_sources opened ${claim.id}.`);
          recordActivity("trace_claim_to_sources", `${claim.id} traced to ${claim.sourceIds.length} source${claim.sourceIds.length === 1 ? "" : "s"}.`);
          return { claim, sources: claim.sourceIds.map(sourceFor).filter(Boolean), source_count: claim.sourceIds.length, verification_note: claim.reasoning };
        },
      },
      {
        name: "list_evidence_gaps",
        description: "List unresolved evidence gaps and say exactly what record would close each gap.",
        inputSchema: objectSchema({ severity: { type: "string", enum: ["all", "critical", "watch"], description: "Optional severity filter." } }),
        annotations: { readOnlyHint: true },
        execute: async (input) => {
          const severity = String(input.severity ?? "all");
          const filtered = severity === "all" ? gaps : gaps.filter((gap) => gap.severity === severity);
          setLastTool(`list_evidence_gaps returned ${filtered.length} gap${filtered.length === 1 ? "" : "s"}.`);
          recordActivity("list_evidence_gaps", `${filtered.length} unresolved gap${filtered.length === 1 ? "" : "s"} returned.`, "gap");
          return { filter: severity, count: filtered.length, gaps: filtered };
        },
      },
      {
        name: "propose_next_steps",
        description: "Rank evidence-safe next steps without sending messages or changing the case record.",
        inputSchema: objectSchema({ focus: { type: "string", enum: ["all", "status", "approval", "timing"], description: "Area to prioritize." } }),
        annotations: { readOnlyHint: true },
        execute: async (input) => {
          const focus = String(input.focus ?? "all");
          setLastTool(`propose_next_steps prepared a ${focus} plan without applying changes.`);
          recordActivity("propose_next_steps", `${focus} plan prepared; no action taken.`);
          return { focus, steps: nextSteps, action_taken: false, approval_required_for: "Any message, filing, status change, upload, or external commitment." };
        },
      },
      {
        name: "prepare_case_change",
        description: "Prepare a reversible case-change proposal for human review. This tool never applies, sends, files, or publishes the change.",
        inputSchema: objectSchema({
          title: { type: "string", minLength: 8, maxLength: 100, description: "Short proposed change." },
          target_id: { type: "string", minLength: 3, maxLength: 30, description: "Claim, gap, or case identifier." },
          rationale: { type: "string", minLength: 12, maxLength: 280, description: "Evidence-based reason for proposing the change." },
        }, ["title", "target_id", "rationale"]),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
        execute: async (input) => {
          const result = prepareProposal(input, "agent");
          if ("error" in result) return { ...result, applied: false, external_action: false };
          setLastTool(result.created
            ? `prepare_case_change created ${result.proposal.id}; nothing was applied.`
            : `prepare_case_change reused ${result.proposal.id}; no duplicate was created.`);
          recordActivity("prepare_case_change", `${result.proposal.id} awaits a human decision; nothing was applied.`, "proposal");
          return { ...result, applied: false, external_action: false, next_required_actor: "human_reviewer" };
        },
      },
    ];

    Promise.all(definitions.map((definition) => document.modelContext!.registerTool(definition)))
      .then(() => setToolSupport("available"))
      .catch(() => {
        setToolSupport("unavailable");
        setLastTool("Site tools could not be registered in this browser.");
      });

    return () => {
      if (typeof modelContext.unregisterTool === "function") toolNames.forEach((name) => void modelContext.unregisterTool?.(name));
    };
  }, []);

  function reviewProposal(id: string, status: "approved" | "rejected") {
    proposalsRef.current = proposalsRef.current.map((proposal) => (proposal.id === id ? { ...proposal, status } : proposal));
    setProposals(proposalsRef.current);
    recordActivity("human_review", `${id} was ${status} as a proposal; no external action ran.`, "proposal");
  }

  function selectClaim(id: string) {
    setSelectedClaimId(id);
    if (window.matchMedia("(max-width: 1050px)").matches) {
      requestAnimationFrame(() => tracePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="EMID Proofline home"><span className="brand-mark" aria-hidden="true">E</span><span><strong>EMID Proofline</strong><small>Integrity before intelligence</small></span></a>
        <nav aria-label="Primary navigation"><a href="#workspace">Case</a><a href="#gaps">Gaps</a><a href="#approval">Approval</a></nav>
        <span className="public-badge">Public demo · fictional data</span>
      </header>

      <section className="intro" id="workspace">
        <div><p className="eyebrow">Agent-native evidence workspace</p><h1>Ask the case.<br /><em>Verify the answer.</em></h1><p className="intro-copy">A human and an agent inspect the same record, trace every claim to its source, expose what is missing, and prepare a next move without silently changing the truth.</p><div className="intro-actions"><a className="primary-action" href="#guided-review">Run the 30-second review</a><a className="text-action" href="#approval">See the human safeguard <span aria-hidden="true">→</span></a></div></div>
        <div className="case-snapshot" aria-label="Case status"><div className="snapshot-top"><span>PROJECT HORIZON</span><span>HZ-204</span></div><p className="status-label">Literal case status</p><h2>Under administrative review</h2><p className="boundary">Receipt and review are documented. Completeness, approval, and funding are not.</p><div className="snapshot-metrics"><span><b>05</b> claims</span><span><b>05</b> sources</span><span><b>03</b> open gaps</span></div></div>
      </section>

      <section className="workspace-shell" aria-label="Project Horizon evidence workspace">
        <div className={`guided-review ${guidedReviewComplete ? "complete" : ""}`} id="guided-review">
          <div className="mission-copy"><span className="mission-label">Live task · fictional case</span><strong>“Can we tell the applicant that funding is approved?”</strong><small>Proofline must answer from the record—not from optimism, memory, or a missing document.</small></div>
          <div className="mission-outcome" aria-live="polite">
            {guidedReviewComplete ? <><span className="answer-mark">No—not yet.</span><p>One declared note says approval was likely. No signed decision proves it.</p><div><b>1</b> source traced <b>2</b> gaps found <b>0</b> records changed</div></> : <><span className="answer-mark muted">Ready to verify</span><p>Run the review to watch the agent trace, challenge, and bound the claim.</p></>}
          </div>
          <button type="button" onClick={runGuidedReview}>{guidedReviewComplete ? "Review complete · run again" : "Run evidence review"}</button>
        </div>
        <aside className="case-nav">
          <div><span className="nav-kicker">Fictional case</span><strong>Project Horizon</strong><small>Last evidence · Feb 10</small></div>
          <a className="active" href="#claims"><span>01</span>Claims</a><a href="#trace"><span>02</span>Source trace</a><a href="#gaps"><span>03</span>Evidence gaps</a><a href="#approval"><span>04</span>Approval queue</a>
          <div className={`tool-indicator ${toolSupport}`}><span aria-hidden="true" /><div><b>{toolSupport === "available" ? "WebMCP connected" : toolSupport === "checking" ? "Checking site tools" : "Standard browser mode"}</b><small>{toolSupport === "available" ? "5 tools exposed" : "The human interface still works"}</small></div></div>
        </aside>

        <div className="claims-panel" id="claims">
          <div className="panel-heading"><div><p className="eyebrow">Claim ledger</p><h2>What can we actually say?</h2></div><span className="result-count">5 claims</span></div>
          <div className="claim-list">{claims.map((claim) => <button className={`claim-card ${selectedClaim.id === claim.id ? "selected" : ""}`} key={claim.id} onClick={() => selectClaim(claim.id)} aria-pressed={selectedClaim.id === claim.id} aria-controls="trace"><span className={`level level-${claim.level}`}>{claim.levelLabel}</span><strong>{claim.statement}</strong><span className="claim-meta"><b>{claim.id}</b><i>{claim.sourceIds.length} linked source{claim.sourceIds.length === 1 ? "" : "s"}</i></span></button>)}</div>
        </div>

        <aside className="trace-panel" id="trace" aria-live="polite" ref={tracePanelRef} tabIndex={-1}>
          <div className="trace-header"><p className="eyebrow">Trace view</p><span>{selectedClaim.id}</span></div><h2>{selectedClaim.statement}</h2><p className="reasoning">{selectedClaim.reasoning}</p>
          <div className="source-stack">{selectedSources.length ? selectedSources.map((source) => source && <article key={source.id}><div><span>{source.id}</span><time>{source.date}</time></div><h3>{source.title}</h3><p>“{source.excerpt}”</p><small>{source.kind} · {source.integrity}</small></article>) : <div className="empty-trace"><span>∅</span><strong>No supporting source</strong><p>This is visible as a gap, not filled with a guess.</p></div>}</div>
        </aside>
      </section>

      <section className="levels-section"><div><p className="eyebrow">Evidence vocabulary</p><h2>Different certainty deserves different language.</h2></div><div className="level-strip">{levelOrder.map((level, index) => <span className={`level level-${level}`} key={level}><b>{String(index + 1).padStart(2, "0")}</b>{levelLabels[level]}</span>)}</div></section>

      <section className="gaps-section" id="gaps">
        <div className="section-heading"><div><p className="eyebrow">Gap analysis</p><h2>The missing evidence is part of the answer.</h2></div><p>Proofline names the limit and the exact kind of record that could close it. It does not convert absence into certainty.</p></div>
        <div className="gap-grid">{gaps.map((gap) => <article key={gap.id}><div><span className={`severity ${gap.severity}`}>{gap.severity}</span><span>{gap.id}</span></div><h3>{gap.title}</h3><p>{gap.impact}</p><dl><dt>Closes with</dt><dd>{gap.closesWith}</dd></dl></article>)}</div>
      </section>

      <section className="agent-section" id="activity">
        <div className="agent-copy"><p className="eyebrow light">Human + agent</p><h2>Five real tools.<br />One visible chain of custody.</h2><p>The agent can read status, trace claims, list gaps, rank next steps, and prepare a change. Every result is bounded by the fictional case data on this page.</p><div className="tool-list">{toolNames.map((name, index) => <span key={name}><b>0{index + 1}</b>{name}</span>)}</div></div>
        <div className="activity-console"><div className="console-top"><span>VISIBLE AGENT ACTIVITY</span><span className={toolSupport}>● {toolSupport}</span></div><div className="console-body"><span className="prompt">proofline / project-horizon</span><p className="console-conclusion">{lastTool}</p><div className="activity-feed">{activities.length === 0 ? <div className="activity-empty"><b>Waiting for a task</b><small>Run the guided review above or ask an agent to use a site tool.</small></div> : activities.map((event) => <article className={event.kind} key={event.id}><span>{event.tool}</span><small>{event.summary}</small></article>)}</div><small className="console-boundary">Every result is inspectable. No external action can be taken from this demo.</small></div><button disabled={proposals.length >= MAX_PROPOSALS || proposals.some((proposal) => proposal.title === interfaceProposal.title && proposal.targetId === interfaceProposal.targetId && proposal.rationale === interfaceProposal.rationale)} onClick={() => { const result = prepareProposal({ title: interfaceProposal.title, target_id: interfaceProposal.targetId, rationale: interfaceProposal.rationale }, "human"); if ("error" in result) { setLastTool(result.error); return; } setLastTool(`${result.proposal.id} is ready for human review; nothing was applied.`); recordActivity("prepare_case_change", `${result.proposal.id} prepared in the interface and held for review.`, "proposal"); }}>{proposals.some((proposal) => proposal.title === interfaceProposal.title && proposal.targetId === interfaceProposal.targetId && proposal.rationale === interfaceProposal.rationale) ? "Proposal already prepared" : proposals.length >= MAX_PROPOSALS ? "Review queue full" : "Prepare a safe change proposal"}</button></div>
      </section>

      <section className="approval-section" id="approval">
        <div className="section-heading"><div><p className="eyebrow">Approval boundary</p><h2>Prepared is not applied.</h2></div><p>A proposal can be inspected, approved, or rejected by a person. Even approval in this demo changes only the proposal state—it never sends, files, uploads, or publishes anything.</p></div>
        <div className="approval-layout"><div className="next-steps">{nextSteps.map((step) => <article key={step.id}><span>0{step.priority}</span><div><h3>{step.title}</h3><p>{step.rationale}</p></div></article>)}</div><div className="proposal-queue"><div className="queue-heading"><strong>Human review queue</strong><span>{proposals.filter((item) => item.status === "awaiting_human_approval").length} pending</span></div><p className="queue-capacity" aria-live="polite">{proposals.length} of {MAX_PROPOSALS} session slots used.{proposals.length >= MAX_PROPOSALS ? " Queue full. Existing proposals remain available for review." : ""}</p>{proposals.length === 0 ? <div className="queue-empty"><span>✓</span><p>No prepared changes. Ask the agent to prepare one, or use the button above.</p></div> : proposals.map((proposal) => <article key={proposal.id}><div className="proposal-top"><span>{proposal.id}</span><span>{proposal.createdBy === "agent" ? "Prepared by agent" : "Prepared in interface"}</span></div><h3>{proposal.title}</h3><p>{proposal.rationale}</p>{proposal.status === "awaiting_human_approval" ? <div className="review-actions"><button onClick={() => reviewProposal(proposal.id, "rejected")}>Reject</button><button className="approve" onClick={() => reviewProposal(proposal.id, "approved")}>Approve proposal</button></div> : <span className={`reviewed ${proposal.status}`}>{proposal.status === "approved" ? "Approved as proposal · not executed" : "Rejected"}</span>}</article>)}</div></div>
      </section>

      <footer><div className="brand"><span className="brand-mark">E</span><span><strong>EMID Proofline</strong><small>Integrity before intelligence</small><small>Evolution preview v0.2 · 2026-09-28</small></span></div><p>Public-safe demonstration by Artashes Nazaryan. Project Horizon and all records shown are fictional.</p><p>EMID remains a local/offline prototype with no documented clients, sales, pilots, or commercial validation.<br /><span className="session-note">Local session · close the preview server after review. No case data persists.</span></p></footer>
    </main>
  );
}
