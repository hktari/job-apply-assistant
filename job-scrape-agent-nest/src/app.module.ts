import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from './config/config.module';
import { JobModule } from './job/job.module';
import { ProfileModule } from './profile/profile.module';
import { ApplicationModule } from './application/application.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    ConfigModule,
    JobModule,
    ProfileModule,
    ApplicationModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
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
