import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApprovedMemory, MemoryKind } from '../../database/character.schema';
import { CharacterRepository } from '../../persistence/character/character.repository';
import type { CounselorType } from '../../types/session';

const nameSchema = z
  .string()
  .refine((v) => !/[\p{Cc}\p{Cf}\u2028\u2029]/u.test(v))
  .trim()
  .min(1)
  .max(40);
const createSchema = z
  .object({
    displayName: nameSchema,
    style: z.enum(['T', 'F', 'reaction', 'listening']),
  })
  .strict();
const renameSchema = z.object({ displayName: nameSchema }).strict();
@Injectable()
export class CharacterService {
  constructor(private readonly repository: CharacterRepository) {}
  private owner(userId: string) {
    if (!Types.ObjectId.isValid(userId))
      throw new UnauthorizedException('로그인이 필요합니다.');
    return new Types.ObjectId(userId);
  }
  private id(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('캐릭터를 찾을 수 없습니다.');
    return new Types.ObjectId(id);
  }
  private text(value: unknown, max: number) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
      throw new BadRequestException('입력 길이를 확인해주세요.');
    return value.trim();
  }
  private view(character: {
    _id: Types.ObjectId;
    displayName: string;
    style: CounselorType;
    memories: ApprovedMemory[];
  }) {
    return {
      id: character._id.toString(),
      displayName: character.displayName,
      style: character.style,
      memories: character.memories.map((m) => ({
        id: m._id.toString(),
        kind: m.kind,
        text: m.text,
        approvedAt: m.approvedAt,
      })),
    };
  }
  async list(userId: string) {
    return (await this.repository.list(this.owner(userId))).map((c) =>
      this.view(c),
    );
  }
  async get(userId: string, id: string) {
    const c = await this.repository.get(this.owner(userId), this.id(id));
    if (!c) throw new NotFoundException('캐릭터를 찾을 수 없습니다.');
    return this.view(c);
  }
  async create(
    userId: string,
    body: { displayName?: unknown; style?: unknown },
  ) {
    const ownerId = this.owner(userId);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        '이름은 줄바꿈 없이 1~40자, 말투는 지정된 값으로 입력해주세요.',
      );
    const { displayName, style } = parsed.data;
    try {
      return this.view(
        await this.repository.create(ownerId, displayName, style),
      );
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      )
        throw new ConflictException('캐릭터는 한 개까지 만들 수 있습니다.');
      throw error;
    }
  }
  async rename(userId: string, id: string, body: unknown) {
    const ownerId = this.owner(userId),
      characterId = this.id(id);
    const parsed = renameSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        '이름만 줄바꿈 없이 1~40자로 입력해주세요.',
      );
    const renamed = await this.repository.rename(
      ownerId,
      characterId,
      parsed.data.displayName,
    );
    if (!renamed) throw new NotFoundException('캐릭터를 찾을 수 없습니다.');
    return this.view(renamed);
  }
  async delete(userId: string, id: string) {
    if (!(await this.repository.delete(this.owner(userId), this.id(id))))
      throw new NotFoundException('캐릭터를 찾을 수 없습니다.');
    return { deleted: true };
  }
  private memory(
    body: { kind?: unknown; text?: unknown; approved?: unknown },
    id = new Types.ObjectId(),
  ): ApprovedMemory {
    if (body?.approved !== true)
      throw new BadRequestException('확인한 기억만 저장할 수 있습니다.');
    if (!['style', 'topic', 'helpfulApproach'].includes(String(body.kind)))
      throw new BadRequestException('기억 종류를 확인해주세요.');
    return {
      _id: id,
      kind: body.kind as MemoryKind,
      text: this.text(body.text, 200),
      approvedAt: new Date(),
      source: 'userConfirmed',
    };
  }
  private async edit(
    userId: string,
    id: string,
    change: (memories: ApprovedMemory[]) => ApprovedMemory[],
  ) {
    const ownerId = this.owner(userId),
      characterId = this.id(id);
    for (let attempt = 0; attempt < 3; attempt++) {
      const c = await this.repository.get(ownerId, characterId);
      if (!c) throw new NotFoundException('캐릭터를 찾을 수 없습니다.');
      const memories = change(Array.from(c.memories));
      if (
        memories.length > 20 ||
        memories.reduce((n, m) => n + m.text.length, 0) > 2000
      )
        throw new BadRequestException(
          '기억은 20개, 총 2000자까지 저장할 수 있습니다.',
        );
      const saved = await this.repository.replaceMemories(
        ownerId,
        characterId,
        c.revision,
        memories,
      );
      if (saved) return this.view(saved);
    }
    throw new ConflictException(
      '다른 변경이 진행 중입니다. 다시 시도해주세요.',
    );
  }
  addMemory(
    userId: string,
    id: string,
    body: { kind?: unknown; text?: unknown; approved?: unknown },
  ) {
    const memory = this.memory(body);
    return this.edit(userId, id, (memories) => [...memories, memory]);
  }
  updateMemory(
    userId: string,
    id: string,
    memoryId: string,
    body: { kind?: unknown; text?: unknown; approved?: unknown },
  ) {
    const updated = this.memory(body, this.id(memoryId));
    return this.edit(userId, id, (memories) => {
      if (!memories.some((m) => m._id.equals(updated._id)))
        throw new NotFoundException('기억을 찾을 수 없습니다.');
      return memories.map((m) => (m._id.equals(updated._id) ? updated : m));
    });
  }
  deleteMemory(userId: string, id: string, memoryId: string) {
    const target = this.id(memoryId);
    return this.edit(userId, id, (memories) => {
      if (!memories.some((m) => m._id.equals(target)))
        throw new NotFoundException('기억을 찾을 수 없습니다.');
      return memories.filter((m) => !m._id.equals(target));
    });
  }
  async getContext(userId: string, id: string) {
    const c = await this.get(userId, id);
    return {
      displayName: c.displayName,
      style: c.style,
      memories: c.memories.map((m) => ({ kind: m.kind, text: m.text })),
    };
  }
}
