import { GoneException } from '@nestjs/common';
import { LegacyChatDisabledGuard } from './legacy-chat-disabled.guard';

describe('Legacy chat release block', () => {
  it('blocks production even when the isolated test flag exists', () => {
    const oldMode = process.env.NODE_ENV;
    const oldFlag = process.env.TO_HIGH_ENABLE_LEGACY_TEST_ROUTES;
    try {
      process.env.NODE_ENV = 'production';
      process.env.TO_HIGH_ENABLE_LEGACY_TEST_ROUTES = '1';
      expect(() => new LegacyChatDisabledGuard().canActivate()).toThrow(
        GoneException,
      );
    } finally {
      if (oldMode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldMode;
      if (oldFlag === undefined)
        delete process.env.TO_HIGH_ENABLE_LEGACY_TEST_ROUTES;
      else process.env.TO_HIGH_ENABLE_LEGACY_TEST_ROUTES = oldFlag;
    }
  });
});
