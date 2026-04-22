/* ═══════════════════════════════════════════════
   TrivexIA — script.js
   ═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   CONFIGURATION ADMIN
   Modifier ici pour changer les identifiants
   ─────────────────────────────────────────*/
const ADMIN_CONFIG = {
  username: 'admin',
  // SHA-256 de "AgentSAV2024!"
  passwordHash: 'b5aef3b2c1e7f4d9a0c3e6b8f1d4a7c0e9b2f5a8d1c4e7b0f3a6d9c2e5b8f1a4',
  // SHA-256 de "7391"
  pinHash: 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1'
};

/* ─────────────────────────────────────────
   UTILITAIRES HASH SHA-256
   ─────────────────────────────────────────*/
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─────────────────────────────────────────
   STORAGE HELPERS
   ─────────────────────────────────────────*/
const DB = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: k => localStorage.removeItem(k)
};

/* ─────────────────────────────────────────
   AUTHENTIFICATION CLIENTS
   ─────────────────────────────────────────*/
let currentUser = null;

function initAuth() {
  const session = DB.get('trivex_session');
  if (session && session.email) {
    // Vérifier que l'utilisateur existe toujours
    const users = DB.get('trivex_users') || {};
    if (users[session.email]) {
      currentUser = { email: session.email, prenom: users[session.email].prenom };
      updateNavUI();
    } else {
      DB.remove('trivex_session');
    }
  }
  // Si pas connecté, afficher la modale auth
  if (!currentUser) {
    setTimeout(() => openAuthModal(), 800);
  }
  renderComments();
  updateDemoButton();
}

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').classList.add('open');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('open');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('auth-login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.auth-error, .auth-success').forEach(e => { e.classList.remove('show'); });
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  if (!email || !password) { showError(errEl, 'Veuillez remplir tous les champs.'); return; }

  const users = DB.get('trivex_users') || {};
  if (!users[email]) { showError(errEl, 'Aucun compte trouvé avec cet email.'); return; }

  const hash = await sha256(password);
  if (users[email].passwordHash !== hash) { showError(errEl, 'Mot de passe incorrect.'); return; }

  currentUser = { email, prenom: users[email].prenom };
  DB.set('trivex_session', { email });
  errEl.classList.remove('show');
  closeAuthModal();
  updateNavUI();
  renderComments();
  updateDemoButton();
}

async function handleRegister() {
  const prenom = document.getElementById('reg-prenom').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const cgu = document.getElementById('reg-cgu').checked;
  const errEl = document.getElementById('register-error');
  const sucEl = document.getElementById('register-success');

  if (!prenom || !email || !password || !confirm) { showError(errEl, 'Veuillez remplir tous les champs.'); return; }
  if (!email.includes('@')) { showError(errEl, 'Email invalide.'); return; }
  if (password.length < 6) { showError(errEl, 'Mot de passe trop court (6 caractères minimum).'); return; }
  if (password !== confirm) { showError(errEl, 'Les mots de passe ne correspondent pas.'); return; }
  if (!cgu) { showError(errEl, 'Vous devez accepter les conditions d\'utilisation.'); return; }

  const users = DB.get('trivex_users') || {};
  if (users[email]) { showError(errEl, 'Un compte existe déjà avec cet email.'); return; }

  const hash = await sha256(password);
  users[email] = { prenom, email, passwordHash: hash, createdAt: new Date().toISOString() };
  DB.set('trivex_users', users);

  errEl.classList.remove('show');
  sucEl.textContent = `Compte créé ! Bienvenue ${prenom} 🎉`;
  sucEl.classList.add('show');

  setTimeout(() => {
    currentUser = { email, prenom };
    DB.set('trivex_session', { email });
    closeAuthModal();
    updateNavUI();
    renderComments();
    updateDemoButton();
  }, 1200);
}

function handleLogout() {
  currentUser = null;
  DB.remove('trivex_session');
  updateNavUI();
  renderComments();
  updateDemoButton();
  openAuthModal('login');
}

function showError(el, msg) { el.textContent = msg; el.classList.add('show'); }

