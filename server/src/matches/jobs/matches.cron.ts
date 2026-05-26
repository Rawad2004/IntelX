import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class MatchesCron {
  private readonly logger = new Logger(MatchesCron.name);

  @Cron("*/1 * * * *")
  handleTestCron() {
    this.logger.log("✅ CRON FUNCIONANDO - tick");
  }
}
