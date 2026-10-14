// Opt-in live evaluation with bundled synthetic inputs only. No customer input.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");

const repo = path.resolve(__dirname, "../..");
const casesPath = path.join(__dirname, "synthetic-cases.json");

function safeError(error) {
  const identifier = (value) =>
    typeof value === "string" && /^[a-zA-Z0-9_]{1,60}$/.test(value)
      ? value
      : undefined;
  // Never include message, response body, stack, headers, URLs, or credentials.
  return {
    name: identifier(error?.name) || "Error",
    status: typeof error?.status === "number" ? error.status : undefined,
    code: identifier(error?.code),
    type: identifier(error?.type),
    causeCode: identifier(error?.cause?.code),
  };
}

function revision() {
  try {
    return {
      commit: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repo,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
      dirty: Boolean(
        execFileSync("git", ["status", "--porcelain"], {
          cwd: repo,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim(),
      ),
    };
  } catch {
    return { commit: "unavailable", dirty: null };
  }
}

function sourceFingerprint() {
  const files = [
    "apps/api/src/prompts/system.ts",
    "apps/api/src/prompts/response-modes.ts",
    "apps/api/src/prompts/counselor-types.ts",
    "apps/api/src/client/openai/openai.agent.ts",
    "apps/api/src/app/ephemeral/ephemeral.service.ts",
    "apps/api/src/controller/ephemeral/ephemeral.request.ts",
  ];
  return Object.fromEntries(
    files.map((file) => [
      file,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(repo, file)))
        .digest("hex"),
    ]),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const cases = JSON.parse(fs.readFileSync(casesPath, "utf8"));
  const invalid = args.some(
    (arg) =>
      arg !== "--run" &&
      arg !== "--help" &&
      !/^--label=[a-zA-Z0-9_-]{1,40}$/.test(arg),
  );
  if (invalid) {
    console.error(
      "지원 인자: --run, --label=이름, --help. 사용자 입력·외부 파일은 받지 않습니다.",
    );
    process.exitCode = 1;
    return;
  }
  if (!args.includes("--run") || args.includes("--help")) {
    console.log(
      `합성 ${cases.length}사례 실모델 평가입니다. 현재는 호출하지 않습니다.\n실행: node scripts/quality/evaluate.cjs --run --label=after\n8사례에서 최대 16회 유료 모델 호출이 발생합니다. 결과: _workspace/quality/\n평가기준: docs/counseling-quality.md`,
    );
    return;
  }

  const requireFromRepo = createRequire(path.join(repo, "package.json"));
  const envPath = path.join(repo, "apps/api/.env");
  const local = fs.existsSync(envPath)
    ? requireFromRepo("dotenv").parse(fs.readFileSync(envPath))
    : {};
  const key = process.env.OPENAI_API_KEY || local.OPENAI_API_KEY;
  if (!key) {
    console.error(
      "OPENAI_API_KEY가 없어 평가하지 않았습니다. 환경변수 또는 apps/api/.env에 설정하세요.",
    );
    process.exitCode = 1;
    return;
  }

  requireFromRepo("ts-node").register({
    transpileOnly: true,
    project: path.join(repo, "apps/api/tsconfig.json"),
  });
  const { ConfigService } = requireFromRepo("@nestjs/config");
  const { OpenAIAgent } = require(
    path.join(repo, "apps/api/src/client/openai/openai.agent.ts"),
  );
  const { EphemeralService } = require(
    path.join(repo, "apps/api/src/app/ephemeral/ephemeral.service.ts"),
  );
  const { EphemeralRequestSchema } = require(
    path.join(repo, "apps/api/src/controller/ephemeral/ephemeral.request.ts"),
  );
  const { PROMPT_CONFIG } = require(
    path.join(repo, "apps/api/src/prompts/system.ts"),
  );
  // Validate every bundled fixture before the first paid request.
  const inputs = cases.map((scenario) => ({
    ...scenario,
    parsed: EphemeralRequestSchema.parse(scenario.request),
  }));
  const agent = new OpenAIAgent(new ConfigService({ OPENAI_API_KEY: key }));
  const service = new EphemeralService(agent, {
    getContext() {
      throw new Error("Synthetic fixtures do not load character data");
    },
  });
  const label =
    args.find((arg) => arg.startsWith("--label="))?.slice("--label=".length) ||
    "evaluation";
  const report = {
    label,
    timestamp: new Date().toISOString(),
    syntheticOnly: true,
    ...revision(),
    sourceFingerprint: sourceFingerprint(),
    fixturesSha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(casesPath))
      .digest("hex"),
    models: PROMPT_CONFIG.MODELS,
    reasoningEffort: PROMPT_CONFIG.REASONING_EFFORT,
    maxOutputTokens: PROMPT_CONFIG.MAX_OUTPUT_TOKENS,
    limitations:
      "각 사례 1회 생성. 길이·구조 지표는 품질 점수가 아닙니다. HTTP 인증·예산·운영 배포·안전 회귀 전체를 검증하지 않습니다.",
    cases: [],
  };
  const outputDirectory = path.join(repo, "_workspace/quality");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const output = path.join(
    outputDirectory,
    `${label}-${report.timestamp.replace(/[:.]/g, "-")}.json`,
  );
  const save = () =>
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  let active;
  const create = agent.openai.chat.completions.create.bind(
    agent.openai.chat.completions,
  );
  agent.openai.chat.completions.create = async (...callArgs) => {
    const request = callArgs[0];
    if (request.store !== false)
      throw new Error("Evaluation requires store false");
    const call = {
      model: request.model,
      reasoningEffort: request.reasoning_effort,
      inputCharacters: request.messages.reduce(
        (sum, item) => sum + String(item.content).length,
        0,
      ),
      maxCompletionTokens: request.max_completion_tokens,
      store: request.store,
    };
    active.providerCalls.push(call);
    const started = Date.now();
    try {
      const result = await create(...callArgs);
      call.durationMs = Date.now() - started;
      call.responseModel = result.model;
      call.usage = result.usage;
      call.finishReason = result.choices?.[0]?.finish_reason;
      call.output = result.choices?.[0]?.message?.content;
      return result;
    } catch (error) {
      call.durationMs = Date.now() - started;
      call.error = safeError(error);
      throw error;
    }
  };

  for (const scenario of inputs) {
    active = {
      id: scenario.id,
      review: scenario.review,
      input: scenario.request,
      effectiveMode: scenario.parsed.mode,
      effectiveStyle: scenario.parsed.style,
      providerCalls: [],
    };
    report.cases.push(active);
    const started = Date.now();
    try {
      active.result = await service.respond(scenario.parsed);
      active.metrics = {
        elapsedMs: Date.now() - started,
        replyCharacters: active.result.reply.length,
        paragraphCount: active.result.reply.split(/\n\s*\n/).filter(Boolean)
          .length,
        boldMarkerCount: (active.result.reply.match(/\*\*/g) || []).length,
        optionsCount: active.result.options.length,
        optionQuestionMarks: active.result.options.filter((option) =>
          /[?？]/.test(option),
        ).length,
        replyEqualsFirstProviderOutput:
          active.result.reply ===
          active.providerCalls[0]?.output?.trim().slice(0, 2000),
      };
      const providerFailed = active.providerCalls.some((call) => call.error);
      console.log(
        `${scenario.id}: ${providerFailed ? "모델 일부 실패" : "생성 완료"} / ${active.metrics.replyCharacters}자 / ${active.metrics.paragraphCount}문단 / 수동 검토 필요`,
      );
      save();
      if (providerFailed) {
        report.blocker =
          "모델 오류가 발생해 추가 유료 호출을 중단했습니다. 오류 본문은 저장하지 않았습니다.";
        process.exitCode = 1;
        break;
      }
    } catch (error) {
      active.error = safeError(error);
      report.blocker =
        "평가 실패로 추가 유료 호출을 중단했습니다. 오류 본문은 저장하지 않았습니다.";
      process.exitCode = 1;
      break;
    }
  }
  save();
  console.log(
    `합성 결과: ${path.relative(repo, output)}\n생성 완료는 품질 통과를 뜻하지 않습니다. docs/counseling-quality.md에 따라 원문을 검토하세요.`,
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ evaluationError: safeError(error) }));
  process.exitCode = 1;
});
