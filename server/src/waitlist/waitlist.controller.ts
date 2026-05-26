import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";

import { WaitlistService } from "./waitlist.service";
import { JoinWaitlistDto } from "./dto/join-waitlist.dto";
import { ResendConfirmDto } from "./dto/resend-confirm.dto";
import { AdminApiKeyGuard } from "./guards/admin-api-key.guard";

@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly service: WaitlistService) {}

  // ============================
  // PUBLIC
  // ============================

  @Post()
  join(@Body() dto: JoinWaitlistDto) {
    return this.service.join(dto.email);
  }

  @Get("confirm")
  confirm(@Query("token") token: string) {
    return this.service.confirm(token);
  }

  @Post("resend")
  resend(@Body() dto: ResendConfirmDto) {
    return this.service.resend(dto.email);
  }

  // ============================
  // ADMIN
  // ============================

  @UseGuards(AdminApiKeyGuard)
  @Get("admin/stats")
  adminStats() {
    return this.service.adminStats();
  }

  @UseGuards(AdminApiKeyGuard)
  @Get("admin/list")
  adminList(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    const l = Math.min(Math.max(Number(limit || 50), 1), 200);
    const o = Math.max(Number(offset || 0), 0);
    return this.service.adminList(l, o);
  }
}
