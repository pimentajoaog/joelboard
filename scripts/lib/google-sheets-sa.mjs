import { createSign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function loadServiceAccountCredentials() {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) {
    return JSON.parse(inline);
  }
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path && existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf8'));
  }
  return null;
}

function signJwt(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: SHEETS_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));
  const payload = header + '.' + claim;
  const sign = createSign('RSA-SHA256');
  sign.update(payload);
  sign.end();
  const sig = sign.sign(credentials.private_key);
  return payload + '.' + base64url(sig);
}

export async function getServiceAccountAccessToken(credentials) {
  const assertion = signJwt(credentials);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion
    })
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description || json.error || 'Google token exchange failed');
  }
  return json.access_token;
}

export async function fetchSheetValues(spreadsheetId, range, accessToken) {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets/'
    + encodeURIComponent(spreadsheetId)
    + '/values/'
    + encodeURIComponent(range)
    + '?valueRenderOption=UNFORMATTED_VALUE';
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || res.statusText || 'Sheets API failed');
  }
  return json.values || [];
}
