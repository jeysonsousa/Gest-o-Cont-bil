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
  Activity,
  LogOut,
  Info,
  MonitorPlay,
  Pause,
  Timer,
  Building2 
} from 'lucide-react';

export type Department = 'Contábil' | 'Fiscal' | 'Pessoal';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'pdi' | 'produtividade'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // ESTADO GLOBAL DO DEPARTAMENTO (Inicia no Contábil)
  const [currentDepartment, setCurrentDepartment] = useState<Department>('Contábil');

  // Estados da TV
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvInterval, setTvInterval] = useState<number>(5); 
  const [showTvSettings, setShowTvSettings] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTvMode) {
      interval = setInterval(() => {
        setCurrentRoute(prevRoute => prevRoute === 'dashboard' ? 'produtividade' : 'dashboard');
      }, tvInterval * 60 * 1000); 
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTvMode, tvInterval]);

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

  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-[#2563eb]">Autenticando...</div>;
  if (!session) return <Login />;

  const userEmail = session.user.email;
  const isAdmin = userEmail === 'jeyson@vsmweb.com.br';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      
      {/* BARRA LATERAL */}
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 flex flex-col shadow-sm z-50 transition-all duration-300 ease-in-out relative`}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-[#2563eb] shadow-sm z-50 transition-colors"
          title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* LOGO E NOME */}
        <div className={`p-6 border-b border-slate-100 flex flex-col items-center justify-center min-h-[120px] transition-all ${isSidebarCollapsed ? 'p-2 min-h-[80px]' : ''}`}>
          {!isSidebarCollapsed ? (
            <>
              <img src="/logo.png" alt="VSM" className="h-10 object-contain mb-3" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';}} />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Gestão 360º</span>
            </>
          ) : (
             <img src="/guia.png" alt="VSM" className="h-8 object-contain" />
          )}
        </div>
        
        {/* SELETOR DE DEPARTAMENTO (A MÁGICA ACONTECE AQUI) */}
        {!isSidebarCollapsed && (
          <div className="px-4 pt-4 pb-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Building2 size={10} /> Setor de Atuação
              </span>
              <select 
                value={currentDepartment} 
                onChange={(e) => setCurrentDepartment(e.target.value as Department)}
                className="w-full bg-transparent text-sm font-bold text-[#1e3a8a] focus:outline-none cursor-pointer p-1"
              >
                <option value="Contábil">Contábil</option>
                <option value="Fiscal">Fiscal</option>
                <option value="Pessoal">Pessoal</option>
              </select>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2">
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

        {/* RODAPÉ DA SIDEBAR */}
        <div className="p-4 border-t border-slate-50">
          <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center border border-slate-100 relative">
            
            {!isSidebarCollapsed && (
              <div className="absolute -top-3 left-2 flex items-center gap-1 z-50">
                <div className="group relative">
                  <button onClick={() => { setIsTvMode(!isTvMode); setShowTvSettings(false); }} className={`bg-white border p-1 rounded-full shadow-sm transition-colors ${isTvMode ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : 'border-slate-200 text-slate-400 hover:text-[#2563eb] hover:bg-[#f0f4ff]'}`}>
                    {isTvMode ? <Pause size={12} /> : <MonitorPlay size={12} />}
                  </button>
                </div>
                <div className="relative">
                  <button onClick={() => setShowTvSettings(!showTvSettings)} className={`bg-white border p-1 rounded-full shadow-sm transition-colors ${showTvSettings ? 'border-[#2563eb] text-[#2563eb] bg-[#f0f4ff]' : 'border-slate-200 text-slate-400 hover:text-[#2563eb] hover:bg-[#f0f4ff]'}`}>
                    <Timer size={12} />
                  </button>
                  {showTvSettings && (
                    <div className="absolute bottom-full left-0 mb-2 w-28 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col z-50">
                      <div className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest text-center py-1.5 border-b border-slate-100">Intervalo</div>
                      {[1, 2, 3, 5, 10, 15].map((min) => (
                        <button key={min} onClick={() => { setTvInterval(min); setShowTvSettings(false); }} className={`px-3 py-1.5 text-xs text-left transition-colors ${tvInterval === min ? 'bg-[#f0f4ff] text-[#1e3a8a] font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-[#2563eb]'}`}>{min} min</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isSidebarCollapsed && (
              <>
                <span className="text-xs font-bold text-slate-700 truncate w-full text-center mt-2" title={userEmail}>{userEmail}</span>
                {isAdmin ? <span className="text-[9px] bg-[#dbeafe] text-[#1e3a8a] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest mt-2 border border-[#bfdbfe]">Admin Geral</span> : <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest mt-2">Analista</span>}
                <button onClick={handleLogout} className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><LogOut size={14} /> Sair</button>
              </>
            )}

            {isSidebarCollapsed && (
               <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sair"><LogOut size={18} /></button>
            )}

            {!isSidebarCollapsed && (
              <div className="absolute -top-3 -right-2 group">
                <button className="bg-white border border-slate-200 text-slate-400 p-1 rounded-full hover:text-[#2563eb] hover:bg-[#f0f4ff] transition-colors shadow-sm cursor-help"><Info size={12} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ÁREA CENTRAL - PASSANDO O DEPARTAMENTO PARA AS TELAS */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {currentRoute === 'dashboard' ? (
          <Dashboard isAdmin={isAdmin} currentDepartment={currentDepartment} />
        ) : currentRoute === 'pdi' ? (
          <Pdi currentDepartment={currentDepartment} />
        ) : (
          <Produtividade currentDepartment={currentDepartment} />
        )}
      </div>
    </div>
  );
}
