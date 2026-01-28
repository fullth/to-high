import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser 비활성화하고 직접 설정
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // JSON body parser - 기본 100kb, 특정 경로는 1mb
  app.use(json({ limit: '1mb' }));

  // 보안 헤더 설정 (Helmet)
  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // CORS 설정 - 프로덕션과 개발 환경 분리
  const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:3001']
    : ['http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Swagger 설정 - 개발 환경에서만 활성화
  if (process.env.NODE_ENV !== 'production') {
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
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application running on port ${port}`);
}
bootstrap();
