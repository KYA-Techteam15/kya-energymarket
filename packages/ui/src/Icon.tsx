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
  x: 'M4 4l8 8M12 4l-8 8',
  copy: 'M5.5 5.5V3.2c0-.4.3-.7.7-.7h6.6c.4 0 .7.3.7.7v6.6c0 .4-.3.7-.7.7h-2.3M3.2 5.5h6.6c.4 0 .7.3.7.7v6.6c0 .4-.3.7-.7.7H3.2c-.4 0-.7-.3-.7-.7V6.2c0-.4.3-.7.7-.7z',
  file: 'M4 1.8h5.2L12 4.6v9.6H4zM9 1.8v3h3',
  home: 'M2.5 7.2L8 2.5l5.5 4.7v6.3h-11zM6.3 13.5V9.4h3.4v4.1',
  receipt: 'M3.5 1.8h9v12.4l-1.8-1.2-1.5 1.2-1.7-1.2-1.7 1.2-1.5-1.2-1.8 1.2zM6 5.5h4M6 8.3h4',
  chat: 'M2.5 3.5h11v7.5H7l-3 2.5V11H2.5z',
  users:
    'M6 7.3a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM1.8 13.5c.4-2.4 2.1-3.8 4.2-3.8s3.8 1.4 4.2 3.8M10.6 2.7a2.3 2.3 0 0 1 0 4.5M12 9.9c1.2.5 2 1.7 2.2 3.6',
  search: 'M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10.6 10.6L14 14',
  phone:
    'M5.5 2.5H4a1.5 1.5 0 0 0-1.5 1.6C3 9.4 6.6 13 11.9 13.5a1.5 1.5 0 0 0 1.6-1.5v-1.5l-2.6-1.1-1.3 1.3a7 7 0 0 1-4.3-4.3l1.3-1.3z',
  play: 'M6 4.5v7l5.5-3.5z',
  coins:
    'M8 2c2.8 0 5 .9 5 2s-2.2 2-5 2-5-.9-5-2 2.2-2 5-2zM3 4v4c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8v4c0 1.1 2.2 2 5 2s5-.9 5-2V8',
  card: 'M1.8 3.5h12.4v9H1.8zM1.8 6.3h12.4M4 10h3',
  mobile: 'M4.5 1.8h7v12.4h-7zM7 12h2',
  lock: 'M3.5 7h9v6.5h-9zM5.3 7V5a2.7 2.7 0 0 1 5.4 0v2',
  book: 'M2.5 3c2-.8 3.8-.6 5.5.6v10c-1.7-1.2-3.5-1.4-5.5-.6zM13.5 3c-2-.8-3.8-.6-5.5.6v10c1.7-1.2 3.5-1.4 5.5-.6z',
  whatsapp:
    'M3 13l.8-2.6A5.6 5.6 0 1 1 6 12.6zM6.2 5.5c-.3.8 0 2 1 3s2.2 1.3 3 1l.4-1-1.2-.7-.6.5c-.6-.3-1.1-.8-1.4-1.4l.5-.6-.7-1.2z',
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
