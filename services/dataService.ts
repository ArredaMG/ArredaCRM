import { Lead, Budget, LeadStatus, CatalogItem, Project } from '../types';
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

export const getLeads = async (): Promise<Lead[]> => {
  // We specify columns explicitly to avoid 'links_adicionais' if it doesn't exist in cache yet
  const { data, error } = await supabase
    .from('leads')
    .select('id, cnpj, empresa_nome, nome_fantasia, logradouro, bairro, cidade, uf, social_site, social_instagram, social_linkedin, anotacoes, tipo_projeto, status, valor_estimado, data_cadastro, data_retorno, motivo_perda, historico_logs, contacts(*)');

  if (error) {
    console.error('Error fetching leads (trying fallback select):', error);
    // Fallback to select(*) if explicit list fails, or handle specific error
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('leads')
      .select('*, contacts(*)');

    if (fallbackError) {
      console.error('Complete fetch failure:', fallbackError);
      return [];
    }
    return fallbackData;
  }

  return data;
};

export const saveLead = async (lead: Lead): Promise<void> => {
  const { contacts, links_adicionais, ...leadData } = lead;

  console.log('Saving lead to Supabase:', lead.id, lead.empresa_nome);

  // Create payload, only adding links_adicionais if it has actual data
  // This helps avoid "column not found" errors if the DB hasn't been updated yet
  const payload: any = { ...leadData };
  if (links_adicionais && links_adicionais.length > 0) {
    payload.links_adicionais = links_adicionais;
  }

  // 1. Upsert Lead
  const { error: leadError } = await supabase
    .from('leads')
    .upsert(payload);

  if (leadError) {
    console.error('Supabase error saving lead:', leadError);
    // If it's a schema cache error related to links_adicionais, try one last time without it
    if (leadError.message?.includes('links_adicionais') || leadError.code === '42703' || leadError.message?.includes('column')) {
      console.warn('Retrying save without links_adicionais column...');
      const { error: retryError } = await supabase.from('leads').upsert(leadData);
      if (retryError) throw retryError;
    } else {
      throw leadError;
    }
  }

  // 2. Manage Contacts
  const { error: deleteError } = await supabase.from('contacts').delete().eq('lead_id', lead.id);
  if (deleteError) {
    console.warn('Error deleting old contacts (might be new lead):', deleteError);
  }

  if (contacts && contacts.length > 0) {
    const { error: contactsError } = await supabase
      .from('contacts')
      .insert(contacts.map(c => ({ ...c, lead_id: lead.id })));
    if (contactsError) {
      console.error('Supabase error saving contacts:', contactsError);
      throw contactsError;
    }
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
  // Now initialization is handled by the Supabase schema script
  console.log('Database initialized with Supabase');
};