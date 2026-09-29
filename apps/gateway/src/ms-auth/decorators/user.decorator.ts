import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserData } from '../type/auth.type';

type AuthenticatedRequest = Request & {
    user: CurrentUserData;
};

export const User = createParamDecorator(
    (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

        const user = request.user;

        return data ? user[data] : user;
    },
);

export const PublicUser = createParamDecorator(
    (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

        const user = request.user;

        return data ? user?.[data] : user;
    },
);
