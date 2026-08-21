// Sincroniza las pestañas publicadas de Google Sheets hacia data/*.csv
// (mismo origen de GitHub Pages => sin problema de CORS en el navegador).
// Se ejecuta en el servidor (GitHub Action), donde no hay restricción CORS.
import fs from 'fs';

const SHEET_ID = '2PACX-1vQxhyBk_6vnEZnkGqpyEoV7hhroRq_LxpNTBizH4297eZXmuZCcW-eLPwZccxFboh6X7SjN8OdRicB6';
const SRC = {
  movimientos: `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=973272967&single=true&output=csv`,
  fondos:      `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=93197831&single=true&output=csv`,
  conciliacion:`https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=431377371&single=true&output=csv`,
};

let cambios = 0;
for (const [nombre, url] of Object.entries(SRC)) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    const txt = await r.text();
    // Solo sobrescribir si trae contenido real (evita borrar por error transitorio).
    if (txt && txt.trim().length > 3) {
      const archivo = `data/${nombre}.csv`;
      const prev = fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : '';
      if (prev !== txt) { fs.writeFileSync(archivo, txt); cambios++; }
      console.log(`OK ${nombre}: ${txt.split('\n').length} lineas`);
    } else {
      console.log(`VACIO ${nombre}: se conserva archivo previo`);
    }
  } catch (e) {
    console.error(`ERR ${nombre}:`, e.message);
  }
}
console.log(`Cambios: ${cambios}`);
process.exit(0);
