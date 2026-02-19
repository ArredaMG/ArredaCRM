import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { getBudgets, getLeads } from '../services/dataService';
import { Budget, Lead, LeadStatus } from '../types';

const Dashboard: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [budgetsData, leadsData] = await Promise.all([getBudgets(), getLeads()]);
      setBudgets(budgetsData);
      setLeads(leadsData);
    };
    loadData();
  }, []);

  const totalSales = budgets.reduce((acc, b) => acc + b.valor_final_venda, 0);

  // Active Proposals: Budget or Negotiation phase
  const activeProposals = leads.filter(l =>
    l.status === LeadStatus.BUDGET || l.status === LeadStatus.NEGOTIATION
  ).length;

  // Won Deals: Production phase
  const wonDeals = leads.filter(l => l.status === LeadStatus.PRODUCTION).length;

  // Chart Data Preparation
  const statusData = Object.values(LeadStatus).map(status => ({
    name: status,
    value: leads.filter(l => l.status === status).length
  })).filter(d => d.value > 0);

  const budgetPerformance = budgets.map(b => ({
    name: b.titulo_projeto.substring(0, 15) + (b.titulo_projeto.length > 15 ? '...' : ''),
    custo: b.custo_total_projeto,
    venda: b.valor_final_venda
  })).slice(0, 10); // Last 10

  const COLORS = ['#3b82f6', '#06b6d4', '#eab308', '#f97316', '#10b981', '#64748b'];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 uppercase">Valor Total (Orçamentos)</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 uppercase">Em Negociação / Orçamento</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{activeProposals}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 uppercase">Em Produção</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-emerald-600 mt-2">{wonDeals}</p>
            <button
              onClick={async () => {
                if (confirm('Deseja importar os dados salvos localmente para o novo banco de dados online?')) {
                  const { migrateLocalToSupabase } = await import('../services/dataService');
                  await migrateLocalToSupabase();
                  alert('Migração concluída! Os dados agora estão no Supabase.');
                  window.location.reload();
                }
              }}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200"
            >
              🚀 Importar Dados Locais
            </button>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Sales vs Cost */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Performance Financeira (Últimos Projetos)</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString()}`} />
              <Bar dataKey="custo" fill="#94a3b8" name="Custo" stackId="a" />
              <Bar dataKey="venda" fill="#d97706" name="Venda" stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Pipeline de Vendas</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;