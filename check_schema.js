
const supabaseUrl = 'https://sciqmskyyvfdbhtmdhia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXFtc2t5eXZmZGJodG1kaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTQ2NDUsImV4cCI6MjA4NzA5MDY0NX0.MDCCQXgwlu4XacuQRJ0VCzqEM8_O7cd04mwTpmrCg8o';

async function checkSpecificColumns() {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        const schema = await response.json();
        const leadsTable = schema.definitions.leads;
        if (leadsTable) {
            const columns = Object.keys(leadsTable.properties);
            console.log('ALL COLUMNS:', columns.join(', '));
            console.log('HAS links_adicionais (underscore)?', columns.includes('links_adicionais'));
            console.log('HAS links adicionais (space)?', columns.includes('links adicionais'));
        } else {
            console.log('Leads table NOT found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSpecificColumns();
