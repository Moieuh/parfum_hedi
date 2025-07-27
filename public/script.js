async function chargerParfums() {
  const res = await fetch('/api/parfums');
  const parfums = await res.json();
  return parfums;
}

async function ajouterParfum(nom, description, imageFile, prix) {
  const formData = new FormData();
  formData.append('nom', nom);
  formData.append('description', description);
  formData.append('image', imageFile);
  formData.append('prix', prix);

  return await fetch('/api/parfums', {
    method: 'POST',
    body: formData
  });
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
  if (select && classement) {
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
}

function afficherMessage(msg, isError = false) {
  const msgEl = document.getElementById('msg');
  if (msgEl) {
    msgEl.textContent = msg;
    msgEl.style.color = isError ? 'red' : 'lime';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-ajout');
  const btnOpen = document.getElementById('ouvrir-formulaire');
  const btnClose = document.querySelector('.modal .close');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => {
      modal.style.display = 'block';
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  document.getElementById('btn-ajouter')?.addEventListener('click', async () => {
    const nom = document.getElementById('input-produit').value.trim();
    const description = document.getElementById('input-description').value.trim();
    const fichier = document.getElementById('input-image').files[0];
    const prix = document.getElementById('input-prix').value.trim();

    if (!fichier) {
      afficherMessage("Veuillez sélectionner une image.", true);
      return;
    }

    if (nom && description && fichier && prix) {
      const res = await ajouterParfum(nom, description, fichier, prix);
      if (res.ok) {
        afficherMessage("Parfum ajouté !");
        // On suppose que le backend retourne le parfum ajouté avec le chemin image
        const parfumAjoute = await res.json();
        ajouterCarteParfum(parfumAjoute);
        document.getElementById('modal-ajout').style.display = 'none';
      } else {
        let data;
        try {
          data = await res.json();
        } catch (e) {
          afficherMessage("Erreur serveur : impossible de lire la réponse.", true);
          return;
        }
        afficherMessage(data.error || "Erreur lors de l'ajout", true);
      }

      document.getElementById('input-produit').value = '';
      document.getElementById('input-description').value = '';
      document.getElementById('input-image').value = null;
      document.getElementById('input-prix').value = '';
    }
  });

  document.getElementById('btn-noter')?.addEventListener('click', async () => {
    const nom = document.getElementById('select-produit').value;
    const utilisateur = document.getElementById('input-utilisateur').value.trim();
    const note = document.getElementById('input-note').value;
    if (nom && utilisateur && note) {
      const res = await noterParfum(nom, utilisateur, note);
      if (res.ok) {
        afficherMessage("Note enregistrée !");
        await majInterface();
      } else {
      let data;
      try {
        data = await res.json();
      } catch (e) {
        afficherMessage("Erreur serveur : impossible de lire la réponse.", true);
        return;
      }
        afficherMessage(data.error || "Erreur lors de la notation", true);
      }
      document.getElementById('input-utilisateur').value = '';
      document.getElementById('input-note').value = '';
    }
  });

  afficherCollection();
  majInterface();
});

async function supprimerParfum(nom) {
  const res = await fetch(`/api/parfums/${encodeURIComponent(nom)}`, {
    method: 'DELETE'
  });
  if (res.ok) {
    document.querySelector(`.card2[data-produit="${nom}"]`)?.remove();
  } else {
    const data = await res.json();
    alert(data.error || 'Erreur lors de la suppression');
  }
}

async function afficherCollection() {
  const parfums = await chargerParfums();
  const container = document.getElementById('cards-container');
  if (!container) return;
  container.innerHTML = '';
  parfums.forEach(p => {
    ajouterCarteParfum(p);
  });
}

function ajouterCarteParfum(p) {
  const container = document.getElementById('cards-container');
  const card = document.createElement('div');
  card.className = 'card2';
  card.setAttribute('data-produit', p.nom);

  const content = document.createElement('div');
  content.className = 'card2-content';

  const img = document.createElement('img');
  img.src = p.image || '';
  img.alt = 'Parfum';

  const info = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = p.nom;
  const desc = document.createElement('p');
  desc.textContent = p.description || '';
  const prix = document.createElement('p');
  prix.textContent = p.prix ? `Prix : ${parseFloat(p.prix).toFixed(2)} €` : '';

  info.appendChild(h2);
  info.appendChild(desc);
  info.appendChild(prix);
  content.appendChild(img);
  content.appendChild(info);

  const btn = document.createElement('button');
  btn.className = 'btn-supprimer';
  btn.setAttribute('data-nom', p.nom);
  btn.textContent = 'Supprimer';
  btn.onclick = () => {
    if (confirm(`Supprimer le parfum "${p.nom}" ?`)) {
      supprimerParfum(p.nom);
    }
  };

  card.appendChild(content);
  card.appendChild(btn);
  container.appendChild(card);
}
