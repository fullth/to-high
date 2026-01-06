import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserDocument extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  name: string;

  @Prop()
  picture: string;

  @Prop({ required: true })
  googleId: string;

  @Prop({
    type: {
      preferredTone: String,
      preferComfortOnly: Boolean,
      triggers: [String],
    },
    default: {},
  })
  preferences: {
    preferredTone?: string;
    preferComfortOnly?: boolean;
    triggers?: string[];
  };
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
