/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Dashboard } from './components/Dashboard';
import { Pdi } from './components/Pdi';
import { Produtividade } from './components/Produtividade';
import { Login } from './components/Login'; 
import { 
  LayoutDashboard, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  Activity,
  LogOut,
  Info 
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'pdi' | 'produtividade'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">Autenticando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  const userEmail = session.user.email;
  const isAdmin = userEmail === 'jeyson@vsmweb.com.br';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 flex flex-col shadow-sm z-50 transition-all duration-300 ease-in-out relative`}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-[#2563eb] shadow-sm z-50 transition-colors"
          title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* HEADER DA SIDEBAR COM A LOGO OFICIAL */}
        <div className={`p-6 border-b border-slate-100 flex flex-col items-center justify-center min-h-[120px] transition-all ${isSidebarCollapsed ? 'p-2 min-h-[80px]' : ''}`}>
          {!isSidebarCollapsed ? (
            <>
              <img 
                src="/logo.png" 
                alt="VSM" 
                className="h-10 object-contain mb-3"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Gestão 360º</span>
            </>
          ) : (
             <img src="/guia.png" alt="VSM" className="h-8 object-contain" />
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {/* Menus usando Cores HEX Absolutas para forçar o Azul */}
          <button onClick={() => setCurrentRoute('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'dashboard' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`} title="Painel de Status">
            <LayoutDashboard size={22} className={currentRoute === 'dashboard' ? 'text-[#2563eb]' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Painel de Status</span>}
          </button>
          
          <button onClick={() => setCurrentRoute('pdi')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'pdi' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`} title="PDI da Equipe">
            <Target size={22} className={currentRoute === 'pdi' ? 'text-[#2563eb]' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">PDI da Equipe</span>}
          </button>

          <button onClick={() => setCurrentRoute('produtividade')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'produtividade' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`} title="Produtividade Real">
            <Activity size={22} className={currentRoute === 'produtividade' ? 'text-[#2563eb]' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Produtividade</span>}
          </button>
        </nav>

        {/* RODAPÉ DA SIDEBAR COM BOTÃO "i" */}
        <div className="p-4 border-t border-slate-50">
          <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center border border-slate-100 relative">
            {!isSidebarCollapsed && (
              <>
                <span className="text-xs font-bold text-slate-700 truncate w-full text-center" title={userEmail}>
                  {userEmail}
                </span>
                
                {isAdmin ? (
                  <span className="text-[9px] bg-[#dbeafe] text-[#1e3a8a] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest mt-2 border border-[#bfdbfe]">Admin Geral</span>
                ) : (
                  <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest mt-2">Analista</span>
                )}

                <button onClick={handleLogout} className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                  <LogOut size={14} /> Sair
                </button>
              </>
            )}

            {isSidebarCollapsed && (
               <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sair">
                 <LogOut size={18} />
               </button>
            )}

            {!isSidebarCollapsed && (
              <div className="absolute -top-3 -right-2 group">
                <button className="bg-white border border-slate-200 text-slate-400 p-1 rounded-full hover:text-[#2563eb] hover:bg-[#f0f4ff] transition-colors shadow-sm cursor-help">
                  <Info size={12} />
                </button>
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-[10px] font-medium p-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center shadow-xl z-50">
                  Sistema desenvolvido por:<br/>
                  <strong className="text-[#60a5fa] uppercase tracking-wider block mt-1">Jeyson Lins</strong>
                  <span className="opacity-80">jeyson.cont@gmail.com</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        {currentRoute === 'dashboard' ? (
          <Dashboard isAdmin={isAdmin} />
        ) : currentRoute === 'pdi' ? (
          <Pdi />
        ) : (
          <Produtividade />
        )}
      </div>
    </div>
  );
}
