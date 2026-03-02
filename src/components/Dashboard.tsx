/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Client, MONTHS, Status, AppSettings } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { SettingsPanel } from './SettingsPanel';
import { Search, Plus, ArrowUpDown, Edit2, Trash2, X } from 'lucide-react';
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
        const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: true });
        const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (clientsData) setClients(clientsData);
        if (settingsData) setSettings(settingsData);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getEffectiveStatus = (client: Client, monthName: string, year: string): Status => {
    const monthKey = `${monthName}-${year}`;
    const dbStatus = client.status[monthKey] || 'not_started';
    if (dbStatus === 'completed') return 'completed';
    const monthIndex = MONTHS.indexOf(monthName);
    const targetYear = parseInt(year);
    const absoluteTargetDeadline = (targetYear * 12) + (monthIndex + 1);
    const absoluteCurrent = (new Date().getFullYear() * 12) + new Date().getMonth();
    if (absoluteCurrent > absoluteTargetDeadline) return 'delayed';
    return dbStatus as Status;
  };

  const metrics = useMemo(() => {
    let totalGeral = clients.length; // Solicitação 1: Total Geral
    let totalAtivos = 0; 
    let completed = 0; 
    let pending = 0; 
    let delayed = 0;

    clients.forEach(client => {
      if (client.sem_movimento) return;
      totalAtivos++;
      const status = getEffectiveStatus(client, activeMonth, activeYear);
      if (status === 'completed') completed++;
      if (status === 'pending') pending++;
      if (status === 'delayed') delayed++;
    });
    return { totalGeral, totalAtivos, completed, pending, delayed };
  }, [clients, activeMonth, activeYear]);

  const handleStatusClick = async (clientId: string, monthName: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || client.sem_movimento) return;
    const monthKey = `${monthName}-${activeYear}`;
    const currentEffectiveStatus = getEffectiveStatus(client, monthName, activeYear);
    let nextStatus: Status = 'not_started';
    switch (currentEffectiveStatus) {
      case 'not_started': nextStatus = 'pending'; break;
      case 'pending': nextStatus = 'completed'; break;
      case 'delayed': nextStatus = 'completed'; break;
      case 'completed': nextStatus = 'not_started'; break;
    }
    const newStatusObj = { ...client.status, [monthKey]: nextStatus };
    setClients(clients.map(c => c.id === clientId ? { ...c, status: newStatusObj } : c));
    await supabase.from('clients').update({ status: newStatusObj }).eq('id', clientId);
  };

  const handleToggleSemMovimento = async (clientId: string, newValue: boolean) => {
    setClients(clients.map(c => c.id === clientId ? { ...c, sem_movimento: newValue } : c));
    await supabase.from('clients').update({ sem_movimento: newValue }).eq('id', clientId);
  };

  const handleSort = (key: keyof Client) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedClients = useMemo(() => {
    let result = clients.filter(client => {
      const matchesSearch = client.empresa.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResponsavel = filterResponsavel ? client.responsavel === filterResponsavel : true;
      const matchesAtividade = filterAtividade ? client.atividade === filterAtividade : true;
      const matchesPrioridade = filterPrioridade ? client.prioridade === filterPrioridade : true;
      const matchesTributacao = filterTributacao ? client.tributacao === filterTributacao : true;
      return matchesSearch && matchesResponsavel && matchesAtividade && matchesPrioridade && matchesTributacao;
    });
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]?.toString() || '';
        const bVal = b[sortConfig.key]?.toString() || '';
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return result;
  }, [clients, searchTerm, filterResponsavel, filterAtividade, filterPrioridade, filterTributacao, sortConfig]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({ responsavel: '', empresa: '', atividade: '', prioridade: 'A', tributacao: '', sem_movimento: false, status: {} });
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      const { error } = await supabase.from('clients').update(formData).eq('id', editingClient.id);
      if (!error) setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...formData } as Client : c));
    } else {
      const { data, error } = await supabase.from('clients').insert([formData]).select();
      if (!error && data) setClients([...clients, data[0] as Client]);
    }
    setIsModalOpen(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel de Status Contábil</h1>
            <p className="text-slate-500 text-sm mt-1">Gestão de clientes e atividades da equipe</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {activeTab === 'dashboard' && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <label className="text-sm font-medium text-slate-600">Período:</label>
                <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer uppercase">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="text-slate-300">/</span>
                <select value={activeYear} onChange={(e) => setActiveYear(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Painel</button>
              <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Configurações</button>
            </div>
            {activeTab === 'dashboard' && (
              <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"><Plus size={18} /> Novo Cliente</button>
            )}
          </div>
        </div>

        {activeTab === 'settings' ? (
          <SettingsPanel settings={settings} setSettings={(s) => { setSettings(s); supabase.from('settings').update(s).eq('id', 1); }} />
        ) : (
          <>
            {/* Cards de Métricas com Total Geral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Geral</span>
                <span className="text-3xl font-bold text-slate-800 mt-2">{metrics.totalGeral}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col border-l-4 border-l-indigo-500">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Clientes Ativos</span>
                <span className="text-3xl font-bold text-indigo-600 mt-2">{metrics.totalAtivos}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col border-l-4 border-l-emerald-500">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Concluídos</span>
                <span className="text-3xl font-bold text-emerald-600 mt-2">{metrics.completed}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col border-l-4 border-l-amber-500">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pendentes</span>
                <span className="text-3xl font-bold text-amber-500 mt-2">{metrics.pending}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col border-l-4 border-l-red-500">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Atrasados</span>
                <span className="text-3xl font-bold text-red-500 mt-2">{metrics.delayed}</span>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"/>
              </div>
              <div className="flex flex-wrap gap-3">
                <select value={filterResponsavel} onChange={(e) => setFilterResponsavel(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"><option value="">Todos Responsáveis</option>{settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}</select>
                <select value={filterAtividade} onChange={(e) => setFilterAtividade(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"><option value="">Todas Atividades</option>{settings.atividades.map(a => <option key={a} value={a}>{a}</option>)}</select>
                <select value={filterPrioridade} onChange={(e) => setFilterPrioridade(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"><option value="">Todas Prioridades</option>{settings.prioridades.map(p => <option key={p} value={p}>{p}</option>)}</select>
                <select value={filterTributacao} onChange={(e) => setFilterTributacao(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"><option value="">Todas Tributações</option>{settings.tributacoes.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
            </div>

            {/* Tabela com ROLAGEM LATERAL e COLUNAS FIXAS (Solicitação 2) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="w-full text-left text-sm whitespace-nowrap table-fixed border-separate border-spacing-0">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-xs uppercase tracking-tighter">
                    <tr>
                      <th className="px-4 py-3 sticky left-0 bg-slate-50 z-20 w-[140px] cursor-pointer border-b border-slate-200" onClick={() => handleSort('responsavel')}><div className="flex items-center gap-1">Resp. <ArrowUpDown size={14}/></div></th>
                      <th className="px-4 py-3 sticky left-[140px] bg-slate-50 z-20 w-[220px] cursor-pointer border-r border-slate-200 border-b border-slate-200" onClick={() => handleSort('empresa')}><div className="flex items-center gap-1">Empresa <ArrowUpDown size={14}/></div></th>
                      <th className="px-4 py-3 text-center w-[60px] border-b border-slate-200">Mov.</th>
                      <th className="px-4 py-3 w-[150px] cursor-pointer border-b border-slate-200" onClick={() => handleSort('atividade')}>Ação</th>
                      <th className="px-4 py-3 text-center w-[70px] border-b border-slate-200">Prior.</th>
                      <th className="px-4 py-3 w-[140px] border-r border-slate-200 border-b border-slate-200">Trib.</th>
                      {MONTHS.map(month => (
                        <th key={month} className="px-3 py-3 text-center w-[55px] border-l border-slate-100 font-bold border-b border-slate-200">
                          {month}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right w-[90px] sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] border-b border-slate-200">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedClients.map((client) => (
                      <tr key={client.id} className={`hover:bg-slate-50/50 transition-colors group ${client.sem_movimento ? 'opacity-60 bg-slate-50' : ''}`}>
                        <td className="px-4 py-3 sticky left-0 z-10 font-medium text-slate-700 bg-white group-hover:bg-slate-50">{client.responsavel}</td>
                        <td className="px-4 py-3 sticky left-[140px] z-10 font-medium text-slate-900 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">{client.empresa}</td>
                        <td className="px-4 py-3 text-center"><input type="checkbox" checked={client.sem_movimento || false} onChange={(e) => handleToggleSemMovimento(client.id, e.target.checked)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" /></td>
                        <td className="px-4 py-3 text-slate-600">{client.atividade}</td>
                        <td className="px-4 py-3 text-center"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${client.prioridade === 'A' ? 'bg-emerald-100 text-emerald-700' : client.prioridade === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{client.prioridade}</span></td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-200">{client.tributacao}</td>
                        {MONTHS.map(month => (
                          <td key={month} className="px-3 py-3 text-center border-l border-slate-50">
                            {client.sem_movimento ? <div className="mx-auto w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 text-slate-400 text-[8px] font-bold">S/M</div> : <StatusIndicator status={getEffectiveStatus(client, month, activeYear)} onClick={() => handleStatusClick(client.id, month)} />}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleOpenModal(client)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => { if(window.confirm('Excluir?')) { supabase.from('clients').delete().eq('id', client.id); setClients(clients.filter(c => c.id !== client.id)); } }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                {editingClient ? (
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold uppercase">{formData.empresa}</div>
                ) : (
                  <select required value={formData.empresa || ''} onChange={(e) => setFormData({...formData, empresa: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none">
                    <option value="">Selecione...</option>
                    {settings.empresas.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                <select required value={formData.responsavel || ''} onChange={(e) => setFormData({...formData, responsavel: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none">
                  <option value="">Selecione...</option>
                  {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Atividade</label><select required value={formData.atividade || ''} onChange={(e) => setFormData({...formData, atividade: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"><option value="">Selecione...</option>{settings.atividades.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label><select required value={formData.prioridade || ''} onChange={(e) => setFormData({...formData, prioridade: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"><option value="">Selecione...</option>{settings.prioridades.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Tributação</label><select required value={formData.tributacao || ''} onChange={(e) => setFormData({...formData, tributacao: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"><option value="">Selecione...</option>{settings.tributacoes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="flex items-center gap-2 pt-2 bg-slate-50 p-3 rounded-lg border border-slate-200"><input type="checkbox" id="sem_movimento" checked={formData.sem_movimento || false} onChange={(e) => setFormData({...formData, sem_movimento: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" /><label htmlFor="sem_movimento" className="text-sm font-medium text-slate-700 cursor-pointer">Sem Movimento</label></div>
              <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">Salvar Alterações</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
