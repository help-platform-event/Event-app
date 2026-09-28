import {
    HttpException,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Corps d'erreur RFC 9457 (`ProblemDetail`) renvoyé par les services Java. Les refus de Spring
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

export type HttpMethod = 'GET' | 'POST' | 'PATCH';

export interface RequestOptions {
    body?: unknown;
    accessToken?: string;
}

/**
 * Appel HTTP JSON vers un service interne (ms-auth-java, ms-notification-java), partagé par leurs
 * clients.
 *
 * Toute réponse non-2xx est traduite en `HttpException` avec le `detail` du `ProblemDetail` comme
 * message : le `HttpExceptionFilter` global la remet ensuite au format d'erreur habituel de la
 * Gateway (`{ message, statusCode, timestamp, path }`), donc le Front ne voit aucune différence.
 * Service injoignable → 503.
 */
export class ServiceHttpClient {
    private readonly logger: Logger;
    private readonly baseUrl: string;

    /**
     * @param serviceName nom du service, pour les logs
     * @param baseUrl URL de base du service (un `/` final est ignoré)
     * @param unavailableMessage message renvoyé au Front quand le service est injoignable
     */
    constructor(
        private readonly serviceName: string,
        baseUrl: string,
        private readonly unavailableMessage: string,
    ) {
        this.logger = new Logger(`${serviceName}-client`);
        this.baseUrl = baseUrl.replace(/\/+$/, '');
    }

    async request<T>(
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
                `${this.serviceName} injoignable (${method} ${path})`,
                error instanceof Error ? error.message : error,
            );
            throw new ServiceUnavailableException(this.unavailableMessage);
        }

        const text = await response.text();

        if (!response.ok) {
            throw toHttpException(response, text);
        }

        return (text ? JSON.parse(text) : undefined) as T;
    }
}

function toHttpException(response: Response, text: string): HttpException {
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
