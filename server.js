const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '2mb' }));

// Servir le site
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Login.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  dest: path.join(__dirname, 'public/asset')
});

/* ---------------------------------------------------
   Helpers
--------------------------------------------------- */
function getUser(req) {
  // Récupère l'utilisateur depuis body, query ou header
  return (req.body && req.body.utilisateur)
      || (req.query && req.query.utilisateur)
      || req.header('x-user')
      || '';
}

function normalizeName(s) {
  return (s || '').trim().toLowerCase();
}

function findIndexByName(arr, name) {
  const target = normalizeName(name);
  return arr.findIndex(i => normalizeName(i.nom) === target);
}

function findByName(arr, name) {
  const idx = findIndexByName(arr, name);
  return { idx, item: idx >= 0 ? arr[idx] : null };
}

/* ---------------------------------------------------
   Auth: réservé à hedi
--------------------------------------------------- */
function onlyHedi(req, res, next) {
  const user = getUser(req);
  if (user !== 'hedi') {
    return res.status(403).json({ error: 'Accès non autorisé (réservé à hedi)' });
  }
  next();
}

/* ---------------------------------------------------
   Parfums
--------------------------------------------------- */

// Récupérer tous les parfums
app.get('/api/parfums', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  res.json(data.parfums);
});

// Ajouter un parfum (hedi)
app.post('/api/parfums', upload.single('image'), onlyHedi, (req, res) => {
  const { nom, description, prix, marque, taille, dateAchat, occasions, type } = req.body;
  const imageFile = req.file;

  if (!nom || !description || !prix || !imageFile) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  // Renommer fichier
  const ext = path.extname(imageFile.originalname);
  const newFilename = `${Date.now()}_${nom.replace(/\s+/g, '_')}${ext}`;
  const newPath = path.join(imageFile.destination, newFilename);
  fs.renameSync(imageFile.path, newPath);

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  const parfum = {
    nom,
    description,
    image: `asset/${newFilename}`,
    prix: parseFloat(prix),
    marque,
    taille,
    dateAchat,
    occasions,
    type,
    notes: [],
    tenacite: {
      "médiocre": 0,
      "faible": 0,
      "modéré (e)": 0,
      "longue tenue": 0,
      "très longue tenue": 0
    },
    sillage: {
      "discret": 0,
      "modéré (e)": 0,
      "puissant": 0,
      "énorme": 0
    },
    votes: {
      tenacite: {},
      sillage: {}
    }
  };

  data.parfums.push(parfum);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

  res.json(parfum);
});

// Noter un parfum (ouvert)
app.post('/api/parfums/:nom/note', (req, res) => {
  const { utilisateur, note } = req.body;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const { item: parfum } = findByName(data.parfums, req.params.nom);

  if (parfum) {
    const index = parfum.notes.findIndex(n => n.utilisateur === utilisateur);
    if (index !== -1) parfum.notes[index].note = note;
    else parfum.notes.push({ utilisateur, note });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return res.json({ message: 'Note enregistrée' });
  }
  res.status(404).json({ error: 'Parfum introuvable' });
});

// Voter (ouvert)
app.post('/api/parfums/:nom/vote', (req, res) => {
  const { type, valeur, utilisateur } = req.body;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const { item: parfum } = findByName(data.parfums, req.params.nom);

  if (!parfum || !['tenacite', 'sillage'].includes(type)) {
    return res.status(400).json({ error: 'Paramètres invalides' });
  }
  if (!(valeur in parfum[type])) return res.status(400).json({ error: 'Valeur invalide' });
  if (!utilisateur || utilisateur.trim() === '') return res.status(400).json({ error: 'Nom utilisateur manquant' });

  if (!parfum.votes) parfum.votes = { tenacite: {}, sillage: {} };

  const ancienVote = parfum.votes[type][utilisateur];
  if (ancienVote && ancienVote !== valeur) {
    parfum[type][ancienVote]--;
  }

  parfum[type][valeur]++;
  parfum.votes[type][utilisateur] = valeur;

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  res.json({ message: 'Vote enregistré' });
});

// Supprimer un parfum (hedi)
app.delete('/api/parfums/:nom', onlyHedi, (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const idx = findIndexByName(data.parfums, req.params.nom);

  if (idx !== -1) {
    const parfum = data.parfums[idx];
    const imagePath = path.join(__dirname, 'public', parfum.image || '');
    if (parfum.image && fs.existsSync(imagePath)) {
      try { fs.unlinkSync(imagePath); } catch (err) { console.error(err); }
    }
    data.parfums.splice(idx, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return res.json({ message: 'Parfum supprimé' });
  }
  res.status(404).json({ error: 'Parfum introuvable' });
});

// Modifier un parfum (hedi)
app.put('/api/parfums/:ancienNom', onlyHedi, (req, res) => {
  const { nom, description, prix, marque, taille, dateAchat, occasions, type } = req.body;

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const idx = findIndexByName(data.parfums, req.params.ancienNom);
  if (idx === -1) return res.status(404).json({ error: 'Parfum introuvable' });

  const parfum = data.parfums[idx];
  parfum.nom = nom;
  parfum.description = description;
  parfum.prix = parseFloat(prix);
  parfum.marque = marque;
  parfum.taille = taille;
  parfum.dateAchat = dateAchat;
  parfum.occasions = occasions;
  parfum.type = type;

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  res.json({ message: 'Parfum modifié', parfum });
});

/* ---------------------------------------------------
   Futurs achats (CRUD)
--------------------------------------------------- */

// Récupérer tous
app.get('/api/futurs-achats', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  res.json(data.futursAchats || []);
});

// Ajouter (hedi)
app.post('/api/futurs-achats', onlyHedi, (req, res) => {
  const { nom, marque, prix, prioritaire } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom manquant' });

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!data.futursAchats) data.futursAchats = [];

  // Évite les doublons (case/espaces ignorés)
  if (findIndexByName(data.futursAchats, nom) !== -1) {
    return res.status(400).json({ error: 'Ce parfum est déjà dans la liste.' });
  }

  data.futursAchats.push({ nom: nom.trim(), marque, prix, prioritaire: !!prioritaire });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  res.json({ message: 'Ajouté !' });
});

// Supprimer (hedi)
app.delete('/api/futurs-achats/:nom', onlyHedi, (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!data.futursAchats) data.futursAchats = [];

  const idx = findIndexByName(data.futursAchats, req.params.nom);
  if (idx === -1) return res.status(404).json({ error: 'Futur achat introuvable' });

  data.futursAchats.splice(idx, 1);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  res.json({ message: 'Supprimé !' });
});

// Mettre à jour (hedi)
app.put('/api/futurs-achats/:nom', onlyHedi, (req, res) => {
  const { marque, prix, prioritaire } = req.body;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!data.futursAchats) data.futursAchats = [];

  const { idx, item } = findByName(data.futursAchats, req.params.nom);
  if (!item) return res.status(404).json({ error: 'Futur achat introuvable' });

  if (marque !== undefined) item.marque = marque;
  if (prix !== undefined) item.prix = prix;
  if (prioritaire !== undefined) item.prioritaire = !!prioritaire;

  data.futursAchats[idx] = item;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  res.json({ message: 'Modifié', item });
});

// Lancer le serveur
app.listen(3000, () => {
  console.log('Serveur en ligne : http://localhost:3000');
});
