import { NavLink } from 'react-router';

export default function SettingsOptions() {
    const navOptions = [
        { id: 'profil', label: 'Profil', path: 'profil' },
        { id: 'disponibilites', label: 'Mes disponibilités', path: 'disponibilites' },
        { id: 'securite', label: 'Sécurité', path: 'securite' },
        { id: 'notifications', label: 'Notifications', path: 'notifications' },
    ];

    return (
        <nav>
            <ul className="list rounded-box border border-base-300 bg-base-100 shadow-sm">
                {navOptions.map((option) => (
                    <li key={option.id}>
                        <NavLink
                            to={`/settings/${option.path}`}
                            className={({ isActive }) =>
                                `list-row flex items-center no-underline transition-colors hover:bg-base-200 ${
                                    isActive
                                        ? 'bg-base-200 font-semibold text-base-content'
                                        : 'text-base-content/80'
                                }`
                            }
                        >
                            {option.label}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
