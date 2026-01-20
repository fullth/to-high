import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('To High; 위로 API')
    .setDescription('AI 기반 심리 상담 서비스 API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '인증 관련 API')
    .addTag('chat', '상담 관련 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
