import { Body, Controller, Delete, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { SavedSessionsService } from '../../app/saved-sessions/saved-sessions.service';

const id = z.string().regex(/^[a-f0-9]{32}$/);
const saveSchema = z.object({
  id,
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) }).strict()).min(1).max(200),
}).strict().refine((value) => value.messages.reduce((total, item) => total + item.content.length, 0) <= 100_000);
type SaveRequest = z.infer<typeof saveSchema>;
type AuthRequest = { user: { userId: string } };

@Controller('saved-sessions')
@UseGuards(AuthGuard('jwt'))
export class SavedSessionsController {
  constructor(private readonly sessions: SavedSessionsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() request: AuthRequest) { return this.sessions.list(request.user.userId); }

  @Post()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  save(@Req() request: AuthRequest, @Body(new ZodValidationPipe(saveSchema)) body: SaveRequest) {
    return this.sessions.save(request.user.userId, body);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Req() request: AuthRequest, @Param('id', new ZodValidationPipe(id)) sessionId: string) {
    return this.sessions.get(request.user.userId, sessionId);
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  delete(@Req() request: AuthRequest, @Param('id', new ZodValidationPipe(id)) sessionId: string) {
    return this.sessions.delete(request.user.userId, sessionId);
  }
}
