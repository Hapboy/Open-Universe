import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PinterestConnection } from './pinterest-connection.entity';
import { PinterestController } from './pinterest.controller';
import { PinterestService } from './pinterest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PinterestConnection]),
    // Reuses AuthModule's exported JwtModule/JwtService to sign/verify the
    // OAuth "state" token - no second secret or extra infra just for this.
    AuthModule,
  ],
  controllers: [PinterestController],
  providers: [PinterestService],
})
export class PinterestModule {}
