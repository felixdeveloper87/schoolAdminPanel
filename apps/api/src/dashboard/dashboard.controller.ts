import { Controller, Get, Query } from '@nestjs/common';
import { competenceString } from '@escola/contracts';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { currentCompetenceSaoPaulo, parseCompetence } from '../common/dates';

function resolveCompetence(month?: string): Date {
  return month && competenceString.safeParse(month).success
    ? parseCompetence(month)
    : currentCompetenceSaoPaulo();
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload, @Query('month') month?: string) {
    return this.dashboardService.summary(user.schoolId, resolveCompetence(month), user.role);
  }

  @Get('charts')
  charts(@CurrentUser() user: JwtPayload, @Query('month') month?: string) {
    return this.dashboardService.charts(user.schoolId, resolveCompetence(month));
  }

  @Get('projection')
  @Roles('ADMIN')
  projection(@CurrentUser() user: JwtPayload, @Query('month') month?: string) {
    return this.dashboardService.projection(user.schoolId, resolveCompetence(month));
  }
}
