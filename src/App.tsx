/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Dashboard } from './components/Dashboard';
import { Pdi } from './components/Pdi';
import { Produtividade } from './components/Produtividade';
import { Login } from './components/Login'; // NOVO: Importando a tela de Login
import { 
  LayoutDashboard, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  Activity,
  LogOut // NOVO: Ícone de Sair
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'pdi' | 'produtividade'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Monitora a autenticação do usuário
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

  // Tela de carregamento enquanto o Supabase confere o usuário
  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">Autenticando...</div>;
  }

  // Se não tem sessão, "bloqueia" na tela de Login
  if (!session) {
    return <Login />;
  }

  // Define o ADM Geral
  const userEmail = session.user.email;
  const isAdmin = userEmail === 'jeyson@vsmweb.com.br';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Menu Lateral (Sidebar) com Transição Suave */}
      <div 
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-slate-200 flex flex-col shadow-sm z-50 transition-all duration-300 ease-in-out relative`}
      >
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-indigo-600 shadow-sm z-50 transition-colors"
          title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

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
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setCurrentRoute('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'dashboard' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`} title="Painel de Status">
            <LayoutDashboard size={22} className={currentRoute === 'dashboard' ? 'text-indigo-600' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Painel de Status</span>}
          </button>
          
          <button onClick={() => setCurrentRoute('pdi')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'pdi' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`} title="PDI da Equipe">
            <Target size={22} className={currentRoute === 'pdi' ? 'text-indigo-600' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">PDI da Equipe</span>}
          </button>

          <button onClick={() => setCurrentRoute('produtividade')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'produtividade' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`} title="Produtividade Real">
            <Activity size={22} className={currentRoute === 'produtividade' ? 'text-indigo-600' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Produtividade</span>}
          </button>
        </nav>

        {/* Rodapé da Sidebar com o botão de Logout e Status de Admin */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-t border-slate-50">
            <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center border border-slate-100">
              <span className="text-xs font-bold text-slate-700 truncate w-full text-center" title={userEmail}>
                {userEmail}
              </span>
              
              {isAdmin ? (
                <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest mt-2 border border-indigo-200">Admin Geral</span>
              ) : (
                <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest mt-2">Analista</span>
              )}

              <button 
                onClick={handleLogout} 
                className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
              >
                <LogOut size={14} /> Sair do Sistema
              </button>
            </div>
          </div>
        )}
      </div>

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
