import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const sectionVariants = cva('w-full', {
    variants: {
        size: {
            '1': 'py-4',
            '2': 'py-8',
            '3': 'py-12',
            '4': 'py-16',
        },
    },
    defaultVariants: {
        size: '1',
    },
});

export interface SectionProps
    extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof sectionVariants> {}

/**
 * Section — espacement vertical cohérent entre les grandes parties d'une page.
 *
 * Équivalent du Section de Radix Themes. Sert à créer une hiérarchie visuelle
 * claire entre les blocs principaux d'une page (ex: le header de page, la zone
 * de filtres, la liste de résultats) — chacun dans sa propre Section, avec un
 * espacement vertical homogène, sans avoir à choisir un py-X arbitraire chaque fois.
 *
 * Contrairement à Box/Flex/Grid, rend un <section> HTML par défaut (sémantique),
 * pas un <div>.
 *
 * @example
 * <Section size="2">
 *   <h2>Profil</h2>
 *   <ProfileForm />
 * </Section>
 * <Section size="2">
 *   <h2>Sécurité</h2>
 *   <ChangePasswordForm />
 * </Section>
 */
export function Section({ size, className, ...props }: Readonly<SectionProps>) {
    return <section className={cn(sectionVariants({ size }), className)} {...props} />;
}
