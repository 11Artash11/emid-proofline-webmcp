import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the public-safe EMID Proofline workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>EMID Proofline/);
  assert.match(html, /Integrity before intelligence/i);
  assert.match(html, /Project Horizon/);
  assert.match(html, /fictional data/i);
  assert.match(html, /prepare_case_change/);
  assert.match(html, /Prepared is not applied/);
  assert.match(html, /Artashes Nazaryan/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|DNI|pasaporte|OSDE|Banco Nación|Validación técnica inicial/i);
});

test("registers the required WebMCP tools on the top-level page", async () => {
  const source = await readFile(new URL("../app/proofline.tsx", import.meta.url), "utf8");
  assert.match(source, /document\.modelContext!\.registerTool/);
  for (const tool of [
    "get_case_status",
    "trace_claim_to_sources",
    "list_evidence_gaps",
    "propose_next_steps",
    "prepare_case_change",
  ]) {
    assert.match(source, new RegExp(`name: "${tool}"`));
  }
  assert.match(source, /applied: false/);
  assert.match(source, /external_action: false/);
});
