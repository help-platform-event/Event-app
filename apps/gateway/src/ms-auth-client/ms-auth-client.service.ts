import { Injectable } from '@nestjs/common';
import type {
    AvailabilityDto,
    ChangePasswordDto,
    LoginRequestDto,
    LoginResponseDto,
    NotificationsDto,
    ProfileDto,
    SignupRequestDto,
} from '@app/contracts';
import {
    HttpMethod,
    RequestOptions,
    ServiceHttpClient,
} from '../utils/http/service-http-client';

/**
 * Forme renvoyée par ms-auth-java pour un utilisateur (`UserSummaryResponse` côté Java).
 */
export interface UserSummaryResponse {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
}

/**
 * Client HTTP vers ms-auth-java (remplace les appels NATS vers l'ancien ms-auth NestJS). Les erreurs
 * sont traduites par {@link ServiceHttpClient} ; ms-auth injoignable → 503.
 */
@Injectable()
export class MsAuthClient {
    private readonly http = new ServiceHttpClient(
        'ms-auth',
        process.env.MS_AUTH_URL ?? 'http://localhost:8080',
        "Le service d'authentification est indisponible.",
    );

    // AUTH
    async signup(dto: SignupRequestDto): Promise<void> {
        await this.request('POST', '/api/auth/signup', { body: dto });
    }

    login(dto: LoginRequestDto): Promise<LoginResponseDto> {
        return this.request('POST', '/api/auth/login', { body: dto });
    }

    google(code: string): Promise<LoginResponseDto> {
        return this.request('POST', '/api/auth/google', { body: { code } });
    }

    refresh(refreshToken: string): Promise<LoginResponseDto> {
        return this.request('POST', '/api/auth/refresh', {
            body: { refreshToken },
        });
    }

    async logout(accessToken: string, refreshToken: string): Promise<void> {
        await this.request('POST', '/api/auth/logout', {
            accessToken,
            body: { refreshToken },
        });
    }

    async changePassword(
        accessToken: string,
        dto: ChangePasswordDto,
    ): Promise<void> {
        await this.request('POST', '/api/auth/change-password', {
            accessToken,
            body: dto,
        });
    }

    // USERS
    getUsers(accessToken: string): Promise<UserSummaryResponse[]> {
        return this.request('GET', '/api/users', { accessToken });
    }

    getUser(accessToken: string, userId: string): Promise<UserSummaryResponse> {
        return this.request('GET', `/api/users/${encodeURIComponent(userId)}`, {
            accessToken,
        });
    }

    async getProfiles(
        accessToken: string,
        userIds: string[],
    ): Promise<UserSummaryResponse[]> {
        if (userIds.length === 0) return [];

        const query = new URLSearchParams({ ids: userIds.join(',') });
        return this.request('GET', `/api/users/profiles?${query.toString()}`, {
            accessToken,
        });
    }

    // ME
    getProfile(accessToken: string): Promise<unknown> {
        return this.request('GET', '/api/me/profile', { accessToken });
    }

    updateProfile(accessToken: string, body: ProfileDto): Promise<unknown> {
        return this.request('PATCH', '/api/me/profile', { accessToken, body });
    }

    getAvailability(accessToken: string): Promise<AvailabilityDto> {
        return this.request('GET', '/api/me/availability', { accessToken });
    }

    updateAvailability(
        accessToken: string,
        body: AvailabilityDto,
    ): Promise<AvailabilityDto> {
        return this.request('PATCH', '/api/me/availability', {
            accessToken,
            body,
        });
    }

    getNotifications(accessToken: string): Promise<NotificationsDto> {
        return this.request('GET', '/api/me/notifications', { accessToken });
    }

    updateNotifications(
        accessToken: string,
        body: NotificationsDto,
    ): Promise<NotificationsDto> {
        return this.request('PATCH', '/api/me/notifications', {
            accessToken,
            body,
        });
    }

    // HEALTH
    async checkHealth(): Promise<void> {
        await this.request('GET', '/actuator/health');
    }

    private request<T>(
        method: HttpMethod,
        path: string,
        options?: RequestOptions,
    ): Promise<T> {
        return this.http.request<T>(method, path, options);
    }
}
