/* =========================================================================
   Student Forum — router and app shell
   ========================================================================= */
(function () {
  'use strict';

  const ROUTES = [
    [/^\/?$/, 'home'],
    [/^\/login$/, 'login', { public: true }],
    [/^\/guide$/, 'guide'],
    [/^\/guide\/(post|meeting|project)\/([\w-]+)$/, 'guideDetail', { keys: ['type', 'id'] }],
    [/^\/submit$/, 'submit'],
    [/^\/track$/, 'track'],
    [/^\/about$/, 'about'],
    [/^\/inbox$/, 'inbox'],
    [/^\/admin\/?$/, 'dashboard', { member: true }],
    [/^\/admin\/proposals$/, 'proposals', { member: true }],
    [/^\/admin\/proposals\/([\w-]+)$/, 'proposalDetail', { member: true, keys: ['id'] }],
    [/^\/admin\/groups$/, 'groups', { member: true }],
    [/^\/admin\/meetings$/, 'meetings', { member: true }],
    [/^\/admin\/meetings\/([\w-]+)$/, 'meetingDetail', { member: true, keys: ['id'] }],
    [/^\/admin\/updates$/, 'updates', { member: true }],
    [/^\/admin\/projects$/, 'projects', { member: true }],
    [/^\/admin\/windows$/, 'windows', { member: true }],
    [/^\/admin\/activity$/, 'activity', { member: true }]
  ];

  function parse() {
    let h = location.hash || '#/';
    const anchor = h.indexOf('#', 1);
    if (anchor > -1) h = h.slice(0, anchor);
    const [path, qs] = h.slice(1).split('?');
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    return { path: path || '/', query, hash: '#' + (path || '/') };
  }

  const app = document.getElementById('app');
  let lastPath = null;

  function render() {
    const { path, query, hash } = parse();
    let route = null, params = {};
    for (const r of ROUTES) {
      const m = path.match(r[0]);
      if (m) { route = r; (r[2] && r[2].keys || []).forEach((k, i) => { params[k] = m[i + 1]; }); break; }
    }
    const opts = (route && route[2]) || {};
    const me = API.me();

    if (!me && !opts.public) {
      sessionStorage.setItem('sf.after', location.hash || '#/');
      location.replace('#/login');
      return;
    }
    if (me && path === '/login') { location.replace('#/'); return; }
    if (!route) { app.innerHTML = UI.header(hash) + '<main id="main" class="wrap page">' + UI.empty('search', 'Page not found', 'That page does not exist.', '<a class="btn btn-primary" href="#/">Go home</a>') + '</main>' + UI.footer(); return; }
    // Students never reach member pages, whatever URL they type.
    if (opts.member && !API.isMember()) { UI.toast('That area is for Forum members only.', 'error'); location.replace('#/'); return; }

    let page;
    try { page = window.PAGES[route[1]](params, query); }
    catch (e) {
      if (e instanceof API.PermissionError) { UI.toast(e.message, 'error'); location.replace('#/'); return; }
      throw e;
    }

    const scrollY = window.scrollY;
    if (page.bare) app.innerHTML = page.html;
    else if (page.admin) {
      app.innerHTML = UI.header(hash) + '<div class="admin-shell">' + UI.adminNav(hash) + '<main id="main" class="admin-main">' + page.html + '</main></div>' + UI.footer();
    } else {
      app.innerHTML = UI.header(hash) + page.html + UI.footer();
    }
    document.title = page.title + ' · Student Forum';
    if (page.mount) page.mount(app);
    bindShell();

    // Keep position when re-rendering the same page after an action.
    if (path === lastPath) window.scrollTo(0, scrollY);
    else {
      window.scrollTo(0, 0);
      const main = document.getElementById('main');
      if (main && lastPath !== null) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    }
    lastPath = path;
  }

  function bindShell() {
    const toggle = app.querySelector('.nav-toggle');
    if (toggle) toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      app.querySelector('.mainnav').classList.toggle('open', open);
    });
    app.querySelectorAll('[data-action=signout]').forEach((b) => b.addEventListener('click', () => {
      API.signOut();
      UI.toast('Signed out');
      location.hash = '#/login';
    }));
    app.querySelectorAll('[data-action=reset]').forEach((b) => b.addEventListener('click', () => UI.confirmDialog(
      'Reset all sample data?', 'Every change made in this browser is discarded and the original sample data is restored. You stay signed in.', 'Reset data',
      () => { API.resetDemo(); UI.toast('Sample data restored'); render(); }, 'danger')));
  }

  function refreshHeader() {
    const old = app.querySelector('.topbar');
    if (!old) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = UI.header(parse().hash);
    old.replaceWith(tmp.firstChild);
    bindShell();
  }

  API.init();
  window.APP = { render };
  window.addEventListener('hashchange', render);
  window.addEventListener('sf:refresh-header', refreshHeader);
  // Close submission windows on time, even if the page stays open.
  setInterval(() => { if (API.tick()) render(); }, 30000);
  render();
})();
