import {
    Body,
    Controller,
    Post,
    Res,
    Req,
    Get,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { User } from './decorators/user.decorator';
import { MsAuthClient } from '../ms-auth-client/ms-auth-client.service';
import { AccessToken } from './decorators/access-token.decorator';
import { Public } from './decorators/public.decorator';
import {
    CurrentUserData,
    LoginRequestDto,
    LoginRequestSchema,
    LoginResponseDto,
    SignupRequestDto,
    SignupRequestSchema,
} from '@app/contracts';
import { ZodValidationPipe } from '../utils/zod-validation.pipe';

@Controller('ms/auth')
export class AuthController {
    constructor(
        private readonly msAuthClient: MsAuthClient,
        private readonly authService: AuthService,
    ) {}

    @Get('users')
    async getUsers(@AccessToken() accessToken: string) {
        return this.msAuthClient.getUsers(accessToken);
    }

    @Get('me')
    me(@User() user: CurrentUserData) {
        return user;
    }

    @Public()
    @Post('signup')
    async signup(
        @Body(ZodValidationPipe(SignupRequestSchema)) dto: SignupRequestDto,
    ): Promise<{ success: true }> {
        await this.msAuthClient.signup(dto);
        return { success: true };
    }

    @Public()
    @Post('google')
    async googleSignin(
        @Body() body: { code: string },
        @Res({ passthrough: true }) response: Response,
    ): Promise<Omit<LoginResponseDto, 'refreshToken'>> {
        const result = await this.msAuthClient.google(body.code);

        this.authService.insertIntoCookies(
            'refresh_token',
            result.refreshToken,
            response,
        );

        return {
            accessToken: result.accessToken,
        };
    }

    @Public()
    @Post('signin')
    async signin(
        @Body(ZodValidationPipe(LoginRequestSchema)) dto: LoginRequestDto,
        @Res({ passthrough: true }) response: Response,
    ): Promise<Omit<LoginResponseDto, 'refreshToken'>> {
        const result = await this.msAuthClient.login(dto);

        this.authService.insertIntoCookies(
            'refresh_token',
            result.refreshToken,
            response,
        );

        return {
            accessToken: result.accessToken,
        };
    }

    @Public()
    @Post('refresh_token')
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<{ accessToken: string }> {
        const cookies: Record<string, string> = request.cookies;
        const refreshToken = cookies.refresh_token;

        // Sans cookie, ms-auth-java répondrait 400 (body invalide) : le Front attend un 401
        // pour renvoyer vers la connexion.
        if (!refreshToken) {
            throw new UnauthorizedException();
        }

        const result = await this.msAuthClient.refresh(refreshToken);

        this.authService.insertIntoCookies(
            'refresh_token',
            result.refreshToken,
            response,
        );

        return {
            accessToken: result.accessToken,
        };
    }

    @Post('signout')
    async signout(
        @AccessToken() accessToken: string,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        const cookies: Record<string, string> = request.cookies;
        // Sans cookie, il n'y a aucune session à révoquer côté ms-auth : on nettoie juste.
        if (cookies.refresh_token) {
            await this.msAuthClient.logout(accessToken, cookies.refresh_token);
        }

        response.clearCookie('refresh_token', {
            httpOnly: true,
            sameSite: 'strict',
            secure: false,
            path: '/',
        });

        return { success: true };
    }
}
