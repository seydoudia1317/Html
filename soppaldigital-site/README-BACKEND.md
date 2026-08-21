# SoppalDigital — Guide de mise en route du backend

Ce document explique comment activer l'envoi réel des demandes de diagnostic
par email, et comment connecter votre nom de domaine `soppaldigital.sn`.

Tout le code est déjà écrit et prêt. Il ne reste que des étapes de
**configuration** (création de compte, copier-coller de clés) — aucune
compétence en programmation n'est nécessaire.

---

## 1. Ce qui a été ajouté au projet

- `api/contact.js` — une fonction serverless qui reçoit les données du
  formulaire de la page Contact et envoie **deux emails** :
  1. Une **notification interne** vers vous (`s.dia1317@gmail.com`) avec
     tous les détails de la demande.
  2. Un **email de confirmation automatique** vers le client, pour le
     rassurer que sa demande a bien été reçue et lui rappeler les
     prochaines étapes.
- `soppaldigital-contact.html` — le formulaire a été modifié pour envoyer
  réellement ses données à `api/contact.js` au lieu de simuler l'envoi.
- `vercel.json` — fichier de configuration Vercel (aucune action requise).

### ⚠️ Limitation actuelle de l'email de confirmation client

Tant que votre domaine `soppaldigital.sn` n'est **pas encore vérifié** sur
Resend, le compte gratuit n'autorise l'envoi que vers **votre propre
adresse** (celle utilisée à l'inscription, `s.dia1317@gmail.com`).

Concrètement, cela veut dire que :
- ✅ La **notification interne** (vers vous) fonctionne déjà normalement.
- ⚠️ L'**email de confirmation au client** échouera silencieusement pour
  toute adresse autre que la vôtre — jusqu'à ce que le domaine soit
  vérifié (voir section 7 : achat et connexion du domaine, puis section 6
  pour la vérification sur Resend).

Ce n'est pas un bug : c'est une protection anti-spam de Resend en mode
gratuit non vérifié. Pour tester dès maintenant, vous pouvez remplir le
formulaire en indiquant **votre propre email** (`s.dia1317@gmail.com`)
comme adresse du client — les deux emails arriveront alors dans la même
boîte, mais avec des sujets et contenus différents (l'un commence par
"🎯 Nouveau diagnostic", l'autre par "✅ Votre demande de diagnostic").

Une fois le domaine vérifié, tout fonctionnera automatiquement vers
n'importe quel client, sans rien changer au code.

---

## 2. Créer un compte Resend (service d'envoi d'emails)

Resend est le service qui enverra réellement les emails. Il est gratuit
jusqu'à 3 000 emails par mois — largement suffisant pour démarrer.

1. Allez sur **https://resend.com**
2. Cliquez sur **Sign Up** et créez un compte (avec Google ou email)
3. Une fois connecté, allez dans le menu **API Keys**
4. Cliquez sur **Create API Key**
   - Nom : `soppaldigital-production`
   - Permission : **Full Access** (ou "Sending access" si proposé)
5. **Copiez la clé générée** (elle commence par `re_...`)
   ⚠️ Cette clé ne s'affiche qu'une seule fois — copiez-la immédiatement
   dans un endroit sûr.

---

## 3. Ajouter la clé dans Vercel

1. Allez sur **https://vercel.com** et ouvrez votre projet SoppalDigital
2. Cliquez sur l'onglet **Settings** (Paramètres)
3. Dans le menu de gauche, cliquez sur **Environment Variables**
4. Ajoutez une nouvelle variable :
   - **Name** : `RESEND_API_KEY`
   - **Value** : collez la clé copiée à l'étape 2 (commence par `re_...`)
   - **Environment** : cochez `Production`, `Preview` et `Development`
5. Cliquez sur **Save**
6. (Optionnel) Ajoutez une deuxième variable pour choisir l'email de
   réception des demandes :
   - **Name** : `CONTACT_EMAIL`
   - **Value** : `s.dia1317@gmail.com` (ou une autre adresse si besoin)

---

## 4. Redéployer le site

Les variables d'environnement ne sont prises en compte qu'après un nouveau
déploiement.

**Si votre projet est connecté à GitHub** (ce qui semble être votre cas) :
1. Poussez (`git push`) le contenu de ce dossier vers votre dépôt GitHub
2. Vercel redéploiera automatiquement le site en quelques secondes
3. Vous pouvez suivre le déploiement dans l'onglet **Deployments** de Vercel

**Ou, sans passer par GitHub :**
1. Dans Vercel, onglet **Deployments**
2. Cliquez sur les trois points `...` du dernier déploiement
3. Cliquez sur **Redeploy**

---

## 5. Tester le formulaire

1. Ouvrez votre site en ligne (`https://votre-projet.vercel.app`)
2. Allez sur la page **Contact**
3. Remplissez le formulaire de diagnostic jusqu'au bout
4. Cliquez sur **Envoyer ma demande de diagnostic**
5. Vérifiez la boîte mail `s.dia1317@gmail.com` (et le dossier Spam,
   au cas où) — vous devriez recevoir un email formaté avec toutes les
   informations du formulaire.

Si une erreur s'affiche dans le formulaire, vérifiez que :
- La variable `RESEND_API_KEY` est bien enregistrée dans Vercel
- Le site a bien été redéployé après l'ajout de la variable
- La clé API commence bien par `re_`

---

## 6. Passer en mode production (important, à faire après les tests)

Par défaut, le code utilise `onboarding@resend.dev` comme expéditeur — une
adresse de test fournie par Resend. Elle fonctionne, mais il est préférable
d'envoyer les emails depuis votre propre domaine une fois qu'il est prêt
(voir section 7 ci-dessous).

Une fois votre domaine `soppaldigital.sn` connecté et vérifié sur Resend :

1. Dans Resend, allez dans **Domains** > **Add Domain**
2. Entrez `soppaldigital.sn` et suivez les instructions pour ajouter les
   enregistrements DNS demandés (voir votre registrar de domaine)
3. Une fois le domaine vérifié (statut "Verified"), ouvrez le fichier
   `api/contact.js` et remplacez la ligne :
   ```
   from: 'SoppalDigital <onboarding@resend.dev>',
   ```
   par :
   ```
   from: 'SoppalDigital <contact@soppaldigital.sn>',
   ```
4. Redéployez le site (voir étape 4)

---

## 7. Acheter et connecter le nom de domaine soppaldigital.sn

Les domaines en `.sn` sont gérés par le **NIC Sénégal**.

1. Allez sur **https://nic.sn**
2. Recherchez la disponibilité de `soppaldigital.sn`
3. Suivez leur procédure d'enregistrement (pièce d'identité et paiement
   requis — comptez généralement entre 15 000 et 30 000 FCFA par an selon
   le registrar utilisé)

Une fois le domaine acheté :

1. Dans Vercel, ouvrez votre projet > **Settings** > **Domains**
2. Cliquez sur **Add Domain**, entrez `soppaldigital.sn`
3. Vercel vous donnera des enregistrements DNS à ajouter (de type `A` ou
   `CNAME`) — copiez-les
4. Retournez sur l'interface de gestion DNS de NIC Sénégal (ou de votre
   registrar) et ajoutez ces enregistrements
5. La propagation DNS peut prendre de quelques minutes à 48h
6. Une fois propagé, votre site sera accessible sur `https://soppaldigital.sn`

**Alternative plus simple :** certains registrars comme Namecheap ou
Cloudflare Registrar permettent d'acheter des domaines `.sn` avec une
interface plus simple et une connexion à Vercel en 2 clics. Renseignez-vous
si le processus NIC Sénégal semble complexe.

---

## Résumé des actions qui vous restent à faire

| # | Action | Durée estimée | Coût |
|---|--------|---------------|------|
| 1 | Créer un compte Resend | 5 min | Gratuit |
| 2 | Copier la clé API dans Vercel | 5 min | Gratuit |
| 3 | Redéployer le site | 2 min | Gratuit |
| 4 | Tester le formulaire | 5 min | Gratuit |
| 5 | Acheter soppaldigital.sn | 15-30 min | ~15 000-30 000 FCFA/an |
| 6 | Connecter le domaine à Vercel | 10 min + propagation | Gratuit |

Le site sera **pleinement fonctionnel dès l'étape 4** — les étapes 5 et 6
concernent uniquement le nom de domaine personnalisé et peuvent attendre.
