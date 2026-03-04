/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState } from 'react';
import { AppSettings, UsuarioConfig } from '../types';
import { Plus, Trash2, Edit2, Check, X, Mail } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

export function SettingsPanel({ settings, setSettings }: SettingsPanelProps) {
  
  // ============================================================================
  // FUNÇÃO ESPECIAL PARA O NOVO CADASTRO DE RESPONSÁVEIS COM E-MAIL
  // ============================================================================
  const renderUsuariosList = () => {
    const [newNome, setNewNome] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editNome, setEditNome] = useState('');
    const [editEmail, setEditEmail] = useState('');

    const usuarios: UsuarioConfig[] = settings.usuarios || [];

    const handleAdd = () => {
      const nome = newNome.trim().toUpperCase();
      const email = newEmail.trim().toLowerCase();
      
      if (nome && email && !usuarios.find(u => u.nome === nome)) {
        const novosUsuarios = [...usuarios, { nome, email }];
        // Salva na nova estrutura e também na antiga (responsaveis) por segurança
        setSettings({
          ...settings,
          usuarios: novosUsuarios,
          responsaveis: novosUsuarios.map(u => u.nome) 
        });
        setNewNome('');
        setNewEmail('');
      }
    };

    const handleRemove = (indexToRemove: number) => {
      const novosUsuarios = usuarios.filter((_, idx) => idx !== indexToRemove);
      setSettings({
        ...settings,
        usuarios: novosUsuarios,
        responsaveis: novosUsuarios.map(u => u.nome)
      });
    };

    const handleEditStart = (index: number, user: UsuarioConfig) => {
      setEditingIndex(index);
      setEditNome(user.nome);
      setEditEmail(user.email);
    };

    const handleEditSave = (index: number) => {
      const nome = editNome.trim().toUpperCase();
      const email = editEmail.trim().toLowerCase();
      
      if (nome && email) {
        const novosUsuarios = [...usuarios];
        novosUsuarios[index] = { nome, email };
        
        setSettings({
          ...settings,
          usuarios: novosUsuarios,
          responsaveis: novosUsuarios.map(u => u.nome)
        });
      }
      setEditingIndex(null);
    };

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full lg:col-span-2">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800">Responsáveis (Controle de Acesso)</h3>
          <p className="text-xs text-slate-500 font-medium">Vincule o analista ao e-mail para liberar o painel dele.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <input
            type="text"
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            placeholder="Nome (Ex: CAMILA)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase text-sm font-bold"
          />
          <div className="relative flex-[2]">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="E-mail de acesso"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm lowercase"
            />
          </div>
          <button onClick={handleAdd} className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors font-bold px-4">
            Adicionar
          </button>
        </div>

        <ul className="space-y-2 overflow-y-auto flex-1 pr-2">
          {usuarios.map((user, idx) => (
            <li key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group gap-2">
              {editingIndex === idx ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                  <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} className="w-full sm:w-1/3 px-2 py-1 border border-indigo-300 rounded focus:outline-none uppercase text-sm font-bold" />
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleEditSave(idx)} className="w-full sm:flex-1 px-2 py-1 border border-indigo-300 rounded focus:outline-none text-sm lowercase" />
                  <div className="flex gap-1 w-full sm:w-auto justify-end">
                    <button onClick={() => handleEditSave(idx)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Check size={18} /></button>
                    <button onClick={() => setEditingIndex(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded transition-colors"><X size={18} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{user.nome}</span>
                    <span className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Mail size={10}/> {user.email}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditStart(idx, user)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleRemove(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                  </div>
                </>
              )}
            </li>
          ))}
          {usuarios.length === 0 && <li className="text-sm text-slate-500 text-center py-4">Nenhum responsável cadastrado.</li>}
        </ul>
      </div>
    );
  };

  // ============================================================================
  // FUNÇÃO ORIGINAL MANTIDA PARA AS OUTRAS LISTAS SIMPLES (Atividades, etc)
  // ============================================================================
  const renderList = (title: string, key: keyof AppSettings) => {
    const [newItem, setNewItem] = useState('');
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleAdd = () => {
      if (newItem.trim() && !settings[key].includes(newItem.trim().toUpperCase())) {
        setSettings({
          ...settings,
          [key]: [...settings[key], newItem.trim().toUpperCase()]
        });
        setNewItem('');
      }
    };

    const handleRemove = (itemToRemove: string) => {
      setSettings({
        ...settings,
        [key]: settings[key].filter(item => item !== itemToRemove)
      });
    };

    const handleEditStart = (item: string) => {
      setEditingItem(item);
      setEditValue(item);
    };

    const handleEditSave = (oldItem: string) => {
      const trimmedValue = editValue.trim().toUpperCase();
      if (trimmedValue && trimmedValue !== oldItem && !settings[key].includes(trimmedValue)) {
        setSettings({
          ...settings,
          [key]: settings[key].map(item => item === oldItem ? trimmedValue : item)
        });
      }
      setEditingItem(null);
    };

    const handleEditCancel = () => {
      setEditingItem(null);
      setEditValue('');
    };

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={`Adicionar...`}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
          />
          <button onClick={handleAdd} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
            <Plus size={20} />
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto flex-1 pr-2">
          {Array.isArray(settings[key]) && settings[key].map(item => (
            <li key={item as string} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
              {editingItem === item ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEditSave(item as string)}
                    autoFocus
                    className="flex-1 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm uppercase"
                  />
                  <button onClick={() => handleEditSave(item as string)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Check size={16} /></button>
                  <button onClick={handleEditCancel} className="p-1 text-slate-400 hover:bg-slate-200 rounded transition-colors"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-slate-700 text-sm">{item as string}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditStart(item as string)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleRemove(item as string)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                  </div>
                </>
              )}
            </li>
          ))}
          {Array.isArray(settings[key]) && settings[key].length === 0 && (
            <li className="text-sm text-slate-500 text-center py-4">Nenhum item cadastrado.</li>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {/* A nova lista dupla (Nome + E-mail) ocupando 2 colunas para ficar bonita */}
      {renderUsuariosList()}
      
      {/* As listas tradicionais */}
      {renderList('Atividades', 'atividades')}
      {renderList('Tributações', 'tributacoes')}
      {/* Ocultei 'Prioridades' e 'Empresas' para caber melhor na tela, já que prioridade é padrão e Empresa criamos direto no painel, mas se quiser pode voltar a chamar a função aqui */}
    </div>
  );
}
