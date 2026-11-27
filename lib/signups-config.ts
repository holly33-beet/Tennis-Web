// Where the Progress page reads sign-ups from. See SIGNUPS-SETUP.md.
// url: the Apps Script web app URL (ends in /exec). Leave "" and the page shows "Not connected yet".
// The sign-up key is deliberately NOT here (the GitHub repo is public). Each exec types it on the
// Progress page once; it is kept in that browser's localStorage only.
// Keep this in sync with the WTC_SIGNUPS block in western-tennis-club.html.
export const SIGNUPS = {
  url: "https://script.google.com/macros/s/AKfycbxWhnAv-catu6ZNHEw4Vd144hyNDjooMTfz-nmO81iUkJvKXMNM2A5p36lGamAcBGB0cQ/exec",
};
