
const supabaseUrl = 'https://sciqmskyyvfdbhtmdhia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXFtc2t5eXZmZGJodG1kaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTQ2NDUsImV4cCI6MjA4NzA5MDY0NX0.MDCCQXgwlu4XacuQRJ0VCzqEM8_O7cd04mwTpmrCg8o';

async function checkProjectsSchema() {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        const schema = await response.json();
        const projectsTable = schema.definitions.projects;
        if (projectsTable) {
            console.log('PROJECTS COLUMNS:', Object.keys(projectsTable.properties).join(', '));
        } else {
            console.log('Projects table NOT found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProjectsSchema();
