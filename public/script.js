// ==========================
// UTILS CLASSEMENT PAR UTILISATEUR
// ==========================

// Récupérer tous les utilisateurs ayant noté au moins un parfum
function getAllUtilisateurs(parfums) {
  const set = new Set();
  parfums.forEach(p => {
    if (Array.isArray(p.notes)) p.notes.forEach(note => set.add(note.utilisateur));
  });
  return Array.from(set).sort();
}

function getMoyenne(notes) {
  if (!notes || !notes.length) return null;
  const total = notes.reduce((a, b) => a + (typeof b.note === 'number' ? b.note : 0), 0);
  return total / notes.length;
}

function getMoyenneUser(notes, utilisateur) {
  if (!notes || !notes.length) return null;
  if (!utilisateur || utilisateur === '__ALL__') return getMoyenne(notes);
  const notesUser = notes.filter(n => n.utilisateur === utilisateur);
  if (!notesUser.length) return null;
  const total = notesUser.reduce((a, b) => a + (typeof b.note === 'number' ? b.note : 0), 0);
  return total / notesUser.length;
}

function getMedal(rank) {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
}

// Affichage du podium, selon l'utilisateur choisi
function afficherPodium(parfums, utilisateur) {
  const podiumSection = document.getElementById('podium-section');
  const classement = parfums
    .map(p => ({...p, moyenne: getMoyenneUser(p.notes, utilisateur)}))
    .filter(p => p.moyenne !== null)
    .sort((a, b) => b.moyenne - a.moyenne || a.nom.localeCompare(b.nom));

  if (classement.length === 0) {
    podiumSection.innerHTML = `<div style="text-align:center; color:#a5b4fc; font-size:1.2em; margin-top:32px;">Aucun classement pour cet utilisateur</div>`;
    return;
  }

  const podium = classement.slice(0, 3);

  podiumSection.innerHTML = `
    <div class="podium-container">
      ${[1,2,3].map(i => {
        const p = podium[i-1];
        return p ? `
          <div class="podium-place podium-${i}" data-nom-parfum="${encodeURIComponent(p.nom)}" style="cursor:pointer;">
            <span class="podium-medal">${getMedal(i)}</span>
            <span class="podium-rank">${i}</span>
            <img src="${p.image}" alt="${p.nom}" />
            <div class="podium-name">${p.nom}</div>
            <div class="podium-moyenne">${p.moyenne.toFixed(2)} / 10</div>
          </div>
        ` : `<div class="podium-place podium-${i}" style="opacity:0.5;">
              <span class="podium-medal">${getMedal(i)}</span>
              <span class="podium-rank">${i}</span>
            </div>`;
      }).join('')}
    </div>
  `;

  // Clic sur podium => détail modale
  document.querySelectorAll('.podium-place[data-nom-parfum]').forEach(div => {
    div.addEventListener('click', () => {
      const nom = decodeURIComponent(div.getAttribute('data-nom-parfum'));
      const parfum = podium.find(p => p.nom === nom);
      if (parfum) afficherDetailParfum(parfum);
    });
  });
}

