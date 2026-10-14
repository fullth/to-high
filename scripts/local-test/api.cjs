// Dedicated loopback-only harness. Never import AppModule, .env or production instrumentation.
const net = require('node:net');
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = args[0];
  const options = Array.isArray(first) ? first[0] : first;
  const host = typeof options === 'object' && options ? options.host : typeof args[1] === 'string' ? args[1] : 'localhost';
  if (!['localhost', '127.0.0.1', '::1'].includes(host || 'localhost')) throw new Error('Local harness blocks outbound connections');
  return originalConnect.apply(this, args);
};
global.fetch = async () => { throw new Error('Local harness blocks provider fetch'); };
require('reflect-metadata');
const path = require('node:path');
const { Test } = require('@nestjs/testing');
const { Controller, Get, UnauthorizedException, ServiceUnavailableException } = require('@nestjs/common');
const { APP_GUARD } = require('@nestjs/core');
const { ThrottlerModule, ThrottlerGuard } = require('@nestjs/throttler');
const { json } = require('express');
const helmet = require('helmet').default || require('helmet');
const dist = path.resolve(__dirname, '../../apps/api/dist');
const { EphemeralController } = require(path.join(dist, 'controller/ephemeral/ephemeral.controller'));
const { EphemeralService } = require(path.join(dist, 'app/ephemeral/ephemeral.service'));
const { EphemeralBudgetService } = require(path.join(dist, 'common/ephemeral-budget.service'));
const { OptionalJwtAuthGuard } = require(path.join(dist, 'common/optional-jwt.guard'));
const { OpenAIAgent } = require(path.join(dist, 'client/openai/openai.agent'));
const { CharacterService } = require(path.join(dist, 'app/character/character.service'));
const { PrivacyExceptionFilter } = require(path.join(dist, 'common/privacy-exception.filter'));
class LocalController {
  health() { return { status: 'ok', mode: 'local-mock', database: 'disabled', externalModels: 'blocked' }; }
  me() { throw new UnauthorizedException('Local mock has no login accounts'); }
  login() { throw new ServiceUnavailableException('OAuth is disabled in local mock'); }
}
Controller()(LocalController);
for (const [route, method] of [['health', 'health'], ['auth/me', 'me'], ['auth/google', 'login'], ['auth/kakao', 'login']]) {
  Get(route)(LocalController.prototype, method, Object.getOwnPropertyDescriptor(LocalController.prototype, method));
}
function delay(signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('aborted'));
    const abort = () => { clearTimeout(timer); reject(new Error('aborted')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, 700);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
const mockAgent = {
  async generateResponse(context, _mode, text, _style, signal) {
    await delay(signal);
    if (text === '실패 테스트') throw new Error('Intentional local mock failure');
    const replies = ['말을 꺼내주셔서 고마워요. 지금 마음을 편한 만큼 이야기해 주세요.', '그랬군요. 가장 마음에 남는 부분부터 천천히 이야기해도 괜찮아요.', '지금은 잠시 쉬어가셔도 괜찮아요. 다음 이야기도 들어볼게요.'];
    return `[로컬 모의 응답] ${replies[Math.floor(context.length / 2) % replies.length]}`;
  },
  async generateReplyOptions() { return ['조금 더 이야기할게요', '지금은 쉬고 싶어요', '정리해주세요']; },
};
async function start() {
  const module = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
    controllers: [LocalController, EphemeralController],
    providers: [EphemeralService, EphemeralBudgetService,
      { provide: OpenAIAgent, useValue: mockAgent },
      { provide: CharacterService, useValue: { getContext: async () => { throw new UnauthorizedException(); } } },
      { provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).overrideGuard(OptionalJwtAuthGuard).useValue({ canActivate: () => true }).compile();
  const app = module.createNestApplication({ logger: false, bodyParser: false });
  app.use(json({ limit: '64kb' })); app.use(helmet());
  app.useGlobalFilters(new PrivacyExceptionFilter());
  app.enableCors({ origin: ['http://127.0.0.1:3102', 'http://localhost:3102'], credentials: true, methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','Accept','X-Guest-Token'] });
  await app.listen(3999, '127.0.0.1');
  console.log('Local mock API: http://127.0.0.1:3999 | DB disabled | external models blocked');
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
start().catch(() => { console.error('Local mock API could not start; no secrets or request bodies logged.'); process.exit(1); });
