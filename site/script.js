async function chargerParfums() {
  const res = await fetch('/api/parfums');
  const parfums = await res.json();
  return parfums;
}

async function ajouterParfum(nom) {
  const res = await fetch('/api/parfums', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom })
  });
  return res;
}

async function noterParfum(nom, utilisateur, note) {
  const res = await fetch(`/api/parfums/${encodeURIComponent(nom)}/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utilisateur, note: parseInt(note) })
  });
  return res;
}

async function majInterface() {
  const parfums = await chargerParfums();
  const select = document.getElementById('select-produit');
  const classement = document.getElementById('classement-produits');
  select.innerHTML = '';
  classement.innerHTML = '';

  parfums.forEach(p => {
    const option = document.createElement('option');
    option.value = p.nom;
    option.textContent = p.nom;
    select.appendChild(option);
  });

  const notesAvecMoyenne = parfums.map(p => {
    const moyenne = p.notes.length ? p.notes.reduce((a, b) => a + b.note, 0) / p.notes.length : 0;
    return { nom: p.nom, moyenne };
  }).sort((a, b) => b.moyenne - a.moyenne);

  notesAvecMoyenne.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.nom} (${p.moyenne.toFixed(2)})`;
    classement.appendChild(li);
  });
}

function afficherMessage(msg, isError = false) {
  const msgEl = document.getElementById('msg');
  msgEl.textContent = msg;
  msgEl.style.color = isError ? 'red' : 'lime';
}

document.getElementById('btn-ajouter').onclick = async () => {
  const nom = document.getElementById('input-produit').value.trim();
  if (nom) {
    const res = await ajouterParfum(nom);
    if (res.ok) {
      afficherMessage("Parfum ajouté !");
      await majInterface();
    } else {
      const data = await res.json();
      afficherMessage(data.error || "Erreur lors de l'ajout", true);
    }
    document.getElementById('input-produit').value = '';
  }
};

document.getElementById('btn-noter').onclick = async () => {
  const nom = document.getElementById('select-produit').value;
  const utilisateur = document.getElementById('input-utilisateur').value.trim();
  const note = document.getElementById('input-note').value;
  if (nom && utilisateur && note) {
    const res = await noterParfum(nom, utilisateur, note);
    if (res.ok) {
      afficherMessage("Note enregistrée !");
      await majInterface();
    } else {
      const data = await res.json();
      afficherMessage(data.error || "Erreur lors de la notation", true);
    }
    document.getElementById('input-utilisateur').value = '';
    document.getElementById('input-note').value = '';
  }
};

window.onload = majInterface;
