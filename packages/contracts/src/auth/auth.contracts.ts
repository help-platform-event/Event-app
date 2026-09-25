import { z } from "zod";

// ROLES
export const RoleSchema = z.enum(["USER", "ADMIN"]);
export type Role = z.infer<typeof RoleSchema>;

// PASSWORD
export const PasswordSchema = z
	.string()
	.min(8, "Le mot de passe doit contenir au moins 8 caractères.")
	.refine((val) => (val.match(/\d/g) ?? []).length >= 2, {
		message: "Le mot de passe doit contenir au moins 2 chiffres",
	})
	.refine((val) => (val.match(/[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/g) ?? []).length >= 2, {
		message: "Le mot de passe doit contenir au moins 2 caractères spéciaux",
	});

export const ChangePasswordSchema = z
	.object({
		currentPassword: PasswordSchema,
		newPassword: PasswordSchema,
		confirmPassword: z.string(),
	})
	.superRefine((data, ctx) => {
		if (data.newPassword !== data.confirmPassword) {
			ctx.addIssue({
				path: ["confirmPassword"],
				code: z.ZodIssueCode.custom,
				message: "Les mots de passe ne correspondent pas",
			});
		}
	});

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

//Règles pour l'affichange dynamique pendant la saisie
export const passwordRules = (password: string) => ({
	length: password.length >= 8,
	numbers: (password.match(/\d/g) || []).length >= 2,
	specials: (password.match(/[^A-Za-z0-9]/g) || []).length >= 2,
});

// SIGNUP
export const SignupRequestSchema = z.object({
	firstName: z.string().trim().min(1, "Le prénom est requis."),
	lastName: z.string().trim().min(1, "Le nom est requis."),
	email: z.string().email(),
	password: PasswordSchema,
});
export type SignupRequestDto = z.infer<typeof SignupRequestSchema>;

export const SignupFormSchema = SignupRequestSchema.extend({
	confirmPassword: z.string(),
}).superRefine((data, ctx) => {
	if (data.password !== data.confirmPassword) {
		ctx.addIssue({
			path: ["confirmPassword"],
			message: "Les mots de passe ne correspondent pas",
			code: z.ZodIssueCode.custom,
		});
	}
});
export type SignupFormDto = z.infer<typeof SignupFormSchema>;

// SIGNIN
export const LoginRequestSchema = z.object({
	email: z.string().email("Adresse email invalide"),
	password: z.string().min(1, "Le mot de passe est requis."),
});

export const LoginResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
});

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;
export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;

// ME USER
const UserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	role: RoleSchema,
});

export const MeResponseSchema = z.object({
	user: UserSchema,
});

export type CurrentUserData = z.infer<typeof UserSchema>;
export type MeResponseDto = z.infer<typeof MeResponseSchema>;
