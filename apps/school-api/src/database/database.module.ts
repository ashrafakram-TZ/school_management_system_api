import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatedBySubscriber } from '@app/common';
import { dbConfig, DbConfig } from '../config/configuration';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [dbConfig.KEY],
      useFactory: (db: DbConfig) => ({
        type: 'postgres',
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.database,
        ssl: db.ssl,
        extra: { max: db.poolSize },
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
  ],
  providers: [CreatedBySubscriber],
})
export class DatabaseModule {}
