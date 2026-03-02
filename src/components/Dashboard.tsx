/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Client, MONTHS, Status, AppSettings, StatusRecord } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { SettingsPanel } from './SettingsPanel';
import { Search, Plus, ArrowUpDown, Edit2, Trash2, X, UserX, UserCheck } from 'lucide-react';
import { supabase } from '../supabase';

const currentYearNum = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYearNum - 1 + i).toString());

export function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    responsaveis: [], atividades: [], prioridades: [], tributacoes: [], empresas: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false); // Toggle para ver empresas inativadas
  
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [filterAtividade, setFilterAtividade] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('');
  const [filterTributacao, setFilterTributacao] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Client, direction: 'asc' | 'desc' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const currentMonthIndex = new Date().getMonth();
  const [activeMonth, setActiveMonth] = useState<string>(MONTHS[currentMonthIndex]);
  const [activeYear, setActiveYear] = useState<string>(currentYearNum.toString());

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: clientsData } = await supabase.from('clients').select('*').order('empresa', { ascending: true });
        const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (clientsData) setClients(clientsData);
        if (settingsData) setSettings(settingsData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // SOLICITAÇÃO: Filtro de responsáveis dinâmico (apenas quem tem empresa ativa vinculada)
  const activeAnalysts = useMemo(() => {
    const list = clients
      .filter(c => !c.is_inactive)
      .map(c => c.responsavel);
    return [...new Set(list)].sort();
  }, [clients]);

  // Lógica de Status com suporte a HISTÓRICO
  const getStatusInfo = (client: Client, month: string, year: string): StatusRecord => {
    const key = `${month}-${year}`;
    const data = client.status[key];
    if (data && typeof data === 'object') return data as StatusRecord;
    return { 
      val: (data as Status) || 'not_started', 
      resp: client.responsavel 
    };
  };

  const metrics = useMemo(() => {
    const activeClients = clients.filter(c => !c.is_inactive);
    const totalGeral = clients.length; // Card solicitado: Ativos + Sem Movimento + Inativos
    const totalOperacionais = activeClients.filter(c => !c.sem_movimento).length;
    let comp = 0; let pend = 0; let del = 0;

    activeClients.forEach(client => {
      if (client.sem_movimento) return;
      const info = getStatusInfo(client, activeMonth, activeYear);
      if (info.val === 'completed') comp++;
      else if (info.val === 'pending') pend++;
      // Lógica de atraso simplificada para a métrica
      const monthIdx = MONTHS.indexOf(activeMonth);
      const deadline = (parseInt(activeYear) * 12) + (monthIdx + 1);
      const current = (new Date().getFullYear() * 12) + new Date().getMonth();
      if (current > deadline && info.val !== 'completed') del++;
    });

    return { totalGeral, totalOperacionais, comp, pend, del };
  }, [clients, activeMonth, activeYear]);

  const handleStatusClick = async (clientId: string, monthName: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || client.sem_movimento || client.is_inactive) return;
    
    const monthKey = `${monthName}-${activeYear}`;
    const current = getStatusInfo(client, monthName, activeYear);
    let next: Status = 'not_started';
    
    if (current.val === 'not_started') next = 'pending';
    else if (current.val === 'pending') next = 'completed';
    else if (current.val === 'completed') next = 'not_started';

    // Grava o analista da época no registro (Histórico)
    const newRecord: StatusRecord = { val: next, resp: client.responsavel };
    const newStatusObj = { ...client.status, [monthKey]: newRecord };

    setClients(clients.map(c => c.id === clientId ? { ...c, status: newStatusObj } : c));
    await supabase.from('clients').update({ status: newStatusObj }).eq('id', clientId);
  };

  const handleSort = (key: keyof Client) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredClients = useMemo(() => {
    let result = clients.filter(c => {
      const matchesSearch = c.empresa.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResp = filterResponsavel ? c.responsavel === filterResponsavel : true;
      const matchesAtiv = filterAtividade ? c.atividade === filterAtividade : true;
      const matchesPrio = filterPrioridade ? c.prioridade === filterPrioridade : true;
      const matchesTrib = filterTributacao ? c.tributacao === filterTributacao : true;
      const matchesInactive = showInactive ? true : !c.is_inactive;
      return matchesSearch && matchesResp && matchesAtiv && matchesPrio && matchesTrib && matchesInactive;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]?.toString() || '';
        const bVal = b[sortConfig.key]?.toString() || '';
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return result;
  }, [clients, searchTerm, filterResponsavel, filterAtividade, filterPrioridade, filterTributacao, sortConfig, showInactive]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client); setFormData(client);
    } else {
      setEditingClient(null); setFormData({ responsavel: '', empresa: '', atividade: '', prioridade: 'A', tributacao: '', sem_movimento: false, is_inactive: false, status: {} });
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      await supabase.from('clients').update(formData).eq('id', editingClient.id);
      setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...formData } as Client : c));
    } else {
      const { data } = await supabase.from('clients').insert([formData]).select();
      if (data) setClients([...clients, data[0] as Client]);
    }
    setIsModalOpen(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">Carregando painel de gestão...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel de Status Contábil</h1>
            <p className="text-slate-500 text-sm mt-1">Gestão de clientes e atividades da equipe</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {activeTab === 'dashboard' && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase">Período:</label>
                <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer uppercase">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="text-slate-300">/</span>
                <select value={activeYear} onChange={(e) => setActiveYear(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Painel</button>
              <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Configurações</button>
            </div>
            {activeTab === 'dashboard' && (
              <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"><Plus size={18} /> Novo Cliente</button>
            )}
          </div>
        </div>

        {activeTab === 'settings' ? (
          <SettingsPanel settings={settings} setSettings={(s) => { setSettings(s); supabase.from('settings').update(s).eq('id', 1); }} />
        ) : (
          <>
            {/* Cards de Métricas - Identidade Visual Mantida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Geral</span>
                <div className="text-3xl font-bold text-slate-800 mt-2">{metrics.totalGeral}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-l-indigo-500">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Clientes Ativos</span>
                <div className="text-3xl font-bold text-indigo-600 mt-2">{metrics.totalOperacionais}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Concluídos</span>
                <div className="text-3xl font-bold text-emerald-600 mt-2">{metrics.comp}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-l-amber-500">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pendentes</span>
                <div className="text-3xl font-bold text-amber-500 mt-2">{metrics.pend}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-l-red-500">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Atrasados</span>
                <div className="text-3xl font-bold text-red-500 mt-2">{metrics.del}</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
              </div>
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                {/* Filtro de Responsável Dinâmico */}
                <select value={filterResponsavel} onChange={(e) => setFilterResponsavel(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="">Analistas com Clientes</option>
                  {activeAnalysts.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={filterAtividade} onChange={(e) => setFilterAtividade(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"><option value="">Atividades</option>{settings.atividades.map(a => <option key={a} value={a}>{a}</option>)}</select>
                <select value={filterPrioridade} onChange={(e) => setFilterPrioridade(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"><option value="">Prioridades</option>{settings.prioridades.map(p => <option key={p} value={p}>{p}</option>)}</select>
                <select value={filterTributacao} onChange={(e) => setFilterTributacao(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"><option value="">Tributações</option>{settings.tributacoes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                
                <button 
                  onClick={() => setShowInactive(!showInactive)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showInactive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {showInactive ? <UserCheck size={16}/> : <UserX size={16}/>}
                  {showInactive ? "Ocultar Inativos" : "Ver Ex-Clientes"}
                </button>
              </div>
            </div>

            {/* Tabela com ROLAGEM LATERAL e COLUNAS FIXAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="w-full text-left text-sm whitespace-nowrap table-fixed border-separate border-spacing-0">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4 sticky left-0 bg-slate-50 z-20 w-[140px] cursor-pointer" onClick={() => handleSort('responsavel')}><div className="flex items-center gap-1">Resp. <ArrowUpDown size={12}/></div></th>
                      <th className="px-4 py-4 sticky left-[140px] bg-slate-50 z-20 w-[220px] cursor-pointer border-r border-slate-200" onClick={() => handleSort('empresa')}><div className="flex items-center gap-1">Empresa <ArrowUpDown size={12}/></div></th>
                      <th className="px-2 py-4 text-center w-[50px]">Mov.</th>
                      <th className="px-4 py-4 w-[140px]">Ação</th>
                      <th className="px-2 py-4 text-center w-[60px]">Prior.</th>
                      <th className="px-4 py-4 w-[130px] border-r border-slate-200">Tributação</th>
                      {MONTHS.map(month => (
                        <th key={month} className="px-0 py-4 text-center w-[55px] border-l border-slate-100">
                          <div style={{ writingMode: 'vertical-rl' }} className="mx-auto transform rotate-180">{month}</div>
                        </th>
                      ))}
                      <th className="px-4 py-4 text-right w-[90px] sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className={`hover:bg-slate-50 group ${client.is_inactive ? 'bg-red-50/20 opacity-70' : client.sem_movimento ? 'bg-slate-50/50' : ''}`}>
                        <td className="px-4 py-3 sticky left-0 z-10 font-bold text-slate-700 bg-white group-hover:bg-slate-50">{client.responsavel}</td>
                        <td className="px-4 py-3 sticky left-[140px] z-10 font-bold text-slate-900 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-2">
                            {client.empresa}
                            {client.is_inactive && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">INATIVO</span>}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center"><input type="checkbox" checked={client.sem_movimento || false} onChange={async (e) => { const v = e.target.checked; setClients(clients.map(c => c.id === client.id ? {...c, sem_movimento: v} : c)); await supabase.from('clients').update({ sem_movimento: v }).eq('id', client.id); }} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" /></td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{client.atividade}</td>
                        <td className="px-2 py-3 text-center"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${client.prioridade === 'A' ? 'bg-emerald-100 text-emerald-700' : client.prioridade === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{client.prioridade}</span></td>
                        <td className="px-4 py-3 text-slate-600 text-xs border-r border-slate-200">{client.tributacao}</td>
                        {MONTHS.map(month => {
                          const info = getStatusInfo(client, month, activeYear);
                          return (
                            <td key={month} className="px-0 py-3 text-center border-l border-slate-50">
                              {client.is_inactive ? <div className="w-1.5 h-1.5 bg-slate-200 rounded-full mx-auto"/> : client.sem_movimento ? <div className="text-[8px] font-bold text-slate-300">S/M</div> : (
                                <StatusIndicator 
                                  status={info.val} 
                                  onClick={() => handleStatusClick(client.id, month)} 
                                  title={`Responsável: ${info.resp}`} // Exibe quem concluiu no hover
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleOpenModal(client)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={15} /></button>
                            <button onClick={async () => { if(confirm('Excluir definitivamente?')) { await supabase.from('clients').delete().eq('id', client.id); setClients(clients.filter(c => c.id !== client.id)); } }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              <span className="text-slate-800 font-bold">Legenda:</span>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200"></div><span>Não iniciado</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div><span>Pendente</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span>Concluído</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Atrasado</span></div>
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4 text-red-600"><span>* Clique para alternar status</span></div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Edição de Empresa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{editingClient ? 'Editar Empresa' : 'Nova Empresa'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Empresa</label>
                <input 
                  type="text" required
                  value={formData.empresa || ''}
                  onChange={(e) => setFormData({...formData, empresa: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-700 uppercase"
                  placeholder="RAZÃO SOCIAL"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Analista Responsável</label>
                <select required value={formData.responsavel || ''} onChange={(e) => setFormData({...formData, responsavel: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium">
                  <option value="">Selecione o Analista...</option>
                  {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Atividade</label>
                  <select required value={formData.atividade || ''} onChange={(e) => setFormData({...formData, atividade: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">Selecione...</option>
                    {settings.atividades.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                  <select required value={formData.prioridade || ''} onChange={(e) => setFormData({...formData, prioridade: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20">
                    {settings.prioridades.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tributação</label>
                <select required value={formData.tributacao || ''} onChange={(e) => setFormData({...formData, tributacao: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20">
                   <option value="">Selecione...</option>
                   {settings.tributacoes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer group hover:bg-slate-100 transition-colors">
                  <input type="checkbox" checked={formData.sem_movimento || false} onChange={(e) => setFormData({...formData, sem_movimento: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm font-medium text-slate-700">Empresa sem movimento</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100 cursor-pointer group hover:bg-red-50 transition-colors">
                  <input type="checkbox" checked={formData.is_inactive || false} onChange={(e) => setFormData({...formData, is_inactive: e.target.checked})} className="w-4 h-4 text-red-600 rounded" />
                  <span className="text-sm font-medium text-red-700">Marcar como Ex-Cliente (Inativo)</span>
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold uppercase text-xs hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-xs rounded-xl shadow-md transition-all">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
