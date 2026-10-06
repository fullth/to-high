import { randomUUID } from 'node:crypto';
import mongoose, { Connection, Model, Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CharacterDocument,
  CharacterSchema,
} from '../src/database/character.schema';
import { CharacterRepository } from '../src/persistence/character/character.repository';
import { CharacterService } from '../src/app/character/character.service';
const run = process.env.TO_HIGH_ISOLATED_DB === '1' ? describe : describe.skip;
const database = `codex_to_high_test_${randomUUID().replace(/-/g, '')}`;
run('isolated actual MongoDB approved character memory', () => {
  let connection: Connection;
  let model: Model<CharacterDocument>;
  let service: CharacterService;
  beforeAll(async () => {
    const port = Number(process.env.TO_HIGH_TEST_MONGO_PORT);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error('Isolated loopback test port required');
    connection = await mongoose
      .createConnection(`mongodb://127.0.0.1:${port}/${database}`, {
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise();
    model = connection.model(CharacterDocument.name, CharacterSchema);
    await model.init();
    service = new CharacterService(new CharacterRepository(model));
  });
  afterAll(async () => {
    if (connection) {
      if (
        connection.name !== database ||
        !database.startsWith('codex_to_high_test_')
      )
        throw new Error('Refusing unexpected database cleanup');
      await connection.dropDatabase();
      await connection.close();
    }
  });
  it('enforces one owned character under concurrent creates', async () => {
    const owner = new Types.ObjectId().toHexString();
    const results = await Promise.allSettled([
      service.create(owner, { displayName: 'A', style: 'F' }),
      service.create(owner, { displayName: 'B', style: 'T' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected');
    expect(
      failed?.status === 'rejected' &&
        failed.reason instanceof ConflictException,
    ).toBe(true);
    expect(await model.countDocuments({ ownerId: new Types.ObjectId(owner) })).toBe(1);
  });
  it('prevents concurrent memory additions bypassing 20-item and 2000-character limits', async () => {
    const owner = new Types.ObjectId().toHexString();
    const character = await service.create(owner, {
      displayName: 'A',
      style: 'F',
    });
    for (let i = 0; i < 19; i++)
      await service.addMemory(owner, character.id, {
        kind: 'topic',
        text: '가'.repeat(100),
        approved: true,
      });
    const results = await Promise.allSettled([
      service.addMemory(owner, character.id, {
        kind: 'style',
        text: '나'.repeat(100),
        approved: true,
      }),
      service.addMemory(owner, character.id, {
        kind: 'style',
        text: '다'.repeat(100),
        approved: true,
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected');
    expect(
      failed?.status === 'rejected' &&
        failed.reason instanceof BadRequestException,
    ).toBe(true);
    const stored = await model.findById(character.id).lean();
    expect(stored?.memories).toHaveLength(20);
    expect(stored?.memoryChars).toBe(2000);
    expect(stored).not.toHaveProperty('context');
    expect(stored).not.toHaveProperty('sessionId');
  });
  it('denies foreign access and requires approval again for edited memory', async () => {
    const owner = new Types.ObjectId().toHexString(),
      foreign = new Types.ObjectId().toHexString();
    const c = await service.create(owner, { displayName: 'A', style: 'F' });
    await expect(service.getContext(foreign, c.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(() =>
      service.addMemory(owner, c.id, {
        kind: 'topic',
        text: '자동추출',
        approved: false,
      }),
    ).toThrow(BadRequestException);
    const added = await service.addMemory(owner, c.id, {
      kind: 'topic',
      text: '직장',
      approved: true,
    });
    await expect(
      service.deleteMemory(foreign, c.id, added.memories[0].id),
    ).rejects.toBeInstanceOf(NotFoundException);
    const edited = await service.updateMemory(
      owner,
      c.id,
      added.memories[0].id,
      { kind: 'topic', text: '학교', approved: true },
    );
    expect(edited.memories[0].text).toBe('학교');
    expect(
      (await service.deleteMemory(owner, c.id, edited.memories[0].id)).memories,
    ).toEqual([]);
    expect(await service.delete(owner, c.id)).toEqual({ deleted: true });
    expect(await model.findById(c.id)).toBeNull();
  });
});
