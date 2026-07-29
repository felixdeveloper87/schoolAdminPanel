import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import {
  createRenewalInvoiceSchema,
  CreateRenewalInvoiceInput,
  createSchoolMaterialInvoiceSchema,
  CreateSchoolMaterialInvoiceInput,
  payInvoiceSchema,
  PayInvoiceInput,
  competenceString,
  INVOICE_STATUSES,
  INVOICE_TYPES,
  InvoiceType,
} from '@escola/contracts';
import { InvoicesService } from './invoices.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { parsePageParams } from '../common/pagination';
import { parseCompetence } from '../common/dates';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('competence') competence?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedCompetence =
      competence && competenceString.safeParse(competence).success
        ? parseCompetence(competence)
        : undefined;
    const validStatus = INVOICE_STATUSES.includes(status as InvoiceStatus)
      ? (status as InvoiceStatus)
      : undefined;
    const validType = INVOICE_TYPES.includes(type as InvoiceType) ? (type as InvoiceType) : undefined;
    return this.invoicesService.list(
      user.schoolId,
      { competence: parsedCompetence, status: validStatus, type: validType },
      parsePageParams(page, pageSize, 50),
    );
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicesService.getOne(user.schoolId, id);
  }

  @Post('generate')
  @Roles('ADMIN')
  generate(@CurrentUser() user: JwtPayload, @Query('competence') competence?: string) {
    const parsed = competenceString.safeParse(competence);
    if (!parsed.success) {
      throw new BadRequestException('Informe a competência no formato AAAA-MM');
    }
    return this.invoicesService.generate(user.schoolId, parseCompetence(parsed.data));
  }

  @Post()
  @Roles('ADMIN')
  createRenewal(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createRenewalInvoiceSchema)) body: CreateRenewalInvoiceInput,
  ) {
    return this.invoicesService.createRenewal(user.schoolId, body);
  }

  @Post('school-material')
  @Roles('ADMIN')
  createSchoolMaterial(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createSchoolMaterialInvoiceSchema)) body: CreateSchoolMaterialInvoiceInput,
  ) {
    return this.invoicesService.createSchoolMaterial(user.schoolId, body);
  }

  @Patch(':id/pay')
  pay(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(payInvoiceSchema)) body: PayInvoiceInput,
  ) {
    return this.invoicesService.pay(user.schoolId, id, body);
  }

  @Patch(':id/revert')
  @Roles('ADMIN')
  revert(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicesService.revert(user.schoolId, id);
  }

  @Patch(':id/exempt')
  @Roles('ADMIN')
  exempt(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicesService.exempt(user.schoolId, id);
  }
}
