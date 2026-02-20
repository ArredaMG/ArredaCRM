import { Lead, Budget, LeadStatus, CatalogItem, Project, Client } from '../types';
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

export const getCatalog = async (): Promise<CatalogItem[]> => {
  const { data, error } = await supabase
    .from('catalog')
    .select('*')
    .order('usage_count', { ascending: false });

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
          usage_count: existing.usage_count + 1,
          category: item.categoria
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

  // Create payload
  const payload: any = { ...leadData };
  if (lead.links_adicionais && lead.links_adicionais.length > 0) {
    payload.links_adicionais = lead.links_adicionais;
  }

  // 1. Upsert Lead
  const { error: leadError } = await supabase
    .from('leads')
    .upsert(payload);

  if (leadError) throw leadError;

  // 2. Manage Contacts associated with this Lead
  // (We clear and re-insert for simplicity in this MVP approach)
  const { error: deleteError } = await supabase.from('contacts').delete().eq('lead_id', lead.id);
  if (deleteError) console.warn('Error deleting old contacts:', deleteError);

  if (contacts && contacts.length > 0) {
    const { error: contactsError } = await supabase
      .from('contacts')
      .insert(contacts.map(c => ({
        ...c,
        lead_id: lead.id,
        // If we want to link contacts to the client generically too:
        client_id: lead.client_id
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