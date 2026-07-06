import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  createExpenseSchema,
  CreateExpenseInput,
  updateExpenseSchema,
  UpdateExpenseInput,
  createExpenseCategorySchema,
  CreateExpenseCategoryInput,
  competenceString,
} from '@escola/contracts';
import { ExpensesService } from './expenses.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { parsePageParams } from '../common/pagination';
import { parseCompetence } from '../common/dates';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('competence') competence?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedCompetence =
      competence && competenceString.safeParse(competence).success
        ? parseCompetence(competence)
        : undefined;
    return this.expensesService.list(
      user.schoolId,
      { competence: parsedCompetence, categoryId: categoryId || undefined },
      parsePageParams(page, pageSize, 50),
    );
  }

  @Get('monthly-trend')
  monthlyTrend(@CurrentUser() user: JwtPayload, @Query('months') months?: string) {
    const n = Math.min(24, Math.max(1, Number.parseInt(months ?? '12', 10) || 12));
    return this.expensesService.monthlyTrend(user.schoolId, n);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createExpenseSchema)) body: CreateExpenseInput,
  ) {
    return this.expensesService.create(user.schoolId, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExpenseSchema)) body: UpdateExpenseInput,
  ) {
    return this.expensesService.update(user.schoolId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.remove(user.schoolId, id);
  }
}

@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.expensesService.listCategories(user.schoolId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createExpenseCategorySchema)) body: CreateExpenseCategoryInput,
  ) {
    return this.expensesService.createCategory(user.schoolId, body);
  }
}
