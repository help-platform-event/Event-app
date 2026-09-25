import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extrait le bearer de l'en-tête `Authorization` de la requête entrante, pour le relayer tel
 * quel à ms-auth-java (qui identifie l'utilisateur par ce token, pas par un `userId`).
 */
export function extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
}

export const AccessToken = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string | undefined =>
        extractTokenFromHeader(ctx.switchToHttp().getRequest<Request>()),
);
