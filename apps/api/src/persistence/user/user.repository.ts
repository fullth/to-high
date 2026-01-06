import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../../database/user.schema';

interface CreateUserDto {
  email: string;
  name: string;
  picture: string;
  googleId: string;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(UserDocument.name) private userModel: Model<UserDocument>,
  ) {}

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    return this.userModel.create(dto);
  }
}
