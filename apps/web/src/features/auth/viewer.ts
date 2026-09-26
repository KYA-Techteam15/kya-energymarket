/** Ce que l'interface sait de la personne connectée : le strict nécessaire, sans secret. */
export interface Viewer {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  readonly staffRoles: readonly string[];
  readonly isStaff: boolean;
  /** Organisation active ; `visible` seulement pour une organisation d'entreprise (spec 002, FR-002). */
  readonly organization: {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly visible: boolean;
  } | null;
}
