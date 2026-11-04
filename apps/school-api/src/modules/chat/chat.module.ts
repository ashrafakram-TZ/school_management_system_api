import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealtimeModule } from '../realtime/realtime.module';
import { StaffModule } from '../staff/staff.module';
import { ChatAuditController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatAuditLog, ChatMessage, ChatThread } from './entities/chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatThread, ChatMessage, ChatAuditLog]), StaffModule, RealtimeModule],
  controllers: [ChatAuditController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
