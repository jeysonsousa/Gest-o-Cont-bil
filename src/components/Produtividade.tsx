/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Client, PdiEntry, MONTHS } from '../types';
import { Activity, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

const currentYearNum = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYearNum - 1 + i).toString());

// Função inteligente para calcular apenas DIAS ÚTEIS
const getBusinessDays = (startDate: string, endDate: string) => {
  let count = 0;
  const curDate = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++; // 0 = Domingo, 6 = Sábado
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

export function Produtividade() {
  const [activeMonth, setActiveMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [activeYear, setActiveYear] = useState<string>(currentYearNum.toString());
  const [activeResponsavel, setActiveResponsavel] = useState<string>('');
  
  const [analysts, setAnalysts] = useState<string[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAnalysts() {
      const { data } = await supabase.from('clients').select('responsavel').eq('is_inactive', false);
      if (data) {
        const unique = [...new Set(data.map(d => d.responsavel))].sort();
        setAnalysts(unique);
        if (unique.length > 0) setActiveResponsavel(unique[0]);
      }
    }
    loadAnalysts();
  }, []);

  useEffect(() => {
    async function loadPerformance() {
      if (!activeResponsavel) return;
      setLoading(true);
      
      const { data: clients } = await supabase.from('clients').select('empresa, tempo_estimado').eq('responsavel', activeResponsavel);
      const { data: pdi } = await supabase.from('pdi_entries').select('*')
        .eq('responsavel', activeResponsavel).eq('mes', activeMonth).eq('ano', activeYear);

      if (clients && pdi) {
        const metrics = pdi
          .filter(p => !p.is_extra && p.inicio && p.prazo_realizado && (p.status === 'analyst' || p.status === 'ok'))
          .map(entry => {
            const client = clients.find(c => c.empresa === entry.empresa);
            const estimado = client?.tempo_estimado || 0;
            
            // LÓGICA ATUALIZADA: Dias Úteis Brutos - 0.5 se a flag estiver marcada
            const diasBrutos = getBusinessDays(entry.inicio, entry.prazo_realizado);
            let realizado = entry.meio_expediente ? Math.max(0.5, diasBrutos - 0.5) : diasBrutos;
            
            // Cálculo de Eficiência: (Estimado / Realizado) * 100
            let eficiencia = 0;
            if (estimado > 0 && realizado > 0) eficiencia = (estimado / realizado) * 100;
            else if (estimado > 0 && realizado === 0) eficiencia = 100; // Fez no mesmo dia (menos de 1 dia)

            return {
              empresa: entry.empresa,
              atividade: entry.atividade,
              inicio: entry.inicio,
              fim: entry.prazo_realizado,
              meioExp: entry.meio_expediente,
              estimado,
              realizado,
              eficiencia: Math.round(eficiencia)
            };
          });
        setPerformanceData(metrics);
      }
      setLoading(false);
    }
    loadPerformance();
  }, [activeResponsavel, activeMonth, activeYear]);

  const overview = useMemo(() => {
    if (performanceData.length === 0) return { avg: 0, noPrazo: 0, atrasados: 0 };
    const valid = performanceData.filter(d => d.estimado > 0);
    const avg = valid.length ? valid.reduce((acc, curr) => acc + curr.eficiencia, 0) / valid.length : 0;
    const noPrazo = valid.filter(d => d.eficiencia >= 100).length;
    return { avg: Math.round(avg), noPrazo, atrasados: valid.length - noPrazo, total: valid.length };
  }, [performanceData]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-indigo-600" /> Indicadores de Produtividade
          </h1>
          <p className="text-slate-500 text-sm mt-1">Análise de Tempo Estimado x Realizado no PDI</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <select value={activeResponsavel} onChange={(e) => setActiveResponsavel(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold focus:outline-none uppercase">
            {analysts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="h-6 w-px bg-slate-300"></div>
          <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none uppercase">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select>
          <span className="text-slate-300">/</span>
          <select value={activeYear} onChange={(e) => setActiveYear(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none">{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className={`p-4 rounded-full ${overview.avg >= 100 ? 'bg-emerald-100 text-emerald-600' : overview.avg >= 80 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
            <TrendingUp size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Eficiência Média</p>
            <h2 className="text-3xl font-black text-slate-800">{overview.avg}%</h2>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-emerald-500 flex items-center gap-4">
          <div className="p-4 rounded-full bg-slate-50 text-slate-400"><Clock size={32} /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dentro do Estimado</p>
            <h2 className="text-3xl font-black text-emerald-600">{overview.noPrazo} <span className="text-sm text-slate-400 font-medium">empresas</span></h2>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-red-500 flex items-center gap-4">
          <div className="p-4 rounded-full bg-slate-50 text-slate-400"><AlertTriangle size={32} /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Estourou o Tempo</p>
            <h2 className="text-3xl font-black text-red-600">{overview.atrasados} <span className="text-sm text-slate-400 font-medium">empresas</span></h2>
          </div>
        </div>
      </div>

      {/* Tabela de Detalhamento */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Detalhamento por Cliente (Apenas Concluídos)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Analisando dias úteis...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4 text-center">Data Início</th>
                  <th className="px-6 py-4 text-center">Data Conclusão</th>
                  <th className="px-6 py-4 text-center">Estimado</th>
                  <th className="px-6 py-4 text-center">Realizado</th>
                  <th className="px-6 py-4 text-right">Eficiência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <div className="flex flex-col">
                        <span>{row.empresa}</span>
                        {row.meioExp && <span className="text-[10px] text-indigo-500 uppercase">Utilizou Meio Expediente (-0,5d)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">{row.inicio.split('-').reverse().join('/')}</td>
                    <td className="px-6 py-4 text-center text-slate-600">{row.fim.split('-').reverse().join('/')}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600">{row.estimado === 0 ? '-' : `${row.estimado}d`}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{row.realizado}d</td>
                    <td className="px-6 py-4 text-right">
                      {row.estimado === 0 ? (
                        <span className="text-slate-400 text-xs font-medium">Sem parâmetro</span>
                      ) : (
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                          row.eficiencia >= 100 ? 'bg-emerald-100 text-emerald-700' : 
                          row.eficiencia >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {row.eficiencia}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {performanceData.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum PDI concluído com datas preenchidas para este analista neste mês.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
