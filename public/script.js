// === API INTERACTIONS ===
async function chargerParfums() {
  const res = await fetch('/api/parfums');
  return await res.json();
}

async function ajouterParfum(nom, description, imageFile, prix, marque, taille, dateAchat, occasions) {
  const formData = new FormData();
  formData.append('nom', nom);
  formData.append('description', description);
  formData.append('image', imageFile);
  formData.append('prix', prix);
  formData.append('marque', marque);
  formData.append('taille', taille);
  formData.append('dateAchat', dateAchat);
  formData.append('occasions', occasions);

  return await fetch('/api/parfums', {
    method: 'POST',
    body: formData
  });
}

async function noterParfum(nom, utilisateur, note) {
  return await fetch(`/api/parfums/${encodeURIComponent(nom)}/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utilisateur, note: parseInt(note) })
  });
}

async function voterParfum(nom, type, valeur, utilisateur) {
  return await fetch(`/api/parfums/${encodeURIComponent(nom)}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, valeur, utilisateur })
  });
}

async function supprimerParfum(nom) {
  const res = await fetch(`/api/parfums/${encodeURIComponent(nom)}`, { method: 'DELETE' });
  if (res.ok) document.querySelector(`.card2[data-produit="${nom}"]`)?.remove();
  else alert((await res.json()).error || 'Erreur lors de la suppression');
}

// === UI UTILITAIRES ===
function afficherMessage(msg, isError = false) {
  const msgEl = document.getElementById('msg');
  if (msgEl) {
    msgEl.textContent = msg;
    msgEl.style.color = isError ? 'red' : 'lime';
  }
}

// === UI MISE À JOUR ===
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

async function afficherCollection() {
  const parfums = await chargerParfums();
  const container = document.getElementById('cards-container');
  if (!container) return;

  container.innerHTML = '';
  parfums.forEach(parfum => ajouterCarteParfum(parfum));
}

function ajouterCarteParfum(p) {
  const container = document.getElementById('cards-container');

  const card = document.createElement('div');
  card.className = 'card2';
  card.dataset.produit = p.nom;

  const content = document.createElement('div');
  content.className = 'card2-content';

  const img = document.createElement('img');
  img.src = p.image;
  img.alt = 'Parfum';

  const info = document.createElement('div');
  info.innerHTML = `<h2>${p.nom}</h2><p>${p.description}</p><p>Prix : ${p.prix.toFixed(2)} €</p>`;

  
  const btn = document.createElement('button');
  btn.className = 'btn-supprimer';
  btn.textContent = 'Supprimer';
  btn.onclick = () => {
    if (confirm(`Supprimer le parfum "${p.nom}" ?`)) supprimerParfum(p.nom);
  };

  content.appendChild(img);
  content.appendChild(info);
  card.appendChild(content);
  card.appendChild(btn);

  content.addEventListener('click', () => afficherDetailParfum(p));

  container.appendChild(card);
}

