import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { createUserSchema, CreateUserInput } from '@escola/contracts';
import { UsersService } from './users.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload';

@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.usersService.list(user.schoolId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
  ) {
    return this.usersService.create(user.schoolId, body);
  }

  @Patch(':id/active')
  setActive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    return this.usersService.setActive(user.schoolId, id, active);
  }
}
