import fs from 'fs';

const prodEnvPath = 'scratch/.env.vercel.prod';
const localEnvPath = '.env.local';

if (!fs.existsSync(prodEnvPath)) {
  console.log('Production env file does not exist');
  process.exit(1);
}

const prodLines = fs.readFileSync(prodEnvPath, 'utf8').split('\n');
let newServiceRoleKey = null;

for (const line of prodLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    newServiceRoleKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
    break;
  }
}

if (!newServiceRoleKey) {
  console.log('SUPABASE_SERVICE_ROLE_KEY not found in Vercel production env');
  process.exit(1);
}

console.log('Found SUPABASE_SERVICE_ROLE_KEY in Vercel production env (Length:', newServiceRoleKey.length, ')');

// Check current key in .env.local
const localContent = fs.readFileSync(localEnvPath, 'utf8');
const localLines = localContent.split('\n');
let replaced = false;

const updatedLines = localLines.map(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    replaced = true;
    return `SUPABASE_SERVICE_ROLE_KEY="${newServiceRoleKey}"`;
  }
  return line;
});

if (!replaced) {
  updatedLines.push(`SUPABASE_SERVICE_ROLE_KEY="${newServiceRoleKey}"`);
}

fs.writeFileSync(localEnvPath, updatedLines.join('\n'), 'utf8');
console.log('Successfully updated .env.local with the production rotated SUPABASE_SERVICE_ROLE_KEY!');

// Clean up scratch temp env files securely
if (fs.existsSync('scratch/.env.vercel.tmp')) fs.unlinkSync('scratch/.env.vercel.tmp');
if (fs.existsSync('scratch/.env.vercel.prod')) fs.unlinkSync('scratch/.env.vercel.prod');
console.log('Cleaned up temporary Vercel env pull files.');