function afficherDetailParfum(parfum) {
  const modal = document.getElementById('modal-detail');
  const detail = document.getElementById('contenu-detail-parfum');
  if (!detail || !modal) return;

  const moyenne = parfum.notes.length
    ? (parfum.notes.reduce((a, b) => a + b.note, 0) / parfum.notes.length).toFixed(2)
    : 'À venir';

  const utilisateur = localStorage.getItem("utilisateur");

  function creerBarre(type, labels) {
    const voteActuel = parfum.votes?.[type]?.[utilisateur] || null;
    return `
      <div class="vote-bar">
        <h3>${type === 'tenacite' ? 'Ténacité' : 'Sillage'}</h3>
        <div class="crans" data-type="${type}" data-utilisateur="${utilisateur}">
          ${labels.map(label => `
            <div class="cran ${voteActuel === label ? 'actif' : ''}" data-valeur="${label}">${label}</div>
          `).join('')}
        </div>
      </div>
    `;
  }

  detail.innerHTML = `
  <div class="detail-parfum">
    <img src="${parfum.image}" alt="${parfum.nom}" class="detail-image" />
    <h2>${parfum.nom}</h2>
    <p><strong>Description :</strong> ${parfum.description}</p>
    <p><strong>Prix :</strong> ${parfum.prix.toFixed(2)} €</p>
    ${parfum.marque ? `<p><strong>Marque :</strong> ${parfum.marque}</p>` : ''}
    ${parfum.taille ? `<p><strong>Taille :</strong> ${parfum.taille} ml</p>` : ''}
    ${parfum.dateAchat ? `<p><strong>Date d'achat :</strong> ${parfum.dateAchat}</p>` : ''}
    ${parfum.occasions ? `<p><strong>Occasion :</strong> ${parfum.occasions}</p>` : ''}
    <p><strong>Moyenne :</strong> ${moyenne}</p>
    ${creerBarre("tenacite", ["médiocre", "faible", "modéré (e)", "longue tenue", "très longue tenue"])}
    ${creerBarre("sillage", ["discret", "modéré (e)", "puissant", "énorme"])}
  </div>
`;


  // Afficher la modale
  modal.style.display = 'block';

  // Ajouter écouteurs sur les crans
  document.querySelectorAll('.crans .cran').forEach(cran => {
    cran.addEventListener('click', async () => {
      const parent = cran.parentElement;
      const type = parent.dataset.type;
      const valeur = cran.dataset.valeur;
      const utilisateur = parent.dataset.utilisateur;

      const res = await voterParfum(parfum.nom, type, valeur, utilisateur);
      if (res.ok) {
        const parfums = await chargerParfums();
        const parfumMaj = parfums.find(p => p.nom === parfum.nom);
        afficherDetailParfum(parfumMaj);
        majInterface();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors du vote");
      }
    });
  });
}


// === AUTHENTIFICATION ===
function login() {
  const username = document.getElementById('username').value.trim();
  if (username) {
    localStorage.setItem('utilisateur', username);
    window.location.href = 'collection.html';
  } else {
    alert("Veuillez entrer votre nom d'utilisateur.");
  }
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
  // ✅ Gestion de la fermeture de la modale de détail
  const btnCloseDetail = document.querySelector('.close-detail');
  const modalDetail = document.getElementById('modal-detail');

  btnCloseDetail?.addEventListener('click', () => modalDetail.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === modalDetail) modalDetail.style.display = 'none';
  });

  const modal = document.getElementById('modal-ajout');
  const btnOpen = document.getElementById('ouvrir-formulaire');
  const btnClose = document.querySelector('.modal .close');

  btnOpen?.addEventListener('click', () => modal.style.display = 'block');
  btnClose?.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  document.getElementById('btn-ajouter')?.addEventListener('click', async () => {
    const nom = document.getElementById('input-produit').value.trim();
    const description = document.getElementById('input-description').value.trim();
    const fichier = document.getElementById('input-image').files[0];
    const prix = document.getElementById('input-prix').value.trim();
    const marque = document.getElementById('input-marque').value.trim();
    const taille = document.getElementById('input-taille').value.trim();
    const dateAchat = document.getElementById('input-dateAchat').value;
    const occasions = document.getElementById('input-occasions').value;
    // Fermeture modale détail
    const btnCloseDetail = document.querySelector('.close-detail');
    const modalDetail = document.getElementById('modal-detail');

    btnCloseDetail?.addEventListener('click', () => modalDetail.style.display = 'none');
    window.addEventListener('click', e => {
      if (e.target === modalDetail) modalDetail.style.display = 'none';
    });

    if (!fichier) return afficherMessage("Veuillez sélectionner une image.", true);

    if (nom && description && fichier && prix) {
      const res = await ajouterParfum(nom, description, fichier, prix, marque, taille, dateAchat, occasions);
      if (res.ok) {
        afficherMessage("Parfum ajouté !");
        const parfums = await chargerParfums();
        const nouveau = parfums.find(p => p.nom === nom);
        ajouterCarteParfum(nouveau);
        modal.style.display = 'none';
      } else {
        const data = await res.json().catch(() => ({}));
        afficherMessage(data.error || "Erreur lors de l'ajout", true);
      }
      document.getElementById('form-ajout').reset();
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
        const data = await res.json().catch(() => ({}));
        afficherMessage(data.error || "Erreur lors de la notation", true);
      }
      document.getElementById('input-utilisateur').value = '';
      document.getElementById('input-note').value = '';
    }
  });
  
  afficherCollection();
  majInterface();
});
