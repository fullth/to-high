import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CharacterDocument,
  ApprovedMemory,
} from '../../database/character.schema';
import type { CounselorType } from '../../types/session';

@Injectable()
export class CharacterRepository {
  constructor(
    @InjectModel(CharacterDocument.name)
    private readonly model: Model<CharacterDocument>,
  ) {}
  list(ownerId: Types.ObjectId) {
    return this.model.find({ ownerId }).exec();
  }
  get(ownerId: Types.ObjectId, id: Types.ObjectId) {
    return this.model.findOne({ _id: id, ownerId }).exec();
  }
  create(ownerId: Types.ObjectId, displayName: string, style: CounselorType) {
    return this.model.create({ ownerId, displayName, style });
  }
  rename(ownerId: Types.ObjectId, id: Types.ObjectId, displayName: string) {
    return this.model
      .findOneAndUpdate(
        { _id: id, ownerId },
        { $set: { displayName }, $inc: { revision: 1 } },
        { new: true, runValidators: true },
      )
      .exec();
  }
  delete(ownerId: Types.ObjectId, id: Types.ObjectId) {
    return this.model.findOneAndDelete({ _id: id, ownerId }).exec();
  }
  // All memory edits compare a revision; concurrent requests cannot bypass limits.
  replaceMemories(
    ownerId: Types.ObjectId,
    id: Types.ObjectId,
    revision: number,
    memories: ApprovedMemory[],
  ) {
    return this.model
      .findOneAndUpdate(
        { _id: id, ownerId, revision },
        {
          $set: {
            memories,
            memoryChars: memories.reduce((n, m) => n + m.text.length, 0),
          },
          $inc: { revision: 1 },
        },
        { new: true, runValidators: true },
      )
      .exec();
  }
}
