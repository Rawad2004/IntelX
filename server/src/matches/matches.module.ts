/**
 * Matches Module
 * 
 * Este módulo ya no usa un controller propio.
 * Los endpoints de matches están en footystats/api/controllers/matches.controller.ts
 */

import { Module } from "@nestjs/common";
import { FootystatsModule } from "../footystats/footystats.module";
import { MatchesCron } from "./jobs/matches.cron";

@Module({
  imports: [FootystatsModule],
  controllers: [], // Sin controllers - están en footystats/api/
  providers: [MatchesCron],
})
export class MatchesModule {}
