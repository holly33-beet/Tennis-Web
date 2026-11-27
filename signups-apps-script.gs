/**
 * Western Tennis Club: sign-up data for the website's Progress page.
 *
 * A standalone Google Apps Script (script.google.com → New project). It runs as you, so it can
 * read the response sheets you can view, even ones you don't own. It sends back ONLY each
 * person's name, the sessions they picked and the timestamp. Emails and notes never leave the sheet.
 *
 * Every response sheet in the sign-up folder is included automatically, so a new week's form
 * shows up on the site without anyone typing anything.
 *
 * The sign-up key lives ONLY in this project's Script Properties (Project Settings → Script
 * Properties → SIGNUP_KEY). It is not in this file, the site's code, or the GitHub repo.
 *
 * Deploy: Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
 * Copy the Web app URL (ends in /exec) into the site config. Execs type the key on the Progress page.
 */

const FOLDER_ID = '1u3hMXCaDsMGOhTb8sWIRrTevgXjig7-4'; // the WTC sign-up folder in Drive
const EXTRA_SHEET_IDS = [];      // response sheets kept outside the folder, if any
const CACHE_SECONDS = 60;        // how long Google caches the answer (fewer sheet reads)

function doGet(e) {
  const key = PropertiesService.getScriptProperties().getProperty('SIGNUP_KEY');
  if (!key) return json_({ error: 'SIGNUP_KEY is not set in Script Properties.' });
  if (!e || !e.parameter || e.parameter.token !== key) return json_({ error: 'unauthorized' });

  const cache = CacheService.getScriptCache();
  const hit = cache.get('weeks');
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);

  const files = [];
  const it = DriveApp.getFolderById(FOLDER_ID).getFilesByType(MimeType.GOOGLE_SHEETS);
  while (it.hasNext()) files.push(it.next());
  EXTRA_SHEET_IDS.forEach(id => files.push(DriveApp.getFileById(id)));

  const weeks = [];
  files.forEach(f => {
    try {
      const book = SpreadsheetApp.openById(f.getId());
      const sheet = book.getSheets().find(s => /^form responses/i.test(s.getName())) || book.getSheets()[0];
      const values = sheet.getDataRange().getDisplayValues();
      if (!values.length) return;
      const head = values[0].map(h => String(h).toLowerCase());
      const iName = head.findIndex(h => h.includes('name') && !h.includes('email'));
      const iSess = head.findIndex(h => h.includes('session') && !h.includes('understand'));
      const iTime = head.findIndex(h => h.includes('timestamp'));
      if (iName < 0 || iSess < 0) return; // not a sign-up sheet
      const rows = values.slice(1)
        .filter(r => String(r[iName]).trim() && String(r[iSess]).trim())
        .map(r => ({ name: String(r[iName]).trim(), sessions: r[iSess], time: iTime >= 0 ? r[iTime] : '' }));
      weeks.push({ title: f.getName().trim(), created: f.getDateCreated().toISOString(), rows: rows });
    } catch (err) {
      // Skip a sheet we can't open rather than failing the whole page.
    }
  });
  weeks.sort((a, b) => (a.created < b.created ? -1 : 1));

  const body = JSON.stringify({ weeks: weeks, generated: new Date().toISOString() });
  try { cache.put('weeks', body, CACHE_SECONDS); } catch (err) { /* over 100 KB: skip cache */ }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
