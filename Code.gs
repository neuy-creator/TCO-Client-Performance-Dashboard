// ============================================================
// TCO CLIENT DASHBOARD — Google Sheets Auto-Sync
// ============================================================
// STEP 1: Set your sheet names below (must match exactly)
// ============================================================

const SHEET_ORGANIC = 'Monthly Performance';   // ← organic/monthly data
const SHEET_CONTENT = 'Top Posts';             // ← top posts (content breakdown)
const SHEET_SUMMARY = 'Brand Summary';         // ← brand summary totals

// ============================================================
// DO NOT EDIT BELOW THIS LINE
// ============================================================

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const data = {
    organic: readSheet(ss, SHEET_ORGANIC, mapOrganic),
    content: readSheet(ss, SHEET_CONTENT, mapContent),
    summary: readSheet(ss, SHEET_SUMMARY, mapSummary)
  };

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet reader ─────────────────────────────────────────────
function readSheet(ss, sheetName, mapFn) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) { Logger.log('Sheet not found: ' + sheetName); return []; }
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return mapFn(obj);
    })
    .filter(Boolean);
}

// ── Helpers ──────────────────────────────────────────────────
// Find a value by trying multiple possible header names
function v(obj, ...keys) {
  for (const k of keys) {
    const found = Object.keys(obj).find(ok => ok === k.toLowerCase());
    if (found !== undefined) {
      const val = obj[found];
      return (val === '' || val === null) ? null : val;
    }
  }
  return null;
}

function num(val) {
  if (val === null || val === '' || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function str(val) {
  if (val === null || val === '' || val === undefined) return null;
  return String(val).trim() || null;
}

// Convert Date objects or "2025-01" strings to "YYYY-MM" format
function fmtMonth(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
  }
  const s = String(val).trim();
  // Already YYYY-MM
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  return s;
}

// ── Column mappers ───────────────────────────────────────────
function mapOrganic(row) {
  const month = fmtMonth(v(row, 'month'));
  if (!month) return null;
  return {
    month,
    brand:            str(v(row, 'brand')),
    industry:         str(v(row, 'industry')),
    platform:         str(v(row, 'platform')),
    followers:        num(v(row, 'followers')),
    reach:            num(v(row, 'reach')),
    impressions:      num(v(row, 'impressions')),
    engagements:      num(v(row, 'engagements')),
    er_pct:           num(v(row, 'er%', 'er_pct', 'er', 'engagement rate')),
    top_organic:      str(v(row, 'top organic', 'top_organic', 'top organic post')),
    organic_category: str(v(row, 'organic category', 'organic_category')),
    organic_type:     str(v(row, 'organic type', 'organic_type')),
    top_boosted:      str(v(row, 'top boosted', 'top_boosted', 'top boosted post')),
    boosted_category: str(v(row, 'boosted category', 'boosted_category')),
    boosted_type:     str(v(row, 'boosted type', 'boosted_type')),
    notes:            str(v(row, 'notes'))
  };
}

function mapContent(row) {
  const month = fmtMonth(v(row, 'month'));
  if (!month) return null;
  return {
    month,
    brand:      str(v(row, 'brand')),
    industry:   str(v(row, 'industry')),
    platform:   str(v(row, 'platform')),
    type:       str(v(row, 'type')),
    title:      str(v(row, 'title', 'post title')),
    link:       str(v(row, 'link', 'url', 'post link', 'post url')),
    category:   str(v(row, 'category')),
    post_type:  str(v(row, 'post type', 'post_type', 'format', 'content type')),
    engagement: num(v(row, 'engagement', 'engagements')),
    reach:      num(v(row, 'reach')),
    views:      num(v(row, 'views')),
    shares:     num(v(row, 'shares')),
    saves:      num(v(row, 'saves'))
  };
}

function mapSummary(row) {
  const brand = str(v(row, 'brand'));
  if (!brand) return null;
  return {
    industry:           str(v(row, 'industry')),
    brand,
    period:             str(v(row, 'period')),
    fb_follower_growth: num(v(row, 'fb follower growth', 'fb_follower_growth')),
    fb_total_reach:     num(v(row, 'fb total reach', 'fb_total_reach')),
    fb_total_eng:       num(v(row, 'fb total engagement', 'fb_total_eng', 'fb total eng')),
    ig_follower_growth: num(v(row, 'ig follower growth', 'ig_follower_growth')),
    ig_reach_growth:    num(v(row, 'ig reach growth', 'ig_reach_growth', 'ig total reach')),
    ig_eng_growth:      num(v(row, 'ig engagement growth', 'ig_eng_growth', 'ig total engagement'))
  };
}

// ── Test function (run this in Apps Script to verify) ────────
function testData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const organic = readSheet(ss, SHEET_ORGANIC, mapOrganic);
  const content = readSheet(ss, SHEET_CONTENT, mapContent);
  const summary = readSheet(ss, SHEET_SUMMARY, mapSummary);
  Logger.log('Organic rows: ' + organic.length);
  Logger.log('Content rows: ' + content.length);
  Logger.log('Summary rows: ' + summary.length);
  if (organic.length) Logger.log('First organic row: ' + JSON.stringify(organic[0]));
  if (content.length) Logger.log('First content row: ' + JSON.stringify(content[0]));
}
