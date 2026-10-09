# Finition ERP

Application web de gestion intégrée pour une entreprise de finition en construction.

## Stack
- Next.js + TypeScript
- Supabase / PostgreSQL / Auth / RLS
- Vercel
- GitHub
- Supabase Storage pour les documents et pièces jointes

## Modules
1. Tableau de bord
2. Prestations & facturation
3. Matériaux & consommables
4. Achats
5. Contacts
6. Chantiers
7. Caisse & trésorerie
8. Rapports
9. Import / Export
10. Administration

## Démarrage local

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run build
npm run dev
```

## Supabase

Appliquer **dans l'ordre** toutes les migrations de `supabase/migrations/` :

```text
0001_initial_schema.sql
0002_business_automation.sql
0003_core_business_settings.sql
0004_crud_and_audit.sql
0005_sales_purchases_payments.sql
0006_cash_projects.sql
0007_reporting_import_drive.sql
0008_roles_permissions.sql
0009_role_policy_hardening.sql
0010_view_isolation_and_finance_policies.sql
0011_remove_google_drive.sql
0012_treasury_ledger.sql
```

Ne pas exécuter les migrations dans un ordre différent.

## Documents

Les documents et pièces jointes sont prévus pour **Supabase Storage**. La base conserve les métadonnées et le chemin de stockage dans la table `documents`.

## Vercel

Configurer les mêmes variables d'environnement dans le projet Vercel, puis déployer depuis GitHub.

## Important

Le tableau de bord est dédié au pilotage des prestations, des créances, des chantiers et de la trésorerie. L’import/export est disponible uniquement dans le module dédié.

Avant la mise en production, exécuter `npm install`, `npm run typecheck` et `npm run build`. Les dépendances n’ont pas pu être installées dans l’environnement de correction (délai réseau), le build complet n’a donc pas été confirmé ici.

Le ZIP de livraison exclut volontairement `.git` : l’archive source reçue contient des références Git dupliquées et cette métadonnée semble liée à l’erreur `bad object refs/heads/main (2)`. Ne remplacez pas votre dépôt Git par une archive ZIP et ne supprimez pas votre `.git` local. Copiez uniquement les fichiers du projet après avoir conservé une sauvegarde.
