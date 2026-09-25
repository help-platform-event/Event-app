import {
    HttpException,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import type {
    AvailabilityDto,
    ChangePasswordDto,
    LoginRequestDto,
    LoginResponseDto,
    NotificationsDto,
    ProfileDto,
    SignupRequestDto,
} from '@app/contracts';

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
 * Corps d'erreur RFC 9457 (`ProblemDetail`) renvoyé par ms-auth-java. Les refus de Spring
 * Security (401/403) passent par la page d'erreur de Spring Boot, qui renvoie à la place
 * `{ timestamp, status, error, path }` : d'où le champ `error`.
 */
interface ProblemDetail {
    type?: string;
    title?: string;
    status?: number;
    detail?: string;
    instance?: string;
    error?: string;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH';

interface RequestOptions {
    body?: unknown;
    accessToken?: string;
}

/**
 * Client HTTP vers ms-auth-java (remplace les appels NATS vers l'ancien ms-auth NestJS).
 *
 * Toute réponse non-2xx est traduite en `HttpException` avec le `detail` du `ProblemDetail`
 * comme message : le `HttpExceptionFilter` global la remet ensuite au format d'erreur habituel
 * de la Gateway (`{ message, statusCode, timestamp, path }`), donc le Front ne voit aucune
 * différence. ms-auth injoignable → 503.
 */
@Injectable()
export class MsAuthClient {
    private readonly logger = new Logger(MsAuthClient.name);
    private readonly baseUrl = (
        process.env.MS_AUTH_URL ?? 'http://localhost:8080'
    ).replace(/\/+$/, '');

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

    private async request<T>(
        method: HttpMethod,
        path: string,
        { body, accessToken }: RequestOptions = {},
    ): Promise<T> {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (error) {
            this.logger.error(
                `ms-auth injoignable (${method} ${path})`,
                error instanceof Error ? error.message : error,
            );
            throw new ServiceUnavailableException(
                "Le service d'authentification est indisponible.",
            );
        }

        const text = await response.text();

        if (!response.ok) {
            throw this.toHttpException(response, text);
        }

        return (text ? JSON.parse(text) : undefined) as T;
    }

    private toHttpException(response: Response, text: string): HttpException {
        let problem: ProblemDetail = {};
        try {
            problem = text ? (JSON.parse(text) as ProblemDetail) : {};
        } catch {
            // Corps non-JSON (ex. erreur d'un proxy) : on retombe sur le statut HTTP.
        }

        // Premier texte non vide : un statusText "" (fréquent en HTTP/1.1) doit être ignoré.
        const message =
            [
                problem.detail,
                problem.title,
                problem.error,
                response.statusText,
            ].find((candidate) => candidate) ?? `HTTP ${response.status}`;

        return new HttpException({ message }, response.status);
    }
}
