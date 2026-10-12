/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { SessionRepository } from './session.repository';
it('claims atomically only while guest and removes capability hash and TTL', async () => {
  let isGuest = true;
  const model = {
    findOneAndUpdate: jest.fn().mockImplementation(async (filter, update) => {
      if (!isGuest || filter.$and[1].isGuest !== true) return null;
      isGuest = false;
      return { userId: update.$set.userId };
    }),
  };
  const repository = new SessionRepository(model as never);
  const id = '507f1f77bcf86cd799439011';
  const results = await Promise.all([
    repository.claimGuestSession(id, '507f1f77bcf86cd799439012'),
    repository.claimGuestSession(id, '507f1f77bcf86cd799439013'),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(model.findOneAndUpdate.mock.calls[0][0].$and[1]).toEqual({
    isGuest: true,
  });
  expect(model.findOneAndUpdate.mock.calls[0][1].$unset).toEqual({
    expireAt: '',
    guestAccessHash: '',
  });
});
