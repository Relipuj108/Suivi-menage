# Planning ménage - GitHub + Supabase

## Fichiers
- index.html
- style.css
- app.js
- config.js
- schema.sql

## Mise en place

### 1. Supabase
Créer un projet Supabase.

Dans SQL Editor, coller le contenu de `schema.sql` puis exécuter.

### 2. Clé API
Créer un fichier `config.js` avec :

```js
const SUPABASE_URL = "https://TON-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "TA_CLE_PUBLIQUE_ANON"@@@LIMELETTE@@@;
