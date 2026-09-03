import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function getEnvKey(key) {
  if (process.env[key]) return process.env[key];
  if (fs.existsSync('.env.local')) {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${key}=`)) {
        return trimmed.substring(key.length + 1).replace(/^["']|["']$/g, '');
      }
    }
  }
  return null;
}

const supabaseUrl = getEnvKey('NEXT_PUBLIC_SUPABASE_URL') || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = getEnvKey('SUPABASE_SERVICE_ROLE_KEY');

if (!serviceRoleKey) {
  console.error('Missing service role key in environment or .env.local.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifySupabase() {
  console.log('====================================================');
  console.log('=== SUPABASE BACKEND VERIFICATION (READ-ONLY)    ===');
  console.log('====================================================');

  // 1. Authentication -> Users Verification
  console.log('\n[1] AUTHENTICATION -> USERS AUDIT');
  const targetEmails = [
    'dsoni1281@gmail.com',
    'newlifeofdeepsssa@gmail.com',
    'samridhtomar8@gmail.com',
    'poojagarg0885@gmail.com',
    'deepak.soni19492@gmail.com'
  ];

  const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100
  });

  if (userError) {
    console.error('Error fetching users:', userError);
  } else {
    console.log(`Total registered Auth users in project: ${userData.users.length}`);
    const verifiedAccounts = [];

    for (const email of targetEmails) {
      const u = userData.users.find(x => x.email?.toLowerCase() === email.toLowerCase());
      if (u) {
        verifiedAccounts.push({
          email: u.email,
          userId: u.id,
          confirmed: Boolean(u.email_confirmed_at),
          confirmedAt: u.email_confirmed_at,
          lastSignInAt: u.last_sign_in_at,
          createdAt: u.created_at
        });
      } else {
        verifiedAccounts.push({
          email,
          status: 'NOT_FOUND_IN_AUTH'
        });
      }
    }

    console.log('Staff Accounts in Authentication -> Users:');
    console.table(verifiedAccounts);
  }

  // 2. Storage -> smartdine-images Bucket Verification
  console.log('\n[2] STORAGE -> smartdine-images AUDIT');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('Error listing buckets:', bucketError);
  } else {
    console.log('Available Storage Buckets:');
    buckets.forEach(b => console.log(` - Bucket: "${b.name}" (public: ${b.public}, created: ${b.created_at})`));
  }

  // List files in smartdine-images
  const { data: rootFiles, error: listError } = await supabase.storage.from('smartdine-images').list('', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' }
  });

  if (listError) {
    console.error('Error listing smartdine-images:', listError);
  } else {
    console.log(`\nFiles and Folders in "smartdine-images" root (${rootFiles.length} items):`);
    rootFiles.forEach(f => {
      console.log(` - ${f.id ? '[FILE]' : '[DIR]'} ${f.name} (size: ${f.metadata?.size || 'N/A'}, type: ${f.metadata?.mimetype || 'dir'})`);
    });

    // Check subfolders if any
    for (const item of rootFiles) {
      if (!item.id) {
        // It is a directory
        const { data: subFiles } = await supabase.storage.from('smartdine-images').list(item.name, { limit: 20 });
        console.log(`   Contents of /${item.name} (${subFiles?.length || 0} items):`);
        subFiles?.slice(0, 10).forEach(sf => {
          console.log(`     * ${sf.name} (${sf.metadata?.size || 'N/A'} bytes)`);
        });
      }
    }
  }

  console.log('\n=== SUPABASE AUDIT COMPLETE (ZERO CHANGES PERFORMED) ===');
}

verifySupabase().catch(console.error);
