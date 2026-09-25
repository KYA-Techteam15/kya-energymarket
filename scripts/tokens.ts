// Écrit packages/ui/styles/tokens.css depuis les jetons de la charte KYA.
import { writeFileSync } from 'node:fs';
import { renderTokensCss } from '../packages/ui/src/tokens.ts';

const target = new URL('../packages/ui/styles/tokens.css', import.meta.url);
writeFileSync(target, renderTokensCss());
console.log('tokens.css régénéré');
