import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
// import { Pdi } from './components/Pdi'; // Deixei comentado, vamos criar esse arquivo a seguir!
import { LayoutDashboard, Target } from 'lucide-react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'pdi'>('dashboard');

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Menu Lateral (Sidebar) */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800">Sistema Gestão</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Dev: Jeyson Lins</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setCurrentRoute('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              currentRoute === 'dashboard' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={20} />
            Painel de Status
          </button>
          
          <button
            onClick={() => setCurrentRoute('pdi')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              currentRoute === 'pdi' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Target size={20} />
            PDI da Equipe
          </button>
        </nav>
      </div>

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {currentRoute === 'dashboard' ? (
          <Dashboard />
        ) : (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-slate-500">
            <Target size={48} className="text-indigo-300" />
            <h2 className="text-xl font-semibold">Tela do PDI em construção...</h2>
          </div>
        )}
      </div>
    </div>
  );
}
