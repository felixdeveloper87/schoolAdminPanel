import { Controller, Get, Query } from '@nestjs/common';
import { competenceString } from '@escola/contracts';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { currentCompetenceSaoPaulo, parseCompetence } from '../common/dates';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload, @Query('month') month?: string) {
    const competence =
      month && competenceString.safeParse(month).success
        ? parseCompetence(month)
        : currentCompetenceSaoPaulo();
    return this.dashboardService.summary(user.schoolId, competence, user.role);
  }
}
