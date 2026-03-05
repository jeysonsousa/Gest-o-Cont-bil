/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, UsuarioConfig, EmpresaBase, MetaGlobal, MetaVinculada } from '../types';
import { Plus, Trash2, Save, Building2, Users, Briefcase, ListTodo, ShieldAlert, Edit2, Search, Target, X, Check, CheckSquare } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => Promise<void>;
}

const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substr(2, 9);

// Função para formatar as Metas (Primeira letra maiúscula)
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

  const [newMetaNome, setNewMetaNome] = useState('');
  const [newMetaDept, setNewMetaDept] = useState('');

  const [empresaSearch, setEmpresaSearch] = useState('');
  const [empresaFilterTrib, setEmpresaFilterTrib] = useState('');
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
  
  const [empresaId, setEmpresaId] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaTrib, setEmpresaTrib] = useState('');
  const [empresaMetas, setEmpresaMetas] = useState<MetaVinculada[]>([]);
  
  const [selectedMetaIdToLink, setSelectedMetaIdToLink] = useState('');
  const [selectedMetaTimeToLink, setSelectedMetaTimeToLink] = useState<number | ''>('');

  // === ESTADOS PARA EDIÇÃO EM LOTE (BULK) ===
  const [selectedEmpresasIds, setSelectedEmpresasIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState<'tributacao' | 'meta' | null>(null);
  const [bulkTrib, setBulkTrib] = useState('');
  const [bulkMetaId, setBulkMetaId] = useState('');
  const [bulkMetaTime, setBulkMetaTime] = useState<number | ''>('');

  useEffect(() => {
    setLocalSettings({
      ...settings,
      departamentos: settings.departamentos || ['Contábil', 'Fiscal', 'Pessoal'],
      empresas_base: settings.empresas_base || [],
      metas_globais: settings.metas_globais || []
    });

    let parsedUsers: UsuarioConfig[] = [];
    if (typeof settings.usuarios === 'string') {
      try { parsedUsers = JSON.parse(settings.usuarios); } catch (e) {}
    } else if (Array.isArray(settings.usuarios)) {
      parsedUsers = settings.usuarios;
    }
    setUsuarios(parsedUsers.map(u => ({ ...u, departamentos: u.departamentos || [] })));
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const finalSettings = { ...localSettings, usuarios: JSON.stringify(usuarios) };
    await setSettings(finalSettings);
    alert('Configurações Globais salvas com sucesso!');
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

  // === LÓGICA: COLABORADORES ===
  const saveUser = () => {
    if (!newUserNome.trim() || !newUserEmail.trim() || newUserDepts.length === 0) return;
    
    const updatedUsers = [...usuarios];
    const userData = { nome: newUserNome.toUpperCase().trim(), email: newUserEmail.toLowerCase().trim(), departamentos: newUserDepts };
    
    if (editingUserIndex !== null) {
      updatedUsers[editingUserIndex] = userData;
      setEditingUserIndex(null);
    } else {
      updatedUsers.push(userData);
    }
    
    setUsuarios(updatedUsers);
    setNewUserNome(''); setNewUserEmail(''); setNewUserDepts([]);
  };

  const editUser = (index: number) => {
    const user = usuarios[index];
    setNewUserNome(user.nome);
    setNewUserEmail(user.email);
    setNewUserDepts(user.departamentos || []);
    setEditingUserIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeUser = (index: number) => {
    if (window.confirm('Remover este colaborador?')) {
      const updated = [...usuarios];
      updated.splice(index, 1);
      setUsuarios(updated);
    }
  };

  // === LÓGICA: METAS GLOBAIS ===
  const addMetaGlobal = () => {
    if (!newMetaNome.trim() || !newMetaDept) return;
    const metas = localSettings.metas_globais || [];
    setLocalSettings({
      ...localSettings,
      // Aplica a regra da primeira letra maiúscula e o resto como o usuário digitou
      metas_globais: [...metas, { id: generateId(), nome: capitalizeFirstLetter(newMetaNome.trim()), departamento: newMetaDept }]
    });
    setNewMetaNome('');
  };

  const removeMetaGlobal = (id: string) => {
    if(!window.confirm('Atenção! Ao excluir esta meta, ela sumirá das empresas vinculadas. Continuar?')) return;
    const metas = (localSettings.metas_globais || []).filter(m => m.id !== id);
    const empresas = (localSettings.empresas_base || []).map(emp => ({
      ...emp, metas_vinculadas: emp.metas_vinculadas?.filter(mv => mv.metaId !== id)
    }));
    setLocalSettings({ ...localSettings, metas_globais: metas, empresas_base: empresas });
  };

  // === LÓGICA: EMPRESAS BASE E MODAL ÚNICA ===
  const openEmpresaModal = (emp?: EmpresaBase) => {
    if (emp) {
      setEmpresaId(emp.id);
      setEmpresaNome(emp.nome);
      setEmpresaTrib(emp.tributacao || '');
      setEmpresaMetas(emp.metas_vinculadas || []);
    } else {
      setEmpresaId(generateId());
      setEmpresaNome('');
      setEmpresaTrib('');
      setEmpresaMetas([]);
    }
    setIsEmpresaModalOpen(true);
  };

  const linkMetaToEmpresa = () => {
    if (!selectedMetaIdToLink || selectedMetaTimeToLink === '' || selectedMetaTimeToLink <= 0) return;
    if (empresaMetas.some(m => m.metaId === selectedMetaIdToLink)) {
      alert("Esta meta já está vinculada a esta empresa!"); return;
    }
    setEmpresaMetas([...empresaMetas, { metaId: selectedMetaIdToLink, tempo_estimado: Number(selectedMetaTimeToLink) }]);
    setSelectedMetaIdToLink('');
    setSelectedMetaTimeToLink('');
  };

  const unlinkMetaFromEmpresa = (metaId: string) => {
    setEmpresaMetas(empresaMetas.filter(m => m.metaId !== metaId));
  };

  const saveEmpresa = () => {
    if (!empresaNome.trim()) return;
    const currentEmpresas = [...(localSettings.empresas_base || [])];
    const existingIndex = currentEmpresas.findIndex(e => e.id === empresaId);
    
    const empresaData: EmpresaBase = {
      id: empresaId,
      nome: empresaNome.toUpperCase().trim(),
      tributacao: empresaTrib,
      metas_vinculadas: empresaMetas
    };

    if (existingIndex >= 0) {
      currentEmpresas[existingIndex] = empresaData;
    } else {
      currentEmpresas.push(empresaData);
    }

    setLocalSettings({ ...localSettings, empresas_base: currentEmpresas });
    setIsEmpresaModalOpen(false);
  };

  const removeEmpresa = (id: string) => {
    if (window.confirm('Excluir esta Empresa Base?')) {
      const currentEmpresas = (localSettings.empresas_base || []).filter(e => e.id !== id);
      setLocalSettings({ ...localSettings, empresas_base: currentEmpresas });
      // Limpa a seleção se a empresa excluída estivesse selecionada
      setSelectedEmpresasIds(selectedEmpresasIds.filter(selectedId => selectedId !== id));
    }
  };

  // === LÓGICA: EDIÇÃO EM LOTE (BULK) ===
  const safeDepartamentos = localSettings.departamentos || [];
  const safeMetasGlobais = localSettings.metas_globais || [];
  const safeTributacoes = localSettings.tributacoes || [];

  const filteredEmpresas = (localSettings.empresas_base || []).filter(e => {
    const matchSearch = e.nome.toLowerCase().includes(empresaSearch.toLowerCase());
    const matchTrib = empresaFilterTrib ? e.tributacao === empresaFilterTrib : true;
    return matchSearch && matchTrib;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmpresasIds(filteredEmpresas.map(emp => emp.id));
    } else {
      setSelectedEmpresasIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedEmpresasIds.includes(id)) {
      setSelectedEmpresasIds(selectedEmpresasIds.filter(itemId => itemId !== id));
    } else {
      setSelectedEmpresasIds([...selectedEmpresasIds, id]);
    }
  };

  const applyBulkTributacao = () => {
    if (!bulkTrib) return;
    const updated = (localSettings.empresas_base || []).map(emp => {
      if (selectedEmpresasIds.includes(emp.id)) {
        return { ...emp, tributacao: bulkTrib };
      }
      return emp;
    });
    setLocalSettings({ ...localSettings, empresas_base: updated });
    setShowBulkModal(null);
    setSelectedEmpresasIds([]);
    setBulkTrib('');
  };

  const applyBulkMeta = () => {
    if (!bulkMetaId || bulkMetaTime === '' || bulkMetaTime <= 0) return;
    const updated = (localSettings.empresas_base || []).map(emp => {
      if (selectedEmpresasIds.includes(emp.id)) {
        const metas = emp.metas_vinculadas || [];
        // Só adiciona se a empresa ainda não tiver essa meta
        if (!metas.some(m => m.metaId === bulkMetaId)) {
          return { ...emp, metas_vinculadas: [...metas, { metaId: bulkMetaId, tempo_estimado: Number(bulkMetaTime) }] };
        }
      }
      return emp;
    });
    setLocalSettings({ ...localSettings, empresas_base: updated });
    setShowBulkModal(null);
    setSelectedEmpresasIds([]);
    setBulkMetaId('');
    setBulkMetaTime('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[75vh]">
      
      {/* MENU LATERAL */}
      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 gap-2">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Painel de Controle</h2>
        
        <button onClick={() => {setActiveTab('empresas'); setSelectedEmpresasIds([]);}} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'empresas' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Briefcase size={18} /> Empresas Base
        </button>
        <button onClick={() => setActiveTab('metas')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'metas' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Target size={18} /> Metas Globais
        </button>
        <button onClick={() => setActiveTab('departamentos')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'departamentos' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Building2 size={18} /> Departamentos
        </button>
        <button onClick={() => setActiveTab('colaboradores')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'colaboradores' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Users size={18} /> Colaboradores
        </button>
        <button onClick={() => setActiveTab('parametros')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'parametros' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}>
          <ListTodo size={18} /> Parâmetros Extras
        </button>

        <div className="mt-auto pt-4">
          <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50">
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 overflow-auto p-6 md:p-8 bg-white relative">
        
        {/* ABA: EMPRESAS BASE COM BULK EDIT */}
        {activeTab === 'empresas' && (
          <div className="max-w-5xl animate-fade-in flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#1e3a8a]">Cadastro Global de Empresas</h3>
                <p className="text-sm text-slate-500 mt-1">Gerencie as empresas, suas tributações e as metas específicas de cada uma.</p>
              </div>
              <button onClick={() => openEmpresaModal()} className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-2">
                <Plus size={18} /> Nova Empresa
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar por nome..." value={empresaSearch} onChange={(e) => setEmpresaSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20" />
              </div>
              <select value={empresaFilterTrib} onChange={(e) => setEmpresaFilterTrib(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#2563eb]">
                <option value="">Todas Tributações</option>
                {safeTributacoes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* BARRA DE AÇÕES EM LOTE */}
            {selectedEmpresasIds.length > 0 && (
              <div className="bg-[#f0f4ff] border border-[#bfdbfe] p-3 rounded-xl mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in shadow-sm">
                <span className="text-sm font-black text-[#1e3a8a] flex items-center gap-2">
                  <CheckSquare size={18} /> {selectedEmpresasIds.length} empresas selecionadas
                </span>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => setShowBulkModal('tributacao')} className="flex-1 md:flex-none bg-white border border-[#2563eb] text-[#2563eb] hover:bg-[#dbeafe] px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                    Alterar Tributação
                  </button>
                  <button onClick={() => setShowBulkModal('meta')} className="flex-1 md:flex-none bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                    + Vincular Meta
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll} 
                          checked={filteredEmpresas.length > 0 && selectedEmpresasIds.length === filteredEmpresas.length} 
                          className="w-4 h-4 text-[#2563eb] rounded border-slate-300 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3 text-center">Tributação</th>
                      <th className="px-4 py-3 text-center">Metas Vinculadas</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmpresas.map(emp => (
                      <tr key={emp.id} className={`hover:bg-slate-50 group transition-colors ${selectedEmpresasIds.includes(emp.id) ? 'bg-[#f0f4ff]/40' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedEmpresasIds.includes(emp.id)} 
                            onChange={() => handleSelectOne(emp.id)} 
                            className="w-4 h-4 text-[#2563eb] rounded border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{emp.nome}</td>
                        <td className="px-4 py-3 text-center">
                          {emp.tributacao ? <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{emp.tributacao}</span> : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-[#2563eb] font-bold text-xs bg-[#f0f4ff]/50">
                          {emp.metas_vinculadas?.length || 0} metas
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEmpresaModal(emp)} className="p-1.5 text-slate-400 hover:text-[#2563eb] hover:bg-[#f0f4ff] rounded-md transition-colors" title="Editar Empresa e Metas"><Edit2 size={16} /></button>
                            <button onClick={() => removeEmpresa(emp.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEmpresas.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Nenhuma empresa encontrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA: METAS GLOBAIS */}
        {activeTab === 'metas' && (
          <div className="max-w-3xl animate-fade-in">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-[#1e3a8a]">Biblioteca de Metas (Ações)</h3>
              <p className="text-sm text-slate-500 mt-1">Crie as ações que serão cobradas nos setores. Depois, vincule-as dentro do cadastro das Empresas Base.</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 shadow-inner">
              <div className="flex flex-col md:flex-row gap-3">
                {/* CAMPO DE TEXTO SEM BLOQUEIO UPPERCASE FORÇADO */}
                <input 
                  type="text" 
                  value={newMetaNome} 
                  onChange={(e) => setNewMetaNome(e.target.value)} 
                  placeholder="Nome da Meta (Ex: Fechamento de folha)" 
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb] font-bold text-sm text-slate-700" 
                />
                <select value={newMetaDept} onChange={(e) => setNewMetaDept(e.target.value)} className="md:w-48 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb] text-sm font-bold text-slate-700">
                  <option value="">Qual setor?</option>
                  {safeDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button onClick={addMetaGlobal} disabled={!newMetaNome || !newMetaDept} className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  <Plus size={18} /> Criar Meta
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {safeDepartamentos.map(dept => {
                const metasDoDept = safeMetasGlobais.filter(m => m.departamento === dept);
                if(metasDoDept.length === 0) return null;
                return (
                  <div key={dept} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 p-3 border-b border-slate-200 font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                      <Target size={14} className="text-[#2563eb]"/> Metas do {dept} ({metasDoDept.length})
                    </div>
                    <div className="divide-y divide-slate-100">
                      {metasDoDept.map(meta => (
                        <div key={meta.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors group">
                          <span className="font-bold text-slate-800 text-sm">{meta.nome}</span>
                          <button onClick={() => removeMetaGlobal(meta.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded hover:bg-red-50" title="Excluir Meta Geral"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {safeMetasGlobais.length === 0 && <div className="text-center p-8 text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-200 border-dashed">Nenhuma meta criada. Comece adicionando acima!</div>}
            </div>
          </div>
        )}

        {/* ABA: COLABORADORES */}
        {activeTab === 'colaboradores' && (
          <div className="max-w-4xl animate-fade-in">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-[#1e3a8a]">Gestão de Colaboradores e Acessos</h3>
              <p className="text-sm text-slate-500 mt-1">Gerencie os acessos e departamentos de cada membro da equipe.</p>
            </div>

            <div className={`border rounded-2xl p-5 mb-8 shadow-inner transition-colors ${editingUserIndex !== null ? 'bg-[#f0f4ff] border-[#bfdbfe]' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className={`text-sm font-bold uppercase tracking-wider ${editingUserIndex !== null ? 'text-[#1e3a8a]' : 'text-slate-700'}`}>
                  {editingUserIndex !== null ? 'Editando Colaborador' : 'Novo Colaborador'}
                </h4>
                {editingUserIndex !== null && (
                  <button onClick={() => {setEditingUserIndex(null); setNewUserNome(''); setNewUserEmail(''); setNewUserDepts([]);}} className="text-slate-400 hover:text-slate-700 text-xs font-bold underline">Cancelar Edição</button>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-3">
                  <input type="text" value={newUserNome} onChange={(e) => setNewUserNome(e.target.value)} placeholder="Nome (Ex: CAMILA)" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb] uppercase font-bold text-sm" />
                  <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="E-mail de acesso (@vsmweb.com.br)" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb] text-sm" />
                </div>
                
                <div className="w-full md:w-auto bg-white border border-slate-200 p-3 rounded-lg flex-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vincular aos Setores:</span>
                  <div className="flex flex-wrap gap-2">
                    {safeDepartamentos.map(dept => (
                      <label key={dept} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors text-xs font-bold select-none ${newUserDepts.includes(dept) ? 'bg-[#dbeafe] border-[#bfdbfe] text-[#1e3a8a]' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="checkbox" className="hidden" checked={newUserDepts.includes(dept)} onChange={() => {
                          if (newUserDepts.includes(dept)) setNewUserDepts(newUserDepts.filter(d => d !== dept));
                          else setNewUserDepts([...newUserDepts, dept]);
                        }} />
                        {dept}
                      </label>
                    ))}
                  </div>
                </div>

                <button onClick={saveUser} disabled={!newUserNome || !newUserEmail || newUserDepts.length === 0} className={`w-full md:w-auto h-full min-h-[85px] text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${editingUserIndex !== null ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#2563eb] hover:bg-[#1e3a8a]'}`}>
                  {editingUserIndex !== null ? <Check size={20} /> : <Plus size={20} />} 
                  {editingUserIndex !== null ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {usuarios.map((user, index) => (
                <div key={index} className={`border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group shadow-sm hover:border-[#2563eb] transition-all ${editingUserIndex === index ? 'border-[#2563eb] bg-[#f0f4ff]/50' : 'bg-white border-slate-200'}`}>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg uppercase">{user.nome}</h4>
                    <span className="text-sm text-slate-500 font-medium">{user.email}</span>
                  </div>
                  <div className="flex-1 flex flex-wrap justify-end gap-2">
                    {safeDepartamentos.map(dept => {
                      const isLinked = user.departamentos?.includes(dept);
                      return isLinked ? <span key={dept} className="bg-[#f0f4ff] border border-[#bfdbfe] text-[#2563eb] px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">{dept}</span> : null;
                    })}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editUser(index)} className="text-slate-400 hover:text-[#2563eb] p-2 rounded-lg hover:bg-[#f0f4ff] transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => removeUser(index)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: PARÂMETROS EXTRAS */}
        {activeTab === 'parametros' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
             <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
               <h4 className="font-bold text-[#1e3a8a] mb-4">Atividades</h4>
               <div className="flex gap-2 mb-4"><input type="text" value={newAtividade} onChange={(e) => setNewAtividade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemString('atividades', newAtividade, setNewAtividade)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/><button onClick={() => addItemString('atividades', newAtividade, setNewAtividade)} className="bg-white border border-slate-300 p-2 rounded text-[#2563eb]"><Plus size={18}/></button></div>
               <div className="space-y-2 max-h-[400px] overflow-auto pr-2">{(localSettings.atividades || []).map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border group"><span className="text-sm font-medium">{item}</span><button onClick={() => removeItemString('atividades', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button></div>))}</div>
             </div>
             <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
               <h4 className="font-bold text-[#1e3a8a] mb-4">Prioridades</h4>
               <div className="flex gap-2 mb-4"><input type="text" value={newPrioridade} onChange={(e) => setNewPrioridade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemString('prioridades', newPrioridade, setNewPrioridade)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/><button onClick={() => addItemString('prioridades', newPrioridade, setNewPrioridade)} className="bg-white border border-slate-300 p-2 rounded text-[#2563eb]"><Plus size={18}/></button></div>
               <div className="space-y-2 max-h-[400px] overflow-auto pr-2">{(localSettings.prioridades || []).map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border group"><span className="text-sm font-bold">{item}</span><button onClick={() => removeItemString('prioridades', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button></div>))}</div>
             </div>
             <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
               <h4 className="font-bold text-[#1e3a8a] mb-4">Tributações</h4>
               <div className="flex gap-2 mb-4"><input type="text" value={newTributacao} onChange={(e) => setNewTributacao(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemString('tributacoes', newTributacao, setNewTributacao)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/><button onClick={() => addItemString('tributacoes', newTributacao, setNewTributacao)} className="bg-white border border-slate-300 p-2 rounded text-[#2563eb]"><Plus size={18}/></button></div>
               <div className="space-y-2 max-h-[400px] overflow-auto pr-2">{(localSettings.tributacoes || []).map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border group"><span className="text-sm font-medium">{item}</span><button onClick={() => removeItemString('tributacoes', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button></div>))}</div>
             </div>
           </div>
        )}
      </div>

      {/* MODAIS (CRIAR EMPRESA E AÇÕES EM LOTE) */}
      
      {/* 1. Modal Ações em Lote */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#f0f4ff]">
              <h2 className="text-lg font-black text-[#1e3a8a]">
                {showBulkModal === 'tributacao' ? 'Alterar Tributação em Lote' : 'Vincular Meta em Lote'}
              </h2>
              <button onClick={() => setShowBulkModal(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4">Você selecionou <b>{selectedEmpresasIds.length} empresas</b> para esta ação.</p>
              
              {showBulkModal === 'tributacao' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Tributação</label>
                  <select value={bulkTrib} onChange={(e) => setBulkTrib(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-[#2563eb] font-bold text-slate-700">
                    <option value="">Selecione...</option>
                    {safeTributacoes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {showBulkModal === 'meta' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selecione a Meta</label>
                    <select value={bulkMetaId} onChange={(e) => setBulkMetaId(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-[#2563eb] font-bold text-slate-700 text-sm">
                      <option value="">Escolha a meta...</option>
                      {safeMetasGlobais.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.departamento})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tempo Est. (Dias) para todas</label>
                    <input type="number" step="0.5" min="0" value={bulkMetaTime} onChange={(e) => setBulkMetaTime(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-[#2563eb] font-bold text-slate-700" placeholder="Ex: 1.5" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowBulkModal(null)} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={showBulkModal === 'tributacao' ? applyBulkTributacao : applyBulkMeta} disabled={showBulkModal === 'tributacao' ? !bulkTrib : (!bulkMetaId || bulkMetaTime === '')} className="px-6 py-2 bg-[#2563eb] hover:bg-[#1e3a8a] text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50">
                Aplicar a Todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Editar/Nova Empresa Individual */}
      {isEmpresaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-black text-[#1e3a8a]">{empresaNome ? 'Editar Empresa' : 'Nova Empresa Base'}</h2>
                <p className="text-xs text-slate-500 mt-1">Configure o perfil e defina quais metas ela possui.</p>
              </div>
              <button onClick={() => setIsEmpresaModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full border border-slate-200"><X size={20}/></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Empresa</label>
                  <input type="text" value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-[#2563eb] uppercase font-bold" placeholder="EX: VSM TECNOLOGIA" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tributação</label>
                  <select value={empresaTrib} onChange={(e) => setEmpresaTrib(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-[#2563eb] font-bold text-slate-700">
                    <option value="">Selecione...</option>
                    {safeTributacoes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <hr className="border-slate-100"/>

              <div>
                <h4 className="text-sm font-black text-[#1e3a8a] uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Target size={16}/> Metas Vinculadas ({empresaMetas.length})
                </h4>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 mb-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecione a Meta</label>
                    <select value={selectedMetaIdToLink} onChange={(e) => setSelectedMetaIdToLink(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 focus:border-[#2563eb]">
                      <option value="">Escolha uma meta da biblioteca...</option>
                      {safeMetasGlobais.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.departamento})</option>)}
                    </select>
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tempo Est. (Dias)</label>
                    <input type="number" step="0.5" min="0" value={selectedMetaTimeToLink} onChange={(e) => setSelectedMetaTimeToLink(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-bold focus:border-[#2563eb]" placeholder="Ex: 1.5"/>
                  </div>
                  <button onClick={linkMetaToEmpresa} disabled={!selectedMetaIdToLink || selectedMetaTimeToLink === ''} className="w-full md:w-auto px-4 py-2 bg-[#2563eb] hover:bg-[#1e3a8a] text-white rounded-lg font-bold disabled:opacity-50 transition-colors">
                    Vincular
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider">
                      <tr><th className="px-4 py-2">Meta / Ação</th><th className="px-4 py-2 text-center">Setor</th><th className="px-4 py-2 text-center">Tempo (Dias)</th><th className="px-4 py-2 text-right">Remover</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {empresaMetas.map(metaV => {
                        const metaOriginal = safeMetasGlobais.find(m => m.id === metaV.metaId);
                        return (
                          <tr key={metaV.metaId} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-bold text-slate-800">{metaOriginal?.nome || 'Meta Excluída'}</td>
                            <td className="px-4 py-2 text-center"><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase">{metaOriginal?.departamento || '-'}</span></td>
                            <td className="px-4 py-2 text-center font-black text-[#2563eb]">{metaV.tempo_estimado}d</td>
                            <td className="px-4 py-2 text-right">
                              <button onClick={() => unlinkMetaFromEmpresa(metaV.metaId)} className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        );
                      })}
                      {empresaMetas.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400 text-xs font-medium">Nenhuma meta configurada para esta empresa.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsEmpresaModalOpen(false)} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={saveEmpresa} disabled={!empresaNome} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm">Confirmar e Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
