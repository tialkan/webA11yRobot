#!/usr/bin/env node
import { auditSite } from "../src/audit.js";
import { reportToMarkdown } from "../src/report.js";

const target = process.argv[2];
if (!target) { console.error("Kullanım: weba11yrobot <site-adresi> [--json]"); process.exitCode = 2; }
else {
  try {
    const report = await auditSite(target);
    console.log(process.argv.includes("--json") ? JSON.stringify(report, null, 2) : reportToMarkdown(report));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
