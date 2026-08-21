// api/contact.js
// Fonction serverless Vercel : reçoit les données du formulaire de diagnostic,
// envoie une notification interne à SoppalDigital, ET un email de confirmation
// automatique au client — via l'API Resend (https://resend.com).
//
// CONFIGURATION REQUISE (voir README-BACKEND.md pour le détail) :
//   1. Créer un compte gratuit sur https://resend.com
//   2. Récupérer une clé API (commence par "re_...")
//   3. Dans Vercel : Project Settings > Environment Variables
//      Ajouter : RESEND_API_KEY = re_votre_cle_ici
//   4. Redéployer le projet pour que la variable soit prise en compte
//
// ⚠️ LIMITATION IMPORTANTE (mode sandbox Resend) :
// Tant que votre domaine (soppaldigital.sn) n'est pas vérifié sur Resend,
// vous ne pouvez envoyer des emails QUE vers l'adresse avec laquelle vous
// vous êtes inscrit sur Resend (ici s.dia1317@gmail.com). L'email de
// confirmation au client échouera silencieusement pour toute autre adresse
// tant que le domaine n'est pas vérifié — voir section 6 du README-BACKEND.md.
// La notification interne (vers vous) continuera de fonctionner normalement.

export default async function handler(req, res) {
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

    const requiredFields = ['nom', 'email', 'telephone', 'organisation', 'secteur', 'besoin'];
    for (const field of requiredFields) {
      if (!data[field] || String(data[field]).trim() === '') {
        return res.status(400).json({ error: `Le champ "${field}" est requis.` });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    const outilsActuels = Array.isArray(data.outils_actuels) && data.outils_actuels.length
      ? data.outils_actuels.join(', ')
      : 'Non précisé';
    const services = Array.isArray(data.services) && data.services.length
      ? data.services.join(', ')
      : 'Non précisé';

    const prenomClient = String(data.nom).trim().split(' ')[0];

    // ═══════════════════════════════════════════════════════
    // EMAIL 1 : Notification interne (vers vous)
    // ═══════════════════════════════════════════════════════
    const emailNotificationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#0F2044; padding:20px 24px; border-radius:12px 12px 0 0; text-align:center;">
          <img src="https://soppaldigital.vercel.app/assets/logo-email.png" alt="SoppalDigital" width="180" style="display:block; margin:0 auto 14px; border:0;" />
          <h2 style="color:#F4C542; margin:0; font-size:18px;">🎯 Nouvelle demande de diagnostic</h2>
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

    // ═══════════════════════════════════════════════════════
    // EMAIL 2 : Confirmation automatique envoyée au client
    // ═══════════════════════════════════════════════════════
    const emailConfirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#0F2044; padding:32px 28px; border-radius:12px 12px 0 0; text-align:center;">
          <img src="https://soppaldigital.vercel.app/assets/logo-email.png" alt="SoppalDigital" width="200" style="display:block; margin:0 auto; border:0;" />
        </div>
        <div style="background:#ffffff; padding:32px 28px; border:1px solid #E5E7EB; border-top:none;">
          <h2 style="color:#0F2044; margin-top:0;">Bonjour ${escapeHtml(prenomClient)}, 👋</h2>

          <p style="font-size:15px; color:#333; line-height:1.7;">
            Nous avons bien reçu votre demande de diagnostic pour
            <strong>${escapeHtml(data.organisation)}</strong>. Merci pour votre confiance !
          </p>

          <p style="font-size:15px; color:#333; line-height:1.7;">
            Voici ce qui va se passer maintenant :
          </p>

          <div style="background:#F0F5FF; border-radius:10px; padding:20px; margin:20px 0;">
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0; vertical-align:top; width:32px; font-size:18px;">1️⃣</td>
                <td style="padding:8px 0; font-size:14px; color:#0F2044;"><strong>Sous 24h</strong> — Nous étudions votre demande et vous recontactons.</td>
              </tr>
              <tr>
                <td style="padding:8px 0; vertical-align:top; font-size:18px;">2️⃣</td>
                <td style="padding:8px 0; font-size:14px; color:#0F2044;"><strong>Sous 48h</strong> — Vous recevez votre diagnostic gratuit et, si pertinent, une première maquette.</td>
              </tr>
              <tr>
                <td style="padding:8px 0; vertical-align:top; font-size:18px;">3️⃣</td>
                <td style="padding:8px 0; font-size:14px; color:#0F2044;"><strong>Sans engagement</strong> — Vous décidez librement de la suite.</td>
              </tr>
            </table>
          </div>

          <h3 style="color:#0F2044; border-bottom:2px solid #F4C542; padding-bottom:6px; font-size:15px;">
            📋 Récapitulatif de votre demande
          </h3>
          <p style="font-size:14px; color:#555; line-height:1.8;">
            <strong>Organisation :</strong> ${escapeHtml(data.organisation)}<br/>
            <strong>Secteur :</strong> ${escapeHtml(data.secteur)}<br/>
            <strong>Services souhaités :</strong> ${escapeHtml(services)}<br/>
            <strong>Mode de contact préféré :</strong> ${escapeHtml(data.mode_contact || 'Non précisé')}
          </p>

          <p style="font-size:14px; color:#555; line-height:1.7; margin-top:20px;">
            Une question en attendant ? Répondez directement à cet email, ou contactez-nous
            sur WhatsApp — nous répondons rapidement, même le week-end.
          </p>

          <div style="margin-top:24px; text-align:center;">
            <a href="https://wa.me/221772213677" style="display:inline-block; background:#25D366; color:white; text-decoration:none; font-weight:bold; padding:12px 28px; border-radius:8px; font-size:14px;">
              💬 Nous écrire sur WhatsApp
            </a>
          </div>
        </div>
        <div style="background:#0F2044; padding:20px 28px; border-radius:0 0 12px 12px; text-align:center;">
          <p style="color:rgba(255,255,255,0.5); font-size:12px; margin:0;">
            SoppalDigital · Transformation digitale · Dakar, Sénégal<br/>
            📞 77 221 36 77 · ✉️ s.dia1317@gmail.com
          </p>
        </div>
      </div>
    `;

    // ═══════════════════════════════════════════════════════
    // Envoi des deux emails en parallèle via Resend
    // ═══════════════════════════════════════════════════════
    const fromAddress = 'SoppalDigital <onboarding@resend.dev>';
    // ⚠️ Une fois soppaldigital.sn vérifié sur Resend, remplacez par :
    // const fromAddress = 'SoppalDigital <contact@soppaldigital.sn>';

    const [notifResult, confirmResult] = await Promise.allSettled([
      // Email 1 : notification interne — critique, doit réussir
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [DEST_EMAIL],
          reply_to: data.email,
          subject: `🎯 Nouveau diagnostic — ${data.organisation} (${data.secteur})`,
          html: emailNotificationHtml
        })
      }),
      // Email 2 : confirmation au client — best-effort
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [data.email],
          reply_to: DEST_EMAIL,
          subject: `✅ Votre demande de diagnostic a bien été reçue — SoppalDigital`,
          html: emailConfirmationHtml
        })
      })
    ]);

    // La notification interne est critique : si elle échoue, on renvoie une erreur
    const notifOk = notifResult.status === 'fulfilled' && notifResult.value.ok;
    if (!notifOk) {
      const detail = notifResult.status === 'fulfilled'
        ? await notifResult.value.text()
        : String(notifResult.reason);
      console.error('Échec de la notification interne Resend:', detail);
      return res.status(502).json({ error: "Échec de l'envoi de l'email." });
    }

    // La confirmation client est best-effort : on logue un avertissement si elle échoue,
    // mais on ne fait pas échouer toute la requête (le plus important — vous être notifié —
    // a fonctionné). Cause la plus fréquente d'échec ici : domaine non vérifié sur Resend.
    const confirmOk = confirmResult.status === 'fulfilled' && confirmResult.value.ok;
    if (!confirmOk) {
      const detail = confirmResult.status === 'fulfilled'
        ? await confirmResult.value.text()
        : String(confirmResult.reason);
      console.warn(
        "L'email de confirmation client n'a pas pu être envoyé (souvent : domaine non " +
        "vérifié sur Resend, voir README-BACKEND.md section 6). Détail :", detail
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Demande envoyée avec succès.',
      confirmationClientEnvoyee: confirmOk
    });

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
