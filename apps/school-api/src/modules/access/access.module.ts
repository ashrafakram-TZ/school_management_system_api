import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AccessService } from './access.service';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolesController } from './roles.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, User])],
  controllers: [RolesController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
