/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // DYNAMIC CORS (no hardcoded URLs)
  app.enableCors({
    origin: (origin, callback) => {
      // Origins allowed dynamically
      const allowedPatterns = [
        /http:\/\/localhost:\d+$/, // ANY localhost port
        /\.onrender\.com$/,        // ANY Render frontend domain
        /\.vercel\.app$/,          // ANY Vercel frontend domain
        /\.netlify\.app$/,   //any netlify
      ];

      if (!origin) {
        // Allow Postman, server-side, or same-origin calls
        return callback(null, true);
      }

      const isAllowed = allowedPatterns.some((pattern) =>
        pattern.test(origin),
      );

      if (isAllowed) {
        return callback(null, true);
      } else {
        console.error("❌ CORS blocked:", origin);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  const port = process.env.PORT || 3333;

  await app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

bootstrap();
