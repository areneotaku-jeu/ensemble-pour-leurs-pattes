require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `Tu es Patte, l'assistant du site « Ensemble pour leurs pattes », une initiative de soutien aux animaux blessés, abandonnés ou en détresse. Réponds avec chaleur, brièvement et en français sauf si le visiteur écrit dans une autre langue. Explique comment aider et comment fonctionne le site. N'invente jamais d'animaux, de sommes collectées, de reçus, de partenaires ou de paiements. Tu ne peux pas vérifier ni confirmer un don. Pour un paiement, renvoie vers le bouton officiel « Faire un don » du site. Pour un animal gravement blessé, recommande de contacter rapidement un vétérinaire ou un service local de secours animalier; ne pose pas de diagnostic et ne remplace pas un vétérinaire. Ne demande jamais de mot de passe, de clé API ni de coordonnées bancaires.`;

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Ensemble pour leurs pattes' }));
app.post('/api/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 1500) return res.status(400).json({ error: 'Écrivez un message de 1 à 1500 caractères.' });
  if (!process.env.GEMINI_API_KEY) {
    return res.json({ reply: "Bonjour ! 🐾 Je suis Patte, l'assistant d'Ensemble pour leurs pattes. L'IA n'est pas encore connectée : l'administrateur doit ajouter GEMINI_API_KEY dans les variables d'environnement Railway. En attendant, vous pouvez consulter les rubriques du site et nous aider grâce au bouton « Faire un don »." });
  }
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: [{ role: 'user', parts: [{ text: message }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 500 } })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API error status:', response.status);
      return res.status(502).json({ error: 'Le service IA est momentanément indisponible. Réessayez plus tard.' });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!reply) return res.status(502).json({ error: 'Je ne peux pas répondre pour le moment. Réessayez.' });
    res.json({ reply });
  } catch (err) {
    console.error('Chat service error:', err.message);
    res.status(500).json({ error: 'Erreur temporaire du service. Réessayez plus tard.' });
  }
});

// Le paiement réel n'est volontairement pas simulé : il doit être ajouté et testé avec les identifiants ViaziPay du propriétaire.
app.post('/api/donations/checkout', (_req, res) => res.status(503).json({ error: 'Les paiements ViaziPay ne sont pas encore configurés. Aucun paiement ne doit être considéré comme effectué.' }));

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Site démarré sur le port ${port}`));
