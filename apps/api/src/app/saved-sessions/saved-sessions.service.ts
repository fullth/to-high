import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { OpenAIAgent } from '../../client/openai/openai.agent';

type Message = { role: 'user' | 'assistant'; content: string };
type Saved = { _id: string; ownerId: string; id: string; title: string; messages: Message[]; createdAt: Date };

@Injectable()
export class SavedSessionsService {
  constructor(@InjectConnection() private readonly connection: Connection, private readonly agent: OpenAIAgent) {}

  private get collection() {
    if (!this.connection.db) throw new ServiceUnavailableException();
    return this.connection.db.collection<Saved>('saved_conversations_v2');
  }

  async list(ownerId: string) {
    const items = await this.collection.find({ ownerId }, { projection: { id: 1, title: 1, createdAt: 1, _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
    return { sessions: items };
  }

  async save(ownerId: string, input: { id: string; messages: Message[] }) {
    const key = `${ownerId}:${input.id}`;
    let inserted = false;
    try {
      const result = await this.collection.updateOne({ _id: key, ownerId }, { $setOnInsert: { ownerId, id: input.id, title: '저장된 상담', messages: input.messages, createdAt: new Date() } }, { upsert: true });
      inserted = result.upsertedCount === 1;
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    }
    if (inserted) {
      try {
        const context = input.messages.slice(-20).map((item) => `${item.role === 'user' ? '사용자' : '레비'}: ${item.content}`).join('\n').slice(-6000);
        const title = await this.agent.generateSavedSessionTitle([context]);
        await this.collection.updateOne({ _id: key, ownerId }, { $set: { title } });
      } catch { /* Saving does not depend on an extra model call succeeding. */ }
    }
    const saved = await this.collection.findOne({ _id: key, ownerId });
    if (!saved) throw new ServiceUnavailableException();
    return { id: saved.id, title: saved.title };
  }

  async get(ownerId: string, id: string) {
    const saved = await this.collection.findOne({ _id: `${ownerId}:${id}`, ownerId });
    if (!saved) throw new NotFoundException();
    return { id: saved.id, title: saved.title, messages: saved.messages, createdAt: saved.createdAt };
  }

  async delete(ownerId: string, id: string) {
    const result = await this.collection.deleteOne({ _id: `${ownerId}:${id}`, ownerId });
    if (!result.deletedCount) throw new NotFoundException();
    return { deleted: true };
  }
}
