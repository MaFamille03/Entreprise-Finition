# Contrôle responsive — Finition ERP

## Corrections réalisées
- Le menu latéral devient un panneau ouvrable sur les écrans de largeur inférieure ou égale à 900 px (tablettes en portrait et téléphones).
- Le contenu principal utilise toute la largeur disponible lorsque le menu est en mode panneau.
- La largeur intermédiaire 901–1100 px conserve une barre latérale compacte pour les écrans qui peuvent encore l'afficher.
- Les tableaux restent défilables horizontalement dans leur conteneur au lieu d'élargir toute la page.
- Les grilles, formulaires, cartes, en-têtes et boutons sont adaptés aux écrans étroits.
- Ajout d'un indicateur de focus clavier visible et d'un défilement indépendant pour la navigation latérale.
- Les règles de base pour grand écran sont conservées ; les adaptations sont appliquées par media queries.

## Contrôles effectués
- Vérification de la structure du projet et présence des dossiers `app`, `components`, `lib`, `types` et `supabase/migrations`.
- Vérification statique des accolades CSS : nombre ouvrant et fermant identique.
- Vérification statique de la présence des breakpoints tablette/téléphone et de la règle de mise en page du contenu principal.
- Vérification de l'archive ZIP après création.

## Limites du contrôle
L'installation des dépendances (`npm install`) n'a pas abouti dans l'environnement de travail et les paquets React/Next.js ne sont pas présents. Le contrôle TypeScript ne peut donc pas être validé : il échoue sur l'absence de dépendances, notamment `react/jsx-runtime`, `next` et les paquets Supabase. Aucun test d'exécution dans un vrai navigateur ni test connecté à Supabase/Vercel n'a pu être réalisé ici. Il faudra lancer `npm install`, puis `npm run typecheck` et `npm run build` dans un environnement disposant de l'accès au registre npm avant déploiement.

## Préservation du projet
Les pages métier, les types et les migrations Supabase ont été conservés. Le dossier `.git`, les dépendances installées et le cache de build ne sont pas inclus dans l'archive.
