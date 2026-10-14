require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Autoriser la lecture des requêtes JSON
app.use(express.json({ limit: '20kb' }));

// Servir les fichiers du site
app.use(express.static(__dirname));

// Page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Vérifier que le serveur fonctionne
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Ensemble pour leurs pattes'
  });
});

// Assistant IA Gemini : Patte
app.post('/api/chat', async (req, res) => {
  const message =
    typeof req.body?.message === 'string'
      ? req.body.message.trim()
      : '';

  // Vérifier le message reçu
  if (!message || message.length > 1500) {
    return res.status(400).json({
      error: 'Écris un message de 1 à 1500 caractères.'
    });
  }

  // Récupérer la clé API depuis les variables d'environnement
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Configuration Gemini manquante : GEMINI_API_KEY');

    return res.status(503).json({
      error:
        'L’assistant IA est en cours de configuration. Réessaie plus tard.'
    });
  }

  // Modèle Gemini configuré dans Railway
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Construire l'URL de l'API Gemini
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    // Envoyer le message à Gemini
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `
Tu es Patte, l'assistant virtuel de « Ensemble pour leurs pattes ».

Ton rôle est d'aider les personnes qui souhaitent protéger les animaux
blessés, abandonnés ou en difficulté.

Règles :
- Réponds en français par défaut.
- Sois bienveillant, poli, clair et encourageant.
- Explique comment prendre soin des animaux.
- Aide les visiteurs à comprendre le fonctionnement du site.
- Propose des moyens responsables d'aider les animaux.
- Ne prétends jamais qu'un don a été effectué ou reçu sans confirmation.
- Ne demande jamais de mot de passe, de clé API ou de coordonnées bancaires.
- Pour une urgence animale, recommande de contacter un vétérinaire
  ou un service local adapté.
- Si tu ne connais pas une information, dis-le honnêtement.
              `.trim()
            }
          ]
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: message
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    // Lire la réponse de Google une seule fois
    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }

    // Afficher les détails des erreurs dans les journaux Railway
    if (!response.ok) {
      const errorCode = data.error?.code || response.status;
      const errorStatus = data.error?.status || 'UNKNOWN';
      const errorMessage =
        data.error?.message || 'Aucun détail fourni par Google';

      console.error('Erreur Gemini :', {
        httpStatus: response.status,
        errorCode,
        errorStatus,
        errorMessage,
        model
      });

      // Message adapté selon le type d'erreur
      if (response.status === 429) {
        return res.status(503).json({
          error:
            'Patte reçoit trop de demandes ou la limite d’utilisation de l’IA est atteinte. Réessaie plus tard.'
        });
      }

      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          error:
            'Le service IA rencontre un problème de configuration. Réessaie plus tard.'
        });
      }

      if (response.status === 404) {
        return res.status(502).json({
          error:
            'Le modèle IA configuré est introuvable. Vérifie le nom du modèle dans Railway.'
        });
      }

      if (response.status === 503 || response.status === 504) {
        return res.status(503).json({
          error:
            'Le service IA est temporairement indisponible. Réessaie dans quelques instants.'
        });
      }

      return res.status(502).json({
        error:
          'Patte ne peut pas répondre pour le moment. Réessaie plus tard.'
      });
    }

    // Extraire la réponse de Gemini
    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('')
        .trim();

    // Vérifier que Gemini a bien fourni une réponse
    if (!reply) {
      console.error(
        'Réponse Gemini vide ou bloquée :',
        JSON.stringify({
          model,
          finishReason: data.candidates?.[0]?.finishReason,
          promptFeedback: data.promptFeedback
        })
      );

      return res.status(502).json({
        error:
          'Patte n’a pas pu préparer une réponse. Essaie de reformuler ta question.'
      });
    }

    // Retourner la réponse au site
    return res.json({
      reply
    });

  } catch (error) {
    // Erreur réseau ou problème inattendu
    console.error('Erreur du service IA :', error.message);

    return res.status(500).json({
      error:
        'Impossible de contacter le service IA pour le moment. Réessaie plus tard.'
    });
  }
});

// Paiements désactivés tant que ViaziPay n'est pas configuré
app.post('/api/donations/checkout', (req, res) => {
  return res.status(503).json({
    error:
      'Le paiement en ligne est en cours de configuration. Aucun paiement n’a été effectué.'
  });
});

// Gérer les routes inconnues de l'API
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Cette route API est introuvable.'
  });
});

// Gestion générale des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur serveur :', error.message);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: 'Une erreur interne est survenue.'
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(
    `Modèle Gemini configuré : ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`
  );
});
