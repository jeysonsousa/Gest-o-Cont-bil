/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Pdi } from './components/Pdi';
import { Produtividade } from './components/Produtividade';
import { 
  LayoutDashboard, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  Activity
} from 'lucide-react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'pdi' | 'produtividade'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Menu Lateral (Sidebar) com Transição Suave */}
      <div 
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-slate-200 flex flex-col shadow-sm z-50 transition-all duration-300 ease-in-out relative`}
      >
        {/* Botão de Toggle (Ocultar/Mostrar) */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-indigo-600 shadow-sm z-50 transition-colors"
          title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Header da Sidebar */}
        <div className={`p-6 border-b border-slate-100 overflow-hidden ${isSidebarCollapsed ? 'items-center flex flex-col' : ''}`}>
          {isSidebarCollapsed ? (
            <Menu className="text-indigo-600" size={24} />
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-800 whitespace-nowrap">Sistema Gestão</h1>
              <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Dev: Jeyson Lins</p>
            </>
          )}
        </div>
        
        {/* Navegação */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setCurrentRoute('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              currentRoute === 'dashboard' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
            title="Painel de Status"
          >
            <LayoutDashboard size={22} className={currentRoute === 'dashboard' ? 'text-indigo-600' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Painel de Status</span>}
          </button>
          
          <button
            onClick={() => setCurrentRoute('pdi')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              currentRoute === 'pdi' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
            title="PDI da Equipe"
          >
            <Target size={22} className={currentRoute === 'pdi' ? 'text-indigo-600' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">PDI da Equipe</span>}
          </button>

          <button
            onClick={() => setCurrentRoute('produtividade')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              currentRoute === 'produtividade' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
            title="Produtividade Real"
          >
            <Activity size={22} className={currentRoute === 'produtividade' ? 'text-indigo-600' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Produtividade</span>}
          </button>
        </nav>

        {/* Rodapé da Sidebar (Opcional) */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-t border-slate-50">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter text-center">V 2.0. HISTÓRICO ATIVO</p>
            </div>
          </div>
        )}
      </div>

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {currentRoute === 'dashboard' ? (
          <Dashboard />
        ) : currentRoute === 'pdi' ? (
          <Pdi />
        ) : (
          <Produtividade />
        )}
      </div>
    </div>
  );
}
