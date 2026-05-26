import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const allowedOrigins = [
    "https://telephone-photographers-ministries-jenny.trycloudflare.com",
    "http://192.168.80.244:3000",
    "http://localhost:3001",
    "http://localhost:3000",
    "https://frontend-production-a854.up.railway.app",
    "https://intelxofficial.xyz",
    "https://www.intelxofficial.xyz",
    "https://app.intelxofficial.xyz"
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // requests sin origin (curl, healthchecks) => permitir
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger config
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IntelX API')
    .setDescription('Football Behavioral Intelligence API - Powered by IntelX Engine')
    .setVersion('1.0.0')
    .addTag('Matches', 'Endpoints de partidos')
    .addTag('Analysis', 'Endpoints de análisis IntelX')
    .addTag('Leagues', 'Endpoints de ligas')
    .addTag('Teams', 'Endpoints de equipos')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(config.get("PORT") ?? 3001);
  await app.listen(port);
  
  console.log(`🚀 IntelX API running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();