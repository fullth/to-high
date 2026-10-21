// Live production check: bundled fictional fixtures only, at most 10 chat requests.
const fs = require("node:fs");
const path = require("node:path");
const API = "https://to-highapi-production.up.railway.app";
const WEB = "https://www.wirocare.com";
const fallback = ["직접 이야기할게요", "다른 이야기예요", "정리해주세요"];
const fixtures = require("./synthetic-cases.json");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = {
  syntheticOnly: true,
  revision: process.env.GITHUB_SHA || null,
  timestamp: new Date().toISOString(),
  cases: [],
};
const directory = path.resolve(__dirname, "../../_workspace/quality");
fs.mkdirSync(directory, { recursive: true });
const output = path.join(directory, "production-evaluation.json");
function save() {
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
}
function notice(title, data) {
  const text = JSON.stringify(data)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  console.log(`::notice title=${title}::${text}`);
}
async function get(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response;
}
async function waitForDeployment() {
  if (!report.revision)
    throw new Error("Expected production revision is required");
  for (let attempt = 0; attempt < 48; attempt++) {
    try {
      const health = await (await get(`${API}/health`)).json();
      if (health.status === "ok" && health.revision === report.revision) {
        report.apiRevision = health.revision;
        save();
        notice("API deployment verified", { revision: health.revision });
        return;
      }
    } catch {
      /* Only health checks are retried; no paid chat retries. */
    }
    console.log(`Waiting for API deployment (${attempt + 1}/48)`);
    if (attempt < 47) await delay(10000);
  }
  throw new Error("API deployment revision not confirmed");
}
async function waitForWeb() {
  for (let attempt = 0; attempt < 24; attempt++) {
    try {
      const html = await (await get(`${WEB}/talk`)).text();
      const assets = [
        ...new Set(
          [
            ...html.matchAll(
              /(?:src|href)="([^" ]+\.(?:js|css)(?:\?[^" ]*)?)"/g,
            ),
          ].map((m) => m[1]),
        ),
      ]
        .filter((asset) => asset.startsWith("/_next/static/"))
        .slice(0, 30);
      const contents = await Promise.all(
        assets.map(async (asset) => (await get(new URL(asset, WEB))).text()),
      );
      const all = contents.join("\n");
      if (
        all.includes(
          "(min-width: 768px) and (hover: hover) and (pointer: fine)",
        ) &&
        /\.ch-ephemeral\s+\.ch-input\s*\{[^}]*font-size:\s*16px/.test(all)
      ) {
        report.webFixVerified = true;
        save();
        notice("Web deployment verified", {
          mobileFocusGuard: true,
          composerFontSize: 16,
        });
        return;
      }
    } catch {
      /* Wait for the newly deployed public assets. */
    }
    console.log(`Waiting for web deployment (${attempt + 1}/24)`);
    if (attempt < 23) await delay(10000);
  }
  throw new Error("Mobile web fix not found in production assets");
}
let calls = 0;
async function runCase(id, request, review) {
  if (++calls > 10) throw new Error("Synthetic request budget exceeded");
  const started = Date.now();
  const response = await fetch(`${API}/ephemeral/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Chat_HTTP_${response.status}`);
  const result = await response.json();
  if (
    typeof result.reply !== "string" ||
    !result.reply.trim() ||
    !Array.isArray(result.options) ||
    !result.options.length ||
    !result.options.every((o) => typeof o === "string")
  )
    throw new Error("Invalid chat result");
  const item = {
    id,
    review,
    request,
    result: { reply: result.reply, options: result.options },
    durationMs: Date.now() - started,
    genericFallback:
      JSON.stringify(result.options) === JSON.stringify(fallback),
    duplicateOptions: new Set(result.options).size !== result.options.length,
  };
  report.cases.push(item);
  save();
  notice(`Synthetic case ${id}`, item);
  return item;
}
async function main() {
  if (!process.argv.includes("--run")) {
    console.log(
      "Opt-in production evaluation: --run, synthetic fixtures only, max 10 requests / 20 model calls.",
    );
    return;
  }
  await waitForDeployment();
  await waitForWeb();
  for (const fixture of fixtures)
    await runCase(fixture.id, fixture.request, fixture.review);
  const start = report.cases.find((item) => item.id === "default_lonely");
  if (!start.genericFallback) {
    let messages = [
      ...start.request.messages,
      { role: "assistant", content: start.result.reply },
    ];
    let previous = start;
    for (let turn = 1; turn <= 2; turn++) {
      const selected = previous.result.options.find(
        (option) => !fallback.includes(option),
      );
      if (!selected) break;
      messages.push({ role: "user", content: selected });
      previous = await runCase(
        `choice_followup_${turn}`,
        { messages },
        "실제로 받은 선택지에 답한 뒤 같은 질문·선택지로 돌아가는지",
      );
      messages.push({ role: "assistant", content: previous.result.reply });
    }
  }
  report.summary = {
    requests: calls,
    genericFallbacks: report.cases.filter((c) => c.genericFallback).length,
    duplicateSets: report.cases.filter((c) => c.duplicateOptions).length,
  };
  save();
  notice("Synthetic evaluation summary", report.summary);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      "# 합성 대화 점검\n\n" +
        JSON.stringify(report.summary) +
        "\n\n기계적 점검 결과이며, 상담 품질은 실제 응답을 읽고 검토해야 합니다.\n",
    );
}
main().catch((error) => {
  const reason = /^[A-Za-z0-9_ ]{1,100}$/.test(error.message || "")
    ? error.message
    : error.name;
  report.blocker = reason;
  save();
  console.log(`::error title=Production evaluation blocked::${reason}`);
  process.exitCode = 1;
});
