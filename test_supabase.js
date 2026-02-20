
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sciqmskyyvfdbhtmdhia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXFtc2t5eXZmZGJodG1kaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTQ2NDUsImV4cCI6MjA4NzA5MDY0NX0.MDCCQXgwlu4XacuQRJ0VCzqEM8_O7cd04mwTpmrCg8o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data, error } = await supabase.from('leads').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Data:', data);
    }
}

test();
