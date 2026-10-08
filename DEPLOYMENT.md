# Déploiement — Finition ERP

## 1. GitHub

Créer un dépôt GitHub puis pousser le contenu du projet.

## 2. Supabase

Créer un projet Supabase et exécuter les migrations SQL dans l'ordre indiqué dans le README.

Renseigner ensuite les variables Supabase dans l'environnement local et Vercel.

## 3. Supabase Storage

Le stockage documentaire est prévu dans Supabase Storage. Appliquer la migration `0011_remove_google_drive.sql` après les migrations existantes si la base provient d’une version antérieure.

## 4. Vérification

```bash
npm install
npm run typecheck
npm run build
```

## 5. Vercel

Importer le dépôt GitHub dans Vercel et renseigner les variables d'environnement avant le premier déploiement.

## Variables obligatoires

Copier `.env.example` vers `.env.local` et renseigner les variables Supabase. En production, renseigner également `NEXT_PUBLIC_SITE_URL`.
