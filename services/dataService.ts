import { Lead, Budget, LeadStatus, CatalogItem, Project, Client, Contact } from '../types';
import { supabase } from './supabaseClient';

const LEADS_KEY = 'arreda_leads';
const BUDGETS_KEY = 'arreda_budgets';
const CATALOG_KEY = 'arreda_catalog';

const DEFAULT_BUDGET_VALUES = {
  modo_cliente: false,
  etapas_processo: [
    '1. Contrato',
    '2. Briefing',
    '3. Roteiro',
    '4. Produção',
    '5. Edição',
    '6. Apresentação',
    '7. Aprovação'
  ],
  forma_pagamento: '30% entrada / 70% após 30 dias\n\nDados Bancários:\nArreda Conteúdo\nBanco Inter (077)\nAg 0001 | CC 1234567-8',
  avisos: 'Vídeo: Até 2 rodadas de ajustes incluídas. Após isso, custo adicional por hora técnica.\n\nÁudio: Regravações por alteração de texto terão repasse de custo do locutor.',
  previsao_entrega: 'A combinar',
  percentual_lucro: 0,
  percentual_bv: 0,
  percentual_imposto: 0,
  validade_dias: 7,
  is_arquivado: false
};

// --- PROJECTS API ---

export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('data_criacao', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data;
};

export const saveProject = async (project: Project): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .upsert(project);

  if (error) throw error;
};

export const deleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- CATALOG API (Auto-Learning) ---

export const getCatalog = async (searchTerm?: string): Promise<CatalogItem[]> => {
  let query = supabase
    .from('catalog')
    .select('*')
    .order('name', { ascending: true }); // Alphabetical for dropdowns

  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching catalog:', error);
    return [];
  }
  return data.map(item => ({
    id: item.id,
    name: item.name,
    lastPrice: Number(item.last_price),
    category: item.category,
    usageCount: item.usage_count
  }));
};

export const saveCatalogItem = async (item: CatalogItem): Promise<void> => {
  const payload = {
    name: item.name,
    last_price: item.lastPrice,
    category: item.category,
    usage_count: item.usageCount || 1,
    // ID handling: if ID exists, upsert with ID, else let DB generate (but we usually just match on name or ID)
    ...(item.id ? { id: item.id } : {})
  };

  const { error } = await supabase
    .from('catalog')
    .upsert(payload, { onConflict: 'name' }); // Upsert based on name if ID missing, or allow duplicate names if ID is PK? 
  // Schema says name is unique. So if we edit name to something that exists, it might fail or merge.
  // For manual edit, we likely use ID. For auto-learning, we use Name.

  if (error) throw error;
};

export const deleteCatalogItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('catalog')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- BUDGETS API ---

export const getBudgets = async (): Promise<Budget[]> => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*, items:budget_items(*)');

  if (error) {
    console.error('Error fetching budgets:', error);
    return [];
  }

  return data.map(b => ({
    ...b,
    items: b.items.map((item: any) => ({
      ...item,
      custo_unitario_real: Number(item.custo_unitario_real)
    }))
  }));
};

export const getBudgetById = async (id: string): Promise<Budget | undefined> => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*, items:budget_items(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching budget by id:', error);
    return undefined;
  }
  return {
    ...data,
    items: data.items.map((item: any) => ({
      ...item,
      custo_unitario_real: Number(item.custo_unitario_real)
    }))
  };
};

const updateCatalogFromBudget = async (budget: Budget) => {
  for (const item of budget.items) {
    // We try to upsert.
    // However, if we upsert based on name, we need to handle the case where we don't know the ID but the name exists.
    // Postgres upsert (ON CONFLICT) works if we have a unique constraint on NAME. Schema has `name text unique`.

    // We want to INCREMENT usage_count if it exists.
    // Supabase JS upsert doesn't easily support "usage_count = usage_count + 1".
    // So read-then-write is safer for headers, OR we use a stored procedure (overkill for now).
    // Let's stick to Read-Modify-Write but optimized.

    const { data: existing } = await supabase
      .from('catalog')
      .select('*')
      .eq('name', item.descricao)
      .single();

    if (existing) {
      await supabase
        .from('catalog')
        .update({
          last_price: item.custo_unitario_real,
          usage_count: (existing.usage_count || 0) + 1,
          category: item.categoria // Update category to latest used
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('catalog')
        .insert({
          name: item.descricao,
          last_price: item.custo_unitario_real,
          category: item.categoria,
          usage_count: 1
        });
    }
  }
};

// --- LEADS API ---

// --- CLIENTS API (Directory) ---

export const getClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('empresa_nome', { ascending: true });

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
  return data;
};

export const saveClient = async (client: Client): Promise<void> => {
  // Ensure links_adicionais is a valid array (Supabase JSONB)
  const payload = {
    ...client,
    links_adicionais: client.links_adicionais || []
  };

  const { error } = await supabase
    .from('clients')
    .upsert(payload);

  if (error) throw error;
};

export const deleteClient = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- CONTACTS API ---

export const getContactsByClientId = async (clientId: string): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
  return data;
};

