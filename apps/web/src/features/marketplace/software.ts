import { m } from '@/paraglide/messages.js';

/** Logiciels de la marketplace. La spécification 004 remplacera cette liste par le catalogue en base. */
export interface SoftwareSummary {
  readonly id: string;
  readonly name: string;
  readonly kind: () => string;
  readonly available: boolean;
  /** Monogramme affiché tant que le logiciel n'a pas de logo. */
  readonly mono?: string;
  readonly logo?: string;
}

export const SOFTWARE: readonly SoftwareSummary[] = [
  {
    id: 'kya-soldesign',
    name: 'KYA-SolDesign',
    kind: () => m.software_ksd_kind(),
    available: true,
    logo: '/images/ksd-mark.png',
  },
  { id: 'kya-ecolabel', name: 'KYA-EcoLabel', kind: () => m.software_pending_kind(), available: false, mono: 'EL' },
  {
    id: 'kya-businessmodel',
    name: 'KYA-BusinessModel',
    kind: () => m.software_pending_kind(),
    available: false,
    mono: 'BM',
  },
  { id: 'kya-solmonitor', name: 'KYA-SolMonitor', kind: () => m.software_pending_kind(), available: false, mono: 'SM' },
];
