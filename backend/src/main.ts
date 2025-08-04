import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { logger } from './logger';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });

  app.use(RequestLoggingMiddleware(logger));
  app.setGlobalPrefix('api');

  const corsOptions = {
    origin: '*',
    credentials: true,
  };
  app.enableCors(corsOptions);
  const config = new DocumentBuilder()
    .setTitle('Job Scrape Agent')
    .setDescription('The Job Scrape Agent API description')
    .setVersion('1.0')
    .addTag('job')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(3001);
}
bootstrap();
