import { ChangePasswordForm } from './ChangePasswordForm';
import { toastMutation } from '../../../shared/utils/useToastMutation';
import { useChangePassword } from '../hooks/use-settings-section';

export default function SecuritySettings() {
    const changePassword = useChangePassword();

    return (
        <ChangePasswordForm
            onSubmit={async (data) => {
                await toastMutation(changePassword.mutateAsync(data), {
                    loading: 'Chargement...',
                    success: 'Mot de passe modifié avec succès',
                    error: "Impossible d'enregistrer",
                });
            }}
            isSubmitting={changePassword.isPending}
            error={changePassword.isError ? "Impossible d'enregistrer les changements" : undefined}
        />
    );
}
