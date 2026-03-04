/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { PdiEntry, Client, AppSettings, MONTHS, Status, StatusRecord, UsuarioConfig } from '../types';
import { Save, Plus, Trash2, Target, Check, CheckCheck, Search, ShieldAlert } from 'lucide-react';

const currentYearNum = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYearNum - 1 + i).toString());

export function Pdi() {
  // Estados de Autenticação Autossuficientes
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [authLoaded, setAuthLoaded] = useState(false);
  const [debugUsuarios, setDebugUsuarios] = useState<UsuarioConfig[]>([]);

  // Estados Globais
  const [activeMonth, setActiveMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [activeYear, setActiveYear] = useState<string>(currentYearNum.toString());
  const [activeResponsavel, setActiveResponsavel] = useState<string>('');
  
  const [activeAnalysts, setActiveAnalysts] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [localData, setLocalData] = useState<PdiEntry[]>([]);
  const [baseClients, setBaseClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Verifica quem está logado diretamente no Supabase (Blindagem de Segurança)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email?.toLowerCase().trim() || '';
      setUserEmail(email);
      setIsAdmin(email === 'jeyson@vsmweb.com.br');
      setAuthLoaded(true);
    });
  }, []);

  // 2. Carrega as Configurações e Define as Permissões
  useEffect(() => {
    if (!authLoaded) return;

    async function fetchRoles() {
      const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 1).single();
      const { data: clientsData } = await supabase.from('clients').select('responsavel, is_inactive, sem_movimento');
      
      if (settingsData) {
        setSettings(settingsData);
        
        // Garante que o JSON de usuários seja lido corretamente
        let rawUsuarios = settingsData.usuarios || [];
        if (typeof rawUsuarios === 'string') {
          try { rawUsuarios = JSON.parse(rawUsuarios); } catch(e) { rawUsuarios = []; }
        }
        const usuariosConfig: UsuarioConfig[] = rawUsuarios;
        setDebugUsuarios(usuariosConfig); // Salva para o autodiagnóstico
        
        const list = (clientsData || []).filter(c => !c.is_inactive).map(c => c.responsavel);
        let allowedAnalysts: string[] = [];
        
        if (isAdmin) {
          // ADMIN: Vê todos os analistas (cadastrados nas configs + os que já têm clientes)
          const configuredNames = usuariosConfig.map(u => u.nome.toUpperCase());
          allowedAnalysts = [...new Set([...list.map(n => n.toUpperCase()), ...configuredNames])].sort();
        } else {
          // ANALISTA: Procura o e-mail exato dele nas configurações
          const myConfig = usuariosConfig.find(u => u.email.toLowerCase().trim() === userEmail);
          if (myConfig) {
            allowedAnalysts = [myConfig.nome.toUpperCase()];
          } else {
            allowedAnalysts = [];
          }
        }
        
        setActiveAnalysts(allowedAnalysts);
        
        if (allowedAnalysts.length > 0) {
          setActiveResponsavel(allowedAnalysts[0]);
        } else {
          setActiveResponsavel('');
        }
      }
    }
    fetchRoles();
  }, [authLoaded, isAdmin, userEmail]);

  // 3. Carrega os Dados do PDI daquele Responsável
  useEffect(() => {
    async function fetchPdiData() {
      if (!activeResponsavel) {
        setLocalData([]);
        return;
      }
      
      setLoading(true);
      setSearchTerm(''); 

      try {
        const { data: clientsData } = await supabase.from('clients').select('*').eq('responsavel', activeResponsavel);
        const { data: pdiData } = await supabase.from('pdi_entries').select('*').eq('responsavel', activeResponsavel).eq('mes', activeMonth).eq('ano', activeYear);

        const clients = clientsData || [];
        const dbEntries = pdiData || [];
        const combined: PdiEntry[] = [...dbEntries];

        const activeClients = clients.filter((c: Client) => !c.sem_movimento && !c.is_inactive);
        setBaseClients(activeClients); 

        activeClients.forEach((client: Client) => {
          const exists = dbEntries.find(e => e.empresa === client.empresa && !e.is_extra);
          if (!exists) {
            combined.push({
              responsavel: activeResponsavel,
              empresa: client.empresa,
              atividade: 'Contabilização',
              competencia: `${activeMonth}/${activeYear}`,
              inicio: '',
              termino: '',
              prazo_realizado: '',
              meio_expediente: false,
              percentual: 0, 
              status: 'n',
              observacao: '',
              mes: activeMonth,
              ano: activeYear,
              is_extra: false
            });
          }
        });

        combined.sort((a, b) => (a.is_extra === b.is_extra ? 0 : a.is_extra ? 1 : -1));
        setLocalData(combined);
      } catch (error) {
        console.error('Erro ao buscar PDI:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPdiData();
  }, [activeMonth, activeYear, activeResponsavel]);

  const metrics = useMemo(() => {
    if (localData.length === 0) return { avg: 0, total: 0, completed: 0 };
    const total = localData.length;
    const completed = localData.filter(d => d.status === 'analyst' || d.status === 'ok').length;
    const avg = Math.round((completed / total) * 100);
    return { avg, total, completed };
  }, [localData]);

  const handleInputChange = (index: number, field: keyof PdiEntry, value: string | number | boolean) => {
    const newData = [...localData];
    newData[index] = { ...newData[index], [field]: value };
    setLocalData(newData);
  };

  const handleAddExtra = () => {
    setLocalData([...localData, {
      responsavel: activeResponsavel, empresa: '', atividade: '', competencia: `${activeMonth}/${activeYear}`,
      inicio: '', termino: '', prazo_realizado: '', meio_expediente: false, percentual: 0, status: 'n',
      observacao: '', mes: activeMonth, ano: activeYear, is_extra: true
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
          ...row,
          inicio: row.inicio || null,
          termino: row.termino || null,
          prazo_realizado: row.prazo_realizado || null,
          meio_expediente: row.meio_expediente || false 
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
      alert('PDI Salvo e Painel de Status Sincronizado com sucesso!');
    } catch (error) {
      alert('Erro ao salvar o PDI.');
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

  const filteredDataCount = localData.filter(row => 
    !searchTerm || 
    row.empresa.toLowerCase().includes(searchTerm.toLowerCase()) || 
    row.atividade.toLowerCase().includes(searchTerm.toLowerCase())
  ).length;

  if (!authLoaded) return <div className="p-8 text-center font-bold text-slate-500">Autenticando painel...</div>;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="text-indigo-600" /> PDI da Equipe
          </h1>
          <p className="text-slate-500 text-sm mt-1">Plano de Ação e Desempenho Mensal</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <select 
            value={activeResponsavel} 
            onChange={(e) => setActiveResponsavel(e.target.value)}
            disabled={!isAdmin} 
            className={`border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium focus:outline-none min-w-[150px] ${!isAdmin ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white focus:border-indigo-500'}`}
            title={!isAdmin ? "Você só pode visualizar a sua própria carteira" : ""}
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

      {/* TELA DE AUTODIAGNÓSTICO E BLOQUEIO */}
      {activeAnalysts.length === 0 && !isAdmin ? (
        <div className="bg-amber-50 p-8 rounded-2xl border border-amber-200 text-center max-w-2xl mx-auto mt-10">
          <ShieldAlert className="mx-auto text-amber-500 mb-4" size={48} />
          <h3 className="text-amber-800 font-bold text-xl">Acesso Restrito</h3>
          <p className="text-amber-700 mt-2 font-medium">
            Seu e-mail não foi encontrado na base de analistas autorizados.
          </p>
          <div className="mt-6 bg-white p-4 rounded-xl border border-amber-100 text-left">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Diagnóstico do Sistema</p>
            <p className="text-sm text-slate-700"><strong>Seu E-mail de login:</strong> <span className="text-indigo-600">{userEmail}</span></p>
            <p className="text-sm text-slate-700 mt-2"><strong>Analistas cadastrados pelo Admin:</strong> {debugUsuarios.length}</p>
            {debugUsuarios.length > 0 && (
              <ul className="mt-2 space-y-1">
                {debugUsuarios.map((u, i) => (
                  <li key={i} className="text-xs text-slate-500 font-mono bg-slate-50 p-1 rounded">• Nome: {u.nome} | E-mail: {u.email}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-amber-600 mt-4 font-medium italic">* Peça ao Administrador para cadastrar seu e-mail exatamente como aparece acima na aba Configurações.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
              <div className="bg-slate-500 text-white font-bold p-4 w-48 flex items-center justify-center text-center">
                Evolução Mensal
              </div>
              <div className="flex-1 p-6 flex items-center justify-center gap-8">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="20" fill="transparent" className="text-slate-100" />
                    <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="20" fill="transparent"
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      className="text-emerald-500 transition-all duration-1000 ease-out" />
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
              <div className="bg-slate-400 text-white font-bold p-2 text-center text-sm">Análise de Desempenho</div>
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
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar empresa ou ação..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <button onClick={handleAddExtra} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors">
                  <Plus size={16} /> Adicionar Extra
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">
                  <Save size={16} /> {saving ? 'Salvando...' : 'Salvar PDI'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Carregando carteira de clientes...</div>
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
                  <tbody className="divide-y divide-slate-200">
                    {localData.map((row, index) => {
                      if (searchTerm && 
                          !row.empresa.toLowerCase().includes(searchTerm.toLowerCase()) && 
                          !row.atividade.toLowerCase().includes(searchTerm.toLowerCase())) {
                        return null;
                      }

                      const light = getTrafficLight(row);
                      return (
                        <tr key={index} className={row.is_extra ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}>
                          <td className="p-1 border-r border-slate-200">
                            <input type="text" value={row.empresa} onChange={(e) => handleInputChange(index, 'empresa', e.target.value)} disabled={!row.is_extra} className={`w-full p-2 outline-none uppercase font-bold text-xs ${!row.is_extra ? 'bg-transparent text-slate-700' : 'bg-white border border-slate-300 rounded'}`} placeholder="NOME DA EMPRESA" />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="text" value={row.atividade} onChange={(e) => handleInputChange(index, 'atividade', e.target.value)} className="w-full p-2 outline-none bg-transparent text-indigo-700 font-bold text-xs" placeholder="Qual a ação?" />
                          </td>
                          <td className="p-1 border-r border-slate-200 text-center">
                            <input type="text" value={row.competencia} onChange={(e) => handleInputChange(index, 'competencia', e.target.value)} className="w-full p-2 outline-none bg-transparent text-slate-500 text-xs text-center" />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="date" value={row.inicio || ''} onChange={(e) => handleInputChange(index, 'inicio', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs text-slate-600" />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="date" value={row.termino || ''} onChange={(e) => handleInputChange(index, 'termino', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs text-slate-600" />
                          </td>
                          <td className="p-1 border-r border-slate-200 bg-slate-50/50">
                            <div className="flex flex-col gap-1 items-center">
                              <input type="date" value={row.prazo_realizado || ''} onChange={(e) => handleInputChange(index, 'prazo_realizado', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs text-slate-600" />
                              <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-200 px-1.5 rounded transition-colors" title="Marque se utilizou apenas meio expediente">
                                <input type="checkbox" checked={row.meio_expediente || false} onChange={(e) => handleInputChange(index, 'meio_expediente', e.target.checked)} className="w-3 h-3 text-indigo-600 rounded border-slate-300" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">-0,5 DIA</span>
                              </label>
                            </div>
                          </td>
                          <td className="p-1 border-r border-slate-200 text-center">
                            <div className={`mx-auto w-4 h-4 rounded-full ${light.color} shadow-inner`} title={light.title}></div>
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="text" value={row.observacao} onChange={(e) => handleInputChange(index, 'observacao', e.target.value)} className="w-full p-2 outline-none bg-transparent text-xs text-slate-600" placeholder="Insira uma nota..." />
                          </td>
                          <td className="p-1 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleAnalystConfirm(index)} 
                                className={`p-1.5 rounded-md transition-colors ${row.status === 'analyst' || row.status === 'ok' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} 
                                title={row.status === 'n' ? "Finalizar Tarefa (Analista)" : "Tarefa Finalizada"}
                              >
                                <Check size={16} />
                              </button>
                              
                              <button 
                                onClick={() => handleManagerConfirm(index)} 
                                disabled={row.status === 'n' || !isAdmin}
                                className={`p-1.5 rounded-md transition-colors ${row.status === 'ok' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'} disabled:opacity-30 disabled:cursor-not-allowed`} 
                                title={row.status === 'ok' ? "Validado pelo Gestor" : isAdmin ? "Validar (Gestor)" : "Apenas o Gestor pode validar"}
                              >
                                <CheckCheck size={16} />
                              </button>

                              {row.is_extra && (
                                <button onClick={() => handleDeleteExtra(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Excluir Extra">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {filteredDataCount === 0 && !loading && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">Nenhuma empresa ou ação encontrada com o termo "{searchTerm}".</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
