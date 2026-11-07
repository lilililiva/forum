# Student Forum: Digital Forum Guide & Proposal Platform

The central online platform for the Student Forum. Students read Forum news, meeting summaries and projects, submit proposals during submission windows, and track their progress. Forum members review and group proposals, manage submission windows, approve and publish meeting summaries, and run projects from their own dashboard.

---

## 1. Opening the platform

No installation is needed.

1. Open the `Forum Guide Website` folder.
2. Double-click **`index.html`**. It opens in your web browser (Chrome, Safari, Edge or Firefox).
3. Choose an account on the sign-in screen.

The fonts load from Google Fonts, so connect to the internet for the intended look. Without a connection the platform still works, using standard fonts.

**Optional: run it as a local website.** Some browsers limit storage for files opened directly. If you have Python, run this in the folder and open http://localhost:8000:

```bash
python3 -m http.server 8000
```

### Demo accounts

This demo has no passwords. Click a name to use the platform as that person. A real deployment would use the school's single sign-on (see section 6).

| Account | Role | Greeting |
|---|---|---|
| Liam Carter | Student, Grade 10. Has proposals at three different stages | Hey Liam |
| Maya, Noah, Ava, Ethan, Sofia, Lucas, Zara | Students | Hey + first name |
| Daniela Silva | Forum member: President | Hey President Silva |
| Amara Okafor | Forum member: Vice President | Hey Vice President Okafor |
| Kevin Zhang | Forum member: Representative | Hey Representative Zhang |
| Erik Lindqvist | Forum member: Secretary | Hey Secretary Lindqvist |

Use the **sign-out icon** (top right) to switch accounts. The **bell icon** opens that person's email notifications.

### Sample data

The sample data is generated relative to today, so there is always a submission window open right now, plus past and upcoming windows. It includes:

- 16 proposals covering every status
- one approved group, and several grouping suggestions waiting for review
- four meetings: two published, one pending approval, and one with notes only
- six projects, one of them members-only
- five published Forum updates and one draft
- a full email and activity history

To start over, click **Reset sample data** in the footer of any page.

---

## 2. A 10-minute test walkthrough

**As a student (Liam Carter)**
1. **Home:** check the "Hey Liam" greeting, the latest updates, the quick-access cards, the submission-window status and the current projects.
2. **Forum Guide:** filter by category (left), search for `library` or `recycling`, and filter by Ongoing or Completed. Open a meeting summary to see decisions, ongoing discussions and projects underway, each marked differently.
3. **Track Your Proposal:** Liam has three proposals:
   - *More Study Spaces*: Under Review
   - *Phone Charging Stations*: Assigned to Sponsor, with an update from the sponsor
   - *Later Start on Mondays*: Rejected, with the reason shown
4. **Submit a Proposal:** press Submit with the form empty to see the field errors. Then submit a real idea. You get a reference number like `SF-2026-0017`, a confirmation email (bell icon), and the proposal appears on the Track page.
5. Return to Submit. Liam has now used both proposals for this month, so the form is replaced by a limit message.
6. Type `#/admin` at the end of the address. Students are sent back to Home with "That area is for Forum members only."

