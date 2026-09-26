/**
 * Paramètres d'adresse lus et écrits comme de simples paramètres d'URL : valeurs gardées en texte,
 * clés répétées gardées répétées. Le format par défaut du routeur (JSON) réécrirait
 * `ba_param=a&ba_param=b` en tableau JSON et casserait la signature des requêtes OAuth que Better
 * Auth place dans l'adresse des pages de connexion et d'autorisation (spec 003).
 */
export function parseSearch(search: string): Record<string, string | string[]> {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    result[key] = values.length > 1 ? values : (values[0] ?? '');
  }
  return result;
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}
