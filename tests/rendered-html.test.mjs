import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("image optimizer rejects cache-busting and malformed requests before accessing bindings", async () => {
  const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
  let bindingCalls = 0;
  const env = {
    ASSETS: { fetch() { bindingCalls++; throw new Error("Unexpected asset fetch"); } },
    IMAGES: { input() { bindingCalls++; throw new Error("Unexpected paid transform"); } },
  };
  for (const method of ["GET", "HEAD", "POST"]) {
    for (const query of ["", "?url=%2Fog-proofline.png&w=640&q=75", "?url=%2Fog-proofline.png&w=640&q=75&nonce=1", "?url=https%3A%2F%2Fexample.com%2Fimage.png&w=640", "?url=%2Fog-proofline.png&w=bad"]) {
      const response = await worker.fetch(new Request(`http://localhost/_vinext/image${query}`, { method }), env, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(response.status, 404);
    }
  }
  assert.equal(bindingCalls, 0);
});

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
  assert.match(html, /Run the 30-second review/);
  assert.match(html, /Can we tell the applicant that funding is approved/);
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
  assert.match(source, /VISIBLE AGENT ACTIVITY/);
  assert.match(source, /runGuidedReview/);
  assert.match(source, /0<\/b> records changed/);
  assert.match(source, /proposal-target/);
  assert.match(source, /Target · \{proposal\.targetId\}/);
  assert.match(source, /enum: proposalTargetIds/);
});
