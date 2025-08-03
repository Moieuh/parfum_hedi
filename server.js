const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  dest: path.join(__dirname, 'public/asset')
});

// Middleware d’autorisation pour hedi
function onlyHedi(req, res, next) {
  const user = req.method === 'DELETE' ? req.body.utilisateur : (req.body.utilisateur || req.body.utilisateur);
  if (user !== 'hedi') {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
  next();
}

// Route : Récupérer tous les parfums
app.get('/api/parfums', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  res.json(data.parfums);
});

// Route : Ajouter un parfum (seul hedi)
app.post('/api/parfums', upload.single('image'), onlyHedi, (req, res) => {
  const { nom, description, prix, marque, taille, dateAchat, occasions, type } = req.body;
  const imageFile = req.file;

  if (!nom || !description || !prix || !imageFile) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  // Renommer le fichier pour garder l’extension
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

// Route : Ajouter une note (pas restreint)
app.post('/api/parfums/:nom/note', (req, res) => {
  const { utilisateur, note } = req.body;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const parfum = data.parfums.find(p => p.nom === req.params.nom);

  if (parfum) {
    const index = parfum.notes.findIndex(n => n.utilisateur === utilisateur);
    if (index !== -1) {
      parfum.notes[index].note = note;
    } else {
      parfum.notes.push({ utilisateur, note });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    res.json({ message: 'Note enregistrée' });
  } else {
    res.status(404).json({ error: 'Parfum non trouvé' });
  }
});

// Route : Voter pour ténacité ou sillage (pas restreint)
app.post('/api/parfums/:nom/vote', (req, res) => {
  const { type, valeur, utilisateur } = req.body;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const parfum = data.parfums.find(p => p.nom === req.params.nom);

  if (!parfum || !['tenacite', 'sillage'].includes(type)) {
    return res.status(400).json({ error: 'Paramètres invalides' });
  }
  if (!(valeur in parfum[type])) {
    return res.status(400).json({ error: 'Valeur invalide' });
  }
  if (!utilisateur || utilisateur.trim() === '') {
    return res.status(400).json({ error: 'Nom utilisateur manquant' });
  }

  if (!parfum.votes) {
    parfum.votes = { tenacite: {}, sillage: {} };
  }

  const ancienVote = parfum.votes[type][utilisateur];
  if (ancienVote && ancienVote !== valeur) {
    parfum[type][ancienVote]--;
  }

  parfum[type][valeur]++;
  parfum.votes[type][utilisateur] = valeur;

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  res.json({ message: 'Vote enregistré' });
});

// Route : Supprimer un parfum + image (seul hedi)
app.delete('/api/parfums/:nom', onlyHedi, (req, res) => {
  const nom = req.params.nom;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const index = data.parfums.findIndex(p => p.nom === nom);

  if (index !== -1) {
    const parfum = data.parfums[index];
    const imagePath = path.join(__dirname, 'public', parfum.image);
    if (fs.existsSync(imagePath)) {
      try { fs.unlinkSync(imagePath); } catch (err) { console.error(err); }
    }

    data.parfums.splice(index, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    res.json({ message: 'Parfum supprimé' });
  } else {
    res.status(404).json({ error: 'Parfum non trouvé' });
  }
});

// Route : Modifier un parfum existant (seul hedi)
app.put('/api/parfums/:ancienNom', onlyHedi, (req, res) => {
  const ancienNom = req.params.ancienNom;
  const { nom, description, prix, marque, taille, dateAchat, occasions, type } = req.body;

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const index = data.parfums.findIndex(p => p.nom === ancienNom);
  if (index === -1) {
    return res.status(404).json({ error: 'Parfum non trouvé' });
  }

  const parfum = data.parfums[index];
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

// Lancer le serveur
app.listen(3000, () => {
  console.log('Serveur en ligne : http://localhost:3000');
});
