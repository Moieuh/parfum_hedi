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

app.get('/api/parfums', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(data.parfums);
});

app.post('/api/parfums', upload.single('image'), (req, res) => {
  const { nom, description, prix } = req.body;
  const imageFile = req.file;

  if (!nom || !description || !prix || !imageFile) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  // Renommer le fichier pour garder l’extension
  const ext = path.extname(imageFile.originalname);
  const newFilename = `${Date.now()}_${nom.replace(/\s+/g, '_')}${ext}`;
  const newPath = path.join(imageFile.destination, newFilename);

  fs.renameSync(imageFile.path, newPath);

  // Charger/parfums depuis data.json
  const dataPath = path.join(__dirname, 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const parfum = {
    nom,
    description,
    image: `asset/${newFilename}`,
    prix: parseFloat(prix),
    notes: []
  };
  data.parfums.push(parfum);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json(parfum);
});

app.post('/api/parfums/:nom/note', (req, res) => {
  const { utilisateur, note } = req.body;
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  const parfum = data.parfums.find(p => p.nom === req.params.nom);
  if (parfum) {
    parfum.notes.push({ utilisateur, note });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ message: 'Note ajoutée' });
  } else {
    res.status(404).json({ error: 'Parfum non trouvé' });
  }
});

app.listen(3000, () => {
  console.log('Serveur en ligne : http://localhost:3000');
});

app.delete('/api/parfums/:nom', (req, res) => {
  const nom = req.params.nom;
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  const index = data.parfums.findIndex(p => p.nom === nom);
  if (index !== -1) {
    data.parfums.splice(index, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ message: 'Parfum supprimé' });
  } else {
    res.status(404).json({ error: 'Parfum non trouvé' });
  }
});
