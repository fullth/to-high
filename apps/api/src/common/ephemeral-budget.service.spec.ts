import { EphemeralBudgetService } from './ephemeral-budget.service';

describe('body-free ephemeral budget', () => {
  const originalLimit = process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT;
  const originalEnvironment = process.env.NODE_ENV;
  afterEach(() => {
    if (originalLimit === undefined)
      delete process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT;
    else process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT = originalLimit;
    process.env.NODE_ENV = originalEnvironment;
  });
  it('allows one in-flight request per identity and releases once', () => {
    process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT = '10';
    const budget = new EphemeralBudgetService();
    const release = budget.acquireOwner('account', '127.0.0.1');
    expect(() => budget.acquireOwner('account', '127.0.0.2')).toThrow();
    const other = budget.acquireOwner('other', '127.0.0.1');
    release();
    release();
    expect(() => budget.acquireOwner('account', '127.0.0.1')).not.toThrow();
    other();
  });
  it('does not trust a browser reset to replenish reserved daily quota', () => {
    process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT = '1';
    const budget = new EphemeralBudgetService();
    budget.acquireOwner(undefined, '127.0.0.1')();
    expect(() => budget.acquireOwner(undefined, '127.0.0.2')).toThrow();
  });
  it('fails closed in production without a reviewed limit', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT;
    expect(() =>
      new EphemeralBudgetService().acquireOwner(undefined, '127.0.0.1'),
    ).toThrow('설정');
  });
  it.each(['0', '-1', 'NaN', '1.5', '100001'])(
    'rejects invalid configured limit %s',
    (limit) => {
      process.env.TO_HIGH_LLM_DAILY_REQUEST_LIMIT = limit;
      expect(() =>
        new EphemeralBudgetService().acquireOwner(undefined, '127.0.0.1'),
      ).toThrow('설정');
    },
  );
});
