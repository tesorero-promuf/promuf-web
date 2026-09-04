import fs from 'fs';
import admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'promuf-bd';
const CREDENTIALS_PATH = process.env.FIREBASE_CREDENTIALS || './serviceAccountKey.json';

if (!admin.apps.length) {
  let credential;
  try {
    credential = admin.credential.cert(JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8')));
  } catch {
    credential = admin.credential.applicationDefault();
  }
  admin.initializeApp({ credential, projectId: PROJECT_ID });
}

const db = admin.firestore();

function parseCSV(txt) {
  const rows = []; let cur = ''; let row = []; let q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

async function seedCollection(name, filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    if (!txt.trim()) { console.log(`⚠ ${name}: archivo vacío, se omite`); return; }
    const allRows = parseCSV(txt);
    if (allRows.length < 2) { console.log(`⚠ ${name}: sin registros`); return; }
    const headers = allRows[0].map(h => h.trim());
    const records = allRows.slice(1);
    const col = db.collection(name);
    let seeded = 0;
    for (const rec of records) {
      const docData = {};
      headers.forEach((h, i) => {
        const v = (rec[i] || '').toString().trim();
        const num = Number(v);
        docData[h] = v !== '' && !isNaN(num) ? num : v;
      });
      await col.doc().set(docData);
      seeded++;
    }
    console.log(`✅ ${name}: ${seeded} registros`);
  } catch (e) {
    console.error(`❌ ${name}:`, e.message);
  }
}

async function seedCatalogo() {
  try {
    const html = fs.readFileSync('./modulos/tesoreria/index.html', 'utf8');
    const start = html.indexOf('const CATALOGO = [');
    let depth = 0;
    let end = html.indexOf('[', start);
    while (end < html.length) {
      if (html[end] === '[') depth++;
      else if (html[end] === ']') { depth--; if (depth === 0) break; }
      end++;
    }
    end++; // include the closing ]
    const catalogoStr = html.slice(start + 'const CATALOGO = '.length, end)
      .replace(/'/g, '"');
    const catalogo = JSON.parse(catalogoStr);
    const col = db.collection('catalogo');
    let seeded = 0;
    for (const item of catalogo) {
      await col.doc(item.codigo).set(item);
      seeded++;
    }
    console.log(`✅ catalogo: ${seeded} cuentas`);
  } catch (e) {
    console.error('❌ catalogo:', e.message);
  }
}

async function main() {
  console.log(`Sembrando Firebase Firestore — proyecto: ${PROJECT_ID}\n`);
  const COLLECTIONS = {
    movimientos: './data/movimientos.csv',
    fondos: './data/fondos.csv',
    conciliacion: './data/conciliacion.csv',
  };
  for (const [name, path] of Object.entries(COLLECTIONS)) {
    await seedCollection(name, path);
  }
  await seedCatalogo();
  console.log('\n✅ Sembrado completado');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });