import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeStatusBlock, synthesizeForProject } from "../src/synth/synthesis.ts";
import type { ActivityEvent } from "../src/log/dailyTracking.ts";

const ev = (over: Partial<ActivityEvent>): ActivityEvent => ({
  id: over.id ?? "x",
  source: over.source ?? "transcript",
  origin: over.origin ?? "/tmp/x",
  day: over.day ?? "2025-05-01",
  occurredAt: over.occurredAt ?? "2025-05-01T14:30:00.000Z",
  rawTitle: over.rawTitle ?? "Sync",
  summary: over.summary ?? "did stuff",
  ...over,
});

describe("synthesizeForProject", () => {
  it("emits a panel-info block with one bullet per event", () => {
    const out = synthesizeForProject("ICHRA", "60588040", "2025-05-01", [
      ev({ id: "a", occurredAt: "2025-05-01T14:00:00.000Z", summary: "kickoff" }),
      ev({ id: "b", occurredAt: "2025-05-01T16:00:00.000Z", source: "msg", summary: "follow-up email" }),
    ]);
    assert.match(out.html, /panel-info/);
    assert.match(out.html, /Status Update — 2025-05-01/);
    assert.match(out.html, /kickoff/);
    assert.match(out.html, /follow-up email/);
    assert.equal(out.eventCount, 2);
  });
});

describe("mergeStatusBlock", () => {
  it("replaces a prior same-day block instead of duplicating", () => {
    const synth = synthesizeForProject("ICHRA", "60588040", "2025-05-01", [ev({})]);
    const existing = `<p>old page body</p>${synth.html}<p>more body</p>`;
    const merged = mergeStatusBlock(existing, synth);
    // The new block should appear exactly once.
    const matches = merged.match(/Status Update — 2025-05-01/g) ?? [];
    assert.equal(matches.length, 1, `expected 1 occurrence, got ${matches.length}`);
    // Body content survives.
    assert.match(merged, /old page body/);
    assert.match(merged, /more body/);
  });
});
