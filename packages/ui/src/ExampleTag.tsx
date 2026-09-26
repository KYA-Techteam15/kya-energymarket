/** Étiquette portée par toute valeur provisoire (prix, chiffre, témoignage) : jamais présentée comme réelle. */
export function ExampleTag({ label }: { label: string }) {
  return <span className="kya-ex">{label}</span>;
}
