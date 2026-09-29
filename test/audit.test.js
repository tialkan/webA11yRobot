import test from "node:test";
import assert from "node:assert/strict";
import { inspectHtml } from "../src/audit.js";
import { isPrivateIp, normalizeTarget } from "../src/net.js";
import { buildFixPrompt, reportToMarkdown } from "../src/report.js";

test("reports provable static defects with page evidence", () => {
  const result = inspectHtml('<html><head></head><body><img src="x.png"><button></button><form><input placeholder="Name"></form><iframe src="/frame"></iframe></body></html>', "https://example.com/");
  const codes = result.findings.map((item) => item.kod);
  for (const code of ["HTML-LANG-MISSING", "TITLE-MISSING", "IMAGE-ALT-MISSING", "BUTTON-NAME-MISSING", "FIELD-LABEL-MISSING", "IFRAME-TITLE-MISSING"]) assert.ok(codes.includes(code));
  assert.ok(result.tasks.some((item) => item.kod === "FORMS"));
  assert.ok(result.tasks.some((item) => item.kod === "KEYBOARD"));
});

test("does not confuse decorative alt or associated labels with missing names", () => {
  const result = inspectHtml('<html lang="tr"><title>Örnek</title><body><img alt="" src="x"><label for="email">E-posta</label><input id="email"><button aria-label="Kapat"><svg></svg></button></body></html>', "https://example.com/");
  assert.equal(result.findings.length, 0);
  assert.ok(result.tasks.some((item) => item.kod === "SCREEN-READER"));
});

test("blocks private and unsupported targets", () => {
  assert.equal(isPrivateIp("127.0.0.1"), true);
  assert.equal(isPrivateIp("192.168.1.1"), true);
  assert.equal(isPrivateIp("8.8.8.8"), false);
  assert.throws(() => normalizeTarget("file:///etc/passwd"));
  assert.throws(() => normalizeTarget("https://example.com:8080"));
});

test("report and fix prompt preserve human verification boundary", () => {
  const report = { hedef: { girilen: "https://example.com/" }, ozet: { incelenenSayfa: 1, bulgu: 0, manuelGorev: 1 }, bulgular: [], manuelTestler: [{ kod: "KEYBOARD", sayfa: "https://example.com/", baslik: "Klavye", adimlar: ["Tab ile gezin"] }], sinirlar: ["Sertifika değildir."] };
  assert.match(reportToMarkdown(report), /\[ \] Tab ile gezin/);
  assert.match(buildFixPrompt(report), /manuel görevleri otomatik olarak geçti sayma/);
});
