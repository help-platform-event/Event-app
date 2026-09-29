import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Réserve un contrôleur aux utilisateurs connectés. Le `AuthGuard` global laisse passer les
 * requêtes sans token (navigation visiteur) avec `request.user` à `undefined` : ce guard refuse
 * alors directement en 401, sans appeler le service en aval.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context
            .switchToHttp()
            .getRequest<Request & { user?: unknown }>();

        if (!request.user) {
            throw new UnauthorizedException('Authentification requise');
        }
        return true;
    }
}
