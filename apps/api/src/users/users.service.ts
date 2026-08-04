import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findByUsername(username: string): Promise<User | null> {
    return this.users.findOneBy({ username });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  create(data: {
    username: string;
    passwordHash: string;
    firstName: string;
    lastName: string | null;
    role: User['role'];
  }): Promise<User> {
    const user = this.users.create(data);
    return this.users.save(user);
  }
}
