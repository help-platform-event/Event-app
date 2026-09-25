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
import { JwtPayload } from '../type/auth.type';
import { extractTokenFromHeader } from '../decorators/access-token.decorator';
// import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
    ) {}

    //* Avec @Public()
    // async canActivate(context: ExecutionContext): Promise<boolean> {
    //     //Vérifie si la route est public
    //     const isPublic = this.reflector.getAllAndOverride<boolean>(
    //         IS_PUBLIC_KEY,
    //         [context.getHandler(), context.getClass()],
    //     );
    //     if (isPublic) {
    //         return true;
    //     }

    //     //Récupère le request
    //     const request = context.switchToHttp().getRequest<Request>();

    //     //Recupère le token du header
    //     const token = this.extractTokenFromHeader(request);

    //     if (!token) {
    //         throw new UnauthorizedException();
    //     }
    //     try {
    //         //Verifie le token et récupère le payload
    //         const payload = await this.jwtService.verifyAsync<JwtPayload>(
    //             token,
    //             {
    //                 algorithms: [
    //                     (process.env.JWTALGORITHM as Algorithm) ?? 'HS512',
    //                 ],
    //                 secret: process.env.JWT_ACCESS_SECRET,
    //             },
    //         );
    //         // Assignation du payload à la request afin qu'elle soit accessible sur nos routes
    //         // @ts-expect-error En attendant de trouver le typage
    //         request.user = {
    //             id: payload.sub,
    //             email: payload.email,
    //             role: payload.role,
    //         };
    //     } catch {
    //         throw new UnauthorizedException();
    //     }
    //     return true;
    // }

    //* Sans @Public()
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        const token = this.extractTokenFromHeader(request);

        // 👇 IMPORTANT : pas de token → user undefined mais on continue
        if (!token) {
            // @ts-expect-error test
            request.user = undefined;
            return true;
        }

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

            // @ts-expect-error test
            request.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
            };

            return true;
        } catch {
            throw new UnauthorizedException();
        }
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        return extractTokenFromHeader(request);
    }
}
