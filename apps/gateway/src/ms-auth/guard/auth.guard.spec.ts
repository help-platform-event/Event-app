import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { Public } from '../decorators/public.decorator';

/** Two handlers, only one marked @Public(): the guard reads that metadata. */
class RoutesController {
    privateRoute() {
        return 'private';
    }

    @Public()
    publicRoute() {
        return 'public';
    }
}

const SECRET = Buffer.from('a-test-secret-of-at-least-32-bytes!!').toString(
    'base64',
);

describe('AuthGuard', () => {
    const jwtService = new JwtService();
    const guard = new AuthGuard(jwtService, new Reflector());
    const previousSecret = process.env.JWT_ACCESS_SECRET;

    beforeAll(() => {
        process.env.JWT_ACCESS_SECRET = SECRET;
    });

    afterAll(() => {
        process.env.JWT_ACCESS_SECRET = previousSecret;
    });

    /** Signed like ms-auth-java does: HS256 with the Base64-decoded secret. */
    const tokenFor = (sub: string, secret = SECRET) =>
        jwtService.sign(
            { sub, email: `${sub}@example.com`, role: 'USER' },
            { secret: Buffer.from(secret, 'base64'), algorithm: 'HS256' },
        );

    const run = async (
        route: 'privateRoute' | 'publicRoute',
        token?: string,
    ) => {
        const request: { headers: Record<string, string>; user?: unknown } = {
            headers: token ? { authorization: `Bearer ${token}` } : {},
        };
        const context = {
            switchToHttp: () => ({ getRequest: () => request }),
            getHandler: () => RoutesController.prototype[route],
            getClass: () => RoutesController,
        } as unknown as ExecutionContext;

        const allowed = await guard.canActivate(context);
        return { allowed, user: request.user };
    };

    it('answers 401 on a private route without a token', async () => {
        await expect(run('privateRoute')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('lets a visitor through on a @Public() route, without a user', async () => {
        await expect(run('publicRoute')).resolves.toEqual({
            allowed: true,
            user: undefined,
        });
    });

    it.each(['privateRoute', 'publicRoute'] as const)(
        'fills request.user from a valid token (%s)',
        async (route) => {
            await expect(run(route, tokenFor('user-1'))).resolves.toEqual({
                allowed: true,
                user: {
                    id: 'user-1',
                    email: 'user-1@example.com',
                    role: 'USER',
                },
            });
        },
    );

    it.each(['privateRoute', 'publicRoute'] as const)(
        'answers 401 to an invalid token, even on a public route (%s)',
        async (route) => {
            const forged = tokenFor(
                'user-1',
                Buffer.from('another-secret-of-at-least-32-bytes!!').toString(
                    'base64',
                ),
            );
            await expect(run(route, forged)).rejects.toThrow(
                UnauthorizedException,
            );
        },
    );
});
