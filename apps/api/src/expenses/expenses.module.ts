import { Module } from '@nestjs/common';
import { ExpensesController, ExpenseCategoriesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  controllers: [ExpensesController, ExpenseCategoriesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
