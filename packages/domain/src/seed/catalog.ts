import type { LocalizedText } from '@kya-em/db';

/**
 * Contenu initial du catalogue (spec 004, FR-010 ; 005b), repris de `design/v5` et de PRODUCT.md. Les prix
 * ne sont pas fixés : ceux-ci sont les valeurs d'exemple de la maquette, marqués « prix exemple ».
 */
export interface SeedProduct {
  readonly slug: string;
  readonly name: string;
  readonly status: 'available' | 'soon' | 'hidden';
  readonly sort: number;
  readonly kind: LocalizedText;
  readonly summary: LocalizedText;
  readonly logo?: string;
  readonly monogram?: string;
  readonly features?: readonly { key: string; label: LocalizedText }[];
  /** Codes d'édition que le logiciel connaît. */
  readonly softwareEditions?: readonly string[];
  readonly editions?: readonly {
    code: string;
    name: LocalizedText;
    audience: LocalizedText;
    watermark: LocalizedText | null;
    graceDays: number;
    maxSeats: number | null;
    maxProjects: number | null;
    features: readonly string[];
    types: readonly {
      name: LocalizedText;
      days: number;
      pricePerSeat: number;
      /** Essai gratuit du logiciel (spec 006) : masqué, hors vente, un poste. */
      trial?: boolean;
    }[];
  }[];
}

const ALL = [
  'system.aio',
  'sizing.optimize',
  'documents.pricing',
  'documents.word',
  'lifecycle.issue',
  'catalog.userEquipment',
];

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  {
    slug: 'kya-soldesign',
    name: 'KYA-SolDesign',
    status: 'available',
    sort: 1,
    kind: { fr: 'Dimensionnement de systèmes solaires autonomes', en: 'Off-grid solar system sizing' },
    summary: {
      fr: 'Du site au schéma unifilaire : fiabilité technique et accessibilité économique pour décider, devis pour le client, documents techniques pour les techniciens.',
      en: 'From the site to the single-line diagram: technical reliability and economic affordability to decide, a quote for the customer, technical documents for the technicians.',
    },
    logo: '/images/ksd-mark.png',
    softwareEditions: ['commercial', 'academic', 'student'],
    features: [
      { key: 'system.aio', label: { fr: 'Parcours complet et calculs', en: 'Full workflow and calculations' } },
      {
        key: 'sizing.optimize',
        label: { fr: 'Optimisation sur vos références de matériel', en: 'Optimisation on your equipment references' },
      },
      { key: 'documents.pricing', label: { fr: 'Devis et prix de vente', en: 'Quotes and selling prices' } },
      { key: 'documents.word', label: { fr: 'Export Word des documents', en: 'Word export of documents' } },
      {
        key: 'lifecycle.issue',
        label: { fr: 'Émission et révisions du dossier', en: 'Issuing and revising the file' },
      },
      {
        key: 'catalog.userEquipment',
        label: { fr: 'Votre matériel ajouté au catalogue', en: 'Your equipment added to the catalogue' },
      },
    ],
    editions: [
      {
        code: 'commercial',
        name: { fr: 'Commerciale', en: 'Commercial' },
        audience: {
          fr: 'Bureaux d’études, installateurs, institutions',
          en: 'Engineering firms, installers, institutions',
        },
        watermark: null,
        graceDays: 7,
        maxSeats: 50,
        maxProjects: null,
        features: ALL,
        types: [
          { name: { fr: '1 mois', en: '1 month' }, days: 30, pricePerSeat: 25_000 },
          { name: { fr: '1 trimestre', en: '3 months' }, days: 91, pricePerSeat: 65_000 },
          { name: { fr: '1 an', en: '1 year' }, days: 365, pricePerSeat: 220_000 },
          { name: { fr: 'Essai 14 jours', en: '14-day trial' }, days: 14, pricePerSeat: 0, trial: true },
        ],
      },
      {
        code: 'academic',
        name: { fr: 'Académique', en: 'Academic' },
        audience: { fr: 'Écoles et universités', en: 'Schools and universities' },
        watermark: { fr: 'Académique', en: 'Academic' },
        graceDays: 3,
        maxSeats: 200,
        maxProjects: null,
        features: ['system.aio', 'sizing.optimize', 'documents.word', 'lifecycle.issue', 'catalog.userEquipment'],
        types: [{ name: { fr: '1 an', en: '1 year' }, days: 365, pricePerSeat: 90_000 }],
      },
      {
        code: 'student',
        name: { fr: 'Étudiant', en: 'Student' },
        audience: { fr: 'Pour apprendre et préparer ses projets', en: 'To learn and prepare your projects' },
        watermark: { fr: 'Étudiant', en: 'Student' },
        graceDays: 0,
        maxSeats: 1,
        maxProjects: 5,
        features: ['system.aio'],
        types: [
          { name: { fr: '1 jour', en: '1 day' }, days: 1, pricePerSeat: 1_500 },
          { name: { fr: '1 mois', en: '1 month' }, days: 30, pricePerSeat: 7_500 },
        ],
      },
    ],
  },
  ...(
    [
      ['kya-ecolabel', 'KYA-EcoLabel', 'EL', 2],
      ['kya-businessmodel', 'KYA-BusinessModel', 'BM', 3],
      ['kya-solmonitor', 'KYA-SolMonitor', 'SM', 4],
    ] as const
  ).map(([slug, name, monogram, sort]) => ({
    slug,
    name,
    status: 'soon' as const,
    sort,
    monogram,
    kind: { fr: 'Description à fournir', en: 'Description to come' },
    summary: { fr: 'Présentation à venir.', en: 'Presentation coming soon.' },
  })),
];

