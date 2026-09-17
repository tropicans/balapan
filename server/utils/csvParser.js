/**
 * RFC4180-compliant CSV string tokenizer without external dependencies.
 * @param {string} text 
 * @returns {Array<Array<string>>}
 */
export function tokenizeCsv(text) {
  if (typeof text !== 'string') return [];
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // Ignore carriage return
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Flexible participant CSV parser supporting:
 * 1. Standard format (headers: name/nama, team/tim)
 * 2. STC Vol 8 roster format (section-based with status Lunas/comp)
 * 3. Headerless format (col 0 = name, col 1 = team)
 *
 * @param {string} csvText 
 * @returns {{ valid: Array<{ name: string, team_name: string|null }>, skipped: Array<{ row: number, reason: string }> }}
 */
export function parseParticipantCsv(csvText) {
  const rows = tokenizeCsv(csvText);
  const valid = [];
  const skipped = [];

  if (!rows || rows.length === 0) {
    return { valid, skipped };
  }

  // Detect header in first 5 rows
  let headerIndex = -1;
  let nameColIdx = -1;
  let teamColIdx = -1;
  let isStcFormat = false;

  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r].map(c => (c || '').trim().toLowerCase());
    
    // Check STC Vol 8 format
    if (row.some(c => c.includes('nama racer') || c.includes('kupon sales'))) {
      isStcFormat = true;
      headerIndex = r;
      break;
    }

    // Check standard format
    const nIdx = row.findIndex(c => ['name', 'nama', 'pembalap', 'racer'].includes(c));
    if (nIdx !== -1) {
      headerIndex = r;
      nameColIdx = nIdx;
      teamColIdx = row.findIndex(c => ['team', 'tim', 'klub', 'club', 'tag'].includes(c));
      break;
    }
  }

  if (isStcFormat) {
    // Parser STC Vol 8
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].map(c => (c || '').trim());
      const c0 = cells[0] || '';
      const c1 = cells[1] || '';
      const status = cells[4] || '';

      if (!c0 || /^total/i.test(c0) || /kupon sales/i.test(c0) || /nama racer/i.test(c1)) {
        continue;
      }
      // Check if row is a section header (e.g. "Presale (40 Runs)")
      if (/presale|ots|top up/i.test(c0)) continue;

      const isPaid = /lunas/i.test(status) && !/belum/i.test(status);
      const isComp = !status && (cells[2] === '' || cells[2] === undefined) && /rp0/i.test(cells[3] || '');

      if (!c1) {
        skipped.push({ row: r + 1, reason: 'Nama pembalap kosong' });
        continue;
      }

      if (isPaid || isComp) {
        valid.push({ name: c1, team_name: null });
      } else {
        skipped.push({ row: r + 1, reason: `Status belum lunas (${status || 'Belum Lunas'})` });
      }
    }
  } else if (headerIndex !== -1) {
    // Standard format with header
    for (let r = headerIndex + 1; r < rows.length; r++) {
      const cells = rows[r];
      const name = (cells[nameColIdx] || '').trim();
      const team = teamColIdx !== -1 ? (cells[teamColIdx] || '').trim() : null;

      if (!name) {
        if (cells.some(c => (c || '').trim().length > 0)) {
          skipped.push({ row: r + 1, reason: 'Kolom nama kosong' });
        }
        continue;
      }

      valid.push({ name, team_name: team || null });
    }
  } else {
    // Fallback: headerless (col 0 = name, col 1 = team)
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r];
      const name = (cells[0] || '').trim();
      const team = cells[1] ? cells[1].trim() : null;

      if (!name) continue;
      valid.push({ name, team_name: team || null });
    }
  }

  return { valid, skipped };
}
