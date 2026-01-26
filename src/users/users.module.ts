import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UploadsController } from './uploads.controller';
import { User, UserSchema } from './user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MulterModule.register({
      dest: './uploads/resumes',
    }),
  ],
  controllers: [UsersController, UploadsController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
