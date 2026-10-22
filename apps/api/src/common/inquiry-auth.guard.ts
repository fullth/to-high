import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';

// No credentials means guest access; invalid supplied credentials must not become a guest.
@Injectable()
export class InquiryAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (!req.headers.authorization) {
      req.user = null;
      return true;
    }
    return super.canActivate(context);
  }
}