**As a Forum member (President Silva)**
1. **Dashboard:** check the "Hey President Silva" greeting, the seven statistics, proposals needing attention, recent submissions, grouping suggestions, windows, pending summaries, activity and projects, and the quick actions.
2. **Groups:** the platform suggests *Improving Student Study Spaces* (5 proposals, including Liam's new one if you submitted it), *Better Campus Technology*, *Better Food & Dining Options*, and adding *Water Bottle Refill Stations* to the existing green group. You can:
   - approve or rename a suggestion
   - choose "Not related" to dismiss it for good
   - move proposals between groups
   - write a combined summary
   - create a group manually
3. **Proposals:** filter by grade, category, status or date range, then open *More Study Spaces*. You can:
   - add an internal note (amber panel, members only)
   - post a student-visible update
   - assign a sponsor
   - change the status, with an optional message
   - reject with a reason, and choose whether to share it
   Each change is confirmed first, recorded with your name and the date, and emails the student once.
4. **Meeting summaries → "Study Spaces and Food":** Representative Zhang submitted this automatic draft, so as Silva you can edit it, then approve it or request changes. After approval, **Publish to Forum Guide**. The confidential notes never appear in the published version.
5. **Meeting summaries → "This Week":** click **Generate draft from notes**. Lines starting with `PRIVATE` or `CONFIDENTIAL` are left out. Submit it for approval and you'll see you **cannot approve your own summary**: sign in as another member to approve it.
6. **Submission windows:**
   - **Close now**: members get one summary email
   - **Open now for 24 hours**
   - edit times, choose whether to announce a date to students, or add the next four fortnightly windows
   Sign in as a student while submissions are closed to see when the next window opens.
7. **Projects:** edit a project's progress and status, link student suggestions, post public or internal updates, and choose whether students can see it at all.
8. **Activity & email log:** every administrative action, with who did it and when, plus every email sent.

---

## 3. Features and where they are

| Requirement | Where |
|---|---|
| Two roles with separate access | Sign-in screen; *Forum Member* button in the top bar (members only) |
| "Hey (name)" greeting | Home page, and the top of the member dashboard |
| Homepage: welcome, latest updates, quick cards, projects | `#/` |
| Forum Guide: 5 categories, search, filters, published items only | `#/guide` |
| Proposal form, guidelines, 2-per-month limit, submission windows | `#/submit` |
| Reference number, confirmation, confirmation email | Shown after submitting; bell icon |
| Private tracking with a 6-stage progress tracker | `#/track` |
| Member dashboard: statistics, sections, quick actions | `#/admin` |
| Review, filters, notes, statuses, sponsors, rejection reasons | `#/admin/proposals` |
| Automatic grouping suggestions, manual groups, combined summaries | `#/admin/groups` |
| Meeting notes → draft → pending → approved → published | `#/admin/meetings` |
| Forum updates (announcements, decisions) | `#/admin/updates` |
| Submission windows (admin-controlled, every 2 weeks, 1 day) | `#/admin/windows` |
| Projects (6 statuses, public/internal updates) | `#/admin/projects` |
| Email notifications (students and members, no duplicates) | Bell icon; `#/admin/activity?tab=email` |
| Audit trail of administrative actions | `#/admin/activity` |

### How privacy is enforced
- Every page reads data through one gateway (`js/store.js`, the `API` object).
- Student functions return only the student's **own** proposals, with internal notes, other people's names and internal history removed.
- The Forum Guide functions return only **published** posts, **published** meeting summaries and projects **marked visible**, and only their public fields. Confidential meeting notes and internal project updates are never returned.
- Every administrative function first checks that the signed-in user is a Forum member, and refuses otherwise. Students have no function that changes roles.
- A summary can only be published after a **different** member approves it. Automatic drafts are clearly labelled and can never be published without human approval.
- Every important administrative action is written to the activity log.
- The platform stores only each person's name, email, grade and, for members, their title.

### How grouping works
The platform compares the words in each ungrouped proposal. It maps related words to shared concerns (for example *library*, *quiet*, *desk* and *study* all count as study space), then combines that with plain word overlap. Proposals above a similarity threshold are suggested as a group and named after their shared concern. Suggestions change nothing until a member approves them, and dismissed suggestions are not offered again. Groups only reference proposals: the original submissions are never changed.

### Notifications
Each email carries an event key, so the same event never emails anyone twice. To avoid flooding Forum members, they get one "proposals are arriving" email per window and one summary when it closes, not an email per proposal. A status change and its message go out as a single email.

---

## 4. Files

```
index.html            App entry point
css/styles.css        All styles: colour tokens, layouts, responsive rules
js/store.js           Data, rules, permissions, grouping, notifications, sample data
js/ui.js              Shared interface: icons, top bar, progress tracker, dialogs, toasts
js/student.js         Student pages
js/admin.js           Forum member pages
js/app.js             Router and access checks
assets/               School seal, BB Forum logo, campus photo (from this folder)
```

---

## 5. Accessibility and devices
- Works on phones, tablets and computers. On phones the menu, admin navigation and tables adapt to the narrow screen.
- Full keyboard support, a "Skip to content" link, visible focus outlines, and labelled form fields with clear error messages.
- Colour contrast meets WCAG AA. Status is never shown by colour alone: there is always a label.
- Respects the "reduce motion" setting.

---

## 6. What this demo build is, and what a live launch needs

This is a complete, working **front-end application**. Every workflow runs in the browser, and data is saved in that browser's local storage. That makes it easy to explore and test, but each browser keeps its own separate copy of the data. To run it for ~500 students on shared data, the same `API` functions in `js/store.js` would be backed by a server:

| Demo build | Live platform |
|---|---|
| Data in browser storage | A database on a school-approved server |
| Click-a-name sign-in | School single sign-on (Google Workspace / Microsoft 365), with roles assigned by staff |
| Emails delivered to the in-app inbox | A real email service (the messages and no-duplicate rules are already written) |
| Permission checks in the browser | The same checks enforced on the server, so they can't be bypassed |
| Window closing checked while a page is open | A scheduled server job |

The pages would not need to change, because they only talk to the `API` object.
