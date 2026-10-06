/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { createHash } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { SessionRepository } from './session.repository';
const id = '507f1f77bcf86cd799439011';
const owner = '507f1f77bcf86cd799439012';
const token = 'a'.repeat(64);
const hash = createHash('sha256').update(token).digest('hex');
type Request = NonNullable<ConstructorParameters<typeof SessionRepository>[1]>;
const make = (request: Request = { headers: { 'x-guest-token': token } }) => {
  const model = {
    findOne: jest.fn().mockResolvedValue(null),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    create: jest.fn().mockResolvedValue({ _id: id }),
  };
  return { model, repo: new SessionRepository(model as never, request) };
};
describe('atomic request ownership', () => {
  it('rejects stale guest reads and mutations after claim', async () => {
    const { repo, model } = make();
    await expect(repo.findById(id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(repo.getSessionDetail(id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    for (const mutation of [
      () => repo.addContext(id, 'text'),
      () => repo.updateRollingSummary(id, 'summary', []),
      () => repo.setResponseMode(id, 'comfort'),
      () => repo.complete(id, 'summary'),
      () => repo.reactivate(id),
      () => repo.saveSession(id),
      () => repo.updateAlias(id, owner, 'alias'),
    ]) {
      await expect(mutation()).rejects.toBeInstanceOf(NotFoundException);
    }
    for (const call of model.findOneAndUpdate.mock.calls) {
      expect(JSON.stringify(call[0])).toContain(hash);
      expect(JSON.stringify(call[0])).toContain('"isGuest":true');
    }
    await expect(repo.deleteSession(id, owner)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('authenticated reads enforce real owner and ignore guest capability', async () => {
    const { repo, model } = make({
      user: { userId: owner },
      headers: { 'x-guest-token': token },
    });
    await expect(repo.findById(id)).rejects.toBeInstanceOf(NotFoundException);
    expect(JSON.stringify(model.findOne.mock.calls[0][0])).toContain(owner);
    expect(JSON.stringify(model.findOne.mock.calls[0][0])).toContain(
      '"$ne":true',
    );
    expect(JSON.stringify(model.findOne.mock.calls[0][0])).not.toContain(hash);
  });
  it('claim query rechecks capability and retains the atomic guest condition', async () => {
    const { repo, model } = make({
      user: { userId: owner },
      headers: { 'x-guest-token': token },
      route: { path: '/chat/sessions/:sessionId/claim' },
    });
    await expect(repo.claimGuestSession(id, owner)).resolves.toBeNull();
    expect(JSON.stringify(model.findOneAndUpdate.mock.calls[0][0])).toContain(
      hash,
    );
    expect(model.findOneAndUpdate.mock.calls[0][0].$and[1]).toEqual({
      isGuest: true,
    });
  });
  it('new guest start can mutate using its private generated hash', async () => {
    const { repo, model } = make({ headers: {} });
    await repo.create('anonymous', 'work', undefined, hash);
    model.findOneAndUpdate.mockResolvedValue({ _id: id });
    await repo.addContext(id, 'initial');
    expect(JSON.stringify(model.findOneAndUpdate.mock.calls[0][0])).toContain(
      hash,
    );
  });
});
