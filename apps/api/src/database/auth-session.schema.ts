import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'auth_sessions', timestamps: true })
export class AuthSessionDocument extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'UserDocument',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['google', 'kakao'] })
  provider: 'google' | 'kakao';

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  revokedAt?: Date;
}

export const AuthSessionSchema =
  SchemaFactory.createForClass(AuthSessionDocument);

AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
