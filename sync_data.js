
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://sciqmskyyvfdbhtmdhia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXFtc2t5eXZmZGJodG1kaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTQ2NDUsImV4cCI6MjA4NzA5MDY0NX0.MDCCQXgwlu4XacuQRJ0VCzqEM8_O7cd04mwTpmrCg8o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
    console.log('--- Iniciando Sincronização Final via Terminal (ESM) ---');

    if (!fs.existsSync('data_to_sync.json')) {
        console.error('Erro: Arquivo data_to_sync.json não encontrado.');
        return;
    }

    const rawData = fs.readFileSync('data_to_sync.json', 'utf8');
    const data = JSON.parse(rawData);

    // 1. Leads
    if (data.leads) {
        console.log(`Sincronizando ${data.leads.length} leads...`);
        for (const lead of data.leads) {
            const { contacts, ...leadData } = lead;
            const { error: lErr } = await supabase.from('leads').upsert(leadData);
            if (lErr) console.error(`Erro no Lead ${lead.empresa_nome}:`, lErr.message);

            if (contacts && contacts.length > 0) {
                await supabase.from('contacts').delete().eq('lead_id', lead.id);
                const { error: cErr } = await supabase.from('contacts').insert(contacts.map(c => ({ ...c, lead_id: lead.id })));
                if (cErr) console.error(`Erro nos Contatos de ${lead.empresa_nome}:`, cErr.message);
            }
        }
    }

    // 2. Budgets
    if (data.budgets) {
        console.log(`Sincronizando ${data.budgets.length} orçamentos...`);
        const leadIds = new Set(data.leads?.map(l => l.id) || []);

        for (const budget of data.budgets) {
            const { items, ...budgetData } = budget;

            if (!leadIds.has(budgetData.lead_id)) {
                console.log(`Lead ${budgetData.lead_id} não encontrado. Criando placeholder...`);
                await supabase.from('leads').upsert({
                    id: budgetData.lead_id,
                    empresa_nome: `Lead de Recuperação (${budgetData.titulo_projeto})`,
                    status: 'Novo'
                });
                leadIds.add(budgetData.lead_id);
            }

            const { error: bErr } = await supabase.from('budgets').upsert(budgetData);
            if (bErr) console.error(`Erro no Orçamento ${budget.titulo_projeto}:`, bErr.message);

            if (items && items.length > 0) {
                await supabase.from('budget_items').delete().eq('budget_id', budget.id);
                const { error: iErr } = await supabase.from('budget_items').insert(items.map(i => ({ ...i, budget_id: budget.id })));
                if (iErr) console.error(`Erro nos Itens do Orçamento ${budget.titulo_projeto}:`, iErr.message);
            }
        }
    }

    // 3. Catalog
    if (data.catalog) {
        console.log(`Sincronizando ${data.catalog.length} itens do catálogo...`);
        for (const item of data.catalog) {
            const { error: catErr } = await supabase.from('catalog').upsert({
                name: item.name,
                last_price: item.lastPrice,
                category: item.category,
                usage_count: item.usageCount
            }, { onConflict: 'name' });
            if (catErr) console.error(`Erro no Item ${item.name}:`, catErr.message);
        }
    }

    console.log('--- Sincronização Finalizada! ---');
}

migrate();
