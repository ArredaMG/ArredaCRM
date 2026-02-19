export enum LeadStatus {
  NEW = 'Novo',
  BRIEFING = 'Briefing',
  BUDGET = 'Orçamento',
  NEGOTIATION = 'Negociação',
  PRODUCTION = 'Produção',
  ARCHIVED = 'Arquivo'
}

export type ProjectType = 'Publicidade' | 'Institucional' | 'Evento' | 'Outro';

export interface Contact {
  id: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  social_instagram?: string;
  social_linkedin?: string;
}

export interface Lead {
  id: string;
  cnpj: string;
  empresa_nome: string;
  nome_fantasia: string;

  // Address fields
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;

  // Refactored to 1-to-Many
  contacts: Contact[];

  // Social & Info
  social_site?: string;
  social_instagram?: string;
  social_linkedin?: string;
  anotacoes?: string;
  tipo_projeto?: ProjectType;

  status: LeadStatus;
  valor_estimado?: number;
  historico_logs: string[]; // Array of log strings
  data_cadastro: string;
  data_retorno?: string;
  motivo_perda?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  lastPrice: number;
  category: string;
  usageCount: number;
}

export interface BudgetItem {
  id: string;
  categoria: string; // 'Produção', 'Equipamentos', 'Logística', 'Outros'
  descricao: string;
  qtd: number;
  custo_unitario_real: number;
  hidden?: boolean;
}

export interface Budget {
  id: string;
  lead_id: string;
  titulo_projeto: string;
  data_criacao: string;
  validade_dias: number;
  validade_proposta?: string;

  // Financials
  percentual_lucro: number; // default 20
  percentual_bv: number;    // default 10
  percentual_imposto: number; // default 10

  // Computed (stored for history, but usually recalculated)
  custo_total_projeto: number;
  valor_final_venda: number;

  texto_apresentacao_ia?: string;
  objetivo_estrategico?: string;
  especificacoes_entrega?: string;
  previsao_entrega?: string;

  // New Fields
  modo_cliente: boolean;
  etapas_processo: string[];
  forma_pagamento: string;
  avisos: string;

  // Finetuning
  valor_final_ajustado?: number;
  is_fechado?: boolean;
  is_arquivado?: boolean;

  items: BudgetItem[];
}

export interface User {
  username: string;
  role: 'admin' | 'user';
}