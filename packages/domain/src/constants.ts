/**
 * Constantes du domaine sans aucune dépendance (spec 005b) : l'interface les importe par
 * `@kya-em/domain/constants` sans embarquer le reste du domaine (base, cryptographie) dans le
 * navigateur. Le domaine les réutilise : une seule source.
 */

/** Natures d'un type de licence (classement des statistiques). */
export const NATURES = ['sale', 'trial', 'free', 'education', 'partner'] as const;

/** Canaux d'émission d'une licence. */
export const CHANNELS = ['purchase', 'trial', 'staff', 'batch', 'partner'] as const;

/** Vues prêtes de la liste des licences. */
export const LICENSE_VIEWS = ['all', 'expiring', 'purchased', 'offered', 'trials', 'waiting', 'revoked'] as const;
export type LicenseViewName = (typeof LICENSE_VIEWS)[number];

/** Périodes du tableau de bord, en jours. */
export const PERIODS = { '30j': 30, '90j': 90, '365j': 365 } as const;
export type Period = keyof typeof PERIODS;
