import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthUserView {
  id: string;
  username: string;
  firstName: string;
  lastName: string | null;
  role: User['role'];
}

export interface AuthResponse {
  user: AuthUserView;
  token: string;
}

function toAuthUserView(user: User): AuthUserView {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private sign(user: User): string {
    return this.jwtService.sign({ sub: user.id, username: user.username });
  }

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const existing = await this.usersService.findByUsername(dto.username);
    if (existing) {
      throw new ConflictException('Это имя пользователя уже занято.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      username: dto.username,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      role: 'Режиссер',
    });

    return { user: toAuthUserView(user), token: this.sign(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверное имя пользователя или пароль.');
    }

    return { user: toAuthUserView(user), token: this.sign(user) };
  }

  me(user: User): { user: AuthUserView } {
    return { user: toAuthUserView(user) };
  }
}
