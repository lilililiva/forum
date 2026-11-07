/* =========================================================================
   Student Forum — Forum member pages
   Every API call used here checks the member role on its own; these pages
   are also only routed to members.
   ========================================================================= */
(function () {
  'use strict';
  const { esc, paras, icon, statusPill, tonePill, projectPill, progressBar, empty, relTime, toast, attempt, dialog, confirmDialog, options, toLocalInput, toDateInput } = UI;
  const PAGES = window.PAGES = window.PAGES || {};
  const fmt = API.fmtDate;
  const fmtDT = API.fmtDateTime;
  const rerender = () => window.APP.render();

  const head = (iconName, title, lede, actions) =>
    '<header class="page-head row-head"><div><h1>' + icon(iconName, 'h-icon') + esc(title) + '</h1>' + (lede ? '<p class="lede">' + esc(lede) + '</p>' : '') + '</div>' +
    (actions ? '<div class="btn-row">' + actions + '</div>' : '') + '</header>';

  const panel = (title, body, link, id) =>
    '<section class="panel"' + (id ? ' id="' + id + '"' : '') + '><header class="panel-head"><h2>' + esc(title) + '</h2>' + (link || '') + '</header><div class="panel-body">' + body + '</div></section>';

  const viewAll = (href, label) => '<a class="more" href="' + href + '">' + esc(label || 'View all') + ' ' + icon('arrowRight') + '</a>';

  /* ---------------- Dashboard ---------------- */

  PAGES.dashboard = () => {
    const st = API.stats();
    const recent = API.allProposals().slice(0, 6);
    const attention = API.attention();
    const sugg = API.suggestions();
    const groups = API.groups();
    const windows = API.upcomingWindows();
    const pending = API.pendingSummaries();
    const activity = API.auditLog().slice(0, 7);
    const projects = API.projects().filter((p) => p.status !== 'Completed').slice(0, 4);
    const sub = API.submissionState();

    const stat = (iconName, n, label, href, tone) => '<a class="stat stat-' + tone + '" href="' + href + '">' + icon(iconName) + '<strong>' + n + '</strong><span>' + esc(label) + '</span></a>';
    const row = (p) => '<li><a href="#/admin/proposals/' + esc(p.id) + '"><span class="row-title">' + esc(p.title) + '</span><span class="row-meta">' + fmt(p.submittedAt) + '</span>' + statusPill(p.status) + '</a></li>';

    return {
      title: 'Forum Member Dashboard', admin: true,
      html:
        '<p class="hey">Hey ' + esc(API.greetingName()) + '</p>' +
        head('grid', 'Forum Member Dashboard', 'Review and manage student proposals, updates and Forum activities.') +
        '<div class="stats">' +
          stat('file', st.total, 'Total proposals', '#/admin/proposals', 'blue') +
          stat('clock', st.awaiting, 'Awaiting review', '#/admin/proposals?status=awaiting', 'amber') +
          stat('check', st.approved, 'Approved for consideration', '#/admin/proposals?status=approved', 'blue') +
          stat('users', st.sponsor, 'Assigned to sponsors', '#/admin/proposals?status=sponsor', 'blue') +
          stat('message', st.discussion, 'Under discussion', '#/admin/proposals?status=discussion', 'violet') +
          stat('check', st.accepted, 'Accepted', '#/admin/proposals?status=accepted', 'green') +
          stat('x', st.rejected, 'Rejected', '#/admin/proposals?status=rejected', 'red') +
        '</div>' +
        '<div class="dash-grid">' +
          '<div class="dash-main">' +
            panel('Proposals requiring attention', attention.length ? '<ul class="rows">' + attention.map((a) => '<li><a href="#/admin/proposals/' + esc(a.id) + '"><span class="row-title">' + esc(a.title) + '</span><span class="row-meta warn">' + icon('flag') + esc(a.reason) + '</span>' + statusPill(a.status) + '</a></li>').join('') + '</ul>' : empty('check', 'All caught up', 'No proposals need attention right now.'), viewAll('#/admin/proposals?status=awaiting', 'Review')) +
            panel('Recent submissions', '<ul class="rows">' + recent.map(row).join('') + '</ul>', viewAll('#/admin/proposals')) +
            panel('Similar suggestion groups',
              (sugg.groups.length || sugg.additions.length ? '<div class="sugg-alert">' + icon('sparkles') + '<p><strong>' + (sugg.groups.length + sugg.additions.length) + ' grouping suggestion' + (sugg.groups.length + sugg.additions.length === 1 ? '' : 's') + ' to review.</strong> ' +
                esc(sugg.groups.map((g) => g.name + ' (' + g.proposalIds.length + ')').concat(sugg.additions.map((a) => 'add to ' + a.groupName)).join(' · ')) + '</p></div>' : '') +
              (groups.length ? '<ul class="rows">' + groups.map((g) => '<li><a href="#/admin/groups#' + esc(g.id) + '"><span class="row-title">' + esc(g.name) + '</span><span class="row-meta">' + g.proposals.length + ' proposals</span></a></li>').join('') + '</ul>' : '<p class="meta">No approved groups yet.</p>'),
              viewAll('#/admin/groups', 'Manage groups')) +
            panel('Recent activity', '<ol class="activity">' + activity.map((a) => '<li><span class="meta">' + esc(relTime(a.at)) + '</span><p><strong>' + esc(a.byLabel) + '</strong> · ' + esc(a.action) + (a.target ? ' — ' + esc(a.target) : '') + '</p></li>').join('') + '</ol>', viewAll('#/admin/activity')) +
          '</div>' +
          '<aside class="dash-side">' +
            '<section class="panel quick-actions"><header class="panel-head"><h2>Quick Actions</h2></header><div class="panel-body">' +
              (sub.open ? '<button class="btn btn-danger-soft btn-block" data-act="close">' + icon('lock') + 'Close submissions now</button>'
                        : '<button class="btn btn-primary btn-block" data-act="open">' + icon('calendar') + 'Open submissions for 24 hours</button>') +
              '<a class="btn btn-primary btn-block" href="#/admin/proposals?status=awaiting">' + icon('search') + 'Review new proposals</a>' +
              '<a class="btn btn-primary btn-block" href="#/admin/groups">' + icon('layers') + 'Manage proposal groups</a>' +
              '<a class="btn btn-primary btn-block" href="#/admin/updates?new=1">' + icon('megaphone') + 'Publish a Forum update</a>' +
              '<a class="btn btn-primary btn-block" href="#/admin/meetings?new=1">' + icon('file') + 'Create a meeting summary</a>' +
              '<a class="btn btn-primary btn-block" href="#/admin/meetings?filter=pending">' + icon('check') + 'Review pending summaries' + (pending.length ? ' <span class="count-badge">' + pending.length + '</span>' : '') + '</a>' +
              '<a class="btn btn-primary btn-block" href="#/admin/projects">' + icon('folder') + 'Manage ongoing projects</a>' +
            '</div></section>' +
            panel('Submission windows', '<ul class="rows compact">' + (windows.length ? windows.map((w) => '<li><div class="row-static"><span class="row-title">' + esc(fmtDT(w.opensAt)) + '</span><span class="row-meta">' + (w.state === 'open' ? 'Closes ' + esc(relTime(w.closesAt)) : 'Opens ' + esc(relTime(w.opensAt))) + (w.announced ? '' : ' · not announced') + '</span>' + (w.state === 'open' ? tonePill('Open now', 'green') : tonePill('Scheduled', 'neutral')) + '</div></li>').join('') : '<li><p class="meta">No windows scheduled.</p></li>') + '</ul>', viewAll('#/admin/windows', 'Manage')) +
            panel('Pending meeting summaries', pending.length ? '<ul class="rows compact">' + pending.map((m) => '<li><a href="#/admin/meetings/' + esc(m.id) + '"><span class="row-title">' + esc(m.title) + '</span><span class="row-meta">Submitted by ' + esc(API.memberLabel(m.authorId)) + '</span>' + tonePill('Pending', 'amber') + '</a></li>').join('') + '</ul>' : '<p class="meta">Nothing waiting for approval.</p>', viewAll('#/admin/meetings')) +
            panel('Current Forum projects', '<ul class="rows compact">' + projects.map((p) => '<li><a href="#/admin/projects?edit=' + esc(p.id) + '"><span class="row-title">' + esc(p.title) + (p.published ? '' : ' <span class="meta">(not published)</span>') + '</span>' + progressBar(p.progress, p.title) + '<span class="row-meta">' + esc(p.status) + ' · ' + p.progress + '%</span></a></li>').join('') + '</ul>', viewAll('#/admin/projects')) +
          '</aside>' +
        '</div>',
      mount(root) {
        const o = root.querySelector('[data-act=open]');
        if (o) o.addEventListener('click', () => { if (attempt(() => API.openNow(24), 'Submissions are open for the next 24 hours')) rerender(); });
        const c = root.querySelector('[data-act=close]');
        if (c) c.addEventListener('click', () => confirmDialog('Close submissions now?', 'Students will no longer be able to submit proposals in this window. Forum members will get one summary email.', 'Close submissions', () => { if (attempt(() => API.closeNow(), 'Submissions closed')) rerender(); }, 'danger'));
      }
    };
  };

  /* ---------------- Proposals list ---------------- */

  PAGES.proposals = (params, query) => {
    const all = API.allProposals();
    const f = { q: query.q || '', grade: query.grade || '', cat: query.cat || '', status: query.status || '', from: query.from || '', to: query.to || '' };
    const statusOpts = [{ value: 'awaiting', label: 'Awaiting review (Submitted + Under Review)' }].concat(Object.keys(API.STATUS).map((k) => ({ value: k, label: API.STATUS[k].label })));

    function filtered() {
      const q = f.q.trim().toLowerCase();
      const from = f.from ? new Date(f.from + 'T00:00').getTime() : 0;
      const to = f.to ? new Date(f.to + 'T23:59:59').getTime() : Infinity;
      return all.filter((p) => (!q || (p.title + ' ' + p.description + ' ' + p.issue + ' ' + p.ref).toLowerCase().includes(q)) &&
        (!f.grade || p.grade === f.grade) && (!f.cat || p.category === f.cat) &&
        (!f.status || (f.status === 'awaiting' ? ['submitted', 'under_review'].includes(p.status) : f.status === 'accepted' ? ['accepted', 'completed'].includes(p.status) : p.status === f.status)) &&
        p.submittedAt >= from && p.submittedAt <= to);
    }

    function table() {
      const list = filtered();
      if (!list.length) return empty('search', 'No proposals match', 'Try removing a filter.');
      return '<table class="table"><thead><tr><th scope="col">Proposal</th><th scope="col">Grade</th><th scope="col">Category</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col">Group</th></tr></thead><tbody>' +
        list.map((p) => '<tr><td data-label="Proposal"><a class="cell-title" href="#/admin/proposals/' + esc(p.id) + '">' + esc(p.title) + '</a><span class="mono meta">' + esc(p.ref) + '</span></td>' +
          '<td data-label="Grade">' + esc(p.grade) + '</td><td data-label="Category">' + esc(p.category) + '</td>' +
          '<td data-label="Submitted">' + fmt(p.submittedAt) + '</td><td data-label="Status">' + statusPill(p.status) + '</td>' +
          '<td data-label="Group">' + (p.group ? '<a href="#/admin/groups#' + esc(p.group.id) + '">' + esc(p.group.name) + '</a>' : '<span class="meta">—</span>') + '</td></tr>').join('') +
        '</tbody></table>';
    }

    return {
      title: 'Proposals', admin: true,
      html: head('lightbulb', 'Proposals', 'Every proposal students have submitted. Open one to review it, change its status or add notes.') +
        '<form class="filters admin-filters" role="search" onsubmit="return false">' +
          '<label class="search-field">' + icon('search') + '<span class="sr-only">Search by title or keyword</span><input type="search" name="q" placeholder="Search title, keyword or reference" value="' + esc(f.q) + '"></label>' +
          '<label class="select-field"><span class="label-sm">Grade</span><select name="grade">' + options(API.GRADES, f.grade, 'All grades') + '</select></label>' +
          '<label class="select-field"><span class="label-sm">Category</span><select name="cat">' + options(API.CATEGORIES, f.cat, 'All categories') + '</select></label>' +
          '<label class="select-field"><span class="label-sm">Status</span><select name="status">' + options(statusOpts, f.status, 'All statuses') + '</select></label>' +
          '<label class="select-field"><span class="label-sm">From</span><input type="date" name="from" value="' + esc(f.from) + '"></label>' +
          '<label class="select-field"><span class="label-sm">To</span><input type="date" name="to" value="' + esc(f.to) + '"></label>' +
          '<button type="button" class="btn btn-ghost" data-reset>Clear</button>' +
        '</form><p class="result-count" aria-live="polite"></p><div class="table-wrap" id="ptable"></div>',
      mount(root) {
        const box = root.querySelector('#ptable');
        const count = root.querySelector('.result-count');
        const render = () => { box.innerHTML = table(); const n = filtered().length; count.textContent = n + ' of ' + all.length + ' proposals'; };
        root.querySelectorAll('.admin-filters input, .admin-filters select').forEach((el) => el.addEventListener(el.type === 'search' ? 'input' : 'change', () => { f[el.name] = el.value; render(); }));
        root.querySelector('[data-reset]').addEventListener('click', () => { Object.keys(f).forEach((k) => { f[k] = ''; }); root.querySelectorAll('.admin-filters input, .admin-filters select').forEach((el) => { el.value = ''; }); render(); });
        render();
      }
    };
  };

  /* ---------------- Proposal detail ---------------- */

  PAGES.proposalDetail = (params) => {
    const p = API.proposal(params.id);
    if (!p) return { title: 'Not found', admin: true, html: empty('search', 'Proposal not found', '') };
    const membersList = API.membersList();
    const groups = API.groups();
    const changeTo = ['under_review', 'approved', 'sponsor', 'discussion', 'accepted', 'completed', 'rejected'].filter((s) => s !== p.status);

    const history = p.history.slice().reverse().map((h) => '<li><span class="meta">' + fmtDT(h.at) + '</span><p>' + statusPill(h.status) + ' <span class="by">by ' + esc(h.by === p.ownerId ? p.ownerName + ' (student)' : API.memberLabel(h.by)) + '</span></p></li>').join('');
    const notes = p.internalNotes.length ? p.internalNotes.slice().reverse().map((n) => '<li><span class="meta">' + fmtDT(n.at) + ' · ' + esc(API.memberLabel(n.by)) + '</span><p>' + esc(n.text) + '</p></li>').join('') : '<li class="meta">No internal notes yet.</li>';
    const updates = p.updates.length ? p.updates.slice().reverse().map((n) => '<li><span class="meta">' + fmtDT(n.at) + ' · ' + esc(API.memberLabel(n.by)) + '</span><p>' + esc(n.text) + '</p></li>').join('') : '<li class="meta">No student-visible updates yet.</li>';

    return {
      title: p.title, admin: true,
      html: '<a class="back" href="#/admin/proposals">' + icon('arrowLeft') + 'All proposals</a>' +
        '<header class="page-head row-head"><div><p class="mono meta">' + esc(p.ref) + '</p><h1>' + esc(p.title) + '</h1>' +
          '<p class="meta">' + statusPill(p.status) + ' · ' + esc(p.category) + ' · ' + esc(p.grade) + ' · Submitted ' + fmtDT(p.submittedAt) + '</p></div></header>' +
        '<div class="detail-grid"><div class="detail-main">' +
          '<section class="card pad"><h2 class="h-sm">Student</h2><p>' + esc(p.ownerName) + ' · ' + esc(p.grade) + ' · <span class="meta">' + esc(p.ownerEmail) + '</span></p>' +
          '<h2 class="h-sm">Description</h2>' + paras(p.description) +
          (p.issue ? '<h2 class="h-sm">The problem it solves</h2>' + paras(p.issue) : '') +
          (p.status === 'rejected' && p.rejectionReason ? '<h2 class="h-sm">Rejection reason</h2><p>' + esc(p.rejectionReason) + ' <span class="meta">(' + (p.shareReason ? 'shared with the student' : 'not shared') + ')</span></p>' : '') +
          '</section>' +
          '<section class="card pad internal"><h2 class="h-sm">' + icon('lock') + 'Internal notes <span class="meta">— Forum members only, never shown to students</span></h2>' +
            '<form class="inline-form" data-form="note"><label class="sr-only" for="note-text">New internal note</label><textarea id="note-text" name="text" rows="2" placeholder="Add a private note for other Forum members…"></textarea><button class="btn btn-ghost" type="submit">' + icon('plus') + 'Add note</button></form>' +
            '<ol class="timeline">' + notes + '</ol></section>' +
          '<section class="card pad"><h2 class="h-sm">' + icon('eye') + 'Updates visible to the student</h2>' +
            '<form class="inline-form" data-form="update"><label class="sr-only" for="upd-text">New student-visible update</label><textarea id="upd-text" name="text" rows="2" placeholder="Write an update the student will see and be emailed…"></textarea><button class="btn btn-ghost" type="submit">' + icon('send') + 'Post update</button></form>' +
            '<ol class="timeline">' + updates + '</ol></section>' +
        '</div><aside class="detail-side">' +
          '<section class="card pad"><h2 class="h-sm">Change status</h2>' +
            '<form data-form="status" class="stack">' +
              '<label class="field-sm"><span>New status</span><select name="status" required>' + options(changeTo.map((s) => ({ value: s, label: API.STATUS[s].label })), '', 'Choose a status') + '</select></label>' +
              '<div data-reject hidden class="stack"><label class="field-sm"><span>Reason for rejection</span><textarea name="reason" rows="3" placeholder="Why is the Forum not taking this further?"></textarea></label>' +
                '<label class="check"><input type="checkbox" name="share" checked> Share this reason with the student</label></div>' +
              '<label class="field-sm"><span>Message to the student (optional)</span><textarea name="message" rows="2" placeholder="Included in the status email"></textarea></label>' +
              '<button class="btn btn-primary btn-block" type="submit">Update status</button>' +
              '<p class="meta small">The student gets one email with the new status and your message.</p></form>' +
            '<div class="quick-status"><button class="btn btn-ghost btn-sm" data-quick="approved"' + (p.status === 'approved' ? ' disabled' : '') + '>' + icon('check') + 'Approve for consideration</button><button class="btn btn-ghost btn-sm danger" data-quick="rejected"' + (p.status === 'rejected' ? ' disabled' : '') + '>' + icon('x') + 'Reject</button></div>' +
          '</section>' +
          '<section class="card pad"><h2 class="h-sm">Sponsor</h2><form data-form="sponsor" class="stack">' +
            '<label class="field-sm"><span class="sr-only">Sponsor</span><select name="sponsor">' + options(membersList.map((m) => ({ value: m.id, label: m.label })), p.sponsorId || '', 'Choose a Forum member') + '</select></label>' +
            '<button class="btn btn-ghost btn-block" type="submit">' + (p.sponsorId ? 'Change sponsor' : 'Assign sponsor') + '</button></form></section>' +
          '<section class="card pad"><h2 class="h-sm">Group</h2><form data-form="group" class="stack">' +
            '<label class="field-sm"><span class="sr-only">Group</span><select name="group">' + options(groups.map((g) => ({ value: g.id, label: g.name })), p.group ? p.group.id : '', 'Not in a group') + '</select></label>' +
            '<button class="btn btn-ghost btn-block" type="submit">Save group</button></form></section>' +
          '<section class="card pad"><h2 class="h-sm">Status history</h2><ol class="timeline">' + history + '</ol></section>' +
        '</aside></div>',
      mount(root) {
        const sf = root.querySelector('[data-form=status]');
        const rej = sf.querySelector('[data-reject]');
        sf.status.addEventListener('change', () => { rej.hidden = sf.status.value !== 'rejected'; });
        sf.addEventListener('submit', (e) => {
          e.preventDefault();
          const status = sf.status.value;
          if (!status) { toast('Choose a status first.', 'error'); sf.status.focus(); return; }
          if (status === 'sponsor' && !p.sponsorId) { toast('Assign a sponsor below first.', 'error'); return; }
          const label = API.STATUS[status].label;
          confirmDialog('Change status to ' + label + '?', 'This is recorded with your name and the date, and ' + p.ownerName + ' will be emailed.', 'Change status', () => {
            if (attempt(() => API.changeStatus(p.id, status, { reason: sf.reason.value, shareReason: sf.share.checked, message: sf.message.value }), 'Status changed to ' + label + '. ' + p.ownerName.split(' ')[0] + ' has been emailed.')) rerender();
          }, status === 'rejected' ? 'danger' : '');
        });
        root.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => {
          sf.status.value = b.dataset.quick;
          sf.status.dispatchEvent(new Event('change'));
          sf.status.focus();
          if (b.dataset.quick === 'rejected') sf.reason.focus();
          else sf.requestSubmit();
        }));
        root.querySelector('[data-form=note]').addEventListener('submit', (e) => {
          e.preventDefault();
          if (attempt(() => API.addInternalNote(p.id, e.target.text.value), 'Internal note added')) rerender();
        });
        root.querySelector('[data-form=update]').addEventListener('submit', (e) => {
          e.preventDefault();
          if (attempt(() => API.addStudentUpdate(p.id, e.target.text.value), 'Update posted and emailed to ' + p.ownerName.split(' ')[0])) rerender();
        });
        root.querySelector('[data-form=sponsor]').addEventListener('submit', (e) => {
          e.preventDefault();
          const v = e.target.sponsor.value;
          if (!v) { toast('Choose a Forum member.', 'error'); return; }
          if (attempt(() => API.assignSponsor(p.id, v), 'Sponsor assigned: ' + API.memberLabel(v))) rerender();
        });
        root.querySelector('[data-form=group]').addEventListener('submit', (e) => {
          e.preventDefault();
          if (attempt(() => API.moveToGroup(p.id, e.target.group.value || null), 'Group saved')) rerender();
        });
      }
    };
  };

  /* ---------------- Groups ---------------- */

  PAGES.groups = () => {
    const sugg = API.suggestions();
    const groups = API.groups();
    const all = API.allProposals();
    const ungrouped = all.filter((p) => !p.group);
    const brief = (p, extra) => '<li class="mini-prop"><div><a href="#/admin/proposals/' + esc(p.id) + '">' + esc(p.title) + '</a><span class="meta mono">' + esc(p.ref) + ' · ' + esc(p.grade) + '</span></div>' + statusPill(p.status) + (extra || '') + '</li>';
    const moveSel = (pid, current) => '<label class="move"><span class="sr-only">Move to group</span><select data-move="' + esc(pid) + '">' + options(groups.map((g) => ({ value: g.id, label: 'Move to: ' + g.name })), current || '', current ? 'Remove from group' : 'Add to a group…') + '</select></label>';

    const suggestionCards = sugg.groups.map((s) =>
      '<article class="sugg-card"><header>' + icon('sparkles') + '<span class="pill pill-violet">Suggested group</span></header>' +
      '<label class="field-sm"><span>Group name</span><input data-name="' + esc(s.key) + '" value="' + esc(s.name) + '"></label>' +
      '<p class="meta">' + s.proposals.length + ' proposals look like they address the same concern.</p>' +
      '<ul class="mini-list">' + s.proposals.map((p) => brief(p)).join('') + '</ul>' +
      '<footer class="btn-row"><button class="btn btn-primary" data-approve="' + esc(s.key) + '">' + icon('check') + 'Approve group</button><button class="btn btn-ghost" data-dismiss="' + esc(s.key) + '">Not related</button></footer></article>').join('') +
      sugg.additions.map((a) =>
      '<article class="sugg-card"><header>' + icon('sparkles') + '<span class="pill pill-violet">Suggested addition</span></header>' +
      '<p>Add this proposal to <strong>' + esc(a.groupName) + '</strong>?</p><ul class="mini-list">' + brief(a.proposal) + '</ul>' +
      '<footer class="btn-row"><button class="btn btn-primary" data-approve="' + esc(a.key) + '">' + icon('check') + 'Add to group</button><button class="btn btn-ghost" data-dismiss="' + esc(a.key) + '">Not related</button></footer></article>').join('');

    const groupCards = groups.map((g) =>
      '<article class="group-card card" id="' + esc(g.id) + '"><header class="group-head">' +
        '<div><h3>' + esc(g.name) + '</h3><p class="meta">' + g.proposals.length + ' proposals · ' + (g.source === 'suggested' ? 'from a suggestion' : 'created manually') + '</p></div>' +
        '<div class="btn-row"><button class="btn btn-ghost btn-sm" data-rename="' + esc(g.id) + '" data-current="' + esc(g.name) + '">' + icon('edit') + 'Rename</button><button class="btn btn-ghost btn-sm danger" data-ungroup="' + esc(g.id) + '">Ungroup</button></div></header>' +
        '<form class="stack" data-summary="' + esc(g.id) + '"><label class="field-sm"><span>Combined summary of the ideas</span><textarea name="summary" rows="3" placeholder="What do these proposals ask for, together?">' + esc(g.summary) + '</textarea></label><button class="btn btn-ghost btn-sm" type="submit">Save summary</button></form>' +
        '<h4 class="h-xs">Original submissions</h4><ul class="mini-list">' + (g.proposals.length ? g.proposals.map((p) => brief(p, moveSel(p.id, g.id))).join('') : '<li class="meta">No proposals in this group.</li>') + '</ul>' +
      '</article>').join('');

    return {
      title: 'Proposal groups', admin: true,
      html: head('layers', 'Proposal groups', 'Group proposals that address the same concern. Groups help you spot common concerns; the original proposals are always kept as they are.',
        '<button class="btn btn-primary" data-create>' + icon('plus') + 'Create group</button>') +
        '<section class="sugg-section"><h2 class="section-title">' + icon('sparkles') + 'Suggested by the platform</h2>' +
          '<p class="meta">The platform compares the wording of ungrouped proposals and suggests groups. Suggestions do nothing until a Forum member approves them.</p>' +
          (suggestionCards ? '<div class="sugg-grid">' + suggestionCards + '</div>' : empty('sparkles', 'No new suggestions', 'New ones appear when similar proposals arrive.')) + '</section>' +
        '<section><h2 class="section-title">Approved groups</h2>' + (groupCards ? '<div class="group-list">' + groupCards + '</div>' : empty('layers', 'No groups yet', 'Approve a suggestion or create a group.')) + '</section>' +
        '<section><h2 class="section-title">Ungrouped proposals (' + ungrouped.length + ')</h2><div class="card pad"><ul class="mini-list">' + ungrouped.map((p) => brief(p, moveSel(p.id, ''))).join('') + '</ul></div></section>',
      mount(root) {
        root.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', () => {
          const nameInput = root.querySelector('[data-name="' + CSS.escape(b.dataset.approve) + '"]');
          if (attempt(() => API.approveSuggestion(b.dataset.approve, nameInput ? nameInput.value : ''), 'Group approved')) rerender();
        }));
        root.querySelectorAll('[data-dismiss]').forEach((b) => b.addEventListener('click', () => {
          if (attempt(() => API.dismissSuggestion(b.dataset.dismiss), 'Suggestion dismissed. It will not be suggested again.')) rerender();
        }));
        root.querySelectorAll('[data-move]').forEach((s) => s.addEventListener('change', () => {
          if (attempt(() => API.moveToGroup(s.dataset.move, s.value || null), s.value ? 'Proposal moved' : 'Removed from group')) rerender();
        }));
        root.querySelectorAll('[data-summary]').forEach((f) => f.addEventListener('submit', (e) => {
          e.preventDefault();
          attempt(() => API.saveGroupSummary(f.dataset.summary, f.summary.value), 'Summary saved');
        }));
        root.querySelectorAll('[data-rename]').forEach((b) => b.addEventListener('click', () => dialog({
          title: 'Rename group', confirm: 'Rename',
          body: '<label class="field-sm"><span>Group name</span><input name="name" value="' + esc(b.dataset.current) + '"></label>',
          onConfirm: (form) => { if (!attempt(() => API.renameGroup(b.dataset.rename, form.elements.name.value), 'Group renamed')) return false; rerender(); }
        })));
        root.querySelectorAll('[data-ungroup]').forEach((b) => b.addEventListener('click', () => confirmDialog('Ungroup these proposals?', 'The group and its combined summary are removed. Every original proposal is kept.', 'Ungroup', () => { if (attempt(() => API.deleteGroup(b.dataset.ungroup), 'Group removed')) rerender(); }, 'danger')));
        root.querySelector('[data-create]').addEventListener('click', () => {
          const free = API.allProposals().filter((p) => !p.group);
          dialog({
            title: 'Create a group', confirm: 'Create group', wide: true,
            body: '<label class="field-sm"><span>Group name</span><input name="name" placeholder="e.g. Improving Student Study Spaces"></label>' +
              '<fieldset class="pick"><legend>Proposals to include</legend>' + (free.length ? free.map((p) => '<label class="check"><input type="checkbox" name="ids" value="' + esc(p.id) + '"> ' + esc(p.title) + ' <span class="meta mono">' + esc(p.ref) + '</span></label>').join('') : '<p class="meta">Every proposal is already in a group.</p>') + '</fieldset>',
            onConfirm: (form) => {
              const ids = Array.from(form.querySelectorAll('[name=ids]:checked')).map((x) => x.value);
              if (!attempt(() => API.createGroup(form.elements.name.value, ids), 'Group created')) return false;
              rerender();
            }
          });
        });
        if (location.hash.includes('#g-') || /#\/admin\/groups#/.test(location.hash)) {
          const id = location.hash.split('#').pop();
          const el = document.getElementById(id);
          if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); }
        }
      }
    };
  };

  /* ---------------- Meeting summaries ---------------- */

  const FLOW = ['notes', 'draft', 'pending', 'approved', 'published'];
  const FLOW_LABEL = { notes: 'Notes added', draft: 'Draft summary', pending: 'Pending approval', approved: 'Approved', published: 'Published' };

  function flowBar(status) {
    const i = FLOW.indexOf(status);
    return '<ol class="flow" aria-label="Summary workflow">' + FLOW.map((s, j) => '<li class="' + (j < i ? 'done' : j === i ? 'current' : '') + '"' + (j === i ? ' aria-current="step"' : '') + '><span>' + (j < i ? icon('check') : j + 1) + '</span>' + FLOW_LABEL[s] + '</li>').join('') + '</ol>';
  }

  PAGES.meetings = (params, query) => {
    const list = API.meetings();
    const filter = query.filter || '';
    const shown = filter ? list.filter((m) => m.status === filter) : list;
    return {
      title: 'Meeting summaries', admin: true,
      html: head('file', 'Meeting summaries', 'Add meeting notes, prepare a student-facing summary and send it for approval. Only approved summaries can be published.',
        '<button class="btn btn-primary" data-new>' + icon('plus') + 'New meeting</button>') +
        '<div class="tabs" role="tablist">' + [['', 'All'], ['pending', 'Pending approval'], ['draft', 'Drafts'], ['approved', 'Approved'], ['published', 'Published']].map((t) =>
          '<a role="tab" href="#/admin/meetings' + (t[0] ? '?filter=' + t[0] : '') + '" aria-selected="' + (filter === t[0]) + '">' + t[1] + ' <span>' + (t[0] ? list.filter((m) => m.status === t[0]).length : list.length) + '</span></a>').join('') + '</div>' +
        (shown.length ? '<ul class="meeting-list">' + shown.map((m) => '<li class="card"><a href="#/admin/meetings/' + esc(m.id) + '">' +
          '<div><h3>' + esc(m.title) + '</h3><p class="meta">' + fmt(m.date) + ' · by ' + esc(API.memberLabel(m.authorId)) + (m.auto ? ' · automatic draft' : '') + '</p></div>' +
          tonePill(API.SUMMARY_STATUS[m.status].label, API.SUMMARY_STATUS[m.status].tone) + '</a></li>').join('') + '</ul>' : empty('file', 'Nothing here', 'No meetings with this status.')),
      mount(root) {
        const open = () => dialog({
          title: 'New meeting', confirm: 'Create',
          body: '<label class="field-sm"><span>Meeting title</span><input name="title" placeholder="Forum Meeting — Topic"></label><label class="field-sm"><span>Meeting date</span><input type="date" name="date" value="' + toDateInput(Date.now()) + '"></label>',
          onConfirm: (form) => {
            const id = attempt(() => API.createMeeting(form.elements.title.value, new Date(form.date.value + 'T15:00').getTime()));
            if (!id) return false;
            location.hash = '#/admin/meetings/' + id;
          }
        });
        root.querySelector('[data-new]').addEventListener('click', open);
        if (query.new) { history.replaceState(null, '', '#/admin/meetings'); open(); }
      }
    };
  };

  const SUMMARY_FIELDS = [
    ['topics', 'Main topics discussed', 'message', ''],
    ['decisions', 'Decisions finalised', 'gavel', 'green'],
    ['ongoing', 'Still being discussed', 'clock', 'amber'],
    ['implementing', 'Projects being implemented', 'folder', 'blue'],
    ['proposals', 'Proposals considered', 'lightbulb', ''],
    ['actions', 'Actions agreed', 'check', ''],
    ['nextSteps', 'Next steps', 'arrowRight', '']
  ];

  PAGES.meetingDetail = (params) => {
    const m = API.meeting(params.id);
    if (!m) return { title: 'Not found', admin: true, html: empty('search', 'Meeting not found', '') };
    const me = API.me();
    const s = m.summary || API.emptySummary();
    const isAuthor = m.authorId === me.id;
    const notesLocked = m.status === 'published';
    const summaryLocked = m.status === 'approved' || m.status === 'published' || (m.status === 'pending' && isAuthor);
    const canReview = m.status === 'pending' && !isAuthor;

    let actions = '';
    if (m.status === 'notes' || m.status === 'draft') actions += '<button class="btn btn-ghost" data-act="generate">' + icon('sparkles') + (m.status === 'draft' ? 'Regenerate draft from notes' : 'Generate draft from notes') + '</button>';
    if (m.status === 'draft') actions += '<button class="btn btn-primary" data-act="submit">' + icon('send') + 'Submit for approval</button>';
    if (m.status === 'pending' && isAuthor) actions += '<button class="btn btn-ghost" data-act="withdraw">Withdraw from review</button>';
    if (canReview) actions += '<button class="btn btn-danger-soft" data-act="reject">' + icon('x') + 'Request changes</button><button class="btn btn-primary" data-act="approve">' + icon('check') + 'Approve summary</button>';
    if (m.status === 'approved') actions += '<button class="btn btn-ghost" data-act="reopen">' + icon('edit') + 'Reopen for edits</button><button class="btn btn-primary" data-act="publish">' + icon('megaphone') + 'Publish to Forum Guide</button>';
    if (m.status === 'published') actions += '<a class="btn btn-ghost" href="#/guide/meeting/' + esc(m.id) + '">' + icon('eye') + 'View as students see it</a><button class="btn btn-danger-soft" data-act="unpublish">Unpublish</button>';

    let notice = '';
    if (m.status === 'pending' && isAuthor) notice = '<div class="notice notice-amber">' + icon('clock') + '<p>You submitted this summary, so a <strong>different Forum member</strong> must review and approve it. You can withdraw it to keep editing.</p></div>';
    else if (canReview) notice = '<div class="notice notice-amber">' + icon('info') + '<p><strong>Your review is needed.</strong> Read the summary against the notes, edit anything that is wrong or confidential, then approve it or request changes.</p></div>';
    else if (m.status === 'approved') notice = '<div class="notice notice-blue">' + icon('check') + '<p>Approved by ' + esc(API.memberLabel(m.approvedBy)) + '. It is not visible to students until you publish it. Reopening it clears the approval.</p></div>';
    else if (m.status === 'published') notice = '<div class="notice notice-green">' + icon('eye') + '<p>Published ' + fmtDT(m.publishedAt) + '. Students can read this summary in the Forum Guide.</p></div>';
    const lastReject = m.review.slice().reverse().find((r) => r.action === 'rejected');
    if (m.status === 'draft' && lastReject) notice = '<div class="notice notice-red">' + icon('message') + '<p><strong>' + esc(API.memberLabel(lastReject.by)) + ' requested changes:</strong> ' + esc(lastReject.comment) + '</p></div>';

    const listField = (f) => '<div class="sum-field sum-' + (f[3] || 'plain') + '"><label for="s-' + f[0] + '">' + icon(f[2]) + esc(f[1]) + ' <span class="meta">— one item per line</span></label>' +
      '<textarea id="s-' + f[0] + '" name="' + f[0] + '" rows="3"' + (summaryLocked ? ' readonly' : '') + '>' + esc((s[f[0]] || []).join('\n')) + '</textarea></div>';

    return {
      title: m.title, admin: true,
      html: '<a class="back" href="#/admin/meetings">' + icon('arrowLeft') + 'All meetings</a>' +
        '<header class="page-head row-head"><div><h1>' + esc(m.title) + '</h1><p class="meta">' + fmt(m.date) + ' · ' + tonePill(API.SUMMARY_STATUS[m.status].label, API.SUMMARY_STATUS[m.status].tone) + ' · prepared by ' + esc(API.memberLabel(m.authorId)) + '</p></div></header>' +
        flowBar(m.status) + notice +
        '<div class="meeting-grid">' +
          '<section class="card pad"><h2 class="h-sm">1. Meeting notes</h2>' +
            '<form data-form="notes" class="stack">' +
              '<div class="form-row"><label class="field-sm"><span>Title</span><input name="title" value="' + esc(m.title) + '"' + (notesLocked ? ' readonly' : '') + '></label>' +
              '<label class="field-sm"><span>Date</span><input type="date" name="date" value="' + toDateInput(m.date) + '"' + (notesLocked ? ' readonly' : '') + '></label></div>' +
              '<label class="field-sm"><span>Notes</span><textarea name="notes" rows="10"' + (notesLocked ? ' readonly' : '') + ' placeholder="Start lines with Discussed:, Decision:, Action:, Ongoing:, Project: or Next: to help the draft generator.">' + esc(m.notes) + '</textarea></label>' +
              '<div class="confidential"><label class="field-sm"><span>' + icon('lock') + 'Confidential notes — never published, never used in drafts</span><textarea name="confidential" rows="3"' + (notesLocked ? ' readonly' : '') + '>' + esc(m.confidential) + '</textarea></label>' +
              '<p class="meta small">Lines in the main notes that start with CONFIDENTIAL or PRIVATE are also left out of automatic drafts.</p></div>' +
              (notesLocked ? '' : '<button class="btn btn-ghost" type="submit">Save notes</button>') +
            '</form></section>' +
          '<section class="card pad"><h2 class="h-sm">2. Student-facing summary</h2>' +
            (m.auto ? '<div class="notice notice-violet small">' + icon('sparkles') + '<p>This summary started as an <strong>automatic draft</strong> built from the notes. It must be checked by a person and cannot be published without approval.</p></div>' : '') +
            '<form data-form="summary" class="stack">' +
              '<div class="sum-field"><label for="s-overview">Overview</label><textarea id="s-overview" name="overview" rows="2"' + (summaryLocked ? ' readonly' : '') + '>' + esc(s.overview) + '</textarea></div>' +
              SUMMARY_FIELDS.map(listField).join('') +
              (summaryLocked ? '' : '<button class="btn btn-ghost" type="submit">' + (canReview ? 'Save my edits' : 'Save summary') + '</button>') +
            '</form></section>' +
        '</div>' +
        '<div class="sticky-actions">' + actions + '</div>' +
        (m.review.length ? '<section class="card pad"><h2 class="h-sm">Review history</h2><ol class="timeline">' + m.review.slice().reverse().map((r) => '<li><span class="meta">' + fmtDT(r.at) + '</span><p><strong>' + esc(API.memberLabel(r.by)) + '</strong> ' + esc(r.action) + (r.comment ? ': “' + esc(r.comment) + '”' : '') + '</p></li>').join('') + '</ol></section>' : ''),
      mount(root) {
        const nf = root.querySelector('[data-form=notes]');
        const sf = root.querySelector('[data-form=summary]');
        const readSummary = () => {
          const out = { overview: sf.overview.value.trim() };
          SUMMARY_FIELDS.forEach((f) => { out[f[0]] = sf[f[0]].value.split('\n').map((x) => x.trim()).filter(Boolean); });
          return out;
        };
        const saveNotes = () => API.saveMeetingNotes(m.id, { title: nf.elements.title.value, date: new Date(nf.date.value + 'T15:00').getTime(), notes: nf.notes.value, confidential: nf.confidential.value });
        nf.addEventListener('submit', (e) => { e.preventDefault(); if (attempt(saveNotes, 'Notes saved')) rerender(); });
        sf.addEventListener('submit', (e) => { e.preventDefault(); if (attempt(() => API.saveSummary(m.id, readSummary()), 'Summary saved')) rerender(); });
        const act = (name, fn) => { const b = root.querySelector('[data-act=' + name + ']'); if (b) b.addEventListener('click', fn); };
        act('generate', () => {
          const go = () => { if (attempt(() => { saveNotes(); API.generateDraft(m.id); }, 'Draft generated from the notes. Check every line before submitting.')) rerender(); };
          if (m.status === 'draft') confirmDialog('Replace the current draft?', 'Regenerating rebuilds the summary from the notes and discards edits to the summary.', 'Regenerate', go); else go();
        });
        act('submit', () => {
          if (!sf.overview.readOnly && !attempt(() => API.saveSummary(m.id, readSummary()))) return;
          confirmDialog('Submit for approval?', 'Other Forum members will be emailed. A different member must approve the summary before it can be published.', 'Submit', () => { if (attempt(() => API.submitForApproval(m.id), 'Sent for approval')) rerender(); });
        });
        act('withdraw', () => { if (attempt(() => API.withdrawSummary(m.id), 'Withdrawn. You can edit the draft again.')) rerender(); });
        act('approve', () => {
          if (!attempt(() => API.saveSummary(m.id, readSummary()))) return;
          dialog({ title: 'Approve this summary?', confirm: 'Approve', body: '<p>Confirm you have checked it for accuracy and that it contains nothing confidential.</p><label class="field-sm"><span>Comment (optional)</span><textarea name="comment" rows="2"></textarea></label>',
            onConfirm: (form) => { if (!attempt(() => API.reviewSummary(m.id, 'approve', form.comment.value), 'Summary approved. It can now be published.')) return false; rerender(); } });
        });
        act('reject', () => dialog({ title: 'Request changes', confirm: 'Send back', tone: 'danger', body: '<label class="field-sm"><span>What needs to change?</span><textarea name="comment" rows="3" required></textarea></label>',
          onConfirm: (form) => { if (!attempt(() => API.reviewSummary(m.id, 'reject', form.comment.value), 'Sent back to ' + API.memberLabel(m.authorId))) return false; rerender(); } }));
        act('publish', () => confirmDialog('Publish to the Forum Guide?', 'Every student will be able to read this summary. Confidential notes stay private.', 'Publish', () => { if (attempt(() => API.publishSummary(m.id), 'Published to the Forum Guide')) rerender(); }));
        act('unpublish', () => confirmDialog('Unpublish this summary?', 'Students will no longer see it. It stays approved.', 'Unpublish', () => { if (attempt(() => API.unpublishSummary(m.id), 'Unpublished')) rerender(); }, 'danger'));
        act('reopen', () => confirmDialog('Reopen for edits?', 'The approval is cleared, and the summary must be approved again before publishing.', 'Reopen', () => { if (attempt(() => API.reopenSummary(m.id), 'Reopened as a draft')) rerender(); }));
      }
    };
  };

  /* ---------------- Forum updates ---------------- */

  PAGES.updates = (params, query) => {
    const posts = API.posts();
    const cats = Object.keys(API.GUIDE_CATEGORIES).filter((k) => k !== 'meetings' && k !== 'projects').map((k) => ({ value: k, label: API.GUIDE_CATEGORIES[k].label }));
    const editor = (p) => {
      p = p || { title: '', category: 'announcements', summary: '', body: '', nextSteps: '', state: 'ongoing' };
      return '<label class="field-sm"><span>Title</span><input name="title" value="' + esc(p.title) + '"></label>' +
        '<div class="form-row"><label class="field-sm"><span>Category</span><select name="category">' + options(cats, p.category) + '</select></label>' +
        '<label class="field-sm"><span>Status</span><select name="state">' + options([{ value: 'ongoing', label: 'Ongoing' }, { value: 'completed', label: 'Completed' }], p.state) + '</select></label></div>' +
        '<label class="field-sm"><span>Short explanation</span><textarea name="summary" rows="2">' + esc(p.summary) + '</textarea></label>' +
        '<label class="field-sm"><span>Full update (optional)</span><textarea name="body" rows="5">' + esc(p.body) + '</textarea></label>' +
        '<label class="field-sm"><span>Next steps (optional)</span><input name="nextSteps" value="' + esc(p.nextSteps) + '"></label>' +
        '<p class="meta small">Meeting summaries and projects appear in the Forum Guide automatically once published.</p>';
    };
    return {
      title: 'Forum updates', admin: true,
      html: head('megaphone', 'Forum updates', 'Announcements and decisions for the Forum Guide. Drafts are only visible to Forum members.', '<button class="btn btn-primary" data-new>' + icon('plus') + 'New update</button>') +
        '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Update</th><th scope="col">Category</th><th scope="col">Date</th><th scope="col">Visibility</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        posts.map((p) => '<tr><td data-label="Update"><span class="cell-title">' + esc(p.title) + '</span><span class="meta">' + esc(p.summary) + '</span></td>' +
          '<td data-label="Category">' + esc(API.GUIDE_CATEGORIES[p.category].label) + '</td><td data-label="Date">' + fmt(p.publishedAt || p.createdAt) + '</td>' +
          '<td data-label="Visibility">' + (p.published ? tonePill('Published', 'green') : tonePill('Draft', 'neutral')) + '</td>' +
          '<td class="cell-actions"><button class="btn btn-ghost btn-sm" data-edit="' + esc(p.id) + '">' + icon('edit') + 'Edit</button>' +
          (p.published ? '<button class="btn btn-ghost btn-sm" data-unpub="' + esc(p.id) + '">Unpublish</button>' : '<button class="btn btn-primary btn-sm" data-pub="' + esc(p.id) + '">Publish</button><button class="icon-btn danger" aria-label="Delete draft" data-del="' + esc(p.id) + '">' + icon('trash') + '</button>') + '</td></tr>').join('') +
        '</tbody></table></div>',
      mount(root) {
        const open = (id) => {
          const p = id ? posts.find((x) => x.id === id) : null;
          dialog({ title: p ? 'Edit update' : 'New Forum update', wide: true, confirm: p && p.published ? 'Save changes' : 'Save draft',
            body: editor(p),
            onConfirm: (form) => {
              const data = Object.fromEntries(new FormData(form));
              data.id = p ? p.id : null;
              if (!attempt(() => API.savePost(data), p ? 'Update saved' : 'Draft saved. Publish it when it is ready.')) return false;
              rerender();
            } });
        };
        root.querySelector('[data-new]').addEventListener('click', () => open());
        root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => open(b.dataset.edit)));
        root.querySelectorAll('[data-pub]').forEach((b) => b.addEventListener('click', () => confirmDialog('Publish this update?', 'It will appear in the Forum Guide for every student.', 'Publish', () => { if (attempt(() => API.setPostPublished(b.dataset.pub, true), 'Published to the Forum Guide')) rerender(); })));
        root.querySelectorAll('[data-unpub]').forEach((b) => b.addEventListener('click', () => { if (attempt(() => API.setPostPublished(b.dataset.unpub, false), 'Unpublished')) rerender(); }));
        root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => confirmDialog('Delete this draft?', 'This cannot be undone.', 'Delete', () => { if (attempt(() => API.deletePost(b.dataset.del), 'Draft deleted')) rerender(); }, 'danger')));
        if (query.new) { history.replaceState(null, '', '#/admin/updates'); open(); }
      }
    };
  };

  /* ---------------- Projects ---------------- */

  PAGES.projects = (params, query) => {
    const projects = API.projects();
    const membersList = API.membersList();
    const proposals = API.allProposals();
    const editor = (p) => {
      p = p || { title: '', description: '', reason: '', relatedProposalIds: [], sponsorId: '', progress: 0, status: 'Proposed', published: false, updates: [] };
      return '<label class="field-sm"><span>Project title</span><input name="title" value="' + esc(p.title) + '"></label>' +
        '<label class="field-sm"><span>Description</span><textarea name="description" rows="2">' + esc(p.description) + '</textarea></label>' +
        '<label class="field-sm"><span>Reason for the project</span><textarea name="reason" rows="2">' + esc(p.reason) + '</textarea></label>' +
        '<div class="form-row"><label class="field-sm"><span>Status</span><select name="status">' + options(API.PROJECT_STATUS, p.status) + '</select></label>' +
        '<label class="field-sm"><span>Forum sponsor</span><select name="sponsorId">' + options(membersList.map((m) => ({ value: m.id, label: m.label })), p.sponsorId || '', 'No sponsor yet') + '</select></label></div>' +
        '<label class="field-sm"><span>Progress: <output name="pv">' + p.progress + '</output>%</span><input type="range" name="progress" min="0" max="100" step="5" value="' + p.progress + '"></label>' +
        '<fieldset class="pick"><legend>Related student suggestions</legend><div class="pick-scroll">' + proposals.map((x) => '<label class="check"><input type="checkbox" name="rel" value="' + esc(x.id) + '"' + (p.relatedProposalIds.includes(x.id) ? ' checked' : '') + '> ' + esc(x.title) + '</label>').join('') + '</div></fieldset>' +
        '<label class="check strong"><input type="checkbox" name="published"' + (p.published ? ' checked' : '') + '> Visible to students in the Forum Guide</label>' +
        (p.id ? '<hr><h3 class="h-xs">Post an update</h3><label class="field-sm"><span class="sr-only">Update</span><textarea name="update" rows="2" placeholder="What changed?"></textarea></label><label class="check"><input type="checkbox" name="updatePublic" checked> Students can see this update</label>' +
          '<h3 class="h-xs">Previous updates</h3><ol class="timeline">' + (p.updates.length ? p.updates.slice().reverse().map((u) => '<li><span class="meta">' + fmt(u.at) + ' · ' + esc(API.memberLabel(u.by)) + ' · ' + (u.public ? 'public' : 'internal') + '</span><p>' + esc(u.text) + '</p></li>').join('') : '<li class="meta">None yet.</li>') + '</ol>' : '');
    };
    return {
      title: 'Projects', admin: true,
      html: head('folder', 'Ongoing projects', 'Create and update the projects the Forum is working on. Students only see projects marked visible, and only public updates.', '<button class="btn btn-primary" data-new>' + icon('plus') + 'New project</button>') +
        '<div class="admin-projects">' + projects.map((p) => '<article class="card pad admin-project">' +
          '<div class="project-top">' + projectPill(p.status) + (p.published ? tonePill('Visible to students', 'green') : tonePill('Members only', 'neutral')) + '</div>' +
          '<h3>' + esc(p.title) + '</h3><p>' + esc(p.description) + '</p>' + progressBar(p.progress, p.title) +
          '<p class="meta">' + p.progress + '% · Sponsor: ' + esc(p.sponsorId ? API.memberLabel(p.sponsorId) : 'none') + ' · Updated ' + fmt(p.updatedAt) + '</p>' +
          (p.latestPublicUpdate ? '<p class="meta">Latest public update: ' + esc(p.latestPublicUpdate.text) + '</p>' : '') +
          '<button class="btn btn-ghost btn-sm" data-edit="' + esc(p.id) + '">' + icon('edit') + 'Edit and update</button></article>').join('') + '</div>',
      mount(root) {
        const open = (id) => {
          const p = id ? projects.find((x) => x.id === id) : null;
          dialog({ title: p ? 'Edit project' : 'New project', wide: true, confirm: 'Save project', body: editor(p),
            onOpen: (form) => { form.progress.addEventListener('input', () => { form.pv.value = form.progress.value; }); },
            onConfirm: (form) => {
              const data = {
                id: p ? p.id : null, title: form.elements.title.value, description: form.description.value, reason: form.reason.value,
                status: form.status.value, sponsorId: form.sponsorId.value, progress: form.progress.value,
                relatedProposalIds: Array.from(form.querySelectorAll('[name=rel]:checked')).map((x) => x.value), published: form.published.checked
              };
              const saved = attempt(() => API.saveProject(data));
              if (!saved) return false;
              if (form.update && form.update.value.trim()) attempt(() => API.addProjectUpdate(saved, form.update.value, form.updatePublic.checked));
              toast('Project saved');
              rerender();
            } });
        };
        root.querySelector('[data-new]').addEventListener('click', () => open());
        root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => open(b.dataset.edit)));
        if (query.edit) { history.replaceState(null, '', '#/admin/projects'); open(query.edit); }
      }
    };
  };

  /* ---------------- Submission windows ---------------- */

  PAGES.windows = () => {
    const ws = API.windows();
    const sub = API.submissionState();
    const editor = (w) => '<div class="form-row"><label class="field-sm"><span>Opens</span><input type="datetime-local" name="opens" value="' + toLocalInput(w ? w.opensAt : Date.now() + 86400e3) + '"></label>' +
      '<label class="field-sm"><span>Closes</span><input type="datetime-local" name="closes" value="' + toLocalInput(w ? w.closesAt : Date.now() + 2 * 86400e3) + '"></label></div>' +
      '<label class="check"><input type="checkbox" name="announced"' + (!w || w.announced ? ' checked' : '') + '> Announce this date to students</label>' +
      '<p class="meta small">Students see the next announced window on the Submit page while submissions are closed.</p>';
    const stateTone = { open: 'green', scheduled: 'blue', closed: 'neutral' };
    return {
      title: 'Submission windows', admin: true,
      html: head('calendar', 'Submission windows', 'The portal only accepts proposals during these windows. The usual pattern is one day, every two weeks.',
        (sub.open ? '<button class="btn btn-danger-soft" data-close>' + icon('lock') + 'Close now</button>' : '<button class="btn btn-ghost" data-open>Open now for 24 hours</button>') +
        '<button class="btn btn-ghost" data-series>Add next 4 fortnightly windows</button><button class="btn btn-primary" data-new>' + icon('plus') + 'Schedule a window</button>') +
        '<div class="notice ' + (sub.open ? 'notice-green' : 'notice-blue') + '">' + icon(sub.open ? 'check' : 'clock') + '<p>' +
          (sub.open ? '<strong>Submissions are open</strong> until ' + esc(fmtDT(sub.window.closesAt)) + '.' : '<strong>Submissions are closed.</strong> ' + (sub.next ? 'Next announced window: ' + esc(fmtDT(sub.next.opensAt)) + '.' : 'No upcoming window has been announced.')) + '</p></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Opens</th><th scope="col">Closes</th><th scope="col">Status</th><th scope="col">Announced</th><th scope="col">Proposals</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        ws.slice().reverse().map((w) => '<tr><td data-label="Opens">' + esc(fmtDT(w.opensAt)) + '</td><td data-label="Closes">' + esc(fmtDT(w.closesAt)) + '</td>' +
          '<td data-label="Status">' + tonePill(w.state === 'open' ? 'Open now' : w.state === 'scheduled' ? 'Scheduled' : 'Closed', stateTone[w.state]) + '</td>' +
          '<td data-label="Announced">' + (w.announced ? 'Yes' : '<span class="meta">No</span>') + '</td><td data-label="Proposals">' + w.count + '</td>' +
          '<td class="cell-actions">' + (w.state !== 'closed' ? '<button class="btn btn-ghost btn-sm" data-edit="' + esc(w.id) + '">' + icon('edit') + 'Edit</button>' : '') +
          (w.state === 'scheduled' ? '<button class="icon-btn danger" aria-label="Delete window" data-del="' + esc(w.id) + '">' + icon('trash') + '</button>' : '') + '</td></tr>').join('') +
        '</tbody></table></div>',
      mount(root) {
        const open = (w) => dialog({ title: w ? 'Edit submission window' : 'Schedule a submission window', confirm: 'Save', body: editor(w),
          onConfirm: (form) => {
            const data = { id: w ? w.id : null, opensAt: new Date(form.opens.value).getTime(), closesAt: new Date(form.closes.value).getTime(), announced: form.announced.checked };
            if (!attempt(() => API.saveWindow(data), 'Submission window saved')) return false;
            rerender();
          } });
        root.querySelector('[data-new]').addEventListener('click', () => open());
        root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => open(ws.find((w) => w.id === b.dataset.edit))));
        root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => confirmDialog('Delete this window?', 'Students will no longer see this date.', 'Delete', () => { if (attempt(() => API.deleteWindow(b.dataset.del), 'Window deleted')) rerender(); }, 'danger')));
        const s = root.querySelector('[data-series]');
        s.addEventListener('click', () => { if (attempt(() => API.scheduleSeries(4), 'Four windows added, two weeks apart. Announce each when ready.')) rerender(); });
        const o = root.querySelector('[data-open]');
        if (o) o.addEventListener('click', () => { if (attempt(() => API.openNow(24), 'Submissions are open for 24 hours')) rerender(); });
        const c = root.querySelector('[data-close]');
        if (c) c.addEventListener('click', () => confirmDialog('Close submissions now?', 'Students will not be able to submit until the next window.', 'Close submissions', () => { if (attempt(() => API.closeNow(), 'Submissions closed')) rerender(); }, 'danger'));
      }
    };
  };

  /* ---------------- Activity & email log ---------------- */

  PAGES.activity = (params, query) => {
    const tab = query.tab === 'email' ? 'email' : 'audit';
    const log = API.auditLog();
    const mails = API.emailLog();
    return {
      title: 'Activity', admin: true,
      html: head('activity', 'Activity & email log', 'Every important administrative action is recorded with who did it and when.') +
        '<div class="tabs" role="tablist"><a role="tab" href="#/admin/activity" aria-selected="' + (tab === 'audit') + '">Administrative actions <span>' + log.length + '</span></a>' +
        '<a role="tab" href="#/admin/activity?tab=email" aria-selected="' + (tab === 'email') + '">Emails sent <span>' + mails.length + '</span></a></div>' +
        (tab === 'audit'
          ? '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Item</th></tr></thead><tbody>' +
            log.map((a) => '<tr><td data-label="When">' + esc(fmtDT(a.at)) + '</td><td data-label="Who">' + esc(a.byLabel) + '</td><td data-label="Action">' + esc(a.action) + (a.detail ? '<span class="meta">' + esc(a.detail) + '</span>' : '') + '</td><td data-label="Item">' + esc(a.target) + '</td></tr>').join('') + '</tbody></table></div>'
          : '<p class="meta">Emails are simulated in this demo. Each recipient sees theirs under the bell icon.</p><div class="table-wrap"><table class="table"><thead><tr><th scope="col">Sent</th><th scope="col">To</th><th scope="col">Subject</th></tr></thead><tbody>' +
            mails.map((e) => '<tr><td data-label="Sent">' + esc(fmtDT(e.at)) + '</td><td data-label="To">' + esc(e.toName) + '<span class="meta">' + esc(e.toEmail) + '</span></td><td data-label="Subject">' + esc(e.subject) + '</td></tr>').join('') + '</tbody></table></div>')
    };
  };
})();
