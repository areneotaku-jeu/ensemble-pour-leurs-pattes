# Ensemble pour leurs pattes

Site responsive inspiré de la maquette fournie, avec assistant Patte connecté à l'API Gemini côté serveur.

## Déploiement Railway
1. Envoyer ce dossier dans un dépôt GitHub (racine du dépôt : `package.json`, `server.js`, `public/`).
2. Dans Railway, créer un service depuis le dépôt GitHub. Railway détectera Node.js et exécutera `npm start`.
3. Dans le service Railway > Variables, ajouter `GEMINI_API_KEY` avec la clé créée dans Google AI Studio. Ne jamais placer la clé dans `public/` ou dans GitHub.
4. Optionnel : ajouter `GEMINI_MODEL=gemini-2.5-flash` si ce modèle est disponible pour votre clé et votre quota.
5. Générer un domaine public dans les réglages Networking/Domains.
6. Vérifier `https://VOTRE-DOMAINE/api/health` et tester l'assistant.

## Paiements ViaziPay
Les paiements sont volontairement désactivés dans cette version. Le bouton de don affiche un message d'information et l'API de checkout renvoie une réponse 503. Avant d'accepter de vrais dons, il faut implémenter l'endpoint officiel ViaziPay à partir de la documentation actuelle, ajouter les secrets dans Railway Variables, configurer une URL webhook HTTPS, vérifier les notifications côté serveur et tester en environnement de test. Ne jamais considérer une redirection navigateur comme preuve de paiement.

## Exécution locale
- Installer Node.js 18 ou plus récent.
- `npm install`
- Copier `.env.example` vers `.env` et ajouter `GEMINI_API_KEY` si disponible.
- `npm start`
- Ouvrir `http://localhost:3000`.

L'assistant dispose d'une réponse de secours si aucune clé Gemini n'est configurée. Les limites et conditions de l'offre Gemini gratuite dépendent de Google et peuvent changer.
