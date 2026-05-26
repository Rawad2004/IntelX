import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { 
  MatchesController, 
  AnalysisController,
  FootystatsFrontendController, 
} from './controllers';
import { MatchesService } from './controllers';
import { MatchTransformer, SignalTransformer } from './transformers';

import { FootyAiService } from '../ai/footy-ai.service';
import { LeaguesService } from './controllers/leagues.service';
import { LeaguesController } from './controllers/leagues.controller';

import { AnalysisOrchestrator } from '../services/analysis.orchestrator';
import { MatchDataAggregator } from '../services/match-data.aggregator';
import { IntelXObjectBuilder } from '../services/intelx-object.builder';

import { SignalsModule } from '../signals';

// Entities
import { MatchAnalysis } from '../entities/match-analysis.entity';
import { FootyDailyMatchEntity } from '../entities/footy-daily-match.entity';
import { FootyMatchDetailsEntity } from '../entities/footy-match-details.entity';
import { FootyMatchAnalysisEntity } from '../entities/footy-match-analysis.entity';
import { FootyTeamLastXEntity } from '../entities/footy-team-lastx.entity';
import { FootyLeagueSeasonEntity } from '../entities/footy-league-season.entity';

// Repositories & Services
import { MatchAnalysisRepository } from '../repositories/match-analysis.repository';
import { BehavioralAnalysisService } from '../services/behavioral-analysis.service';
import { AnalysisSchedulerService } from '../services/analysis-scheduler.service';
import { LandingController } from './controllers/landing.controller';
import { TodaysMatchService } from '../services/todays-match.service';
import { FootyStoreService } from '../footy-store.service';
import { FootystatsService } from '../footystats.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    SignalsModule,
    // ✅ TODAS las entidades que usa FootyStoreService
    TypeOrmModule.forFeature([
      MatchAnalysis,
      FootyDailyMatchEntity,
      FootyMatchDetailsEntity,
      FootyMatchAnalysisEntity,
      FootyTeamLastXEntity,
      FootyLeagueSeasonEntity,
    ]),
  ],
  controllers: [
    MatchesController,
    AnalysisController,
    LeaguesController,
    LandingController,
    FootystatsFrontendController,
  ],
  providers: [
    MatchesService,
    LeaguesService,
    MatchTransformer,
    SignalTransformer,
    FootyAiService,
    AnalysisOrchestrator,
    MatchDataAggregator,
    IntelXObjectBuilder,
    MatchAnalysisRepository,
    BehavioralAnalysisService,
    AnalysisSchedulerService,
    TodaysMatchService,
    FootyStoreService,
    FootystatsService,
  ],
  exports: [
    MatchesService,
    LeaguesService,
    MatchTransformer,
    SignalTransformer,
  ],
})
export class ApiModule {}