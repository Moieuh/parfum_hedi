let parfumsData = [];
let filteredParfums = [];
let currentPage = 1;
const itemsPerPage = 5;

// === API INTERACTIONS ===
async function chargerParfums() {
  const res = await fetch('/api/parfums');
  return await res.json();
}
function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentPage = i;
      updateView();
    });
    pagination.appendChild(btn);
  }
}

function updateView() {
  const term = document.getElementById('search-input').value.trim().toLowerCase();
  const occasion = document.getElementById('filter-occasions').value;

  filteredParfums = parfumsData.filter(p => {
    const matchSearch =
      p.nom.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term);
    const matchFilter = !occasion || p.occasions === occasion;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredParfums.length / itemsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredParfums.slice(start, start + itemsPerPage);

  const container = document.getElementById('cards-container');
  container.innerHTML = '';
  pageItems.forEach(p => ajouterCarteParfum(p));  // fonction existante :contentReference[oaicite:4]{index=4}

  renderPagination(totalPages);
}


async function ajouterParfum(nom, description, imageFile, prix, marque, taille, dateAchat, occasions, type) {
  const formData = new FormData();
  formData.append('nom', nom);
  formData.append('description', description);
  formData.append('image', imageFile);
  formData.append('prix', prix);
  formData.append('marque', marque);
  formData.append('taille', taille);
  formData.append('dateAchat', dateAchat);
  formData.append('occasions', occasions);
  formData.append('type', type);

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


async function modifierParfum(ancienNom, parfumModifie) {
  return await fetch(`/api/parfums/${encodeURIComponent(ancienNom)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parfumModifie)
  });
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
  info.innerHTML = `<h2>${p.nom}</h2>
    <p>${p.description}</p>
    <p>Prix : ${p.prix.toFixed(2)} €</p>
    ${p.type ? `<p>Type : ${p.type}</p>` : ''}`;

  
  // Bouton Supprimer
  const btnSupprimer = document.createElement('button');
  btnSupprimer.className = 'btn-supprimer';
  btnSupprimer.textContent = 'Supprimer';
  btnSupprimer.onclick = () => {
    if (confirm(`Supprimer le parfum "${p.nom}" ?`)) supprimerParfum(p.nom);
  };

  // Bouton Modifier
  const btnModifier = document.createElement('button');
  btnModifier.className = 'btn-modifier';
  btnModifier.textContent = 'Modifier ce parfum';
  btnModifier.onclick = () => {
    const modal = document.getElementById('modal-modifier');
    modal.style.display = 'block';

    document.getElementById('edit-nom').value = p.nom;
    document.getElementById('edit-description').value = p.description;
    document.getElementById('edit-prix').value = p.prix;
    document.getElementById('edit-marque').value = p.marque || '';
    document.getElementById('edit-taille').value = p.taille || '';
    document.getElementById('edit-dateAchat').value = p.dateAchat || '';
    document.getElementById('edit-occasions').value = p.occasions || '';
    document.getElementById('edit-type').value = p.type || '';

    modal.dataset.oldNom = p.nom;
  };

  // Conteneur des boutons
  const actions = document.createElement('div');
  actions.className = 'card2-actions';
  actions.appendChild(btnModifier);
  actions.appendChild(btnSupprimer);

  content.appendChild(img);
  content.appendChild(info);
  card.appendChild(content);
  card.appendChild(actions);
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
    ${parfum.type ? `<p><strong>Type :</strong> ${parfum.type}</p>` : ''}
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
document.addEventListener('DOMContentLoaded', async () => {
  // Afficher le nom d'utilisateur dans le header
  const currentUser = localStorage.getItem("utilisateur") || "";
  const userNameEl = document.getElementById("user-name");
  if (userNameEl) {
    userNameEl.textContent = currentUser;
  }
  // 1️⃣ Hooks de fermeture des 2 modales
  const modalDetail    = document.getElementById('modal-detail');
  const btnCloseDetail = document.querySelector('.close-detail');
  btnCloseDetail?.addEventListener('click', () => modalDetail.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === modalDetail) modalDetail.style.display = 'none';
  });

  const modalModifier    = document.getElementById('modal-modifier');
  const btnCloseModifier = document.querySelector('.close-modifier');
  btnCloseModifier?.addEventListener('click', () => modalModifier.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === modalModifier) modalModifier.style.display = 'none';
  });

  const modalAjout = document.getElementById('modal-ajout');
  const btnOpenAjout = document.getElementById('ouvrir-formulaire');
  const btnCloseAjout = document.querySelector('#modal-ajout .close');
  btnOpenAjout?.addEventListener('click', () => modalAjout.style.display = 'block');
  btnCloseAjout?.addEventListener('click', () => modalAjout.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === modalAjout) modalAjout.style.display = 'none';
  });

  // 2️⃣ Bouton "Modifier" dans la modale d'édition
  document.getElementById('btn-modifier-parfum')?.addEventListener('click', async () => {
    const ancienNom = modalModifier.dataset.oldNom;
    const modifie = {
      nom:         document.getElementById('edit-nom').value.trim(),
      description: document.getElementById('edit-description').value.trim(),
      prix:        document.getElementById('edit-prix').value.trim(),
      marque:      document.getElementById('edit-marque').value.trim(),
      taille:      document.getElementById('edit-taille').value.trim(),
      dateAchat:   document.getElementById('edit-dateAchat').value,
      occasions:   document.getElementById('edit-occasions').value,
      type:        document.getElementById('edit-type').value
    };
    const res = await modifierParfum(ancienNom, modifie);
    if (res.ok) {
      afficherMessage("Parfum modifié !");
      modalModifier.style.display = 'none';
      // on rafraîchit la vue après modif
      parfumsData = await chargerParfums();
      currentPage = 1;
      updateView();
      majInterface();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Erreur lors de la modification");
    }
  });

  // 3️⃣ Bouton d'ajout existant (sans redéclencher fermeture détail !)
  document.getElementById('btn-ajouter')?.addEventListener('click', async () => {
    const nom         = document.getElementById('input-produit').value.trim();
    const description = document.getElementById('input-description').value.trim();
    const fichier     = document.getElementById('input-image').files[0];
    const prix        = document.getElementById('input-prix').value.trim();
    const marque      = document.getElementById('input-marque').value.trim();
    const taille      = document.getElementById('input-taille').value.trim();
    const dateAchat   = document.getElementById('input-dateAchat').value;
    const occasions   = document.getElementById('input-occasions').value;
    const type        = document.getElementById('input-type').value;

    if (!fichier) return afficherMessage("Veuillez sélectionner une image.", true);

    if (nom && description && fichier && prix) {
      const res = await ajouterParfum(nom, description, fichier, prix, marque, taille, dateAchat, occasions, type);
      if (res.ok) {
        afficherMessage("Parfum ajouté !");
        // on recharge uniquement la vue paginée
        parfumsData = await chargerParfums();
        currentPage = 1;
        updateView();
      } else {
        const data = await res.json().catch(() => ({}));
        afficherMessage(data.error || "Erreur lors de l'ajout", true);
      }
      document.getElementById('form-ajout').reset();
      modalAjout.style.display = 'none';
    }
  });

  // 4️⃣ Notation existante
  document.getElementById('btn-noter')?.addEventListener('click', async () => {
    const nom       = document.getElementById('select-produit').value;
    const utilisateur = document.getElementById('input-utilisateur').value.trim();
    const note      = document.getElementById('input-note').value;
    if (nom && utilisateur && note) {
      const res = await noterParfum(nom, utilisateur, note);
      if (res.ok) {
        afficherMessage("Note enregistrée !");
        majInterface();
      } else {
        const data = await res.json().catch(() => ({}));
        afficherMessage(data.error || "Erreur lors de la notation", true);
      }
      document.getElementById('input-utilisateur').value = '';
      document.getElementById('input-note').value = '';
    }
  });

  // 5️⃣ Recherche, filtre & pagination
  parfumsData = await chargerParfums();
  currentPage = 1;
  updateView();

  document.getElementById('search-input')
    .addEventListener('input', () => { currentPage = 1; updateView(); });
  document.getElementById('filter-occasions')
    .addEventListener('change', () => { currentPage = 1; updateView(); });

  // 6️⃣ Classement/Select (si besoin)
  majInterface();
});

