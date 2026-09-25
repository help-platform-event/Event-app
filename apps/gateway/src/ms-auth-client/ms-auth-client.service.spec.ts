import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { MsAuthClient } from './ms-auth-client.service';

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('MsAuthClient', () => {
    const fetchMock = jest.fn();
    let client: MsAuthClient;

    beforeEach(() => {
        process.env.MS_AUTH_URL = 'http://ms-auth:8080/';
        global.fetch = fetchMock;
        fetchMock.mockReset();
        client = new MsAuthClient();
    });

    describe('requests', () => {
        it('POSTs the login body as JSON and returns the token pair', async () => {
            fetchMock.mockResolvedValue(
                jsonResponse(200, { accessToken: 'a', refreshToken: 'r' }),
            );

            const result = await client.login({
                email: 'john@doe.fr',
                password: 'secret',
            });

            expect(result).toEqual({ accessToken: 'a', refreshToken: 'r' });
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe('http://ms-auth:8080/api/auth/login');
            expect(init.method).toBe('POST');
            expect(init.headers['Content-Type']).toBe('application/json');
            expect(init.headers.Authorization).toBeUndefined();
            expect(JSON.parse(init.body)).toEqual({
                email: 'john@doe.fr',
                password: 'secret',
            });
        });

        it('forwards the bearer and sends the refresh token on logout', async () => {
            fetchMock.mockResolvedValue(jsonResponse(204));

            await client.logout('access', 'refresh');

            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe('http://ms-auth:8080/api/auth/logout');
            expect(init.headers.Authorization).toBe('Bearer access');
            expect(JSON.parse(init.body)).toEqual({ refreshToken: 'refresh' });
        });

        it('builds the batch profiles query and skips the call for no ids', async () => {
            fetchMock.mockResolvedValue(jsonResponse(200, []));

            await client.getProfiles('access', ['a', 'b']);
            const empty = await client.getProfiles('access', []);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][0]).toBe(
                'http://ms-auth:8080/api/users/profiles?ids=a%2Cb',
            );
            expect(empty).toEqual([]);
        });

        it('sends no body for a GET', async () => {
            fetchMock.mockResolvedValue(jsonResponse(200, { monday: true }));

            await client.getAvailability('access');

            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe('http://ms-auth:8080/api/me/availability');
            expect(init.method).toBe('GET');
            expect(init.body).toBeUndefined();
            expect(init.headers['Content-Type']).toBeUndefined();
        });
    });

    describe('error translation', () => {
        it.each([
            [400, 'Address must be complete'],
            [401, 'Invalid credentials'],
            [404, 'User not found'],
            [409, 'Email already in use'],
        ])(
            'turns a %i ProblemDetail into an HttpException carrying its detail',
            async (status, detail) => {
                fetchMock.mockResolvedValue(
                    jsonResponse(status, {
                        type: 'about:blank',
                        title: 'Error',
                        status,
                        detail,
                    }),
                );

                const error = await client
                    .login({ email: 'john@doe.fr', password: 'x' })
                    .catch((e: unknown) => e);

                expect(error).toBeInstanceOf(HttpException);
                expect((error as HttpException).getStatus()).toBe(status);
                expect((error as HttpException).getResponse()).toEqual({
                    message: detail,
                });
            },
        );

        it('falls back to the title when the ProblemDetail has no detail', async () => {
            fetchMock.mockResolvedValue(
                jsonResponse(403, { title: 'Forbidden', status: 403 }),
            );

            const error = await client
                .getUsers('access')
                .catch((e: unknown) => e);

            expect((error as HttpException).getStatus()).toBe(403);
            expect((error as HttpException).getResponse()).toEqual({
                message: 'Forbidden',
            });
        });

        it('reads the Spring Boot error body used for Security refusals', async () => {
            fetchMock.mockResolvedValue(
                jsonResponse(403, {
                    timestamp: '2026-09-25T08:00:00Z',
                    status: 403,
                    error: 'Forbidden',
                    path: '/api/users',
                }),
            );

            const error = await client
                .getUsers('access')
                .catch((e: unknown) => e);

            expect((error as HttpException).getResponse()).toEqual({
                message: 'Forbidden',
            });
        });

        it('keeps the status when the error body is empty', async () => {
            fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

            const error = await client
                .getProfile('bad')
                .catch((e: unknown) => e);

            expect((error as HttpException).getStatus()).toBe(401);
        });

        it('returns 503 when ms-auth is unreachable', async () => {
            fetchMock.mockRejectedValue(new TypeError('fetch failed'));

            await expect(client.checkHealth()).rejects.toBeInstanceOf(
                ServiceUnavailableException,
            );
        });
    });
});
