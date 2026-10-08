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
2. Ventes
3. Stock
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
```

Ne pas exécuter les migrations dans un ordre différent.

## Documents

Les documents et pièces jointes sont prévus pour **Supabase Storage**. La base conserve les métadonnées et le chemin de stockage dans la table `documents`.

## Vercel

Configurer les mêmes variables d'environnement dans le projet Vercel, puis déployer depuis GitHub.

## Important

La vérification statique a été exécutée, mais le build complet n'a pas pu être exécuté dans l'environnement de génération car l'installation de `node_modules` a dépassé le délai disponible. Le projet doit donc être validé avec `npm install`, `npm run typecheck` et `npm run build` dans l'environnement de développement ou CI avant la mise en production.
