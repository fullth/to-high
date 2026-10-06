import { CanActivate, GoneException, Injectable } from '@nestjs/common';

/** Retained data is untouched; saved-session routes cannot serve the new product. */
@Injectable()
export class LegacyChatDisabledGuard implements CanActivate {
  canActivate(): boolean {
    // Only isolated regression fixtures may exercise legacy ownership protections.
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.TO_HIGH_ENABLE_LEGACY_TEST_ROUTES === '1'
    )
      return true;
    throw new GoneException(
      '기록을 저장하는 이전 상담 기능은 제공하지 않습니다. 새 상담을 시작해 주세요.',
    );
  }
}
