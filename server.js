const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET tous les parfums
app.get('/api/parfums', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(data.parfums);
});

// POST ajouter un parfum
app.post('/api/parfums', (req, res) => {
  const { nom } = req.body;
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  if (!data.parfums.find(p => p.nom === nom)) {
    data.parfums.push({ nom, notes: [] });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ message: 'Parfum ajouté' });
  } else {
    res.status(400).json({ error: 'Parfum existe déjà' });
  }
});

// POST ajouter une note
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

// DELETE un parfum
app.delete('/api/parfums/:nom', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  const index = data.parfums.findIndex(p => p.nom === req.params.nom);
  if (index !== -1) {
    data.parfums.splice(index, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ message: 'Parfum supprimé' });
  } else {
    res.status(404).json({ error: 'Parfum non trouvé' });
  }
});
