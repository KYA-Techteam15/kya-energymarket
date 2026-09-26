/**
 * Icônes de la maquette v5 : un seul trait, dessinées sur une grille de 16, sans police d'icônes ni
 * glyphe Unicode. Décoratives par défaut (`aria-hidden`) ; le libellé vient du bouton ou du lien.
 */
const PATHS = {
  go: 'M5 11l6-6M6 5h5v5',
  down: 'M4 6l4 4 4-4',
  right: 'M6 3.5L10.5 8 6 12.5',
  left: 'M10 3.5L5.5 8l4.5 4.5',
  menu: 'M2.5 5h11M2.5 11h11',
  close: 'M4 4l8 8M12 4l-8 8',
  plus: 'M8 3v10M3 8h10',
  check: 'M3.5 8.5l3 3 6-7',
  globe:
    'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM2 8h12M8 2c1.7 1.6 2.5 3.6 2.5 6S9.7 12.4 8 14M8 2C6.3 3.6 5.5 5.6 5.5 8s.8 4.4 2.5 6',
  download: 'M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10',
  shield: 'M8 1.8l5 1.9v3.8c0 3.3-2.1 5.7-5 6.8-2.9-1.1-5-3.5-5-6.8V3.7zM5.8 8l1.6 1.6 3-3.1',
  sun: 'M8 10.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3',
  mail: 'M2 4h12v8.5H2zM2.3 4.3L8 8.8l5.7-4.5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `kya-icon ${className}` : 'kya-icon'}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
