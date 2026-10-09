# Corrections et installation — Finition ERP

## Corrections de cette livraison

- `/dashboard` affiche maintenant un tableau de bord de pilotage : trésorerie cumulée, prestations facturées, créances clients, chantiers actifs, raccourcis métier, documents récents et chantiers récents.
- Les composants d'import/export ne sont plus utilisés sur le tableau de bord. L'import/export reste accessible dans `/import-export`.
- Le calcul des indicateurs de facturation utilise les factures validées, partiellement payées ou payées et exclut les brouillons et les documents annulés.
- Le calcul des sommes de factures est réalisé sur les factures correspondantes de l'entreprise et non sur la seule liste des documents récents.
- Les styles du tableau de bord ont été ajoutés et adaptés aux écrans mobiles.
- Le README indique maintenant la migration de trésorerie `0012_treasury_ledger.sql`.

## Installation prudente

1. Faites une sauvegarde de votre dossier de projet.
2. Décompressez l'archive dans un dossier temporaire.
3. Copiez les fichiers du projet corrigé vers le projet de travail en conservant les chemins. N'écrasez pas votre dossier `.git` et ne supprimez pas les fichiers de configuration propres à votre environnement.
4. Vérifiez les variables d'environnement Supabase dans votre projet local et sur Vercel. Ne partagez jamais les clés secrètes.
5. Dans le terminal à la racine du projet, exécutez :
   - `npm install`
   - `npm run typecheck`
   - `npm run build`
6. Corrigez les éventuelles erreurs avant le commit. Après un commit réussi, poussez sur GitHub et vérifiez le déploiement Vercel.

## Important concernant Git

Cette archive ne contient volontairement pas `.git`. Le ZIP source reçu contenait des fichiers de métadonnées Git dupliqués (par exemple `main (2)`), cohérents avec l'erreur `fatal: bad object refs/heads/main (2)`. Inclure ces métadonnées dans une nouvelle archive risquerait de propager le problème. Le dépôt Git local et son historique doivent être préservés séparément.

## Vérification réalisée ici

- 47 fichiers TypeScript/TSX ont été analysés par le transpileur TypeScript : aucune erreur de syntaxe détectée.
- L'installation des dépendances a dépassé le délai disponible dans cet environnement. Le contrôle complet `npm run typecheck` et la compilation de production `npm run build` n'ont donc pas pu être confirmés ici.
