const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
content.split('\n').forEach(line => {
  if (line.includes('SUPABASE')) {
    const parts = line.split('=');
    console.log(parts[0], 'value length:', parts[1].trim().length, 'sample:', parts[1].trim().slice(0, 15));
  }
});
