import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSession } from '../auth/entities/user-session.entity';
import { AdminUsersController } from './admin-users.controller';
import { UserDevice } from './entities/user-device.entity';
import { UserRole } from './entities/user-role.entity';
import { User } from './entities/user.entity';
import { MeController } from './me.controller';
import { UserDevicesService } from './user-devices.service';
import { UsersService } from './users.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole, UserDevice, UserSession])],
  controllers: [AdminUsersController, MeController],
  providers: [UsersService, UserDevicesService],
  exports: [UsersService, UserDevicesService],
})
export class UsersModule {}
