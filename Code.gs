// ============================================================
// TCO CLIENT DASHBOARD — Google Sheets Auto-Sync
// ============================================================

const SHEET_ORGANIC = 'Brand Data (Industry) - Organic';
const SHEET_CONTENT = 'Brand Data (Industry) - Content Performance';
const SHEET_SUMMARY = 'Brand Summary - Organic';

// ============================================================

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const organic = readOrganic(ss);
  const content = readContent(ss);
  const summary = readSummary(ss);

  return ContentService
    .createTextOutput(JSON.stringify({ organic, content, summary }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Organic sheet reader ──────────────────────────────────────
// Structure:
//   Row 1: Title row (skip)
//   Row 2: Platform group headers (skip)
//   Row 3: Column headers (skip)
//   Row 4+: Data
//
// Industry label rows: col A = industry name, col C (Platform) = empty
// Data rows: col C always has "Facebook" or "Instagram"
// Month and Brand forward-fill when blank

function readOrganic(ss) {
  const sheet = ss.getSheetByName(SHEET_ORGANIC);
  if (!sheet) { Logger.log('Sheet not found: ' + SHEET_ORGANIC); return []; }

  const values = sheet.getDataRange().getValues();
  const organic = [];

  let curIndustry = '';
  let curBrand    = '';
  let curMonth    = null;

  for (let i = 3; i < values.length; i++) {
    const row = values[i];
    if (row.every(v => v === null || v === '' || v === undefined)) continue;

    const platform = row[2] ? String(row[2]).trim() : null;

    // Industry label rows have no platform value
    if (!platform) {
      if (row[0]) curIndustry = String(row[0]).trim().toUpperCase();
      continue;
    }

    // Forward-fill month and brand
    if (row[0] !== null && row[0] !== '') curMonth = fmtMonth(row[0]);
    if (row[1] !== null && row[1] !== '') curBrand = String(row[1]).replace(/\n/g, ' ').trim();

    if (!curMonth || !curBrand) continue;

    organic.push({
      month:            curMonth,
      brand:            curBrand,
      industry:         curIndustry,
      platform:         platform,
      followers:        num(row[3]),
      reach:            num(row[4]),
      impressions:      num(row[5]),
      engagements:      num(row[6]),
      er_pct:           num(row[7]),
      top_organic:      str(row[8]),
      organic_category: str(row[9]),
      organic_type:     str(row[10]),
      top_boosted:      str(row[11]),
      boosted_category: str(row[12]),
      boosted_type:     str(row[13]),
      notes:            str(row[14])
    });
  }

  Logger.log('Organic rows: ' + organic.length);
  return organic;
}

// ── Content Performance sheet reader ─────────────────────────
// Columns: Month | Brand | Industry | Platform | Types | Post Title | Post Link | Category | Post Types | Engagement | Reach | View | Share | Save
// (A)       (B)    (C)      (D)        (E)       (F)          (G)         (H)        (I)          (J)         (K)    (L)     (M)    (N)
//
// Row 1-3: Headers (skip)
// Row 4+: Data with forward-fill on Month, Brand, Industry

function readContent(ss) {
  const sheet = ss.getSheetByName(SHEET_CONTENT);
  if (!sheet) { Logger.log('Sheet not found: ' + SHEET_CONTENT); return []; }

  const values = sheet.getDataRange().getValues();
  const content = [];

  let curMonth    = null;
  let curBrand    = '';
  let curIndustry = '';

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (row.every(v => v === null || v === '' || v === undefined)) continue;

    // Col D (index 3) must be exactly "Facebook" or "Instagram" to be a data row
    const rawPlat = row[3] ? String(row[3]).trim() : '';
    const platLow = rawPlat.toLowerCase();
    const platform = platLow === 'facebook' ? 'Facebook'
                   : platLow === 'instagram' ? 'Instagram'
                   : null;
    if (!platform) continue;  // header rows, label rows, etc.

    // Forward-fill Month — only accept valid YYYY-MM results
    if (row[0] !== null && row[0] !== '') {
      const m = fmtMonth(row[0]);
      if (m && /^\d{4}-\d{2}$/.test(m)) curMonth = m;
    }
    // Forward-fill Brand and Industry
    if (row[1] !== null && row[1] !== '') curBrand    = String(row[1]).replace(/\n/g, ' ').trim();
    if (row[2] !== null && row[2] !== '') curIndustry = String(row[2]).trim().toUpperCase();

    if (!curMonth || !curBrand) continue;

    // Normalise type — capitalise first letter so 'organic' → 'Organic'
    const rawType = row[4] ? String(row[4]).trim() : '';
    const type = rawType.toLowerCase().startsWith('boost') ? 'Boosted'
               : rawType.toLowerCase().startsWith('organ') ? 'Organic'
               : rawType || null;

    content.push({
      month:      curMonth,
      brand:      curBrand,
      industry:   curIndustry,
      platform:   platform,
      type:       type,
      title:      str(row[5]),    // Post Title
      link:       str(row[6]),    // Post Link
      category:   str(row[7]),    // Category
      post_type:  str(row[8]),    // Post Types (Reels, Photo, etc.)
      engagement: num(row[9]),    // Engagement
      reach:      num(row[10]),   // Reach
      views:      num(row[11]),   // View
      shares:     num(row[12]),   // Share
      saves:      num(row[13])    // Save
    });
  }

  Logger.log('Content rows: ' + content.length);
  if (content.length) Logger.log('Sample: ' + JSON.stringify(content[0]));
  return content;
}

// ── Brand Summary sheet reader ────────────────────────────────
// Structure:
//   Row 1: Platform group headers (skip)
//   Row 2: Column headers
//   Row 3+: Data — Industry forward-fills when blank

function readSummary(ss) {
  const sheet = ss.getSheetByName(SHEET_SUMMARY);
  if (!sheet) { Logger.log('Sheet not found: ' + SHEET_SUMMARY); return []; }

  const values = sheet.getDataRange().getValues();
  const summary = [];
  let curIndustry = '';

  for (let i = 2; i < values.length; i++) {
    const row = values[i];
    if (row.every(v => v === null || v === '' || v === undefined)) continue;

    if (row[0]) curIndustry = String(row[0]).trim().toUpperCase();
    const brand = str(row[1]);
    if (!brand) continue;

    summary.push({
      industry:           curIndustry,
      brand:              brand,
      period:             str(row[2]),
      fb_follower_growth: num(row[3]),
      fb_total_reach:     num(row[4]),
      fb_total_eng:       num(row[5]),
      ig_follower_growth: num(row[6]),
      ig_reach_growth:    num(row[7]),
      ig_eng_growth:      num(row[8])
    });
  }

  Logger.log('Summary rows: ' + summary.length);
  return summary;
}

// ── Helpers ──────────────────────────────────────────────────

function fmtMonth(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
                   jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  const m = s.match(/^(\w+)\s+(\d{4})$/i);
  if (m) {
    const mo = MONTHS[m[1].slice(0,3).toLowerCase()];
    if (mo) return m[2] + '-' + String(mo).padStart(2, '0');
  }
  return s;
}

function num(val) {
  if (val === null || val === '' || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function str(val) {
  if (val === null || val === '' || val === undefined) return null;
  const s = String(val).replace(/\n/g, ' ').trim();
  return s || null;
}

// ── Test — run this to verify row counts ─────────────────────
function testData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const organic = readOrganic(ss);
  const content = readContent(ss);
  const summary = readSummary(ss);
  Logger.log('=== RESULTS ===');
  Logger.log('Organic: ' + organic.length + ' rows');
  Logger.log('Content: ' + content.length + ' rows');
  Logger.log('Summary: ' + summary.length + ' rows');
  if (organic.length)  Logger.log('First organic: '  + JSON.stringify(organic[0]));
  if (content.length)  Logger.log('First content: '  + JSON.stringify(content[0]));
  if (summary.length)  Logger.log('First summary: '  + JSON.stringify(summary[0]));
}
