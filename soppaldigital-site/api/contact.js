// api/contact.js
// Fonction serverless Vercel : reçoit les données du formulaire de diagnostic
// et envoie un email de notification via l'API Resend (https://resend.com).
//
// CONFIGURATION REQUISE (voir README-BACKEND.md pour le détail) :
//   1. Créer un compte gratuit sur https://resend.com
//   2. Récupérer une clé API (commence par "re_...")
//   3. Dans Vercel : Project Settings > Environment Variables
//      Ajouter : RESEND_API_KEY = re_votre_cle_ici
//   4. Redéployer le projet pour que la variable soit prise en compte

export default async function handler(req, res) {
  // Autoriser uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const DEST_EMAIL = process.env.CONTACT_EMAIL || 's.dia1317@gmail.com';

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY manquante dans les variables d\'environnement Vercel.');
    return res.status(500).json({
      error: "Configuration serveur incomplète. Contactez l'administrateur du site."
    });
  }

  try {
    const data = req.body;

    // Validation minimale côté serveur (ne jamais faire confiance uniquement au client)
    const requiredFields = ['nom', 'email', 'telephone', 'organisation', 'secteur', 'besoin'];
    for (const field of requiredFields) {
      if (!data[field] || String(data[field]).trim() === '') {
        return res.status(400).json({ error: `Le champ "${field}" est requis.` });
      }
    }

    // Validation basique du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    // Construction du contenu HTML de l'email de notification
    const outilsActuels = Array.isArray(data.outils_actuels) && data.outils_actuels.length
      ? data.outils_actuels.join(', ')
      : 'Non précisé';
    const services = Array.isArray(data.services) && data.services.length
      ? data.services.join(', ')
      : 'Non précisé';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#0F2044; padding:24px; border-radius:12px 12px 0 0;">
          <h2 style="color:#F4C542; margin:0;">🎯 Nouvelle demande de diagnostic — SoppalDigital</h2>
        </div>
        <div style="background:#f9f9f9; padding:24px; border-radius:0 0 12px 12px;">

          <h3 style="color:#0F2044; border-bottom:2px solid #F4C542; padding-bottom:6px;">📋 Organisation</h3>
          <p><strong>Nom :</strong> ${escapeHtml(data.organisation)}</p>
          <p><strong>Secteur :</strong> ${escapeHtml(data.secteur)}</p>
          <p><strong>Taille :</strong> ${escapeHtml(data.taille || 'Non précisé')}</p>
          <p><strong>Localisation :</strong> ${escapeHtml(data.localisation || 'Non précisé')}</p>
          <p><strong>Outils actuels :</strong> ${escapeHtml(outilsActuels)}</p>

          <h3 style="color:#0F2044; border-bottom:2px solid #F4C542; padding-bottom:6px; margin-top:24px;">💡 Projet</h3>
          <p><strong>Services souhaités :</strong> ${escapeHtml(services)}</p>
          <p><strong>Besoin décrit :</strong><br/>${escapeHtml(data.besoin).replace(/\n/g, '<br/>')}</p>
          <p><strong>Budget indicatif :</strong> ${escapeHtml(data.budget || 'Non précisé')}</p>
          <p><strong>Délai souhaité :</strong> ${escapeHtml(data.delai || 'Non précisé')}</p>

          <h3 style="color:#0F2044; border-bottom:2px solid #F4C542; padding-bottom:6px; margin-top:24px;">👤 Contact</h3>
          <p><strong>Nom :</strong> ${escapeHtml(data.nom)}</p>
          <p><strong>Poste :</strong> ${escapeHtml(data.poste || 'Non précisé')}</p>
          <p><strong>Email :</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
          <p><strong>Téléphone :</strong> <a href="tel:${escapeHtml(data.telephone)}">${escapeHtml(data.telephone)}</a></p>
          <p><strong>Mode de contact préféré :</strong> ${escapeHtml(data.mode_contact || 'Non précisé')}</p>
          <p><strong>Source :</strong> ${escapeHtml(data.source || 'Non précisé')}</p>

          <div style="margin-top:24px; padding:16px; background:#25D366; border-radius:8px; text-align:center;">
            <a href="https://wa.me/${escapeHtml(data.telephone).replace(/[^0-9]/g, '')}" style="color:white; text-decoration:none; font-weight:bold;">
              💬 Contacter sur WhatsApp
            </a>
          </div>
        </div>
      </div>
    `;

    // Envoi de l'email via l'API Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // ⚠️ IMPORTANT : "onboarding@resend.dev" ne fonctionne qu'en mode test.
        // Une fois votre domaine soppaldigital.sn vérifié sur Resend, remplacez par :
        // from: 'SoppalDigital <contact@soppaldigital.sn>'
        from: 'SoppalDigital <onboarding@resend.dev>',
        to: [DEST_EMAIL],
        reply_to: data.email,
        subject: `🎯 Nouveau diagnostic — ${data.organisation} (${data.secteur})`,
        html: emailHtml
      })
    });

    if (!resendResponse.ok) {
      const errorDetail = await resendResponse.text();
      console.error('Erreur Resend:', errorDetail);
      return res.status(502).json({ error: "Échec de l'envoi de l'email." });
    }

    return res.status(200).json({ success: true, message: 'Demande envoyée avec succès.' });

  } catch (error) {
    console.error('Erreur serveur /api/contact:', error);
    return res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
}

// Échappe les caractères HTML pour éviter toute injection dans l'email
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
