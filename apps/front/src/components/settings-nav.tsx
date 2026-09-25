// components/settings-nav.tsx
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router';

const navOptions = [
    { id: 'profil', label: 'Profil', path: 'profil' },
    { id: 'disponibilites', label: 'Mes disponibilités', path: 'disponibilites' },
    { id: 'securite', label: 'Sécurité', path: 'securite' },
    { id: 'notifications', label: 'Notifications', path: 'notifications' },
];

export function SettingsNav() {
    return (
        <nav className="flex flex-col gap-1">
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Compte
            </p>
            {navOptions.map((option) => (
                <NavLink
                    key={option.id}
                    to={`/settings/${option.path}`}
                    className={({ isActive }) =>
                        cn(
                            'rounded-md px-3 py-1.5 text-sm transition-colors',
                            isActive
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )
                    }
                >
                    {option.label}
                </NavLink>
            ))}
        </nav>
    );
}
