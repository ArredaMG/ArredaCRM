import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeads, saveLead, getBudgets, deleteLead, getProjects, saveProject, deleteProject, saveBudget } from '../services/dataService';
import { Lead, LeadStatus, Budget, ProjectType, Contact, Project, SocialLink } from '../types';
import { formatCurrency } from '../constants';
import { Plus, Loader2, Layout, List, UserPlus, Archive, Calendar, Mail, Phone, Building2, MousePointerClick, Globe, Linkedin, Instagram, StickyNote, Save, DollarSign, Tag, X, User, AlertTriangle, AlertCircle, Trash2, ExternalLink, Briefcase, Link as LinkIcon, Sparkles, Search, RotateCcw } from 'lucide-react';


const STATUS_ORDER = [
  LeadStatus.NEW,
  LeadStatus.BRIEFING,
  LeadStatus.BUDGET,
  LeadStatus.NEGOTIATION,
  LeadStatus.PRODUCTION
];

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'directory' | 'details' | 'archived' | 'new'>('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // "New Lead" Form State
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    status: LeadStatus.NEW,
    tipo_projeto: 'Outro',
    links_adicionais: []
  });
  const [initialContact, setInitialContact] = useState<Partial<Contact>>({});

  // "New Project" State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToCreate, setProjectToCreate] = useState<Partial<Project>>({});
  const [targetLeadId, setTargetLeadId] = useState<string>('');

  // "Details" View State
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [activeContactIndex, setActiveContactIndex] = useState<number>(0);

  // Drag and Drop State
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tab Specific States (moved up to avoid Hook violations)
  const [directorySearchTerm, setDirectorySearchTerm] = useState('');
  const [directoryViewMode, setDirectoryViewMode] = useState<'grid' | 'list'>('grid');
  const [pipelineViewMode, setPipelineViewMode] = useState<'kanban' | 'list'>('kanban');
  const [pipelineSearchTerm, setPipelineSearchTerm] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [leadsData, projectsData, budgetsData] = await Promise.all([
        getLeads(),
        getProjects(),
        getBudgets()
      ]);
      setLeads(leadsData || []);
      setProjects(projectsData || []);
      setBudgets(budgetsData || []);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- HELPERS (UX ENHANCEMENTS) ---

  // Determine border color based on Project Type OR Overdue Status
  const getCardStyle = (lead: Lead, isOverdue: boolean) => {
    // CRITICAL ALERT: Override everything if overdue
    if (isOverdue) {
      return {
        borderClass: 'border-l-red-500 bg-red-50',
        badgeClass: 'bg-red-200 text-red-800 border-red-300'
      };
    }

    // Standard Project Type Coloring
    switch (lead.tipo_projeto) {
      case 'Publicidade': return {
        borderClass: 'border-l-purple-500 bg-white',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200'
      };
      case 'Institucional': return {
        borderClass: 'border-l-blue-500 bg-white',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
      };
      case 'Evento': return {
        borderClass: 'border-l-orange-500 bg-white',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200'
      };
      default: return {
        borderClass: 'border-l-slate-400 bg-white',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
      };
    }
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    const dateParts = dateString.split('-');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
    return dateObj < today;
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToCreate.titulo || !targetLeadId) return;

    const newProj: Project = {
      id: generateId(),
      lead_id: targetLeadId,
      titulo: projectToCreate.titulo,
      status: LeadStatus.NEW,
      valor_estimado: projectToCreate.valor_estimado || 0,
      contato_responsavel_id: projectToCreate.contato_responsavel_id,
      data_criacao: new Date().toISOString(),
      historico_logs: [`[${new Date().toLocaleString()}] Projeto criado.`]
    };

    try {
      await saveProject(newProj);
      setIsProjectModalOpen(false);
      setProjectToCreate({});
      await refreshData();
      setActiveTab('pipeline');
    } catch (error: any) {
      console.error("Error creating opportunity:", error);
      alert(`Erro ao criar oportunidade: ${error.message || 'Verifique se a tabela "projects" existe no seu banco de dados.'}`);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja excluir permanentemente esta oportunidade?")) {
      try {
        await deleteProject(id);
        await refreshData();
      } catch (error) {
        alert("Erro ao excluir oportunidade");
      }
    }
  };

  const handleArchiveProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Deseja arquivar esta oportunidade e seus orçamentos vinculados?")) {
      try {
        // 1. Archive the project
        await saveProject({ ...project, is_arquivado: true });

        // 2. Archive linked budgets
        const projectBudgets = budgets.filter(b => b.project_id === project.id);
        for (const budget of projectBudgets) {
          await saveBudget({ ...budget, is_arquivado: true });
        }

        await refreshData();
      } catch (error) {
        console.error("Error archiving project:", error);
        alert("Erro ao arquivar oportunidade");
      }
    }
  };

  const handleRestoreProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // 1. Restore the project
      await saveProject({ ...project, is_arquivado: false });

      // 2. Restore linked budgets
      const projectBudgets = budgets.filter(b => b.project_id === project.id);
      for (const budget of projectBudgets) {
        await saveBudget({ ...budget, is_arquivado: false });
      }

      await refreshData();
      alert("Oportunidade e orçamentos restaurados!");
    } catch (error) {
      console.error("Error restoring project:", error);
      alert("Erro ao restaurar oportunidade");
    }
  };

  // --- ACTIONS ---

  useEffect(() => {
    if (selectedLeadId) {
      const found = leads.find(l => l.id === selectedLeadId);
      if (found) {
        setEditingLead({
          ...found,
          contacts: found.contacts || [],
          links_adicionais: found.links_adicionais || []
        });
        setActiveContactIndex(0);
      } else {
        setEditingLead(null);
      }
    }
  }, [selectedLeadId, leads]);

  const handleCardClick = (leadId: string) => {
    setSelectedLeadId(leadId);
    setActiveTab('details');
  };

  // Auto-select contact when opening project modal
  useEffect(() => {
    if (isProjectModalOpen && targetLeadId) {
      const targetLead = leads.find(l => l.id === targetLeadId);
      if (targetLead && targetLead.contacts && targetLead.contacts.length === 1) {
        setProjectToCreate(prev => ({ ...prev, contato_responsavel_id: targetLead.contacts[0].id }));
      }
    }
  }, [isProjectModalOpen, targetLeadId, leads]);

  // DRAG AND DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggingProjectId(projectId);
    e.dataTransfer.setData('projectId', projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');

    const project = projects.find(p => p.id === projectId);
    if (!project || project.status === newStatus) return;

    const logEntry = `[${new Date().toLocaleString()}] Moveu de "${project.status}" para "${newStatus}"`;

    const updatedProject: Project = {
      ...project,
      status: newStatus,
      historico_logs: [...(project.historico_logs || []), logEntry]
    };

    try {
      await saveProject(updatedProject);
      await refreshData();
    } catch (error) {
      alert("Erro ao atualizar status do projeto");
    }
    setDraggingProjectId(null);
  };

  const handleArchive = async (lead: Lead) => {
    if (confirm('Deseja arquivar este cliente, todas as suas oportunidades e orçamentos?')) {
      try {
        const logEntry = `[${new Date().toLocaleString()}] Cliente arquivado com todo seu histórico.`;

        // 1. Archive Lead
        const updatedLead: Lead = {
          ...lead,
          status: LeadStatus.ARCHIVED,
          historico_logs: [...(lead.historico_logs || []), logEntry]
        };
        await saveLead(updatedLead);

        // 2. Archive Projects
        const leadProjects = projects.filter(p => p.lead_id === lead.id);
        for (const project of leadProjects) {
          await saveProject({ ...project, is_arquivado: true });
        }

        // 3. Archive Budgets
        const leadBudgets = budgets.filter(b => b.lead_id === lead.id);
        for (const budget of leadBudgets) {
          await saveBudget({ ...budget, is_arquivado: true });
        }

        await refreshData();
      } catch (error) {
        console.error("Error archiving lead:", error);
        alert("Erro ao arquivar cliente");
      }
    }
  };

  const handleRestoreLead = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const logEntry = `[${new Date().toLocaleString()}] Cliente restaurado do arquivo.`;

      // 1. Restore Lead
      const updatedLead: Lead = {
        ...lead,
        status: LeadStatus.NEW,
        historico_logs: [...(lead.historico_logs || []), logEntry]
      };
      await saveLead(updatedLead);

      // 2. Restore Projects
      const leadProjects = projects.filter(p => p.lead_id === lead.id);
      for (const project of leadProjects) {
        await saveProject({ ...project, is_arquivado: false });
      }

      // 3. Restore Budgets
      const leadBudgets = budgets.filter(b => b.lead_id === lead.id);
      for (const budget of leadBudgets) {
        await saveBudget({ ...budget, is_arquivado: false });
      }

      await refreshData();
      alert("Cliente e todo seu histórico restaurados com sucesso!");
    } catch (error) {
      console.error("Error restoring lead:", error);
      alert("Erro ao restaurar lead");
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir permanentemente?')) {
      await deleteLead(id);
      await refreshData();
      if (selectedLeadId === id) {
        setSelectedLeadId('');
        setEditingLead(null);
      }
    }
  };

  const handleLeadContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest('[data-action="delete-lead"]');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = deleteBtn.getAttribute('data-id');
      if (id) handleDeleteLead(id);
      return;
    }

    const card = target.closest('[data-action="view-lead"]');
    if (card) {
      const id = card.getAttribute('data-id');
      if (id) handleCardClick(id);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    try {
      await saveLead(editingLead);
      await refreshData();
      alert('Dados atualizados com sucesso!');
    } catch (error) {
      alert("Erro ao salvar alterações");
    }
  };

  const handleAddContact = () => {
    if (!editingLead) return;
    const newContact: Contact = {
      id: generateId(),
      nome: 'Novo Contato',
      cargo: '',
      email: '',
      telefone: ''
    };
    setEditingLead({
      ...editingLead,
      contacts: [...editingLead.contacts, newContact]
    });
    setActiveContactIndex(editingLead.contacts.length); // Switch to new tab
  };

  const handleRemoveContact = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent tab switching when clicking delete

    if (!editingLead) return;

    // Exact text requested by user
    if (window.confirm('Tem certeza que deseja excluir permanentemente?')) {
      const newContacts = editingLead.contacts.filter((_, i) => i !== index);
      setEditingLead({
        ...editingLead,
        contacts: newContacts
      });
      // Adjust active index if we deleted the current one or one before it
      if (activeContactIndex >= newContacts.length) {
        setActiveContactIndex(Math.max(0, newContacts.length - 1));
      } else if (index < activeContactIndex) {
        setActiveContactIndex(activeContactIndex - 1);
      }
    }
  };

  const handleContactContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest('[data-action="remove-contact"]');
    if (deleteBtn) {
      const index = Number(deleteBtn.getAttribute('data-index'));
      handleRemoveContact(e, index);
      return;
    }

    const tab = target.closest('[data-action="switch-contact"]');
    if (tab) {
      const index = Number(tab.getAttribute('data-index'));
      setActiveContactIndex(index);
    }
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    if (!editingLead) return;
    const newContacts = [...editingLead.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setEditingLead({ ...editingLead, contacts: newContacts });
  };

  const addSocialLink = (isNewForm: boolean) => {
    const newLink: SocialLink = { id: generateId(), label: 'Outro', url: '' };
    if (isNewForm) {
      setNewLead({
        ...newLead,
        links_adicionais: [...(newLead.links_adicionais || []), newLink]
      });
    } else if (editingLead) {
      setEditingLead({
        ...editingLead,
        links_adicionais: [...(editingLead.links_adicionais || []), newLink]
      });
    }
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string, isNewForm: boolean) => {
    if (isNewForm) {
      const newLinks = [...(newLead.links_adicionais || [])];
      newLinks[index] = { ...newLinks[index], [field]: value };
      setNewLead({ ...newLead, links_adicionais: newLinks });
    } else if (editingLead) {
      const newLinks = [...(editingLead.links_adicionais || [])];
      newLinks[index] = { ...newLinks[index], [field]: value };
      setEditingLead({ ...editingLead, links_adicionais: newLinks });
    }
  };

  const removeSocialLink = (index: number, isNewForm: boolean) => {
    if (isNewForm) {
      const newLinks = (newLead.links_adicionais || []).filter((_, i) => i !== index);
      setNewLead({ ...newLead, links_adicionais: newLinks });
    } else if (editingLead) {
      const newLinks = (editingLead.links_adicionais || []).filter((_, i) => i !== index);
      setEditingLead({ ...editingLead, links_adicionais: newLinks });
    }
  };

  // --- FORM HANDLERS ---

  const handleCNPJBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cnpj = e.target.value.replace(/\D/g, '');
    if (cnpj.length !== 14) return;

    setIsLoadingCNPJ(true);
    let success = false;

    const mapData = (data: any, source: string) => {
      let mapped: any = {};
      if (source === 'cnpjws') {
        mapped = {
          empresa_nome: data.razao_social,
          nome_fantasia: data.estabelecimento?.nome_fantasia || data.razao_social,
          logradouro: `${data.estabelecimento?.tipo_logradouro || ''} ${data.estabelecimento?.logradouro || ''}, ${data.estabelecimento?.numero || ''}`.trim(),
          bairro: data.estabelecimento?.bairro,
          cidade: data.estabelecimento?.cidade?.nome,
          uf: data.estabelecimento?.estado?.sigla,
          email: data.estabelecimento?.email,
          telefone: data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1 ? `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}` : ''
        };
      } else {
        // Minha Receita and BrasilAPI have similar structures
        mapped = {
          empresa_nome: data.razao_social,
          nome_fantasia: data.nome_fantasia || data.razao_social,
          logradouro: `${data.logradouro || ''}, ${data.numero || ''}`.trim(),
          bairro: data.bairro,
          cidade: data.municipio,
          uf: data.uf,
          email: data.email,
          telefone: data.ddd_telefone_1 || data.telefone
        };
      }

      setNewLead(prev => ({
        ...prev,
        empresa_nome: mapped.empresa_nome,
        nome_fantasia: mapped.nome_fantasia,
        logradouro: mapped.logradouro,
        bairro: mapped.bairro,
        cidade: mapped.cidade,
        uf: mapped.uf
      }));

      setInitialContact(prev => ({
        ...prev,
        email: mapped.email || prev.email || '',
        telefone: mapped.telefone || prev.telefone || ''
      }));
    };

    // Tentativa 1: Minha Receita
    try {
      const response = await fetch(`https://minhareceita.org/${cnpj}`);
      if (response.ok) {
        const data = await response.json();
        mapData(data, 'minhareceita');
        success = true;
      }
    } catch (error) {
      console.error("Erro Minha Receita:", error);
    }

    // Tentativa 2: Receita WS / CNPJ.ws
    if (!success) {
      try {
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`);
        if (response.ok) {
          const data = await response.json();
          mapData(data, 'cnpjws');
          success = true;
        }
      } catch (error) {
        console.error("Erro CNPJ.ws:", error);
      }
    }

    // Tentativa 3: BrasilAPI
    if (!success) {
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (response.ok) {
          const data = await response.json();
          mapData(data, 'brasilapi');
          success = true;
        }
      } catch (error) {
        console.error("Erro BrasilAPI:", error);
      }
    }

    if (!success) {
      alert('Não foi possível buscar os dados automaticamente. Por favor, preencha manualmente.');
    }

    setIsLoadingCNPJ(false);
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.empresa_nome) {
      alert("Nome da empresa é obrigatório");
      return;
    }

    const leadToSave: Lead = {
      id: generateId(),
      cnpj: newLead.cnpj || '',
      empresa_nome: newLead.empresa_nome,
      nome_fantasia: newLead.nome_fantasia || '',
      logradouro: newLead.logradouro || '',
      bairro: newLead.bairro || '',
      cidade: newLead.cidade || '',
      uf: newLead.uf || '',
      contacts: [{
        id: generateId(),
        nome: initialContact.nome || 'Principal',
        cargo: initialContact.cargo || '',
        email: initialContact.email || '',
        telefone: initialContact.telefone || ''
      }],
      social_site: newLead.social_site,
      social_instagram: newLead.social_instagram,
      social_linkedin: newLead.social_linkedin,
      links_adicionais: newLead.links_adicionais || [],
      anotacoes: newLead.anotacoes,
      tipo_projeto: newLead.tipo_projeto,
      status: LeadStatus.NEW,
      valor_estimado: newLead.valor_estimado || 0,
      data_cadastro: new Date().toISOString().split('T')[0],
      data_retorno: newLead.data_retorno,
      historico_logs: [`[${new Date().toLocaleString()}] Lead criado no sistema.`],
    };

    try {
      await saveLead(leadToSave);
      setNewLead({ status: LeadStatus.NEW, tipo_projeto: 'Outro', links_adicionais: [] });
      setInitialContact({});
      await refreshData();
      setSelectedLeadId(leadToSave.id);
      setActiveTab('details');
    } catch (error: any) {
      console.error("Error creating lead:", error);
      alert(`Erro ao criar lead: ${error.message || 'Verifique o console'}`);
    }
  };

  const renderProjectModal = () => {
    if (!isProjectModalOpen) return null;
    const targetLead = leads.find(l => l.id === targetLeadId);

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="bg-red-600 p-6 text-white text-center">
            <h3 className="text-xl font-bold flex items-center justify-center gap-2">
              <Sparkles size={24} /> Nova Oportunidade
            </h3>
            <p className="text-red-100 text-sm mt-1">{targetLead?.empresa_nome}</p>
          </div>

          <form onSubmit={handleCreateProject} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título da Prospecção / Briefing</label>
              <input
                type="text"
                required
                placeholder="Ex: Campanha Verão 2024"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all mb-4"
                value={projectToCreate.titulo || ''}
                onChange={e => setProjectToCreate({ ...projectToCreate, titulo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Estimado (R$)</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all mb-4 font-mono font-bold text-slate-700"
                placeholder="R$ 0,00"
                value={
                  (projectToCreate.valor_estimado !== undefined)
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectToCreate.valor_estimado)
                    : ''
                }
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  const floatValue = Number(rawValue) / 100;
                  setProjectToCreate({ ...projectToCreate, valor_estimado: floatValue });
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável pelo Projeto</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <select
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none"
                  value={projectToCreate.contato_responsavel_id || ''}
                  onChange={e => setProjectToCreate({ ...projectToCreate, contato_responsavel_id: e.target.value })}
                >
                  <option value="">Selecione quem responderá por este job...</option>
                  {targetLead?.contacts?.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.nome} {contact.cargo ? `(${contact.cargo})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all active:scale-95"
              >
                Criar Oportunidade
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // --- RENDERERS ---

  const renderTabs = () => (
    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-fit mb-6">
      <button
        onClick={() => setActiveTab('pipeline')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'pipeline' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Layout size={18} /> Pipeline de Prospecção
      </button>
      <button
        onClick={() => setActiveTab('directory')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'directory' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Briefcase size={18} /> Clientes/Contatos
      </button>
      <button
        onClick={() => setActiveTab('archived')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'archived' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Archive size={18} /> Arquivados
      </button>
      <button
        onClick={() => setActiveTab('new')}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 text-white shadow-md hover:bg-red-700 transition-all ml-12"
      >
        <Plus size={18} /> Novo Cliente
      </button>
    </div>
  );

  const renderKanban = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por cliente ou título..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
              value={pipelineSearchTerm}
              onChange={e => setPipelineSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setPipelineViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pipelineViewMode === 'kanban' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layout size={14} /> Kanban
            </button>
            <button
              onClick={() => setPipelineViewMode('list')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pipelineViewMode === 'list' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List size={14} /> Lista
            </button>
          </div>
        </div>

        {pipelineViewMode === 'kanban' ? (
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {STATUS_ORDER.map(status => {
              // Projects in this column
              const columnProjects = projects.filter(p => !p.is_arquivado && p.status === status && (
                p.titulo.toLowerCase().includes(pipelineSearchTerm.toLowerCase()) ||
                leads.find(l => l.id === p.lead_id)?.empresa_nome.toLowerCase().includes(pipelineSearchTerm.toLowerCase())
              ));

              // Budgets without project_id for the "Orçamento" column
              const unlinkedBudgets = status === LeadStatus.BUDGET ? budgets.filter(b => !b.is_arquivado && !b.project_id && (
                b.titulo_projeto.toLowerCase().includes(pipelineSearchTerm.toLowerCase()) ||
                leads.find(l => l.id === b.lead_id)?.empresa_nome.toLowerCase().includes(pipelineSearchTerm.toLowerCase())
              )) : [];

              return (
                <div
                  key={status}
                  className="flex flex-col gap-4 min-w-[320px] w-[320px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, status as LeadStatus)}
                >
                  <div className="flex items-center justify-between px-2 bg-slate-50/50 py-2 rounded-lg border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status === LeadStatus.NEW ? 'bg-blue-500' : status === LeadStatus.BRIEFING ? 'bg-orange-500' : status === LeadStatus.BUDGET ? 'bg-amber-500' : status === LeadStatus.PRODUCTION ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {status}
                      <span className="ml-1 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
                        {columnProjects.length + unlinkedBudgets.length}
                      </span>
                    </h3>
                  </div>

                  <div className={`flex-1 flex flex-col gap-3 p-3 rounded-2xl border-2 border-dashed transition-colors ${draggingProjectId ? 'bg-slate-50 border-slate-200' : 'bg-transparent border-transparent'}`}>
                    {columnProjects.map(project => {
                      const lead = leads.find(l => l.id === project.lead_id) || ({} as Lead);
                      const isOver = isOverdue(lead.data_retorno);
                      const styles = getCardStyle(lead, isOver);

                      return (
                        <div
                          key={project.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, project.id)}
                          onDragEnd={() => setDraggingProjectId(null)}
                          onClick={() => { setSelectedLeadId(lead.id); setActiveTab('details'); }}
                          className={`group p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-red-200 transition-all cursor-pointer border-l-4 ${styles.borderClass} relative`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">
                              {lead.tipo_projeto || 'Outro'}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => handleArchiveProject(project, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Arquivar Oportunidade"
                              >
                                <Archive size={14} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteProject(project.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir Oportunidade"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{project.titulo}</h4>
                          <p className="text-xs text-slate-500 mt-1">{lead.empresa_nome}</p>

                          {project.contato_responsavel_id && lead.contacts?.find(c => c.id === project.contato_responsavel_id) && (
                            <div className="flex items-center gap-1.5 mt-2 py-1 px-2 bg-slate-50 rounded-md border border-slate-100 w-fit">
                              <User size={10} className="text-slate-400" />
                              <span className="text-[10px] text-slate-600 font-medium">
                                {lead.contacts.find(c => c.id === project.contato_responsavel_id)?.nome}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                            <span className="text-xs font-bold text-red-600">
                              {formatCurrency(project.valor_estimado)}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                              <Calendar size={10} />
                              {new Date(project.data_criacao).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {unlinkedBudgets.map(budget => {
                      const lead = leads.find(l => l.id === budget.lead_id) || ({} as Lead);
                      return (
                        <div
                          key={budget.id}
                          onClick={() => { setSelectedLeadId(lead.id); setActiveTab('details'); }}
                          className="p-4 bg-amber-50/30 border border-amber-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 border-l-amber-500"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase">
                              Orçamento Avulso
                            </span>
                            <Sparkles className="text-amber-400" size={14} />
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{budget.titulo_projeto}</h4>
                          <p className="text-xs text-slate-500 mt-1">{lead.empresa_nome}</p>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-100">
                            <span className="text-xs font-bold text-amber-700">
                              {formatCurrency(budget.valor_final_ajustado || budget.valor_final_venda)}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                              <Calendar size={10} />
                              {new Date(budget.data_criacao).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {columnProjects.length === 0 && unlinkedBudgets.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-10">
                        <Archive size={24} strokeWidth={1} />
                        <span className="text-[10px] uppercase font-bold mt-2">Vazio</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          renderPipelineList()
        )}
      </div>
    );
  };

  const renderPipelineList = () => {
    const filteredProjects = projects.filter(p => !p.is_arquivado && (
      p.titulo.toLowerCase().includes(pipelineSearchTerm.toLowerCase()) ||
      leads.find(l => l.id === p.lead_id)?.empresa_nome.toLowerCase().includes(pipelineSearchTerm.toLowerCase())
    ));

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Oportunidade</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(project => {
              const lead = leads.find(l => l.id === project.lead_id);
              return (
                <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{project.titulo}</div>
                    {project.contato_responsavel_id && lead?.contacts?.find(c => c.id === project.contato_responsavel_id) && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <User size={10} />
                        {lead.contacts.find(c => c.id === project.contato_responsavel_id)?.nome}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{lead?.empresa_nome || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${project.status === 'Novo' ? 'bg-blue-100 text-blue-700' :
                      project.status === 'Pendente' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(project.data_criacao).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">
                    {formatCurrency(project.valor_estimado)}
                  </td>
                </tr>
              );
            })}
            {filteredProjects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                  <Archive className="mx-auto mb-2 opacity-20" size={40} />
                  Nenhuma oportunidade encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };
  const renderDirectory = () => {
    const filteredLeads = leads.filter(l =>
      l.status !== LeadStatus.ARCHIVED && (
        (l.empresa_nome || '').toLowerCase().includes(directorySearchTerm.toLowerCase()) ||
        (l.nome_fantasia || '').toLowerCase().includes(directorySearchTerm.toLowerCase())
      )
    );

    return (
      <div className="space-y-6" onClick={handleLeadContainerClick}>
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar cliente ou contato..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm"
              value={directorySearchTerm}
              onChange={(e) => setDirectorySearchTerm(e.target.value)}
            />
            <Building2 className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setDirectoryViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${directoryViewMode === 'grid' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layout size={14} /> Grid
            </button>
            <button
              onClick={() => setDirectoryViewMode('list')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${directoryViewMode === 'list' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List size={14} /> Lista
            </button>
          </div>
        </div>

        {directoryViewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map(lead => (
              <div
                key={lead.id}
                data-action="view-lead"
                data-id={lead.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-red-50 p-2 rounded-lg">
                    <Building2 className="text-red-600" size={24} />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetLeadId(lead.id);
                      setIsProjectModalOpen(true);
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-100"
                  >
                    + Nova Oportunidade
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{lead.empresa_nome}</h3>
                <p className="text-sm text-slate-500 mb-4">{lead.nome_fantasia}</p>

                <div className="space-y-2 mb-6">
                  {lead.contacts?.[0] && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <User size={14} />
                      <span>{lead.contacts[0].nome}</span>
                    </div>
                  )}
                  {lead.contacts?.[0]?.telefone && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={14} />
                      <span>{lead.contacts[0].telefone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    className="flex-1 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 py-2 rounded-lg transition-colors pointer-events-none"
                  >
                    Ver Ficha Técnica
                  </button>
                  {lead.social_site && (
                    <a
                      href={lead.social_site}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Globe size={16} />
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleArchive(lead); }}
                    className="p-2 bg-slate-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                    title="Arquivar Cliente"
                  >
                    <Archive size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          renderDirectoryList(filteredLeads)
        )}
      </div>
    );
  };

  const renderDirectoryList = (filteredLeads: Lead[]) => {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Empresa</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Contato Principal</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Localização</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => (
              <tr
                key={lead.id}
                data-action="view-lead"
                data-id={lead.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{lead.empresa_nome}</div>
                  <div className="text-[10px] text-slate-400">{lead.cnpj}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600">{lead.contacts?.[0]?.nome || '-'}</div>
                  <div className="text-xs text-slate-400">{lead.contacts?.[0]?.telefone || '-'}</div>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs text-balance">
                  {lead.cidade ? `${lead.cidade} - ${lead.uf}` : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors pointer-events-none"
                    >
                      Ficha Técnica
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setTargetLeadId(lead.id); setIsProjectModalOpen(true); }}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      + Nova Op.
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleArchive(lead); }}
                      className="p-1.5 bg-slate-100 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                      title="Arquivar"
                    >
                      <Archive size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-slate-400 text-sm">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDetails = () => {
    const linkedBudgets = editingLead ? budgets.filter(b => b.lead_id === editingLead.id) : [];

    return (
      <div className="space-y-6">
        {/* Selector */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <Building2 className="text-slate-400" />
          <select
            className="w-full bg-transparent outline-none text-slate-800 font-semibold"
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
          >
            <option value="">Selecione um Cliente para ver a Ficha Técnica...</option>
            {leads.map(l => (
              <option key={l.id} value={l.id}>{l.empresa_nome}</option>
            ))}
          </select>
        </div>

        {editingLead && (
          <form onSubmit={handleUpdateLead}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Info & Contacts */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg
                     ${editingLead.status === LeadStatus.PRODUCTION ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}
                  `}>
                    {editingLead.status}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">{editingLead.empresa_nome}</h2>
                  <p className="text-slate-500 text-sm mb-4">{editingLead.cnpj}</p>

                  <div className="space-y-4">
                    {/* Endereço */}
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block">Logradouro</label>
                        <input
                          className="w-full text-sm bg-transparent border-b border-slate-200 py-1 outline-none focus:border-red-500"
                          value={editingLead.logradouro || ''}
                          onChange={e => setEditingLead({ ...editingLead, logradouro: e.target.value })}
                          placeholder="Rua, Número, Complemento"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block">Bairro</label>
                          <input
                            className="w-full text-sm bg-transparent border-b border-slate-200 py-1 outline-none focus:border-red-500"
                            value={editingLead.bairro || ''}
                            onChange={e => setEditingLead({ ...editingLead, bairro: e.target.value })}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block">Cidade</label>
                          <input
                            className="w-full text-sm bg-transparent border-b border-slate-200 py-1 outline-none focus:border-red-500"
                            value={editingLead.cidade || ''}
                            onChange={e => setEditingLead({ ...editingLead, cidade: e.target.value })}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block">UF</label>
                          <input
                            className="w-full text-sm bg-transparent border-b border-slate-200 py-1 outline-none focus:border-red-500"
                            value={editingLead.uf || ''}
                            onChange={e => setEditingLead({ ...editingLead, uf: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Classificação */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo de Projeto</label>
                        <select
                          className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-red-500"
                          value={editingLead.tipo_projeto || 'Outro'}
                          onChange={e => setEditingLead({ ...editingLead, tipo_projeto: e.target.value as ProjectType })}
                        >
                          <option value="Publicidade">Publicidade</option>
                          <option value="Institucional">Institucional</option>
                          <option value="Evento">Evento</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                    </div>

                    {/* CONTACTS HUB (1-to-Many) */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UserPlus size={16} className="text-red-600" />
                          <span className="font-bold text-sm text-slate-800">Contatos</span>
                        </div>
                        <button type="button" onClick={handleAddContact} className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-600 hover:text-red-600 hover:border-red-300 transition-colors">
                          + Adicionar
                        </button>
                      </div>

                      {/* Contact Tabs */}
                      <div
                        onClick={handleContactContainerClick}
                        className="flex gap-1 overflow-x-auto pb-2 border-b border-slate-200 mb-3 custom-scrollbar"
                      >
                        {editingLead.contacts.map((contact, idx) => (
                          <div
                            key={contact.id}
                            data-action="switch-contact"
                            data-index={idx}
                            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-t-lg font-medium whitespace-nowrap transition-colors cursor-pointer group
                                    ${idx === activeContactIndex
                                ? 'bg-white text-red-700 border-t border-x border-slate-200 relative -mb-[9px] z-10 shadow-sm'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-transparent'}
                                `}
                          >
                            <span>{contact.nome.split(' ')[0] || `Contato ${idx + 1}`}</span>
                            {/* Delete Tab Button */}
                            <button
                              type="button"
                              data-action="remove-contact"
                              data-index={idx}
                              className={`ml-1 p-0.5 rounded-full hover:bg-red-100 text-red-500 transition-colors ${idx === activeContactIndex ? 'text-red-300 hover:text-red-500' : 'text-red-400 opacity-0 group-hover:opacity-100'}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Active Contact Form */}
                      {editingLead.contacts.length > 0 && activeContactIndex < editingLead.contacts.length && (
                        <div className="space-y-2 bg-white p-2 rounded-b-lg rounded-tr-lg border border-slate-200 pt-4">
                          <div className="flex gap-2">
                            <input
                              className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-amber-400"
                              value={editingLead.contacts[activeContactIndex].nome}
                              onChange={e => updateContact(activeContactIndex, 'nome', e.target.value)}
                              placeholder="Nome Completo"
                            />
                          </div>
                          <input
                            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-amber-400"
                            value={editingLead.contacts[activeContactIndex].cargo}
                            onChange={e => updateContact(activeContactIndex, 'cargo', e.target.value)}
                            placeholder="Cargo"
                          />
                          <div className="flex items-center gap-2 text-xs">
                            <Mail size={14} className="text-slate-400" />
                            <input
                              className="w-full bg-transparent border-b border-slate-200 focus:border-amber-400 outline-none py-1"
                              value={editingLead.contacts[activeContactIndex].email}
                              onChange={e => updateContact(activeContactIndex, 'email', e.target.value)}
                              placeholder="Email"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Phone size={14} className="text-slate-400" />
                            <input
                              className="w-full bg-transparent border-b border-slate-200 focus:border-red-500 outline-none py-1"
                              value={editingLead.contacts[activeContactIndex].telefone}
                              onChange={e => updateContact(activeContactIndex, 'telefone', e.target.value)}
                              placeholder="Telefone"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Instagram size={14} className="text-slate-400" />
                            <div className="flex-1 flex gap-2 items-center">
                              <input
                                className="w-full bg-transparent border-b border-slate-200 focus:border-red-500 outline-none py-1"
                                value={editingLead.contacts[activeContactIndex].social_instagram || ''}
                                onChange={e => updateContact(activeContactIndex, 'social_instagram', e.target.value)}
                                placeholder="Instagram"
                              />
                              {editingLead.contacts[activeContactIndex].social_instagram && (
                                <a
                                  href={`https://instagram.com/${editingLead.contacts[activeContactIndex].social_instagram.replace('@', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-600 hover:scale-110 transition-transform"
                                >
                                  <Instagram size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Linkedin size={14} className="text-slate-400" />
                            <div className="flex-1 flex gap-2 items-center">
                              <input
                                className="w-full bg-transparent border-b border-slate-200 focus:border-red-500 outline-none py-1"
                                value={editingLead.contacts[activeContactIndex].social_linkedin || ''}
                                onChange={e => updateContact(activeContactIndex, 'social_linkedin', e.target.value)}
                                placeholder="LinkedIn"
                              />
                              {editingLead.contacts[activeContactIndex].social_linkedin && (
                                <a
                                  href={editingLead.contacts[activeContactIndex].social_linkedin.startsWith('http') ? editingLead.contacts[activeContactIndex].social_linkedin : `https://linkedin.com/in/${editingLead.contacts[activeContactIndex].social_linkedin}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:scale-110 transition-transform"
                                >
                                  <Linkedin size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Company Web Section */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-red-600">Presença Digital da Empresa</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Globe size={16} className="text-slate-400" />
                          <input
                            className="w-full bg-transparent border-b border-slate-200 focus:border-red-500 outline-none py-1"
                            placeholder="Site Oficial"
                            value={editingLead.social_site || ''}
                            onChange={e => setEditingLead({ ...editingLead, social_site: e.target.value })}
                          />
                        </div>

                        {/* Dynamic Additional Links */}
                        {editingLead.links_adicionais?.map((link, idx) => (
                          <div key={link.id} className="flex items-center gap-2 group">
                            <LinkIcon size={16} className="text-slate-400" />
                            <input
                              className="w-24 text-xs font-bold bg-slate-50 border-none rounded px-1 py-0.5 outline-none focus:bg-white"
                              value={link.label}
                              onChange={e => updateSocialLink(idx, 'label', e.target.value, false)}
                            />
                            <input
                              className="flex-1 bg-transparent border-b border-slate-200 focus:border-red-500 outline-none py-1"
                              placeholder="https://..."
                              value={link.url}
                              onChange={e => updateSocialLink(idx, 'url', e.target.value, false)}
                            />
                            <button
                              type="button"
                              onClick={() => removeSocialLink(idx, false)}
                              className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addSocialLink(false)}
                          className="text-[10px] font-bold text-red-600 hover:text-red-700 mt-2 flex items-center gap-1"
                        >
                          <Plus size={12} /> Adicionar outro link (Portfólio, Drive, etc)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteLead(editingLead.id)}
                      className="flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                      title="Excluir Lead permanentemente"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(editingLead)}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Archive size={16} /> Arquivar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors text-sm font-bold shadow-md shadow-red-600/20"
                    >
                      <Save size={16} /> Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>

              {/* Middle Column: Notes & History */}
              <div className="lg:col-span-1 space-y-6">

                {/* Quick Notes */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><StickyNote size={18} /> Anotações Rápidas</h3>
                  <textarea
                    className="w-full h-32 p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 text-slate-700 placeholder:text-slate-400"
                    placeholder="Escreva anotações importantes sobre o cliente aqui..."
                    value={editingLead.anotacoes || ''}
                    onChange={e => setEditingLead({ ...editingLead, anotacoes: e.target.value })}
                  />
                </div>

                {/* History */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[320px] flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><List size={18} /> Histórico</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {[...(editingLead.historico_logs || [])].reverse().map((log, idx) => (
                      <div key={idx} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-700">
                        {log}
                      </div>
                    ))}
                    {(!editingLead.historico_logs || editingLead.historico_logs.length === 0) && (
                      <p className="text-slate-400 text-sm italic">Nenhum histórico registrado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Budgets */}
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full max-h-[600px] flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Layout size={18} /> Orçamentos Vinculados</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {linkedBudgets.map(b => (
                      <div
                        key={b.id}
                        onClick={() => navigate(`/budgets?edit=${b.id}`)}
                        className="p-3 border border-slate-200 rounded-lg hover:border-red-400 hover:bg-white transition-all cursor-pointer bg-slate-50 group"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-800 text-sm group-hover:text-red-600 transition-colors">{b.titulo_projeto}</p>
                          <ExternalLink size={14} className="text-slate-300 group-hover:text-red-400" />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-slate-500">{new Date(b.data_criacao).toLocaleDateString()}</span>
                          <span className="text-sm font-bold text-red-600">{formatCurrency(b.valor_final_ajustado || b.valor_final_venda)}</span>
                        </div>
                      </div>
                    ))}
                    {linkedBudgets.length === 0 && (
                      <p className="text-slate-400 text-sm italic">Nenhum orçamento criado para este lead.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    );
  };

  const renderArchived = () => {
    const archivedLeads = leads.filter(l => l.status === LeadStatus.ARCHIVED);
    const archivedProjects = projects.filter(p => p.is_arquivado === true);

    return (
      <div className="space-y-10" onClick={handleLeadContainerClick}>
        {/* LEADS SECTION */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <User size={20} className="text-slate-500" /> Clientes Arquivados
            </h2>
            <span className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">{archivedLeads.length} itens</span>
          </div>

          {archivedLeads.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">Nenhum cliente arquivado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedLeads.map(lead => {
                const styles = getCardStyle(lead, false);
                return (
                  <div
                    key={lead.id}
                    data-action="view-lead"
                    data-id={lead.id}
                    className={`relative p-5 rounded-xl shadow-md transition-all cursor-pointer group border border-slate-200 border-l-8 hover:shadow-xl hover:-translate-y-1 bg-white ${styles.borderClass}`}
                  >
                    <div className="flex justify-between items-start mb-4 pr-10">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide border ${styles.badgeClass}`}>
                        {lead.tipo_projeto || 'Outro'}
                      </span>
                      <button
                        data-action="delete-lead"
                        data-id={lead.id}
                        className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-100 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <h4 className="font-bold text-slate-800 text-lg leading-tight mb-2">{lead.empresa_nome}</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                      <Mail size={14} /> {lead.contacts?.[0]?.email || 'N/A'}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-400">Desde {new Date(lead.data_cadastro).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => handleRestoreLead(lead, e)}
                        className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Trazer de Volta
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PROJECTS SECTION */}
        <section>
          <div className="flex justify-between items-center mb-6 pt-6 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Briefcase size={20} className="text-slate-500" /> Oportunidades Arquivadas
            </h2>
            <span className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">{archivedProjects.length} itens</span>
          </div>

          {archivedProjects.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">Nenhum projeto arquivado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedProjects.map(project => {
                const lead = leads.find(l => l.id === project.lead_id);
                return (
                  <div
                    key={project.id}
                    className="p-5 bg-white border border-slate-200 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => { if (lead) { setSelectedLeadId(lead.id); setActiveTab('details'); } }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">
                        {lead?.tipo_projeto || 'Outro'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id, e); }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <h4 className="font-bold text-slate-800 text-lg leading-tight mb-1">{project.titulo}</h4>
                    <p className="text-sm text-slate-500 mb-4">{lead?.empresa_nome || 'Cliente não encontrado'}</p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <span className="text-sm font-bold text-red-600">{formatCurrency(project.valor_estimado)}</span>
                      <button
                        onClick={(e) => handleRestoreProject(project, e)}
                        className="text-xs font-bold text-amber-600 hover:text-white hover:bg-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 transition-all flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Restaurar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderNewForm = () => (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Novo Cadastro de Lead</h2>
      <form onSubmit={handleSubmitNew} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">CNPJ (Busca Automática)</label>
            <div className="relative">
              <input
                type="text"
                value={newLead.cnpj || ''}
                onChange={e => setNewLead({ ...newLead, cnpj: e.target.value })}
                onBlur={handleCNPJBlur}
                className={`w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm transition-all ${isLoadingCNPJ ? 'opacity-50' : ''}`}
                placeholder="00.000.000/0000-00"
              />
              {isLoadingCNPJ && (
                <div className="absolute right-3 top-3 flex items-center gap-2 text-red-600 text-xs font-bold animate-pulse">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Buscando dados...</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Razão Social</label>
            <input
              type="text"
              value={newLead.empresa_nome || ''}
              onChange={e => setNewLead({ ...newLead, empresa_nome: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm transition-all"
              placeholder="Nome oficial da empresa"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Nome Fantasia</label>
            <input
              type="text"
              value={newLead.nome_fantasia || ''}
              onChange={e => setNewLead({ ...newLead, nome_fantasia: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm transition-all"
              placeholder="Nome comercial"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-800 mb-2">Logradouro</label>
            <input
              type="text"
              value={newLead.logradouro || ''}
              onChange={e => setNewLead({ ...newLead, logradouro: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm transition-all"
              placeholder="Rua, Número, Complemento"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Bairro</label>
            <input
              type="text"
              value={newLead.bairro || ''}
              onChange={e => setNewLead({ ...newLead, bairro: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm transition-all"
              placeholder="Bairro"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">Cidade</label>
              <input
                type="text"
                value={newLead.cidade || ''}
                onChange={e => setNewLead({ ...newLead, cidade: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm transition-all"
                placeholder="Cidade"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">UF</label>
              <input
                type="text"
                value={newLead.uf || ''}
                onChange={e => setNewLead({ ...newLead, uf: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm transition-all"
                placeholder="UF"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Tipo de Projeto</label>
            <div className="relative">
              <Tag className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <select
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                value={newLead.tipo_projeto || 'Outro'}
                onChange={e => setNewLead({ ...newLead, tipo_projeto: e.target.value as ProjectType })}
              >
                <option value="Publicidade">Publicidade</option>
                <option value="Institucional">Institucional</option>
                <option value="Evento">Evento</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Valor Estimado (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                placeholder="0,00"
                value={newLead.valor_estimado ? newLead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  const numberValue = Number(value) / 100;
                  setNewLead({ ...newLead, valor_estimado: numberValue });
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2 text-red-600"><UserPlus size={20} /> Contato Principal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nome</label>
              <input
                type="text"
                value={initialContact.nome || ''}
                onChange={e => setInitialContact({ ...initialContact, nome: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                placeholder="Nome do contato"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Cargo</label>
              <input
                type="text"
                value={initialContact.cargo || ''}
                onChange={e => setInitialContact({ ...initialContact, cargo: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                placeholder="Ex: Diretor de Marketing"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={initialContact.email || ''}
                onChange={e => setInitialContact({ ...initialContact, email: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Telefone</label>
              <input
                type="text"
                value={initialContact.telefone || ''}
                onChange={e => setInitialContact({ ...initialContact, telefone: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Instagram (Contato)</label>
              <input
                type="text"
                value={initialContact.social_instagram || ''}
                onChange={e => setInitialContact({ ...initialContact, social_instagram: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                placeholder="@usuario"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn (Contato)</label>
              <input
                type="text"
                value={initialContact.social_linkedin || ''}
                onChange={e => setInitialContact({ ...initialContact, social_linkedin: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                placeholder="URL do Perfil"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2"><Globe size={20} /> Presença Digital da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Site Oficial</label>
              <input
                type="text"
                value={newLead.social_site || ''}
                onChange={e => setNewLead({ ...newLead, social_site: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
                placeholder="www.site.com.br"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-sm font-bold text-slate-700 mb-1">Links Adicionais</label>
              {newLead.links_adicionais?.map((link, idx) => (
                <div key={link.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    className="w-32 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-bold outline-none focus:bg-white"
                    placeholder="Ex: Portfólio"
                    value={link.label}
                    onChange={e => updateSocialLink(idx, 'label', e.target.value, true)}
                  />
                  <input
                    type="text"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:bg-white"
                    placeholder="https://..."
                    value={link.url}
                    onChange={e => updateSocialLink(idx, 'url', e.target.value, true)}
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(idx, true)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSocialLink(true)}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Link Personalizado
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Observações e Anotações Iniciais</label>
          <textarea
            className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm min-h-[120px]"
            placeholder="Detalhes sobre a prospecção ou necessidades do cliente..."
            value={newLead.anotacoes || ''}
            onChange={e => setNewLead({ ...newLead, anotacoes: e.target.value })}
          />
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2">
            <Save size={20} /> Finalizar Cadastro de Lead
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">CRM de Projetos</h1>
          <p className="text-slate-500 font-medium">Gerencie seus clientes e acompanhe o progresso de cada entrega.</p>
        </div>

        {renderTabs()}

        <div className="mt-8">
          {activeTab === 'pipeline' && renderKanban()}
          {activeTab === 'directory' && renderDirectory()}
          {activeTab === 'details' && renderDetails()}
          {activeTab === 'archived' && renderArchived()}
          {activeTab === 'new' && renderNewForm()}
        </div>
      </div>
      {renderProjectModal()}
    </div>
  );
};

export default Leads;