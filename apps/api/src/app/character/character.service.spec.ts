import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CharacterService } from './character.service';
import { ApprovedMemory } from '../../database/character.schema';
import { CharacterRepository } from '../../persistence/character/character.repository';

describe('CharacterService approved memories', () => {
  const owner = new Types.ObjectId().toHexString(),
    id = new Types.ObjectId();
  const repository = {
    get: jest.fn(),
    rename: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    replaceMemories: jest.fn(),
  };
  const service = new CharacterService(
    repository as unknown as CharacterRepository,
  );
  const character = () => ({
    _id: id,
    displayName: '차분한 친구',
    style: 'F',
    memories: [],
    revision: 0,
  });
  beforeEach(() => jest.resetAllMocks());
  it('requires login and never accepts an anonymous owner', async () => {
    await expect(service.list('anonymous')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repository.list).not.toHaveBeenCalled();
  });
  it('filters every lookup by authenticated owner and omits internal fields', async () => {
    repository.get.mockResolvedValue(character());
    expect(await service.get(owner, id.toHexString())).toEqual({
      id: id.toHexString(),
      displayName: '차분한 친구',
      style: 'F',
      memories: [],
    });
    expect(repository.get).toHaveBeenCalledWith(new Types.ObjectId(owner), id);
  });
  it('hides foreign or missing characters', async () => {
    repository.get.mockResolvedValue(null);
    await expect(service.get(owner, id.toHexString())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('rejects unapproved and oversized memory before any database operation', () => {
    expect(() =>
      service.addMemory(owner, id.toHexString(), {
        kind: 'topic',
        text: '직장',
        approved: false,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.addMemory(owner, id.toHexString(), {
        kind: 'topic',
        text: '가'.repeat(201),
        approved: true,
      }),
    ).toThrow(BadRequestException);
    expect(repository.get).not.toHaveBeenCalled();
  });
  it('stores only explicit selected text with approval provenance and CAS revision', async () => {
    repository.get.mockResolvedValue(character());
    repository.replaceMemories.mockImplementation(
      (
        _owner: Types.ObjectId,
        _id: Types.ObjectId,
        revision: number,
        memories: ApprovedMemory[],
      ) =>
        Promise.resolve({ ...character(), revision: revision + 1, memories }),
    );
    const result = await service.addMemory(owner, id.toHexString(), {
      kind: 'style',
      text: ' 짧은 답변 ',
      approved: true,
    });
    expect(result.memories[0].text).toBe('짧은 답변');
    const call = repository.replaceMemories.mock.calls[0] as [
      Types.ObjectId,
      Types.ObjectId,
      number,
      ApprovedMemory[],
    ];
    expect(call[2]).toBe(0);
    expect(Object.keys(call[3][0]).sort()).toEqual([
      '_id',
      'approvedAt',
      'kind',
      'source',
      'text',
    ]);
    expect(call[3][0].source).toBe('userConfirmed');
  });
  it('rechecks limits after a concurrent update loses the CAS', async () => {
    const memories = Array.from({ length: 20 }, () => ({
      _id: new Types.ObjectId(),
      text: '짧게',
      kind: 'style',
      approvedAt: new Date(),
      source: 'userConfirmed',
    }));
    repository.get
      .mockResolvedValueOnce(character())
      .mockResolvedValueOnce({ ...character(), revision: 1, memories });
    repository.replaceMemories.mockResolvedValue(null);
    await expect(
      service.addMemory(owner, id.toHexString(), {
        kind: 'topic',
        text: '직장',
        approved: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.replaceMemories).toHaveBeenCalledTimes(1);
  });
  it('caps total memory text independently of entry count', async () => {
    repository.get.mockResolvedValue({
      ...character(),
      memories: Array.from({ length: 10 }, () => ({
        _id: new Types.ObjectId(),
        text: '가'.repeat(200),
        kind: 'topic',
        approvedAt: new Date(),
        source: 'userConfirmed',
      })),
    });
    await expect(
      service.addMemory(owner, id.toHexString(), {
        kind: 'topic',
        text: '가',
        approved: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.replaceMemories).not.toHaveBeenCalled();
  });
  it('maps one-character unique-owner conflict without exposing DB data', async () => {
    repository.create.mockRejectedValue({ code: 11000, sensitive: 'private' });
    await expect(
      service.create(owner, { displayName: '캐릭터', style: 'F' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('requires renewed approval to edit and deletes only the selected memory', async () => {
    const target = new Types.ObjectId(),
      kept = new Types.ObjectId();
    repository.get.mockResolvedValue({
      ...character(),
      memories: [target, kept].map((_id) => ({
        _id,
        kind: 'topic',
        text: '직장',
        approvedAt: new Date(),
        source: 'userConfirmed',
      })),
    });
    repository.replaceMemories.mockImplementation(
      (
        _owner: Types.ObjectId,
        _id: Types.ObjectId,
        _revision: number,
        memories: ApprovedMemory[],
      ) => Promise.resolve({ ...character(), memories }),
    );
    expect(() =>
      service.updateMemory(owner, id.toHexString(), target.toHexString(), {
        kind: 'topic',
        text: '학교',
      }),
    ).toThrow(BadRequestException);
    const result = await service.deleteMemory(
      owner,
      id.toHexString(),
      target.toHexString(),
    );
    expect(result.memories.map((m) => m.id)).toEqual([kept.toHexString()]);
  });
  it('renames with owner filter, retains style and memories', async () => {
    repository.rename.mockResolvedValue({
      ...character(),
      displayName: '새 이름',
    });
    const result = await service.rename(owner, id.toHexString(), {
      displayName: ' 새 이름 ',
    });
    expect(repository.rename).toHaveBeenCalledWith(
      new Types.ObjectId(owner),
      id,
      '새 이름',
    );
    expect(result).toEqual({
      id: id.toHexString(),
      displayName: '새 이름',
      style: 'F',
      memories: [],
    });
  });
  it('rejects a foreign rename', async () => {
    repository.rename.mockResolvedValue(null);
    await expect(
      service.rename(owner, id.toHexString(), { displayName: '이름' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it.each([
    '',
    '  ',
    '가'.repeat(41),
    '이름\n',
    '이\t름',
    '이름\u2028',
    '이름\u2029',
    '이름\u0000',
    '이름\u202e',
  ])('rejects invalid name %j for creation and rename', async (displayName) => {
    await expect(
      service.rename(owner, id.toHexString(), { displayName }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(owner, { displayName, style: 'F' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.rename).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('rejects extra fields in rename and creation', async () => {
    await expect(
      service.rename(owner, id.toHexString(), {
        displayName: '이름',
        memories: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(owner, {
        displayName: '이름',
        style: 'F',
        ownerId: 'foreign',
      } as { displayName: string; style: string }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('treats markup as plain text and includes owned displayName in context', async () => {
    const name = '<script>x</script>';
    repository.rename.mockResolvedValue({ ...character(), displayName: name });
    expect(
      (await service.rename(owner, id.toHexString(), { displayName: name }))
        .displayName,
    ).toBe(name);
    repository.get.mockResolvedValue({ ...character(), displayName: name });
    expect(await service.getContext(owner, id.toHexString())).toEqual({
      displayName: name,
      style: 'F',
      memories: [],
    });
  });
});
