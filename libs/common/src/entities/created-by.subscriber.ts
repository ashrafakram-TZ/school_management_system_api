import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntitySubscriberInterface, InsertEvent, ObjectLiteral } from 'typeorm';
import { RequestContext } from '../context/request-context';

@Injectable()
export class CreatedBySubscriber implements EntitySubscriberInterface {
  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<ObjectLiteral>): void {
    const userId = RequestContext.userId();
    const entity = event.entity;
    if (!userId || !entity) return;
    if (!event.metadata.findColumnWithPropertyName('created_by')) return;
    if (entity.created_by === undefined || entity.created_by === null) entity.created_by = userId;
  }
}