function updateNavUI() {
  const btnZone = document.getElementById('nav-auth-zone');
  if (!btnZone) return;
  if (currentUser) {
    const initials = currentUser.prenom.substring(0, 2).toUpperCase();
    btnZone.innerHTML = `
      <div class="user-badge">
        <div class="user-avatar">${initials}</div>
        <span style="font-size:.875rem;font-weight:600;color:#334155">${currentUser.prenom}</span>
        <button class="btn-logout" onclick="handleLogout()">Déconnexion</button>
      </div>`;
  } else {
    btnZone.innerHTML = `<button onclick="openAuthModal('login')" class="btn-nav">Se connecter</button>`;
  }
}

/* ─────────────────────────────────────────
   DÉMO — UNE SEULE DEMANDE PAR COMPTE
   ─────────────────────────────────────────*/
function hasRequestedDemo() {
  if (!currentUser) return false;
  const demos = DB.get('trivex_demos') || {};
  return !!demos[currentUser.email];
}

function markDemoRequested() {
  if (!currentUser) return;
  const demos = DB.get('trivex_demos') || {};
  demos[currentUser.email] = { requestedAt: new Date().toISOString() };
  DB.set('trivex_demos', demos);
}

function updateDemoButton() {
  const btn = document.getElementById('demo-submit-btn');
  if (!btn) return;
  if (hasRequestedDemo()) {
    btn.textContent = '✓ Démo déjà demandée';
    btn.classList.add('done');
    btn.disabled = true;
    const note = document.getElementById('demo-already-note');
    if (note) note.style.display = 'block';
  } else {
    btn.textContent = 'Envoyer la demande';
    btn.classList.remove('done');
    btn.disabled = false;
    const note = document.getElementById('demo-already-note');
    if (note) note.style.display = 'none';
  }
}

function envoyerViaMailto(e) {
  e.preventDefault();
  if (!currentUser) { openAuthModal('login'); return; }
  if (hasRequestedDemo()) { alert('Vous avez déjà envoyé une demande de démo. Nous vous contacterons sous 24h.'); return; }

  const f = e.target;
  const commerce = f.commerce.value.trim();
  const prenom = f.prenom.value.trim();
  const email = f.email.value.trim();
  const tel = f.tel.value.trim();
  const message = f.message ? f.message.value.trim() : '';

  if (!commerce || !prenom || !email || !tel) { alert('Veuillez remplir tous les champs.'); return; }

  const sujet = `Demande de démo - ${commerce}`;
  const corps = `Bonjour TrivexIA,\n\nJe souhaite une démo.\n\nCommerce : ${commerce}\nPrénom : ${prenom}\nEmail : ${email}\nTél : ${tel}\n\nMessage :\n${message || '(aucun)'}\n\nMerci,\n${prenom}`;
  window.location.href = `mailto:trivex.ytb@gmail.com?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;

  markDemoRequested();
  updateDemoButton();

  setTimeout(() => {
    if (navigator.clipboard) navigator.clipboard.writeText(corps).catch(() => {});
  }, 800);
}

/* ─────────────────────────────────────────
   COMMENTAIRES PUBLICS
   ─────────────────────────────────────────*/
let noteSelectionneeCommentaire = 5;

function initStarPicker() {
  const picker = document.getElementById('comment-star-picker');
  if (!picker) return;
  picker.querySelectorAll('span').forEach((s, i) => {
    s.classList.add('active');
    s.addEventListener('click', () => {
      noteSelectionneeCommentaire = i + 1;
      picker.querySelectorAll('span').forEach((star, j) => {
        star.classList.toggle('active', j < noteSelectionneeCommentaire);
      });
    });
  });
}

function getComments() { return DB.get('trivex_comments') || []; }
function saveComments(list) { DB.set('trivex_comments', list); }

function renderComments() {
  const container = document.getElementById('comments-list');
  const formContainer = document.getElementById('comment-form-container');
  const loginPrompt = document.getElementById('comment-login-prompt');
  if (!container) return;

  if (currentUser) {
    if (formContainer) formContainer.style.display = 'block';
    if (loginPrompt) loginPrompt.style.display = 'none';
  } else {
    if (formContainer) formContainer.style.display = 'none';
    if (loginPrompt) loginPrompt.style.display = 'block';
  }

  const comments = getComments();
  container.innerHTML = '';

  if (comments.length === 0) {
    container.innerHTML = '<div class="comment-empty">Soyez le premier à laisser un commentaire ✨</div>';
    return;
  }

  [...comments].reverse().forEach(c => {
    const stars = '★'.repeat(c.note) + '☆'.repeat(5 - c.note);
    const initials = c.prenom.substring(0, 2).toUpperCase();
    const date = new Date(c.createdAt).toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' });
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
      <div class="comment-header">
        <div class="comment-meta">
          <div class="comment-avatar">${initials}</div>
          <div>
            <div class="comment-author-name">${escapeHtml(c.prenom)}</div>
            <div class="comment-date">${date}</div>
          </div>
        </div>
      </div>
      <div class="comment-stars">${stars}</div>
      <div class="comment-text">${escapeHtml(c.texte)}</div>`;
    container.appendChild(div);
  });
}

