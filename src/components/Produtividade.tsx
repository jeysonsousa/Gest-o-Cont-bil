/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { MONTHS } from '../types';
import { Activity, TrendingUp, Clock, AlertTriangle, ChevronDown, ChevronUp, Users } from 'lucide-react';

const currentYearNum = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYearNum - 1 + i).toString());

// Lógica de Competência Contábil (Mês Anterior)
const currentDate = new Date();
let defaultMonthIndex = currentDate.getMonth() - 1;
let defaultYearNum = currentDate.getFullYear();

if (defaultMonthIndex < 0) {
  defaultMonthIndex = 11; 
  defaultYearNum -= 1;    
}

const getBusinessDays = (startDate: string, endDate: string) => {
  let count = 0;
  const curDate = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++; 
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

export function Produtividade() {
  const [activeMonth, setActiveMonth] = useState<string>(MONTHS[defaultMonthIndex]);
  const [activeYear, setActiveYear] = useState<string>(defaultYearNum.toString());
  
  const [analysts, setAnalysts] = useState<string[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (responsavel: string) => {
    setExpanded(prev => ({ ...prev, [responsavel]: !prev[responsavel] }));
  };

  useEffect(() => {
    async function loadAnalysts() {
      const { data } = await supabase.from('clients').select('responsavel').eq('is_inactive', false);
      if (data) {
        const unique = [...new Set(data.map(d => d.responsavel))].sort();
        setAnalysts(unique);
      }
    }
    loadAnalysts();
  }, []);

  useEffect(() => {
    async function loadPerformance() {
      setLoading(true);
      const { data: clients } = await supabase.from('clients').select('empresa, responsavel, tempo_estimado').eq('is_inactive', false);
      const { data: pdi } = await supabase.from('pdi_entries').select('*').eq('mes', activeMonth).eq('ano', activeYear);

      if (clients && pdi) {
        const metrics = pdi
          .filter(p => !p.is_extra && p.inicio && p.prazo_realizado && (p.status === 'analyst' || p.status === 'ok'))
          .map(entry => {
            const client = clients.find(c => c.empresa === entry.empresa);
            const estimado = client?.tempo_estimado || 0;
            const responsavel = client?.responsavel || entry.responsavel;
            
            const diasBrutos = getBusinessDays(entry.inicio, entry.prazo_realizado);
            let realizado = entry.meio_expediente ? Math.max(0.5, diasBrutos - 0.5) : diasBrutos;
            
            let eficiencia = 0;
            if (estimado > 0 && realizado > 0) eficiencia = (estimado / realizado) * 100;
            else if (estimado > 0 && realizado === 0) eficiencia = 100; 

            return {
              responsavel, empresa: entry.empresa, atividade: entry.atividade, inicio: entry.inicio,
              fim: entry.prazo_realizado, meioExp: entry.meio_expediente, estimado, realizado, eficiencia: Math.round(eficiencia)
            };
          });
        setPerformanceData(metrics);
      }
      setLoading(false);
    }
    loadPerformance();
  }, [activeMonth, activeYear]);

  const { globalStats, analystGroups } = useMemo(() => {
    const validGlobal = performanceData.filter(d => d.estimado > 0);
    const globalAvg = validGlobal.length ? validGlobal.reduce((acc, curr) => acc + curr.eficiencia, 0) / validGlobal.length : 0;
    const globalNoPrazo = validGlobal.filter(d => d.eficiencia >= 100).length;
    const globalStats = { avg: Math.round(globalAvg), noPrazo: globalNoPrazo, atrasados: validGlobal.length - globalNoPrazo };

    const analystGroups = analysts.map(resp => {
      const metrics = performanceData.filter(d => d.responsavel === resp);
      const valid = metrics.filter(d => d.estimado > 0);
      const avg = valid.length ? valid.reduce((acc, curr) => acc + curr.eficiencia, 0) / valid.length : 0;
      const noPrazo = valid.filter(d => d.eficiencia >= 100).length;
      return { responsavel: resp, metrics, avg: Math.round(avg), noPrazo, atrasados: valid.length - noPrazo, totalConcluidas: metrics.length };
    });

    return { globalStats, analystGroups };
  }, [performanceData, analysts]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-indigo-600" /> Indicadores de Produtividade
          </h1>
          <p className="text-slate-500 text-sm mt-1">Visão geral do escritório e detalhamento por analista</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none uppercase px-2">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select>
          <span className="text-slate-300">/</span>
          <select value={activeYear} onChange={(e) => setActiveYear(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none px-2">{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5"><Users size={120} /></div>
          <div className={`p-4 rounded-full z-10 ${globalStats.avg >= 100 ? 'bg-emerald-100 text-emerald-600' : globalStats.avg >= 80 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
            <TrendingUp size={32} />
          </div>
          <div className="z-10">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Eficiência Geral</p>
            <h2 className="text-3xl font-black text-slate-800">{globalStats.avg}%</h2>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-emerald-500 flex items-center gap-4">
          <div className="p-4 rounded-full bg-slate-50 text-slate-400"><Clock size={32} /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dentro do Estimado</p>
            <h2 className="text-3xl font-black text-emerald-600">{globalStats.noPrazo} <span className="text-sm text-slate-400 font-medium">empresas</span></h2>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-red-500 flex items-center gap-4">
          <div className="p-4 rounded-full bg-slate-50 text-slate-400"><AlertTriangle size={32} /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Estouraram o Tempo</p>
            <h2 className="text-3xl font-black text-red-600">{globalStats.atrasados} <span className="text-sm text-slate-400 font-medium">empresas</span></h2>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500 font-medium">Processando dados de produtividade...</div>
        ) : (
          analystGroups.map((analyst) => (
            <div key={analyst.responsavel} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
              <div onClick={() => toggleExpand(analyst.responsavel)} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 select-none">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg">{analyst.responsavel.charAt(0)}</div>
                  <div><h3 className="font-bold text-lg text-slate-800">{analyst.responsavel}</h3><p className="text-xs text-slate-500 font-medium">{analyst.totalConcluidas} empresas validadas neste mês</p></div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex gap-2">
                    <div className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg text-center"><span className="block text-[10px] text-emerald-600 font-bold uppercase">No Prazo</span><span className="block text-sm font-black text-emerald-700">{analyst.noPrazo}</span></div>
                    <div className="bg-red-50 border border-red-100 px-3 py-1 rounded-lg text-center"><span className="block text-[10px] text-red-600 font-bold uppercase">Atrasos</span><span className="block text-sm font-black text-red-700">{analyst.atrasados}</span></div>
                  </div>
                  <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-widest">Eficiência</span>
                    <span className={`text-xl font-black ${analyst.avg >= 100 ? 'text-emerald-600' : analyst.avg >= 80 ? 'text-amber-500' : 'text-red-500'}`}>{analyst.avg}%</span>
                  </div>
                  <div className="p-2 rounded-full hover:bg-slate-200 bg-slate-100 transition-colors">
                    {expanded[analyst.responsavel] ? <ChevronUp size={20} className="text-slate-600" /> : <ChevronDown size={20} className="text-slate-600" />}
                  </div>
                </div>
              </div>
              {expanded[analyst.responsavel] && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                  {analyst.metrics.length === 0 ? (
                    <div className="text-center p-6 text-slate-400 text-sm">Nenhuma empresa validada com datas preenchidas para este analista neste mês.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                          <tr>
                            <th className="px-6 py-3 border-b border-slate-200">Empresa</th><th className="px-6 py-3 border-b border-slate-200 text-center">Data Início</th><th className="px-6 py-3 border-b border-slate-200 text-center">Data Conclusão</th><th className="px-6 py-3 border-b border-slate-200 text-center">Estimado</th><th className="px-6 py-3 border-b border-slate-200 text-center">Realizado</th><th className="px-6 py-3 border-b border-slate-200 text-right">Eficiência</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analyst.metrics.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-3 font-bold text-slate-800"><div className="flex flex-col"><span>{row.empresa}</span>{row.meioExp && <span className="text-[9px] text-indigo-500 uppercase tracking-widest mt-0.5">Utilizou Meio Expediente (-0,5d)</span>}</div></td>
                              <td className="px-6 py-3 text-center text-slate-600">{row.inicio.split('-').reverse().join('/')}</td>
                              <td className="px-6 py-3 text-center text-slate-600">{row.fim.split('-').reverse().join('/')}</td>
                              <td className="px-6 py-3 text-center font-bold text-slate-600">{row.estimado === 0 ? '-' : `${row.estimado}d`}</td>
                              <td className="px-6 py-3 text-center font-bold text-indigo-600">{row.realizado}d</td>
                              <td className="px-6 py-3 text-right">
                                {row.estimado === 0 ? (
                                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">Sem parâmetro</span>
                                ) : (
                                  <span className={`inline-flex px-3 py-1 rounded-md text-xs font-bold shadow-sm ${row.eficiencia >= 100 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : row.eficiencia >= 80 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{row.eficiencia}%</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
