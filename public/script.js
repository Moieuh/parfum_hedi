async function chargerParfums() {
  const res = await fetch('/api/parfums');
  const parfums = await res.json();
  return parfums;
}

async function ajouterParfum(nom, description, image, prix) {
  return await fetch('/api/parfums', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom, description, image, prix: parseFloat(prix) })
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

async function supprimerParfum(nom) {
  const res = await fetch(`/api/parfums/${encodeURIComponent(nom)}`, {
    method: 'DELETE'
  });
  if (res.ok) {
    location.reload();
  } else {
    const data = await res.json();
    alert(data.error || 'Erreur lors de la suppression');
  }
}

async function afficherCollection() {
  const container = document.getElementById('cards-container');
  if (!container) return;

  const parfums = await chargerParfums();
  container.innerHTML = '';
  parfums.forEach(p => {
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
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // Ajout de parfum
  const btnAjouter = document.getElementById('btn-ajouter');
  if (btnAjouter) {
    btnAjouter.onclick = async () => {
      const nom = document.getElementById('input-produit').value.trim();
      const description = document.getElementById('input-description').value.trim();
      const image = document.getElementById('input-image').value.trim();
      const prix = document.getElementById('input-prix').value.trim();
      if (nom && description && image && prix) {
        const res = await ajouterParfum(nom, description, image, prix);
        if (res.ok) {
          afficherMessage("Parfum ajouté !");
          await majInterface();
        } else {
          const data = await res.json();
          afficherMessage(data.error || "Erreur lors de l'ajout", true);
        }
        document.getElementById('input-produit').value = '';
        document.getElementById('input-description').value = '';
        document.getElementById('input-image').value = '';
        document.getElementById('input-prix').value = '';
      }
    };
  }

  // Notation
  const btnNoter = document.getElementById('btn-noter');
  if (btnNoter) {
    btnNoter.onclick = async () => {
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
  }

  // Suppression
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => {
      const nom = btn.getAttribute('data-nom');
      if (confirm(`Supprimer le parfum "${nom}" ?`)) {
        supprimerParfum(nom);
      }
    });
  });

  // Affichage collection & mise à jour
  afficherCollection();
  majInterface();
});

// Modal pour ajouter un parfum
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-ajout');
  const btnOpen = document.getElementById('ouvrir-formulaire');
  const btnClose = document.querySelector('.modal .close');

  btnOpen.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  btnClose.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});