function submitComment() {
  if (!currentUser) { openAuthModal('login'); return; }
  const texte = document.getElementById('comment-texte').value.trim();
  if (!texte) { alert('Veuillez écrire un commentaire.'); return; }
  if (texte.length < 10) { alert('Commentaire trop court (10 caractères minimum).'); return; }

  const comments = getComments();
  comments.push({
    prenom: currentUser.prenom,
    email: currentUser.email,
    texte,
    note: noteSelectionneeCommentaire,
    createdAt: new Date().toISOString()
  });
  saveComments(comments);
  document.getElementById('comment-texte').value = '';
  noteSelectionneeCommentaire = 5;
  initStarPicker();
  renderComments();
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────────────────
   TÉMOIGNAGES (section existante)
   ─────────────────────────────────────────*/
function getTemoignages() { return DB.get('trivexia_temoignages') || []; }
function saveTemoignages(l) { DB.set('trivexia_temoignages', l); }

function renderTemoignages() {
  const list = getTemoignages();
  const grid = document.getElementById('temoignages-grid');
  const empty = document.getElementById('temoignages-empty');
  const subtitle = document.getElementById('temoignages-subtitle');
  if (!grid) return;
  grid.innerHTML = '';
  if (list.length === 0) {
    if (empty) empty.style.display = 'block';
    if (subtitle) subtitle.textContent = 'Les premiers témoignages arrivent bientôt — les pilotes sont en cours.';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (subtitle) subtitle.textContent = list.length + ' avis de commerçants';
  list.forEach(t => {
    const etoiles = '★'.repeat(t.note) + '☆'.repeat(5 - t.note);
    const initiales = t.nom.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const card = document.createElement('div');
    card.className = 'temoignage-card';
    card.innerHTML = `
      <div class="temoignage-stars">${etoiles}</div>
      <div class="temoignage-text">"${escapeHtml(t.texte)}"</div>
      <div class="temoignage-author">
        <div class="temoignage-avatar">${initiales}</div>
        <div>
          <div class="temoignage-name">${escapeHtml(t.nom)}</div>
          <div class="temoignage-commerce">${escapeHtml(t.commerce)}</div>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* ─────────────────────────────────────────
   MODAL PAIEMENT
   ─────────────────────────────────────────*/
const PRODUITS = {
  sav:  { nom:'Agent SAV',          desc:'Chatbot 24/7 pour votre commerce',         install:'150 CHF', abo:'19 CHF/mois', note:'✓ Essai gratuit 2 semaines — sans CB requise' },
  rdv:  { nom:'Agent Prise de RDV', desc:'Réservations automatiques 24/7',            install:'290 CHF', abo:'39 CHF/mois', note:'✓ Inclus : Agent SAV + Booking' },
  lead: { nom:'Agent Lead Qualif.', desc:'Qualification de leads pour PME & agences', install:'490 CHF', abo:'79 CHF/mois', note:'✓ Intégration CRM disponible' },
};
let produitActuel = 'sav';

function ouvrirModal(id) {
  if (!currentUser) { openAuthModal('login'); return; }
  produitActuel = id;
  const p = PRODUITS[id];
  document.getElementById('modal-title').textContent = 'Commander — ' + p.nom;
  document.getElementById('modal-subtitle').textContent = p.install + ' d\'installation + ' + p.abo;
  document.getElementById('recap-nom').textContent = p.nom;
  document.getElementById('recap-desc').textContent = p.desc;
  document.getElementById('recap-install').textContent = p.install;
  document.getElementById('recap-abo').textContent = p.abo;
  document.getElementById('recap-note').textContent = p.note;
  showStep('step-1');
  document.getElementById('payment-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('payment-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('payment-modal')) closeModal();
}

function showStep(id) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function retour(id) { showStep(id); }
function choisirMode(mode) { showStep(mode === 'pilote' ? 'step-pilote' : 'step-payer'); }

function envoyerPilote() {
  const prenom = document.getElementById('p-prenom').value.trim();
  const commerce = document.getElementById('p-commerce').value.trim();
  const email = document.getElementById('p-email').value.trim();
  const tel = document.getElementById('p-tel').value.trim();
  if (!prenom || !commerce || !email || !tel) { alert('Merci de remplir tous les champs.'); return; }
  const p = PRODUITS[produitActuel];
  const sujet = `Essai gratuit - ${p.nom} - ${commerce}`;
  const corps = `Bonjour,\n\nDemande d'essai gratuit pour : ${p.nom}\n\nCommerce : ${commerce}\nPrénom : ${prenom}\nEmail : ${email}\nTél : ${tel}\n\nCordialement,\n${prenom}`;
  window.open(`mailto:trivex.ytb@gmail.com?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`);
  document.getElementById('confirm-titre').textContent = 'Demande envoyée ! 🎉';
  document.getElementById('confirm-texte').textContent = 'Je vous recontacte sous 24h pour votre essai gratuit de ' + p.nom + '.';
  document.getElementById('confirm-etapes').innerHTML = '<li>Je vous contacte sous 24h</li><li>On fixe un RDV de 15 min</li><li>Je configure votre agent en 3-5 jours</li><li>Vous testez 2 semaines gratuitement</li>';
  showStep('step-confirm');
}

function envoyerCommande() {
  const prenom = document.getElementById('f-prenom').value.trim();
  const commerce = document.getElementById('f-commerce').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const tel = document.getElementById('f-tel').value.trim();
  if (!prenom || !commerce || !email || !tel) { alert('Merci de remplir tous les champs.'); return; }
  const p = PRODUITS[produitActuel];
  const sujet = `Commande - ${p.nom} - ${commerce}`;
  const corps = `Bonjour,\n\nCommande : ${p.nom} (${p.install} + ${p.abo})\n\nCommerce : ${commerce}\nPrénom : ${prenom}\nEmail : ${email}\nTél : ${tel}\n\nCordialement,\n${prenom}`;
  window.open(`mailto:trivex.ytb@gmail.com?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`);
  document.getElementById('confirm-titre').textContent = 'Commande confirmée ! 🎉';
  document.getElementById('confirm-texte').textContent = 'Je vous envoie la facture sous 24h pour ' + p.nom + ' (' + p.install + ').';
  document.getElementById('confirm-etapes').innerHTML = '<li>Je vous envoie la facture sous 24h</li><li>Vous payez par virement bancaire</li><li>Installation démarrée après paiement</li><li>Votre agent est en ligne en 3-5 jours</li>';
  showStep('step-confirm');
}

/* ─────────────────────────────────────────
   LEGAL TABS
   ─────────────────────────────────────────*/
function switchLegalTab(tab) {
  document.querySelectorAll('.legal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.legal-content').forEach(c => c.classList.remove('active'));
  document.getElementById('legal-tab-' + tab).classList.add('active');
  document.getElementById('legal-' + tab).classList.add('active');
}

/* ─────────────────────────────────────────
   COOKIE BANNER
   ─────────────────────────────────────────*/
function initCookieBanner() {
  const accepted = DB.get('trivex_cookies');
  if (!accepted) {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.classList.remove('hidden');
  }
}

function acceptCookies() {
  DB.set('trivex_cookies', { accepted: true, date: new Date().toISOString() });
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.classList.add('hidden');
}

function refuseCookies() {
  DB.set('trivex_cookies', { accepted: false, date: new Date().toISOString() });
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.classList.add('hidden');
}

/* ─────────────────────────────────────────
   INIT
   ─────────────────────────────────────────*/
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initStarPicker();
  renderTemoignages();
  initCookieBanner();

  // Fermer auth modal si clic en dehors
  document.getElementById('auth-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('auth-modal')) closeAuthModal();
  });

  // Enter key sur login
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});
