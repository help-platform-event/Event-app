/**
 * Permet de gérer la structure du token
 */
export interface JwtPayload {
    /** UUID de l'utilisateur dans ms-auth-java. */
    sub: string;
    email: string;
    role: Role;
    iat?: number;
    exp?: number;
}

export interface SigninResponse {
    accessToken: string;
    refreshToken: string;
}

/** L'utilisateur connecté, tel que l'`AuthGuard` le place dans `request.user`. */
export interface CurrentUserData {
    id: string;
    email: string;
    role: Role;
}

export type Role = 'USER' | 'ADMIN';
