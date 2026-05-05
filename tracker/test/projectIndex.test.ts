import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDirectoryText } from "../src/directory/parseDirectory.ts";
import { ProjectMatcher, normalize, tokenize } from "../src/directory/projectIndex.ts";

const FIXTURE = `
ICHRA Carrier Onboarding — https://carynhealth.atlassian.net/wiki/spaces/ICHRA/pages/60588040 (aka ICHRA Onboarding; Carrier Onboarding)
Product Management Standard Artifacts 2025 — https://carynhealth.atlassian.net/wiki/spaces/PMSA2/pages/67764229 (aka PMSA)
CarynHealth Change Management — https://carynhealth.atlassian.net/wiki/spaces/CHM/pages/31129603 (aka CHM)
IT Support Runbook — https://carynhealth.atlassian.net/wiki/spaces/IS/pages/67191
`;

describe("parseDirectoryText", () => {
  it("extracts titles, page ids, space keys, and aliases", () => {
    const entries = parseDirectoryText(FIXTURE);
    assert.equal(entries.length, 4);
    const ichra = entries[0]!;
    assert.equal(ichra.title, "ICHRA Carrier Onboarding");
    assert.equal(ichra.pageId, "60588040");
    assert.equal(ichra.spaceKey, "ICHRA");
    assert.deepEqual(ichra.aliases, ["ICHRA Onboarding", "Carrier Onboarding"]);

    const itSupport = entries[3]!;
    assert.equal(itSupport.title, "IT Support Runbook");
    assert.equal(itSupport.pageId, "67191");
    assert.equal(itSupport.aliases.length, 0);
  });
});

describe("ProjectMatcher", () => {
  const entries = parseDirectoryText(FIXTURE);
  const matcher = new ProjectMatcher({ builtAt: "", source: "", entries });

  it("matches noisy meeting titles via token overlap", () => {
    const m = matcher.match("Re: ICHRA Carrier Onboarding — weekly sync 2025-05-01");
    assert.ok(m, "expected a match");
    assert.equal(m!.entry.pageId, "60588040");
  });

  it("matches via alias", () => {
    const m = matcher.match("PMSA review with leadership");
    assert.ok(m, "expected a match");
    assert.equal(m!.entry.pageId, "67764229");
  });

  it("matches initialism / fuzzy form", () => {
    const m = matcher.match("CHM steering committee notes");
    assert.ok(m, "expected a match");
    assert.equal(m!.entry.pageId, "31129603");
  });

  it("returns null when nothing is similar", () => {
    const m = matcher.match("Friday lunch order: tacos");
    assert.equal(m, null);
  });
});

describe("normalize / tokenize", () => {
  it("strips dates, punctuation, and stopwords", () => {
    assert.equal(normalize("Re: ICHRA Sync — 2025-05-01"), "re ichra sync");
    assert.deepEqual(tokenize("Re: ICHRA weekly sync 2025-05-01"), ["ichra"]);
  });
});
