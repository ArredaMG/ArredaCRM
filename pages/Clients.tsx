import React, { useState, useEffect } from 'react';
import { getClients, saveClient, deleteClient, saveLead, getContactsByClientId, saveContact, deleteContact } from '../services/dataService';
import { Client, SocialLink, Contact } from '../types';
import { Plus, Search, Trash2, Edit2, ExternalLink, Instagram, Linkedin, Globe, X, FileText, MessageCircle, Youtube, Facebook, Users, Mail, Phone, Briefcase } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const getSocialIcon = (url: string) => {
    const low = url.toLowerCase();
    if (low.includes('wa.me') || low.includes('whatsapp.com')) return <MessageCircle size={14} className="text-emerald-500" />;
    if (low.includes('instagram.com')) return <Instagram size={14} className="text-pink-600" />;
    if (low.includes('linkedin.com')) return <Linkedin size={14} className="text-blue-700" />;
    if (low.includes('facebook.com') || low.includes('fb.com')) return <Facebook size={14} className="text-blue-600" />;
    if (low.includes('youtube.com') || low.includes('youtu.be')) return <Youtube size={14} className="text-red-600" />;
    return <Globe size={14} className="text-slate-400" />;
};

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const Clients: React.FC = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [clients, setClients] = useState<Client[]>([]);
    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState<'info' | 'contacts'>('info');
    const navigate = useNavigate();

    // Form State
    const [currentClient, setCurrentClient] = useState<Client | null>(null);
    const [clientContacts, setClientContacts] = useState<Contact[]>([]);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    // Dynamic Link State
    const [tempLink, setTempLink] = useState({ label: '', url: '' });

    useEffect(() => {
        refreshClients();
    }, []);

    const refreshClients = async () => {
        setIsLoading(true);
        const [cData, contData] = await Promise.all([
            getClients(),
            // We'll fetch all contacts and group them locally for performance in list/grid views
            // In a huge DB this would be bad, but for CRM it's usually fine
            // Alternative: fetch per client, but that's many requests.
            // We'll fetch all as a starting point.
            import('../services/supabaseClient').then(m => m.supabase.from('contacts').select('*').then(r => r.data || []))
        ]);
        setClients(cData || []);
        // @ts-ignore
        setAllContacts(contData || []);
        setIsLoading(false);
    };

    const handleOpenModal = async (client?: Client, initialTab: 'info' | 'contacts' = 'info') => {
        setActiveModalTab(initialTab);
        setEditingContact(null);
        if (client) {
            setCurrentClient({ ...client });
            const contacts = await getContactsByClientId(client.id);
            setClientContacts(contacts);
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
            setClientContacts([]);
        }
        setShowModal(true);
    };

    const handleCopyEmail = (e: React.MouseEvent, email: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(email);
        alert('E-mail copiado!');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentClient || !currentClient.empresa_nome) return;

        try {
            await saveClient(currentClient);
            // Also refresh contacts from the currentClient if needed?
            // Usually saveClient is just for the client record.
            setShowModal(false);
            refreshClients();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar cliente');
        }
    };

    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingContact || !currentClient) return;

        try {
            await saveContact({ ...editingContact, client_id: currentClient.id });
            const updated = await getContactsByClientId(currentClient.id);
            setClientContacts(updated);
            setEditingContact(null);
            // Also refresh global contacts to keep list view in sync
            refreshClients();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar contato');
        }
    };

    const handleDeleteContact = async (id: string) => {
        if (!window.confirm('Excluir este contato?')) return;
        try {
            await deleteContact(id);
            if (currentClient) {
                const updated = await getContactsByClientId(currentClient.id);
                setClientContacts(updated);
            }
            refreshClients();
        } catch (err) {
            console.error(err);
        }
    };

    const startNewContact = () => {
        setEditingContact({
            id: generateId(),
            nome: '',
            cargo: '',
            email: '',
            telefone: '',
            client_id: currentClient?.id,
            links_adicionais: []
        });
    };

    const renderContactForm = () => {
        if (!editingContact) return null;
        return (
            <form onSubmit={handleSaveContact} className="p-6 space-y-5 bg-white">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Edit2 size={14} className="text-amber-500" />
                        {clientContacts.find(c => c.id === editingContact.id) ? 'Editando Contato' : 'Novo Contato'}
                    </h4>
                    <button type="button" onClick={() => setEditingContact(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1 rounded-full"><X size={16} /></button>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Completo *</label>
                        <input required className="w-full border-2 border-slate-100 p-2.5 rounded-lg text-sm focus:border-amber-500 outline-none transition-all" value={editingContact.nome} onChange={e => setEditingContact({ ...editingContact, nome: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cargo / Função</label>
                        <input className="w-full border-2 border-slate-100 p-2.5 rounded-lg text-sm focus:border-amber-500 outline-none transition-all" value={editingContact.cargo || ''} onChange={e => setEditingContact({ ...editingContact, cargo: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail</label>
                        <input type="email" className="w-full border-2 border-slate-100 p-2.5 rounded-lg text-sm focus:border-amber-500 outline-none transition-all" value={editingContact.email || ''} onChange={e => setEditingContact({ ...editingContact, email: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp / Celular</label>
                        <div className="relative">
                            <input className="w-full border-2 border-slate-100 p-2.5 pl-9 rounded-lg text-sm focus:border-amber-500 outline-none transition-all" placeholder="(00) 00000-0000" value={editingContact.telefone || ''} onChange={e => setEditingContact({ ...editingContact, telefone: e.target.value })} />
                            <Phone className="absolute left-3 top-3 text-slate-400" size={16} />
                        </div>
                    </div>
                    <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Link WhatsApp (wa.me)</label>
                        <div className="relative">
                            <input className="w-full border-2 border-slate-100 p-2.5 pl-9 rounded-lg text-sm focus:border-amber-500 outline-none transition-all" placeholder="https://wa.me/..." value={editingContact.social_whatsapp || ''} onChange={e => setEditingContact({ ...editingContact, social_whatsapp: e.target.value })} />
                            <MessageCircle className="absolute left-3 top-3 text-emerald-500" size={16} />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Redes Sociais Adicionais</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <input
                                    className="w-full border-2 border-slate-100 p-2.5 pl-9 rounded-lg text-sm focus:border-amber-500 outline-none transition-all"
                                    placeholder="Instagram..."
                                    value={editingContact.social_instagram || ''}
                                    onChange={e => setEditingContact({ ...editingContact, social_instagram: e.target.value })}
                                />
                                <div className="absolute left-3 top-3 opacity-70">
                                    {getSocialIcon(editingContact.social_instagram || '')}
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    className="w-full border-2 border-slate-100 p-2.5 pl-9 rounded-lg text-sm focus:border-amber-500 outline-none transition-all"
                                    placeholder="LinkedIn..."
                                    value={editingContact.social_linkedin || ''}
                                    onChange={e => setEditingContact({ ...editingContact, social_linkedin: e.target.value })}
                                />
                                <div className="absolute left-3 top-3 opacity-70">
                                    {getSocialIcon(editingContact.social_linkedin || '')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                    <button type="button" onClick={() => setEditingContact(null)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Descartar</button>
                    <button type="submit" className="px-6 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all">Salvar Alterações</button>
                </div>
            </form>
        );
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja excluir ESTE cliente? Essa ação não pode ser desfeita.')) {
            try {
                await deleteClient(id);
                refreshClients();
            } catch (error) {
                console.error(error);
                alert('Erro ao excluir cliente. Verifique se existem Projetos/Leads vinculados a ele.');
            }
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

    const startNewProject = async (e: React.MouseEvent, client: Client) => {
        e.stopPropagation();

        // 1. Check for contacts
        const contacts = await getContactsByClientId(client.id);
        let selectedContactId = null;

        if (contacts.length > 0) {
            const options = contacts.map((c, i) => `${i + 1}. ${c.nome} (${c.cargo || 'Responsável'})`).join('\n');
            const choice = prompt(`Selecione o contato responsável para este projeto:\n\n${options}\n\nDigite o número ou deixe em branco para nenhum:`);
            if (choice) {
                const idx = parseInt(choice) - 1;
                if (contacts[idx]) {
                    selectedContactId = contacts[idx].id;
                }
            }
        }

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
            contacts: selectedContactId ? [contacts.find(c => c.id === selectedContactId)] : [],
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
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Clientes</h1>
                    <p className="text-slate-500">Gerencie sua base de clientes e histórico.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus size={20} /> Novo Cliente
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-700"
                        placeholder="Buscar por nome, fantasia ou CNPJ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                        title="Visualização em Grade"
                    >
                        <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                            <div className="bg-current rounded-[1px]"></div>
                            <div className="bg-current rounded-[1px]"></div>
                            <div className="bg-current rounded-[1px]"></div>
                            <div className="bg-current rounded-[1px]"></div>
                        </div>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                        title="Visualização em Lista"
                    >
                        <div className="flex flex-col gap-1 w-5 h-5 justify-center">
                            <div className="bg-current h-0.5 w-full rounded-full"></div>
                            <div className="bg-current h-0.5 w-full rounded-full"></div>
                            <div className="bg-current h-0.5 w-full rounded-full"></div>
                        </div>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-slate-400">Carregando diretório...</div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map(client => (
                                <div
                                    key={client.id}
                                    onClick={() => handleOpenModal(client)}
                                    className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow p-5 flex flex-col justify-between h-full group cursor-pointer ring-offset-2 hover:ring-2 hover:ring-amber-500/20"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-lg uppercase">
                                                {client.empresa_nome.charAt(0)}
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={(e) => handleDelete(e, client.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-300 hover:text-red-600 transition-colors">
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
                                                <div onClick={e => e.stopPropagation()} className="contents">
                                                    <a href={client.social_instagram} target="_blank" rel="noreferrer" className="text-pink-600 bg-pink-50 p-1.5 rounded-md hover:bg-pink-100 transition-colors" title="Instagram">
                                                        <Instagram size={14} />
                                                    </a>
                                                </div>
                                            )}
                                            {client.social_linkedin && (
                                                <div onClick={e => e.stopPropagation()} className="contents">
                                                    <a href={client.social_linkedin} target="_blank" rel="noreferrer" className="text-blue-700 bg-blue-50 p-1.5 rounded-md hover:bg-blue-100 transition-colors" title="LinkedIn">
                                                        <Linkedin size={14} />
                                                    </a>
                                                </div>
                                            )}
                                            {client.social_site && (
                                                <div onClick={e => e.stopPropagation()} className="contents">
                                                    <a href={client.social_site} target="_blank" rel="noreferrer" className="text-slate-600 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200 transition-colors" title="Site">
                                                        <Globe size={14} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Contact Summary in Card */}
                                        <div className="pt-3 border-t border-slate-50">
                                            <div onClick={e => e.stopPropagation()} className="flex items-center justify-between">
                                                <div
                                                    className="flex -space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => handleOpenModal(client, 'contacts')}
                                                >
                                                    {allContacts.filter(cont => cont.client_id === client.id).slice(0, 3).map(cont => (
                                                        <div key={cont.id} className="h-7 w-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase" title={cont.nome}>
                                                            {cont.nome.charAt(0)}
                                                        </div>
                                                    ))}
                                                    {allContacts.filter(cont => cont.client_id === client.id).length > 3 && (
                                                        <div className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                            +{allContacts.filter(cont => cont.client_id === client.id).length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                                <span
                                                    className="text-[10px] font-bold text-slate-400 uppercase tracking-tight cursor-pointer hover:text-amber-600 transition-colors"
                                                    onClick={() => handleOpenModal(client, 'contacts')}
                                                >
                                                    {allContacts.filter(cont => cont.client_id === client.id).length} Contatos
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 mt-4">
                                        <button
                                            onClick={(e) => startNewProject(e, client)}
                                            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow hover:shadow-lg"
                                        >
                                            <FileText size={16} /> Lançar Novo Projeto
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Cliente</th>
                                        <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Localização</th>
                                        <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Contatos Primários</th>
                                        <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(client => (
                                        <tr
                                            key={client.id}
                                            onClick={() => handleOpenModal(client)}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                        >
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{client.empresa_nome}</div>
                                                <div className="text-xs text-slate-500">{client.nome_fantasia}</div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{client.cnpj}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-slate-700">{client.cidade || '-'}</div>
                                                <div className="text-xs text-slate-400">{client.uf || '-'}</div>
                                            </td>
                                            <td className="p-4" onClick={(e) => { e.stopPropagation(); handleOpenModal(client, 'contacts'); }}>
                                                <div className="flex flex-col gap-1">
                                                    {allContacts.filter(cont => cont.client_id === client.id).slice(0, 2).map(cont => (
                                                        <div key={cont.id} className="flex items-center gap-2 hover:bg-slate-100 rounded p-1 transition-colors">
                                                            <div className="text-xs font-medium text-slate-700">{cont.nome}</div>
                                                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                                {cont.social_whatsapp && (
                                                                    <a href={`https://wa.me/${cont.social_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-500 hover:scale-110 transition-transform">
                                                                        <MessageCircle size={12} />
                                                                    </a>
                                                                )}
                                                                {cont.email && (
                                                                    <button onClick={(e) => handleCopyEmail(e, cont.email!)} className="text-slate-400 hover:text-blue-500 transition-colors">
                                                                        <Mail size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {allContacts.filter(cont => cont.client_id === client.id).length > 2 && (
                                                        <div className="text-[10px] text-slate-400 font-bold px-1">+{allContacts.filter(cont => cont.client_id === client.id).length - 2} mais</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 items-center">
                                                    <button
                                                        onClick={(e) => startNewProject(e, client)}
                                                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-1 shadow-sm"
                                                    >
                                                        <Plus size={12} /> Projeto
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(e, client.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
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

                        <div className="flex border-b border-slate-100 px-6">
                            <button
                                onClick={() => setActiveModalTab('info')}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeModalTab === 'info' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <div className="flex items-center gap-2"><Briefcase size={16} /> Informações</div>
                            </button>
                            <button
                                onClick={() => setActiveModalTab('contacts')}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeModalTab === 'contacts' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <div className="flex items-center gap-2"><Users size={16} /> Contatos ({clientContacts.length})</div>
                            </button>
                        </div>

                        {activeModalTab === 'info' ? (
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Razão Social *</label>
                                        <input required className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={currentClient.empresa_nome} onChange={e => setCurrentClient({ ...currentClient, empresa_nome: e.target.value })} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Fantasia</label>
                                        <input className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={currentClient.nome_fantasia || ''} onChange={e => setCurrentClient({ ...currentClient, nome_fantasia: e.target.value })} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label>
                                        <input className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={currentClient.cnpj || ''} onChange={e => setCurrentClient({ ...currentClient, cnpj: e.target.value })} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade / UF</label>
                                        <div className="flex gap-2">
                                            <input className="w-2/3 border p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Cidade" value={currentClient.cidade || ''} onChange={e => setCurrentClient({ ...currentClient, cidade: e.target.value })} />
                                            <input className="w-1/3 border p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" placeholder="UF" value={currentClient.uf || ''} onChange={e => setCurrentClient({ ...currentClient, uf: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Globe size={16} /> Presença Digital & Links</p>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instagram (URL)</label>
                                            <input className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={currentClient.social_instagram || ''} onChange={e => setCurrentClient({ ...currentClient, social_instagram: e.target.value })} />
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LinkedIn (URL)</label>
                                            <input className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={currentClient.social_linkedin || ''} onChange={e => setCurrentClient({ ...currentClient, social_linkedin: e.target.value })} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site (URL)</label>
                                            <input className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={currentClient.social_site || ''} onChange={e => setCurrentClient({ ...currentClient, social_site: e.target.value })} />
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
                                                    className="w-full text-xs border p-2 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                                                    placeholder="Nome (Ex: Mídia Kit)"
                                                    value={tempLink.label}
                                                    onChange={e => setTempLink({ ...tempLink, label: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    className="w-full text-xs border p-2 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                                                    placeholder="URL (https://...)"
                                                    value={tempLink.url}
                                                    onChange={e => setTempLink({ ...tempLink, url: e.target.value })}
                                                />
                                            </div>
                                            <button type="button" onClick={addLink} className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 transition-colors">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-100 mt-auto">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg text-slate-600 font-bold hover:bg-slate-100">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="px-6 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all">
                                        Salvar Cliente
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-6 flex flex-col min-h-[500px] overflow-y-auto max-h-[80vh]">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Users className="text-amber-500" size={20} /> Listagem de Contatos
                                    </h3>
                                    {!editingContact || editingContact.id ? (
                                        <button
                                            type="button"
                                            onClick={startNewContact}
                                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-amber-700 transition-all shadow-md shadow-amber-600/10"
                                        >
                                            <Plus size={16} /> Novo Contato
                                        </button>
                                    ) : null}
                                </div>

                                <div className="space-y-4">
                                    {/* New Contact Form (if creating) */}
                                    {editingContact && !clientContacts.find(c => c.id === editingContact.id) && (
                                        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-top-4 duration-300">
                                            {renderContactForm()}
                                        </div>
                                    )}

                                    {clientContacts.length === 0 && !editingContact && (
                                        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                            <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-300 mb-3 shadow-sm">
                                                <Users size={24} />
                                            </div>
                                            <p className="text-slate-400 font-medium">Nenhum contato cadastrado.</p>
                                        </div>
                                    )}

                                    {clientContacts.map(contact => {
                                        const isEditing = editingContact?.id === contact.id;
                                        return (
                                            <div key={contact.id} className={`group border-2 transition-all rounded-xl overflow-hidden ${isEditing ? 'border-amber-500 shadow-xl' : 'border-slate-100 hover:border-amber-200 hover:shadow-md bg-white'}`}>
                                                {isEditing ? (
                                                    renderContactForm()
                                                ) : (
                                                    <div
                                                        className="p-4 cursor-pointer flex justify-between items-center"
                                                        onClick={() => setEditingContact({ ...contact })}
                                                    >
                                                        <div className="flex gap-4 items-center">
                                                            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold uppercase transition-transform group-hover:scale-110">
                                                                {contact.nome.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                                    {contact.nome}
                                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal">{contact.cargo || 'Responsável'}</span>
                                                                </div>
                                                                <div className="flex gap-3 mt-1.5" onClick={e => e.stopPropagation()}>
                                                                    {/* Quick Actions */}
                                                                    {contact.social_whatsapp && (
                                                                        <a
                                                                            href={`https://wa.me/${contact.social_whatsapp.replace(/\D/g, '')}`}
                                                                            target="_blank" rel="noreferrer"
                                                                            className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full hover:bg-emerald-600 hover:text-white transition-colors"
                                                                        >
                                                                            <MessageCircle size={12} /> WhatsApp
                                                                        </a>
                                                                    )}
                                                                    {contact.email && (
                                                                        <button
                                                                            onClick={(e) => handleCopyEmail(e, contact.email!)}
                                                                            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
                                                                        >
                                                                            <Mail size={12} /> Copiar Email
                                                                        </button>
                                                                    )}
                                                                    {contact.telefone && (
                                                                        <a
                                                                            href={`tel:${contact.telefone}`}
                                                                            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full hover:bg-slate-800 hover:text-white transition-colors"
                                                                        >
                                                                            <Phone size={12} /> Ligar
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); setEditingContact({ ...contact }); }}
                                                                className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }}
                                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
