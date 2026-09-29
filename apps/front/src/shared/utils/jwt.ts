/**
 * Whether a JWT expires within `seconds`. Reads the `exp` claim without verifying the signature:
 * only the server can trust a token, the client just uses this to refresh it in time.
 */
export function expiresWithin(token: string, seconds: number): boolean {
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const { exp } = JSON.parse(atob(payload)) as { exp?: number };
        return exp !== undefined && exp * 1000 - Date.now() < seconds * 1000;
    } catch {
        return true;
    }
}
