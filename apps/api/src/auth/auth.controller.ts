import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { loginSchema, LoginInput } from '@escola/contracts';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { JwtPayload } from './jwt-payload';

export const AUTH_COOKIE = 'access_token';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.login(body.email, body.password);
    res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
    return { user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, cookieOptions);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return { user };
  }
}
