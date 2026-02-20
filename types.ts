export enum LeadStatus {
  NEW = 'Novo',
  BRIEFING = 'Briefing',
  BUDGET = 'Orçamento',
  NEGOTIATION = 'Negociação',
  PRODUCTION = 'Produção',
  CLOSED = 'Fechado',
  ARCHIVED = 'Arquivo',
  LOST = 'Perdido'
}

export type ProjectType = 'Publicidade' | 'Institucional' | 'Evento' | 'Outro' | 'Transmissão ao Vivo';

export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

export interface Contact {
  id: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  social_whatsapp?: string;
  social_instagram?: string;
  social_linkedin?: string;
  social_facebook?: string;
  social_youtube?: string;
  links_adicionais?: SocialLink[];
  lead_id?: string;
  client_id?: string;
}

export interface Client {
  id: string;
  empresa_nome: string;
  nome_fantasia?: string;
  cnpj?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  social_site?: string;
  social_instagram?: string;
  social_linkedin?: string;
  links_adicionais?: SocialLink[];
  anotacoes?: string;
  data_cadastro: string;
}

export interface Lead {
  id: string;
  client_id?: string; // Link to Client Directory
  client?: Client; // Hydrated client data
  empresa_nome: string; // Keep for fallback/cache
  nome_fantasia: string;
  cnpj: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  social_site?: string;
  social_instagram?: string;
  social_linkedin?: string;
  links_adicionais?: SocialLink[];
  anotacoes?: string;
  tipo_projeto?: ProjectType;
  status: LeadStatus;
  valor_estimado?: number;
  historico_logs: string[];
  data_cadastro: string;
  data_retorno?: string;
  motivo_perda?: string;
  contacts: Contact[];
}

export interface Project {
  id: string;
  lead_id: string;
  client_id?: string;
  titulo: string;
  status: LeadStatus;
  valor_estimado: number;
  data_criacao: string;
  data_inicio?: string;
  data_fim?: string;
  descricao?: string;
  historico_logs: string[];
  is_arquivado?: boolean;
  contato_responsavel_id?: string;
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
  categoria: string;
  descricao: string;
  qtd: number;
  custo_unitario_real: number;
  hidden?: boolean;
}

export interface Budget {
  id: string;
  lead_id: string;
  project_id?: string;
  titulo_projeto: string;
  data_criacao: string;
  validade_dias: number;
  validade_proposta?: string;
  percentual_lucro: number;
  percentual_bv: number;
  percentual_imposto: number;
  custo_total_projeto: number;
  valor_final_venda: number;
  texto_apresentacao_ia?: string;
  objetivo_estrategico?: string;
  especificacoes_entrega?: string;
  previsao_entrega?: string;
  modo_cliente: boolean;
  etapas_processo: string[];
  forma_pagamento: string;
  avisos: string;
  valor_final_ajustado?: number;
  is_fechado?: boolean;
  is_arquivado?: boolean;
  items: BudgetItem[];
}

export interface User {
  username: string;
  role: 'admin' | 'user';
}