/* =========================================================================
   Student Forum — data layer
   A small in-browser "database" kept in localStorage, plus every rule the
   platform depends on: who can see what, who can change what, submission
   windows, the monthly limit, grouping, notifications and the audit log.
   Pages never touch the database directly; they call the functions in `API`.
   ========================================================================= */
(function () {
  'use strict';

  const DB_KEY = 'studentForum.db.v2';
  const SESSION_KEY = 'studentForum.session.v1';
  const HOUR = 3600e3;
  const DAY = 24 * HOUR;

  /* ---------- Reference lists ---------- */

  const GRADES = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  const CATEGORIES = [
    'Facilities & Spaces', 'Academics', 'Events & Activities', 'Wellbeing',
    'Sustainability', 'Food & Dining', 'Technology', 'Clubs & Societies', 'Other'
  ];

  // Order matters: this is the student-facing journey.
  const STAGES = [
    { key: 'submitted', label: 'Submitted',
      explain: 'Your proposal has reached Forum and has a reference number.' },
    { key: 'under_review', label: 'Under Preliminary Review',
      explain: 'A Forum member is reading your proposal and checking it against similar ideas.' },
    { key: 'approved', label: 'Approved for Consideration',
      explain: 'Forum agreed your idea is realistic and worth taking further.' },
    { key: 'sponsor', label: 'Assigned to a Representative Sponsor',
      explain: 'A Forum representative now champions your idea and will take it forward.' },
    { key: 'admin_review', label: 'Under Administration Review', sub: 'Ms. Anderson and Ms. Warren',
      explain: 'Ms. Anderson and Ms. Warren from the school administration are reviewing your proposal.' },
    { key: 'decision', label: 'Approved or Rejected',
      explain: 'A final decision has been made. You will see the outcome and any reason given.' },
    { key: 'implemented', label: 'Implemented',
      explain: 'Your idea has been put into action at school.' }
  ];

  const STATUS = {
    submitted:    { label: 'Submitted',                            tone: 'neutral', stage: 0 },
    under_review: { label: 'Under Preliminary Review',             tone: 'amber',   stage: 1 },
    approved:     { label: 'Approved for Consideration',           tone: 'blue',    stage: 2 },
    sponsor:      { label: 'Assigned to a Representative Sponsor', tone: 'blue',    stage: 3 },
    admin_review: { label: 'Under Administration Review',          tone: 'violet',  stage: 4 },
    accepted:     { label: 'Approved',                             tone: 'green',   stage: 5 },
    rejected:     { label: 'Rejected',                             tone: 'red',     stage: 5 },
    completed:    { label: 'Implemented',                          tone: 'green',   stage: 6 }
  };

  const PROJECT_STATUS = ['Proposed', 'Under Consideration', 'In Progress',
    'Awaiting School Approval', 'Completed', 'Paused'];

  const GUIDE_CATEGORIES = {
    meetings:      { label: 'Recent Meetings',        icon: 'calendar' },
    decisions:     { label: 'Decisions and Outcomes', icon: 'gavel' },
    projects:      { label: 'Ongoing Projects',       icon: 'folder' },
    suggestions:   { label: 'Student Suggestions',    icon: 'lightbulb' },
    announcements: { label: 'General Announcements',  icon: 'megaphone' }
  };

  const SUMMARY_STATUS = {
    notes:     { label: 'Notes only',       tone: 'neutral' },
    draft:     { label: 'Draft',            tone: 'neutral' },
    pending:   { label: 'Pending Approval', tone: 'amber' },
    approved:  { label: 'Approved',         tone: 'blue' },
    published: { label: 'Published',        tone: 'green' }
  };

  const MONTHLY_LIMIT = 2;

  /* ---------- Storage ---------- */

  let db = null;

  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) { db = JSON.parse(raw); return; }
    } catch (e) { /* storage blocked or corrupt: fall through to seed */ }
    db = buildSeed();
    save();
  }

  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* keep working in memory */ }
  }

  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  }

  const clone = (x) => JSON.parse(JSON.stringify(x));

  /* ---------- Session & permissions ---------- */

  let sessionUserId = null;
  try { sessionUserId = localStorage.getItem(SESSION_KEY); } catch (e) { /* ignore */ }

  function currentUser() {
    if (!sessionUserId || !db) return null;
    return db.users.find((u) => u.id === sessionUserId) || null;
  }

  function isMember(user) {
    const u = user || currentUser();
    return !!u && u.role === 'member';
  }

  class PermissionError extends Error {}

  function requireUser() {
    const u = currentUser();
    if (!u) throw new PermissionError('Please sign in first.');
    return u;
  }

  // Every administrative function calls this first. The role is read from the
  // stored user record, which no student-facing function can change.
  function requireMember() {
    const u = requireUser();
    if (u.role !== 'member') throw new PermissionError('Only Forum members can do that.');
    return u;
  }

  function greetingName(u) {
    if (!u) return '';
    if (u.role === 'member') return u.title + ' ' + u.lastName;
    return u.firstName;
  }

  function userName(id) {
    const u = db.users.find((x) => x.id === id);
    return u ? u.firstName + ' ' + u.lastName : 'Unknown';
  }

  function memberLabel(id) {
    const u = db.users.find((x) => x.id === id);
    return u ? u.title + ' ' + u.lastName : 'Unassigned';
  }

  /* ---------- Audit log ---------- */

  function audit(action, target, detail) {
    const u = currentUser();
    db.audit.unshift({ id: uid('a'), at: Date.now(), by: u ? u.id : 'system', action, target: target || '', detail: detail || '' });
    if (db.audit.length > 500) db.audit.length = 500;
  }

  /* ---------- Notifications (simulated email) ---------- */

  // Each email carries a dedupe key, so the same event never emails twice.
  function sendEmail(toId, subject, body, kind, dedupeKey) {
    if (dedupeKey && db.emails.some((e) => e.dedupeKey === dedupeKey)) return null;
    const to = db.users.find((u) => u.id === toId);
    if (!to) return null;
    const mail = { id: uid('e'), to: toId, toEmail: to.email, subject, body, kind, at: Date.now(), read: false, dedupeKey: dedupeKey || null };
    db.emails.unshift(mail);
    return mail;
  }

  function members() { return db.users.filter((u) => u.role === 'member'); }

  const SIGNOFF = '\n\n— Student Forum';

  /* ---------- Submission windows ---------- */

  function windowState(w, now) {
    now = now || Date.now();
    if (now < w.opensAt) return 'scheduled';
    if (now >= w.closesAt) return 'closed';
    return 'open';
  }

  function sortedWindows() { return db.windows.slice().sort((a, b) => a.opensAt - b.opensAt); }

  function currentWindow() {
    const now = Date.now();
    return sortedWindows().find((w) => windowState(w, now) === 'open') || null;
  }

  function nextWindow(onlyAnnounced) {
    const now = Date.now();
    return sortedWindows().find((w) => w.opensAt > now && (!onlyAnnounced || w.announced)) || null;
  }

  // Runs on load and every 30 seconds: tells members when a period has closed.
  function checkWindows() {
    if (!db) return false;
    let changed = false;
    const now = Date.now();
    db.windows.forEach((w) => {
      if (windowState(w, now) === 'closed' && !w.closeNotified) {
        w.closeNotified = true;
        changed = true;
        const count = db.proposals.filter((p) => p.windowId === w.id).length;
        const waiting = db.proposals.filter((p) => p.windowId === w.id && p.status === 'submitted').length;
        members().forEach((m) => sendEmail(m.id,
          'Submission period closed: ' + waiting + ' proposal' + (waiting === 1 ? '' : 's') + ' need review',
          'The submission period that opened ' + fmtDateTime(w.opensAt) + ' has now closed.\n\n' +
          count + ' proposal' + (count === 1 ? ' was' : 's were') + ' submitted. ' + waiting + ' still need' + (waiting === 1 ? 's' : '') + ' a first review.\n\n' +
          'Open the Forum member dashboard to start reviewing.' + SIGNOFF,
          'member', 'window-closed:' + w.id + ':' + m.id));
        db.audit.unshift({ id: uid('a'), at: now, by: 'system', action: 'Submission period closed', target: fmtDateTime(w.opensAt), detail: count + ' proposals received' });
      }
    });
    if (changed) save();
    return changed;
  }

  /* ---------- Proposals: helpers ---------- */

  function monthKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth(); }

  function proposalsThisMonth(userId) {
    const k = monthKey(Date.now());
    return db.proposals.filter((p) => p.ownerId === userId && monthKey(p.submittedAt) === k).length;
  }

  function nextReference(ts) {
    const year = new Date(ts).getFullYear();
    db.counters.ref = (db.counters.ref || 0) + 1;
    return 'SF-' + year + '-' + String(db.counters.ref).padStart(4, '0');
  }

  // What a student is allowed to know about their own proposal.
  // Internal notes, the full status history authors and group data are dropped.
  function studentView(p) {
    const showSponsor = p.sponsorId && (p.reachedStage || 0) >= 3;
    const updates = (p.updates || []).map((u) => ({ at: u.at, text: u.text }));
    return {
      id: p.id, ref: p.ref, title: p.title, description: p.description, issue: p.issue,
      grade: p.grade, category: p.category, submittedAt: p.submittedAt, status: p.status,
      sponsor: showSponsor ? memberLabel(p.sponsorId) : null,
      rejectionReason: p.status === 'rejected' && p.shareReason ? p.rejectionReason : null,
      reachedStage: p.reachedStage,
      updates,
      timeline: (p.history || []).map((h) => ({ status: h.status, at: h.at }))
    };
  }

  function setStatusInternal(p, status, by, at) {
    p.status = status;
    const stage = STATUS[status].stage;
    if (status !== 'rejected') p.reachedStage = Math.max(p.reachedStage || 0, stage);
    p.history.push({ status, at: at || Date.now(), by });
  }

  /* ---------- Grouping: similarity engine ---------- */

  const STOP = new Set(('a an and are as at be but by can could do for from has have i if in into is it its more ' +
    'most need of on or our should so some than that the their them there these they this to too up us very ' +
    'was we were what when which who why will with would you your also get make like just want during each other ' +
    'students student school idea think every all any better new much many lot lots really').split(' '));

  // Concepts tie different words for the same concern together.
  const CONCEPTS = {
    study:       { name: 'Improving Student Study Spaces', words: ['study', 'studying', 'library', 'quiet', 'silent', 'workspace', 'workspaces', 'desk', 'desks', 'revision', 'revise', 'homework', 'spaces', 'space', 'room', 'rooms', 'classroom', 'classrooms', 'work', 'working', 'focus'] },
    green:       { name: 'A Greener Campus with Less Waste', words: ['recycling', 'recycle', 'compost', 'composting', 'plastic', 'waste', 'bins', 'bin', 'sustainability', 'sustainable', 'green', 'greener', 'environment', 'reusable', 'refill', 'bottle', 'bottles', 'litter', 'single-use'] },
    food:        { name: 'Better Food & Dining Options', words: ['food', 'snack', 'snacks', 'cafeteria', 'menu', 'healthy', 'healthier', 'vending', 'meals', 'meal', 'fruit', 'vegetarian'] },
    wellbeing:   { name: 'Supporting Student Wellbeing', words: ['mental', 'health', 'stress', 'wellbeing', 'wellness', 'counselling', 'counseling', 'anxiety', 'burnout', 'mindfulness', 'support'] },
    tech:        { name: 'Better Campus Technology', words: ['wifi', 'wi-fi', 'internet', 'charging', 'chargers', 'charger', 'laptop', 'laptops', 'devices', 'outlets', 'phone', 'phones', 'battery'] },
    schedule:    { name: 'The School Day Schedule', words: ['start', 'schedule', 'timetable', 'bell', 'later', 'earlier', 'monday', 'mornings', 'morning', 'sleep'] },
    activities:  { name: 'More Clubs & Activities', words: ['club', 'clubs', 'fair', 'activities', 'activity', 'society', 'societies', 'events', 'event'] },
    arts:        { name: 'Celebrating Student Creativity', words: ['art', 'artwork', 'mural', 'murals', 'music', 'gallery', 'creative', 'painting', 'hallways', 'walls'] }
  };
  const WORD_TO_CONCEPT = {};
  Object.keys(CONCEPTS).forEach((k) => CONCEPTS[k].words.forEach((w) => { WORD_TO_CONCEPT[w] = k; }));

  function tokens(text) {
    return (text || '').toLowerCase().replace(/[^a-z0-9\- ]+/g, ' ').split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t))
      .map((t) => (t.length > 4 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
  }

  function profile(p) {
    // The title counts twice: it is the clearest statement of the idea.
    const words = tokens(p.title).concat(tokens(p.title), tokens(p.description), tokens(p.issue));
    const vec = {};
    words.forEach((w) => {
      const c = WORD_TO_CONCEPT[w] || WORD_TO_CONCEPT[w + 's'];
      if (c) vec[c] = (vec[c] || 0) + 1;
    });
    return { vec, set: new Set(words) };
  }

  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    Object.keys(a).forEach((k) => { na += a[k] * a[k]; if (b[k]) dot += a[k] * b[k]; });
    Object.keys(b).forEach((k) => { nb += b[k] * b[k]; });
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }

  function jaccard(a, b) {
    let inter = 0;
    a.forEach((x) => { if (b.has(x)) inter++; });
    const union = a.size + b.size - inter;
    return union ? inter / union : 0;
  }

  function similarity(pa, pb) { return 0.75 * cosine(pa.vec, pb.vec) + 0.25 * jaccard(pa.set, pb.set); }

  function dominantConcept(profiles) {
    const total = {};
    profiles.forEach((pr) => Object.keys(pr.vec).forEach((k) => { total[k] = (total[k] || 0) + pr.vec[k]; }));
    const best = Object.keys(total).sort((a, b) => total[b] - total[a])[0];
    return best ? CONCEPTS[best].name : null;
  }

  function groupedIds() {
    const s = new Set();
    db.groups.forEach((g) => g.proposalIds.forEach((id) => s.add(id)));
    return s;
  }

  const THRESHOLD = 0.5;

  // Suggestions are always recomputed and never applied automatically.
  // A Forum member has to approve each one before it becomes a group.
  function computeSuggestions() {
    const inGroup = groupedIds();
    const pool = db.proposals.filter((p) => !inGroup.has(p.id) && p.status !== 'rejected');
    const prof = {};
    pool.forEach((p) => { prof[p.id] = profile(p); });

    // 1) Ungrouped proposals that fit an existing group.
    const additions = [];
    const claimed = new Set();
    db.groups.forEach((g) => {
      const memberProfiles = g.proposalIds.map((id) => db.proposals.find((x) => x.id === id)).filter(Boolean).map(profile);
      if (!memberProfiles.length) return;
      pool.forEach((p) => {
        if (claimed.has(p.id)) return;
        const key = 'add:' + g.id + ':' + p.id;
        if (db.dismissedSuggestions.includes(key)) return;
        const score = Math.max.apply(null, memberProfiles.map((mp) => similarity(prof[p.id], mp)));
        if (score >= THRESHOLD) { additions.push({ key, groupId: g.id, proposalId: p.id, score }); claimed.add(p.id); }
      });
    });

    // 2) New clusters among the rest (union-find over similar pairs).
    const rest = pool.filter((p) => !claimed.has(p.id));
    const parent = {};
    rest.forEach((p) => { parent[p.id] = p.id; });
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (let i = 0; i < rest.length; i++) {
      for (let j = i + 1; j < rest.length; j++) {
        if (similarity(prof[rest[i].id], prof[rest[j].id]) >= THRESHOLD) parent[find(rest[i].id)] = find(rest[j].id);
      }
    }
    const clusters = {};
    rest.forEach((p) => { const r = find(p.id); (clusters[r] = clusters[r] || []).push(p.id); });

    const groups = Object.values(clusters).filter((ids) => ids.length >= 2).map((ids) => {
      ids.sort();
      const key = 'new:' + ids.join(',');
      const name = dominantConcept(ids.map((id) => prof[id])) || 'Related suggestions';
      return { key, name, proposalIds: ids };
    }).filter((s) => !db.dismissedSuggestions.includes(s.key));

    return { groups, additions };
  }

  /* ---------- Meeting summaries: draft generator ---------- */

  // A rule-based first draft built from the notes. It is clearly labelled as
  // automatic and can only reach students after a different member approves it.
  function draftFromNotes(notes) {
    const out = { overview: '', topics: [], ongoing: [], decisions: [], implementing: [], proposals: [], actions: [], nextSteps: [] };
    const lines = (notes || '').split(/\n+/).map((l) => l.replace(/^[\s\-*•]+/, '').trim()).filter(Boolean);
    const strip = (l) => l.replace(/^(topic|discussed|decision|decided|agreed|action|todo|next|next steps?|ongoing|project|proposal)s?\s*[:\-–]\s*/i, '').trim();
    lines.forEach((line) => {
      const l = line.toLowerCase();
      if (/^(confidential|private|\[private\]|\[confidential\])/.test(l)) return; // never drafted
      const raw = strip(line);
      const text = raw.charAt(0).toUpperCase() + raw.slice(1);
      if (/^(decision|decided|agreed)|\b(voted|approved unanimously|agreed to|decided to)\b/.test(l)) out.decisions.push(text);
      else if (/^(action|todo)|\b(will contact|will draft|will meet|will email|will prepare|to follow up)\b/.test(l)) out.actions.push(text);
      else if (/^next|\bnext meeting\b|\bnext step/.test(l)) out.nextSteps.push(text);
      else if (/^ongoing|\b(continue discussing|revisit|discuss further|still discussing|no decision yet)\b/.test(l)) out.ongoing.push(text);
      else if (/^project|\b(implement|implementation|rollout|installed|being built|in progress)\b/.test(l)) out.implementing.push(text);
      else if (/^proposal|sf-\d{4}-\d{4}|\bproposal\b/.test(l)) out.proposals.push(text);
      else out.topics.push(text);
    });
    const parts = [];
    if (out.decisions.length) parts.push(out.decisions.length + ' decision' + (out.decisions.length > 1 ? 's were' : ' was') + ' made');
    if (out.ongoing.length) parts.push(out.ongoing.length + ' discussion' + (out.ongoing.length > 1 ? 's continue' : ' continues'));
    if (out.implementing.length) parts.push(out.implementing.length + ' project update' + (out.implementing.length > 1 ? 's' : ''));
    out.overview = parts.length ? 'At this meeting ' + parts.join(', ') + '.' : 'Summary of the Forum meeting.';
    return out;
  }

  /* ---------- Formatting shared by pages ---------- */

  function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function fmtDateTime(ts) {
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /* =======================================================================
     API — the only way pages read or change data
     ======================================================================= */

  const API = {
    GRADES, CATEGORIES, STAGES, STATUS, PROJECT_STATUS, GUIDE_CATEGORIES, SUMMARY_STATUS, MONTHLY_LIMIT,
    PermissionError, fmtDate, fmtDateTime,

    init() { load(); checkWindows(); },
    tick() { return checkWindows(); },
    resetDemo() { db = buildSeed(); save(); },

    /* ----- session ----- */
    demoAccounts() {
      return db.users.map((u) => ({ id: u.id, name: u.firstName + ' ' + u.lastName, role: u.role, title: u.title, grade: u.grade }));
    },
    signIn(userId) {
      const u = db.users.find((x) => x.id === userId);
      if (!u) throw new Error('Account not found.');
      sessionUserId = u.id;
      try { localStorage.setItem(SESSION_KEY, u.id); } catch (e) { /* ignore */ }
    },
    signOut() { sessionUserId = null; try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } },

    // Called after Google confirms who someone is. The role comes only from the
    // Forum member list in js/config.js, never from anything the person chooses.
    signInWithGoogle(profile) {
      const cfg = window.FORUM_CONFIG || {};
      const email = String(profile.email || '').trim().toLowerCase();
      if (!email || !profile.emailVerified) throw new Error('Google could not confirm this email address.');
      const domains = (cfg.allowedDomains || []).map((d) => d.toLowerCase().replace(/^@/, ''));
      if (domains.length && !domains.includes(email.split('@')[1])) {
        throw new Error('Please sign in with your school Google account (' + domains.map((d) => '@' + d).join(' or ') + ').');
      }
      const members = {};
      Object.keys(cfg.forumMembers || {}).forEach((k) => { members[k.toLowerCase()] = cfg.forumMembers[k]; });
      const nameParts = String(profile.name || email.split('@')[0]).trim().split(/\s+/);
      let u = db.users.find((x) => x.email.toLowerCase() === email);
      if (!u) {
        u = { id: 'g-' + email.replace(/[^a-z0-9]+/g, '-'), email, grade: null, source: 'google' };
        db.users.push(u);
      }
      u.firstName = profile.givenName || nameParts[0] || 'Student';
      u.lastName = profile.familyName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
      if (members[email]) { u.role = 'member'; u.title = members[email]; } else { u.role = 'student'; delete u.title; }
      save();
      API.signIn(u.id);
      return clone(u);
    },
    googleConfigured() { const c = window.FORUM_CONFIG || {}; return !!(c.googleClientId || '').trim(); },
    showDemoAccounts() { const c = window.FORUM_CONFIG || {}; return c.showDemoAccounts !== false; },
    me() { const u = currentUser(); return u ? clone(u) : null; },
    isMember() { return isMember(); },
    greetingName() { return greetingName(currentUser()); },
    memberLabel, userName,
    membersList() { return members().map((m) => ({ id: m.id, label: m.title + ' ' + m.lastName, name: m.firstName + ' ' + m.lastName, title: m.title })); },

    /* ----- public / student ----- */
    submissionState() {
      const u = currentUser();
      const open = currentWindow();
      const next = nextWindow(true);
      const used = u ? proposalsThisMonth(u.id) : 0;
      return {
        open: !!open, window: open ? clone(open) : null, next: next ? clone(next) : null,
        used, remaining: Math.max(0, MONTHLY_LIMIT - used)
      };
    },

    submitProposal(input) {
      const u = requireUser();
      const open = currentWindow();
      if (!open) throw new Error('Submissions are closed right now.');
      if (proposalsThisMonth(u.id) >= MONTHLY_LIMIT) throw new Error('You have already submitted ' + MONTHLY_LIMIT + ' proposals this month.');
      const title = (input.title || '').trim();
      const description = (input.description || '').trim();
      if (title.length < 5) throw new Error('Give your proposal a title of at least 5 characters.');
      if (description.length < 30) throw new Error('Describe your idea in at least 30 characters.');
      if (!GRADES.includes(input.grade)) throw new Error('Choose your grade.');
      if (!CATEGORIES.includes(input.category)) throw new Error('Choose a category.');
      const now = Date.now();
      const p = {
        id: uid('p'), ref: nextReference(now), ownerId: u.id, title, description,
        issue: (input.issue || '').trim(), grade: input.grade, category: input.category,
        submittedAt: now, windowId: open.id, status: 'submitted', reachedStage: 0,
        sponsorId: null, rejectionReason: '', shareReason: false,
        history: [{ status: 'submitted', at: now, by: u.id }], updates: [], internalNotes: []
      };
      db.proposals.push(p);
      sendEmail(u.id, 'We received your proposal: ' + title + ' (' + p.ref + ')',
        'Hi ' + u.firstName + ',\n\nThanks for sharing your idea with Forum. Your proposal "' + title + '" was received on ' + fmtDateTime(now) + '.\n\n' +
        'Reference number: ' + p.ref + '\n\nA Forum member will review it soon. You can follow its progress any time on the Track Your Proposal page, and we will email you whenever its status changes.' + SIGNOFF,
        'student', 'submitted:' + p.id);
      // One heads-up per member per window, not one per proposal.
      members().forEach((m) => sendEmail(m.id, 'New proposals are arriving',
        'Students have started submitting proposals in the current submission period (closes ' + fmtDateTime(open.closesAt) + ').\n\n' +
        'You will get one summary when the period closes. New proposals appear on the dashboard as they arrive.' + SIGNOFF,
        'member', 'new-proposals:' + open.id + ':' + m.id));
      save();
      return studentView(p);
    },

    myProposals() {
      const u = requireUser();
      return db.proposals.filter((p) => p.ownerId === u.id).sort((a, b) => b.submittedAt - a.submittedAt).map(studentView);
    },

    myInbox() {
      const u = requireUser();
      return clone(db.emails.filter((e) => e.to === u.id));
    },
    unreadCount() {
      const u = currentUser();
      return u ? db.emails.filter((e) => e.to === u.id && !e.read).length : 0;
    },
    markRead(id) {
      const u = requireUser();
      const e = db.emails.find((x) => x.id === id && x.to === u.id);
      if (e && !e.read) { e.read = true; save(); }
    },
    markAllRead() {
      const u = requireUser();
      db.emails.forEach((e) => { if (e.to === u.id) e.read = true; });
      save();
    },

    // Everything students may see in the Forum Guide. Only published items,
    // and only their public fields. Internal notes never leave this function.
    guideItems() {
      const items = [];
      db.posts.filter((p) => p.published).forEach((p) => items.push({
        type: 'post', id: p.id, title: p.title, date: p.publishedAt || p.createdAt, category: p.category,
        summary: p.summary, body: p.body, nextSteps: p.nextSteps, state: p.state
      }));
      db.meetings.filter((m) => m.status === 'published').forEach((m) => items.push({
        type: 'meeting', id: m.id, title: m.title, date: m.date, category: 'meetings',
        summary: m.summary.overview, nextSteps: (m.summary.nextSteps || []).join(' '),
        state: (m.summary.ongoing || []).length ? 'ongoing' : 'completed'
      }));
      db.projects.filter((p) => p.published).forEach((p) => items.push({
        type: 'project', id: p.id, title: p.title, date: p.updatedAt, category: 'projects',
        summary: p.description, nextSteps: p.latestPublicUpdate ? p.latestPublicUpdate.text : '',
        state: p.status === 'Completed' ? 'completed' : 'ongoing', projectStatus: p.status, progress: p.progress
      }));
      return items.sort((a, b) => b.date - a.date);
    },

    publicPost(id) {
      const p = db.posts.find((x) => x.id === id && x.published);
      return p ? { id: p.id, title: p.title, date: p.publishedAt, category: p.category, summary: p.summary, body: p.body, nextSteps: p.nextSteps, state: p.state, author: memberLabel(p.authorId) } : null;
    },

    publicMeeting(id) {
      const m = db.meetings.find((x) => x.id === id && x.status === 'published');
      if (!m) return null;
      return { id: m.id, title: m.title, date: m.date, summary: clone(m.summary), approvedBy: memberLabel(m.approvedBy), publishedAt: m.publishedAt };
    },

    publicProjects() {
      return db.projects.filter((p) => p.published).map((p) => API.publicProject(p.id)).sort((a, b) => b.updatedAt - a.updatedAt);
    },

    publicProject(id) {
      const p = db.projects.find((x) => x.id === id && x.published);
      if (!p) return null;
      return {
        id: p.id, title: p.title, description: p.description, reason: p.reason, status: p.status, progress: p.progress,
        sponsor: p.sponsorId ? memberLabel(p.sponsorId) : null, updatedAt: p.updatedAt,
        latestUpdate: p.latestPublicUpdate ? clone(p.latestPublicUpdate) : null,
        updates: (p.updates || []).filter((u) => u.public).map((u) => ({ at: u.at, text: u.text })),
        related: (p.relatedProposalIds || []).map((rid) => db.proposals.find((x) => x.id === rid)).filter(Boolean)
          .map((x) => ({ title: x.title, category: x.category })) // no names, refs or private detail
      };
    },

    publicMembers() {
      return members().map((m) => ({ name: m.firstName + ' ' + m.lastName, title: m.title, focus: m.focus }));
    },

    /* =================== Forum member functions =================== */

    stats() {
      requireMember();
      const c = (s) => db.proposals.filter((p) => s.includes(p.status)).length;
      return {
        total: db.proposals.length,
        awaiting: c(['submitted', 'under_review']),
        approved: c(['approved']),
        sponsor: c(['sponsor']),
        admin_review: c(['admin_review']),
        accepted: c(['accepted', 'completed']),
        rejected: c(['rejected'])
      };
    },

    allProposals() {
      requireMember();
      const g = {};
      db.groups.forEach((gr) => gr.proposalIds.forEach((id) => { g[id] = { id: gr.id, name: gr.name }; }));
      return db.proposals.map((p) => Object.assign(clone(p), { ownerName: userName(p.ownerId), group: g[p.id] || null }))
        .sort((a, b) => b.submittedAt - a.submittedAt);
    },

    proposal(id) {
      requireMember();
      const p = db.proposals.find((x) => x.id === id);
      if (!p) return null;
      const group = db.groups.find((gr) => gr.proposalIds.includes(id));
      const owner = db.users.find((u) => u.id === p.ownerId);
      return Object.assign(clone(p), { ownerName: userName(p.ownerId), ownerEmail: owner ? owner.email : '', group: group ? { id: group.id, name: group.name } : null });
    },

    attention() {
      requireMember();
      const now = Date.now();
      const list = [];
      db.proposals.forEach((p) => {
        const age = now - p.submittedAt;
        if (p.status === 'submitted') list.push({ p, reason: 'Not reviewed yet' });
        else if (p.status === 'under_review' && age > 5 * DAY) list.push({ p, reason: 'In review for ' + Math.floor(age / DAY) + ' days' });
        else if (p.status === 'approved' && !p.sponsorId) list.push({ p, reason: 'Needs a sponsor' });
      });
      return list.slice(0, 8).map((x) => ({ id: x.p.id, ref: x.p.ref, title: x.p.title, status: x.p.status, reason: x.reason, submittedAt: x.p.submittedAt }));
    },

    changeStatus(id, status, opts) {
      const u = requireMember();
      opts = opts || {};
      const p = db.proposals.find((x) => x.id === id);
      if (!p) throw new Error('Proposal not found.');
      if (!STATUS[status]) throw new Error('Unknown status.');
      if (p.status === status) throw new Error('The proposal already has that status.');
      if (status === 'sponsor' && !(opts.sponsorId || p.sponsorId)) throw new Error('Choose a sponsor first.');
      if (opts.sponsorId) p.sponsorId = opts.sponsorId;
      if (status === 'rejected') {
        p.rejectionReason = (opts.reason || '').trim();
        p.shareReason = !!opts.shareReason && !!p.rejectionReason;
      }
      setStatusInternal(p, status, u.id);
      const message = (opts.message || '').trim();
      if (message) p.updates.push({ at: Date.now(), by: u.id, text: message });
      audit('Changed status to ' + STATUS[status].label, p.ref + ' ' + p.title, p.rejectionReason && status === 'rejected' ? 'Reason: ' + p.rejectionReason : '');

      // One email per change, with any message folded in.
      const owner = db.users.find((x) => x.id === p.ownerId);
      let subject = 'Your proposal is now ' + STATUS[status].label + ': ' + p.title;
      let body = 'Hi ' + owner.firstName + ',\n\nYour proposal "' + p.title + '" (' + p.ref + ') has moved to: ' + STATUS[status].label + '.';
      if (status === 'accepted') { subject = 'Good news: your proposal was approved (' + p.ref + ')'; body = 'Hi ' + owner.firstName + ',\n\nYour proposal "' + p.title + '" (' + p.ref + ') has been approved. The next step is putting it into action.'; }
      if (status === 'completed') { subject = 'Your idea has been implemented (' + p.ref + ')'; body = 'Hi ' + owner.firstName + ',\n\nYour proposal "' + p.title + '" (' + p.ref + ') has been put into action at school. Thank you for making a difference!'; }
      if (status === 'admin_review') body += '\n\nMs. Anderson and Ms. Warren from the school administration are now reviewing it.';
      if (status === 'rejected') {
        subject = 'Decision on your proposal ' + p.ref;
        body = 'Hi ' + owner.firstName + ',\n\nForum has decided not to take your proposal "' + p.title + '" (' + p.ref + ') further at this time.';
        if (p.shareReason) body += '\n\nReason: ' + p.rejectionReason;
        body += '\n\nThank you for contributing. You are welcome to submit a revised idea in a future submission window.';
      }
      if (status === 'sponsor') body += '\n\nYour sponsor is ' + memberLabel(p.sponsorId) + '.';
      if (message) body += '\n\nMessage from Forum: ' + message;
      body += '\n\nSee the full progress on the Track Your Proposal page.' + SIGNOFF;
      sendEmail(owner.id, subject, body, 'student', 'status:' + p.id + ':' + status + ':' + p.history.length);
      save();
    },

    assignSponsor(id, memberId) {
      const u = requireMember();
      const p = db.proposals.find((x) => x.id === id);
      if (!p) throw new Error('Proposal not found.');
      if (!members().some((m) => m.id === memberId)) throw new Error('Choose a Forum member.');
      p.sponsorId = memberId;
      audit('Assigned sponsor ' + memberLabel(memberId), p.ref + ' ' + p.title);
      if (['submitted', 'under_review', 'approved'].includes(p.status)) {
        save();
        API.changeStatus(id, 'sponsor', {});
        return;
      }
      save();
      return u;
    },

    addInternalNote(id, text) {
      const u = requireMember();
      const p = db.proposals.find((x) => x.id === id);
      if (!p || !text.trim()) throw new Error('Write a note first.');
      p.internalNotes.push({ at: Date.now(), by: u.id, text: text.trim() });
      audit('Added internal note', p.ref + ' ' + p.title);
      save();
    },

    addStudentUpdate(id, text) {
      const u = requireMember();
      const p = db.proposals.find((x) => x.id === id);
      if (!p || !text.trim()) throw new Error('Write an update first.');
      const at = Date.now();
      p.updates.push({ at, by: u.id, text: text.trim() });
      audit('Posted student-visible update', p.ref + ' ' + p.title);
      const owner = db.users.find((x) => x.id === p.ownerId);
      sendEmail(owner.id, 'New update on your proposal ' + p.ref,
        'Hi ' + owner.firstName + ',\n\nForum posted an update on "' + p.title + '":\n\n' + text.trim() + '\n\nSee the full progress on the Track Your Proposal page.' + SIGNOFF,
        'student', 'update:' + p.id + ':' + at);
      save();
    },

    /* ----- groups ----- */
    groups() {
      requireMember();
      return db.groups.map((g) => Object.assign(clone(g), {
        proposals: g.proposalIds.map((id) => db.proposals.find((p) => p.id === id)).filter(Boolean)
          .map((p) => ({ id: p.id, ref: p.ref, title: p.title, grade: p.grade, status: p.status, description: p.description }))
      }));
    },
    suggestions() {
      requireMember();
      const s = computeSuggestions();
      const brief = (id) => { const p = db.proposals.find((x) => x.id === id); return { id: p.id, ref: p.ref, title: p.title, grade: p.grade, status: p.status, description: p.description }; };
      return {
        groups: s.groups.map((g) => Object.assign(g, { proposals: g.proposalIds.map(brief) })),
        additions: s.additions.map((a) => Object.assign(a, { proposal: brief(a.proposalId), groupName: (db.groups.find((g) => g.id === a.groupId) || {}).name }))
      };
    },
    approveSuggestion(key, name) {
      const u = requireMember();
      const s = computeSuggestions();
      const sg = s.groups.find((g) => g.key === key);
      if (sg) {
        const g = { id: uid('g'), name: (name || sg.name).trim() || sg.name, summary: '', proposalIds: sg.proposalIds.slice(), createdBy: u.id, createdAt: Date.now(), source: 'suggested' };
        db.groups.push(g);
        audit('Approved suggested group', g.name, sg.proposalIds.length + ' proposals');
        save();
        return g.id;
      }
      const add = s.additions.find((a) => a.key === key);
      if (add) {
        const g = db.groups.find((x) => x.id === add.groupId);
        g.proposalIds.push(add.proposalId);
        audit('Added proposal to group', g.name, (db.proposals.find((p) => p.id === add.proposalId) || {}).ref);
        save();
        return g.id;
      }
      throw new Error('That suggestion is no longer available.');
    },
    dismissSuggestion(key) {
      requireMember();
      if (!db.dismissedSuggestions.includes(key)) db.dismissedSuggestions.push(key);
      audit('Dismissed grouping suggestion', key.startsWith('new:') ? 'New group' : 'Group addition');
      save();
    },
    createGroup(name, proposalIds) {
      const u = requireMember();
      name = (name || '').trim();
      if (!name) throw new Error('Name the group.');
      const taken = groupedIds();
      const ids = (proposalIds || []).filter((id) => !taken.has(id));
      db.groups.push({ id: uid('g'), name, summary: '', proposalIds: ids, createdBy: u.id, createdAt: Date.now(), source: 'manual' });
      audit('Created group', name, ids.length + ' proposals');
      save();
    },
    renameGroup(id, name) {
      requireMember();
      const g = db.groups.find((x) => x.id === id);
      name = (name || '').trim();
      if (!g || !name) throw new Error('Enter a group name.');
      const old = g.name;
      g.name = name;
      audit('Renamed group', old + ' → ' + name);
      save();
    },
    saveGroupSummary(id, summary) {
      requireMember();
      const g = db.groups.find((x) => x.id === id);
      if (!g) throw new Error('Group not found.');
      g.summary = summary.trim();
      audit('Updated combined summary', g.name);
      save();
    },
    moveToGroup(proposalId, groupId) {
      requireMember();
      db.groups.forEach((g) => { g.proposalIds = g.proposalIds.filter((x) => x !== proposalId); });
      const p = db.proposals.find((x) => x.id === proposalId);
      if (groupId) {
        const g = db.groups.find((x) => x.id === groupId);
        if (!g) throw new Error('Group not found.');
        g.proposalIds.push(proposalId);
        audit('Moved proposal to group', g.name, p ? p.ref : '');
      } else {
        audit('Removed proposal from its group', p ? p.ref + ' ' + p.title : '');
      }
      save();
    },
    deleteGroup(id) {
      requireMember();
      const g = db.groups.find((x) => x.id === id);
      if (!g) return;
      db.groups = db.groups.filter((x) => x.id !== id);
      audit('Ungrouped', g.name, 'Original proposals kept');
      save();
    },

    /* ----- submission windows ----- */
    windows() {
      requireMember();
      return sortedWindows().map((w) => Object.assign(clone(w), { state: windowState(w), count: db.proposals.filter((p) => p.windowId === w.id).length }));
    },
    saveWindow(w) {
      requireMember();
      if (!(w.opensAt < w.closesAt)) throw new Error('The closing time must be after the opening time.');
      const overlap = db.windows.some((x) => x.id !== w.id && w.opensAt < x.closesAt && x.opensAt < w.closesAt);
      if (overlap) throw new Error('That overlaps another submission window.');
      if (w.id) {
        const x = db.windows.find((y) => y.id === w.id);
        x.opensAt = w.opensAt; x.closesAt = w.closesAt; x.announced = !!w.announced;
        if (x.closesAt > Date.now()) x.closeNotified = false;
        audit('Edited submission window', fmtDateTime(x.opensAt) + ' – ' + fmtDateTime(x.closesAt));
      } else {
        db.windows.push({ id: uid('w'), opensAt: w.opensAt, closesAt: w.closesAt, announced: !!w.announced, closeNotified: false });
        audit('Scheduled submission window', fmtDateTime(w.opensAt) + ' – ' + fmtDateTime(w.closesAt));
      }
      save();
    },
    deleteWindow(id) {
      requireMember();
      const w = db.windows.find((x) => x.id === id);
      if (!w) return;
      if (db.proposals.some((p) => p.windowId === id)) throw new Error('This window already has proposals, so it cannot be deleted.');
      db.windows = db.windows.filter((x) => x.id !== id);
      audit('Deleted submission window', fmtDateTime(w.opensAt));
      save();
    },
    openNow(hours) {
      requireMember();
      if (currentWindow()) throw new Error('Submissions are already open.');
      const now = Date.now();
      const closesAt = now + (hours || 24) * HOUR;
      const clash = db.windows.find((x) => x.opensAt > now && x.opensAt < closesAt);
      if (clash) throw new Error('A scheduled window starts before this one would end. Edit that window instead.');
      db.windows.push({ id: uid('w'), opensAt: now, closesAt, announced: true, closeNotified: false });
      audit('Opened submissions now', 'Until ' + fmtDateTime(closesAt));
      save();
    },
    closeNow() {
      requireMember();
      const w = currentWindow();
      if (!w) throw new Error('Submissions are already closed.');
      w.closesAt = Date.now();
      audit('Closed submissions early', fmtDateTime(w.opensAt));
      save();
      checkWindows();
    },
    scheduleSeries(count) {
      requireMember();
      const last = sortedWindows().slice(-1)[0];
      let base = last ? last.opensAt : Date.now();
      const length = last ? last.closesAt - last.opensAt : DAY;
      let added = 0;
      for (let i = 0; i < count; i++) {
        base += 14 * DAY;
        db.windows.push({ id: uid('w'), opensAt: base, closesAt: base + length, announced: false, closeNotified: false });
        added++;
      }
      audit('Scheduled ' + added + ' fortnightly windows');
      save();
    },

    /* ----- forum guide posts ----- */
    posts() { requireMember(); return clone(db.posts).sort((a, b) => (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt)); },
    savePost(input) {
      const u = requireMember();
      const title = (input.title || '').trim();
      if (!title) throw new Error('Give the update a title.');
      if (!GUIDE_CATEGORIES[input.category] || input.category === 'meetings' || input.category === 'projects') throw new Error('Choose a category.');
      if (!(input.summary || '').trim()) throw new Error('Write a short explanation.');
      let p = input.id && db.posts.find((x) => x.id === input.id);
      if (!p) { p = { id: uid('n'), createdAt: Date.now(), authorId: u.id, published: false, publishedAt: null }; db.posts.push(p); }
      Object.assign(p, { title, category: input.category, summary: input.summary.trim(), body: (input.body || '').trim(), nextSteps: (input.nextSteps || '').trim(), state: input.state === 'completed' ? 'completed' : 'ongoing' });
      audit(input.id ? 'Edited Forum update' : 'Drafted Forum update', title);
      save();
      return p.id;
    },
    setPostPublished(id, published) {
      requireMember();
      const p = db.posts.find((x) => x.id === id);
      if (!p) throw new Error('Update not found.');
      p.published = !!published;
      if (published) p.publishedAt = Date.now();
      audit(published ? 'Published Forum update' : 'Unpublished Forum update', p.title);
      save();
    },
    deletePost(id) {
      requireMember();
      const p = db.posts.find((x) => x.id === id);
      if (!p) return;
      if (p.published) throw new Error('Unpublish the update before deleting it.');
      db.posts = db.posts.filter((x) => x.id !== id);
      audit('Deleted draft update', p.title);
      save();
    },

    /* ----- meetings ----- */
    meetings() { requireMember(); return clone(db.meetings).sort((a, b) => b.date - a.date); },
    meeting(id) { requireMember(); const m = db.meetings.find((x) => x.id === id); return m ? clone(m) : null; },
    createMeeting(title, date) {
      const u = requireMember();
      const m = { id: uid('m'), title: (title || '').trim() || 'Forum meeting', date: date || Date.now(), notes: '', confidential: '',
        summary: emptySummary(), auto: false, status: 'notes', authorId: u.id, approvedBy: null, publishedAt: null, review: [] };
      db.meetings.push(m);
      audit('Created meeting record', m.title);
      save();
      return m.id;
    },
    saveMeetingNotes(id, fields) {
      const u = requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m) throw new Error('Meeting not found.');
      if (m.status === 'published') throw new Error('Unpublish the summary before changing this meeting.');
      m.title = (fields.title || m.title).trim();
      if (fields.date) m.date = fields.date;
      m.notes = fields.notes;
      m.confidential = fields.confidential;
      audit('Saved meeting notes', m.title);
      save();
      return u;
    },
    generateDraft(id) {
      requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m) throw new Error('Meeting not found.');
      if (!['notes', 'draft'].includes(m.status)) throw new Error('A draft can only be generated before review.');
      if (!m.notes.trim()) throw new Error('Add meeting notes first.');
      m.summary = draftFromNotes(m.notes);
      m.auto = true;
      m.status = 'draft';
      audit('Generated automatic draft summary', m.title, 'Needs human review');
      save();
    },
    saveSummary(id, summary) {
      const u = requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m) throw new Error('Meeting not found.');
      if (m.status === 'approved' || m.status === 'published') throw new Error('Reopen the summary before editing it.');
      if (m.status === 'pending' && m.authorId === u.id) throw new Error('Withdraw the summary from review before editing it, or ask a reviewer to make the edit.');
      m.summary = summary;
      if (m.status === 'notes') m.status = 'draft';
      if (m.status === 'pending') m.review.push({ at: Date.now(), by: u.id, action: 'edited', comment: '' });
      audit('Edited draft summary', m.title);
      save();
    },
    submitForApproval(id) {
      const u = requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m || m.status !== 'draft') throw new Error('Only drafts can be submitted for approval.');
      if (!summaryHasContent(m.summary)) throw new Error('The summary is empty.');
      m.status = 'pending';
      m.authorId = u.id;
      m.review.push({ at: Date.now(), by: u.id, action: 'submitted', comment: '' });
      audit('Submitted summary for approval', m.title);
      members().filter((x) => x.id !== u.id).forEach((x) => sendEmail(x.id, 'Meeting summary awaiting approval: ' + m.title,
        memberLabel(u.id) + ' has submitted the summary for "' + m.title + '" (' + fmtDate(m.date) + ') for approval.\n\nPlease review and edit it, then approve or reject it. It will not be visible to students until it is approved and published.' + SIGNOFF,
        'member', 'summary-pending:' + m.id + ':' + m.review.length + ':' + x.id));
      save();
    },
    withdrawSummary(id) {
      const u = requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m || m.status !== 'pending') throw new Error('Only pending summaries can be withdrawn.');
      m.status = 'draft';
      m.review.push({ at: Date.now(), by: u.id, action: 'withdrawn', comment: '' });
      audit('Withdrew summary from review', m.title);
      save();
    },
    reviewSummary(id, decision, comment) {
      const u = requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m || m.status !== 'pending') throw new Error('Only pending summaries can be reviewed.');
      if (m.authorId === u.id) throw new Error('A different Forum member must approve this summary. You submitted it.');
      if (decision === 'approve') {
        m.status = 'approved';
        m.approvedBy = u.id;
        m.review.push({ at: Date.now(), by: u.id, action: 'approved', comment: (comment || '').trim() });
        audit('Approved meeting summary', m.title);
      } else {
        if (!(comment || '').trim()) throw new Error('Explain what needs to change.');
        m.status = 'draft';
        m.review.push({ at: Date.now(), by: u.id, action: 'rejected', comment: comment.trim() });
        audit('Rejected meeting summary', m.title, comment.trim());
        sendEmail(m.authorId, 'Changes requested: ' + m.title,
          memberLabel(u.id) + ' sent the summary for "' + m.title + '" back for changes:\n\n' + comment.trim() + SIGNOFF,
          'member', 'summary-rejected:' + m.id + ':' + m.review.length);
      }
      save();
    },
    publishSummary(id) {
      requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m || m.status !== 'approved' || !m.approvedBy) throw new Error('Only approved summaries can be published.');
      m.status = 'published';
      m.publishedAt = Date.now();
      audit('Published meeting summary', m.title);
      save();
    },
    unpublishSummary(id) {
      requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m || m.status !== 'published') throw new Error('This summary is not published.');
      m.status = 'approved';
      audit('Unpublished meeting summary', m.title);
      save();
    },
    reopenSummary(id) {
      const u = requireMember();
      const m = db.meetings.find((x) => x.id === id);
      if (!m || m.status !== 'approved') throw new Error('Only approved, unpublished summaries can be reopened.');
      m.status = 'draft';
      m.approvedBy = null;
      m.review.push({ at: Date.now(), by: u.id, action: 'reopened', comment: '' });
      audit('Reopened summary for editing', m.title, 'Approval cleared');
      save();
    },

    /* ----- projects ----- */
    projects() { requireMember(); return clone(db.projects).sort((a, b) => b.updatedAt - a.updatedAt); },
    project(id) { requireMember(); const p = db.projects.find((x) => x.id === id); return p ? clone(p) : null; },
    saveProject(input) {
      requireMember();
      const title = (input.title || '').trim();
      if (!title) throw new Error('Give the project a title.');
      if (!PROJECT_STATUS.includes(input.status)) throw new Error('Choose a status.');
      let p = input.id && db.projects.find((x) => x.id === input.id);
      const isNew = !p;
      if (!p) { p = { id: uid('pr'), updates: [], internalNotes: [], latestPublicUpdate: null, createdAt: Date.now() }; db.projects.push(p); }
      Object.assign(p, {
        title, description: (input.description || '').trim(), reason: (input.reason || '').trim(),
        relatedProposalIds: input.relatedProposalIds || [], sponsorId: input.sponsorId || null,
        progress: Math.max(0, Math.min(100, Number(input.progress) || 0)), status: input.status,
        published: !!input.published, updatedAt: Date.now()
      });
      if (p.status === 'Completed') p.progress = 100;
      audit(isNew ? 'Created project' : 'Updated project', title, (p.published ? 'Published' : 'Not published') + ' · ' + p.status);
      save();
      return p.id;
    },
    addProjectUpdate(id, text, isPublic) {
      const u = requireMember();
      const p = db.projects.find((x) => x.id === id);
      if (!p || !text.trim()) throw new Error('Write an update first.');
      const entry = { at: Date.now(), by: u.id, text: text.trim(), public: !!isPublic };
      p.updates.push(entry);
      if (isPublic) p.latestPublicUpdate = { at: entry.at, text: entry.text };
      p.updatedAt = entry.at;
      audit(isPublic ? 'Posted public project update' : 'Added internal project note', p.title);
      save();
    },

    /* ----- activity ----- */
    auditLog() { requireMember(); return db.audit.map((a) => Object.assign(clone(a), { byLabel: a.by === 'system' ? 'System' : memberLabel(a.by) })); },
    emailLog() { requireMember(); return db.emails.map((e) => Object.assign(clone(e), { toName: userName(e.to) })); },
    pendingSummaries() { requireMember(); return clone(db.meetings.filter((m) => m.status === 'pending')); },
    upcomingWindows() { requireMember(); const now = Date.now(); return sortedWindows().filter((w) => w.closesAt > now).slice(0, 4).map((w) => Object.assign(clone(w), { state: windowState(w) })); },

    draftFromNotes, emptySummary
  };

  function emptySummary() { return { overview: '', topics: [], ongoing: [], decisions: [], implementing: [], proposals: [], actions: [], nextSteps: [] }; }
  function summaryHasContent(s) { return !!(s.overview || '').trim() || ['topics', 'ongoing', 'decisions', 'implementing', 'proposals', 'actions', 'nextSteps'].some((k) => (s[k] || []).length); }

  /* =======================================================================
     Sample data — generated relative to "now" so the demo always has an
     open submission window and recent activity.
     ======================================================================= */

  function buildSeed() {
    const now = Date.now();
    const hourStart = now - (now % HOUR);
    const at7 = (ts) => { const d = new Date(ts); d.setHours(7, 0, 0, 0); return d.getTime(); };

    const users = [
      { id: 'u-liam',  role: 'student', firstName: 'Liam',  lastName: 'Carter',  grade: 'Grade 10' },
      { id: 'u-maya',  role: 'student', firstName: 'Maya',  lastName: 'Patel',   grade: 'Grade 11' },
      { id: 'u-noah',  role: 'student', firstName: 'Noah',  lastName: 'Kim',     grade: 'Grade 9' },
      { id: 'u-ava',   role: 'student', firstName: 'Ava',   lastName: 'Johnson', grade: 'Grade 12' },
      { id: 'u-ethan', role: 'student', firstName: 'Ethan', lastName: 'Brooks',  grade: 'Grade 10' },
      { id: 'u-sofia', role: 'student', firstName: 'Sofia', lastName: 'Garcia',  grade: 'Grade 11' },
      { id: 'u-lucas', role: 'student', firstName: 'Lucas', lastName: 'Nguyen',  grade: 'Grade 9' },
      { id: 'u-zara',  role: 'student', firstName: 'Zara',  lastName: 'Ahmed',   grade: 'Grade 12' },
      { id: 'm-silva',  role: 'member', firstName: 'Daniela', lastName: 'Silva',     title: 'President',      grade: 'Grade 12', focus: 'Chairs meetings and represents students to school leadership.' },
      { id: 'm-okafor', role: 'member', firstName: 'Amara',   lastName: 'Okafor',    title: 'Vice President', grade: 'Grade 12', focus: 'Leads wellbeing and student life projects.' },
      { id: 'm-zhang',  role: 'member', firstName: 'Kevin',   lastName: 'Zhang',     title: 'Representative', grade: 'Grade 11', focus: 'Represents Grade 11 and looks after facilities.' },
      { id: 'm-lind',   role: 'member', firstName: 'Erik',    lastName: 'Lindqvist', title: 'Secretary',      grade: 'Grade 11', focus: 'Takes meeting notes and prepares the published summaries.' }
    ].map((u) => Object.assign(u, { email: (u.firstName + '.' + u.lastName).toLowerCase() + (u.role === 'member' ? '@forum.student-forum.test' : '@student-forum.test') }));

    // Submission windows: three past, one open now, two upcoming.
    const curOpen = hourStart - 3 * HOUR;
    const windows = [
      { id: 'w-1', opensAt: at7(now - 42 * DAY), closesAt: at7(now - 42 * DAY) + DAY, announced: true, closeNotified: true },
      { id: 'w-2', opensAt: at7(now - 28 * DAY), closesAt: at7(now - 28 * DAY) + DAY, announced: true, closeNotified: true },
      { id: 'w-3', opensAt: at7(now - 14 * DAY), closesAt: at7(now - 14 * DAY) + DAY, announced: true, closeNotified: true },
      { id: 'w-4', opensAt: curOpen, closesAt: curOpen + DAY, announced: true, closeNotified: false },
      { id: 'w-5', opensAt: at7(now + 14 * DAY), closesAt: at7(now + 14 * DAY) + DAY, announced: true, closeNotified: false },
      { id: 'w-6', opensAt: at7(now + 28 * DAY), closesAt: at7(now + 28 * DAY) + DAY, announced: false, closeNotified: false }
    ];
    const inWin = (wid, h) => windows.find((w) => w.id === wid).opensAt + h * HOUR;

    let ref = 0;
    const P = (o) => {
      ref++;
      const year = new Date(o.at).getFullYear();
      const p = {
        id: o.id, ref: 'SF-' + year + '-' + String(ref).padStart(4, '0'), ownerId: o.owner, title: o.title,
        description: o.desc, issue: o.issue || '', grade: users.find((u) => u.id === o.owner).grade, category: o.cat,
        submittedAt: o.at, windowId: o.win, status: 'submitted', reachedStage: 0, sponsorId: o.sponsor || null,
        rejectionReason: o.reason || '', shareReason: !!o.reason, history: [{ status: 'submitted', at: o.at, by: o.owner }],
        updates: [], internalNotes: (o.notes || []).map((n, i) => ({ at: Math.min(now - 20 * 60e3, o.at + (i + 2) * DAY), by: n[0], text: n[1] }))
      };
      (o.path || []).forEach((step, i) => {
        const t = Math.min(now - (o.path.length - i) * HOUR, o.at + (i + 1) * (o.step || DAY));
        setStatusInternal(p, step[0], step[1], t);
      });
      (o.updates || []).forEach((u, i) => p.updates.push({ at: Math.min(now - HOUR, o.at + (i + 2) * DAY), by: u[0], text: u[1] }));
      return p;
    };

    const proposals = [
      // Liam's three: one this month, one last month, one rejected.
      P({ id: 'p-01', owner: 'u-liam', win: 'w-4', at: curOpen + 1 * HOUR, cat: 'Facilities & Spaces', step: 0.5 * HOUR,
        title: 'More Study Spaces',
        desc: 'During free periods there is nowhere quiet to study. The library fills up by second period and the common room is too loud for focused work. Opening two empty classrooms as silent study rooms would give everyone a place to work.',
        issue: 'Students end up doing homework in hallways or skipping study time altogether.',
        path: [['under_review', 'm-silva']],
        notes: [['m-silva', 'Lots of similar requests this window. Check with facilities which rooms are free in periods 2–4.']] }),
      P({ id: 'p-02', owner: 'u-liam', win: 'w-3', at: inWin('w-3', 2), cat: 'Technology', sponsor: 'm-zhang',
        title: 'Phone Charging Stations in the Library',
        desc: 'Many of us use phones and laptops for school work but there are only four outlets in the library. A couple of secure charging stations would stop people sitting on the floor next to the wall sockets.',
        path: [['under_review', 'm-silva'], ['approved', 'm-silva'], ['sponsor', 'm-silva']],
        updates: [['m-zhang', 'I am getting quotes for two lockable charging stations and will bring them to the next meeting.']],
        notes: [['m-zhang', 'Facilities said budget is tight until January. Possible grant from the parent association.']] }),
      P({ id: 'p-03', owner: 'u-liam', win: 'w-1', at: inWin('w-1', 1), cat: 'Academics', sponsor: 'm-okafor',
        title: 'Later Start on Mondays',
        desc: 'Start school at 9:30 on Mondays so students can catch up on sleep after the weekend and start the week more focused.',
        reason: 'The school timetable is set by the board for next year, and a later start would affect bus contracts. We have passed the feedback on to the principal.',
        path: [['under_review', 'm-silva'], ['approved', 'm-silva'], ['sponsor', 'm-silva'], ['admin_review', 'm-okafor'], ['rejected', 'm-silva']],
        notes: [['m-okafor', 'Principal confirmed bus contracts are fixed through June. Confidential: board budget discussion ongoing.']] }),

      // Same window as Liam's study spaces idea: these should be suggested as a group.
      P({ id: 'p-04', owner: 'u-maya', win: 'w-4', at: curOpen + 1.5 * HOUR, cat: 'Facilities & Spaces',
        title: 'Longer Library Opening Hours',
        desc: 'The library closes at 4pm, which is right when many of us want to start homework. Keeping it open until 6pm would give students a quiet place to study after school.' }),
      P({ id: 'p-05', owner: 'u-noah', win: 'w-4', at: curOpen + 2 * HOUR, cat: 'Facilities & Spaces',
        title: 'Quiet Working Areas During Free Periods',
        desc: 'Could we have quiet working areas set aside during free periods? Somewhere with desks where talking is not allowed, so people who want to focus on homework can study.' }),
      P({ id: 'p-06', owner: 'u-zara', win: 'w-4', at: curOpen + 2.5 * HOUR, cat: 'Academics',
        title: 'Open Classrooms at Lunch for Studying',
        desc: 'Teachers could leave a few classrooms open at lunch as silent study rooms, especially before exams. Seniors need somewhere to revise and the library desks are always full.' }),
      P({ id: 'p-07', owner: 'u-lucas', win: 'w-4', at: curOpen + 2.7 * HOUR, cat: 'Technology',
        title: 'Better Wi-Fi in the Gym and Sports Hall',
        desc: 'The Wi-Fi does not reach the gym or the sports hall, so we cannot check schedules or use the PE app during class. A couple of extra access points would fix it.' }),

      // Sustainability: an approved group already exists; one new idea should be suggested as an addition.
      P({ id: 'p-08', owner: 'u-ethan', win: 'w-2', at: inWin('w-2', 3), cat: 'Sustainability', sponsor: 'm-okafor',
        title: 'Increase Recycling Bins',
        desc: 'There are only general waste bins in most hallways, so plastic bottles and paper end up in the trash. Adding labelled recycling bins next to every waste bin would make recycling easy.',
        path: [['under_review', 'm-silva'], ['approved', 'm-silva'], ['sponsor', 'm-silva'], ['admin_review', 'm-okafor'], ['accepted', 'm-silva']],
        updates: [['m-okafor', 'Approved! This is now part of the Greener Campus Initiative. The first 20 bins arrive next month.']] }),
      P({ id: 'p-09', owner: 'u-sofia', win: 'w-3', at: inWin('w-3', 4), cat: 'Sustainability', sponsor: 'm-okafor',
        title: 'Composting in the Cafeteria',
        desc: 'A lot of food waste from lunch goes straight in the bin. A compost bin in the cafeteria would cut waste, and the compost could be used in the school garden.',
        path: [['under_review', 'm-silva'], ['approved', 'm-silva'], ['sponsor', 'm-okafor']] }),
      P({ id: 'p-10', owner: 'u-ava', win: 'w-4', at: curOpen + 0.5 * HOUR, cat: 'Sustainability',
        title: 'Water Bottle Refill Stations',
        desc: 'Install water bottle refill stations so students bring reusable bottles instead of buying plastic ones. It reduces plastic waste and saves money.' }),

      // Other proposals across every status.
      P({ id: 'p-11', owner: 'u-maya', win: 'w-2', at: inWin('w-2', 5), cat: 'Wellbeing', sponsor: 'm-okafor',
        title: 'Mental Health Awareness Week',
        desc: 'Run a week of workshops, quiet spaces and talks about stress and mental health before exam season, with the counselling team.',
        path: [['under_review', 'm-silva'], ['approved', 'm-silva'], ['sponsor', 'm-silva'], ['admin_review', 'm-okafor']],
        updates: [['m-okafor', 'The counselling team is on board. We are now waiting for the school to confirm dates in February.']] }),
      P({ id: 'p-12', owner: 'u-noah', win: 'w-3', at: inWin('w-3', 6), cat: 'Food & Dining',
        title: 'Healthier Snack Options',
        desc: 'The vending machines only have chips and candy. Adding fruit, yogurt and healthier snacks would give students better choices between classes.',
        path: [['under_review', 'm-zhang'], ['approved', 'm-zhang']] }),
      P({ id: 'p-13', owner: 'u-zara', win: 'w-1', at: inWin('w-1', 3), cat: 'Events & Activities', sponsor: 'm-lind',
        title: 'Student Art in the Hallways',
        desc: 'Display student artwork on the empty walls of the main hallway, changing every term, so the school feels more like ours.',
        path: [['under_review', 'm-silva'], ['approved', 'm-silva'], ['sponsor', 'm-silva'], ['admin_review', 'm-lind'], ['accepted', 'm-silva'], ['completed', 'm-lind']],
        updates: [['m-lind', 'The first gallery wall went up this week. Thank you for the idea!']] }),
      P({ id: 'p-14', owner: 'u-ethan', win: 'w-3', at: inWin('w-3', 7), cat: 'Clubs & Societies',
        title: 'Club Fair Twice a Year',
        desc: 'Hold a second club fair in January so students who missed the autumn one, or want to try something new, can still join clubs.',
        path: [['under_review', 'm-zhang']] }),
      P({ id: 'p-15', owner: 'u-lucas', win: 'w-2', at: inWin('w-2', 8), cat: 'Other',
        title: 'Free Gaming Consoles in Every Classroom',
        desc: 'Put a gaming console in every classroom so students can play during breaks and relax between lessons.',
        reason: 'This would not be realistic within the school budget, and classrooms are used for teaching during breaks. Our wellbeing projects are looking at break-time spaces instead.',
        path: [['under_review', 'm-silva'], ['rejected', 'm-silva']] }),
      P({ id: 'p-16', owner: 'u-sofia', win: 'w-4', at: curOpen + 2.9 * HOUR, cat: 'Food & Dining',
        title: 'Vegetarian Option Every Day',
        desc: 'The cafeteria only has a vegetarian main twice a week. A vegetarian option every day would make lunch better for a lot of students.' })
    ];
    ref = proposals.length;

    const groups = [
      { id: 'g-green', name: 'A Greener Campus with Less Waste', proposalIds: ['p-08', 'p-09'], createdBy: 'm-okafor', createdAt: inWin('w-3', 30), source: 'suggested',
        summary: 'Students want it to be easier to cut waste on campus: recycling bins in every hallway and composting food waste from the cafeteria. These ideas now feed the Greener Campus Initiative.' }
    ];

    const projects = [
      { id: 'pr-green', title: 'Greener Campus Initiative', status: 'In Progress', progress: 60, sponsorId: 'm-okafor', published: true,
        description: 'Recycling bins in every hallway, a cafeteria compost scheme and a plan to cut single-use plastic.',
        reason: 'Several students asked for easier recycling and less food waste.', relatedProposalIds: ['p-08', 'p-09'],
        updates: [{ at: now - 9 * DAY, by: 'm-okafor', text: 'Facilities approved 20 new recycling bins.', public: true },
                  { at: now - 3 * DAY, by: 'm-okafor', text: 'The first 20 bins arrive next month. The compost trial starts in the cafeteria in January.', public: true },
                  { at: now - 2 * DAY, by: 'm-okafor', text: 'Internal: vendor quote is $1,840. Waiting on the parent association to confirm funding.', public: false }],
        latestPublicUpdate: { at: now - 3 * DAY, text: 'The first 20 bins arrive next month. The compost trial starts in the cafeteria in January.' },
        createdAt: now - 30 * DAY, updatedAt: now - 2 * DAY },
      { id: 'pr-mh', title: 'Mental Health Awareness Week', status: 'Awaiting School Approval', progress: 40, sponsorId: 'm-okafor', published: true,
        description: 'A week of workshops, quiet spaces and talks on stress and wellbeing, run with the counselling team.',
        reason: 'Students asked for more support before exam season.', relatedProposalIds: ['p-11'],
        updates: [{ at: now - 6 * DAY, by: 'm-okafor', text: 'Programme drafted with the counselling team. Waiting for the school to confirm dates in February.', public: true }],
        latestPublicUpdate: { at: now - 6 * DAY, text: 'Programme drafted with the counselling team. Waiting for the school to confirm dates in February.' },
        createdAt: now - 25 * DAY, updatedAt: now - 6 * DAY },
      { id: 'pr-art', title: 'Student Art Walls', status: 'In Progress', progress: 75, sponsorId: 'm-lind', published: true,
        description: 'Rotating displays of student artwork along the main hallway, refreshed every term.',
        reason: 'A student suggestion to make the hallways feel like ours.', relatedProposalIds: ['p-13'],
        updates: [{ at: now - 4 * DAY, by: 'm-lind', text: 'The first gallery wall is up. Submissions for the winter display open in December.', public: true }],
        latestPublicUpdate: { at: now - 4 * DAY, text: 'The first gallery wall is up. Submissions for the winter display open in December.' },
        createdAt: now - 40 * DAY, updatedAt: now - 4 * DAY },
      { id: 'pr-charge', title: 'Library Charging Stations', status: 'Under Consideration', progress: 20, sponsorId: 'm-zhang', published: true,
        description: 'Two lockable charging stations in the library so students can charge devices while they study.',
        reason: 'There are only four outlets in the library.', relatedProposalIds: ['p-02'],
        updates: [{ at: now - 5 * DAY, by: 'm-zhang', text: 'Collecting quotes from suppliers.', public: true }],
        latestPublicUpdate: { at: now - 5 * DAY, text: 'Collecting quotes from suppliers.' },
        createdAt: now - 10 * DAY, updatedAt: now - 5 * DAY },
      { id: 'pr-fair', title: 'Autumn Club Fair', status: 'Completed', progress: 100, sponsorId: 'm-zhang', published: true,
        description: 'The annual club fair in the sports hall, with 34 clubs taking part.',
        reason: 'Helps new students find their community.', relatedProposalIds: [],
        updates: [{ at: now - 20 * DAY, by: 'm-zhang', text: 'Over 300 students visited and 34 clubs took part. Thank you!', public: true }],
        latestPublicUpdate: { at: now - 20 * DAY, text: 'Over 300 students visited and 34 clubs took part. Thank you!' },
        createdAt: now - 60 * DAY, updatedAt: now - 20 * DAY },
      { id: 'pr-music', title: 'Lunchtime Music Sessions', status: 'Proposed', progress: 5, sponsorId: 'm-lind', published: false,
        description: 'Live music from student bands in the courtyard on Fridays.',
        reason: 'Raised informally at the last meeting; not yet agreed.', relatedProposalIds: [],
        updates: [{ at: now - 1 * DAY, by: 'm-lind', text: 'Internal: check noise rules with the deputy head before announcing anything.', public: false }],
        latestPublicUpdate: null, createdAt: now - 2 * DAY, updatedAt: now - 1 * DAY }
    ];

    const posts = [
      { id: 'n-1', title: 'New Sustainability Project', category: 'announcements', state: 'ongoing', published: true, authorId: 'm-okafor',
        summary: 'Forum is launching the Greener Campus Initiative, starting with recycling bins in every hallway.',
        body: 'Thanks to several student proposals, Forum is starting a campus-wide sustainability project. The first step is labelled recycling bins next to every general waste bin, followed by a composting trial in the cafeteria.',
        nextSteps: 'Bins arrive next month. Look out for the compost trial in January.', createdAt: now - 3 * DAY, publishedAt: now - 3 * DAY },
      { id: 'n-2', title: 'Submissions open every two weeks', category: 'announcements', state: 'ongoing', published: true, authorId: 'm-silva',
        summary: 'The proposal portal now opens for one day every two weeks. You can submit up to two proposals per month.',
        body: 'To make sure every idea gets a proper review, Forum collects proposals in short submission windows. Each window lasts one day and opens every two weeks. Upcoming dates are shown on the Submit a Proposal page as soon as they are announced.',
        nextSteps: 'Check the Submit a Proposal page for the next window.', createdAt: now - 16 * DAY, publishedAt: now - 16 * DAY },
      { id: 'n-3', title: 'Decision: Student art goes up in the main hallway', category: 'decisions', state: 'completed', published: true, authorId: 'm-lind',
        summary: 'Forum and school leadership approved rotating student art displays. The first wall is now up.',
        body: 'Following a student proposal, Forum voted to create rotating art displays in the main hallway. School leadership agreed and the first display went up this week.',
        nextSteps: 'Winter display submissions open in December through the art department.', createdAt: now - 4 * DAY, publishedAt: now - 4 * DAY },
      { id: 'n-4', title: 'What students asked for this term', category: 'suggestions', state: 'ongoing', published: true, authorId: 'm-zhang',
        summary: 'Study space, sustainability and food options are the three most common themes in this term\'s proposals.',
        body: 'Across this term\'s submission windows, students most often asked for more quiet places to study, easier recycling and better food choices. Forum is grouping these ideas so they can be discussed together.',
        nextSteps: 'Study space ideas will be discussed at the next meeting.', createdAt: now - 1 * DAY, publishedAt: now - 1 * DAY },
      { id: 'n-5', title: 'Decision: No change to the Monday start time', category: 'decisions', state: 'completed', published: true, authorId: 'm-silva',
        summary: 'After discussing a later Monday start with the principal, the timetable will stay the same this year.',
        body: 'Forum raised student requests for a later start on Mondays. The timetable and bus contracts are fixed for this school year, so no change is possible right now. The feedback has been passed to the principal for next year\'s planning.',
        nextSteps: 'Forum will raise this again when next year\'s timetable is planned.', createdAt: now - 20 * DAY, publishedAt: now - 20 * DAY },
      { id: 'n-6', title: 'Winter formal planning (draft)', category: 'announcements', state: 'ongoing', published: false, authorId: 'm-zhang',
        summary: 'Draft announcement about the winter formal. Not ready to publish.',
        body: '', nextSteps: '', createdAt: now - 1 * DAY, publishedAt: null }
    ];

    const S = (o) => Object.assign(emptySummary(), o);
    const meetings = [
      { id: 'm-1', title: 'Forum Meeting — Sustainability and Art', date: at7(now - 12 * DAY) + 8 * HOUR, auto: false, status: 'published',
        authorId: 'm-lind', approvedBy: 'm-silva', publishedAt: now - 11 * DAY,
        notes: 'Discussed: recycling bins proposal SF from Ethan\nDecision: accept recycling bins, part of Greener Campus\nDecision: approve student art walls\nAction: Okafor will contact facilities about bins\nNext: compost trial plan at next meeting',
        confidential: 'Budget figures from facilities ($1,840 quote). Staff member concerns about cafeteria staffing — not for publication.',
        review: [{ at: now - 12 * DAY, by: 'm-lind', action: 'submitted', comment: '' }, { at: now - 11.5 * DAY, by: 'm-silva', action: 'approved', comment: 'Looks good.' }],
        summary: S({ overview: 'Forum accepted two student proposals and agreed the next steps for the Greener Campus Initiative.',
          topics: ['Recycling across campus', 'Student art in the main hallway', 'Food waste in the cafeteria'],
          decisions: ['Accept the proposal to add recycling bins in every hallway', 'Approve rotating student art displays'],
          ongoing: ['How to run a composting trial in the cafeteria'],
          implementing: ['Greener Campus Initiative: ordering the first 20 recycling bins'],
          proposals: ['Increase Recycling Bins', 'Student Art in the Hallways', 'Composting in the Cafeteria'],
          actions: ['Vice President Okafor will confirm bin placement with facilities', 'Secretary Lindqvist will coordinate the first art display'],
          nextSteps: ['Present a compost trial plan at the next meeting'] }) },
      { id: 'm-2', title: 'Forum Meeting — Timetable and Wellbeing', date: at7(now - 26 * DAY) + 8 * HOUR, auto: false, status: 'published',
        authorId: 'm-lind', approvedBy: 'm-okafor', publishedAt: now - 25 * DAY,
        notes: 'Discussed later Monday start\nDiscussed mental health awareness week',
        confidential: 'Principal shared bus contract details in confidence.',
        review: [{ at: now - 26 * DAY, by: 'm-lind', action: 'submitted', comment: '' }, { at: now - 25.5 * DAY, by: 'm-okafor', action: 'approved', comment: '' }],
        summary: S({ overview: 'Forum discussed the school day schedule and planning for a Mental Health Awareness Week.',
          topics: ['A later start on Mondays', 'Mental Health Awareness Week'],
          decisions: ['No change to the Monday start time this year; feedback passed to the principal'],
          ongoing: ['Dates and format for Mental Health Awareness Week'],
          implementing: [],
          proposals: ['Later Start on Mondays', 'Mental Health Awareness Week'],
          actions: ['Vice President Okafor will draft the awareness week programme with the counselling team'],
          nextSteps: ['Share the draft programme with the school for approval'] }) },
      { id: 'm-3', title: 'Forum Meeting — Study Spaces and Food', date: at7(now - 2 * DAY) + 8 * HOUR, auto: true, status: 'pending',
        authorId: 'm-zhang', approvedBy: null, publishedAt: null,
        notes: 'Discussed: growing number of requests for study spaces\nOngoing: no decision yet on opening classrooms at lunch, revisit after facilities reply\nDecision: approve healthier snack options for further consideration\nAction: Zhang will email facilities about free rooms\nProject: charging stations rollout is in progress, quotes being collected\nCONFIDENTIAL: teacher union concerns about supervising rooms at lunch\nNext: vote on study spaces at next meeting',
        confidential: 'Teacher union concerns about supervising rooms at lunch.',
        review: [{ at: now - 1.5 * DAY, by: 'm-zhang', action: 'submitted', comment: '' }],
        summary: null },
      { id: 'm-4', title: 'Forum Meeting — This Week', date: at7(now) + 8 * HOUR, auto: false, status: 'notes',
        authorId: 'm-lind', approvedBy: null, publishedAt: null,
        notes: 'Discussed: club fair twice a year proposal\nDecision: agreed to plan a January club fair\nOngoing: continue discussing the Wi-Fi request with IT\nAction: Lindqvist will draft the January fair announcement\nPRIVATE: one club has a disciplinary issue — do not publish\nNext: confirm the January fair date with the activities office',
        confidential: '', review: [], summary: emptySummary() }
    ];
    meetings[2].summary = draftFromNotes(meetings[2].notes);

    const emails = [];
    const audit = [];
    const db0 = { users, windows, proposals, groups, projects, posts, meetings, emails, audit, dismissedSuggestions: [], counters: { ref } };

    // Back-fill a realistic notification history.
    const mail = (to, subject, body, kind, t) => emails.push({ id: 'e-' + emails.length, to, toEmail: users.find((u) => u.id === to).email, subject, body: body + SIGNOFF, kind, at: t, read: true, dedupeKey: null });
    proposals.forEach((p) => {
      const owner = users.find((u) => u.id === p.ownerId);
      mail(p.ownerId, 'We received your proposal: ' + p.title + ' (' + p.ref + ')',
        'Hi ' + owner.firstName + ',\n\nThanks for sharing your idea with Forum. Your proposal "' + p.title + '" was received.\n\nReference number: ' + p.ref, 'student', p.submittedAt);
      p.history.slice(1).forEach((h) => mail(p.ownerId, 'Your proposal is now ' + STATUS[h.status].label + ': ' + p.title,
        'Hi ' + owner.firstName + ',\n\nYour proposal "' + p.title + '" (' + p.ref + ') has moved to: ' + STATUS[h.status].label + '.' + (h.status === 'rejected' && p.shareReason ? '\n\nReason: ' + p.rejectionReason : ''), 'student', h.at));
      p.history.slice(1).forEach((h) => audit.push({ id: 'a-' + audit.length, at: h.at, by: h.by, action: 'Changed status to ' + STATUS[h.status].label, target: p.ref + ' ' + p.title, detail: '' }));
    });
    // Leave Liam's latest status email unread so the inbox badge shows.
    const liamLatest = emails.filter((e) => e.to === 'u-liam').sort((a, b) => b.at - a.at)[0];
    if (liamLatest) liamLatest.read = false;
    users.filter((u) => u.role === 'member' && u.id !== 'm-zhang').forEach((m) => mail(m.id, 'Meeting summary awaiting approval: Forum Meeting — Study Spaces and Food',
      'Representative Zhang has submitted a meeting summary for approval. It will not be visible to students until it is approved and published.', 'member', now - 1.5 * DAY));
    emails.filter((e) => e.kind === 'member').forEach((e) => { e.read = false; });
    users.filter((u) => u.role === 'member').forEach((m) => mail(m.id, 'New proposals are arriving',
      'Students have started submitting proposals in the current submission period. You will get one summary when it closes.', 'member', curOpen + 0.5 * HOUR));
    emails.forEach((e) => { if (e.kind === 'member' && e.subject === 'New proposals are arriving') e.dedupeKey = 'new-proposals:w-4:' + e.to; });

    audit.push({ id: 'a-x1', at: inWin('w-3', 30), by: 'm-okafor', action: 'Approved suggested group', target: 'A Greener Campus with Less Waste', detail: '2 proposals' });
    audit.push({ id: 'a-x2', at: now - 11 * DAY, by: 'm-silva', action: 'Published meeting summary', target: 'Forum Meeting — Sustainability and Art', detail: '' });
    audit.push({ id: 'a-x3', at: now - 3 * DAY, by: 'm-okafor', action: 'Published Forum update', target: 'New Sustainability Project', detail: '' });
    audit.push({ id: 'a-x4', at: now - 1.5 * DAY, by: 'm-zhang', action: 'Submitted summary for approval', target: 'Forum Meeting — Study Spaces and Food', detail: '' });
    audit.push({ id: 'a-x5', at: now - 1 * DAY, by: 'm-zhang', action: 'Published Forum update', target: 'What students asked for this term', detail: '' });
    audit.sort((a, b) => b.at - a.at);
    emails.sort((a, b) => b.at - a.at);
    return db0;
  }

  window.API = API;
})();