// Affichage du tableau classement complet selon utilisateur choisi
function afficherClassementTable(parfums, utilisateur) {
  const classementListe = document.getElementById('classement-liste');
  const classement = parfums
    .map(p => ({...p, moyenne: getMoyenneUser(p.notes, utilisateur)}))
    .filter(p => p.moyenne !== null)
    .sort((a, b) => {
      if ((b.moyenne ?? -1) !== (a.moyenne ?? -1)) return (b.moyenne ?? -1) - (a.moyenne ?? -1);
      return a.nom.localeCompare(b.nom);
    });

  if (classement.length === 0) {
    classementListe.innerHTML = `<div style="text-align:center; color:#a5b4fc; font-size:1.2em; margin-top:32px;">Aucun classement pour cet utilisateur</div>`;
    return;
  }

  classementListe.innerHTML = `
    <table class="ranking-table">
      <thead>
        <tr>
          <th>Rang</th>
          <th>Parfum</th>
          <th>Moyenne</th>
          <th>Type</th>
          <th>Marque</th>
        </tr>
      </thead>
      <tbody>
        ${classement.map((p, idx) => `
          <tr ${idx < 3 ? 'style="opacity:0.4;"' : ''}>
            <td>${idx+1}</td>
            <td>${p.nom}</td>
            <td>${p.moyenne !== null ? p.moyenne.toFixed(2)+' / 10' : 'Pas de note'}</td>
            <td>${p.type || ''}</td>
            <td>${p.marque || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Initialisation et gestion du select utilisateur
function afficherClassementPage() {
  const currentUser = localStorage.getItem("utilisateur") || "";
  const userNameEl = document.getElementById("user-name");
  if (userNameEl) userNameEl.textContent = currentUser;

  fetch('/api/parfums')
    .then(res => res.json())
    .then(parfums => {
      // Génère la liste des utilisateurs
      const select = document.getElementById('classement-user');
      if (select) {
        const users = getAllUtilisateurs(parfums);
        select.innerHTML = `<option value="__ALL__">Général (tous les utilisateurs)</option>` +
          users.map(u => `<option value="${u}">${u}</option>`).join('');
      }

      // Affichage initial
      let selectedUser = select?.value || "__ALL__";
      afficherPodium(parfums, selectedUser);
      afficherClassementTable(parfums, selectedUser);

      // Event : changement de user
      if (select) {
        select.addEventListener('change', () => {
          selectedUser = select.value;
          afficherPodium(parfums, selectedUser);
          afficherClassementTable(parfums, selectedUser);
        });
      }
    });
}

if (document.getElementById('podium-section')) {
  document.addEventListener('DOMContentLoaded', afficherClassementPage);
}

// ==========================
// MODALE DETAIL PARTAGÉE
// ==========================
function afficherDetailParfum(parfum) {
  const modal = document.getElementById('modal-detail');
  const detail = document.getElementById('contenu-detail-parfum');
  if (!detail || !modal) return;

  const moyenne = parfum.notes.length
    ? (parfum.notes.reduce((a, b) => a + b.note, 0) / parfum.notes.length).toFixed(2)
    : 'À venir';

  function resultatVoteBloc(title, obj) {
    return `
      <div class="resultat-vote">
        <h3>${title}</h3>
        <div>
          ${Object.entries(obj).map(([label, count]) => `
            <div class="vote-ligne">
              <span>${label} :</span>
              <progress value="${count}" max="${Object.values(obj).reduce((a, b) => Math.max(a, b), 1)}"></progress>
              <span>${count}</span>
            </div>
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
    <p><strong>Moyenne :</strong> ${moyenne} / 10</p>
    ${resultatVoteBloc("Ténacité", parfum.tenacite)}
    ${resultatVoteBloc("Sillage", parfum.sillage)}
  </div>
  `;

  modal.style.display = 'block';
}

// ==========================
// FERMETURE MODALE DETAIL PARTAGÉE
// ==========================
document.addEventListener('DOMContentLoaded', () => {
  const modalDetail = document.getElementById('modal-detail');
  const btnCloseDetail = document.querySelector('.close-detail');
  btnCloseDetail?.addEventListener('click', () => modalDetail.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === modalDetail) modalDetail.style.display = 'none';
  });
});

// ==========================
// PARTIE COLLECTION
// ==========================
let parfumsData = [];
let filteredParfums = [];
let currentPage = 1;
const itemsPerPage = 5;
const currentUser = localStorage.getItem('utilisateur') || '';

async function chargerParfums() {
  const res = await fetch('/api/parfums');
  return await res.json();
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
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

function afficherTotalPrix() {
  const total = parfumsData.reduce((sum, p) => sum + (parseFloat(p.prix) || 0), 0);
  let compteur = document.getElementById('compteur-total-prix');
  if (!compteur) {
    compteur = document.createElement('div');
    compteur.id = 'compteur-total-prix';
    compteur.style = "text-align:right;font-weight:bold;font-size:1.1em;margin:12px 0 0 0;color:var(--accent);";
    const container = document.getElementById('cards-container');
    if (container && container.parentNode) {
      container.parentNode.insertBefore(compteur, container);
    }
  }
  compteur.textContent = `Valeur totale de la collection : ${total.toFixed(2)} €`;
}

// Modifie updateView pour appeler afficherTotalPrix après le rendu
function updateView() {
  const term = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  const occasion = document.getElementById('filter-occasions')?.value || '';

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
  if (!container) return;
  container.innerHTML = '';
  pageItems.forEach(p => ajouterCarteParfum(p));

  renderPagination(totalPages);

  // Ajout du compteur après le rendu
  afficherTotalPrix();
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
  formData.append('utilisateur', currentUser);

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
  const res = await fetch(`/api/parfums/${encodeURIComponent(nom)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utilisateur: currentUser })
  });
  if (res.ok) {
    document.querySelector(`.card2[data-produit="${nom}"]`)?.remove();
  } else {
    const err = await res.json().catch(() => ({}));
    alert(err.error || 'Erreur lors de la suppression');
  }
}

