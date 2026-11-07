/* =========================================================================
   Student Forum — shared interface pieces
   ========================================================================= */
(function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Turn plain text with line breaks into safe paragraphs.
  const paras = (s) => esc(s).split(/\n{2,}/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');

  /* ---------- Icons (stroke icons on a 24px grid) ---------- */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    book: '<path d="M12 6.5C10.5 5 8 4.5 3 4.5v14c5 0 7.5.5 9 2 1.5-1.5 4-2 9-2v-14c-5 0-7.5.5-9 2Z"/><path d="M12 6.5v14"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1Z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 17h5"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    message: '<path d="M4 5h16v11H9l-5 4Z"/>',
    gavel: '<path d="m14 4 6 6"/><path d="m11 7 6 6"/><path d="m12.5 5.5-4 4 6 6 4-4"/><path d="M10.5 11.5 3 19l2 2 7.5-7.5"/>',
    sparkles: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6 6 2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    send: '<path d="M21 3 10 14"/><path d="M21 3 14 21l-4-7-7-4Z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 21v-5h-5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    note: '<path d="M5 3h10l4 4v14H5Z"/><path d="M9 12h6M9 16h4"/>'
  };

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- Small components ---------- */

  function statusPill(status) {
    const s = API.STATUS[status];
    if (!s) return '';
    return '<span class="pill pill-' + s.tone + '">' + esc(s.label) + '</span>';
  }

  function tonePill(label, tone) { return '<span class="pill pill-' + (tone || 'neutral') + '">' + esc(label) + '</span>'; }

  function statePill(state) {
    return state === 'completed' ? tonePill('Completed', 'green') : tonePill('Ongoing', 'amber');
  }

  const PROJECT_TONES = { 'Proposed': 'neutral', 'Under Consideration': 'amber', 'In Progress': 'blue', 'Awaiting School Approval': 'violet', 'Completed': 'green', 'Paused': 'neutral' };
  function projectPill(status) { return tonePill(status, PROJECT_TONES[status]); }

  function progressBar(pct, label) {
    pct = Math.max(0, Math.min(100, pct || 0));
    return '<div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(label || 'Progress') + '"><span style="width:' + pct + '%"></span></div>';
  }

  function empty(iconName, title, text, action) {
    return '<div class="empty">' + icon(iconName, 'empty-icon') + '<h3>' + esc(title) + '</h3>' + (text ? '<p>' + esc(text) + '</p>' : '') + (action || '') + '</div>';
  }

  function relTime(ts) {
    const d = Date.now() - ts;
    const abs = Math.abs(d);
    const fut = d < 0;
    const m = Math.round(abs / 60000);
    let s;
    if (m < 1) return 'just now';
    if (m < 60) s = m + ' min';
    else if (m < 60 * 24) s = Math.round(m / 60) + ' hr';
    else if (m < 60 * 24 * 30) { const dd = Math.round(m / 1440); s = dd + ' day' + (dd > 1 ? 's' : ''); }
    else return API.fmtDate(ts);
    return fut ? 'in ' + s : s + ' ago';
  }

  /* ---------- The proposal journey (signature element) ---------- */

  function journey(p) {
    const st = API.STATUS[p.status];
    const rejected = p.status === 'rejected';
    const current = rejected ? 5 : st.stage;
    const reached = rejected ? (p.reachedStage || 0) : current;
    const done = p.status === 'accepted' || p.status === 'completed' || rejected;
    let html = '<ol class="journey' + (rejected ? ' is-rejected' : '') + (done ? ' is-done' : '') + '" aria-label="Proposal progress">';
    API.STAGES.forEach((stage, i) => {
      let state, sr;
      if (i === 5) {
        if (done) { state = rejected ? 'rejected' : 'complete'; sr = rejected ? 'Rejected' : (p.status === 'completed' ? 'Accepted and completed' : 'Accepted'); }
        else { state = 'future'; sr = 'Not reached yet'; }
      } else if (rejected && i > reached) { state = 'skipped'; sr = 'Not reached'; }
      else if (i < current || (done && i <= reached)) { state = 'complete'; sr = 'Completed'; }
      else if (i === current) { state = 'current'; sr = 'Current stage'; }
      else { state = 'future'; sr = 'Not reached yet'; }
      let label = stage.label;
      if (i === 5 && done) label = rejected ? 'Rejected' : (p.status === 'completed' ? 'Accepted · Completed' : 'Accepted');
      const mark = state === 'complete' ? icon('check') : state === 'rejected' ? icon('x') : state === 'current' ? '<span class="dot"></span>' : '';
      html += '<li class="step step-' + state + '"' + (state === 'current' ? ' aria-current="step"' : '') + '>' +
        '<span class="step-mark">' + mark + '</span>' +
        '<span class="step-label">' + esc(label) + '<span class="sr-only"> — ' + sr + '</span></span></li>';
    });
    return html + '</ol>';
  }

  function stageExplain(p) {
    const st = API.STATUS[p.status];
    if (p.status === 'rejected') return 'The Forum decided not to take this proposal further.' + (p.rejectionReason ? '' : ' You can submit a revised idea in a future window.');
    if (p.status === 'accepted') return 'The Forum accepted your proposal. Watch for updates as it is put into action.';
    if (p.status === 'completed') return 'Your idea has been accepted and put into action. Thank you!';
    return API.STAGES[st.stage].explain;
  }

  /* ---------- Toasts ---------- */

  function toast(message, tone) {
    const region = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast toast-' + (tone || 'success');
    el.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    el.innerHTML = icon(tone === 'error' ? 'info' : 'check') + '<span>' + esc(message) + '</span>';
    region.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, tone === 'error' ? 6000 : 4000);
  }

  // Run an action, show its success message, or show the error it raised.
  function attempt(fn, success) {
    try {
      const r = fn();
      if (success) toast(success);
      return r === undefined ? true : r;
    } catch (e) {
      toast(e.message || 'Something went wrong.', 'error');
      return false;
    }
  }

  /* ---------- Dialogs ---------- */

  // opts: { title, body (html), confirm, tone ('danger'), onConfirm(form) -> false to keep open }
  function dialog(opts) {
    const d = document.createElement('dialog');
    d.className = 'dialog' + (opts.wide ? ' dialog-wide' : '');
    d.innerHTML = '<form method="dialog" class="dialog-form" novalidate>' +
      '<header class="dialog-head"><h2>' + esc(opts.title) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></header>' +
      '<div class="dialog-body">' + (opts.body || '') + '</div>' +
      '<footer class="dialog-foot"><button type="button" class="btn btn-ghost" data-close>' + esc(opts.cancel || 'Cancel') + '</button>' +
      (opts.confirm ? '<button type="submit" class="btn ' + (opts.tone === 'danger' ? 'btn-danger' : 'btn-primary') + '">' + esc(opts.confirm) + '</button>' : '') +
      '</footer></form>';
    document.body.appendChild(d);
    const form = d.querySelector('form');
    const close = () => { d.close(); d.remove(); };
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!opts.onConfirm) return close();
      const keep = opts.onConfirm(form) === false;
      if (!keep) close();
    });
    d.showModal();
    if (opts.onOpen) opts.onOpen(form);
    const first = d.querySelector('.dialog-body input, .dialog-body select, .dialog-body textarea');
    if (first) first.focus();
    return d;
  }

  function confirmDialog(title, text, confirm, onConfirm, tone) {
    return dialog({ title, body: '<p>' + esc(text) + '</p>', confirm, tone, onConfirm: () => { onConfirm(); } });
  }

  /* ---------- Form helpers ---------- */

  function options(list, selected, placeholder) {
    return (placeholder ? '<option value="">' + esc(placeholder) + '</option>' : '') +
      list.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return '<option value="' + esc(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + esc(l) + '</option>';
      }).join('');
  }

  function toLocalInput(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function toDateInput(ts) { return toLocalInput(ts).slice(0, 10); }

  /* ---------- Page shell ---------- */

  const PUBLIC_NAV = [
    { href: '#/', label: 'Home', match: /^#\/?$/ },
    { href: '#/guide', label: 'Forum Guide', match: /^#\/guide/ },
    { href: '#/submit', label: 'Submit a Proposal', match: /^#\/submit/ },
    { href: '#/track', label: 'Track Your Proposal', match: /^#\/track/ },
    { href: '#/about', label: 'About the Forum', match: /^#\/about/ }
  ];

  const ADMIN_NAV = [
    { href: '#/admin', label: 'Dashboard', icon: 'grid', match: /^#\/admin\/?$/ },
    { href: '#/admin/proposals', label: 'Proposals', icon: 'lightbulb', match: /^#\/admin\/proposals/ },
    { href: '#/admin/groups', label: 'Groups', icon: 'layers', match: /^#\/admin\/groups/ },
    { href: '#/admin/meetings', label: 'Meeting summaries', icon: 'file', match: /^#\/admin\/meetings/ },
    { href: '#/admin/updates', label: 'Forum updates', icon: 'megaphone', match: /^#\/admin\/updates/ },
    { href: '#/admin/projects', label: 'Projects', icon: 'folder', match: /^#\/admin\/projects/ },
    { href: '#/admin/windows', label: 'Submission windows', icon: 'calendar', match: /^#\/admin\/windows/ },
    { href: '#/admin/activity', label: 'Activity & email log', icon: 'activity', match: /^#\/admin\/activity/ }
  ];

  function header(hash) {
    const me = API.me();
    const unread = API.unreadCount();
    const links = PUBLIC_NAV.map((n) => '<a href="' + n.href + '"' + (n.match.test(hash) ? ' aria-current="page"' : '') + '>' + esc(n.label) + '</a>').join('');
    const inAdmin = /^#\/admin/.test(hash);
    return '<header class="topbar">' +
      '<div class="topbar-inner">' +
      '<a class="brand" href="#/" aria-label="Student Forum home">' +
        '<img class="brand-seal" src="assets/school-seal.jpg" alt="" width="44" height="44">' +
        '<span class="brand-text">Student Forum<small>The Forum Guide</small></span></a>' +
      '<button class="icon-btn nav-toggle" aria-expanded="false" aria-controls="mainnav" aria-label="Menu">' + icon('menu') + '</button>' +
      '<nav id="mainnav" class="mainnav" aria-label="Main">' + links +
        '<div class="nav-tools">' +
        (me && me.role === 'member' ? '<a class="member-chip' + (inAdmin ? ' is-on' : '') + '" href="#/admin">' + icon('grid') + 'Forum Member</a>' : '') +
        (me ? '<a class="icon-btn inbox-btn" href="#/inbox" aria-label="Email notifications' + (unread ? ', ' + unread + ' unread' : '') + '">' + icon('bell') + (unread ? '<span class="badge">' + unread + '</span>' : '') + '</a>' +
          '<button class="icon-btn" data-action="signout" aria-label="Sign out" title="Sign out (' + esc(me.firstName + ' ' + me.lastName) + ')">' + icon('logout') + '</button>' : '') +
        '</div>' +
      '</nav>' +
      '<img class="brand-forum" src="assets/bb-forum-logo.jpg" alt="BB Forum" width="64" height="64">' +
      '</div></header>';
  }

  function adminNav(hash) {
    return '<nav class="adminnav" aria-label="Forum member tools">' + ADMIN_NAV.map((n) =>
      '<a href="' + n.href + '"' + (n.match.test(hash) ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + esc(n.label) + '</span></a>').join('') + '</nav>';
  }

  function footer() {
    return '<footer class="footer"><div class="wrap footer-inner">' +
      '<img src="assets/bb-forum-logo.jpg" alt="BB Forum" class="footer-logo" width="56" height="56">' +
      '<p>The Student Forum listens to students, supports their ideas and helps build a better school community.</p>' +
      '<p class="footer-meta">Demo build · data is stored in this browser · <button class="linklike" data-action="reset">Reset sample data</button></p>' +
      '</div></footer>';
  }

  window.UI = {
    esc, paras, icon, statusPill, tonePill, statePill, projectPill, progressBar, empty, relTime,
    journey, stageExplain, toast, attempt, dialog, confirmDialog, options, toLocalInput, toDateInput,
    header, adminNav, footer
  };
})();
