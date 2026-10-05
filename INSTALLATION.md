# Rodney Turf Pro — installation

## Contenu

Cette archive contient le code source complet de l’application, les images, la migration de base de données et les fichiers de configuration. Les dépendances installées et les fichiers générés ne sont pas inclus.

## Configuration

1. Installez Bun ou Node.js.
2. Copiez `.env.example` vers `.env`.
3. Créez votre propre backend compatible et renseignez ses valeurs dans `.env`.
4. Appliquez le fichier SQL présent dans `supabase/migrations/`.
5. Définissez un mot de passe administrateur et un secret de session forts.
6. Lancez `bun install`, puis `bun run dev`.

## Sécurité

Aucune clé privée, aucun mot de passe et aucune session utilisateur ne figurent dans l’archive. Une clé privée donne un contrôle total sur les données et doit toujours rester dans la configuration sécurisée du serveur. La clé publique doit elle aussi être remplacée par celle du nouveau backend.
