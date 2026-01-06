import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../../database/user.schema';
import { UserRepository } from '../../persistence/user/user.repository';

interface GoogleUserDto {
  email: string;
  name: string;
  picture: string;
  googleId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
  ) {}

  async validateGoogleUser(dto: GoogleUserDto): Promise<UserDocument> {
    let user = await this.userRepository.findByGoogleId(dto.googleId);

    if (!user) {
      user = await this.userRepository.create(dto);
    }

    return user;
  }

  generateToken(user: UserDocument): string {
    const payload = { sub: user._id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userRepository.findById(id);
  }
}
