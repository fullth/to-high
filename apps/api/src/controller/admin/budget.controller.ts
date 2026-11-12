import { Body, Controller, Get, Header, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { BudgetAdminService } from '../../app/admin/budget-admin.service';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';

const TopupSchema = z.object({
  amountWon: z.literal(10_000),
  operationId: z.string().regex(/^[a-f0-9]{32}$/),
}).strict();
type RequestUser = { user: { userId: string } };

@Controller('admin/budget')
@UseGuards(AuthGuard('jwt'))
export class BudgetController {
  constructor(private readonly admin: BudgetAdminService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  status(@Req() request: RequestUser) {
    return this.admin.status(request.user?.userId);
  }

  @Post('topups')
  @Header('Cache-Control', 'no-store')
  topup(@Req() request: RequestUser, @Body(new ZodValidationPipe(TopupSchema)) body: z.infer<typeof TopupSchema>) {
    return this.admin.topup(request.user?.userId, body.operationId);
  }
}
