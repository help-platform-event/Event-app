// import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './utils/filters/exception-filter';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { attachChatProxy } from './chat/chat-proxy';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.use(cookieParser());

    const config = new DocumentBuilder()
        .setTitle('Projet HELP')
        .setDescription('The H.E.L.P API')
        .setVersion('1.0')
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);

    app.enableCors({
        origin: [process.env.FRONTEND_URL, 'http://localhost:5173'],
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    await app.listen(process.env.PORT ?? 3000);
    attachChatProxy(app.getHttpServer() as Server);
    console.log('gateway running 🚀');
}
void bootstrap();
