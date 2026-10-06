import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CharacterService } from '../../app/character/character.service';
import { JwtAuthGuard } from '../../common/jwt.guard';
import type { Request } from 'express';
type AuthRequest = Request & { user: { userId: string } };
type MemoryBody = { kind?: unknown; text?: unknown; approved?: unknown };
@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharacterController {
  constructor(private readonly service: CharacterService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() req: AuthRequest) {
    return this.service.list(req.user.userId);
  }
  @Post() create(
    @Req() req: AuthRequest,
    @Body() body: { displayName?: unknown; style?: unknown },
  ) {
    return this.service.create(req.user.userId, body);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.get(req.user.userId, id);
  }
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  rename(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.rename(req.user.userId, id, body);
  }
  @Delete(':id') delete(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.delete(req.user.userId, id);
  }
  @Post(':id/memories') add(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: MemoryBody,
  ) {
    return this.service.addMemory(req.user.userId, id, body);
  }
  @Patch(':id/memories/:memoryId') update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('memoryId') memoryId: string,
    @Body() body: MemoryBody,
  ) {
    return this.service.updateMemory(req.user.userId, id, memoryId, body);
  }
  @Delete(':id/memories/:memoryId') remove(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('memoryId') memoryId: string,
  ) {
    return this.service.deleteMemory(req.user.userId, id, memoryId);
  }
}
