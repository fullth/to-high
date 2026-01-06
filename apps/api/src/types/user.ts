import { Types } from 'mongoose';

export interface User {
  _id: Types.ObjectId;
  email: string;
  name: string;
  picture: string;
  googleId: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  preferredTone?: string;
  preferComfortOnly?: boolean;
  triggers?: string[];
}
