// split-sql.js — splits a SQL file into individual statements,
// respecting dollar-quoted ($$...$$) and single-quoted strings.
// Usage: node split-sql.js <input.sql> <output-dir>
const fs = require('fs');
const path = require('path');

const input = process.argv[2];
const outDir = process.argv[3];
const src = fs.readFileSync(input, 'utf8');

const statements = [];
let cur = '';
let i = 0;
let inDollar = false;
let inSingle = false;

while (i < src.length) {
  const ch = src[i];
  const next = src[i + 1];

  if (inDollar) {
    cur += ch;
    if (ch === '$' && next === '$') {
      cur += next;
      inDollar = false;
      i += 2;
      continue;
    }
    i++;
    continue;
  }

  if (inSingle) {
    cur += ch;
    if (ch === "'") {
      if (next === "'") {
        cur += next;
        i += 2;
        continue;
      }
      inSingle = false;
    }
    i++;
    continue;
  }

  // not inside quotes
  if (ch === '$' && next === '$') {
    inDollar = true;
    cur += ch + next;
    i += 2;
    continue;
  }
  if (ch === "'") {
    inSingle = true;
    cur += ch;
    i++;
    continue;
  }
  if (ch === ';') {
    if (cur.trim().length > 0) statements.push(cur.trim());
    cur = '';
    i++;
    continue;
  }
  cur += ch;
  i++;
}

if (cur.trim().length > 0) statements.push(cur.trim());

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// remove pre-existing files
for (const f of fs.readdirSync(outDir)) {
  if (f.startsWith('stmt-')) fs.unlinkSync(path.join(outDir, f));
}

statements.forEach((s, idx) => {
  const name = `stmt-${String(idx + 1).padStart(3, '0')}.sql`;
  fs.writeFileSync(path.join(outDir, name), s);
});

console.log(`Split into ${statements.length} statements -> ${outDir}`);
statements.forEach((s, idx) => {
  const firstLine = s.split('\n').find((l) => l.trim() !== '') ?? '';
  console.log(`${String(idx + 1).padStart(3, '0')}: ${firstLine.slice(0, 90)}`);
});
