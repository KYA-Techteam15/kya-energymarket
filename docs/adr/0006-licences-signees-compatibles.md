# ADR 0006 — Licences signées ECDSA compatibles avec KYA-SolDesign

- **Statut** : acceptée · **Date** : 2026-09-25

## Contexte

KYA-SolDesign 1.2 vérifie déjà hors ligne des jetons ECDSA P-256 et appelle une API d'administration
aujourd'hui simulée.

## Décision

La plateforme émet exactement le format de jeton attendu par le logiciel et expose les routes décrites
dans le [contrat KYA-SolDesign](../architecture/contrat-kya-soldesign.md). La clé privée reste dans
les secrets du serveur ; sa clé publique est embarquée dans le logiciel (T061).

## Conséquences

- Le logiciel passe à l'API réelle sans changer ses écrans.
- Une rotation de clé demande une version du logiciel qui accepte l'ancienne et la nouvelle clé.
- Les autres logiciels réutiliseront le même mécanisme.
