// ============================================================
// TCO CLIENT DASHBOARD — Google Sheets Auto-Sync
// Auto-generated to match actual sheet structure in TCO Data Hub
// ============================================================

const SHEET_ORGANIC = 'Brand Data (Industry) - Organic';
const SHEET_SUMMARY = 'Brand Summary - Organic';

// ============================================================

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const { organic, content } = readOrganic(ss);
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
//   Row 4+: Data — industry label rows interspersed with data rows
//
// Industry label rows: col A = industry name, col C (Platform) = empty
// Data rows: col C always has "Facebook" or "Instagram"
// Month and Brand forward-fill when blank

function readOrganic(ss) {
  const sheet = ss.getSheetByName(SHEET_ORGANIC);
  if (!sheet) { Logger.log('Sheet not found: ' + SHEET_ORGANIC); return { organic: [], content: [] }; }

  const values = sheet.getDataRange().getValues();
  const organic = [];
  const content = [];

  let curIndustry = '';
  let curBrand    = '';
  let curMonth    = null;

  for (let i = 3; i < values.length; i++) {   // start at row 4 (index 3)
    const row = values[i];

    // Skip completely empty rows
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

    // Extract organic top post as content row
    if (row[8] || row[9] || row[10]) {
      content.push({
        month:     curMonth,
        brand:     curBrand,
        industry:  curIndustry,
        platform:  platform,
        type:      'Organic',
        title:     str(row[8]),
        link:      null,
        category:  str(row[9]),
        post_type: str(row[10]),
        engagement: null, reach: null, views: null, shares: null, saves: null
      });
    }

    // Extract boosted top post as content row
    if (row[11] || row[12] || row[13]) {
      content.push({
        month:     curMonth,
        brand:     curBrand,
        industry:  curIndustry,
        platform:  platform,
        type:      'Boosted',
        title:     str(row[11]),
        link:      null,
        category:  str(row[12]),
        post_type: str(row[13]),
        engagement: null, reach: null, views: null, shares: null, saves: null
      });
    }
  }

  Logger.log('Organic rows: ' + organic.length + ' | Content rows: ' + content.length);
  return { organic, content };
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

  for (let i = 2; i < values.length; i++) {   // start at row 3 (index 2)
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
  // Date object from Google Sheets
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
  }
  const s = String(val).trim();
  // Already YYYY-MM or YYYY-MM-DD
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  // "Sep 2025" or "September 2025" format
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
  const { organic, content } = readOrganic(ss);
  const summary = readSummary(ss);
  Logger.log('=== RESULTS ===');
  Logger.log('Organic: ' + organic.length + ' rows');
  Logger.log('Content: ' + content.length + ' rows');
  Logger.log('Summary: ' + summary.length + ' rows');
  if (organic.length) Logger.log('First organic: ' + JSON.stringify(organic[0]));
  if (summary.length) Logger.log('First summary: ' + JSON.stringify(summary[0]));
}