/** Images livrées avec l'application, enregistrées dans la médiathèque avec leur texte alternatif. */
export const SEED_IMAGES: readonly {
  path: string;
  alt: LocalizedText;
  credit?: LocalizedText;
  width: number;
  height: number;
}[] = [
  {
    path: '/images/hero.jpg',
    alt: { fr: 'Installation solaire au soleil couchant', en: 'Solar installation at sunset' },
    credit: { fr: 'Photo d’illustration', en: 'Illustration photo' },
    width: 2200,
    height: 1238,
  },
  {
    path: '/images/terrain.jpg',
    alt: { fr: 'Un technicien sous une rangée de panneaux solaires', en: 'A technician under a row of solar panels' },
    credit: { fr: 'Photo d’illustration', en: 'Illustration photo' },
    width: 1400,
    height: 933,
  },
  {
    path: '/images/predim.webp',
    alt: {
      fr: 'Écran de prédimensionnement de KYA-SolDesign sur le projet exemple : système minimal fiable, SRI 0,903, SVI 0,84',
      en: 'KYA-SolDesign pre-sizing screen on the example project: minimal reliable system, SRI 0.903, SVI 0.84',
    },
    width: 1600,
    height: 1000,
  },
  {
    path: '/images/besoins.webp',
    alt: { fr: 'Bilan des consommations du projet exemple', en: 'Load assessment of the example project' },
    width: 1600,
    height: 1000,
  },
  {
    path: '/images/materiel.webp',
    alt: { fr: 'Dimensionnement avec le catalogue de matériel', en: 'Sizing with the equipment catalogue' },
    width: 1600,
    height: 1000,
  },
  {
    path: '/images/chiffrage.webp',
    alt: { fr: 'Évaluation financière et prix de vente', en: 'Financial assessment and selling price' },
    width: 1600,
    height: 1000,
  },
  {
    path: '/images/unifilaire.webp',
    alt: {
      fr: 'Schéma unifilaire du projet exemple produit par KYA-SolDesign',
      en: 'Single-line diagram of the example project produced by KYA-SolDesign',
    },
    width: 1800,
    height: 1246,
  },
  {
    path: '/images/ksd-mark.png',
    alt: { fr: 'Logo de KYA-SolDesign', en: 'KYA-SolDesign logo' },
    width: 160,
    height: 131,
  },
];
