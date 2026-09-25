# Dépôt et branches

Dépôt : `KYA-Techteam15/kya-energymarket` (GitHub). Même flux que kya-platform et KYA-SolDesign.

```text
main  ──●────────────────●──────────   versions publiées, étiquette vX.Y.Z sur chaque commit
         \              /
dev       ●──●────●────●──────●──────   intégration
              \  /      \    /
feat-001-…     ●●        \  /           une branche par spécification (specs/001-…)
feat-002-…                ●●
```

- `feat-NNN-nom` part de `dev` et y revient par pull request, `pnpm verify` vert.
- Seule `dev` ouvre une pull request vers `main`.
- Tout commit de `main` reçoit une étiquette SemVer annotée ; pousser une étiquette `v*` = publier,
  seulement à la demande du responsable.
- Protection de `main` et `dev` à activer dès que le plan GitHub le permet : pas de poussée directe,
  vérifications obligatoires, revue.

## Numérotation

Spécifications séquentielles `001`, `002`… La branche `feat-000-fondations` a posé la documentation,
Spec Kit et les maquettes.
