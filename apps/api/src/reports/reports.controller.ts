import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { competenceString } from '@escola/contracts';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { currentCompetenceSaoPaulo, parseCompetence } from '../common/dates';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('defaulters')
  defaulters(@CurrentUser() user: JwtPayload) {
    return this.reportsService.defaulters(user.schoolId);
  }

  @Get('dre')
  @Roles('ADMIN')
  dre(@CurrentUser() user: JwtPayload, @Query('month') month?: string) {
    if (month && !competenceString.safeParse(month).success) {
      throw new BadRequestException('Informe o mês no formato AAAA-MM');
    }
    const competence = month ? parseCompetence(month) : currentCompetenceSaoPaulo();
    return this.reportsService.dre(user.schoolId, competence);
  }
}
