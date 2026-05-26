import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule"; // ✅ AQUI

import { WaitlistModule } from "./waitlist/waitlist.module";
import { MatchesModule } from "./matches/matches.module";
import { FootystatsModule } from "./footystats/footystats.module";
import { AuthModule } from "./auth";

@Module({
  imports: [
    // ✅ THROTTLER (forma correcta en v6+)
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number(process.env.WAITLIST_RATE_TTL || 60),
          limit: Number(process.env.WAITLIST_RATE_LIMIT || 5),
        },
      ],
    }),

    // ✅ ENV GLOBAL
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ✅ SCHEDULE (CRON/JOBS)
    ScheduleModule.forRoot(), // ✅ AQUI (reemplaza scheduleModule)

    // ✅ TYPEORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: "mysql",
        host: cfg.get<string>("DB_HOST"),
        port: Number(cfg.get<string>("DB_PORT")),
        username: cfg.get<string>("DB_USER"),
        password: cfg.get<string>("DB_PASS"),
        database: cfg.get<string>("DB_NAME"),
        autoLoadEntities: true,
        synchronize: false, // ⚠️ prod: false siempre
        charset: "utf8mb4",
      }),
    }),

    // ✅ MODULES
    WaitlistModule,
    FootystatsModule,
    MatchesModule,
    AuthModule
   
  ],
})
export class AppModule {}
