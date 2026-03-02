import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

export function SettingsPanel({ settings, setSettings }: SettingsPanelProps) {
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
            placeholder={`Adicionar ${title.toLowerCase()}...`}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
          />
          <button
            onClick={handleAdd}
            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto flex-1 pr-2">
          {settings[key].map(item => (
            <li key={item} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
              {editingItem === item ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEditSave(item)}
                    autoFocus
                    className="flex-1 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm uppercase"
                  />
                  <button
                    onClick={() => handleEditSave(item)}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    title="Salvar"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="p-1 text-slate-400 hover:bg-slate-200 rounded transition-colors"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-slate-700 text-sm">{item}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditStart(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleRemove(item)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {settings[key].length === 0 && (
            <li className="text-sm text-slate-500 text-center py-4">Nenhum item cadastrado.</li>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-start">
      {renderList('Empresas', 'empresas')}
      {renderList('Responsáveis', 'responsaveis')}
      {renderList('Atividades', 'atividades')}
      {renderList('Prioridades', 'prioridades')}
      {renderList('Tributações', 'tributacoes')}
    </div>
  );
}
