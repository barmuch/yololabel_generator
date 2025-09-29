// Script to extract all unique non-empty Col_3 values from CSV
// and emit a TypeScript helper class.

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'all_tables_combined_clean.csv');
const OUT_PATH = path.join(__dirname, '..', 'lib', 'col3-values.ts');

function splitCSV(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Toggle quotes unless escaped by double quote
      if (inQuotes && line[i + 1] === '"') { // escaped quote
        current += '"';
        i++; // skip next
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  // push last
  result.push(current);
  return result;
}

function clean(value) {
  if (value == null) return '';
  let v = value.trim();
  if (v.startsWith('"') && v.endsWith('"')) {
    v = v.slice(1, -1);
  }
  // Remove trailing commas accidentally captured
  if (v.endsWith(',')) v = v.slice(0, -1).trim();
  return v.trim();
}

function generate() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV file not found:', CSV_PATH);
    process.exit(1);
  }
  const lines = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    console.error('CSV is empty');
    process.exit(1);
  }
  // Header assumed
  const header = splitCSV(lines[0]);
  const colIndex = header.findIndex(h => h.trim() === 'Col_3');
  if (colIndex === -1) {
    console.error('Col_3 not found in header');
    process.exit(1);
  }

  const values = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSV(lines[i]);
    if (cols.length <= colIndex) continue;
    const raw = cols[colIndex];
    const v = clean(raw);
    if (!v) continue;
    values.add(v);
  }

  // Sort for deterministic output
  const list = Array.from(values).sort((a,b) => a.localeCompare(b));

  const unionType = list.map(v => JSON.stringify(v)).join(' | ');

  const fileContent = `/**\n * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY\n * Source: all_tables_combined_clean.csv (Col_3)\n * Generated: ${new Date().toISOString()}\n * Total entries: ${list.length}\n */\n\nexport const COL3_VALUES = ${JSON.stringify(list, null, 2)} as const;\n\nexport type Col3Value = typeof COL3_VALUES[number];\n\nexport class Col3Catalog {\n  /** All values in sorted order */\n  static readonly all: Col3Value[] = [...COL3_VALUES];\n\n  /** O(1) membership test */\n  private static readonly set = new Set(COL3_VALUES as readonly string[]);\n\n  /** Check if a value exists (case-sensitive) */\n  static has(value: string): value is Col3Value {\n    return Col3Catalog.set.has(value);\n  }\n\n  /** Find values containing a case-insensitive substring */\n  static search(sub: string): Col3Value[] {\n    const needle = sub.toLowerCase();\n    return Col3Catalog.all.filter(v => v.toLowerCase().includes(needle));\n  }\n\n  /** Return a normalized version (trimmed) if valid */\n  static normalize(value: string): Col3Value | undefined {\n    const trimmed = value.trim();\n    return Col3Catalog.has(trimmed) ? (trimmed as Col3Value) : undefined;\n  }\n}\n\n// Convenience: export union type explicitly (for IDE intellisense)\nexport type { Col3Value as Col3 };\n`;

  fs.writeFileSync(OUT_PATH, fileContent, 'utf8');
  console.log(`Generated ${list.length} values to`, OUT_PATH);
}

generate();
