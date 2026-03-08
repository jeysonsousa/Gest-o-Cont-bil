/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Client, MONTHS, Status, AppSettings, StatusRecord, UsuarioConfig, EmpresaBase } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { Search, ArrowUpDown, UserCheck, EyeOff, Download, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase';

const currentYearNum = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYearNum - 1 + i).toString());

const currentDate = new Date();
let defaultMonthIndex = currentDate.getMonth() - 1;
let defaultYearNum = currentDate.getFullYear();

if (defaultMonthIndex < 0) {
  defaultMonthIndex = 11; 
  defaultYearNum -= 1;    
}

interface DashboardProps {
  isAdmin: boolean;
  currentDepartment: string;
}

export function Dashboard({ isAdmin, currentDepartment }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    responsaveis: [], atividades: [], prioridades: [], tributacoes: [], empresas: [], departamentos: [], empresas_base: [], metas_globais: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [filterAtividade, setFilterAtividade] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('');
  const [filterTributacao, setFilterTributacao] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Client, direction: 'asc' | 'desc' } | null>(null);

  const [activeMonth, setActiveMonth] = useState<string>(MONTHS[defaultMonthIndex]);
  const [activeYear, setActiveYear] = useState<string>(defaultYearNum.toString());

  useEffect(() => {
    async function fetchData() {
      if (!currentDepartment) return;
      try {
        setLoading(true);
        const { data: clientsData } = await supabase.from('clients')
          .select('*')
          .eq('departamento', currentDepartment)
          .order('created_at', { ascending: true });
          
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
  }, [currentDepartment]);

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
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    setClients(clients.map(c => c.id === clientId ? { ...c, sem_movimento: newValue } : c));
    await supabase.from('clients').update({ sem_movimento: newValue }).eq('id', clientId);

    const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (settingsData && settingsData.empresas_base) {
      const updatedEmpresas = settingsData.empresas_base.map((emp: EmpresaBase) => {
        if (emp.nome === client.empresa && emp.alocacoes && emp.alocacoes[currentDepartment]) {
          return {
            ...emp,
            alocacoes: { ...emp.alocacoes, [currentDepartment]: { ...emp.alocacoes[currentDepartment], sem_movimento: newValue } }
          };
        }
        return emp;
      });
      await supabase.from('settings').update({ empresas_base: updatedEmpresas }).eq('id', 1);
    }
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
    const headers = ['Responsável', 'Empresa', 'Atividade', 'Prioridade', 'Tributação', 'Tempo Est. (Dias)', 'Status Empresa', 'Departamento'];
    const rows = filteredAndSortedClients.map(c => {
      let statusEmpresa = 'Ativa';
      if (c.is_inactive) statusEmpresa = 'Inativa (Ex-cliente)';
      else if (c.sem_movimento) statusEmpresa = 'Sem Movimento';
      return [
        c.responsavel || '', c.empresa || '', c.atividade || '', c.prioridade || '', c.tributacao || '', c.tempo_estimado?.toString() || '0', statusEmpresa, c.departamento || currentDepartment
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `base_clientes_${currentDepartment}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-[#2563eb] font-bold">Carregando {currentDepartment}...</div>;

  return (
    <div className="h-full bg-slate-50 p-4 md:p-6 flex flex-col min-h-[600px] overflow-hidden">
      <div className="max-w-[1600px] w-full mx-auto flex flex-col flex-1 min-h-0 gap-4">
        
        <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel de Status: <span className="text-[#2563eb]">{currentDepartment}</span></h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500"/>
              Gestão automatizada e integrada com o Cadastro Global
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-[#1e3a8a] px-4 py-2 rounded-lg font-bold transition-colors shadow-sm" title="Exportar dados cadastrais">
              <Download size={18} /> Exportar Painel
            </button>
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Total Geral</span><span className="text-2xl font-bold text-slate-800 mt-1">{metrics.totalGeral}</span></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Clientes Ativos</span><span className="text-2xl font-bold text-[#2563eb] mt-1">{metrics.totalAtivos}</span></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Concluídos ({activeMonth}/{activeYear})</span><span className="text-2xl font-bold text-emerald-600 mt-1">{metrics.completed}</span></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Pendentes ({activeMonth}/{activeYear})</span><span className="text-2xl font-bold text-amber-500 mt-1">{metrics.pending}</span></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"><span className="text-slate-500 text-sm font-medium">Atrasados ({activeMonth}/{activeYear})</span><span className="text-2xl font-bold text-red-500 mt-1">{metrics.delayed}</span></div>
        </div>

        <div className="shrink-0 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"/>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterResponsavel} onChange={(e) => setFilterResponsavel(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#2563eb]">
              <option value="">Responsável</option>
              {activeAnalysts.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterAtividade} onChange={(e) => setFilterAtividade(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#2563eb]">
              <option value="">Todas Atividades</option>
              {settings.atividades.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filterPrioridade} onChange={(e) => setFilterPrioridade(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#2563eb]">
              <option value="">Todas Prioridades</option>
              {settings.prioridades.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterTributacao} onChange={(e) => setFilterTributacao(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#2563eb]">
              <option value="">Todas Tributações</option>
              {settings.tributacoes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            
            <button onClick={() => setShowInactive(!showInactive)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${showInactive ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
              {showInactive ? <EyeOff size={16}/> : <UserCheck size={16}/>}
              {showInactive ? "Ocultar Inativos" : "Ver Ex-Clientes"}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col relative">
          <div className="overflow-auto w-full h-full scrollbar-thin scrollbar-thumb-slate-300 rounded-2xl">
            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-40 shadow-sm border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 sticky left-0 z-50 bg-slate-50 w-32 border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('responsavel')}>
                    <div className="flex items-center gap-1">Responsável <ArrowUpDown size={14} className="text-slate-400"/></div>
                  </th>
                  <th className="px-4 py-3 sticky left-[128px] z-50 bg-slate-50 w-[200px] border-r border-slate-200 shadow-[6px_0px_8px_-4px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('empresa')}>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedClients.map((client) => (
                  <tr key={client.id} className={`hover:bg-slate-50 transition-colors group ${client.is_inactive ? 'bg-red-50/30' : client.sem_movimento ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                    <td className={`px-4 py-3 sticky left-0 z-30 font-medium text-slate-700 border-r border-slate-100 transition-colors ${client.is_inactive ? 'bg-red-50 group-hover:bg-red-100' : 'bg-white group-hover:bg-slate-50'}`}>
                      {client.responsavel}
                    </td>
                    <td className={`px-4 py-3 sticky left-[128px] z-30 font-medium text-slate-900 border-r border-slate-200 shadow-[6px_0px_8px_-4px_rgba(0,0,0,0.1)] transition-colors ${client.is_inactive ? 'bg-red-50 group-hover:bg-red-100' : 'bg-white group-hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        {client.empresa}
                        {client.is_inactive && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md">INATIVO</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      <input type="checkbox" checked={client.sem_movimento || false} onChange={(e) => handleToggleSemMovimento(client.id, e.target.checked)} className="w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb] cursor-pointer" title="Marcar como Sem Movimento" />
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
                  </tr>
                ))}
                {filteredAndSortedClients.length === 0 && (
                  <tr><td colSpan={18} className="p-8 text-center text-slate-400 font-medium">O administrador ainda não alocou empresas para este setor.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-sm text-slate-600">
          <div className="flex items-center gap-6">
            <span className="font-medium text-slate-800">Legenda Automática:</span>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-200"></div><span>Não iniciado</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-amber-400"></div><span>Em Andamento</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-emerald-500"></div><span>Concluído</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500"></div><span>Atrasado (Passou do prazo)</span></div>
          </div>
          {isAdmin && (
            <span className="text-[10px] bg-[#dbeafe] text-[#1e3a8a] px-3 py-1 rounded font-bold uppercase flex items-center gap-1"><ShieldCheck size={12}/> Painel Fechado para Edição Externa</span>
          )}
        </div>
      </div>
    </div>
  );
}
