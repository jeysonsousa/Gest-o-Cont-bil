/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, UsuarioConfig } from '../types';
import { Plus, Trash2, Save, Building2, Users, Briefcase, ListTodo, ShieldAlert } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => Promise<void>;
}

export function SettingsPanel({ settings, setSettings }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'empresas' | 'departamentos' | 'colaboradores' | 'parametros'>('empresas');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  // Estados locais para inputs
  const [newEmpresa, setNewEmpresa] = useState('');
  const [newDepartamento, setNewDepartamento] = useState('');
  const [newAtividade, setNewAtividade] = useState('');
  const [newPrioridade, setNewPrioridade] = useState('');
  const [newTributacao, setNewTributacao] = useState('');

  // Estados para Colaboradores
  const [usuarios, setUsuarios] = useState<UsuarioConfig[]>([]);
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDepts, setNewUserDepts] = useState<string[]>([]);

  // Carrega os dados na montagem
  useEffect(() => {
    setLocalSettings({
      ...settings,
      departamentos: settings.departamentos || ['Contábil', 'Fiscal', 'Pessoal'],
      empresas: settings.empresas || []
    });

    let parsedUsers: UsuarioConfig[] = [];
    if (typeof settings.usuarios === 'string') {
      try { parsedUsers = JSON.parse(settings.usuarios); } catch (e) { parsedUsers = []; }
    } else if (Array.isArray(settings.usuarios)) {
      parsedUsers = settings.usuarios;
    }
    // Garante que todo usuário tenha a propriedade departamentos
    setUsuarios(parsedUsers.map(u => ({ ...u, departamentos: u.departamentos || [] })));
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const finalSettings = { ...localSettings, usuarios: JSON.stringify(usuarios) };
    await setSettings(finalSettings);
    alert('Configurações salvas com sucesso!');
    setSaving(false);
  };

  const addItem = (field: keyof AppSettings, value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (!value.trim()) return;
    const currentArray = (localSettings[field] as string[]) || [];
    if (!currentArray.includes(value.toUpperCase().trim())) {
      setLocalSettings({ ...localSettings, [field]: [...currentArray, value.toUpperCase().trim()].sort() });
    }
    setter('');
  };

  const removeItem = (field: keyof AppSettings, index: number) => {
    const currentArray = [...((localSettings[field] as string[]) || [])];
    currentArray.splice(index, 1);
    setLocalSettings({ ...localSettings, [field]: currentArray });
  };

  // Funções específicas para Colaboradores
  const toggleNewUserDept = (dept: string) => {
    if (newUserDepts.includes(dept)) {
      setNewUserDepts(newUserDepts.filter(d => d !== dept));
    } else {
      setNewUserDepts([...newUserDepts, dept]);
    }
  };

  const toggleExistingUserDept = (userIndex: number, dept: string) => {
    const updatedUsers = [...usuarios];
    const user = updatedUsers[userIndex];
    if (user.departamentos?.includes(dept)) {
      user.departamentos = user.departamentos.filter(d => d !== dept);
    } else {
      user.departamentos = [...(user.departamentos || []), dept];
    }
    setUsuarios(updatedUsers);
  };

  const addUser = () => {
    if (!newUserNome.trim() || !newUserEmail.trim()) return;
    setUsuarios([...usuarios, { 
      nome: newUserNome.toUpperCase().trim(), 
      email: newUserEmail.toLowerCase().trim(),
      departamentos: newUserDepts
    }]);
    setNewUserNome('');
    setNewUserEmail('');
    setNewUserDepts([]);
  };

  const removeUser = (index: number) => {
    if (window.confirm('Remover este colaborador?')) {
      const updated = [...usuarios];
      updated.splice(index, 1);
      setUsuarios(updated);
    }
  };

  const safeDepartamentos = localSettings.departamentos || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[70vh]">
      
      {/* MENU LATERAL DAS CONFIGURAÇÕES */}
      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 gap-2">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Painel de Controle</h2>
        
        <button onClick={() => setActiveTab('empresas')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'empresas' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm border border-[#dbeafe]' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Briefcase size={18} /> Empresas Base
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
        
        {/* ABA: EMPRESAS BASE */}
        {activeTab === 'empresas' && (
          <div className="max-w-2xl animate-fade-in">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-[#1e3a8a]">Cadastro Global de Empresas</h3>
              <p className="text-sm text-slate-500 mt-1">Estas são as empresas base do sistema. Elas aparecerão na lista para todos os departamentos.</p>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input type="text" value={newEmpresa} onChange={(e) => setNewEmpresa(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem('empresas', newEmpresa, setNewEmpresa)} placeholder="EX: EMPRESA MODELO LTDA" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 uppercase font-bold" />
              <button onClick={() => addItem('empresas', newEmpresa, setNewEmpresa)} className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"><Plus size={20} /></button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <div className="max-h-[400px] overflow-auto divide-y divide-slate-200">
                {(localSettings.empresas || []).length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-medium">Nenhuma empresa base cadastrada.</div>
                ) : (
                  (localSettings.empresas || []).map((emp, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-white transition-colors group">
                      <span className="font-bold text-slate-700">{emp}</span>
                      <button onClick={() => removeItem('empresas', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA: DEPARTAMENTOS */}
        {activeTab === 'departamentos' && (
          <div className="max-w-2xl animate-fade-in">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-[#1e3a8a]">Gestão de Departamentos</h3>
              <p className="text-sm text-slate-500 mt-1">Crie os setores da sua empresa (Ex: Contábil, Fiscal, Legalização).</p>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input type="text" value={newDepartamento} onChange={(e) => setNewDepartamento(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem('departamentos', newDepartamento, setNewDepartamento)} placeholder="NOME DO NOVO SETOR" className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 uppercase font-bold" />
              <button onClick={() => addItem('departamentos', newDepartamento, setNewDepartamento)} className="bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"><Plus size={20} /></button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {safeDepartamentos.map((dept, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center group shadow-sm hover:border-[#2563eb] transition-colors">
                  <span className="font-bold text-slate-700">{dept}</span>
                  <button onClick={() => removeItem('departamentos', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: COLABORADORES COM ACESSO A DEPARTAMENTOS */}
        {activeTab === 'colaboradores' && (
          <div className="max-w-4xl animate-fade-in">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-[#1e3a8a]">Gestão de Colaboradores e Acessos</h3>
              <p className="text-sm text-slate-500 mt-1">Cadastre os analistas, defina seus e-mails de acesso e a quais departamentos eles pertencem.</p>
            </div>

            {/* Formulário Novo Colaborador */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 shadow-inner">
              <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Novo Colaborador</h4>
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
                        <input type="checkbox" className="hidden" checked={newUserDepts.includes(dept)} onChange={() => toggleNewUserDept(dept)} />
                        {dept}
                      </label>
                    ))}
                  </div>
                </div>

                <button onClick={addUser} disabled={!newUserNome || !newUserEmail || newUserDepts.length === 0} className="w-full md:w-auto h-full min-h-[85px] bg-[#2563eb] hover:bg-[#1e3a8a] text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <Plus size={20} /> Adicionar
                </button>
              </div>
              {newUserDepts.length === 0 && <p className="text-amber-500 text-xs font-medium mt-2 flex items-center gap-1"><ShieldAlert size={12}/> Selecione pelo menos um departamento.</p>}
            </div>

            {/* Lista de Colaboradores Existentes */}
            <div className="space-y-3">
              {usuarios.map((user, index) => (
                <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group shadow-sm hover:border-slate-300 transition-all">
                  <div>
                    <h4 className="font-black text-slate-800 text-lg uppercase">{user.nome}</h4>
                    <span className="text-sm text-slate-500 font-medium">{user.email}</span>
                  </div>
                  
                  <div className="flex-1 flex flex-wrap justify-end gap-2">
                    {safeDepartamentos.map(dept => {
                      const isLinked = user.departamentos?.includes(dept);
                      return (
                        <label key={dept} className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-md cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-wider select-none ${isLinked ? 'bg-[#f0f4ff] border-[#bfdbfe] text-[#2563eb]' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                          <input type="checkbox" className="hidden" checked={isLinked || false} onChange={() => toggleExistingUserDept(index, dept)} />
                          {dept}
                        </label>
                      );
                    })}
                  </div>

                  <button onClick={() => removeUser(index)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
                </div>
              ))}
              {usuarios.length === 0 && <div className="text-center p-8 text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-200 border-dashed">Nenhum colaborador configurado.</div>}
            </div>
          </div>
        )}

        {/* ABA: PARÂMETROS EXTRAS */}
        {activeTab === 'parametros' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Bloco Atividades */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
              <h4 className="font-bold text-[#1e3a8a] mb-4">Atividades</h4>
              <div className="flex gap-2 mb-4">
                <input type="text" value={newAtividade} onChange={(e) => setNewAtividade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem('atividades', newAtividade, setNewAtividade)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/>
                <button onClick={() => addItem('atividades', newAtividade, setNewAtividade)} className="bg-white border border-slate-300 p-2 rounded hover:bg-slate-100 text-[#2563eb]"><Plus size={18}/></button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                {(localSettings.atividades || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 group">
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                    <button onClick={() => removeItem('atividades', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloco Prioridades */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
              <h4 className="font-bold text-[#1e3a8a] mb-4">Níveis de Prioridade</h4>
              <div className="flex gap-2 mb-4">
                <input type="text" value={newPrioridade} onChange={(e) => setNewPrioridade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem('prioridades', newPrioridade, setNewPrioridade)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/>
                <button onClick={() => addItem('prioridades', newPrioridade, setNewPrioridade)} className="bg-white border border-slate-300 p-2 rounded hover:bg-slate-100 text-[#2563eb]"><Plus size={18}/></button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                {(localSettings.prioridades || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 group">
                    <span className="text-sm font-bold text-slate-700">{item}</span>
                    <button onClick={() => removeItem('prioridades', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloco Tributações */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
              <h4 className="font-bold text-[#1e3a8a] mb-4">Tributações</h4>
              <div className="flex gap-2 mb-4">
                <input type="text" value={newTributacao} onChange={(e) => setNewTributacao(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem('tributacoes', newTributacao, setNewTributacao)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm uppercase focus:outline-none focus:border-[#2563eb]"/>
                <button onClick={() => addItem('tributacoes', newTributacao, setNewTributacao)} className="bg-white border border-slate-300 p-2 rounded hover:bg-slate-100 text-[#2563eb]"><Plus size={18}/></button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                {(localSettings.tributacoes || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 group">
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                    <button onClick={() => removeItem('tributacoes', idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
