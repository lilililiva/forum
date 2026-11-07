/* =========================================================================
   Student Forum — student-facing pages
   Each page returns { title, html, mount(root) }.
   ========================================================================= */
(function () {
  'use strict';
  const { esc, paras, icon, statusPill, statePill, projectPill, progressBar, empty, relTime, journey, stageExplain, toast, attempt, options } = UI;
  const PAGES = window.PAGES = window.PAGES || {};
  const fmt = API.fmtDate;

  /* ---------------- Sign in (demo) ---------------- */

  PAGES.login = () => {
    const accounts = API.demoAccounts();
    const card = (a) => '<li><button class="account" data-user="' + esc(a.id) + '">' +
      '<span class="avatar" aria-hidden="true">' + esc(a.name.split(' ').map((x) => x[0]).join('')) + '</span>' +
      '<span class="account-text"><strong>' + esc(a.name) + '</strong><small>' + esc(a.role === 'member' ? a.title + ' · Forum member' : a.grade + ' · Student') + '</small></span>' +
      icon('arrowRight') + '</button></li>';
    return {
      title: 'Sign in',
      bare: true,
      html: '<main id="main" class="login">' +
        '<section class="login-art" aria-hidden="true"><img src="assets/campus.jpg" alt=""><div class="login-art-fade"></div></section>' +
        '<section class="login-panel">' +
          '<div class="login-brand"><img src="assets/school-seal.jpg" alt="" class="login-seal" width="64" height="64"><img src="assets/bb-forum-logo.jpg" alt="BB Forum" class="login-forum" width="72" height="72"></div>' +
          '<h1>Sign in to the Student Forum</h1>' +
          '<p class="lede">This demo has no passwords. Choose an account to see the platform as that person. A live version would use the school\'s single sign-on.</p>' +
          '<h2 class="login-h">Students</h2><ul class="accounts">' + accounts.filter((a) => a.role === 'student').map(card).join('') + '</ul>' +
          '<h2 class="login-h">Forum members</h2><ul class="accounts">' + accounts.filter((a) => a.role === 'member').map(card).join('') + '</ul>' +
        '</section></main>',
      mount(root) {
        root.querySelectorAll('[data-user]').forEach((b) => b.addEventListener('click', () => {
          API.signIn(b.dataset.user);
          const back = sessionStorage.getItem('sf.after') || '#/';
          sessionStorage.removeItem('sf.after');
          location.hash = back;
          if (location.hash === back) window.dispatchEvent(new HashChangeEvent('hashchange'));
        }));
      }
    };
  };

  /* ---------------- Home ---------------- */

  function updateCard(it) {
    const cat = API.GUIDE_CATEGORIES[it.category];
    return '<article class="update-card">' +
      '<span class="update-icon" aria-hidden="true">' + icon(cat.icon) + '</span>' +
      '<div class="update-body"><h3><a href="#/guide/' + it.type + '/' + esc(it.id) + '">' + esc(it.title) + '</a></h3>' +
      '<p class="meta">' + fmt(it.date) + ' · ' + esc(cat.label) + '</p>' +
      '<p>' + esc(it.summary) + '</p></div></article>';
  }

  function projectCard(p) {
    return '<article class="project-card">' +
      '<div class="project-top">' + projectPill(p.status) + '<span class="pct">' + p.progress + '%</span></div>' +
      '<h3><a href="#/guide/project/' + esc(p.id) + '">' + esc(p.title) + '</a></h3>' +
      '<p>' + esc(p.description) + '</p>' + progressBar(p.progress, p.title + ' progress') +
      (p.latestUpdate ? '<p class="meta">Latest: ' + esc(p.latestUpdate.text) + '</p>' : '') + '</article>';
  }

  function windowBanner(s) {
    if (s.open) {
      return '<div class="window-chip is-open"><span class="live" aria-hidden="true"></span>Submissions are open until ' + esc(API.fmtDateTime(s.window.closesAt)) + '</div>';
    }
    return '<div class="window-chip">' + icon('clock') + (s.next ? 'Next submission window opens ' + esc(API.fmtDateTime(s.next.opensAt)) : 'Submissions are closed. The next window will be announced soon.') + '</div>';
  }

  PAGES.home = () => {
    const items = API.guideItems().filter((i) => i.type !== 'project').slice(0, 3);
    const projects = API.publicProjects().filter((p) => p.status !== 'Completed').slice(0, 3);
    const s = API.submissionState();
    return {
      title: 'Home',
      html: '<main id="main">' +
        '<section class="hero"><div class="wrap hero-inner">' +
          '<div class="hero-copy">' +
            '<p class="hey">Hey ' + esc(API.greetingName()) + '</p>' +
            '<h1>Your Voice.<br>Your Forum.</h1>' +
            '<p class="lede">Share ideas, follow discussions, and see how your suggestions make a difference.</p>' +
            '<div class="btn-row"><a class="btn btn-primary btn-lg" href="#/guide">Explore the Forum Guide ' + icon('arrowRight') + '</a>' +
            '<a class="btn btn-outline btn-lg" href="#/submit">Submit an Idea ' + icon('arrowRight') + '</a></div>' +
            windowBanner(s) +
          '</div>' +
          '<div class="hero-art" aria-hidden="true"><img src="assets/campus.jpg" alt=""></div>' +
        '</div></section>' +
        '<div class="wrap home-grid">' +
          '<section class="home-updates" aria-labelledby="latest-h"><div class="section-head"><h2 id="latest-h">Latest Updates</h2><a class="more" href="#/guide">All updates ' + icon('arrowRight') + '</a></div>' +
            (items.length ? items.map(updateCard).join('') : empty('megaphone', 'No updates yet', 'Published Forum updates will appear here.')) + '</section>' +
          '<div class="home-side">' +
          '<section class="quick" aria-label="Quick access">' +
            '<a class="quick-card" href="#/guide">' + icon('book') + '<strong>Forum Updates</strong><span>Read the latest news and decisions.</span></a>' +
            '<a class="quick-card" href="#/submit">' + icon('lightbulb') + '<strong>Submit an Idea</strong><span>Share a suggestion with the Forum.</span></a>' +
            '<a class="quick-card" href="#/track">' + icon('chart') + '<strong>Track Your Proposal</strong><span>Follow the progress of your submissions.</span></a>' +
          '</section>' +
          '<section class="card pad window-card" aria-labelledby="win-h">' +
            '<h2 id="win-h" class="h-sm">' + icon('calendar') + (s.open ? 'Submissions are open now' : 'Submissions are closed') + '</h2>' +
            '<p>' + (s.open ? 'This window closes <strong>' + esc(API.fmtDateTime(s.window.closesAt)) + '</strong>. You can submit ' + s.remaining + ' more proposal' + (s.remaining === 1 ? '' : 's') + ' this month.'
              : s.next ? 'The next window opens <strong>' + esc(API.fmtDateTime(s.next.opensAt)) + '</strong>.' : 'The next window has not been announced yet.') + '</p>' +
            '<ol class="mini-stages" aria-label="How a proposal moves through the Forum">' + API.STAGES.map((st) => '<li>' + esc(st.label) + '</li>').join('') + '</ol>' +
            (s.open && s.remaining ? '<a class="btn btn-primary" href="#/submit">Submit an idea ' + icon('arrowRight') + '</a>' : '<a class="btn btn-ghost" href="#/track">Track your proposals ' + icon('arrowRight') + '</a>') +
          '</section>' +
          '</div>' +
        '</div>' +
        '<section class="wrap" aria-labelledby="proj-h"><div class="section-head"><h2 id="proj-h">Current Forum Projects</h2><a class="more" href="#/guide?cat=projects">All projects ' + icon('arrowRight') + '</a></div>' +
          '<div class="project-grid">' + (projects.length ? projects.map(projectCard).join('') : empty('folder', 'No projects yet', '')) + '</div></section>' +
        '<section class="wrap"><div class="forum-band"><img src="assets/bb-forum-logo.jpg" alt="" class="band-logo" width="64" height="64"><p>The Student Forum is here to listen, support your ideas, and help build a better school community.</p><a class="btn btn-ghost" href="#/about">About the Forum ' + icon('arrowRight') + '</a></div></section>' +
        '</main>'
    };
  };

  /* ---------------- Forum Guide ---------------- */

  PAGES.guide = (params, query) => {
    const all = API.guideItems();
    const cats = API.GUIDE_CATEGORIES;
    const state = { q: query.q || '', cat: query.cat || '', status: query.status || '' };
    const counts = {};
    all.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });

    function results() {
      const q = state.q.trim().toLowerCase();
      const list = all.filter((i) => (!state.cat || i.category === state.cat) && (!state.status || i.state === state.status) &&
        (!q || (i.title + ' ' + i.summary + ' ' + (i.nextSteps || '') + ' ' + (i.body || '')).toLowerCase().includes(q)));
      if (!list.length) return empty('search', 'Nothing matches those filters', 'Try a different word or clear the filters.', '<button class="btn btn-ghost" data-clear>Clear filters</button>');
      return list.map((i) => {
        const c = cats[i.category];
        return '<article class="guide-item">' +
          '<div class="guide-item-head"><span class="cat-tag">' + icon(c.icon) + esc(c.label) + '</span>' + statePill(i.state) + '</div>' +
          '<h3><a href="#/guide/' + i.type + '/' + esc(i.id) + '">' + esc(i.title) + '</a></h3>' +
          '<p class="meta">' + (i.type === 'meeting' ? 'Meeting held ' : i.type === 'project' ? 'Updated ' : 'Published ') + fmt(i.date) +
          (i.type === 'project' ? ' · ' + esc(i.projectStatus) + ' · ' + i.progress + '% complete' : '') + '</p>' +
          '<p>' + esc(i.summary) + '</p>' +
          (i.nextSteps ? '<p class="next">' + icon('arrowRight') + '<span><strong>Next steps:</strong> ' + esc(i.nextSteps) + '</span></p>' : '') +
          '</article>';
      }).join('');
    }

    return {
      title: 'Forum Guide',
      html: '<main id="main" class="wrap page">' +
        '<header class="page-head"><h1>' + icon('book', 'h-icon') + 'Forum Guide</h1><p class="lede">What the Forum discusses, decides and works on. Everything here has been approved for publication.</p></header>' +
        '<div class="guide-layout">' +
          '<aside class="guide-side" aria-label="Categories"><h2 class="side-h">Categories</h2><ul class="cat-list">' +
            '<li><button data-cat="" ' + (!state.cat ? 'aria-pressed="true"' : 'aria-pressed="false"') + '>' + icon('grid') + 'All updates<span>' + all.length + '</span></button></li>' +
            Object.keys(cats).map((k) => '<li><button data-cat="' + k + '" aria-pressed="' + (state.cat === k) + '">' + icon(cats[k].icon) + esc(cats[k].label) + '<span>' + (counts[k] || 0) + '</span></button></li>').join('') +
          '</ul></aside>' +
          '<section class="guide-main">' +
            '<form class="filters" role="search" onsubmit="return false">' +
              '<label class="search-field">' + icon('search') + '<span class="sr-only">Search the Forum Guide</span><input type="search" name="q" placeholder="Search topics, e.g. library, recycling…" value="' + esc(state.q) + '"></label>' +
              '<label class="select-field"><span class="sr-only">Status</span><select name="status">' + options([{ value: 'ongoing', label: 'Ongoing' }, { value: 'completed', label: 'Completed' }], state.status, 'Ongoing and completed') + '</select></label>' +
            '</form>' +
            '<p class="result-count" aria-live="polite"></p>' +
            '<div class="guide-results"></div>' +
          '</section>' +
        '</div></main>',
      mount(root) {
        const box = root.querySelector('.guide-results');
        const count = root.querySelector('.result-count');
        const render = () => {
          box.innerHTML = results();
          const n = box.querySelectorAll('.guide-item').length;
          count.textContent = n + ' update' + (n === 1 ? '' : 's') + (state.cat ? ' in ' + cats[state.cat].label : '');
          root.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
          const clr = box.querySelector('[data-clear]');
          if (clr) clr.addEventListener('click', () => { state.q = ''; state.cat = ''; state.status = ''; root.querySelector('[name=q]').value = ''; root.querySelector('[name=status]').value = ''; render(); });
        };
        root.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { state.cat = b.dataset.cat; render(); }));
        root.querySelector('[name=q]').addEventListener('input', (e) => { state.q = e.target.value; render(); });
        root.querySelector('[name=status]').addEventListener('change', (e) => { state.status = e.target.value; render(); });
        render();
      }
    };
  };

  function listBlock(title, items, tone, iconName) {
    if (!items || !items.length) return '';
    return '<section class="sum-block sum-' + tone + '"><h2>' + icon(iconName) + esc(title) + '</h2><ul>' + items.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></section>';
  }

  PAGES.guideDetail = (params) => {
    const back = '<a class="back" href="#/guide">' + icon('arrowLeft') + 'Back to the Forum Guide</a>';
    const notFound = { title: 'Not found', html: '<main id="main" class="wrap page">' + back + empty('search', 'This update is not available', 'It may have been unpublished.') + '</main>' };

    if (params.type === 'meeting') {
      const m = API.publicMeeting(params.id);
      if (!m) return notFound;
      const s = m.summary;
      return {
        title: m.title,
        html: '<main id="main" class="wrap page narrow">' + back +
          '<header class="page-head"><span class="cat-tag">' + icon('calendar') + 'Recent Meetings</span><h1>' + esc(m.title) + '</h1>' +
          '<p class="meta">Meeting held ' + fmt(m.date) + ' · Summary approved by ' + esc(m.approvedBy) + '</p>' +
          (s.overview ? '<p class="lede">' + esc(s.overview) + '</p>' : '') + '</header>' +
          '<div class="legend" aria-label="Key"><span>' + UI.tonePill('Decided', 'green') + ' Final decisions</span><span>' + UI.tonePill('Ongoing', 'amber') + ' Still being discussed</span><span>' + UI.tonePill('Implementing', 'blue') + ' Projects underway</span></div>' +
          listBlock('Main topics discussed', s.topics, 'plain', 'message') +
          listBlock('Decisions finalised', s.decisions, 'green', 'gavel') +
          listBlock('Still being discussed', s.ongoing, 'amber', 'clock') +
          listBlock('Projects being implemented', s.implementing, 'blue', 'folder') +
          listBlock('Proposals considered', s.proposals, 'plain', 'lightbulb') +
          listBlock('Actions agreed', s.actions, 'plain', 'check') +
          listBlock('Next steps', s.nextSteps, 'plain', 'arrowRight') +
          '</main>'
      };
    }

    if (params.type === 'project') {
      const p = API.publicProject(params.id);
      if (!p) return notFound;
      return {
        title: p.title,
        html: '<main id="main" class="wrap page narrow">' + back +
          '<header class="page-head"><span class="cat-tag">' + icon('folder') + 'Ongoing Projects</span><h1>' + esc(p.title) + '</h1>' +
          '<p class="meta">' + projectPill(p.status) + (p.sponsor ? ' · Sponsor: ' + esc(p.sponsor) : '') + ' · Updated ' + fmt(p.updatedAt) + '</p></header>' +
          '<div class="card pad"><div class="progress-row"><strong>' + p.progress + '% complete</strong></div>' + progressBar(p.progress, 'Project progress') + '</div>' +
          '<section class="prose"><h2>About this project</h2><p>' + esc(p.description) + '</p>' +
          (p.reason ? '<h2>Why we are doing it</h2><p>' + esc(p.reason) + '</p>' : '') +
          (p.related.length ? '<h2>Student suggestions behind it</h2><ul>' + p.related.map((r) => '<li>' + esc(r.title) + ' <span class="meta">(' + esc(r.category) + ')</span></li>').join('') + '</ul>' : '') +
          '<h2>Updates</h2>' + (p.updates.length ? '<ol class="timeline">' + p.updates.slice().reverse().map((u) => '<li><span class="meta">' + fmt(u.at) + '</span><p>' + esc(u.text) + '</p></li>').join('') + '</ol>' : '<p class="meta">No updates yet.</p>') +
          '</section></main>'
      };
    }

    const p = API.publicPost(params.id);
    if (!p) return notFound;
    const c = API.GUIDE_CATEGORIES[p.category];
    return {
      title: p.title,
      html: '<main id="main" class="wrap page narrow">' + back +
        '<header class="page-head"><span class="cat-tag">' + icon(c.icon) + esc(c.label) + '</span><h1>' + esc(p.title) + '</h1>' +
        '<p class="meta">' + fmt(p.date) + ' · ' + esc(p.author) + ' · ' + statePill(p.state) + '</p><p class="lede">' + esc(p.summary) + '</p></header>' +
        '<section class="prose">' + paras(p.body) +
        (p.nextSteps ? '<div class="callout">' + icon('arrowRight') + '<div><strong>Next steps</strong><p>' + esc(p.nextSteps) + '</p></div></div>' : '') +
        '</section></main>'
    };
  };

  /* ---------------- Submit a Proposal ---------------- */

  PAGES.submit = () => {
    const s = API.submissionState();
    const me = API.me();
    const guidelines = '<aside class="guidelines" aria-labelledby="gl-h">' + icon('lightbulb', 'gl-icon') +
      '<h2 id="gl-h">Submission Guidelines</h2><ul class="checks">' +
      '<li>' + icon('check') + 'Be constructive and respectful.</li>' +
      '<li>' + icon('check') + 'Explain why your idea would benefit the school community.</li>' +
      '<li>' + icon('check') + 'Keep ideas realistic.</li>' +
      '<li>' + icon('check') + 'No personal attacks or inappropriate content.</li>' +
      '<li>' + icon('check') + 'You may submit a maximum of <strong>two</strong> proposals per calendar month.</li>' +
      '</ul><p class="gl-note">' + icon('lock') + 'Only you and Forum members can see your proposal.</p></aside>';

    const head = '<a class="back" href="#/">' + icon('arrowLeft') + 'Back to Home</a>' +
      '<header class="page-head"><h1>Submit a Proposal</h1><p class="lede">Have an idea? Let us know how we can make our school even better.</p></header>';

    let body;
    if (!s.open) {
      body = '<div class="closed-box" role="status">' + icon('calendar', 'closed-icon') +
        '<div><h2>Submissions are closed right now</h2>' +
        (s.next ? '<p>The next submission window opens <strong>' + esc(API.fmtDateTime(s.next.opensAt)) + '</strong> and closes ' + esc(API.fmtDateTime(s.next.closesAt)) + '.</p>'
          : '<p>The date of the next submission window has not been announced yet. Check back soon, or look in the Forum Guide for announcements.</p>') +
        '<p class="meta">The portal opens for one day, every two weeks, so every idea gets a proper review.</p>' +
        '<div class="btn-row"><a class="btn btn-ghost" href="#/track">Track your proposals</a><a class="btn btn-ghost" href="#/guide">Read the Forum Guide</a></div></div></div>';
    } else if (s.remaining <= 0) {
      body = '<div class="closed-box" role="status">' + icon('info', 'closed-icon') +
        '<div><h2>You have reached this month\'s limit</h2><p>You have submitted ' + API.MONTHLY_LIMIT + ' proposals this calendar month. You can submit again from the 1st of next month.</p>' +
        '<div class="btn-row"><a class="btn btn-primary" href="#/track">Track your proposals ' + icon('arrowRight') + '</a></div></div></div>';
    } else {
      body = '<div class="window-box">' + icon('calendar') + '<div><strong>Submission window open until ' + esc(API.fmtDateTime(s.window.closesAt)) + '</strong>' +
        '<span>You can submit ' + s.remaining + ' more proposal' + (s.remaining === 1 ? '' : 's') + ' this month.</span></div></div>' +
        '<form class="form" id="proposal-form" novalidate>' +
          field('title', 'Proposal title', true, '<input id="f-title" name="title" maxlength="90" placeholder="Enter a short, descriptive title…" autocomplete="off">', 'A short name for your idea, like "More study spaces".') +
          '<div class="form-row">' +
            field('category', 'Category', true, '<select id="f-category" name="category">' + options(API.CATEGORIES, '', 'Select a category') + '</select>') +
            field('grade', 'Grade', true, '<select id="f-grade" name="grade">' + options(API.GRADES, me.grade, 'Select your grade') + '</select>') +
          '</div>' +
          field('description', 'Description', true, '<textarea id="f-description" name="description" rows="6" maxlength="2000" placeholder="Tell us more about your idea. What should change, and how would it help students?"></textarea>', 'At least 30 characters. Explain how the school community would benefit.', true) +
          field('issue', 'The problem it solves (optional)', false, '<textarea id="f-issue" name="issue" rows="3" maxlength="800" placeholder="What issue are you trying to fix?"></textarea>') +
          '<button class="btn btn-primary btn-lg btn-block" type="submit">Submit Proposal ' + icon('arrowRight') + '</button>' +
        '</form>';
    }

    return {
      title: 'Submit a Proposal',
      html: '<main id="main" class="wrap page"><div class="submit-layout"><div class="submit-main">' + head + '<div id="submit-body">' + body + '</div></div>' + guidelines + '</div></main>',
      mount(root) {
        const form = root.querySelector('#proposal-form');
        if (!form) return;
        const desc = form.querySelector('[name=description]');
        const counter = form.querySelector('[data-count]');
        desc.addEventListener('input', () => { counter.textContent = desc.value.length + ' / 2000'; });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(form));
          const errors = {};
          if ((data.title || '').trim().length < 5) errors.title = 'Enter a title of at least 5 characters.';
          if (!data.category) errors.category = 'Choose the category that fits best.';
          if (!data.grade) errors.grade = 'Choose your grade.';
          if ((data.description || '').trim().length < 30) errors.description = 'Describe your idea in at least 30 characters.';
          form.querySelectorAll('.field').forEach((f) => {
            const name = f.dataset.field;
            const err = f.querySelector('.field-error');
            const input = f.querySelector('input,select,textarea');
            if (errors[name]) { err.textContent = errors[name]; input.setAttribute('aria-invalid', 'true'); }
            else { err.textContent = ''; input.removeAttribute('aria-invalid'); }
          });
          const firstBad = Object.keys(errors)[0];
          if (firstBad) { form.querySelector('[name=' + firstBad + ']').focus(); return; }
          const p = attempt(() => API.submitProposal(data));
          if (!p) return;
          const me = API.me();
          root.querySelector('#submit-body').innerHTML =
            '<div class="confirm-box" tabindex="-1">' + icon('check', 'confirm-icon') +
            '<h2>Proposal submitted</h2><p>Thanks, ' + esc(me.firstName) + '. Your idea is with the Forum.</p>' +
            '<div class="ticket"><div><span>Reference number</span><strong class="mono">' + esc(p.ref) + '</strong></div>' +
            '<div><span>Submitted</span><strong>' + esc(API.fmtDateTime(p.submittedAt)) + '</strong></div>' +
            '<div><span>Status</span>' + statusPill(p.status) + '</div></div>' +
            '<p class="meta">' + icon('mail') + 'A confirmation email has been sent to ' + esc(me.email) + '.</p>' +
            '<div class="btn-row"><a class="btn btn-primary" href="#/track">Track this proposal ' + icon('arrowRight') + '</a><a class="btn btn-ghost" href="#/">Back to Home</a></div></div>';
          root.querySelector('.confirm-box').focus();
          window.dispatchEvent(new Event('sf:refresh-header'));
        });
      }
    };
  };

  function field(name, label, required, control, hint, counter) {
    return '<div class="field" data-field="' + name + '"><label for="f-' + name + '">' + esc(label) + (required ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>' : '') + '</label>' +
      control + '<div class="field-foot"><span class="hint">' + esc(hint || '') + '</span>' + (counter ? '<span class="count" data-count>0 / 2000</span>' : '') + '</div>' +
      '<p class="field-error" role="alert"></p></div>';
  }

  /* ---------------- Track Your Proposal ---------------- */

  PAGES.track = () => {
    const list = API.myProposals();
    const card = (p, i) => {
      const latest = p.updates.length ? p.updates[p.updates.length - 1] : null;
      return '<article class="track-card" id="' + esc(p.ref) + '">' +
        '<div class="track-head">' + icon('lightbulb', 'track-bulb') +
          '<div class="track-title"><h2>' + esc(p.title) + '</h2>' +
          '<p class="meta"><span class="mono">Ref #' + esc(p.ref) + '</span> · Submitted ' + fmt(p.submittedAt) + ' · ' + esc(p.category) + '</p></div>' +
          statusPill(p.status) + '</div>' +
        journey(p) +
        '<div class="whats-next">' + icon('info') + '<div><strong>' + (p.status === 'rejected' || p.status === 'accepted' || p.status === 'completed' ? 'Outcome' : 'What\'s next?') + '</strong><p>' + esc(stageExplain(p)) + '</p>' +
          (p.rejectionReason ? '<p><strong>Reason from the Forum:</strong> ' + esc(p.rejectionReason) + '</p>' : '') +
          (!['accepted', 'completed', 'rejected'].includes(p.status) ? '<p class="meta">You will be notified by email when there is an update.</p>' : '') + '</div></div>' +
        '<dl class="track-facts">' +
          '<div><dt>Sponsor</dt><dd>' + (p.sponsor ? esc(p.sponsor) : '<span class="meta">Not assigned yet</span>') + '</dd></div>' +
          '<div><dt>Latest update</dt><dd>' + (latest ? esc(latest.text) + ' <span class="meta">(' + fmt(latest.at) + ')</span>' : '<span class="meta">No updates yet</span>') + '</dd></div>' +
        '</dl>' +
        '<details class="track-more"' + (i === 0 ? '' : '') + '><summary>Your proposal and full history</summary>' +
          '<div class="track-more-body"><h3>Description</h3>' + paras(p.description) + (p.issue ? '<h3>The problem it solves</h3>' + paras(p.issue) : '') +
          '<h3>History</h3><ol class="timeline">' + p.timeline.slice().reverse().map((t) => '<li><span class="meta">' + API.fmtDateTime(t.at) + '</span><p>' + esc(API.STATUS[t.status].label) + '</p></li>').join('') + '</ol>' +
          (p.updates.length ? '<h3>Updates from the Forum</h3><ol class="timeline">' + p.updates.slice().reverse().map((u) => '<li><span class="meta">' + fmt(u.at) + '</span><p>' + esc(u.text) + '</p></li>').join('') + '</ol>' : '') +
          '</div></details>' +
        '</article>';
    };

    const stageGuide = '<details class="stage-guide"><summary>' + icon('info') + 'What each stage means</summary><ol>' +
      API.STAGES.map((s) => '<li><strong>' + esc(s.label) + '</strong><span>' + esc(s.explain) + '</span></li>').join('') + '</ol></details>';

    return {
      title: 'Track Your Proposal',
      html: '<main id="main" class="wrap page">' +
        '<header class="page-head"><h1>' + icon('chart', 'h-icon') + 'Track Your Proposal</h1><p class="lede">Follow the progress of your submitted proposals. Only you can see this page.</p></header>' +
        stageGuide +
        (list.length ? '<div class="track-list">' + list.map(card).join('') + '</div>'
          : empty('lightbulb', 'You have not submitted any proposals yet', 'When you submit an idea, you can follow its progress here.', '<a class="btn btn-primary" href="#/submit">Submit a Proposal</a>')) +
        '</main>'
    };
  };

  /* ---------------- About ---------------- */

  PAGES.about = () => {
    const members = API.publicMembers();
    return {
      title: 'About the Forum',
      html: '<main id="main" class="wrap page">' +
        '<header class="page-head"><h1>' + icon('info', 'h-icon') + 'About the Forum</h1><p class="lede">The Student Forum is the elected voice of students. We meet regularly, take student ideas to school leadership and report back on what happens.</p></header>' +
        '<div class="about-grid">' +
          '<section class="card pad"><h2>What we do</h2><ul class="checks">' +
            '<li>' + icon('check') + 'Collect and review student proposals every two weeks.</li>' +
            '<li>' + icon('check') + 'Discuss ideas at Forum meetings and with school staff.</li>' +
            '<li>' + icon('check') + 'Run projects that come out of student suggestions.</li>' +
            '<li>' + icon('check') + 'Publish what we discuss and decide in the Forum Guide.</li></ul></section>' +
          '<section class="card pad"><h2>Your privacy</h2><ul class="checks">' +
            '<li>' + icon('lock') + 'Your proposals are visible only to you and Forum members.</li>' +
            '<li>' + icon('lock') + 'Internal notes and confidential discussions are never published.</li>' +
            '<li>' + icon('lock') + 'Meeting summaries are reviewed and approved by a Forum member before anyone sees them.</li>' +
            '<li>' + icon('lock') + 'We only collect your name, email and grade.</li></ul></section>' +
        '</div>' +
        '<section><h2 class="section-title">How a proposal moves through the Forum</h2><ol class="stage-cards">' +
          API.STAGES.map((s, i) => '<li><span class="stage-num">' + (i + 1) + '</span><strong>' + esc(s.label) + '</strong><p>' + esc(s.explain) + '</p></li>').join('') + '</ol></section>' +
        '<section><h2 class="section-title">Forum members</h2><ul class="member-grid">' +
          members.map((m) => '<li class="card pad member"><span class="avatar" aria-hidden="true">' + esc(m.name.split(' ').map((x) => x[0]).join('')) + '</span><div><strong>' + esc(m.title + ' ' + m.name.split(' ').slice(-1)[0]) + '</strong><span class="meta">' + esc(m.name) + '</span><p>' + esc(m.focus) + '</p></div></li>').join('') +
        '</ul></section></main>'
    };
  };

  /* ---------------- Inbox (simulated email) ---------------- */

  PAGES.inbox = () => {
    const mails = API.myInbox();
    const me = API.me();
    return {
      title: 'Email notifications',
      html: '<main id="main" class="wrap page">' +
        '<header class="page-head row-head"><div><h1>' + icon('mail', 'h-icon') + 'Email notifications</h1><p class="lede">Emails the Forum has sent to ' + esc(me.email) + '. In this demo, emails are delivered here instead of to a real mailbox.</p></div>' +
        (mails.some((m) => !m.read) ? '<button class="btn btn-ghost" data-allread>Mark all as read</button>' : '') + '</header>' +
        (mails.length ? '<ul class="mail-list">' + mails.map((m) =>
          '<li class="mail' + (m.read ? '' : ' unread') + '"><details data-id="' + esc(m.id) + '"><summary>' +
          '<span class="mail-dot" aria-hidden="true"></span><span class="mail-subject">' + esc(m.subject) + (m.read ? '' : '<span class="sr-only"> (unread)</span>') + '</span><span class="mail-time">' + esc(relTime(m.at)) + '</span></summary>' +
          '<div class="mail-body"><p class="meta">From: Student Forum · To: ' + esc(m.toEmail) + ' · ' + esc(API.fmtDateTime(m.at)) + '</p>' + paras(m.body) + '</div></details></li>').join('') + '</ul>'
          : empty('inbox', 'No emails yet', 'You will get an email when you submit a proposal and whenever its status changes.')) +
        '</main>',
      mount(root) {
        root.querySelectorAll('details[data-id]').forEach((d) => d.addEventListener('toggle', () => {
          if (d.open) { API.markRead(d.dataset.id); d.parentElement.classList.remove('unread'); window.dispatchEvent(new Event('sf:refresh-header')); }
        }));
        const all = root.querySelector('[data-allread]');
        if (all) all.addEventListener('click', () => { API.markAllRead(); toast('All emails marked as read'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
      }
    };
  };
})();
