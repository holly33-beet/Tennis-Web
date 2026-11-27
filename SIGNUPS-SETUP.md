# Connecting the Progress page to the Google Form sign-ups

The Progress page reads the form responses in the browser every time it opens. The site stays static
(no server, no database) and nobody types sign-ups in. Until a data link is added, the page shows
"Not connected yet".

What's in the Drive folder (checked 2026-11-26, read only, nothing changed):
- Form: **WTC Session Sign up Week 2** (owner: another exec; Holly has view access only)
- Responses sheet: **Week 6 WTC Session Sign up (Responses)**, tab "Form responses 1" (owner: another exec; view only)
- The Week 2 form's own responses sheet is not in this folder, and no other weeks were visible.

The responses tab holds **email addresses** as well as names, so how you expose it matters.

## Option A (chosen by Holly, 2026-11-27): Apps Script link + sign-up key

Returns names, sessions and timestamps only. Emails and notes never leave the sheet. It picks up
every response sheet in the folder, so next week's sheet appears on the site by itself.
Works with view-only access, so you don't need the sheet owner.

**Where the key lives:** only in the Apps Script's Script Properties, and in the browser of each exec
who has typed it on the Progress page (localStorage). It is never in the site's code, the config,
or the public GitHub repo. The `/exec` URL is safe to commit: without the key it only answers "unauthorized".

1. Go to script.google.com → **New project**. Paste in `signups-apps-script.gs` and save.
2. **Project Settings (gear) → Script Properties → Add script property**: name `SIGNUP_KEY`,
   value = a long random phrase you make up. Save. Don't put it in any file.
3. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Authorise when asked.
4. Copy the Web app URL (ends in `/exec`) and put it in `url` in both places:
   - Next.js site: `lib/signups-config.ts`, then `npm run build`
   - Single file: `western-tennis-club.html` → the `window.WTC_SIGNUPS = { url: "" }` line
5. Open the Progress page, unlock it, and type the key once. "Forget key" removes it from that browser.
   Share the key with other execs privately (not in the repo or a public chat).
6. To change the key: edit `SIGNUP_KEY` in Script Properties (no redeploy needed). Everyone re-enters it.

## Option B (not chosen): publish the responses tab as CSV

Simplest, but the published CSV is public and **includes every responder's email address**.
The page never shows emails, but anyone with the CSV link can download them.
You need edit access to publish, so the sheet owner would have to do it.

1. Open the responses sheet → **File → Share → Publish to web**.
2. Choose the tab **Form responses 1** and format **Comma-separated values (.csv)** → Publish.
3. Copy the link and put it in `url` in both places listed in Option A step 4. No key is asked for a CSV link.
4. To stop sharing later: same menu → **Stop publishing**.

Option B covers one sheet only. Each new weekly sheet would need publishing and a new link.

## What the page shows
- Week picker (Option A), people signed up, spots booked, and anyone over the form's 2-hour limit
- One card per session (day, time, type) with the names, sorted by date and time
- Refresh button; sheet edits show on the next refresh (Apps Script caches 60 seconds)

Code: `public/signups.js` (shared; also inlined in the single HTML file, keep identical),
`components/signups-view.tsx`, `app/progress/page.tsx`, styles at the end of `app/globals.css`.
