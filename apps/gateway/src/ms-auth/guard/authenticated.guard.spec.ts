import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedGuard } from './authenticated.guard';

function contextWithUser(user: unknown): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
}

describe('AuthenticatedGuard', () => {
    const guard = new AuthenticatedGuard();

    it('lets a logged-in user through', () => {
        expect(guard.canActivate(contextWithUser({ id: 'user-1' }))).toBe(true);
    });

    it('answers 401 when the request has no user', () => {
        expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
            UnauthorizedException,
        );
    });
});