async function modifierParfum(ancienNom, parfumModifie) {
  const body = {
    ...parfumModifie,
    utilisateur: currentUser
  };
  return await fetch(`/api/parfums/${encodeURIComponent(ancienNom)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function afficherMessage(msg, isError = false) {
  const msgEl = document.getElementById('msg');
  if (msgEl) {
    msgEl.textContent = msg;
    msgEl.style.color = isError ? 'red' : 'lime';
  }
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
  info.innerHTML = `
    <h2>${p.nom}</h2>
    <p>${p.description}</p>
    <p>Prix : ${p.prix.toFixed(2)} €</p>
    ${p.type ? `<p>Type : ${p.type}</p>` : ''}
  `;

  const moyenne = p.notes.length
    ? (p.notes.reduce((a, b) => a + b.note, 0) / p.notes.length).toFixed(2)
    : 'À venir';
  info.innerHTML += `<p><strong>Moyenne :</strong> ${moyenne} / 10</p>`;

  const btnNote = document.createElement('button');
  btnNote.className = 'btn-noter';
  btnNote.textContent = 'Noter';
  btnNote.onclick = (e) => {
    e.stopPropagation();
    ouvrirModaleNote(p);
  };
  info.appendChild(btnNote);

  content.appendChild(img);
  content.appendChild(info);
  card.appendChild(content);

  if (currentUser === 'hedi') {
    const btnSupprimer = document.createElement('button');
    btnSupprimer.className = 'btn-supprimer';
    btnSupprimer.textContent = 'Supprimer';
    btnSupprimer.onclick = () => {
      if (confirm(`Supprimer le parfum "${p.nom}" ?`)) supprimerParfum(p.nom);
    };

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

    const actions = document.createElement('div');
    actions.className = 'card2-actions';
    actions.appendChild(btnModifier);
    actions.appendChild(btnSupprimer);
    card.appendChild(actions);
  }

  content.addEventListener('click', () => afficherDetailParfum(p));
  container.appendChild(card);
}

function ouvrirModaleNote(parfum) {
  const modal = document.getElementById('modal-note');
  const contenu = document.getElementById('note-contenu');
  const utilisateur = localStorage.getItem("utilisateur") || "";

  let noteUser = '';
  if (parfum.notes && Array.isArray(parfum.notes)) {
    const noteTrouvee = parfum.notes.find(n => n.utilisateur === utilisateur);
    if (noteTrouvee) noteUser = noteTrouvee.note;
  }

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

  contenu.innerHTML = `
    <div>
      <p><strong>${parfum.nom}</strong></p>
      <label for="note-input">Votre note (sur 10) :</label>
      <input id="note-input" type="number" min="0" max="10" value="${noteUser}" style="width:60px;" />
      <button id="enregistrer-note">Enregistrer</button>
      ${creerBarre("tenacite", ["médiocre", "faible", "modéré (e)", "longue tenue", "très longue tenue"])}
      ${creerBarre("sillage", ["discret", "modéré (e)", "puissant", "énorme"])}
    </div>
  `;

  contenu.querySelector('#enregistrer-note').onclick = async () => {
    const note = contenu.querySelector('#note-input').value;
    if (note === '' || note < 0 || note > 10) return alert('Veuillez saisir une note entre 0 et 10.');
    const res = await noterParfum(parfum.nom, utilisateur, note);
    if (res.ok) {
      alert("Note enregistrée !");
      modal.style.display = 'none';
      parfumsData = await chargerParfums();
      updateView();
      majInterface();
    } else {
      alert('Erreur lors de la notation');
    }
  };

  contenu.querySelectorAll('.crans .cran').forEach(cran => {
    cran.addEventListener('click', async () => {
      const parent = cran.parentElement;
      const type = parent.dataset.type;
      const valeur = cran.dataset.valeur;
      const utilisateur = parent.dataset.utilisateur;

      const res = await voterParfum(parfum.nom, type, valeur, utilisateur);
      if (res.ok) {
        alert("Vote enregistré !");
        modal.style.display = 'none';
        parfumsData = await chargerParfums();
        updateView();
        majInterface();
      } else {
        alert('Erreur lors du vote');
      }
    });
  });

  modal.style.display = 'block';
}

function login() {
  const username = document.getElementById('username').value.trim();
  if (username) {
    localStorage.setItem('utilisateur', username);
    window.location.href = 'index.html';
  } else {
    alert("Veuillez entrer votre nom d'utilisateur.");
  }
}

// ==========================
// INITIALISATION
// ==========================
document.addEventListener('DOMContentLoaded', async () => {
  // Remplacer "Occasions" par "Tout" après premier changement
const selectOccasions = document.getElementById('filter-occasions');
if (selectOccasions) {
  selectOccasions.addEventListener('change', function handler() {
    const firstOption = this.querySelector('option[value=""]');
    if (firstOption && firstOption.textContent !== "Tout") {
      firstOption.textContent = "Tout";
    }
  });
}

  const currentUser = localStorage.getItem("utilisateur") || "";
  const userNameEl = document.getElementById("user-name");
  if (userNameEl) userNameEl.textContent = currentUser;

  if (currentUser !== 'hedi') {
    const btnOpenAjout = document.getElementById('ouvrir-formulaire');
    if (btnOpenAjout) btnOpenAjout.style.display = 'none';
  }

  const modalDetail = document.getElementById('modal-detail');
  const btnCloseDetail = document.querySelector('.close-detail');
  btnCloseDetail?.addEventListener('click', () => modalDetail.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === modalDetail) modalDetail.style.display = 'none';
  });

  const modalModifier = document.getElementById('modal-modifier');
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
      parfumsData = await chargerParfums();
      currentPage = 1;
      updateView();
      majInterface();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Erreur lors de la modification");
    }
  });

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

  parfumsData = await chargerParfums();
  currentPage = 1;
  updateView();

  document.getElementById('search-input')
    ?.addEventListener('input', () => { currentPage = 1; updateView(); });
  document.getElementById('filter-occasions')
    ?.addEventListener('change', () => { currentPage = 1; updateView(); });

  majInterface();

  const modalNote = document.getElementById('modal-note');
  const btnCloseNote = document.querySelector('.close-note');
  btnCloseNote?.addEventListener('click', () => modalNote.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === modalNote) modalNote.style.display = 'none';
  });
});
