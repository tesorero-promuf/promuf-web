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

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.log('Uso: node scripts/set_password.mjs <correo> <nuevaContrasena>');
  process.exit(1);
}

try {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().updateUser(user.uid, { password });
  console.log(`OK: contraseña actualizada para ${user.email} (uid ${user.uid}).`);
  admin.app().delete();
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}