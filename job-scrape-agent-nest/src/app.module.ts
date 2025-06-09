import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from './config/config.module';
import { JobModule } from './job/job.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    ConfigModule,
    JobModule,
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
      // middleware: basicAuth({
      //   challenge: true,
      //   users: { admin: "passwordhere" },
      // }),
    }),
  ],
})
export class AppModule {}
