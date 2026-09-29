import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Algorithm } from 'jsonwebtoken';
import { CurrentUserData, JwtPayload } from '../type/auth.type';
import { extractTokenFromHeader } from '../decorators/access-token.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard global : toute route est réservée aux utilisateurs connectés, sauf celles marquées
 * `@Public()`.
 *
 * - Token présent : il est vérifié (401 s'il est invalide ou expiré, le Front rafraîchit alors
 *   son token et rejoue la requête) et `request.user` est rempli, y compris sur une route
 *   publique, pour que `@PublicUser()` reconnaisse l'utilisateur connecté.
 * - Pas de token : accepté sur une route `@Public()` (visiteur, `request.user` undefined), 401
 *   partout ailleurs.
 */
@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<Request & { user?: CurrentUserData }>();
        const token = extractTokenFromHeader(request);

        if (!token) {
            if (this.isPublic(context)) return true;
            throw new UnauthorizedException('Authentification requise');
        }

        request.user = await this.verify(token);
        return true;
    }

    private isPublic(context: ExecutionContext): boolean {
        return (
            this.reflector.getAllAndOverride<boolean | undefined>(
                IS_PUBLIC_KEY,
                [context.getHandler(), context.getClass()],
            ) ?? false
        );
    }

    private async verify(token: string): Promise<CurrentUserData> {
        try {
            // Les access tokens sont émis par ms-auth-java (jjwt), qui décode son secret en
            // Base64 : on doit vérifier avec les mêmes octets, pas avec la chaîne brute.
            const payload = await this.jwtService.verifyAsync<JwtPayload>(
                token,
                {
                    algorithms: [
                        (process.env.JWTALGORITHM as Algorithm) ?? 'HS256',
                    ],
                    secret: Buffer.from(
                        process.env.JWT_ACCESS_SECRET ?? '',
                        'base64',
                    ),
                },
            );
            return {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
            };
        } catch {
            throw new UnauthorizedException();
        }
    }
}
