/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Client, MONTHS, Status, AppSettings, StatusRecord } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { SettingsPanel } from './SettingsPanel';
import { Search, Plus, ArrowUpDown, Edit2, Trash2, X, UserCheck, EyeOff, Download } from 'lucide-react';
import { supabase } from '../supabase';

const currentYearNum = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYearNum - 1 + i).toString());

interface DashboardProps {
  isAdmin: boolean;
}

export function Dashboard({ isAdmin }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    responsaveis: [], atividades: [], prioridades: [], tributacoes: [], empresas: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
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

  const activeAnalysts = useMemo(() => {
    const list = clients.filter(c => !c.is_inactive).map(c => c.responsavel);
    return [...new Set(list)].sort();
  }, [clients]);

  const getStatusInfo = (client: Client, monthName: string, year: string): StatusRecord => {
    const key = `${monthName}-${year}`;
    const data = client.status[key];
    if (data && typeof data === 'object') {
      const record = data as StatusRecord;
      if (record.val !== 'completed') {
        const monthIndex = MONTHS.indexOf(monthName);
        const targetYear = parseInt(year);
        const absoluteTargetDeadline = (targetYear * 12) + (monthIndex + 1);
        const absoluteCurrent = (new Date().getFullYear() * 12) + new Date().getMonth();
        if (absoluteCurrent > absoluteTargetDeadline) return { val: 'delayed', resp: record.resp };
      }
      return record;
    }
    
    let val = (data as Status) || 'not_started';
    if (val !== 'completed') {
      const monthIndex = MONTHS.indexOf(monthName);
      const targetYear = parseInt(year);
      const absoluteTargetDeadline = (targetYear * 12) + (monthIndex + 1);
      const absoluteCurrent = (new Date().getFullYear() * 12) + new Date().getMonth();
      if (absoluteCurrent > absoluteTargetDeadline) val = 'delayed';
    }
    return { val, resp: client.responsavel };
  };

  const metrics = useMemo(() => {
    const activeClients = clients.filter(c => !c.is_inactive);
    let totalGeral = clients.length; 
    let totalAtivos = 0; 
    let completed = 0; 
    let pending = 0; 
    let delayed = 0;

    activeClients.forEach(client => {
      if (client.sem_movimento) return;
      totalAtivos++;
      const info = getStatusInfo(client, activeMonth, activeYear);
      if (info.val === 'completed') completed++;
      if (info.val === 'pending') pending++;
      if (info.val === 'delayed') delayed++;
    });
    return { totalGeral, totalAtivos, completed, pending, delayed };
  }, [clients, activeMonth, activeYear]);

  const handleStatusClick = async (clientId: string, monthName: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || client.sem_movimento || client.is_inactive) return;
    
    const monthKey = `${monthName}-${activeYear}`;
    const current = getStatusInfo(client, monthName, activeYear);
    let next: Status = 'not_started';
    
    if (current.val === 'not_started') next = 'pending';
    else if (current.val === 'pending') next = 'completed';
    else if (current.val === 'delayed') next = 'completed';
    else if (current.val === 'completed') next = 'not_started';

    const newRecord: StatusRecord = { val: next, resp: client.responsavel };
    const newStatusObj = { ...client.status, [monthKey]: newRecord };

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
      const matchesInactive = showInactive ? true : !client.is_inactive;
      return matchesSearch && matchesResponsavel && matchesAtividade && matchesPrioridade && matchesTributacao && matchesInactive;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]?.toString() || '';
        const bVal = b[sortConfig.key]?.toString() || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [clients, searchTerm, filterResponsavel, filterAtividade, filterPrioridade, filterTributacao, sortConfig, showInactive]);

  const handleExportCSV = () => {
    const headers = ['Responsável', 'Empresa', 'Atividade', 'Prioridade', 'Tributação', 'Tempo Est. (Dias)', 'Status Empresa'];
    
    const rows = filteredAndSortedClients.map(c => {
      let statusEmpresa = 'Ativa';
      if (c.is_inactive) statusEmpresa = 'Inativa (Ex-cliente)';
      else if (c.sem_movimento) statusEmpresa = 'Sem Movimento';

      return [
        c.responsavel || '',
        c.empresa || '',
        c.atividade || '',
        c.prioridade || '',
        c.tributacao || '',
        c.tempo_estimado?.toString() || '0',
        statusEmpresa
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `base_clientes_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({ responsavel: '', empresa: '', atividade: '', prioridade: 'A', tributacao: '', sem_movimento: false, is_inactive: false, tempo_estimado: 0, status: {} });
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium">Carregando painel de gestão...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
      <div className="max-w-[1600px] w-full mx-auto space-y-6 flex flex-col flex-1 h-full">
        
        {/* Header Superior */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
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
              {isAdmin && (
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Configurações</button>
              )}
            </div>
            
            {activeTab === 'dashboard' && (
              <div className="flex items-center gap-2">
                <button onClick={handleExportCSV} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm" title="Exportar dados cadastrais">
                  <Download size={18} /> Exportar
                </button>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                  <Plus size={18} /> Novo Cliente
                </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'settings' && isAdmin ? (
          <SettingsPanel settings={settings} setSettings={async (s) => { setSettings(s); await supabase.from('settings').update(s).eq('id', 1); }} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Total Geral</span><span className="text-3xl font-bold text-slate-800 mt-2">{metrics.totalGeral}</span></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Clientes Ativos</span><span className="text-3xl font-bold text-orange-500 mt-2">{metrics.totalAtivos}</span></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Concluídos ({activeMonth}/{activeYear})</span><span className="text-3xl font-bold text-emerald-600 mt-2">{metrics.completed}</span></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Pendentes ({activeMonth}/{activeYear})</span><span className="text-3xl font-bold text-amber-500 mt-2">{metrics.pending}</span></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Atrasados ({activeMonth}/{activeYear})</span><span className="text-3xl font-bold text-red-500 mt-2">{metrics.delayed}</span></div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"/>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <select value={filterResponsavel} onChange={(e) => setFilterResponsavel(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Responsável</option>
                  {activeAnalysts.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={filterAtividade} onChange={(e) => setFilterAtividade(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Todas Atividades</option>
                  {settings.atividades.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={filterPrioridade} onChange={(e) => setFilterPrioridade(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Todas Prioridades</option>
                  {settings.prioridades.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={filterTributacao} onChange={(e) => setFilterTributacao(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Todas Tributações</option>
                  {settings.tributacoes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                
                <button 
                  onClick={() => setShowInactive(!showInactive)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${showInactive ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  {showInactive ? <EyeOff size={16}/> : <UserCheck size={16}/>}
                  {showInactive ? "Ocultar Inativos" : "Ver Ex-Clientes"}
                </button>
              </div>
            </div>

            {/* TABELA COM ROLAGEM FIXA E SOMBRA DE TRANSIÇÃO */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-[300px]">
              <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-300 flex-1 relative">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-30 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 sticky left-0 z-40 bg-slate-50 w-32 border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('responsavel')}>
                        <div className="flex items-center gap-1">Responsável <ArrowUpDown size={14} className="text-slate-400"/></div>
                      </th>
                      {/* Efeito de Sombra (Drop Shadow) na coluna Empresa */}
                      <th className="px-4 py-3 sticky left-[128px] z-40 bg-slate-50 min-w-[200px] shadow-[6px_0px_6px_-4px_rgba(0,0,0,0.1)] border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('empresa')}>
                        <div className="flex items-center gap-1">Empresa <ArrowUpDown size={14} className="text-slate-400"/></div>
                      </th>
                      <th className="px-4 py-3 text-center w-24 border-r border-slate-100" title="Marcar se a empresa está sem movimento">S/ Mov.</th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('atividade')}>
                        <div className="flex items-center gap-1">Atividade <ArrowUpDown size={14} className="text-slate-400"/></div>
                      </th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('prioridade')}>
                        <div className="flex items-center justify-center gap-1">Prior. <ArrowUpDown size={14} className="text-slate-400"/></div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors border-r border-slate-100" onClick={() => handleSort('tributacao')}>
                        <div className="flex items-center gap-1">Tributação <ArrowUpDown size={14} className="text-slate-400"/></div>
                      </th>
                      {MONTHS.map(month => (
                        <th key={month} className="px-3 py-3 text-center">
                          <div style={{ writingMode: 'vertical-rl' }} className="transform rotate-180 text-xs tracking-wider mx-auto">{month.toUpperCase()}</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedClients.map((client) => (
                      <tr key={client.id} className={`hover:bg-slate-50 transition-colors group ${client.is_inactive ? 'bg-red-50/30 hover:bg-red-50' : client.sem_movimento ? 'opacity-60 bg-slate-50' : ''}`}>
                        
                        {/* Células Fixas com fundo branco e tratamento de Hover via CSS */}
                        <td className={`px-4 py-3 sticky left-0 z-20 font-medium text-slate-700 border-r border-slate-100 transition-colors ${client.is_inactive ? 'bg-red-50/30 group-hover:bg-red-50' : 'bg-white group-hover:bg-slate-50'}`}>
                          {client.responsavel}
                        </td>
                        <td className={`px-4 py-3 sticky left-[128px] z-20 font-medium text-slate-900 border-r border-slate-200 shadow-[6px_0px_6px_-4px_rgba(0,0,0,0.1)] transition-colors ${client.is_inactive ? 'bg-red-50/30 group-hover:bg-red-50' : 'bg-white group-hover:bg-slate-50'}`}>
                          <div className="flex items-center gap-2">
                            {client.empresa}
                            {client.is_inactive && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md">INATIVO</span>}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center border-r border-slate-100">
                          <input type="checkbox" checked={client.sem_movimento || false} onChange={(e) => handleToggleSemMovimento(client.id, e.target.checked)} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 cursor-pointer" title="Marcar como Sem Movimento" />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{client.atividade}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${client.prioridade === 'A' ? 'bg-emerald-100 text-emerald-700' : client.prioridade === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{client.prioridade}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100">{client.tributacao}</td>
                        {MONTHS.map(month => {
                          const info = getStatusInfo(client, month, activeYear);
                          return (
                            <td key={month} className="px-3 py-3 text-center">
                              {client.is_inactive ? (
                                <div className="mx-auto w-2 h-2 bg-slate-200 rounded-full" />
                              ) : client.sem_movimento ? (
                                <div className="mx-auto w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 text-slate-400 text-[10px] font-bold" title="Sem Movimento">S/M</div>
                              ) : (
                                <StatusIndicator 
                                  status={info.val} 
                                  onClick={() => handleStatusClick(client.id, month)}
                                  title={info.val === 'completed' ? `Concluído por: ${info.resp}` : ''}
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(client)} className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors" title="Editar"><Edit2 size={16} /></button>
                            <button onClick={async () => { if(window.confirm('Excluir definitivamente este cliente?')) { await supabase.from('clients').delete().eq('id', client.id); setClients(clients.filter(c => c.id !== client.id)); } }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 lg:gap-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-sm text-slate-600 shrink-0">
              <span className="font-medium text-slate-800">Legenda:</span>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-200"></div><span>Não iniciado</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-amber-400"></div><span>Em Andamento</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-emerald-500"></div><span>Concluído</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500"></div><span>Atrasado</span></div>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <input type="text" required value={formData.empresa || ''} onChange={(e) => setFormData({...formData, empresa: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none uppercase font-bold" placeholder="Nome da Empresa" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                <select required value={formData.responsavel || ''} onChange={(e) => setFormData({...formData, responsavel: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500">
                  <option value="">Selecione...</option>
                  {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Atividade</label>
                  <select required value={formData.atividade || ''} onChange={(e) => setFormData({...formData, atividade: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none">
                    <option value="">Selecione...</option>
                    {settings.atividades.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                  <select required value={formData.prioridade || ''} onChange={(e) => setFormData({...formData, prioridade: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none">
                    <option value="">Selecione...</option>
                    {settings.prioridades.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tributação</label>
                  <select required value={formData.tributacao || ''} onChange={(e) => setFormData({...formData, tributacao: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none">
                    <option value="">Selecione...</option>
                    {settings.tributacoes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                    Tempo Est. (Dias)
                    {!isAdmin && <span className="text-[10px] bg-red-50 text-red-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Bloqueado</span>}
                  </label>
                  <input 
                    type="number" step="0.5" min="0" 
                    value={formData.tempo_estimado || ''} 
                    onChange={(e) => setFormData({...formData, tempo_estimado: parseFloat(e.target.value) || 0})} 
                    disabled={!isAdmin} 
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none ${!isAdmin ? 'bg-slate-100 cursor-not-allowed text-slate-400 opacity-70' : 'focus:border-orange-500'}`}
                    placeholder={isAdmin ? "Ex: 1.5" : "Restrito"}
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <input type="checkbox" id="sem_movimento" checked={formData.sem_movimento || false} onChange={(e) => setFormData({...formData, sem_movimento: e.target.checked})} className="w-4 h-4 text-orange-500 rounded border-slate-300 cursor-pointer focus:ring-orange-500" />
                  <label htmlFor="sem_movimento" className="text-sm font-medium text-slate-700 cursor-pointer">Marcar empresa como "Sem Movimento"</label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors shadow-sm">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
