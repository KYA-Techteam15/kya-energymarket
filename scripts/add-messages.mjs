// Ajoute des messages aux catalogues Paraglide (apps/web/messages/{fr,en}.json) sans toucher aux existants.
// Usage : node scripts/add-messages.mjs chemin/vers/lot.json  — le lot a la forme { "cle": { "fr": "...", "en": "..." } }.
import { readFileSync, writeFileSync } from 'node:fs';

const batch = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const locale of ['fr', 'en']) {
  const file = new URL(`../apps/web/messages/${locale}.json`, import.meta.url);
  const messages = JSON.parse(readFileSync(file, 'utf8'));
  let added = 0;
  for (const [key, value] of Object.entries(batch)) {
    if (!(key in messages)) added += 1;
    messages[key] = value[locale];
  }
  writeFileSync(file, `${JSON.stringify(messages, null, 2)}\n`);
  console.log(`${locale}.json : ${added} message(s) ajouté(s)`);
}
