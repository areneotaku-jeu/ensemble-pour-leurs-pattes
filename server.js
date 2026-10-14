require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Autoriser la lecture des requêtes JSON
app.use(express.json({ limit: '20kb' }));

// Servir les fichiers du site depuis le dossier du projet
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

// Assistant IA Gemini
app.post('/api/chat', async (req, res) => {
  const message =
    typeof req.body?.message === 'string'
      ? req.body.message.trim()
      : '';

  if (!message || message.length > 1500) {
    return res.status(400).json({
      error: 'Écris un message de 1 à 1500 caractères.'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({
      reply:
        'Bonjour ! 🐾 Je suis Patte, l’assistant de Ensemble pour leurs pattes. Mon service IA est en cours de configuration. En attendant, explique-moi ce que tu souhaites savoir sur la protection des animaux.'
    });
  }

  try {
    const model =
      process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              'Tu es Patte, assistant de Ensemble pour leurs pattes, un projet de soutien aux animaux blessés et abandonnés. Réponds avec bienveillance, en français par défaut. Explique comment aider les animaux et comment utiliser le site. Ne prétends jamais qu’un don a été payé ou reçu sans confirmation du serveur. Ne demande jamais de mot de passe, de clé API ou de coordonnées bancaires. Pour une urgence animale, conseille de contacter un vétérinaire ou un service local adapté.'
          }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: message }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Gemini :', response.status);

      return res.status(502).json({
        error:
          'Le service IA est momentanément indisponible. Réessaie plus tard.'
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('')
        .trim();

    if (!reply) {
      return res.status(502).json({
        error: 'Aucune réponse reçue. Réessaie plus tard.'
      });
    }

    return res.json({ reply });

  } catch (error) {
    console.error('Erreur du service IA :', error.message);

    return res.status(500).json({
      error: 'Erreur temporaire. Réessaie plus tard.'
    });
  }
});

// Paiements : désactivés tant que ViaziPay n'est pas configuré
app.post('/api/donations/checkout', (req, res) => {
  res.status(503).json({
    error:
      'Le paiement en ligne est en cours de configuration. Aucun paiement n’a été effectué.'
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
