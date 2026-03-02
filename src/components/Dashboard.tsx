import React, { useState, useMemo, useEffect } from 'react';
import { Client, MONTHS, Status, AppSettings } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { SettingsPanel } from './SettingsPanel';
import { Search, Plus, Filter, MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';

// Gerar anos dinâmicos (1 ano atrás até 3 anos no futuro)
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
  
  // Filters
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [filterAtividade, setFilterAtividade] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('');
  const [filterTributacao, setFilterTributacao] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});

  // Date States
  const currentMonthIndex = new Date().getMonth();
  const [activeMonth, setActiveMonth] = useState<string>(MONTHS[currentMonthIndex]);
  const [activeYear, setActiveYear] = useState<string>(currentYearNum.toString());

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: true });
          
        if (clientsError) throw clientsError;

        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

        if (clientsData) setClients(clientsData);
        if (settingsData) {
          setSettings({
            responsaveis: settingsData.responsaveis || [],
            atividades: settingsData.atividades || [],
            prioridades: settingsData.prioridades || [],
            tributacoes: settingsData.tributacoes || [],
            empresas: settingsData.empresas || []
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados do Supabase:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Motor Lógico: Calcula se o mês está atrasado baseado na regra contábil (prazo = fim do mês seguinte)
  const getEffectiveStatus = (client: Client, monthName: string, year: string): Status => {
    const monthKey = `${monthName}-${year}`;
    const dbStatus = client.status[monthKey] || 'not_started';

    // Se já foi concluído, continua concluído
    if (dbStatus === 'completed') return 'completed';

    const monthIndex = MONTHS.indexOf(monthName);
    const targetYear = parseInt(year);

    const currentDate = new Date();
    const currentYearAbsolute = currentDate.getFullYear();
    const currentMonthAbsolute = currentDate.getMonth();

    // Transforma a data num número absoluto de meses para comparar com precisão
    // O prazo limite é o mês seguinte (monthIndex + 1)
    const absoluteTargetDeadline = (targetYear * 12) + (monthIndex + 1);
    const absoluteCurrent = (currentYearAbsolute * 12) + currentMonthAbsolute;

    // Se o mês atual passou do prazo limite e não tá concluído, vira atrasado
    if (absoluteCurrent > absoluteTargetDeadline) {
      return 'delayed';
    }

    return dbStatus as Status;
  };

  const metrics = useMemo(() => {
    let total = clients.length;
    let completed = 0;
    let pending = 0;
    let delayed = 0;

    clients.forEach(client => {
      const status = getEffectiveStatus(client, activeMonth, activeYear);
      if (status === 'completed') completed++;
      if (status === 'pending') pending++;
      if (status === 'delayed') delayed++;
    });

    return { total, completed, pending, delayed };
  }, [clients, activeMonth, activeYear]);

  const handleStatusClick = async (clientId: string, monthName: string) => {
    const clientIndex = clients.findIndex(c => c.id === clientId);
    if (clientIndex === -1) return;
    
    const client = clients[clientIndex];
    const monthKey = `${monthName}-${activeYear}`;
    
    // Pegamos o status real da tela (que já aplica o atraso automático)
    const currentEffectiveStatus = getEffectiveStatus(client, monthName, activeYear);
    let nextStatus: Status = 'not_started';
    
    // Nova esteira de cliques
    switch (currentEffectiveStatus) {
      case 'not_started': nextStatus = 'pending'; break;
      case 'pending': nextStatus = 'completed'; break;
      case 'delayed': nextStatus = 'completed'; break; // Fez atrasado
      case 'completed': nextStatus = 'not_started'; break; // Reset
    }

    const newStatusObj = { ...client.status, [monthKey]: nextStatus };

    setClients(clients.map(c => c.id === clientId ? { ...c, status: newStatusObj } : c));

    const { error } = await supabase.from('clients').update({ status: newStatusObj }).eq('id', clientId);
    if (error) console.error('Erro ao atualizar status:', error);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.empresa.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResponsavel = filterResponsavel ? client.responsavel === filterResponsavel : true;
      const matchesAtividade = filterAtividade ? client.atividade === filterAtividade : true;
      const matchesPrioridade = filterPrioridade ? client.prioridade === filterPrioridade : true;
      const matchesTributacao = filterTributacao ? client.tributacao === filterTributacao : true;
      return matchesSearch && matchesResponsavel && matchesAtividade && matchesPrioridade && matchesTributacao;
    });
  }, [clients, searchTerm, filterResponsavel, filterAtividade, filterPrioridade, filterTributacao]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({ responsavel: '', empresa: '', atividade: '', prioridade: 'A', tributacao: '', status: {} });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({});
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      const { error } = await supabase.from('clients').update({
        responsavel: formData.responsavel, empresa: formData.empresa,
        atividade: formData.atividade, prioridade: formData.prioridade, tributacao: formData.tributacao
      }).eq('id', editingClient.id);

      if (!error) setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...formData } as Client : c));
    } else {
      const newClientData = {
        responsavel: formData.responsavel, empresa: formData.empresa,
        atividade: formData.atividade, prioridade: formData.prioridade, tributacao: formData.tributacao, status: {}
      };
      const { data, error } = await supabase.from('clients').insert([newClientData]).select();
      if (!error && data) setClients([...clients, data[0] as Client]);
    }
    handleCloseModal();
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (!error) setClients(clients.filter(c => c.id !== id));
    }
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await supabase.from('settings').update({
      responsaveis: newSettings.responsaveis, atividades: newSettings.atividades,
      prioridades: newSettings.prioridades, tributacoes: newSettings.tributacoes, empresas: newSettings.empresas
    }).eq('id', 1);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium">Carregando painel de gestão...</div>;

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
                <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer">
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
          <SettingsPanel settings={settings} setSettings={handleUpdateSettings} />
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Total de Clientes</span><span className="text-3xl font-bold text-slate-800 mt-2">{metrics.total}</span></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Concluídos ({activeMonth}/{activeYear})</span><span className="text-3xl font-bold text-emerald-600 mt-2">{metrics.completed}</span></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Pendentes ({activeMonth}/{activeYear})</span><span className="text-3xl font-bold text-amber-500 mt-2">{metrics.pending}</span></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Atrasados ({activeMonth}/{activeYear})</span><span className="text-3xl font-bold text-red-500 mt-2">{metrics.delayed}</span></div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"/>
              </div>
              <div className="flex flex-wrap gap-3">
                <select value={filterResponsavel} onChange={(e) => setFilterResponsavel(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Todos Responsáveis</option>
                  {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
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
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10 w-32">Responsável</th>
                      <th className="px-4 py-3 sticky left-32 bg-slate-50 z-10 min-w-[200px]">Empresa</th>
                      <th className="px-4 py-3">Atividade</th>
                      <th className="px-4 py-3 text-center">Prioridade</th>
                      <th className="px-4 py-3">Tributação</th>
                      {MONTHS.map(month => (
                        <th key={month} className="px-3 py-3 text-center">
                          <div style={{ writingMode: 'vertical-rl' }} className="transform rotate-180 text-xs tracking-wider mx-auto">{month.toUpperCase()}</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 font-medium text-slate-700">{client.responsavel}</td>
                        <td className="px-4 py-3 sticky left-32 bg-white group-hover:bg-slate-50/50 z-10 font-medium text-slate-900">{client.empresa}</td>
                        <td className="px-4 py-3 text-slate-600">{client.atividade}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${client.prioridade === 'A' ? 'bg-emerald-100 text-emerald-700' : client.prioridade === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{client.prioridade}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{client.tributacao}</td>
                        {MONTHS.map(month => (
                          <td key={month} className="px-3 py-3 text-center">
                            <StatusIndicator status={getEffectiveStatus(client, month, activeYear)} onClick={() => handleStatusClick(client.id, month)} />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(client)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Editar"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteClient(client.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Legenda Automática:</span>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-200"></div><span>Não iniciado</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-amber-400"></div><span>Em Andamento / Pendente</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-emerald-500"></div><span>Entregue / Concluído</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500"></div><span>Atrasado (Passou do prazo legal)</span></div>
            </div>
          </>
        )}
      </div>

      {/* Modal - MANTIDO EXATAMENTE IGUAL AO SEU ORIGINAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label><select required value={formData.empresa || ''} onChange={(e) => setFormData({...formData, empresa: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"><option value="">Selecione...</option>{settings.empresas.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label><select required value={formData.responsavel || ''} onChange={(e) => setFormData({...formData, responsavel: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"><option value="">Selecione...</option>{settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Atividade</label><select required value={formData.atividade || ''} onChange={(e) => setFormData({...formData, atividade: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"><option value="">Selecione...</option>{settings.atividades.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label><select required value={formData.prioridade || ''} onChange={(e) => setFormData({...formData, prioridade: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"><option value="">Selecione...</option>{settings.prioridades.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Tributação</label><select required value={formData.tributacao || ''} onChange={(e) => setFormData({...formData, tributacao: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"><option value="">Selecione...</option>{settings.tributacoes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={handleCloseModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button><button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">Salvar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
