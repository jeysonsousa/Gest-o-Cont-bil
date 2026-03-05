/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { PdiEntry, Client, AppSettings, MONTHS, Status, StatusRecord, UsuarioConfig } from '../types';
import { Save, Plus, Trash2, Target, Check, CheckCheck, Search, ShieldAlert, PieChart, ChevronDown, ChevronUp } from 'lucide-react';

const currentYearNum = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYearNum - 1 + i).toString());

const currentDate = new Date();
let defaultMonthIndex = currentDate.getMonth() - 1;
let defaultYearNum = currentDate.getFullYear();

if (defaultMonthIndex < 0) {
  defaultMonthIndex = 11; 
  defaultYearNum -= 1;    
}

const formatDateForSearch = (dateStr?: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]} ${dateStr}`;
  }
  return dateStr;
};

// LISTA DE ADMINISTRADORES DO SISTEMA (Para destravar validação do Gestor)
const ADMIN_EMAILS = ['jeyson@vsmweb.com.br', 'cristiane.cardoso@vsmweb.com.br'];

export function Pdi({ currentDepartment }: { currentDepartment: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [authLoaded, setAuthLoaded] = useState(false);
  const [debugUsuarios, setDebugUsuarios] = useState<UsuarioConfig[]>([]);

  const [activeMonth, setActiveMonth] = useState<string>(MONTHS[defaultMonthIndex]);
  const [activeYear, setActiveYear] = useState<string>(defaultYearNum.toString());
  const [activeResponsavel, setActiveResponsavel] = useState<string>('');
  
  const [activeAnalysts, setActiveAnalysts] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [localData, setLocalData] = useState<PdiEntry[]>([]);
  const [baseClients, setBaseClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showPending, setShowPending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email?.toLowerCase().trim() || '';
      setUserEmail(email);
      setIsAdmin(ADMIN_EMAILS.includes(email));
      setAuthLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    async function fetchRoles() {
      const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 1).single();
      const { data: clientsData } = await supabase.from('clients')
        .select('responsavel, is_inactive, sem_movimento, departamento')
        .eq('departamento', currentDepartment); 
      
      if (settingsData) {
        setSettings(settingsData);
        let rawUsuarios = settingsData.usuarios || [];
        if (typeof rawUsuarios === 'string') {
          try { rawUsuarios = JSON.parse(rawUsuarios); } catch(e) { rawUsuarios = []; }
        }
        const usuariosConfig: UsuarioConfig[] = rawUsuarios;
        setDebugUsuarios(usuariosConfig); 
        
        const list = (clientsData || []).filter(c => !c.is_inactive).map(c => c.responsavel);
        let allowedAnalysts: string[] = [];
        
        if (isAdmin) {
          const configuredNames = usuariosConfig.map(u => u.nome.toUpperCase());
          allowedAnalysts = [...new Set([...list.map(n => n.toUpperCase()), ...configuredNames])].sort();
        } else {
          const myConfig = usuariosConfig.find(u => u.email.toLowerCase().trim() === userEmail);
          if (myConfig) {
            allowedAnalysts = [myConfig.nome.toUpperCase()];
          } else {
            allowedAnalysts = [];
          }
        }
        
        setActiveAnalysts(allowedAnalysts);
        if (allowedAnalysts.length > 0) setActiveResponsavel(allowedAnalysts[0]);
        else setActiveResponsavel('');
      }
    }
    fetchRoles();
  }, [authLoaded, isAdmin, userEmail, currentDepartment]);

  useEffect(() => {
    async function fetchPdiData() {
      if (!activeResponsavel || !settings) {
        setLocalData([]);
        return;
      }
      setLoading(true);
      setSearchTerm(''); 

      try {
        const { data: clientsData } = await supabase.from('clients')
          .select('*')
          .eq('responsavel', activeResponsavel)
          .eq('departamento', currentDepartment);

        const { data: pdiData } = await supabase.from('pdi_entries')
          .select('*')
          .eq('responsavel', activeResponsavel)
          .eq('mes', activeMonth)
          .eq('ano', activeYear)
          .eq('departamento', currentDepartment);

        const clients = clientsData || [];
        const dbEntries = pdiData || [];
        
        const activeClients = clients.filter((c: Client) => !c.sem_movimento && !c.is_inactive);
        const activeClientNames = activeClients.map((c: Client) => c.empresa);

        const validDbEntries = dbEntries.filter(e => e.is_extra || activeClientNames.includes(e.empresa));
        const combined: PdiEntry[] = [...validDbEntries];
        setBaseClients(activeClients); 

        const deptMetasGlobais = (settings.metas_globais || []).filter(m => m.departamento === currentDepartment);

        activeClients.forEach((client: Client) => {
          const empBase = (settings.empresas_base || []).find(e => e.nome === client.empresa);
          
          if (empBase && empBase.metas_vinculadas) {
            const linkedDeptMetas = empBase.metas_vinculadas.filter(mv => deptMetasGlobais.some(dmg => dmg.id === mv.metaId));

            linkedDeptMetas.forEach(mv => {
              const metaDef = deptMetasGlobais.find(dmg => dmg.id === mv.metaId);
              if (metaDef) {
                const exists = validDbEntries.find(e => e.empresa === client.empresa && e.atividade === metaDef.nome && !e.is_extra);
                
                if (!exists) {
                  combined.push({
                    responsavel: activeResponsavel, empresa: client.empresa, atividade: metaDef.nome,
                    competencia: `${activeMonth}/${activeYear}`, inicio: '', termino: '', prazo_realizado: '',
                    meio_expediente: false, percentual: 0, status: 'n', observacao: '',
                    mes: activeMonth, ano: activeYear, is_extra: false, departamento: currentDepartment
                  });
                }
              }
            });
          }
        });

        combined.sort((a, b) => {
          if (a.is_extra !== b.is_extra) return a.is_extra ? 1 : -1;
          return a.empresa.localeCompare(b.empresa);
        });
        
        setLocalData(combined);
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPdiData();
  }, [activeMonth, activeYear, activeResponsavel, currentDepartment, settings]);

  const metrics = useMemo(() => {
    if (localData.length === 0) return { avg: 0, total: 0, completed: 0 };
    const total = localData.length;
    const completed = localData.filter(d => d.status === 'analyst' || d.status === 'ok').length;
    const avg = Math.round((completed / total) * 100);
    return { avg, total, completed };
  }, [localData]);

  const groupedTasks = useMemo(() => {
    const tasksWithIndex = localData.map((row, index) => ({ row, index }));
    const pending = tasksWithIndex.filter(item => item.row.status === 'n');
    const completed = tasksWithIndex.filter(item => item.row.status === 'analyst' || item.row.status === 'ok');

    const filterFn = (item: {row: PdiEntry}) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.row.empresa.toLowerCase().includes(term) || 
        item.row.atividade.toLowerCase().includes(term) ||
        formatDateForSearch(item.row.inicio).includes(term) ||
        formatDateForSearch(item.row.termino).includes(term) ||
        formatDateForSearch(item.row.prazo_realizado).includes(term)
      );
    };

    return { filteredPending: pending.filter(filterFn), filteredCompleted: completed.filter(filterFn) };
  }, [localData, searchTerm]);

  const handleInputChange = (index: number, field: keyof PdiEntry, value: string | number | boolean) => {
    const newData = [...localData];
    newData[index] = { ...newData[index], [field]: value };
    setLocalData(newData);
  };

  const handleAddExtra = () => {
    setLocalData([...localData, {
      responsavel: activeResponsavel, empresa: '', atividade: '', competencia: `${activeMonth}/${activeYear}`,
      inicio: '', termino: '', prazo_realizado: '', meio_expediente: false, percentual: 0, status: 'n',
      observacao: '', mes: activeMonth, ano: activeYear, is_extra: true, departamento: currentDepartment
    }]);
  };

  const handleDeleteExtra = async (index: number) => {
    const row = localData[index];
    if (window.confirm('Excluir esta atividade extra?')) {
      if (row.id) await supabase.from('pdi_entries').delete().eq('id', row.id);
      const newData = [...localData];
      newData.splice(index, 1);
      setLocalData(newData);
    }
  };

  const handleAnalystConfirm = (index: number) => {
    const newData = [...localData];
    const row = newData[index];
    if (row.status === 'n') {
      newData[index].status = 'analyst';
      if (!row.prazo_realizado) newData[index].prazo_realizado = new Date().toISOString().split('T')[0];
    } else {
      newData[index].status = 'n';
    }
    setLocalData(newData);
  };

  const handleManagerConfirm = (index: number) => {
    const newData = [...localData];
    const row = newData[index];
    if (row.status === 'analyst') newData[index].status = 'ok';
    else if (row.status === 'ok') newData[index].status = 'analyst';
    setLocalData(newData);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const row of localData) {
        const dbRow = {
          ...row, inicio: row.inicio || null, termino: row.termino || null,
          prazo_realizado: row.prazo_realizado || null, meio_expediente: row.meio_expediente || false,
          departamento: currentDepartment 
        };

        if (row.id) {
          await supabase.from('pdi_entries').update(dbRow).eq('id', row.id);
        } else {
          const { data, error } = await supabase.from('pdi_entries').insert([dbRow]).select();
          if (!error && data) row.id = data[0].id;
        }

        if (!row.is_extra) {
          const client = baseClients.find(c => c.empresa === row.empresa);
          if (client) {
            const monthKey = `${activeMonth}-${activeYear}`;
            const isPdiCompleted = row.status === 'analyst' || row.status === 'ok';
            const targetStatus: Status = isPdiCompleted ? 'completed' : 'pending';
            const currentStatusData = client.status[monthKey];
            const currentVal = typeof currentStatusData === 'object' ? currentStatusData.val : (currentStatusData || 'not_started');

            if (currentVal !== targetStatus && (isPdiCompleted || currentVal === 'completed')) {
              const newRecord: StatusRecord = { val: targetStatus, resp: activeResponsavel };
              const newStatusObj = { ...client.status, [monthKey]: newRecord };
              await supabase.from('clients').update({ status: newStatusObj }).eq('id', client.id);
              client.status = newStatusObj; 
            }
          }
        }
      }
      alert('PDI Salvo com sucesso!');
    } catch (error) {
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const getTrafficLight = (row: PdiEntry) => {
    if (row.status === 'n') return { color: 'bg-gray-200', title: 'Pendente' };
    if (row.termino && row.prazo_realizado) {
      if (row.prazo_realizado <= row.termino) return { color: 'bg-emerald-500', title: 'Concluído no Prazo' };
      else return { color: 'bg-red-500', title: 'Concluído Fora do Prazo' };
    }
    return { color: 'bg-emerald-500', title: 'Concluído' };
  };

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.avg / 100) * circumference;

  if (!authLoaded) return <div className="p-8 text-center font-bold text-slate-500">Autenticando painel...</div>;

  const renderRow = (row: PdiEntry, index: number) => {
    const light = getTrafficLight(row);
    return (
      <tr key={index} className={row.is_extra ? 'bg-slate-50/50' : 'hover:bg-slate-50'}>
        <td className="p-1 border-r border-slate-200"><input type="text" value={row.empresa} onChange={(e) => handleInputChange(index, 'empresa', e.target.value)} disabled={!row.is_extra} className={`w-full p-2 outline-none uppercase font-bold text-xs ${!row.is_extra ? 'bg-transparent text-slate-700' : 'bg-white border border-slate-300 rounded'}`} placeholder="NOME DA EMPRESA" /></td>
        <td className="p-1 border-r border-slate-200"><input type="text" value={row.atividade} onChange={(e) => handleInputChange(index, 'atividade', e.target.value)} disabled={!row.is_extra} className={`w-full p-2 outline-none bg-transparent text-[#1e3a8a] font-bold text-xs ${!row.is_extra && 'cursor-not-allowed'}`} placeholder="Qual a ação?" title={!row.is_extra ? 'Ação vinda do Cadastro Global' : ''} /></td>
        <td className="p-1 border-r border-slate-200 text-center"><input type="text" value={row.competencia} onChange={(e) => handleInputChange(index, 'competencia', e.target.value)} className="w-full p-2 outline-none bg-transparent text-slate-500 text-xs text-center" /></td>
        <td className="p-1 border-r border-slate-200"><input type="date" value={row.inicio || ''} onChange={(e) => handleInputChange(index, 'inicio', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs text-slate-600 focus:ring-1 focus:ring-[#2563eb]/20" /></td>
        <td className="p-1 border-r border-slate-200"><input type="date" value={row.termino || ''} onChange={(e) => handleInputChange(index, 'termino', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs text-slate-600 focus:ring-1 focus:ring-[#2563eb]/20" /></td>
        <td className="p-1 border-r border-slate-200 bg-slate-50/50">
          <div className="flex flex-col gap-1 items-center">
            <input type="date" value={row.prazo_realizado || ''} onChange={(e) => handleInputChange(index, 'prazo_realizado', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs text-slate-600 focus:ring-1 focus:ring-[#2563eb]/20" />
            <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-200 px-1.5 rounded transition-colors" title="Marque se utilizou apenas meio expediente">
              <input type="checkbox" checked={row.meio_expediente || false} onChange={(e) => handleInputChange(index, 'meio_expediente', e.target.checked)} className="w-3 h-3 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb]" />
              <span className="text-[9px] font-bold text-slate-500 uppercase">-0,5 DIA</span>
            </label>
          </div>
        </td>
        <td className="p-1 border-r border-slate-200 text-center"><div className={`mx-auto w-4 h-4 rounded-full ${light.color} shadow-inner`} title={light.title}></div></td>
        <td className="p-1 border-r border-slate-200"><input type="text" value={row.observacao} onChange={(e) => handleInputChange(index, 'observacao', e.target.value)} className="w-full p-2 outline-none bg-transparent text-xs text-slate-600" placeholder="Insira uma nota..." /></td>
        <td className="p-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => handleAnalystConfirm(index)} className={`p-1.5 rounded-md transition-colors ${row.status === 'analyst' || row.status === 'ok' ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title={row.status === 'n' ? "Finalizar Tarefa (Analista)" : "Tarefa Finalizada"}><Check size={16} /></button>
            <button onClick={() => handleManagerConfirm(index)} disabled={row.status === 'n' || !isAdmin} className={`p-1.5 rounded-md transition-colors ${row.status === 'ok' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'} disabled:opacity-30 disabled:cursor-not-allowed`} title={row.status === 'ok' ? "Validado pelo Gestor" : isAdmin ? "Validar (Gestor)" : "Apenas o Gestor pode validar"}><CheckCheck size={16} /></button>
            {row.is_extra && <button onClick={() => handleDeleteExtra(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Excluir Extra"><Trash2 size={16} /></button>}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="text-[#1e3a8a]" /> PDI da Equipe: <span className="text-[#2563eb]">{currentDepartment}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Plano de Ação e Desempenho Mensal</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <select 
            value={activeResponsavel} 
            onChange={(e) => setActiveResponsavel(e.target.value)}
            disabled={!isAdmin} 
            className={`border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium focus:outline-none min-w-[150px] ${!isAdmin ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white focus:border-[#2563eb]'}`}
          >
            {activeAnalysts.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="h-6 w-px bg-slate-300"></div>
          <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer uppercase">
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="text-slate-400">/</span>
          <select value={activeYear} onChange={(e) => setActiveYear(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {activeAnalysts.length === 0 && !isAdmin ? (
        <div className="bg-amber-50 p-8 rounded-2xl border border-amber-200 text-center max-w-2xl mx-auto mt-10">
          <ShieldAlert className="mx-auto text-amber-500 mb-4" size={48} />
          <h3 className="text-amber-800 font-bold text-xl">Nenhum Analista no {currentDepartment}</h3>
          <p className="text-amber-700 mt-2 font-medium">Cadastre empresas e responsáveis para este departamento no Painel.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
              <div className="bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] text-white p-6 w-48 flex flex-col items-center justify-center text-center shadow-inner">
                <PieChart size={32} className="mb-2 opacity-80" />
                <span className="font-bold text-sm uppercase tracking-wider">Evolução<br/>Mensal</span>
              </div>
              <div className="flex-1 p-6 flex items-center justify-center gap-8">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="20" fill="transparent" className="text-slate-100" />
                    <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="20" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-emerald-500 transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-slate-800">{metrics.avg}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-sm text-slate-600 font-medium">Realizado</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-100 rounded-full"></div><span className="text-sm text-slate-600 font-medium">Pendente</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-slate-100 text-[#0f172a] font-black p-3 text-center text-sm border-b border-slate-200">
                ANÁLISE DE DESEMPENHO
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center gap-4">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-sm font-bold text-slate-600">Desempenho:</span>
                  <span className="font-bold text-slate-800">{(metrics.avg / 100).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-sm font-bold text-slate-600">% Concluído:</span>
                  <span className="font-bold text-emerald-600">{metrics.avg}%</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-sm font-bold text-slate-600">Atividades Prontas:</span>
                  <span className="font-bold text-slate-800">{metrics.completed} / {metrics.total}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-slate-200 bg-slate-50 gap-4">
              <h2 className="font-bold text-slate-700 uppercase text-sm tracking-wider">Plano de Ação de {activeResponsavel}</h2>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Buscar empresa, ação ou data..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 transition-all"/>
                </div>

                <button onClick={handleAddExtra} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">
                  <Plus size={16} /> Adicionar Extra
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                  <Save size={16} /> {saving ? 'Salvando...' : 'Salvar PDI'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Carregando dados do setor {currentDepartment}...</div>
              ) : (
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-300">Empresas</th>
                      <th className="px-4 py-3 border-r border-slate-300">Ação</th>
                      <th className="px-4 py-3 border-r border-slate-300 text-center w-24">Competência</th>
                      <th className="px-3 py-3 border-r border-slate-300 w-32 text-center">Início</th>
                      <th className="px-3 py-3 border-r border-slate-300 w-32 text-center">Término</th>
                      <th className="px-3 py-3 border-r border-slate-300 w-[140px] text-center">Prazo Realiz.</th>
                      <th className="px-3 py-3 border-r border-slate-300 w-16 text-center">Status</th>
                      <th className="px-4 py-3 border-r border-slate-300">Observação</th>
                      <th className="px-3 py-3 text-center">Validações / Ações</th>
                    </tr>
                  </thead>
                  
                  <tbody onClick={() => setShowPending(!showPending)} className="group cursor-pointer">
                    <tr>
                      <td colSpan={9} className="p-0">
                        <div className="bg-amber-50 border-y border-amber-200 p-3 flex items-center justify-between group-hover:bg-amber-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="font-bold text-amber-800 uppercase text-xs tracking-wider">Metas Pendentes ({groupedTasks.filteredPending.length})</span>
                          </div>
                          {showPending ? <ChevronUp size={16} className="text-amber-600"/> : <ChevronDown size={16} className="text-amber-600"/>}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  {showPending && (
                    <tbody className="divide-y divide-slate-200">
                      {groupedTasks.filteredPending.map(({row, index}) => renderRow(row, index))}
                      {groupedTasks.filteredPending.length === 0 && (
                        <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs font-medium">Nenhuma meta pendente encontrada.</td></tr>
                      )}
                    </tbody>
                  )}

                  <tbody className="bg-white"><tr><td colSpan={9} className="p-1"></td></tr></tbody>

                  <tbody onClick={() => setShowCompleted(!showCompleted)} className="group cursor-pointer">
                    <tr>
                      <td colSpan={9} className="p-0">
                        <div className="bg-emerald-50 border-y border-emerald-200 p-3 flex items-center justify-between group-hover:bg-emerald-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="font-bold text-emerald-800 uppercase text-xs tracking-wider">Metas Concluídas ({groupedTasks.filteredCompleted.length})</span>
                          </div>
                          {showCompleted ? <ChevronUp size={16} className="text-emerald-600"/> : <ChevronDown size={16} className="text-emerald-600"/>}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  {showCompleted && (
                    <tbody className="divide-y divide-slate-200">
                      {groupedTasks.filteredCompleted.map(({row, index}) => renderRow(row, index))}
                      {groupedTasks.filteredCompleted.length === 0 && (
                        <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs font-medium">Nenhuma meta concluída encontrada.</td></tr>
                      )}
                    </tbody>
                  )}
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
