"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type Proposal = {
  id: string;
  title: string;
  targetId: string;
  rationale: string;
  status: "awaiting_human_approval" | "approved" | "rejected";
  createdBy: "agent" | "human";
};

const toolNames = [
  "get_case_status",
  "trace_claim_to_sources",
  "list_evidence_gaps",
  "propose_next_steps",
  "prepare_case_change",
];

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
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const proposalCounter = useRef(0);

  const selectedClaim = claimFor(selectedClaimId) ?? claims[0];
  const selectedSources = useMemo(
    () => selectedClaim.sourceIds.map(sourceFor).filter(Boolean),
    [selectedClaim],
  );

  function prepareProposal(title: string, targetId: string, rationale: string, createdBy: Proposal["createdBy"]) {
    proposalCounter.current += 1;
    const proposal: Proposal = {
      id: `PRP-${String(proposalCounter.current).padStart(3, "0")}`,
      title,
      targetId,
      rationale,
      status: "awaiting_human_approval",
      createdBy,
    };
    setProposals((current) => [...current, proposal]);
    return proposal;
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
          const title = String(input.title ?? "").trim();
          const targetId = String(input.target_id ?? "").trim();
          const rationale = String(input.rationale ?? "").trim();
          if (title.length < 8 || targetId.length < 3 || rationale.length < 12) return { error: "Input is too short. No proposal was created." };
          const proposal = prepareProposal(title, targetId, rationale, "agent");
          setLastTool(`prepare_case_change created ${proposal.id}; nothing was applied.`);
          return { proposal, applied: false, external_action: false, next_required_actor: "human_reviewer" };
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
    setProposals((current) => current.map((proposal) => (proposal.id === id ? { ...proposal, status } : proposal)));
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="EMID Proofline home"><span className="brand-mark" aria-hidden="true">E</span><span><strong>EMID Proofline</strong><small>Integrity before intelligence</small></span></a>
        <nav aria-label="Primary navigation"><a href="#workspace">Case</a><a href="#gaps">Gaps</a><a href="#approval">Approval</a></nav>
        <span className="public-badge">Public demo · fictional data</span>
      </header>

      <section className="intro" id="workspace">
        <div><p className="eyebrow">Agent-native evidence workspace</p><h1>Ask the case.<br /><em>Verify the answer.</em></h1><p className="intro-copy">A human and an agent can inspect the same record, trace every claim to its source, expose what is missing, and prepare a next move without silently changing the truth.</p></div>
        <div className="case-snapshot" aria-label="Case status"><div className="snapshot-top"><span>PROJECT HORIZON</span><span>HZ-204</span></div><p className="status-label">Literal case status</p><h2>Under administrative review</h2><p className="boundary">Receipt and review are documented. Completeness, approval, and funding are not.</p><div className="snapshot-metrics"><span><b>05</b> claims</span><span><b>05</b> sources</span><span><b>03</b> open gaps</span></div></div>
      </section>

      <section className="workspace-shell" aria-label="Project Horizon evidence workspace">
        <aside className="case-nav">
          <div><span className="nav-kicker">Fictional case</span><strong>Project Horizon</strong><small>Last evidence · Feb 10</small></div>
          <a className="active" href="#claims"><span>01</span>Claims</a><a href="#trace"><span>02</span>Source trace</a><a href="#gaps"><span>03</span>Evidence gaps</a><a href="#approval"><span>04</span>Approval queue</a>
          <div className={`tool-indicator ${toolSupport}`}><span aria-hidden="true" /><div><b>{toolSupport === "available" ? "WebMCP connected" : toolSupport === "checking" ? "Checking site tools" : "Standard browser mode"}</b><small>{toolSupport === "available" ? "5 tools exposed" : "The human interface still works"}</small></div></div>
        </aside>

        <div className="claims-panel" id="claims">
          <div className="panel-heading"><div><p className="eyebrow">Claim ledger</p><h2>What can we actually say?</h2></div><span className="result-count">5 claims</span></div>
          <div className="claim-list">{claims.map((claim) => <button className={`claim-card ${selectedClaim.id === claim.id ? "selected" : ""}`} key={claim.id} onClick={() => setSelectedClaimId(claim.id)}><span className={`level level-${claim.level}`}>{claim.levelLabel}</span><strong>{claim.statement}</strong><span className="claim-meta"><b>{claim.id}</b><i>{claim.sourceIds.length} linked source{claim.sourceIds.length === 1 ? "" : "s"}</i></span></button>)}</div>
        </div>

        <aside className="trace-panel" id="trace" aria-live="polite">
          <div className="trace-header"><p className="eyebrow">Trace view</p><span>{selectedClaim.id}</span></div><h2>{selectedClaim.statement}</h2><p className="reasoning">{selectedClaim.reasoning}</p>
          <div className="source-stack">{selectedSources.length ? selectedSources.map((source) => source && <article key={source.id}><div><span>{source.id}</span><time>{source.date}</time></div><h3>{source.title}</h3><p>“{source.excerpt}”</p><small>{source.kind} · {source.integrity}</small></article>) : <div className="empty-trace"><span>∅</span><strong>No supporting source</strong><p>This is visible as a gap, not filled with a guess.</p></div>}</div>
        </aside>
      </section>

      <section className="levels-section"><div><p className="eyebrow">Evidence vocabulary</p><h2>Different certainty deserves different language.</h2></div><div className="level-strip">{levelOrder.map((level, index) => <span className={`level level-${level}`} key={level}><b>{String(index + 1).padStart(2, "0")}</b>{levelLabels[level]}</span>)}</div></section>

      <section className="gaps-section" id="gaps">
        <div className="section-heading"><div><p className="eyebrow">Gap analysis</p><h2>The missing evidence is part of the answer.</h2></div><p>Proofline names the limit and the exact kind of record that could close it. It does not convert absence into certainty.</p></div>
        <div className="gap-grid">{gaps.map((gap) => <article key={gap.id}><div><span className={`severity ${gap.severity}`}>{gap.severity}</span><span>{gap.id}</span></div><h3>{gap.title}</h3><p>{gap.impact}</p><dl><dt>Closes with</dt><dd>{gap.closesWith}</dd></dl></article>)}</div>
      </section>

      <section className="agent-section">
        <div className="agent-copy"><p className="eyebrow light">Human + agent</p><h2>Five real tools.<br />One visible chain of custody.</h2><p>The agent can read status, trace claims, list gaps, rank next steps, and prepare a change. Every result is bounded by the fictional case data on this page.</p><div className="tool-list">{toolNames.map((name, index) => <span key={name}><b>0{index + 1}</b>{name}</span>)}</div></div>
        <div className="activity-console"><div className="console-top"><span>LIVE ACTIVITY</span><span className={toolSupport}>● {toolSupport}</span></div><div className="console-body"><span className="prompt">proofline / project-horizon</span><p>{lastTool}</p><small>Tool results are inspectable. No external action can be taken from this demo.</small></div><button onClick={() => prepareProposal("Request a completeness confirmation", "GAP-001", "The dated evidence does not establish that the submitted file is complete.", "human")}>Prepare a safe change proposal</button></div>
      </section>

      <section className="approval-section" id="approval">
        <div className="section-heading"><div><p className="eyebrow">Approval boundary</p><h2>Prepared is not applied.</h2></div><p>A proposal can be inspected, approved, or rejected by a person. Even approval in this demo changes only the proposal state—it never sends, files, uploads, or publishes anything.</p></div>
        <div className="approval-layout"><div className="next-steps">{nextSteps.map((step) => <article key={step.id}><span>0{step.priority}</span><div><h3>{step.title}</h3><p>{step.rationale}</p></div></article>)}</div><div className="proposal-queue"><div className="queue-heading"><strong>Human review queue</strong><span>{proposals.filter((item) => item.status === "awaiting_human_approval").length} pending</span></div>{proposals.length === 0 ? <div className="queue-empty"><span>✓</span><p>No prepared changes. Ask the agent to prepare one, or use the button above.</p></div> : proposals.map((proposal) => <article key={proposal.id}><div className="proposal-top"><span>{proposal.id}</span><span>{proposal.createdBy === "agent" ? "Prepared by agent" : "Prepared in interface"}</span></div><h3>{proposal.title}</h3><p>{proposal.rationale}</p>{proposal.status === "awaiting_human_approval" ? <div className="review-actions"><button onClick={() => reviewProposal(proposal.id, "rejected")}>Reject</button><button className="approve" onClick={() => reviewProposal(proposal.id, "approved")}>Approve proposal</button></div> : <span className={`reviewed ${proposal.status}`}>{proposal.status === "approved" ? "Approved as proposal · not executed" : "Rejected"}</span>}</article>)}</div></div>
      </section>

      <footer><div className="brand"><span className="brand-mark">E</span><span><strong>EMID Proofline</strong><small>Integrity before intelligence</small></span></div><p>Public-safe demonstration by Artashes Nazaryan. Project Horizon and all records shown are fictional.</p><p>EMID remains a local/offline prototype with no documented clients, sales, pilots, or commercial validation.</p></footer>
    </main>
  );
}
