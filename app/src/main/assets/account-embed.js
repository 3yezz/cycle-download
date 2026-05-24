(function () {
  const ReactRef = window.React;
  if (!ReactRef) return;

  const { createElement: h, useEffect, useRef, useState } = ReactRef;

  const icon = (...children) => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, ...children);
  const IClose = icon(h('line', { x1: 18, y1: 6, x2: 6, y2: 18 }), h('line', { x1: 6, y1: 6, x2: 18, y2: 18 }));
  const IUser = icon(h('path', { d: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' }), h('circle', { cx: 12, cy: 7, r: 4 }));
  const ILock = icon(h('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }), h('path', { d: 'M7 11V7a5 5 0 0110 0v4' }));
  const ICamera = icon(h('path', { d: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z' }), h('circle', { cx: 12, cy: 13, r: 4 }));
  const ICheck = icon(h('polyline', { points: '20 6 9 17 4 12' }));
  const IShield = icon(h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }));
  const ILogout = icon(h('path', { d: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4' }), h('polyline', { points: '16 17 21 12 16 7' }), h('line', { x1: 21, y1: 12, x2: 9, y2: 12 }));
  const ITrash = icon(h('polyline', { points: '3 6 5 6 21 6' }), h('path', { d: 'M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' }), h('path', { d: 'M10 11v6' }), h('path', { d: 'M14 11v6' }), h('path', { d: 'M9 6V4h6v2' }));
  const IGrid = icon(h('rect', { x: 3, y: 3, width: 7, height: 7 }), h('rect', { x: 14, y: 3, width: 7, height: 7 }), h('rect', { x: 14, y: 14, width: 7, height: 7 }), h('rect', { x: 3, y: 14, width: 7, height: 7 }));

  const APPS = [
    { name: 'Organisr', url: 'https://Organisr.e-d.fr', color: '#d4179a', desc: 'Taches, notes, calendrier' },
    { name: 'Discute', url: 'https://Discute.e-d.fr', color: '#e85a28', desc: 'Messagerie & salons' },
    { name: 'EDmail', url: 'https://mail.e-d.fr', color: '#0ea5e9', desc: 'Boite mail @e-d.fr' },
    { name: 'EDberge', url: 'https://berge.e-d.fr', color: '#16a34a', desc: 'Hebergement web' },
    { name: 'EDmeet', url: 'https://meet.e-d.fr', color: '#8b5cf6', desc: 'Visioconference' },
    { name: 'EDmdp', url: 'https://mdp.e-d.fr', color: '#f59e0b', desc: 'Mots de passe' },
    { name: 'e-d Search', url: 'https://search.e-d.fr', color: '#e03b3b', desc: 'Recherche privee' },
    { name: 'EDdrive', url: 'https://drive.e-d.fr', color: '#06b6d4', desc: 'Stockage cloud' },
  ];

  function getCookieToken() {
    return document.cookie.split(';').reduce((acc, cookie) => {
      const [key, ...value] = cookie.trim().split('=');
      return key === 'token' ? decodeURIComponent(value.join('=')) : acc;
    }, null);
  }

  function getToken() {
    return localStorage.getItem('auth_token') || localStorage.getItem('org_token') || getCookieToken() || null;
  }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  function safeJson(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }

  function fallbackUser() {
    return safeJson('org_user') || safeJson('auth_user') || safeJson('ed_user') || null;
  }

  function Field({ label, children, full }) {
    return h('div', { className: 'ed-account-field' + (full ? ' ed-account-field-full' : '') },
      h('label', null, label),
      children
    );
  }

  function PasswordField({ value, onChange, placeholder, autoComplete }) {
    return h('input', { type: 'password', value, onChange, placeholder, autoComplete });
  }

  function AccountPanel({ open, onClose, onLogout, initialUser }) {
    const [user, setUser] = useState(initialUser || fallbackUser());
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ username: '', email: '', status: '' });
    const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
    const [deletePassword, setDeletePassword] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState('');
    const [toast, setToast] = useState(null);
    const fileRef = useRef(null);

    const notify = (msg, type) => {
      setToast({ msg, type: type || 'success' });
      window.setTimeout(() => setToast(null), 2800);
    };

    useEffect(() => {
      if (!open) return;
      const token = getToken();
      if (!token) {
        setUser(initialUser || fallbackUser());
        return;
      }
      setLoading(true);
      fetch('/compte/me', { headers: authHeaders() })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (ok && !data.error) setUser(data);
          else setUser(initialUser || fallbackUser());
        })
        .catch(() => setUser(initialUser || fallbackUser()))
        .finally(() => setLoading(false));
    }, [open]);

    useEffect(() => {
      if (!user) return;
      setForm({ username: user.username || '', email: user.email || '', status: user.status || '' });
    }, [user]);

    if (!open) return null;

    const letter = (form.username || user?.username || user?.alias || '?')[0].toUpperCase();

    const saveProfile = async e => {
      e.preventDefault();
      setBusy('profile');
      try {
        const res = await fetch('/compte/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) return notify(data.error || 'Erreur profil', 'error');
        setUser(prev => ({ ...(prev || {}), ...form }));
        notify('Profil mis a jour');
      } catch {
        notify('Serveur inaccessible', 'error');
      } finally {
        setBusy('');
      }
    };

    const changeAvatar = async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('avatar', file);
      setBusy('avatar');
      try {
        const res = await fetch('/compte/me/avatar', { method: 'POST', headers: authHeaders(), body: fd });
        const data = await res.json();
        if (!res.ok || !data.avatar) return notify(data.error || 'Erreur upload', 'error');
        setUser(prev => ({ ...(prev || {}), avatar: data.avatar }));
        notify('Photo mise a jour');
      } catch {
        notify('Serveur inaccessible', 'error');
      } finally {
        setBusy('');
        e.target.value = '';
      }
    };

    const savePassword = async e => {
      e.preventDefault();
      if (passwords.next !== passwords.confirm) return notify('Les mots de passe ne correspondent pas.', 'error');
      if (passwords.next.length < 8) return notify('8 caracteres minimum.', 'error');
      setBusy('password');
      try {
        const res = await fetch('/compte/me/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ current: passwords.current, next: passwords.next }),
        });
        const data = await res.json();
        if (!res.ok) return notify(data.error || 'Erreur mot de passe', 'error');
        setPasswords({ current: '', next: '', confirm: '' });
        notify('Mot de passe modifie');
      } catch {
        notify('Serveur inaccessible', 'error');
      } finally {
        setBusy('');
      }
    };

    const logout = () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('org_token');
      localStorage.removeItem('org_user');
      if (onLogout) onLogout();
      onClose();
    };

    const deleteAccount = async e => {
      e.preventDefault();
      if (!deletePassword) return;
      setBusy('delete');
      try {
        const res = await fetch('/compte/me', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ password: deletePassword }),
        });
        const data = await res.json();
        if (!res.ok) return notify(data.error || 'Erreur suppression', 'error');
        localStorage.clear();
        if (onLogout) onLogout();
        onClose();
      } catch {
        notify('Serveur inaccessible', 'error');
      } finally {
        setBusy('');
      }
    };

    return h('div', { className: 'ed-account-overlay', onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
      h('div', { className: 'ed-account-shell', role: 'dialog', 'aria-modal': 'true' },
        h('div', { className: 'ed-account-topbar' },
          h('div', { className: 'ed-account-brand' },
            h('div', { className: 'ed-account-logo' }, 'e-d'),
            h('div', null,
              h('div', { className: 'ed-account-title' }, 'Mon compte'),
              h('div', { className: 'ed-account-subtitle' }, 'Gestion du profil e-d')
            )
          ),
          h('button', { className: 'ed-account-close', type: 'button', onClick: onClose, title: 'Fermer' }, IClose)
        ),
        h('div', { className: 'ed-account-content' },
          loading
            ? h('div', { className: 'ed-account-loading' }, 'Chargement du compte...')
            : h(ReactRef.Fragment, null,
                h('div', { className: 'ed-account-hero' },
                  h('div', { className: 'ed-account-hero-avatar' },
                    user?.avatar ? h('img', { src: user.avatar, alt: user.username || 'Compte' }) : letter
                  ),
                  h('div', null,
                    h('h2', null, user?.username || form.username || 'Compte e-d'),
                    h('p', null, user?.alias || user?.email || 'Parametres du compte')
                  )
                ),
                h('div', { className: 'ed-account-grid' },
                  h('div', null,
                    h('div', { className: 'ed-account-card' },
                      h('div', { className: 'ed-account-card-head' },
                        h('div', { className: 'ed-account-card-icon' }, IUser),
                        h('div', null, h('h3', { className: 'ed-account-card-title' }, 'Profil'), h('p', { className: 'ed-account-card-sub' }, 'Votre identite sur l ecosysteme e-d'))
                      ),
                      h('div', { className: 'ed-account-avatar-row' },
                        h('div', { className: 'ed-account-avatar' }, user?.avatar ? h('img', { src: user.avatar, alt: user.username || 'Avatar' }) : letter),
                        h('div', null,
                          h('button', { className: 'ed-account-btn', type: 'button', onClick: () => fileRef.current && fileRef.current.click(), disabled: busy === 'avatar' }, ICamera, busy === 'avatar' ? 'Upload...' : 'Changer la photo'),
                          h('p', { className: 'ed-account-hint' }, 'JPG, PNG ou WebP. Max 8 Mo.'),
                          h('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: changeAvatar })
                        )
                      ),
                      h('form', { onSubmit: saveProfile },
                        h('div', { className: 'ed-account-form' },
                          h(Field, { label: 'Nom d utilisateur' }, h('input', { value: form.username, onChange: e => setForm(p => ({ ...p, username: e.target.value })), autoComplete: 'username' })),
                          h(Field, { label: 'Adresse email' }, h('input', { type: 'email', value: form.email, onChange: e => setForm(p => ({ ...p, email: e.target.value })), autoComplete: 'email' })),
                          h(Field, { label: 'Statut', full: true }, h('input', { value: form.status, onChange: e => setForm(p => ({ ...p, status: e.target.value })), maxLength: 120, placeholder: 'Votre statut...' }))
                        ),
                        h('div', { className: 'ed-account-actions' }, h('button', { className: 'ed-account-btn ed-account-btn-primary', disabled: busy === 'profile' }, ICheck, busy === 'profile' ? 'Enregistrement...' : 'Enregistrer'))
                      )
                    ),
                    h('div', { className: 'ed-account-card' },
                      h('div', { className: 'ed-account-card-head' },
                        h('div', { className: 'ed-account-card-icon', style: { background: 'rgba(139,92,246,.12)', color: '#8b5cf6' } }, ILock),
                        h('div', null, h('h3', { className: 'ed-account-card-title' }, 'Securite'), h('p', { className: 'ed-account-card-sub' }, 'Modifier votre mot de passe'))
                      ),
                      h('form', { onSubmit: savePassword },
                        h('div', { className: 'ed-account-form' },
                          h(Field, { label: 'Mot de passe actuel', full: true }, h(PasswordField, { value: passwords.current, onChange: e => setPasswords(p => ({ ...p, current: e.target.value })), placeholder: '••••••••', autoComplete: 'current-password' })),
                          h(Field, { label: 'Nouveau mot de passe' }, h(PasswordField, { value: passwords.next, onChange: e => setPasswords(p => ({ ...p, next: e.target.value })), placeholder: 'Min. 8 caracteres', autoComplete: 'new-password' })),
                          h(Field, { label: 'Confirmer' }, h(PasswordField, { value: passwords.confirm, onChange: e => setPasswords(p => ({ ...p, confirm: e.target.value })), placeholder: 'Repeter le mot de passe', autoComplete: 'new-password' }))
                        ),
                        h('div', { className: 'ed-account-actions' }, h('button', { className: 'ed-account-btn ed-account-btn-primary', disabled: busy === 'password' }, IShield, busy === 'password' ? 'Modification...' : 'Modifier le mot de passe'))
                      )
                    )
                  ),
                  h('div', null,
                    h('div', { className: 'ed-account-card' },
                      h('div', { className: 'ed-account-card-head' },
                        h('div', { className: 'ed-account-card-icon', style: { background: 'rgba(6,182,212,.12)', color: '#06b6d4' } }, IGrid),
                        h('div', null, h('h3', { className: 'ed-account-card-title' }, 'Applications'), h('p', { className: 'ed-account-card-sub' }, 'Toutes vos apps e-d'))
                      ),
                      h('div', { className: 'ed-account-apps' },
                        APPS.map(app => h('a', { key: app.name, className: 'ed-account-app', href: app.url, target: '_blank', style: { '--app-color': app.color } },
                          h('span', { className: 'ed-account-app-dot' }),
                          h('span', null, h('span', { className: 'ed-account-app-name' }, app.name), h('span', { className: 'ed-account-app-desc' }, app.desc))
                        ))
                      )
                    ),
                    h('div', { className: 'ed-account-card' },
                      h('div', { className: 'ed-account-card-head' },
                        h('div', { className: 'ed-account-card-icon', style: { background: 'rgba(239,68,68,.12)', color: '#ef4444' } }, ITrash),
                        h('div', null, h('h3', { className: 'ed-account-card-title' }, 'Zone de danger'), h('p', { className: 'ed-account-card-sub' }, 'Actions sensibles'))
                      ),
                      h('div', { className: 'ed-account-danger-row' },
                        h('div', null, h('div', { className: 'ed-account-danger-label' }, 'Se deconnecter'), h('p', { className: 'ed-account-danger-desc' }, 'Vous quitterez ce compte dans cette app.')),
                        h('button', { className: 'ed-account-btn ed-account-btn-danger', type: 'button', onClick: logout }, ILogout, 'Deconnexion')
                      ),
                      h('div', { className: 'ed-account-danger-row' },
                        h('div', null, h('div', { className: 'ed-account-danger-label' }, 'Supprimer le compte'), h('p', { className: 'ed-account-danger-desc' }, 'Suppression definitive du compte et des donnees.')),
                        !confirmDelete
                          ? h('button', { className: 'ed-account-btn ed-account-btn-danger', type: 'button', onClick: () => setConfirmDelete(true) }, ITrash, 'Supprimer')
                          : h('form', { onSubmit: deleteAccount, style: { minWidth: 220 } },
                              h('div', { className: 'ed-account-field' }, h('input', { type: 'password', value: deletePassword, onChange: e => setDeletePassword(e.target.value), placeholder: 'Mot de passe', autoComplete: 'current-password' })),
                              h('div', { className: 'ed-account-actions' },
                                h('button', { className: 'ed-account-btn', type: 'button', onClick: () => setConfirmDelete(false) }, 'Annuler'),
                                h('button', { className: 'ed-account-btn ed-account-btn-danger', disabled: busy === 'delete' || !deletePassword }, busy === 'delete' ? 'Suppression...' : 'Confirmer')
                              )
                            )
                      )
                    )
                  )
                )
              )
        )
      ),
      toast && h('div', { className: 'ed-account-toast ed-account-toast-' + toast.type }, toast.msg)
    );
  }

  window.EDAccountPanel = AccountPanel;

  let standaloneRoot = null;
  let standaloneHost = null;
  function openStandaloneAccountPanel(initialUser) {
    if (!window.ReactDOM) return;
    if (!standaloneHost) {
      standaloneHost = document.createElement('div');
      document.body.appendChild(standaloneHost);
      standaloneRoot = window.ReactDOM.createRoot(standaloneHost);
    }
    const close = () => standaloneRoot.render(h(AccountPanel, { open: false, onClose: close }));
    standaloneRoot.render(h(AccountPanel, { open: true, initialUser: initialUser || fallbackUser(), onClose: close }));
  }

  window.openEDAccountPanel = openStandaloneAccountPanel;
  document.addEventListener('click', event => {
    const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (!/^https:\/\/compte\.e-d\.fr\/?/.test(href)) return;
    event.preventDefault();
    openStandaloneAccountPanel();
  }, true);
})();
