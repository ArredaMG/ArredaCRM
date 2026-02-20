import React, { useState, useEffect } from 'react';
import { getClients, saveClient, deleteClient, saveLead } from '../services/dataService';
import { Client, SocialLink } from '../types';
import { Plus, Search, Trash2, Edit2, ExternalLink, Instagram, Linkedin, Globe, X, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const Clients: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    // Form State
    const [currentClient, setCurrentClient] = useState<Client | null>(null);

    // Dynamic Link State
    const [tempLink, setTempLink] = useState({ label: '', url: '' });

    useEffect(() => {
        refreshClients();
    }, []);

    const refreshClients = async () => {
        setIsLoading(true);
        const data = await getClients();
        setClients(data || []);
        setIsLoading(false);
    };

    const handleOpenModal = (client?: Client) => {
        if (client) {
            setCurrentClient({ ...client });
        } else {
            setCurrentClient({
                id: generateId(),
                empresa_nome: '',
                nome_fantasia: '',
                cnpj: '',
                logradouro: '',
                bairro: '',
                cidade: '',
                uf: '',
                data_cadastro: new Date().toISOString(),
                links_adicionais: []
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentClient || !currentClient.empresa_nome) return;

        try {
            await saveClient(currentClient);
            setShowModal(false);
            refreshClients();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar cliente');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
            await deleteClient(id);
            refreshClients();
        }
    };

    const addLink = () => {
        if (currentClient && tempLink.label && tempLink.url) {
            const newLinks = [...(currentClient.links_adicionais || []), { id: generateId(), ...tempLink }];
            setCurrentClient({ ...currentClient, links_adicionais: newLinks });
            setTempLink({ label: '', url: '' });
        }
    };

    const removeLink = (linkId: string) => {
        if (currentClient) {
            const newLinks = (currentClient.links_adicionais || []).filter(l => l.id !== linkId);
            setCurrentClient({ ...currentClient, links_adicionais: newLinks });
        }
    };

    const startNewProject = async (client: Client) => {
        const projectName = prompt(`Novo Projeto para ${client.empresa_nome}:\nDigite o nome do projeto:`);
        if (!projectName) return;

        const projectValueStr = prompt("Valor Estimado (R$):", "0,00");
        const projectValue = projectValueStr ? parseFloat(projectValueStr.replace(/\./g, '').replace(',', '.')) : 0;

        const newLead = {
            id: generateId(),
            client_id: client.id,
            empresa_nome: client.empresa_nome,
            nome_fantasia: client.nome_fantasia || '',
            cnpj: client.cnpj || '',
            status: 'Novo',
            tipo_projeto: 'Outro',
            historico_logs: [`Projeto criado a partir do Diretório em ${new Date().toLocaleString()}`],
            data_cadastro: new Date().toISOString(),
            contacts: [],
            links_adicionais: client.links_adicionais,
            valor_estimado: projectValue
        };

        // @ts-ignore
        await saveLead(newLead);
        navigate('/leads');
    };

    const filtered = clients.filter(c =>
        c.empresa_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Diretório de Clientes</h1>
                    <p className="text-slate-500">Gerencie sua base de clientes e histórico.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus size={20} /> Novo Cliente
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-700"
                        placeholder="Buscar por nome, fantasia ou CNPJ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-slate-400">Carregando diretório...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(client => (
                        <div key={client.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow p-5 flex flex-col justify-between h-full group">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-lg uppercase">
                                        {client.empresa_nome.charAt(0)}
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={() => requestAnimationFrame(() => handleOpenModal(client))} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-amber-600">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(client.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{client.empresa_nome}</h3>
                                {client.nome_fantasia && <p className="text-sm text-slate-500 font-medium mb-3">{client.nome_fantasia}</p>}

                                <div className="text-xs text-slate-400 space-y-1 mb-4">
                                    <p>{client.cidade || 'Localização não informada'} {client.uf && `• ${client.uf}`}</p>
                                    <p className="font-mono">{client.cnpj || 'CNPJ não informado'}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {client.social_instagram && (
                                        <a href={client.social_instagram} target="_blank" rel="noreferrer" className="text-pink-600 bg-pink-50 p-1.5 rounded-md hover:bg-pink-100 transition-colors" title="Instagram">
                                            <Instagram size={14} />
                                        </a>
                                    )}
                                    {client.social_linkedin && (
                                        <a href={client.social_linkedin} target="_blank" rel="noreferrer" className="text-blue-700 bg-blue-50 p-1.5 rounded-md hover:bg-blue-100 transition-colors" title="LinkedIn">
                                            <Linkedin size={14} />
                                        </a>
                                    )}
                                    {client.social_site && (
                                        <a href={client.social_site} target="_blank" rel="noreferrer" className="text-slate-600 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200 transition-colors" title="Site">
                                            <Globe size={14} />
                                        </a>
                                    )}
                                    {client.links_adicionais?.map(link => (
                                        <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md hover:bg-amber-100 transition-colors text-[10px] font-bold uppercase flex items-center gap-1">
                                            <ExternalLink size={10} /> {link.label}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 mt-2">
                                <button
                                    onClick={() => startNewProject(client)}
                                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <FileText size={16} /> Lançar Novo Projeto
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL */}
            {showModal && currentClient && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-800">
                                {currentClient.id && clients.find(c => c.id === currentClient.id) ? 'Editar Cliente' : 'Novo Cliente'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Razão Social *</label>
                                    <input required className="input-field w-full border p-2 rounded" value={currentClient.empresa_nome} onChange={e => setCurrentClient({ ...currentClient, empresa_nome: e.target.value })} />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Fantasia</label>
                                    <input className="input-field w-full border p-2 rounded" value={currentClient.nome_fantasia || ''} onChange={e => setCurrentClient({ ...currentClient, nome_fantasia: e.target.value })} />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label>
                                    <input className="input-field w-full border p-2 rounded" value={currentClient.cnpj || ''} onChange={e => setCurrentClient({ ...currentClient, cnpj: e.target.value })} />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade / UF</label>
                                    <div className="flex gap-2">
                                        <input className="input-field w-2/3 border p-2 rounded" placeholder="Cidade" value={currentClient.cidade || ''} onChange={e => setCurrentClient({ ...currentClient, cidade: e.target.value })} />
                                        <input className="input-field w-1/3 border p-2 rounded" placeholder="UF" value={currentClient.uf || ''} onChange={e => setCurrentClient({ ...currentClient, uf: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Globe size={16} /> Presença Digital & Links</p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instagram (URL)</label>
                                        <input className="input-field w-full border p-2 rounded" value={currentClient.social_instagram || ''} onChange={e => setCurrentClient({ ...currentClient, social_instagram: e.target.value })} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LinkedIn (URL)</label>
                                        <input className="input-field w-full border p-2 rounded" value={currentClient.social_linkedin || ''} onChange={e => setCurrentClient({ ...currentClient, social_linkedin: e.target.value })} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site (URL)</label>
                                        <input className="input-field w-full border p-2 rounded" value={currentClient.social_site || ''} onChange={e => setCurrentClient({ ...currentClient, social_site: e.target.value })} />
                                    </div>
                                </div>

                                {/* Dynamic Links */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Links Adicionais (Portfólio, Drive, etc)</label>
                                    <div className="space-y-2 mb-3">
                                        {currentClient.links_adicionais?.map(link => (
                                            <div key={link.id} className="flex gap-2 items-center bg-white p-2 rounded border border-slate-200 shadow-sm">
                                                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">{link.label}</span>
                                                <span className="text-xs text-slate-500 truncate flex-1">{link.url}</span>
                                                <button type="button" onClick={() => removeLink(link.id)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 items-end">
                                        <div className="w-1/3">
                                            <input
                                                className="w-full text-xs border p-2 rounded"
                                                placeholder="Nome (Ex: Mídia Kit)"
                                                value={tempLink.label}
                                                onChange={e => setTempLink({ ...tempLink, label: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                className="w-full text-xs border p-2 rounded"
                                                placeholder="URL (https://...)"
                                                value={tempLink.url}
                                                onChange={e => setTempLink({ ...tempLink, url: e.target.value })}
                                            />
                                        </div>
                                        <button type="button" onClick={addLink} className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-100 mt-auto">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg text-slate-600 font-bold hover:bg-slate-100">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-6 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-lg shadow-amber-600/20">
                                    Salvar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
