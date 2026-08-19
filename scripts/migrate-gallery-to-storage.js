import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '..', 'frontend', '.env');
  const raw = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend/.env');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/migrate-gallery-to-storage.js <email> <password>');
  console.error('The account must have admin or superadmin role.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const IMAGES = [
  { title: 'Local Toda Drivers Patrol Training', file: 'tandangsora.jfif' },
  { title: 'Zone 4 Tree Planting Event', file: 'tandangsorashrine.jpg' },
  { title: 'Salaam Compound Health Fair', file: 'barangayhalltandangsora.jfif' },
  { title: 'Community Clean-Up Drive', file: 'tandangsora.jpg' },
  { title: 'Barangay Safety Orientation', file: 'culiat-brgy.jpg' },
];

const IMAGE_DIR = resolve(__dirname, '..', 'frontend', 'public', 'image');

async function main() {
  console.log('--- Community Gallery Migration ---\n');

  console.log('Signing in...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authErr) {
    console.error(`Auth failed: ${authErr.message}`);
    process.exit(1);
  }
  console.log(`Signed in as ${authData.user.email}\n`);

  for (const { title, file } of IMAGES) {
    const filePath = resolve(IMAGE_DIR, file);
    console.log(`[${title}]`);

    let fileData;
    try {
      fileData = readFileSync(filePath);
    } catch (err) {
      console.error(`  SKIP: Could not read ${filePath}: ${err.message}`);
      continue;
    }

    const ext = file.split('.').pop().toLowerCase();
    const contentType = ext === 'jfif' ? 'image/jpeg' : `image/${ext}`;
    const storagePath = `gallery/${crypto.randomUUID()}-${file}`;

    const { error: uploadErr } = await supabase.storage
      .from('community_gallery')
      .upload(storagePath, fileData, {
        cacheControl: '3600',
        contentType,
      });

    if (uploadErr) {
      console.error(`  UPLOAD FAILED: ${uploadErr.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from('community_gallery')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log(`  Uploaded: ${storagePath}`);
    console.log(`  URL: ${publicUrl}`);

    const { error: updateErr } = await supabase
      .from('community_gallery')
      .update({ image_url: publicUrl })
      .eq('title', title);

    if (updateErr) {
      console.error(`  DB UPDATE FAILED: ${updateErr.message}`);
    } else {
      console.log(`  DB updated for "${title}"`);
    }

    console.log('');
  }

  console.log('--- Migration complete ---');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
