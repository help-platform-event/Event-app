/** « Marie Dupont » → « MD » ; sans nom, la première lettre de l'email (ou « ? »). */
export function initialsOf(name: string, email = ''): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return email.charAt(0).toUpperCase() || '?';
    return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
}
