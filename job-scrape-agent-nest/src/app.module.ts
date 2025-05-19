import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { JobModule } from './job/job.module';

@Module({
  imports: [ConfigModule, JobModule],
})
export class AppModule {}
