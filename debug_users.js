const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseServiceKey = '';

try {
    const envPath = path.resolve('.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceKey = line.split('=')[1].trim();
    });
} catch (err) {}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error(error);
        return;
    }
    console.log('--- USUARIOS EN AUTH ---');
    users.forEach(u => {
        console.log(`Email: [${u.email}] | Confirmed: ${!!u.email_confirmed_at} | ID: ${u.id}`);
    });

    const { data: profiles, error: pError } = await supabase.from('velia_perfiles').select('*');
    if (pError) {
        console.error(pError);
        return;
    }
    console.log('\n--- PERFILES EN velia_perfiles ---');
    profiles.forEach(p => {
        console.log(`ID: ${p.id} | Email: ${p.email} | Rol: ${p.rol}`);
    });
}

checkUsers();
