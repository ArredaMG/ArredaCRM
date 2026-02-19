import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBudgets, saveBudget, deleteBudget, getLeads, getCatalog, getProjects } from '../services/dataService';
import { generateProposalText } from '../services/geminiService';
import { Budget, BudgetItem, Lead, CatalogItem, Project } from '../types';
import { DEFAULT_PROFIT, DEFAULT_BV, DEFAULT_TAX, formatCurrency } from '../constants';
import { Plus, Trash2, Edit, Calculator, Sparkles, FileDown, ArrowLeft, Save, Package, Truck, Users, Box, Search, Zap, LayoutGrid, List, Eye, EyeOff, Archive, Copy, RotateCcw } from 'lucide-react';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const Budgets: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'ativos' | 'arquivados' | 'todos'>('ativos');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'alphabetical'>('recent');

  // Editor State
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New Item State 
  const [tempItem, setTempItem] = useState<{ descricao: string, qtd: string, custo: string }>({
    descricao: '', qtd: '', custo: ''
  });
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const CATEGORIES = [
    { id: 'Produção', label: 'Produção e Equipe', icon: Users },
    { id: 'Equipamentos', label: 'Equipamentos', icon: Package },
    { id: 'Logística', label: 'Logística', icon: Truck },
    { id: 'Outros', label: 'Outras Despesas', icon: Box },
  ];

  useEffect(() => {
    refreshData();
  }, []);

  // Handle Edit Deep Link
  useEffect(() => {
    if (editId && budgets.length > 0) {
      const budgetToEdit = budgets.find(b => b.id === editId);
      if (budgetToEdit) {
        setCurrentBudget({ ...budgetToEdit });
        setView('edit');
        // Clear param after opening to avoid re-opening on logic refreshes if desired
        // setSearchParams({}); 
      }
    }
  }, [editId, budgets]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [budgetsData, leadsData, catalogData, projectsData] = await Promise.all([
        getBudgets(),
        getLeads(),
        getCatalog(),
        getProjects()
      ]);
      setBudgets(budgetsData || []);
      setLeads(leadsData || []);
      setCatalog(catalogData || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewBudget = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const newBudget: Budget = {
      id: generateId(),
      lead_id: leads[0]?.id || '',
      titulo_projeto: 'Novo Projeto',
      data_criacao: today.toISOString().split('T')[0],
      validade_dias: 7,
      validade_proposta: nextWeek.toISOString().split('T')[0],
      percentual_lucro: DEFAULT_PROFIT,
      percentual_bv: DEFAULT_BV,
      percentual_imposto: DEFAULT_TAX,
      custo_total_projeto: 0,
      valor_final_venda: 0,
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
      forma_pagamento: 'Até 30 dias após a emissão da Nota Fiscal.\n\nDados Bancários:\nArreda Conteúdo\nBanco Inter (077)\nAg 0001 | CC 1234567-8',
      avisos: 'Vídeo: Até 2 rodadas de ajustes incluídas. Após isso, custo adicional por hora técnica.\n\nÁudio: Regravações por alteração de texto terão repasse de custo do locutor.',
      valor_final_ajustado: 0,
      is_fechado: false,
      items: []
    };
    setCurrentBudget(newBudget);
    setView('edit');
  };

  const handleEdit = (budget: Budget) => {
    setCurrentBudget({ ...budget });
    setView('edit');
  };

  const handleDelete = async (id: string, titulo: string) => {
    // Exact text requested by user
    if (window.confirm('Tem certeza que deseja excluir permanentemente?')) {
      await deleteBudget(id);
      await refreshData();
    }
  };

  const handleArchive = async (id: string) => {
    const budget = budgets.find(b => b.id === id);
    if (!budget) return;

    if (budget.is_arquivado) {
      await saveBudget({ ...budget, is_arquivado: false });
      alert('Orçamento restaurado para a lista principal.');
    } else {
      if (window.confirm('Deseja arquivar este orçamento? Ele não aparecerá na dashboard principal.')) {
        await saveBudget({ ...budget, is_arquivado: true });
      }
    }
    await refreshData();
  };

  const handleDuplicate = async (id: string) => {
    const budget = budgets.find(b => b.id === id);
    if (budget) {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const duplicated: Budget = {
        ...budget,
        id: generateId(),
        data_criacao: today.toISOString().split('T')[0],
        validade_proposta: nextWeek.toISOString().split('T')[0],
        is_fechado: false,
        is_arquivado: false,
        titulo_projeto: `${budget.titulo_projeto} (Cópia)`
      };
      await saveBudget(duplicated);
      await refreshData();

      // Select for immediate edit
      setCurrentBudget({ ...duplicated });
      setView('edit');
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // 1. Handle Delete
    const deleteBtn = target.closest('[data-action="delete"]');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = deleteBtn.getAttribute('data-id');
      const title = deleteBtn.getAttribute('data-title');
      if (id && title) {
        handleDelete(id, title);
      }
      return;
    }

    // 2. Handle Archive
    const archiveBtn = target.closest('[data-action="archive"]');
    if (archiveBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = archiveBtn.getAttribute('data-id');
      if (id) handleArchive(id);
      return;
    }

    // 3. Handle Duplicate
    const duplicateBtn = target.closest('[data-action="duplicate"]');
    if (duplicateBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = duplicateBtn.getAttribute('data-id');
      if (id) handleDuplicate(id);
      return;
    }

    // 4. Handle Edit button specifically
    const editBtn = target.closest('[data-action="edit-budget"]');

    // 5. Handle Card Click (fallback)
    const card = target.closest('[data-action="view-budget"]');
    if (card || editBtn) {
      const id = (card || editBtn)?.getAttribute('data-id');
      const budget = budgets.find(b => b.id === id);
      if (budget) {
        handleEdit(budget);
      }
    }
  };

  // --- CALCULATION LOGIC (INVERSE) ---
  const calculateTotals = (budget: Budget): Budget => {
    // Only calculate items that are NOT hidden
    const activeItems = budget.items.filter(item => !item.hidden);
    const totalCost = activeItems.reduce((acc, item) => acc + (item.custo_unitario_real * item.qtd), 0);

    const marginMultiplier = 1 + ((budget.percentual_lucro + budget.percentual_bv) / 100);
    const taxMultiplier = 1 + (budget.percentual_imposto / 100);

    const calculatedIdeal = (totalCost * marginMultiplier) * taxMultiplier;

    // Check if we should auto-sync (if it's a new budget or previously synced)
    const isNew = !budget.valor_final_ajustado && !budget.valor_final_venda;
    const wasSynced = Math.abs((budget.valor_final_ajustado || 0) - (budget.valor_final_venda || 0)) < 1;
    const shouldSync = isNew || wasSynced;

    const finalValue = shouldSync ? Number(calculatedIdeal.toFixed(2)) : (budget.valor_final_ajustado || calculatedIdeal);

    return {
      ...budget,
      custo_total_projeto: totalCost,
      valor_final_venda: finalValue, // Official Sale Value
      valor_final_ajustado: finalValue // Exact same for consistency
    };
  };

  // --- AUTOCOMPLETE HANDLERS ---
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>, categoryId: string) => {
    const value = e.target.value;
    setActiveCategory(categoryId);
    setTempItem({ ...tempItem, descricao: value });

    if (value.length > 0) {
      const filtered = catalog.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase()) &&
        (c.category === categoryId || !c.category) // Optional: restrict by category, or allow global search
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (item: CatalogItem) => {
    setTempItem({
      ...tempItem,
      descricao: item.name,
      custo: item.lastPrice.toString() // Auto-fill Price
    });
    setShowSuggestions(false);
  };

  const addItem = (category: string) => {
    if (!currentBudget || !tempItem.descricao || !tempItem.custo) return;

    const item: BudgetItem = {
      id: generateId(),
      categoria: category,
      descricao: tempItem.descricao,
      qtd: Number(tempItem.qtd) || 1,
      custo_unitario_real: Number(tempItem.custo)
    };

    const updatedBudget = {
      ...currentBudget,
      items: [...currentBudget.items, item]
    };

    setCurrentBudget(calculateTotals(updatedBudget));
    setTempItem({ descricao: '', qtd: '', custo: '' });
    setActiveCategory(''); // Reset active input
    setShowSuggestions(false);
  };

  const removeItem = (itemId: string) => {
    if (!currentBudget) return;
    const updatedBudget = {
      ...currentBudget,
      items: currentBudget.items.filter(i => i.id !== itemId)
    };
    setCurrentBudget(calculateTotals(updatedBudget));
  };

  const updateItem = (itemId: string, field: string, value: any) => {
    if (!currentBudget) return;
    const updatedItems = currentBudget.items.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });

    const updatedBudget = {
      ...currentBudget,
      items: updatedItems
    };
    setCurrentBudget(calculateTotals(updatedBudget));
  };

  const handleSaveBudget = async () => {
    if (!currentBudget) return;
    try {
      await saveBudget(currentBudget); // This triggers catalog auto-learning
      setView('list');
      await refreshData();
    } catch (error) {
      alert("Erro ao salvar orçamento");
    }
  };

  const handleGenerateAI = async () => {
    if (!currentBudget) return;
    const lead = leads.find(l => l.id === currentBudget.lead_id);
    if (!lead) {
      alert("Selecione um lead válido para gerar o texto.");
      return;
    }

    setIsGeneratingAI(true);
    const text = await generateProposalText(lead, currentBudget);
    setCurrentBudget({ ...currentBudget, texto_apresentacao_ia: text });
    setIsGeneratingAI(false);
  };

  // --- NEW EXPORT LOGIC ---
  const handleExportPDF = async () => {
    if (!currentBudget) return;
    // Ensure we save first to get the ID and updated data persisted
    try {
      await saveBudget(currentBudget);
      // Opens the printable view in a new tab/window AND triggers AutoPrint
      window.open(`#/proposal/${currentBudget.id}?autoPrint=true`, '_blank');
    } catch (error) {
      alert("Erro ao salvar antes de exportar");
    }
  };

  const renderCategorySection = (cat: { id: string, label: string, icon: any }) => {
    if (!currentBudget) return null;
    const items = currentBudget.items.filter(i => i.categoria === cat.id);
    const subtotal = items.reduce((acc, i) => acc + (i.custo_unitario_real * i.qtd), 0);
    const isActive = activeCategory === cat.id;

    return (
      <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6 shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <cat.icon size={20} className="text-slate-500" />
            <h4 className="font-bold text-slate-800">{cat.label}</h4>
          </div>
          <div className="text-sm font-semibold text-slate-600">
            Subtotal: {formatCurrency(subtotal)}
          </div>
        </div>

        <div className="p-4">
          {items.length > 0 && (
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                  <th className="pb-2 w-10"></th>
                  <th className="pb-2">Descrição</th>
                  <th className="pb-2 w-20">Qtd</th>
                  <th className="pb-2 w-28">Categoria</th>
                  <th className="pb-2 w-28">Unitário</th>
                  <th className="pb-2 w-28">Total</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className={item.hidden ? 'opacity-40 grayscale-sm' : ''}>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => updateItem(item.id, 'hidden', !item.hidden)}
                        className={`p-1 rounded transition-colors ${item.hidden ? 'text-slate-400 hover:text-slate-600' : 'text-red-500 hover:text-red-700 bg-red-50'}`}
                        title={item.hidden ? "Reexibir e somar" : "Ocultar (não soma no total)"}
                      >
                        {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        className={`w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-red-500 focus:bg-white outline-none px-1 py-0.5 transition-all text-slate-800 ${item.hidden ? 'line-through' : ''}`}
                        value={item.descricao}
                        onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        className="w-16 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-red-500 focus:bg-white outline-none px-1 py-0.5 transition-all text-slate-800"
                        value={item.qtd}
                        onChange={(e) => updateItem(item.id, 'qtd', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-red-500 focus:bg-white outline-none px-1 py-0.5 transition-all text-slate-600 text-xs"
                        value={item.categoria}
                        onChange={(e) => updateItem(item.id, 'categoria', e.target.value)}
                      >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">R$</span>
                        <input
                          type="number"
                          className="w-20 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-red-500 focus:bg-white outline-none px-1 py-0.5 transition-all text-slate-600"
                          value={item.custo_unitario_real}
                          onChange={(e) => updateItem(item.id, 'custo_unitario_real', Number(e.target.value))}
                        />
                      </div>
                    </td>
                    <td className="py-2 font-medium text-slate-800 whitespace-nowrap">
                      {formatCurrency(item.qtd * item.custo_unitario_real)}
                    </td>
                    <td className="py-2 text-right">
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Add Row with Autocomplete */}
          <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-200 border-dashed relative">
            <div className="flex-1 relative" ref={suggestionRef}>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Descrição do Item</label>
              <div className="relative">
                <input
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 pl-8"
                  placeholder="Busque ou digite..."
                  value={isActive ? tempItem.descricao : ''}
                  onChange={e => handleDescriptionChange(e, cat.id)}
                  onFocus={() => setActiveCategory(cat.id)}
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Autocomplete Dropdown */}
              {isActive && showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <div className="text-[10px] text-slate-400 px-3 py-1 font-semibold uppercase bg-slate-50 border-b border-slate-100">Sugestões</div>
                  {suggestions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => selectSuggestion(s)}
                      className="px-3 py-2 hover:bg-amber-50 cursor-pointer flex justify-between items-center group transition-colors"
                    >
                      <span className="text-sm text-slate-700">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 group-hover:text-amber-600 transition-colors">{formatCurrency(s.lastPrice)}</span>
                        <Zap size={12} className="text-amber-400 fill-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isActive && tempItem.descricao.length > 2 && suggestions.length === 0 && (
                <div className="absolute z-50 right-0 -top-8 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md border border-green-200 flex items-center gap-1 shadow-sm">
                  <Plus size={12} /> Novo Item (será salvo)
                </div>
              )}
            </div>

            <div className="w-20">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Qtd</label>
              <input
                type="number"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900"
                placeholder="1"
                value={isActive ? tempItem.qtd : ''}
                onChange={e => {
                  setActiveCategory(cat.id);
                  setTempItem({ ...tempItem, qtd: e.target.value });
                }}
              />
            </div>
            <div className="w-28">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Custo Unit.</label>
              <input
                type="number"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900"
                placeholder="0.00"
                value={isActive ? tempItem.custo : ''}
                onChange={e => {
                  setActiveCategory(cat.id);
                  setTempItem({ ...tempItem, custo: e.target.value });
                }}
              />
            </div>
            <button
              onClick={() => addItem(cat.id)}
              className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors h-[34px] w-[34px] flex items-center justify-center"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (view === 'edit' && currentBudget) {
    return (
      <div className="space-y-6 pb-20">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 sticky top-0 bg-gray-50 z-10 pt-2">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-200 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold text-slate-800">Editor de Orçamento</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentBudget({ ...currentBudget, modo_cliente: !currentBudget.modo_cliente })}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-medium transition-colors ${currentBudget.modo_cliente
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
            >
              {currentBudget.modo_cliente ? <EyeOff size={18} /> : <Eye size={18} />}
              {currentBudget.modo_cliente ? 'Modo Cliente Ativo' : 'Modo Detalhado'}
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 bg-white font-medium text-slate-700">
              <FileDown size={18} /> PDF Cliente
            </button>
            <button onClick={handleSaveBudget} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg shadow-red-600/20">
              <Save size={18} /> Salvar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Config & Items */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-slate-800 mb-2">Nome do Projeto</label>
                <input
                  className="w-full text-lg bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-900"
                  value={currentBudget.titulo_projeto}
                  onChange={e => setCurrentBudget({ ...currentBudget, titulo_projeto: e.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-slate-800 mb-2">Cliente (Lead)</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 text-lg bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-900"
                    value={currentBudget.lead_id}
                    onChange={e => setCurrentBudget({ ...currentBudget, lead_id: e.target.value })}
                  >
                    {leads.map(l => <option key={l.id} value={l.id}>{l.empresa_nome}</option>)}
                  </select>
                  <div className="w-1/3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CNPJ do Cliente</label>
                    <p className="text-sm font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 truncate">
                      {leads.find(l => l.id === currentBudget.lead_id)?.cnpj || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-slate-800 mb-2">Oportunidade / Projeto Vinculado</label>
                <select
                  className="w-full text-lg bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-900"
                  value={currentBudget.project_id || ''}
                  onChange={e => setCurrentBudget({ ...currentBudget, project_id: e.target.value })}
                >
                  <option value="">-- Sem vínculo com projeto específico --</option>
                  {projects
                    .filter(p => p.lead_id === currentBudget.lead_id)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.titulo}</option>
                    ))
                  }
                </select>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  * Vincular a uma oportunidade ajuda na organização do Pipeline.
                </p>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-slate-800 mb-2">Objetivo Estratégico</label>
                <textarea
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-900 text-sm h-24"
                  placeholder="Ex: desenvolvimento de materiais educativos para infoproduto"
                  value={currentBudget.objetivo_estrategico || ''}
                  onChange={e => setCurrentBudget({ ...currentBudget, objetivo_estrategico: e.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-slate-800 mb-2">Especificações de Entrega</label>
                <textarea
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-900 text-sm h-24"
                  placeholder="Ex: Formato MP4, Full HD 1080p, Proporção 16:9"
                  value={currentBudget.especificacoes_entrega || ''}
                  onChange={e => setCurrentBudget({ ...currentBudget, especificacoes_entrega: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-800 mb-2">Previsão de Entrega</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-900"
                  placeholder="Ex: 10 dias após a captação"
                  value={currentBudget.previsao_entrega || ''}
                  onChange={e => setCurrentBudget({ ...currentBudget, previsao_entrega: e.target.value })}
                />
              </div>
            </div>

            {/* Items by Category */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Custos do Projeto</h3>
              {CATEGORIES.map(cat => renderCategorySection(cat))}
            </div>

            {/* AI Proposal Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles size={18} className="text-purple-600" /> Apresentação com IA</h3>
                <button
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1.5 rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingAI ? 'Gerando...' : 'Gerar Texto'}
                </button>
              </div>
              <textarea
                className="w-full border border-slate-300 rounded-lg p-4 text-sm h-32 focus:ring-2 focus:ring-purple-500 outline-none text-slate-700 bg-white leading-relaxed"
                placeholder="O texto gerado pela IA aparecerá aqui..."
                value={currentBudget.texto_apresentacao_ia || ''}
                onChange={e => setCurrentBudget({ ...currentBudget, texto_apresentacao_ia: e.target.value })}
              />
            </div>

            {/* Standard Editable Fields */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
              <h3 className="font-bold text-slate-800">Configs da Proposta</h3>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Etapas do Processo (uma por linha)</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 bg-white"
                  value={currentBudget.etapas_processo.join('\n')}
                  onChange={e => setCurrentBudget({ ...currentBudget, etapas_processo: e.target.value.split('\n') })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Forma de Pagamento</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 bg-white"
                    value={currentBudget.forma_pagamento}
                    onChange={e => setCurrentBudget({ ...currentBudget, forma_pagamento: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Validade da Proposta</label>
                  <input
                    type="date"
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 bg-white"
                    value={currentBudget.validade_proposta}
                    onChange={e => setCurrentBudget({ ...currentBudget, validade_proposta: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Avisos</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-red-500 outline-none text-slate-700 bg-white"
                    value={currentBudget.avisos}
                    onChange={e => setCurrentBudget({ ...currentBudget, avisos: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Financial Logic */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-2xl sticky top-24">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-700 pb-4"><Calculator size={20} /> Composição de Preço</h3>

              <div className="space-y-6">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Custo Base (Itens)</p>
                  <p className="text-2xl font-mono text-white">{formatCurrency(currentBudget.custo_total_projeto)}</p>
                </div>

                <div className="space-y-4">
                  {/* Profit Section */}
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Lucro (%)</label>
                      <input
                        type="number"
                        className="w-16 bg-slate-800 border border-slate-600 rounded p-1 text-right text-white text-sm outline-none focus:ring-1 focus:ring-red-500"
                        value={currentBudget.percentual_lucro}
                        onChange={e => setCurrentBudget(calculateTotals({ ...currentBudget, percentual_lucro: Number(e.target.value) }))}
                      />
                    </div>
                    {/* Inverse Profit Margin Calculation */}
                    {(() => {
                      const v = currentBudget.valor_final_ajustado || 1;
                      const t = currentBudget.percentual_imposto / 100;
                      const bv = currentBudget.percentual_bv / 100;
                      const c = currentBudget.custo_total_projeto;

                      const netBeforeTax = v / (1 + t);
                      const valorBV = c * bv;
                      const lucroReal = netBeforeTax - c - valorBV;

                      return (
                        <p className="text-sm font-semibold text-emerald-400 text-right">
                          + {formatCurrency(lucroReal)} (Real)
                        </p>
                      );
                    })()}
                  </div>

                  {/* BV Section */}
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">BV / Comissão (%)</label>
                      <input
                        type="number"
                        className="w-16 bg-slate-800 border border-slate-600 rounded p-1 text-right text-white text-sm outline-none focus:ring-1 focus:ring-red-500"
                        value={currentBudget.percentual_bv}
                        onChange={e => setCurrentBudget(calculateTotals({ ...currentBudget, percentual_bv: Number(e.target.value) }))}
                      />
                    </div>
                    <p className="text-sm font-semibold text-blue-400 text-right">
                      + {formatCurrency(currentBudget.custo_total_projeto * (currentBudget.percentual_bv / 100))}
                    </p>
                  </div>

                  {/* Impostos Section */}
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Impostos (%)</label>
                      <input
                        type="number"
                        className="w-16 bg-slate-800 border border-slate-600 rounded p-1 text-right text-white text-sm outline-none focus:ring-1 focus:ring-red-500"
                        value={currentBudget.percentual_imposto}
                        onChange={e => setCurrentBudget(calculateTotals({ ...currentBudget, percentual_imposto: Number(e.target.value) }))}
                      />
                    </div>
                    <p className="text-sm font-semibold text-red-400 text-right">
                      + {formatCurrency(((currentBudget.custo_total_projeto * (1 + (currentBudget.percentual_lucro + currentBudget.percentual_bv) / 100)) * (currentBudget.percentual_imposto / 100)))}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Total Calculado</p>
                    <p className="text-lg font-mono text-slate-300">{formatCurrency(currentBudget.valor_final_venda)}</p>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                    <label className="block text-red-500 text-[10px] uppercase font-bold mb-2">Valor Final Ajustado (Arredondamento)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-red-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-transparent border-b-2 border-red-500 text-2xl font-bold text-red-500 outline-none focus:border-white transition-colors"
                        value={currentBudget.valor_final_ajustado}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setCurrentBudget({
                            ...currentBudget,
                            valor_final_ajustado: val,
                            valor_final_venda: val // Sync instantly
                          });
                        }}
                        onBlur={e => {
                          const val = Number(e.target.value) || 0;
                          const rounded = Number(val.toFixed(2));
                          setCurrentBudget({
                            ...currentBudget,
                            valor_final_ajustado: rounded,
                            valor_final_venda: rounded
                          });
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-red-500/70 mt-2 italic">* Este valor é a base unificada para PDF e faturamento.</p>
                  </div>

                  <div className="mt-6 flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <input
                      type="checkbox"
                      id="is_fechado"
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-red-600 focus:ring-red-500 cursor-pointer"
                      checked={currentBudget.is_fechado}
                      onChange={e => setCurrentBudget({ ...currentBudget, is_fechado: e.target.checked })}
                    />
                    <label htmlFor="is_fechado" className="text-sm font-bold text-slate-200 cursor-pointer select-none">
                      Orçamento Fechado
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const years = Array.from(new Set(budgets.map(b => new Date(b.data_criacao).getFullYear().toString()))).sort().reverse();

  const filteredBudgets = budgets
    .filter(b => {
      const lead = leads.find(l => l.id === b.lead_id);
      const matchesSearch = b.titulo_projeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead?.empresa_nome.toLowerCase().includes(searchTerm.toLowerCase());

      const bYear = new Date(b.data_criacao).getFullYear().toString();
      const matchesYear = filterYear === 'all' || bYear === filterYear;

      const matchesStatus = statusFilter === 'todos' ||
        (statusFilter === 'ativos' && !b.is_arquivado) ||
        (statusFilter === 'arquivados' && b.is_arquivado);

      return matchesSearch && matchesYear && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime();
      if (sortBy === 'oldest') return new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime();
      if (sortBy === 'alphabetical') {
        const leadA = leads.find(l => l.id === a.lead_id)?.empresa_nome || '';
        const leadB = leads.find(l => l.id === b.lead_id)?.empresa_nome || '';
        return leadA.localeCompare(leadB);
      }
      return 0;
    });

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          Orçamentos
          <span className="text-sm bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">{filteredBudgets.length}</span>
        </h1>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-300 rounded-lg p-1 flex shadow-sm">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-md transition-all ${layoutMode === 'grid' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-md transition-all ${layoutMode === 'list' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={createNewBudget}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus size={20} /> Novo Orçamento
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all"
            placeholder="Buscar por cliente ou projeto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="ativos">Ativos</option>
              <option value="arquivados">Arquivados</option>
              <option value="todos">Todos</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ano</label>
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700"
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
            >
              <option value="all">Todos os anos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ordenar por</label>
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="recent">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
              <option value="alphabetical">Ordem Alfabética</option>
            </select>
          </div>
        </div>
      </div>

      <div
        onClick={handleContainerClick}
        className={layoutMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-3"}
      >
        {filteredBudgets.map(budget => {
          const lead = leads.find(l => l.id === budget.lead_id);

          if (layoutMode === 'list') {
            // LIST VIEW CARD
            return (
              <div
                key={budget.id}
                data-action="view-budget"
                data-id={budget.id}
                className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <span className="text-xs font-mono text-slate-400 w-24">{new Date(budget.data_criacao).toLocaleDateString()}</span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-red-600 transition-colors uppercase">{budget.titulo_projeto}</h3>
                    <p className="text-slate-500 text-xs">{lead?.empresa_nome || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <span className={`text-sm font-bold ${budget.is_fechado ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100' : 'text-slate-800'}`}>
                    {formatCurrency(budget.valor_final_ajustado || budget.valor_final_venda)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      data-action="duplicate"
                      data-id={budget.id}
                      title="Duplicar Orçamento"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      data-action="archive"
                      data-id={budget.id}
                      title={statusFilter === 'arquivados' ? "Restaurar" : "Arquivar Orçamento"}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      {statusFilter === 'arquivados' ? <RotateCcw size={16} /> : <Archive size={16} />}
                    </button>
                    <button
                      data-action="edit-budget"
                      data-id={budget.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      data-action="delete"
                      data-id={budget.id}
                      data-title={budget.titulo_projeto}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded pointer-events-auto"
                    >
                      <Trash2 size={16} className="pointer-events-none" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // GRID VIEW CARD
          return (
            <div
              key={budget.id}
              data-action="view-budget"
              data-id={budget.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl hover:bg-slate-50 transition-all group cursor-pointer hover:-translate-y-1"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-slate-400">{new Date(budget.data_criacao).toLocaleDateString()}</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">{lead?.empresa_nome || 'Unknown'}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-red-600 transition-colors uppercase leading-tight">{budget.titulo_projeto}</h3>
                <p className="text-slate-500 text-sm mb-4">
                  {budget.items.length} itens cadastrados
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{budget.is_fechado ? 'Valor Real Final' : 'Investimento Bruto'}</p>
                    <p className={`text-xl font-bold ${budget.is_fechado ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {formatCurrency(budget.valor_final_ajustado || budget.valor_final_venda)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      data-action="duplicate"
                      data-id={budget.id}
                      title="Duplicar"
                      className="p-2 text-slate-400 hover:text-blue-500 transition-colors pointer-events-auto"
                    >
                      <Copy size={18} className="pointer-events-none" />
                    </button>
                    <button
                      data-action="archive"
                      data-id={budget.id}
                      title={statusFilter === 'arquivados' ? "Restaurar" : "Arquivar"}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors pointer-events-auto"
                    >
                      {statusFilter === 'arquivados' ? <RotateCcw size={18} className="pointer-events-none" /> : <Archive size={18} className="pointer-events-none" />}
                    </button>
                    <button
                      data-action="delete"
                      data-id={budget.id}
                      data-title={budget.titulo_projeto}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors pointer-events-auto"
                    >
                      <Trash2 size={18} className="pointer-events-none" />
                    </button>
                    <button
                      data-action="edit-budget"
                      data-id={budget.id}
                      className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-lg shadow-slate-800/20"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredBudgets.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400 mb-4">Nenhum orçamento criado ainda.</p>
            <button onClick={createNewBudget} className="text-red-600 font-semibold hover:underline">Criar o primeiro</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Budgets;