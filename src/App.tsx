/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Dashboard } from './components/Dashboard';
import { Pdi } from './components/Pdi';
import { Produtividade } from './components/Produtividade';
import { SettingsPanel } from './components/SettingsPanel'; 
import { Login } from './components/Login'; 
import { AppSettings, UsuarioConfig } from './types';
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
  Building2,
  ShieldAlert,
  Settings 
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'pdi' | 'produtividade' | 'settings'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<string>('');
  const [allowedDepts, setAllowedDepts] = useState<string[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<AppSettings | null>(null);
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvInterval, setTvInterval] = useState<number>(5); 
  const [showTvSettings, setShowTvSettings] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTvMode && currentRoute !== 'settings') { 
      interval = setInterval(() => {
        setCurrentRoute(prevRoute => prevRoute === 'dashboard' ? 'produtividade' : 'dashboard');
      }, tvInterval * 60 * 1000); 
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTvMode, tvInterval, currentRoute]);

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

  useEffect(() => {
    if (!session) return;
    
    async function loadAccess() {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data) {
        setGlobalSettings(data);
        const globalDepts = data.departamentos || ['Contábil', 'Fiscal', 'Pessoal'];
        const email = session.user.email.toLowerCase().trim();
        const isAdmin = email === 'jeyson@vsmweb.com.br';

        if (isAdmin) {
          setAllowedDepts(globalDepts);
          setCurrentDepartment(globalDepts[0] || '');
        } else {
          let users: UsuarioConfig[] = [];
          if (typeof data.usuarios === 'string') {
            try { users = JSON.parse(data.usuarios); } catch (e) {}
          } else if (Array.isArray(data.usuarios)) {
            users = data.usuarios;
          }
          
          const myConfig = users.find(u => u.email === email);
          if (myConfig && myConfig.departamentos && myConfig.departamentos.length > 0) {
            setAllowedDepts(myConfig.departamentos);
            setCurrentDepartment(myConfig.departamentos[0]);
          } else {
            setAllowedDepts([]); 
          }
        }
      }
      setSettingsLoaded(true);
    }
    loadAccess();
  }, [session, currentRoute]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading || !settingsLoaded) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-[#2563eb]">Carregando sistema...</div>;
  if (!session) return <Login />;

  const userEmail = session.user.email;
  const isAdmin = userEmail === 'jeyson@vsmweb.com.br';

  if (allowedDepts.length === 0 && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600 mb-6">Seu e-mail (<b>{userEmail}</b>) ainda não foi vinculado a nenhum departamento.</p>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 hover:bg-red-100 font-bold px-6 py-3 rounded-xl transition-colors w-full">Sair do Sistema</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 flex flex-col shadow-sm z-50 transition-all duration-300 ease-in-out relative`}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-[#2563eb] shadow-sm z-50 transition-colors"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 border-b border-slate-100 flex flex-col items-center justify-center min-h-[120px] transition-all ${isSidebarCollapsed ? 'p-2 min-h-[80px]' : ''}`}>
          {!isSidebarCollapsed ? (
            <>
              <img src="/logo.png" alt="VSM" className="h-10 object-contain mb-3" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';}} />
              {/* Tag Gestão 360º atualizada com cor e tamanho maiores */}
              <span className="text-xs font-black text-[#1e3a8a] uppercase tracking-widest bg-[#dbeafe] px-3 py-1 rounded-full border border-[#bfdbfe]">Gestão 360º</span>
            </>
          ) : (
             <img src="/guia.png" alt="VSM" className="h-8 object-contain" />
          )}
        </div>
        
        {!isSidebarCollapsed && currentRoute !== 'settings' && allowedDepts.length > 0 && (
          <div className="px-4 pt-4 pb-2 animate-fade-in">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                <Building2 size={10} /> Setor de Atuação
              </span>
              <select 
                value={currentDepartment} 
                onChange={(e) => setCurrentDepartment(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-[#1e3a8a] focus:outline-none cursor-pointer p-1"
              >
                {allowedDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setCurrentRoute('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'dashboard' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
            <LayoutDashboard size={22} className={currentRoute === 'dashboard' ? 'text-[#2563eb]' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Painel de Status</span>}
          </button>
          
          <button onClick={() => setCurrentRoute('pdi')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'pdi' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
            <Target size={22} className={currentRoute === 'pdi' ? 'text-[#2563eb]' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">PDI da Equipe</span>}
          </button>

          <button onClick={() => setCurrentRoute('produtividade')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'produtividade' ? 'bg-[#f0f4ff] text-[#1e3a8a] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
            <Activity size={22} className={currentRoute === 'produtividade' ? 'text-[#2563eb]' : ''} />
            {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Produtividade</span>}
          </button>

          {isAdmin && (
            <>
              <div className="my-4 border-t border-slate-200"></div>
              {/* Menu renomeado para Configurações */}
              <button onClick={() => setCurrentRoute('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentRoute === 'settings' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
                <Settings size={22} className={currentRoute === 'settings' ? 'text-slate-300' : ''} />
                {!isSidebarCollapsed && <span className="text-sm whitespace-nowrap">Configurações</span>}
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center border border-slate-100 relative">
            {!isSidebarCollapsed && currentRoute !== 'settings' && (
              <div className="absolute -top-3 left-2 flex items-center gap-1 z-50">
                <div className="group relative flex">
                  <button onClick={() => { setIsTvMode(!isTvMode); setShowTvSettings(false); }} className={`bg-white border p-1 rounded-full shadow-sm transition-colors relative z-10 ${isTvMode ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : 'border-slate-200 text-slate-400 hover:text-[#2563eb] hover:bg-[#f0f4ff]'}`}>
                    {isTvMode ? <Pause size={12} /> : <MonitorPlay size={12} />}
                  </button>
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-800 text-white text-[10px] font-medium p-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center shadow-xl z-50">
                    {isTvMode ? `Modo TV Ativado. Gira a cada ${tvInterval} min.` : "Ativar Gestão à Vista. Gira as abas automaticamente."}
                  </div>
                </div>
                <div className="group relative flex">
                  <button onClick={() => setShowTvSettings(!showTvSettings)} className={`bg-white border p-1 rounded-full shadow-sm transition-colors relative z-10 ${showTvSettings ? 'border-[#2563eb] text-[#2563eb] bg-[#f0f4ff]' : 'border-slate-200 text-slate-400 hover:text-[#2563eb] hover:bg-[#f0f4ff]'}`}>
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
                {/* Texto e cor alterados para o Admin */}
                {isAdmin ? <span className="text-[9px] bg-[#dbeafe] text-[#1e3a8a] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest mt-2 border border-[#bfdbfe]">Admin do Sistema</span> : <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest mt-2">Analista</span>}
                <button onClick={handleLogout} className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><LogOut size={14} /> Sair</button>
              </>
            )}

            {isSidebarCollapsed && (
               <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sair"><LogOut size={18} /></button>
            )}

            {/* O Botão de Informação restaurado com seus Tooltips */}
            {!isSidebarCollapsed && (
              <div className="absolute -top-3 -right-2 group flex z-50">
                <button className="bg-white border border-slate-200 text-slate-400 p-1 rounded-full hover:text-[#2563eb] hover:bg-[#f0f4ff] transition-colors shadow-sm cursor-help relative z-10"><Info size={12} /></button>
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
        {currentRoute === 'settings' && globalSettings ? (
          <div className="p-6 h-full flex flex-col max-w-[1600px] mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-black text-slate-800">Configurações Globais</h1>
              <p className="text-slate-500 mt-1">Gerencie a base de dados do seu ERP (Empresas, Metas, Usuários e Parâmetros).</p>
            </div>
            <SettingsPanel 
              settings={globalSettings} 
              setSettings={async (s) => { 
                setGlobalSettings(s); 
                await supabase.from('settings').update(s).eq('id', 1); 
              }} 
            />
          </div>
        ) : currentRoute === 'dashboard' ? (
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
