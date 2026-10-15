import assert from "node:assert/strict";
import test from "node:test";
import { createProposal, MAX_PROPOSALS } from "../app/proposal-queue.ts";

const input = (i = 0) => ({ title: `Request verification ${i}`, target_id: "GAP-001", rationale: "Obtain the missing primary record." });

test("unique proposal flood is bounded without losing pending or reviewed items", () => {
  const queue = [];
  for (let i = 0; i < 1000; i++) {
    const result = createProposal(queue, input(i), "agent");
    if (i < MAX_PROPOSALS) {
      assert.equal(result.created, true);
      assert.equal(result.proposal.status, "awaiting_human_approval");
      queue.push(result.proposal);
    } else assert.equal(result.code, "queue_full");
  }
  assert.equal(queue.length, MAX_PROPOSALS);
  queue[0] = { ...queue[0], status: "approved" };
  queue[1] = { ...queue[1], status: "rejected" };
  const before = structuredClone(queue);
  assert.equal(createProposal(queue, input(1001), "human").code, "queue_full");
  assert.deepEqual(queue, before);
  const reused = createProposal(queue, input(0), "agent");
  assert.equal(reused.created, false);
  assert.equal(reused.proposal.status, "approved");
});

test("execution rejects invalid types and overlong fields without allocating a proposal", () => {
  for (const [key, min, max] of [["title", 8, 100], ["target_id", 3, 30], ["rationale", 12, 280]]) {
    for (const value of [null, 42, {}, [], "x".repeat(min - 1), "x".repeat(max + 1), " ".repeat(min)]) {
      const queue = [];
      assert.equal(createProposal(queue, { ...input(), [key]: value }, "agent").code, "invalid_input");
      assert.equal(queue.length, 0);
    }
  }
});

test("human and agent share validation, deduplication and the session budget", () => {
  const first = createProposal([], input(), "human");
  assert.equal(first.proposal.createdBy, "human");
  const reused = createProposal([first.proposal], { ...input(), title: ` ${input().title} ` }, "agent");
  assert.equal(reused.proposal, first.proposal);
  assert.equal(reused.created, false);
});