export const saveContact = async (contact: Contact): Promise<void> => {
  const { links_adicionais, ...contactData } = contact;
  const payload = {
    ...contactData,
    links_adicionais: links_adicionais || []
  };

  const { error } = await supabase
    .from('contacts')
    .upsert(payload);

  if (error) throw error;
};

export const deleteContact = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);
  if (error) throw error;
};


// --- LEADS API ---

export const getLeads = async (): Promise<Lead[]> => {
  // Fetch leads and join with clients if available
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      contacts(*),
      client:clients(*)
    `)
    .order('data_cadastro', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }

  // Map to ensure structure
  return data.map((lead: any) => ({
    ...lead,
    // If client data exists, prioritize it for display if needed, 
    // but we also keep the lead's own snapshot fields
    client: lead.client
  }));
};

export const saveLead = async (lead: Lead): Promise<void> => {
  const { contacts, client, ...leadData } = lead;
  let finalClientId = lead.client_id;

  // 1. Auto-create/Update Client if needed
  // If we have company name but no ID, we treat it as a new client for the directory
  if (!finalClientId && lead.empresa_nome) {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        empresa_nome: lead.empresa_nome,
        nome_fantasia: lead.nome_fantasia,
        cnpj: lead.cnpj,
        logradouro: lead.logradouro,
        bairro: lead.bairro,
        cidade: lead.cidade,
        uf: lead.uf,
        social_site: lead.social_site,
        social_instagram: lead.social_instagram,
        social_linkedin: lead.social_linkedin,
        links_adicionais: lead.links_adicionais || [],
        anotacoes: lead.anotacoes
      })
      .select()
      .single();

    if (clientError) {
      console.error('Error auto-creating client:', clientError);
      // Fallback: proceed without linking (or throw?)
      // We'll throw to be safe
      throw clientError;
    }
    finalClientId = newClient.id;
  }

  // Create payload
  const payload: any = {
    ...leadData,
    client_id: finalClientId // Ensure link
  };
  if (lead.links_adicionais && lead.links_adicionais.length > 0) {
    payload.links_adicionais = lead.links_adicionais;
  }

  // 2. Upsert Lead
  const { error: leadError } = await supabase
    .from('leads')
    .upsert(payload);

  if (leadError) throw leadError;

  // 3. Manage Contacts associated with this Lead
  const { error: deleteError } = await supabase.from('contacts').delete().eq('lead_id', lead.id);
  if (deleteError) console.warn('Error deleting old contacts:', deleteError);

  if (contacts && contacts.length > 0) {
    const { error: contactsError } = await supabase
      .from('contacts')
      .insert(contacts.map(c => ({
        ...c,
        lead_id: lead.id,
        client_id: finalClientId // Link contact to the new/existing client
      })));
    if (contactsError) throw contactsError;
  }
};

export const deleteLead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const saveBudget = async (budget: Budget): Promise<void> => {
  const { items, ...budgetData } = budget;

  // 1. Upsert Budget
  const { error: budgetError } = await supabase
    .from('budgets')
    .upsert(budgetData);

  if (budgetError) throw budgetError;

  // 2. Manage Items
  await supabase.from('budget_items').delete().eq('budget_id', budget.id);
  if (items && items.length > 0) {
    const { error: itemsError } = await supabase
      .from('budget_items')
      .insert(items.map(i => ({ ...i, budget_id: budget.id })));
    if (itemsError) throw itemsError;
  }

  // 3. Trigger Auto-Learning
  await updateCatalogFromBudget(budget);
};

export const deleteBudget = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- INITIALIZATION ---
export const initializeDB = async () => {
  // Supabase is "always on", we just verify connection implicitly
  // console.log('Database initialized with Supabase');
};