import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBudgetById, getLeads, deleteBudget } from '../services/dataService';
import { Budget, Lead } from '../types';
import { Printer, Trash2, ArrowLeft } from 'lucide-react';
import { ArredaLogo, formatCurrency } from '../constants';

const ProposalView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [budget, setBudget] = useState<Budget | null>(null);
    const [lead, setLead] = useState<Lead | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (id) {
                const foundBudget = await getBudgetById(id);
                if (foundBudget) {
                    setBudget(foundBudget);
                    const leads = await getLeads();
                    const foundLead = leads.find(l => l.id === foundBudget.lead_id);
                    setLead(foundLead || null);
                }
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        if (budget && lead) {
            if (window.location.hash.includes('autoPrint=true')) {
                setTimeout(() => {
                    triggerPrint();
                }, 800);
            }
        }
    }, [budget, lead]);

    if (!budget || !lead) {
        return <div className="p-10 text-center text-slate-500">Carregando proposta ou não encontrada...</div>;
    }

    // Use Validade Proposta if available, otherwise fallback
    const validadeDate = budget.validade_proposta
        ? new Date(budget.validade_proposta + 'T12:00:00') // Add time to avoid timezone shift
        : new Date(new Date(budget.data_criacao).getTime() + ((budget.validade_dias || 7) * 24 * 60 * 60 * 1000));

    const triggerPrint = () => {
        const originalTitle = document.title;
        const sanitizedClient = lead.empresa_nome.replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date(budget.data_criacao).toISOString().split('T')[0];
        const fileName = `Orcamento_Arreda_${sanitizedClient}_${dateStr}`;

        document.title = fileName;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };

    const handlePrint = (e: React.MouseEvent) => {
        e.preventDefault();
        triggerPrint();
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (window.confirm('Tem certeza que deseja excluir permanentemente?')) {
            await deleteBudget(budget.id);
            if (window.history.length > 1) {
                navigate(-1);
            } else {
                window.close();
                navigate('/budgets');
            }
        }
    };

    // ITEM GROUPING LOGIC
    const activeItems = budget.items.filter(i => !i.hidden);
    const groupedItems = [
        { label: 'Produção e Equipe', items: activeItems.filter(i => i.categoria === 'Produção') },
        { label: 'Equipamentos', items: activeItems.filter(i => i.categoria === 'Equipamentos') },
        { label: 'Logística', items: activeItems.filter(i => i.categoria === 'Logística') },
        { label: 'Outras Despesas', items: activeItems.filter(i => i.categoria === 'Outros') },
    ];

    return (
        <>
            <style>{`
        :root {
            --cor-primaria: #1a1a1a;
            --cor-acento: #e63946;
            --cor-fundo: #f4f4f4;
            --cor-texto: #333;
            --cor-texto-secundario: #666;
            --borda-suave: #e0e0e0;
            --fonte-principal: 'Inter', sans-serif;
        }

        body {
            font-family: var(--fonte-principal);
            background-color: var(--cor-fundo);
            color: var(--cor-texto);
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .container {
            max-width: 850px;
            margin: 40px auto;
            background: #fff;
            padding: 50px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            border-radius: 8px;
        }

        .toolbar {
            background-color: #1e293b;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        .toolbar-group { display: flex; gap: 12px; }

        .btn-tool {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }

        .btn-print { background-color: var(--cor-acento); color: white; }
        .btn-delete { background-color: rgba(255,255,255,0.1); color: #fca5a5; }
        .btn-back { background-color: transparent; color: #cbd5e1; }

        header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid var(--cor-primaria);
            padding-bottom: 25px;
            margin-bottom: 30px;
        }

        .empresa-info p { margin: 2px 0; font-size: 11px; color: var(--cor-texto-secundario); }
        .orcamento-badge { 
            background-color: var(--cor-primaria); color: #fff; padding: 5px 12px; 
            border-radius: 4px; font-weight: bold; font-size: 11px; margin-bottom: 8px;
            display: inline-block;
        }
        .meta-item { font-size: 12px; margin-bottom: 2px; }

        .section-title {
            font-size: 13px;
            text-transform: uppercase;
            color: var(--cor-texto-secundario);
            border-bottom: 1px solid var(--borda-suave);
            padding-bottom: 5px;
            margin-bottom: 12px;
            font-weight: 700;
        }

        .info-box {
            background-color: #fafafa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid var(--cor-acento);
            margin-bottom: 25px;
        }

        .info-box h2 { margin: 0 0 5px 0; font-size: 16px; }
        .info-box p { margin: 0; font-size: 13px; color: var(--cor-texto-secundario); }

        .timeline-wrapper { margin-bottom: 30px; }
        .timeline { display: flex; justify-content: space-between; position: relative; margin-top: 15px; }
        .timeline::before { content: ''; position: absolute; top: 10px; left: 0; right: 0; height: 1px; background: var(--borda-suave); }
        .step { position: relative; z-index: 1; text-align: center; }
        .step-dot { width: 14px; height: 14px; background: #fff; border: 2px solid var(--cor-acento); border-radius: 50%; margin: 0 auto 5px auto; }
        .step-text { font-size: 9px; color: var(--cor-texto-secundario); font-weight: 600; text-transform: uppercase; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { text-align: left; padding: 10px 0; border-bottom: 1px solid var(--cor-primaria); font-size: 11px; color: var(--cor-texto-secundario); }
        td { padding: 8px 0; border-bottom: 1px solid #f9f9f9; vertical-align: top; }
        
        .category-header { background: #fdfdfd; font-size: 10px; font-weight: bold; color: var(--cor-acento); text-transform: uppercase; padding: 10px 0 5px 5px; border-bottom: 1px solid #eee; }
        
        .item-titulo { font-size: 13px; font-weight: bold; color: var(--cor-primaria); display: block; }
        .item-detalhe { font-size: 11px; color: var(--cor-texto-secundario); display: block; max-width: 95%; }
        .col-valor { text-align: right; width: 15%; font-size: 12px; font-weight: 600; }
        .col-qty { width: 8%; text-align: center; color: var(--cor-acento); font-weight: bold; font-size: 12px; }

        .total-block { display: flex; justify-content: flex-end; margin-bottom: 30px; }
        .total-box { text-align: right; background: var(--cor-primaria); color: #fff; padding: 15px 25px; border-radius: 6px; min-width: 220px; }
        .total-label { font-size: 11px; text-transform: uppercase; opacity: 0.8; }
        .total-value { font-size: 22px; font-weight: bold; display: block; }

        footer { border-top: 1px dashed var(--borda-suave); padding-top: 20px; font-size: 11px; color: var(--cor-texto-secundario); display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .obs-title { font-weight: bold; color: var(--cor-primaria); display: block; margin-bottom: 5px; text-transform: uppercase; font-size: 10px; }

        @media print {
            @page { 
                size: A4; 
                margin: 1.5cm; 
            }
            body { 
                background: #fff; 
                padding: 0 !important; 
                margin: 0 !important; 
                overflow: visible !important;
                height: auto !important;
            }
            .container { 
                box-shadow: none; 
                padding: 0 !important; 
                width: 100%; 
                margin: 0; 
                font-size: 10pt; 
                display: block !important; 
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
            }
            .no-print { display: none !important; }
            .info-box, .timeline-wrapper, .total-block, footer, tr {
                page-break-inside: avoid;
            }
            header { 
                margin-bottom: 30px; 
                padding-bottom: 20px; 
                page-break-after: avoid;
            }
            .category-header {
                page-break-after: avoid;
                margin-top: 20px;
                padding-top: 20px;
            }
            table {
                width: 100%;
                table-layout: auto;
            }
            .modo-cliente .col-valor-hide { 
                display: none !important; 
            }
            .modo-cliente td:nth-child(2) {
                width: auto;
            }
            footer { 
                margin-top: 40px; 
                border-top: 1px solid var(--borda-suave);
                padding-top: 20px;
            }
        }
      `}</style>

            <nav className="toolbar no-print">
                <div className="toolbar-group">
                    <button onClick={() => navigate(-1)} className="btn-tool btn-back">
                        <ArrowLeft size={18} /> Voltar
                    </button>
                </div>
                <div className="toolbar-group">
                    <button onClick={handleDelete} className="btn-tool btn-delete">
                        <Trash2 size={18} /> Excluir
                    </button>
                    <button onClick={handlePrint} className="btn-tool btn-print">
                        <Printer size={18} /> Salvar como PDF
                    </button>
                </div>
            </nav>

            <div className={`container ${budget.modo_cliente ? 'modo-cliente' : ''}`}>
                <header>
                    <div className="empresa-info">
                        <ArredaLogo className="max-w-[130px] mb-3" />
                        <p><strong>ARREDA CONTEÚDO AUDIOVISUAL LTDA</strong></p>
                        <p>CNPJ: 46.479.013/0001-96</p>
                        <p>Conselheiro Quintiliano Silva, 143 - BH/MG</p>
                        <p>contato@arreda.rec.br | (31) 98794-1716</p>
                    </div>
                    <div className="orcamento-meta">
                        <div className="orcamento-badge">ORÇAMENTO #{budget.id.substring(0, 6).toUpperCase()}</div>
                        <div className="meta-item">Data: <strong>{new Date(budget.data_criacao + 'T12:00:00').toLocaleDateString()}</strong></div>
                        <div className="meta-item">Validade: <strong>{validadeDate.toLocaleDateString()}</strong></div>
                        <div className="meta-item">Entrega: <strong>{budget.previsao_entrega || 'A combinar'}</strong></div>
                    </div>
                </header>

                <div className="section-title">Cliente & Projeto</div>
                <div className="info-box">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <h2 className="mb-1">{lead.empresa_nome} {lead.nome_fantasia && `(${lead.nome_fantasia})`}</h2>
                            {(lead.logradouro || lead.cidade) && (
                                <p className="text-[10px] text-slate-500 uppercase font-medium">
                                    {[lead.logradouro, lead.bairro, lead.cidade, lead.uf].filter(Boolean).join(' • ')}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400">CNPJ</p>
                            <p className="text-xs font-mono">{lead.cnpj || '-'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3 mt-2">
                        <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Objetivo Estratégico</p>
                            <p className="text-xs text-slate-600 italic leading-snug">
                                {budget.objetivo_estrategico || 'Não informado'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Especificações</p>
                            <p className="text-xs text-slate-600 leading-snug">
                                {budget.especificacoes_entrega || 'Não informado'}
                            </p>
                        </div>
                    </div>

                    {budget.texto_apresentacao_ia && (
                        <div style={{ marginTop: '12px', fontSize: '11px', fontStyle: 'italic', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                            <div className="whitespace-pre-wrap text-slate-500">"{budget.texto_apresentacao_ia}"</div>
                        </div>
                    )}
                </div>

                <div className="timeline-wrapper">
                    <div className="section-title">Etapas do Processo</div>
                    <div className="timeline">
                        {(budget.etapas_processo || []).map((step, idx) => (
                            <div key={idx} className="step" style={{ width: `${100 / (budget.etapas_processo?.length || 1)}%` }}>
                                <div className="step-dot"></div>
                                <div className="step-text">{step}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section-title">Detalhamento Técnico</div>
                <table>
                    <thead>
                        <tr>
                            <th className="col-qty">QTD</th>
                            <th>DESCRIÇÃO DO SERVIÇO</th>
                            {!budget.modo_cliente && <th className="col-valor col-valor-hide">UNITÁRIO</th>}
                            {!budget.modo_cliente && <th className="col-valor col-valor-hide">SUBTOTAL</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedItems.map((group) => (
                            <React.Fragment key={group.label}>
                                {group.items.length > 0 && (
                                    <>
                                        <tr>
                                            <td colSpan={budget.modo_cliente ? 2 : 4} className="category-header">
                                                {group.label}
                                            </td>
                                        </tr>
                                        {group.items.map(item => (
                                            <tr key={item.id} style={{ pageBreakInside: 'avoid' }}>
                                                <td className="col-qty">{item.qtd.toString().padStart(2, '0')}</td>
                                                <td style={{ width: budget.modo_cliente ? 'auto' : '60%' }}>
                                                    <span className="item-titulo">{item.descricao}</span>
                                                </td>
                                                {!budget.modo_cliente && (
                                                    <>
                                                        <td className="col-valor col-valor-hide">{formatCurrency(item.custo_unitario_real)}</td>
                                                        <td className="col-valor col-valor-hide">{formatCurrency(item.custo_unitario_real * item.qtd)}</td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                <div className="total-block">
                    <div className="total-box">
                        <span className="total-label">Investimento Total (Líquido)</span>
                        <span className="total-value">{formatCurrency(budget.valor_final_ajustado || 0)}</span>
                    </div>
                </div>

                <footer>
                    <div className="footer-col">
                        <span className="obs-title">Forma de Pagamento</span>
                        <div className="whitespace-pre-wrap">{budget.forma_pagamento}</div>
                    </div>
                    <div className="footer-col">
                        <span className="obs-title">Avisos</span>
                        <div className="whitespace-pre-wrap">{budget.avisos}</div>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default ProposalView;