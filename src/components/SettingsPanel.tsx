/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, UsuarioConfig, EmpresaBase, MetaGlobal, MetaVinculada, DeptAlocacao } from '../types';
import { Plus, Trash2, Save, Building2, Users, Briefcase, ListTodo, ShieldAlert, Edit2, Search, Target, X, Check, CheckSquare, ArrowUpDown, EyeOff, UserCheck, Settings2 } from 'lucide-react';
import { supabase } from '../supabase'; 

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => Promise<void>;
}

const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substr(2, 9);

const capitalizeFirstLetter = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function SettingsPanel({ settings, setSettings }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'empresas' | 'metas' | 'departamentos' | 'colaboradores' | 'parametros'>('empresas');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  const [newDepartamento, setNewDepartamento] = useState('');
  const [newAtividade, setNewAtividade] = useState('');
  const [newPrioridade, setNewPrioridade] = useState('');
  const [newTributacao, setNewTributacao] = useState('');

  const [usuarios, setUsuarios] = useState<UsuarioConfig[]>([]);
  const [editingUserIndex, setEditingUserIndex] = useState<number | null>(null);
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDepts, setNewUserDepts] = useState<string[]>([]);
  const [newUserIsEstagiario, setNewUserIsEstagiario] = useState(false);
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false); 

  const [newMetaNome, setNewMetaNome] = useState('');
  const [newMetaDept, setNewMetaDept] = useState('');

  const [empresaSearch, setEmpresaSearch] = useState('');
  const [empresaFilterTrib, setEmpresaFilterTrib] = useState('');
  const [showInactiveEmpresas, setShowInactiveEmpresas] = useState(false); 
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: 'nome' | 'tributacao' | 'metas', direction: 'asc' | 'desc' } | null>(null);
  
  // ESTADOS DO MODAL DA EMPRESA MATRIZ
  const [empresaId, setEmpresaId] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaTrib, setEmpresaTrib] = useState('');
  const [empresaAtividade, setEmpresaAtividade] = useState('');
  const [empresaInactive, setEmpresaInactive] = useState(false); 
  const [empresaMetas, setEmpresaMetas] = useState<MetaVinculada[]>([]);
  const [empresaAlocacoes, setEmpresaAlocacoes] = useState<Record<string, DeptAlocacao>>({});
  
  const [selectedMetaIdToLink, setSelectedMetaIdToLink] = useState('');
  const [selectedMetaTimeToLink, setSelectedMetaTimeToLink] = useState<number | ''>('');

  const [selectedEmpresasIds, setSelectedEmpresasIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState<'tributacao' | 'meta' | null>(null);
  const [bulkTrib, setBulkTrib] = useState('');
  const [bulkMetaId, setBulkMetaId] = useState('');
  const [bulkMetaTime, setBulkMetaTime] = useState<number | ''>('');

  useEffect(() => {
    async function loadAndMigrate() {
      let parsedUsers: UsuarioConfig[] = [];
      if (typeof settings.usuarios === 'string') {
        try { parsedUsers = JSON.parse(settings.usuarios); } catch (e) {}
      } else if (Array.isArray(settings.usuarios)) {
        parsedUsers = settings.usuarios;
      }
      setUsuarios(parsedUsers.map(u => ({ ...u, departamentos: u.departamentos || [], isEstagiario: u.isEstagiario || false, isAdmin: u.isAdmin || false })));

      // AUTO-MIGRAÇÃO: Cria a matriz de departamentos lendo os clientes já alocados no painel!
      let baseEmpresas = settings.empresas_base || [];
      const needsMigration = baseEmpresas.some(e => !e.alocacoes);
      
      if (needsMigration) {
        const { data: allClients } = await supabase.from('clients').select('*');
        baseEmpresas = baseEmpresas.map(emp => {
          if (!emp.alocacoes) {
            const empClients = allClients?.filter(c => c.empresa === emp.nome && !c.is_inactive) || [];
            const novasAlocacoes: Record<string, DeptAlocacao> = {};
            let atividadePuxada = emp.atividade || '';
            
            empClients.forEach(c => {
              if (c.departamento) {
                novasAlocacoes[c.departamento] = {
                  responsavel: c.responsavel || '',
                  prioridade: c.prioridade || 'A',
                  sem_movimento: c.sem_movimento || false
                };
                if (!atividadePuxada && c.atividade) atividadePuxada = c.atividade;
              }
            });
            return { ...emp, alocacoes: novasAlocacoes, atividade: atividadePuxada };
          }
          return emp;
        });
      }

      setLocalSettings({
        ...settings,
        departamentos: settings.departamentos || ['Contábil', 'Fiscal', 'Pessoal'],
        empresas_base: baseEmpresas,
        metas_globais: settings.metas_globais || []
      });
    }
    
    loadAndMigrate();
  }, [settings]);

  // === ROBÔ DE SINCRONIZAÇÃO TOTAL (ZERO DATA ENTRY) ===
  const handleSave = async () => {
    setSaving(true);
    const finalSettings = { ...localSettings, usuarios: JSON.stringify(usuarios) };
    
    await setSettings(finalSettings);

    try {
      const { data: allClients } = await supabase.from('clients').select('*');
      if (allClients) {
        const upserts: any[] = [];
        const validClientKeys = new Set(); // Para limpar o que foi desativado na matriz

        finalSettings.empresas_base?.forEach(emp => {
          if (emp.is_inactive) {
            // Se a empresa foi inativada na raiz, inativa todos os vínculos dela
            allClients.filter(c => c.empresa === emp.nome).forEach(c => {
              if (!c.is_inactive) upserts.push({ ...c, is_inactive: true });
            });
            return; 
          }

          Object.entries(emp.alocacoes || {}).forEach(([dept, aloc]) => {
            validClientKeys.add(`${emp.nome}|${dept}`);
            
            // Calcula o tempo mágico somando as metas
            const deptMetas = finalSettings.metas_globais?.filter(m => m.departamento === dept) || [];
            const deptMetaIds = deptMetas.map(m => m.id);
            let totalTime = 0;
            (emp.metas_vinculadas || []).forEach(mv => {
              if (deptMetaIds.includes(mv.metaId)) totalTime += mv.tempo_estimado;
            });

            const existingClient = allClients.find(c => c.empresa === emp.nome && c.departamento === dept);

            if (existingClient) {
              // Atualiza o existente protegendo as bolinhas de histórico (status)
              if (existingClient.responsavel !== aloc.responsavel || existingClient.prioridade !== aloc.prioridade || existingClient.atividade !== emp.atividade || existingClient.tributacao !== emp.tributacao || existingClient.tempo_estimado !== totalTime || existingClient.sem_movimento !== aloc.sem_movimento || existingClient.is_inactive === true) {
                upserts.push({
                  ...existingClient,
                  responsavel: aloc.responsavel,
                  prioridade: aloc.prioridade,
                  atividade: emp.atividade || '',
                  tributacao: emp.tributacao || '',
                  tempo_estimado: totalTime,
                  sem_movimento: aloc.sem_movimento,
                  is_inactive: false
                });
              }
            } else {
              // Insere uma nova alocação magicamente
              upserts.push({
                empresa: emp.nome,
                departamento: dept,
                responsavel: aloc.responsavel,
                prioridade: aloc.prioridade,
                atividade: emp.atividade || '',
                tributacao: emp.tributacao || '',
                tempo_estimado: totalTime,
                sem_movimento: aloc.sem_movimento,
                is_inactive: false,
                status: {} // Bolinhas zeradas
              });
            }
          });
        });

        // Remove (inativa) do painel as alocacoes que o admin desligou a chavinha
        allClients.forEach(c => {
          if (!validClientKeys.has(`${c.empresa}|${c.departamento}`) && !c.is_inactive) {
            const empGlob = finalSettings.empresas_base?.find(e => e.nome === c.empresa);
            if (empGlob) {
              upserts.push({ ...c, is_inactive: true });
            }
          }
        });

        if (upserts.length > 0) {
          await supabase.from('clients').upsert(upserts);
        }
      }
    } catch (err) {
      console.error('Erro na sincronização:', err);
    }

    alert('Configurações salvas! Todos os painéis e clientes foram sincronizados automaticamente.');
    setSaving(false);
  };

  const addItemString = (field: keyof AppSettings, value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (!value.trim()) return;
    const currentArray = (localSettings[field] as string[]) || [];
    if (!currentArray.includes(value.toUpperCase().trim())) {
      setLocalSettings({ ...localSettings, [field]: [...currentArray, value.toUpperCase().trim()].sort() });
    }
    setter('');
  };

  const removeItemString = (field: keyof AppSettings, index: number) => {
    if(!window.confirm('Excluir este item?')) return;
    const currentArray = [...((localSettings[field] as string[]) || [])];
    currentArray.splice(index, 1);
    setLocalSettings({ ...localSettings, [field]: currentArray });
  };

  const saveUser = () => {
    if (!newUserNome.trim() || !newUserEmail.trim()) return;
    const updatedUsers = [...usuarios];
    const userData: UsuarioConfig = { 
      nome: newUserNome.toUpperCase().trim(), email: newUserEmail.toLowerCase().trim(), 
      departamentos: newUserDepts, isEstagiario: newUserIsEstagiario, isAdmin: newUserIsAdmin
    };
    if (editingUserIndex !== null) { updatedUsers[editingUserIndex] = userData; setEditingUserIndex(null); } 
    else { updatedUsers.push(userData); }
    setUsuarios(updatedUsers);
    setNewUserNome(''); setNewUserEmail(''); setNewUserDepts([]); setNewUserIsEstagiario(false); setNewUserIsAdmin(false);
  };

  const editUser = (index: number) => {
    const user = usuarios[index];
    setNewUserNome(user.nome); setNewUserEmail(user.email); setNewUserDepts(user.departamentos || []);
    setNewUserIsEstagiario(user.isEstagiario || false); setNewUserIsAdmin(user.isAdmin || false);
    setEditingUserIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeUser = (index: number) => {
    if (window.confirm('Remover este colaborador?')) {
      const updated = [...usuarios]; updated.splice(index, 1); setUsuarios(updated);
    }
  };

  const toggleNewUserDept = (dept: string) => {
    if (newUserDepts.includes(dept)) setNewUserDepts(newUserDepts.filter(d => d !== dept));
    else setNewUserDepts([...newUserDepts, dept]);
  };

  const toggleExistingUserDept = (userIndex: number, dept: string) => {
    const updatedUsers = [...usuarios];
    const user = updatedUsers[userIndex];
    if (user.departamentos?.includes(dept)) user.departamentos = user.departamentos.filter(d => d !== dept);
    else user.departamentos = [...(user.departamentos || []), dept];
    setUsuarios(updatedUsers);
  };

  const addMetaGlobal = () => {
    if (!newMetaNome.trim() || !newMetaDept) return;
    const metas = localSettings.metas_globais || [];
    setLocalSettings({ ...localSettings, metas_globais: [...metas, { id: generateId(), nome: capitalizeFirstLetter(newMetaNome.trim()), departamento: newMetaDept }] });
    setNewMetaNome('');
  };

  const removeMetaGlobal = (id: string) => {
    if(!window.confirm('Ao excluir, a meta sumirá das empresas vinculadas. Continuar?')) return;
    const metas = (localSettings.metas_globais || []).filter(m => m.id !== id);
    const empresas = (localSettings.empresas_base || []).map(emp => ({ ...emp, metas_vinculadas: emp.metas_vinculadas?.filter(mv => mv.metaId !== id) }));
    setLocalSettings({ ...localSettings, metas_globais: metas, empresas_base: empresas });
  };

  // === LÓGICA DO MODAL MATRIZ DA EMPRESA ===
  const openEmpresaModal = (emp?: EmpresaBase) => {
    if (emp) {
      setEmpresaId(emp.id); setEmpresaNome(emp.nome); setEmpresaTrib(emp.tributacao || ''); setEmpresaAtividade(emp.atividade || '');
      setEmpresaInactive(emp.is_inactive || false); setEmpresaMetas(emp.metas_vinculadas || []); setEmpresaAlocacoes(emp.alocacoes || {});
    } else {
      setEmpresaId(generateId()); setEmpresaNome(''); setEmpresaTrib(''); setEmpresaAtividade('');
      setEmpresaInactive(false); setEmpresaMetas([]); setEmpresaAlocacoes({});
    }
    setIsEmpresaModalOpen(true);
  };

  const toggleDeptAlocacao = (dept: string, isEnabled: boolean) => {
    const novasAlocacoes = { ...empresaAlocacoes };
    if (isEnabled) novasAlocacoes[dept] = { responsavel: '', prioridade: 'A', sem_movimento: false };
    else delete novasAlocacoes[dept];
    setEmpresaAlocacoes(novasAlocacoes);
  };

  const updateDeptAlocacao = (dept: string, field: keyof DeptAlocacao, value: any) => {
    setEmpresaAlocacoes({
      ...empresaAlocacoes,
      [dept]: { ...empresaAlocacoes[dept], [field]: value }
    });
  };

  const linkMetaToEmpresa = () => {
    if (!selectedMetaIdToLink || selectedMetaTimeToLink === '' || selectedMetaTimeToLink <= 0) return;
    if (empresaMetas.some(m => m.metaId === selectedMetaIdToLink)) { alert("Esta meta já está vinculada a esta empresa!"); return; }
    setEmpresaMetas([...empresaMetas, { metaId: selectedMetaIdToLink, tempo_estimado: Number(selectedMetaTimeToLink) }]);
    setSelectedMetaIdToLink(''); setSelectedMetaTimeToLink('');
  };

  const unlinkMetaFromEmpresa = (metaId: string) => {
    setEmpresaMetas(empresaMetas.filter(m => m.metaId !== metaId));
  };

  const saveEmpresa = () => {
    if (!empresaNome.trim()) return;
    const currentEmpresas = [...(localSettings.empresas_base || [])];
    const existingIndex = currentEmpresas.findIndex(e => e.id === empresaId);
    
    const empresaData: EmpresaBase = {
      id: empresaId, nome: empresaNome.toUpperCase().trim(), tributacao: empresaTrib, atividade: empresaAtividade,
      is_inactive: empresaInactive, metas_vinculadas: empresaMetas, alocacoes: empresaAlocacoes
    };

    if (existingIndex >= 0) currentEmpresas[existingIndex] = empresaData;
    else currentEmpresas.push(empresaData);

    setLocalSettings({ ...localSettings, empresas_base: currentEmpresas });
    setIsEmpresaModalOpen(false);
  };

  const removeEmpresa = (id: string) => {
    if (window.confirm('Excluir definitivamente? Considere INATIVÁ-LA para não quebrar o histórico.')) {
      const currentEmpresas = (localSettings.empresas_base || []).filter(e => e.id !== id);
      setLocalSettings({ ...localSettings, empresas_base: currentEmpresas });
      setSelectedEmpresasIds(selectedEmpresasIds.filter(selectedId => selectedId !== id));
    }
  };

  const safeDepartamentos = localSettings.departamentos || [];
  const safeMetasGlobais = localSettings.metas_globais || [];
  const safeTributacoes = localSettings.tributacoes || [];
  const safeAtividades = localSettings.atividades || [];
  const safePrioridades = localSettings.prioridades || [];

  let filteredEmpresas = (localSettings.empresas_base || []).filter(e => {
    const matchSearch = e.nome.toLowerCase().includes(empresaSearch.toLowerCase());
    const matchTrib = empresaFilterTrib ? e.tributacao === empresaFilterTrib : true;
    const matchActive = showInactiveEmpresas ? true : !e.is_inactive; 
    return matchSearch && matchTrib && matchActive;
  });

  filteredEmpresas.sort((a, b) => {
    if (!sortConfig) return a.nome.localeCompare(b.nome);
    let aVal: any = a.nome.toLowerCase(); let bVal: any = b.nome.toLowerCase();
    if (sortConfig.key === 'tributacao') { aVal = a.tributacao || ''; bVal = b.tributacao || ''; } 
    else if (sortConfig.key === 'metas') { aVal = a.metas_vinculadas?.length || 0; bVal = b.metas_vinculadas?.length || 0; }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSortEmpresas = (key: 'nome' | 'tributacao' | 'metas') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedEmpresasIds(filteredEmpresas.map(emp => emp.id));
    else setSelectedEmpresasIds([]);
  };

  const handleSelectOne = (id: string) => {
    if (selectedEmpresasIds.includes(id)) setSelectedEmpresasIds(selectedEmpresasIds.filter(itemId => itemId !== id));
    else setSelectedEmpresasIds([...selectedEmpresasIds, id]);
  };

  const applyBulkTributacao = () => {
    if (!bulkTrib) return;
    const updated = (localSettings.empresas_base || []).map(emp => {
      if (selectedEmpresasIds.includes(emp.id)) return { ...emp, tributacao: bulkTrib };
      return emp;
    });
    setLocalSettings({ ...localSettings, empresas_base: updated });
    setShowBulkModal(null); setSelectedEmpresasIds([]); setBulkTrib('');
  };

  const applyBulkMeta = () => {
    if (!bulkMetaId || bulkMetaTime === '' || bulkMetaTime <= 0) return;
    const updated = (localSettings.empresas_base || []).map(emp => {
      if (selectedEmpresasIds.includes(emp.id)) {
        const metas = emp.metas_vinculadas || [];
        if (!metas.some(m => m.metaId === bulkMetaId)) {
          return { ...emp, metas_vinculadas: [...metas, { metaId: bulkMetaId, tempo_estimado: Number(bulkMetaTime) }] };
        }
      }
      return emp;
    });
    setLocalSettings({ ...localSettings, empresas_base: updated });
    setShowBulkModal(null); setSelectedEmpresasIds([]); setBulkMetaId(''); setBulkMetaTime('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[75vh]">
      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 gap-2">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Painel de Controle</h2>
        <button onClick={() => {setActiveTab('empresas'); setSelectedEmpresasIds([]);}} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'empresas' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}><Briefcase size={18} /> Empresas Base</button>
        <button onClick={() => setActiveTab('metas')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'metas' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}><Target size={18} /> Metas Globais</button>
        <button onClick={() => setActiveTab('departamentos')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'departamentos' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}><Building2 size={18} /> Departamentos</button>
        <button onClick={() => setActiveTab('colaboradores')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'colaboradores' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}><Users size={18} /> Colaboradores</button>
        <button onClick={() => setActiveTab('parametros')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'parametros' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}><ListTodo size={18} /> Parâmetros Extras</button>
        <div className="mt-auto pt-4"><button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"><Save size={18} /> {saving ? 'Sincronizando Painéis...' : 'Salvar Alterações'}</button></div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8 bg-white relative">
        {activeTab === 'empresas' && (
          <div className="max-w-6xl animate-fade-in flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div><h3 className="text-xl font-bold text-[#1e3a8a]">Cadastro de Empresas</h3><p className="text-sm text-slate-500 mt-1">Gerencie a matriz de alocação por departamento e metas.</p></div>
              <button onClick={() => openEmpresaModal()} className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-2"><Plus size={18} /> Nova Empresa</button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Buscar por nome..." value={empresaSearch} onChange={(e) => setEmpresaSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20" /></div>
              <select value={empresaFilterTrib} onChange={(e) => setEmpresaFilterTrib(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#2563eb]"><option value="">Todas Tributações</option>{safeTributacoes.map(t => <option key={t} value={t}>{t}</option>)}</select>
              <button onClick={() => setShowInactiveEmpresas(!showInactiveEmpresas)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${showInactiveEmpresas ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{showInactiveEmpresas ? <EyeOff size={16}/> : <UserCheck size={16}/>}{showInactiveEmpresas ? "Ocultar Inativas" : "Ver Inativas"}</button>
            </div>

            {selectedEmpresasIds.length > 0 && (
              <div className="bg-[#f0f4ff] border border-[#bfdbfe] p-3 rounded-xl mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in shadow-sm">
                <span className="text-sm font-black text-[#1e3a8a] flex items-center gap-2"><CheckSquare size={18} /> {selectedEmpresasIds.length} empresas selecionadas</span>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => setShowBulkModal('tributacao')} className="flex-1 md:flex-none bg-white border border-[#2563eb] text-[#2563eb] hover:bg-[#dbeafe] px-4 py-2 rounded-lg text-xs font-bold transition-colors">Alterar Tributação</button>
                  <button onClick={() => setShowBulkModal('meta')} className="flex-1 md:flex-none bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">+ Vincular Meta</button>
                </div>
              </div>
            )}

            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center border-r border-slate-200"><input type="checkbox" onChange={handleSelectAll} checked={filteredEmpresas.length > 0 && selectedEmpresasIds.length === filteredEmpresas.length} className="w-4 h-4 text-[#2563eb] rounded border-slate-300 cursor-pointer" /></th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortEmpresas('nome')}><div className="flex items-center gap-1">Empresa <ArrowUpDown size={14} className="text-slate-400"/></div></th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortEmpresas('tributacao')}><div className="flex items-center justify-center gap-1">Tributação <ArrowUpDown size={14} className="text-slate-400"/></div></th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortEmpresas('metas')}><div className="flex items-center justify-center gap-1">Metas Vinculadas <ArrowUpDown size={14} className="text-slate-400"/></div></th>
                      <th className="px-4 py-3 text-right">Matriz e Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmpresas.map(emp => (
                      <tr key={emp.id} className={`hover:bg-slate-50 group transition-colors ${selectedEmpresasIds.includes(emp.id) ? 'bg-[#f0f4ff]/40' : ''} ${emp.is_inactive ? 'opacity-60 bg-slate-50' : ''}`}>
                        <td className="px-4 py-3 text-center border-r border-slate-100"><input type="checkbox" checked={selectedEmpresasIds.includes(emp.id)} onChange={() => handleSelectOne(emp.id)} className="w-4 h-4 text-[#2563eb] rounded border-slate-300 cursor-pointer" /></td>
                        <td className="px-4 py-3 font-bold text-slate-800">{emp.nome} {emp.is_inactive && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md ml-2">INATIVA</span>}</td>
                        <td className="px-4 py-3 text-center">{emp.tributacao ? <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{emp.tributacao}</span> : '-'}</td>
                        <td className="px-4 py-3 text-center text-[#2563eb] font-bold text-xs bg-[#f0f4ff]/50">{emp.metas_vinculadas?.length || 0} metas</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Pílulas que mostram em quais setores a empresa está alocada */}
                            <div className="flex gap-1 mr-2">
                              {safeDepartamentos.map(d => emp.alocacoes && emp.alocacoes[d] ? <span key={d} className="bg-[#dbeafe] text-[#1e3a8a] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" title={`Responsável: ${emp.alocacoes[d].responsavel}`}>{d.substring(0,3)}</span> : null)}
                            </div>
                            <button onClick={() => openEmpresaModal(emp)} className="p-1.5 text-[#2563eb] hover:bg-[#f0f4ff] rounded-md transition-colors" title="Abrir Matriz da Empresa"><Settings2 size={16} /></button>
                            <button onClick={() => removeEmpresa(emp.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Excluir Empresa"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEmpresas.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Nenhuma empresa encontrada.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* OUTRAS ABAS INALTERADAS (Ocultado código interno por clareza, mas mantido na execução) */}
        {activeTab === 'metas' && (
          <div className="max-w-3xl animate-fade-in"><div className="mb-6"><h3 className="text-xl font-bold text-[#1e3a8a]">Biblioteca de Metas (Ações)</h3></div><div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 shadow-inner"><div className="flex flex-col md:flex-row gap-3"><input type="text" value={newMetaNome} onChange={(e) => setNewMetaNome(e.target.value)} placeholder="Nome da Meta (Ex: Fechamento de folha)" className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb] font-bold text-sm text-slate-700" /><select value={newMetaDept} onChange={(e) => setNewMetaDept(e.target.value)} className="md:w-48 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb] text-sm font-bold text-slate-700"><option value="">Qual setor?</option>{safeDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}</select><button onClick={addMetaGlobal} disabled={!newMetaNome || !newMetaDept} className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"><Plus size={18} /> Criar</button></div></div><div className="space-y-3">{safeDepartamentos.map(dept => {const metasDoDept = safeMetasGlobais.filter(m => m.departamento === dept); if(metasDoDept.length === 0) return null; return (<div key={dept} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"><div className="bg-slate-100 p-3 border-b border-slate-200 font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2"><Target size={14} className="text-[#2563eb]"/> Metas do {dept} ({metasDoDept.length})</div><div className="divide-y divide-slate-100">{metasDoDept.map(meta => (<div key={meta.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors group"><span className="font-bold text-slate-800 text-sm">{meta.nome}</span><button onClick={() => removeMetaGlobal(meta.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded hover:bg-red-50" title="Excluir Meta Geral"><Trash2 size={16} /></button></div>))}</div></div>);})}</div></div>
        )}
        {activeTab === 'colaboradores' && (
          <div className="max-w-4xl animate-fade-in"><div className="mb-6"><h3 className="text-xl font-bold text-[#1e3a8a]">Gestão de Colaboradores e Acessos</h3></div><div className={`border rounded-2xl p-5 mb-8 shadow-inner transition-colors ${editingUserIndex !== null ? 'bg-[#f0f4ff] border-[#bfdbfe]' : 'bg-slate-50 border-slate-200'}`}><div className="flex justify-between items-center mb-3"><h4 className={`text-sm font-bold uppercase tracking-wider ${editingUserIndex !== null ? 'text-[#1e3a8a]' : 'text-slate-700'}`}>{editingUserIndex !== null ? 'Editando Colaborador' : 'Novo Colaborador'}</h4>{editingUserIndex !== null && <button onClick={() => {setEditingUserIndex(null); setNewUserNome(''); setNewUserEmail(''); setNewUserDepts([]); setNewUserIsEstagiario(false); setNewUserIsAdmin(false);}} className="text-slate-400 hover:text-slate-700 text-xs font-bold underline">Cancelar Edição</button>}</div><div className="flex flex-col md:flex-row gap-4 items-start"><div className="flex-1 w-full space-y-3"><input type="text" value={newUserNome} onChange={(e) => setNewUserNome(e.target.value)} placeholder="Nome (Ex: CAMILA)" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb] uppercase font-bold text-sm" /><input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="E-mail de acesso (@vsmweb.com.br)" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb] text-sm" /><div className="flex flex-col gap-2 mt-3 p-3 bg-white border border-slate-200 rounded-lg"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newUserIsEstagiario} onChange={(e) => setNewUserIsEstagiario(e.target.checked)} className="w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb]" /><span className="text-sm font-bold text-slate-600">É Estagiário</span></label><hr className="border-slate-100" /><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newUserIsAdmin} onChange={(e) => setNewUserIsAdmin(e.target.checked)} className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-600" /><span className="text-sm font-black text-red-600">É Administrador</span></label></div></div><div className={`w-full md:w-auto bg-white border border-slate-200 p-3 rounded-lg flex-1 transition-opacity ${newUserIsAdmin ? 'opacity-50 pointer-events-none' : ''}`}><span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vincular aos Setores: {newUserIsAdmin && "(Admin vê todos)"}</span><div className="flex flex-wrap gap-2">{safeDepartamentos.map(dept => (<label key={dept} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors text-xs font-bold select-none ${newUserDepts.includes(dept) ? 'bg-[#dbeafe] border-[#bfdbfe] text-[#1e3a8a]' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}><input type="checkbox" className="hidden" checked={newUserDepts.includes(dept)} onChange={() => toggleNewUserDept(dept)} />{dept}</label>))}</div></div><button onClick={saveUser} disabled={!newUserNome || !newUserEmail || (!newUserIsAdmin && newUserDepts.length === 0)} className={`w-full md:w-auto h-full min-h-[85px] text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${editingUserIndex !== null ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#2563eb] hover:bg-[#1e3a8a]'}`}>{editingUserIndex !== null ? <Check size={20} /> : <Plus size={20} />}</button></div></div><div className="space-y-3">{usuarios.map((user, index) => (<div key={index} className={`border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group shadow-sm hover:border-[#2563eb] transition-all ${editingUserIndex === index ? 'border-[#2563eb] bg-[#f0f4ff]/50' : 'bg-white border-slate-200'}`}><div><h4 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">{user.nome} {user.isEstagiario && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold tracking-wider">ESTAGIÁRIO</span>}{user.isAdmin && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold tracking-wider border border-red-200">ADMIN</span>}</h4><span className="text-sm text-slate-500 font-medium">{user.email}</span></div><div className="flex-1 flex flex-wrap justify-end gap-2">{user.isAdmin ? (<span className="text-xs font-bold text-red-500 uppercase">Acesso Global</span>) : (safeDepartamentos.map(dept => {const isLinked = user.departamentos?.includes(dept); return isLinked ? <span key={dept} className="bg-[#f0f4ff] border border-[#bfdbfe] text-[#2563eb] px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">{dept}</span> : null; }))}</div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => editUser(index)} className="text-slate-400 hover:text-[#2563eb] p-2 rounded-lg hover:bg-[#f0f4ff] transition-colors"><Edit2 size={16} /></button><button onClick={() => removeUser(index)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /></button></div></div>))}</div></div>
        )}
        {activeTab === 'departamentos' && (
          <div className="max-w-2xl animate-fade-in"><div className="mb-6"><h3 className="text-xl font-bold text-[#1e3a8a]">Gestão de Departamentos</h3></div><div className="flex gap-2 mb-6"><input type="text" value={newDepartamento} onChange={(e) => setNewDepartamento(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemString('departamentos', newDepartamento, setNewDepartamento)} placeholder="NOME DO NOVO SETOR" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 uppercase font-bold" /><button onClick={() => addItemString('departamentos', newDepartamento, setNewDepartamento)} className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-4 py-2 rounded-lg font-bold"><Plus size={20} /></button></div><div className="grid grid-cols-2 gap-3">{safeDepartamentos.map((dept, idx) => (<div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center group shadow-sm"><span className="font-bold text-slate-700">{dept}</span><button onClick={() => removeItemString('departamentos', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>))}</div></div>
        )}
        {activeTab === 'parametros' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in"><div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner"><h4 className="font-bold text-[#1e3a8a] mb-4">Atividades</h4><div className="flex gap-2 mb-4"><input type="text" value={newAtividade} onChange={(e) => setNewAtividade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemString('atividades', newAtividade, setNewAtividade)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/><button onClick={() => addItemString('atividades', newAtividade, setNewAtividade)} className="bg-white border border-slate-300 p-2 rounded text-[#2563eb]"><Plus size={18}/></button></div><div className="space-y-2 max-h-[400px] overflow-auto pr-2">{(localSettings.atividades || []).map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border group"><span className="text-sm font-medium">{item}</span><button onClick={() => removeItemString('atividades', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button></div>))}</div></div><div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner"><h4 className="font-bold text-[#1e3a8a] mb-4">Prioridades</h4><div className="flex gap-2 mb-4"><input type="text" value={newPrioridade} onChange={(e) => setNewPrioridade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemString('prioridades', newPrioridade, setNewPrioridade)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/><button onClick={() => addItemString('prioridades', newPrioridade, setNewPrioridade)} className="bg-white border border-slate-300 p-2 rounded text-[#2563eb]"><Plus size={18}/></button></div><div className="space-y-2 max-h-[400px] overflow-auto pr-2">{(localSettings.prioridades || []).map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border group"><span className="text-sm font-bold">{item}</span><button onClick={() => removeItemString('prioridades', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button></div>))}</div></div><div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner"><h4 className="font-bold text-[#1e3a8a] mb-4">Tributações</h4><div className="flex gap-2 mb-4"><input type="text" value={newTributacao} onChange={(e) => setNewTributacao(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemString('tributacoes', newTributacao, setNewTributacao)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/><button onClick={() => addItemString('tributacoes', newTributacao, setNewTributacao)} className="bg-white border border-slate-300 p-2 rounded text-[#2563eb]"><Plus size={18}/></button></div><div className="space-y-2 max-h-[400px] overflow-auto pr-2">{(localSettings.tributacoes || []).map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border group"><span className="text-sm font-medium">{item}</span><button onClick={() => removeItemString('tributacoes', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button></div>))}</div></div></div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DA EMPRESA MATRIZ */}
      {isEmpresaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f0f4ff]">
              <div><h2 className="text-2xl font-black text-[#1e3a8a]">{empresaNome ? 'Matriz da Empresa' : 'Nova Empresa Base'}</h2><p className="text-xs text-slate-500 mt-1">Configure o perfil global e defina em quais departamentos ela atua.</p></div>
              <button onClick={() => setIsEmpresaModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full border border-slate-200"><X size={20}/></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-8 bg-slate-50/50">
              
              {/* DADOS BÁSICOS */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dados Principais</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome da Empresa</label><input type="text" value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-[#2563eb] uppercase font-bold" placeholder="EX: VSM TECNOLOGIA" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tributação</label><select value={empresaTrib} onChange={(e) => setEmpresaTrib(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-[#2563eb] font-bold text-slate-700"><option value="">Selecione...</option>{safeTributacoes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Atividade</label><select value={empresaAtividade} onChange={(e) => setEmpresaAtividade(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-[#2563eb] font-bold text-slate-700"><option value="">Selecione...</option>{safeAtividades.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                </div>
                <div className="flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100 mt-4 w-fit">
                  <input type="checkbox" id="emp_inativa" checked={empresaInactive} onChange={(e) => setEmpresaInactive(e.target.checked)} className="w-4 h-4 text-red-600 rounded border-red-300 cursor-pointer focus:ring-red-600" />
                  <label htmlFor="emp_inativa" className="text-sm font-bold text-red-700 cursor-pointer">Desativar Cliente Totalmente (Oculta de todos os painéis)</label>
                </div>
              </div>

              {/* MATRIZ DE DEPARTAMENTOS (O CORAÇÃO DA ALOCAÇÃO) */}
              <div>
                <h4 className="text-sm font-black text-[#1e3a8a] uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Building2 size={16}/> Matriz de Operação por Departamento
                </h4>
                <div className="space-y-3">
                  {safeDepartamentos.map(dept => {
                    const isAllocated = !!empresaAlocacoes[dept];
                    // Pega analistas deste departamento
                    const deptUsers = usuarios.filter(u => u.departamentos?.includes(dept) || u.isAdmin).map(u => u.nome).sort();
                    
                    return (
                      <div key={dept} className={`p-4 rounded-xl border transition-all ${isAllocated ? 'border-[#2563eb] bg-[#f0f4ff]/40 shadow-sm' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id={`alloc_${dept}`} checked={isAllocated} onChange={(e) => toggleDeptAlocacao(dept, e.target.checked)} className="w-5 h-5 text-[#2563eb] rounded border-slate-300 cursor-pointer focus:ring-[#2563eb]"/>
                          <label htmlFor={`alloc_${dept}`} className={`text-base cursor-pointer font-bold uppercase tracking-wider ${isAllocated ? 'text-[#1e3a8a]' : 'text-slate-400'}`}>
                            {dept}
                          </label>
                        </div>
                        
                        {isAllocated && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pl-8 border-l-2 border-[#2563eb]/20 ml-2">
                            <div>
                              <label className="block text-[10px] font-bold text-[#2563eb] uppercase mb-1">Responsável Técnico</label>
                              <select value={empresaAlocacoes[dept].responsavel} onChange={(e) => updateDeptAlocacao(dept, 'responsavel', e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold text-slate-800 focus:border-[#2563eb] bg-white">
                                <option value="">Atribuir a...</option>
                                {deptUsers.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nível de Prioridade</label>
                              <select value={empresaAlocacoes[dept].prioridade} onChange={(e) => updateDeptAlocacao(dept, 'prioridade', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 bg-white focus:border-[#2563eb]">
                                <option value="">Padrão</option>
                                {safePrioridades.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            <div className="flex items-end pb-2">
                              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 w-full hover:bg-slate-200 transition-colors">
                                <input type="checkbox" checked={empresaAlocacoes[dept].sem_movimento} onChange={(e) => updateDeptAlocacao(dept, 'sem_movimento', e.target.checked)} className="w-4 h-4 text-slate-600 rounded border-slate-300" />
                                <span className="text-xs font-bold text-slate-700">S/ Movimento neste setor</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VINCULAÇÃO DE METAS */}
              <div>
                <h4 className="text-sm font-black text-[#1e3a8a] uppercase tracking-wider flex items-center gap-2 mb-3"><Target size={16}/> Metas Vinculadas ({empresaMetas.length})</h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 mb-4 items-end shadow-sm">
                  <div className="flex-1 w-full"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecione a Meta</label><select value={selectedMetaIdToLink} onChange={(e) => setSelectedMetaIdToLink(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 focus:border-[#2563eb]"><option value="">Escolha uma meta...</option>{safeMetasGlobais.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.departamento})</option>)}</select></div>
                  <div className="w-full md:w-32"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tempo Est. (Dias)</label><input type="number" step="0.5" min="0" value={selectedMetaTimeToLink} onChange={(e) => setSelectedMetaTimeToLink(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-bold focus:border-[#2563eb]" placeholder="Ex: 1.5"/></div>
                  <button onClick={linkMetaToEmpresa} disabled={!selectedMetaIdToLink || selectedMetaTimeToLink === ''} className="w-full md:w-auto px-6 py-2 bg-[#2563eb] hover:bg-[#1e3a8a] text-white rounded-lg font-bold disabled:opacity-50 transition-colors">Vincular</button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm"><thead className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider"><tr><th className="px-4 py-2">Meta / Ação</th><th className="px-4 py-2 text-center">Setor</th><th className="px-4 py-2 text-center">Tempo (Dias)</th><th className="px-4 py-2 text-right">Remover</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{empresaMetas.map(metaV => {const metaOriginal = safeMetasGlobais.find(m => m.id === metaV.metaId); return (<tr key={metaV.metaId} className="hover:bg-slate-50"><td className="px-4 py-2 font-bold text-slate-800">{metaOriginal?.nome || 'Meta Excluída'}</td><td className="px-4 py-2 text-center"><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase">{metaOriginal?.departamento || '-'}</span></td><td className="px-4 py-2 text-center font-black text-[#2563eb]">{metaV.tempo_estimado}d</td><td className="px-4 py-2 text-right"><button onClick={() => unlinkMetaFromEmpresa(metaV.metaId)} className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"><Trash2 size={16}/></button></td></tr>);})}{empresaMetas.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400 text-xs font-medium">Nenhuma meta configurada.</td></tr>}</tbody></table>
                </div>
              </div>

            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3"><button onClick={() => setIsEmpresaModalOpen(false)} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors border border-slate-200">Cancelar</button><button onClick={saveEmpresa} disabled={!empresaNome} className="px-8 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm">Confirmar Configuração</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
