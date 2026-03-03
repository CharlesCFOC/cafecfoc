# CafeCFOC

Application web interne pour un cafe:

- Gestion du stock (`food`, `drink`, `snack`)
- Onglet menu editable (upload image locale, nom, prix par item)
- Caisse simple sans integration paiement
- Envoi de commandes a l'equipe preparation
- Suivi des etapes de preparation en temps reel
- Support de plusieurs devises en parallele
- Planning/taches avec assignation
- Planning service par jour sur 4 semaines (jours cliquables + assignation volontaires)
- Comptes volontaires + page profil
- Notifications temps reel + notifications navigateur

## Lancer

```bash
npm start
```

Puis ouvrir:

- http://localhost:3010

## Supabase (profils + stock)

1. Ouvre SQL Editor de Supabase et execute le script:
   - `supabase/schema.sql`
2. Cree un fichier `.env` a la racine (copie de `.env.example`) avec:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Redemarre le serveur avec `npm start`.

Notes:

- La cle `SERVICE_ROLE` doit rester uniquement cote serveur.
- Si Supabase est actif, l'app persiste les profils (`users`) et le stock (`inventory`) dans Supabase.

## Notes MVP

- Auth basique locale (session cookie)
- Donnees persistees dans `data/store.json` (et profils/stock dans Supabase si configure)
- Temps reel via SSE (`/api/events`)
- Pas de systeme de paiement externe
