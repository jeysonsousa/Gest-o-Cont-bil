/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { PdiEntry, Client, AppSettings, MONTHS, Status, StatusRecord, UsuarioConfig } from '../types';
import { Save, Plus, Trash2, Target, Check, CheckCheck, Search, ShieldAlert, ChevronDown, ChevronUp, CalendarClock, AlertCircle, X, FileSpreadsheet, GripVertical } from 'lucide-react';
import ExcelJS from 'exceljs'; 

const currentYearNum = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYearNum - 1 + i).toString());

const currentDate = new Date();
let defaultMonthIndex = currentDate.getMonth() - 1;
let defaultYearNum = currentDate.getFullYear();

if (defaultMonthIndex < 0) {
  defaultMonthIndex = 11; 
  defaultYearNum -= 1;    
}

const formatDateForSearch = (dateStr?: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]} ${dateStr}`;
  }
  return dateStr;
};

// DATA DE HOJE PARA O SISTEMA DE TRAVA DE DATA
const todayDate = new Date();
const offset = todayDate.getTimezoneOffset();
const todayStr = new Date(todayDate.getTime() - (offset*60*1000)).toISOString().split('T')[0];

const ADMIN_EMAILS = ['jeyson@vsmweb.com.br', 'cristiane.cardoso@vsmweb.com.br'];

export function Pdi({ currentDepartment }: { currentDepartment: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [authLoaded, setAuthLoaded] = useState(false);

  const [activeMonth, setActiveMonth] = useState<string>(MONTHS[defaultMonthIndex]);
  const [activeYear, setActiveYear] = useState<string>(defaultYearNum.toString());
  const [activeResponsavel, setActiveResponsavel] = useState<string>('');
  
  const [activeAnalysts, setActiveAnalysts] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [localData, setLocalData] = useState<PdiEntry[]>([]);
  const [baseClients, setBaseClients] = useState<Client[]>([]); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');

  const [showPending, setShowPending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const [showHojeModal, setShowHojeModal] = useState(false);
  const [showAtrasadasModal, setShowAtrasadasModal] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email?.toLowerCase().trim() || '';
      setUserEmail(email);
      setAuthLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    async function fetchRoles() {
      const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 1).single();
      const { data: clientsData } = await supabase.from('clients')
        .select('responsavel, is_inactive, sem_movimento, departamento')
        .eq('departamento', currentDepartment); 
      
      if (settingsData) {
        setSettings(settingsData);
        let rawUsuarios = settingsData.usuarios || [];
        if (typeof rawUsuarios === 'string') {
          try { rawUsuarios = JSON.parse(rawUsuarios); } catch(e) { rawUsuarios = []; }
        }
        const usuariosConfig: UsuarioConfig[] = rawUsuarios;
        
        let userIsAdmin = ADMIN_EMAILS.includes(userEmail);
        const myConfig = usuariosConfig.find(u => u.email === userEmail);
        if (myConfig && myConfig.isAdmin) userIsAdmin = true;
        setIsAdmin(userIsAdmin);

        const list = (clientsData || []).filter(c => !c.is_inactive).map(c => c.responsavel);
        let allowedAnalysts: string[] = [];
        
        if (userIsAdmin) {
          const configuredNames = usuariosConfig.map(u => u.nome.toUpperCase());
          allowedAnalysts = [...new Set([...list.map(n => n?.toUpperCase() || ''), ...configuredNames])].sort();
        } else {
          if (myConfig) allowedAnalysts = [myConfig.nome.toUpperCase()];
        }
        
        setActiveAnalysts(allowedAnalysts);
        if (allowedAnalysts.length > 0) setActiveResponsavel(allowedAnalysts[0]);
        else setActiveResponsavel('');
      }
    }
    fetchRoles();
  }, [authLoaded, userEmail, currentDepartment]);

  useEffect(() => {
    async function fetchPdiData() {
      if (!activeResponsavel || !settings) {
        setLocalData([]);
        return;
      }
      setLoading(true);

      try {
        const { data: clientsData } = await supabase.from('clients')
          .select('*')
          .eq('responsavel', activeResponsavel)
          .eq('departamento', currentDepartment);

        const { data: pdiData } = await supabase.from('pdi_entries')
          .select('*')
          .eq('responsavel', activeResponsavel)
          .eq('mes', activeMonth)
          .eq('ano', activeYear)
          .eq('departamento', currentDepartment);

        const clients = clientsData || [];
        const dbEntries = pdiData || [];
        
        const activeClients = clients.filter((c: Client) => !c.sem_movimento && !c.is_inactive);
        const activeClientNames = activeClients.map((c: Client) => c.empresa.toUpperCase().trim());

        const validDbEntries = dbEntries.filter(e => e.is_extra || activeClientNames.includes(e.empresa.toUpperCase().trim()));
        const deptMetasGlobais = (settings.metas_globais || []).filter(m => m.departamento.toUpperCase().trim() === currentDepartment.toUpperCase().trim());

        const enrichedDbEntries = validDbEntries.map(e => {
          if (e.is_extra) return e;
          const empBase = (settings.empresas_base || []).find(emp => emp.nome.toUpperCase().trim() === e.empresa.toUpperCase().trim());
          if (empBase && empBase.metas_vinculadas) {
            const metaDef = deptMetasGlobais.find(m => m.nome.toUpperCase().trim() === e.atividade.toUpperCase().trim());
            if (metaDef) {
              const linkedMeta = empBase.metas_vinculadas.find(mv => mv.metaId === metaDef.id);
              if (linkedMeta) {
                return { ...e, tempo_estimado: linkedMeta.tempo_estimado };
              }
            }
          }
          return e;
        });

        const combined: PdiEntry[] = [...enrichedDbEntries];
        setBaseClients(activeClients); 

        activeClients.forEach((client: Client) => {
          const empBase = (settings.empresas_base || []).find(e => e.nome.toUpperCase().trim() === client.empresa.toUpperCase().trim());
          
          if (empBase && empBase.metas_vinculadas) {
            const linkedDeptMetas = empBase.metas_vinculadas.filter(mv => deptMetasGlobais.some(dmg => dmg.id === mv.metaId));

            linkedDeptMetas.forEach(mv => {
              const metaDef = deptMetasGlobais.find(dmg => dmg.id === mv.metaId);
              if (metaDef) {
                const exists = combined.find(e => 
                  e.empresa.toUpperCase().trim() === client.empresa.toUpperCase().trim() && 
                  e.atividade.toUpperCase().trim() === metaDef.nome.toUpperCase().trim() && 
                  !e.is_extra
                );
                
                if (!exists) {
                  combined.push({
                    responsavel: activeResponsavel, empresa: client.empresa, atividade: metaDef.nome,
                    competencia: `${activeMonth}/${activeYear}`, inicio: '', termino: '', prazo_realizado: '',
                    meio_expediente: false, percentual: 0, status: 'n', observacao: '',
                    mes: activeMonth, ano: activeYear, is_extra: false, departamento: currentDepartment,
                    tempo_estimado: mv.tempo_estimado 
                  });
                }
              }
            });
          }
        });

        combined.sort((a, b) => {
          if (a.ordem !== undefined && b.ordem !== undefined && a.ordem !== b.ordem) {
            return a.ordem - b.ordem;
          }
          if (a.is_extra !== b.is_extra) return a.is_extra ? 1 : -1;
          return a.empresa.localeCompare(b.empresa);
        });
        
        setLocalData(combined);
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPdiData();
  }, [activeMonth, activeYear, activeResponsavel, currentDepartment, settings]);

  const metrics = useMemo(() => {
    if (localData.length === 0) return { avg: 0, total: 0, completed: 0 };
    const total = localData.length;
    const completed = localData.filter(d => d.status === 'analyst' || d.status === 'ok').length;
    const avg = Math.round((completed / total) * 100);
    return { avg, total, completed };
  }, [localData]);

  const { tarefasHojeList, tarefasAtrasadasList } = useMemo(() => {
    let hoje: {row: PdiEntry, index: number}[] = [];
    let atrasadas: {row: PdiEntry, index: number}[] = [];

    localData.forEach((row, index) => {
      if (row.status === 'n' && row.termino) {
        if (row.termino === todayStr) hoje.push({row, index});
        else if (row.termino < todayStr) atrasadas.push({row, index});
      }
    });
    return { tarefasHojeList: hoje, tarefasAtrasadasList: atrasadas };
  }, [localData]);

  const groupedTasks = useMemo(() => {
    const tasksWithIndex = localData.map((row, index) => ({ row, index }));
    const pending = tasksWithIndex.filter(item => item.row.status === 'n');
    const completed = tasksWithIndex.filter(item => item.row.status === 'analyst' || item.row.status === 'ok');

    const filterFn = (item: {row: PdiEntry}) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.row.empresa.toLowerCase().includes(term) || 
        item.row.atividade.toLowerCase().includes(term) ||
        formatDateForSearch(item.row.inicio).includes(term) ||
        formatDateForSearch(item.row.termino).includes(term) ||
        formatDateForSearch(item.row.prazo_realizado).includes(term)
      );
    };

    return { filteredPending: pending.filter(filterFn), filteredCompleted: completed.filter(filterFn) };
  }, [localData, searchTerm]);

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const newData = [...localData];
    const draggedItem = newData.splice(draggedIndex, 1)[0];
    newData.splice(targetIndex, 0, draggedItem);
    const updatedData = newData.map((item, idx) => ({ ...item, ordem: idx }));
    setLocalData(updatedData);
    setDraggedIndex(null);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`PDI ${activeResponsavel}`);

      worksheet.columns = [
        { key: 'empresa', width: 35 }, { key: 'acao', width: 35 }, { key: 'competencia', width: 15 },
        { key: 'inicio', width: 15 }, { key: 'termino', width: 15 }, { key: 'prazo', width: 18 },
        { key: 'meioExp', width: 12 }, { key: 'statusText', width: 25 }, { key: 'obs', width: 50 }
      ];

      const titleRow = worksheet.addRow(['RELATÓRIO DE DESEMPENHO INDIVIDUAL (PDI) - GESTÃO 360º']);
      worksheet.mergeCells('A1:I1');
      titleRow.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

      const infoRow = worksheet.addRow([`SETOR: ${currentDepartment.toUpperCase()}   |   RESPONSÁVEL: ${activeResponsavel.toUpperCase()}   |   COMPETÊNCIA: ${activeMonth.toUpperCase()}/${activeYear}`]);
      worksheet.mergeCells('A2:I2');
      infoRow.font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
      infoRow.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRow([]); 

      const headerRow = worksheet.addRow([
        'EMPRESA', 'AÇÃO / META', 'COMPETÊNCIA', 'INÍCIO', 'TÉRMINO', 'REALIZADO EM', 'MEIO EXP.', 'STATUS', 'OBSERVAÇÕES'
      ]);

      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
      });

      const allTasks = [...groupedTasks.filteredPending, ...groupedTasks.filteredCompleted];

      allTasks.forEach(({ row }) => {
        let statusText = 'Pendente';
        let statusColor = 'FFF1F5F9'; 
        let fontColor = 'FF64748B'; 

        if (row.status === 'analyst' || row.status === 'ok') {
           if (row.termino && row.prazo_realizado && row.prazo_realizado > row.termino) {
             statusText = 'Atrasado (Fora do Prazo)';
             statusColor = 'FFEF4444'; 
             fontColor = 'FFFFFFFF'; 
           } else {
             statusText = 'Concluído no Prazo';
             statusColor = 'FF10B981'; 
             fontColor = 'FFFFFFFF'; 
           }
        }

        const excelRow = worksheet.addRow({
          empresa: row.empresa || (row.is_extra ? 'ATIVIDADE EXTRA' : ''),
          acao: row.atividade,
          competencia: row.competencia,
          inicio: row.inicio ? row.inicio.split('-').reverse().join('/') : '',
          termino: row.termino ? row.termino.split('-').reverse().join('/') : '',
          prazo: row.prazo_realizado ? row.prazo_realizado.split('-').reverse().join('/') : '',
          meioExp: row.meio_expediente ? 'SIM' : 'NÃO',
          statusText: statusText,
          obs: row.observacao || ''
        });

        excelRow.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 2 || colNumber === 9 ? 'left' : 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFEEEEEE' } }, left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } }, right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
          };
        });

        const statusCell = excelRow.getCell('statusText');
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
        statusCell.font = { color: { argb: fontColor }, bold: true, size: 10 };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Relatorio_PDI_${activeResponsavel}_${activeMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Erro ao exportar Excel: ", error);
      alert("Houve um erro ao gerar a planilha.");
    } finally {
      setExporting(false);
    }
  };

  const handleInputChange = (index: number, field: keyof PdiEntry, value: string | number | boolean) => {
    // === SISTEMA DE TRAVA DIRETO NO TECLADO (COM TEXTO MAIS LEVE) ===
    if (field === 'prazo_realizado' && !isAdmin && typeof value === 'string' && value !== '') {
      if (value < todayStr) {
        alert(`AÇÃO BLOQUEADA!\n\nVocê tentou inserir uma data retroativa (${value.split('-').reverse().join('/')}).\n\nO sistema só permite registrar a conclusão com a data de hoje (${todayStr.split('-').reverse().join('/')}) em diante.`);
        return; // Retorna imediatamente e não deixa a data falsa ir para o estado da tela!
      }
    }

    const newData = [...localData];
    newData[index] = { ...newData[index], [field]: value };
    setLocalData(newData);
  };

  const handleAddExtra = () => {
    setLocalData([...localData, {
      responsavel: activeResponsavel, empresa: '', atividade: '', competencia: `${activeMonth}/${activeYear}`,
      inicio: '', termino: '', prazo_realizado: '', meio_expediente: false, percentual: 0, status: 'n',
      observacao: '', mes: activeMonth, ano: activeYear, is_extra: true, departamento: currentDepartment
    }]);
  };

  const handleDeleteExtra = async (index: number) => {
    const row = localData[index];
    if (window.confirm('Excluir esta atividade extra?')) {
      if (row.id) await supabase.from('pdi_entries').delete().eq('id', row.id);
      const newData = [...localData];
      newData.splice(index, 1);
      setLocalData(newData);
    }
  };

  const handleAnalystConfirm = (index: number) => {
    const newData = [...localData];
    const row = newData[index];
    if (row.status === 'n') {
      newData[index].status = 'analyst';
      if (!row.prazo_realizado || (!isAdmin && row.prazo_realizado < todayStr)) {
        newData[index].prazo_realizado = todayStr;
      }
    } else {
      newData[index].status = 'n';
    }
    setLocalData(newData);
  };

  const handleManagerConfirm = (index: number) => {
    const newData = [...localData];
    const row = newData[index];
    if (row.status === 'analyst') newData[index].status = 'ok';
    else if (row.status === 'ok') newData[index].status = 'analyst';
    setLocalData(newData);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const row of localData) {
        const dbRow: any = {
          ...row, inicio: row.inicio || null, termino: row.termino || null,
          prazo_realizado: row.prazo_realizado || null, meio_expediente: row.meio_expediente || false,
          departamento: currentDepartment,
          ordem: row.ordem || 0 
        };
        
        delete dbRow.tempo_estimado;

        if (row.id) {
          await supabase.from('pdi_entries').update(dbRow).eq('id', row.id);
        } else {
          const { data, error } = await supabase.from('pdi_entries').insert([dbRow]).select();
          if (!error && data) row.id = data[0].id;
        }

        if (!row.is_extra) {
          const client = baseClients.find(c => c.empresa.toUpperCase() === row.empresa.toUpperCase());
          if (client) {
            const monthKey = `${activeMonth}-${activeYear}`;
            const isPdiCompleted = row.status === 'analyst' || row.status === 'ok';
            const targetStatus: Status = isPdiCompleted ? 'completed' : 'pending';
            const currentStatusData = client.status[monthKey];
            const currentVal = typeof currentStatusData === 'object' ? currentStatusData.val : (currentStatusData || 'not_started');

            if (currentVal !== targetStatus && (isPdiCompleted || currentVal === 'completed')) {
              const newRecord: StatusRecord = { val: targetStatus, resp: activeResponsavel };
              const newStatusObj = { ...client.status, [monthKey]: newRecord };
              await supabase.from('clients').update({ status: newStatusObj }).eq('id', client.id);
              client.status = newStatusObj; 
            }
          }
        }
      }
      alert('PDI Salvo com sucesso!');
    } catch (error) {
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const getTrafficLight = (row: PdiEntry) => {
    if (row.status === 'n') return { color: 'bg-gray-200', title: 'Pendente' };
    if (row.termino && row.prazo_realizado) {
      if (row.prazo_realizado <= row.termino) return { color: 'bg-emerald-500', title: 'Concluído no Prazo' };
      else return { color: 'bg-red-500', title: 'Concluído Fora do Prazo' };
    }
    return { color: 'bg-emerald-500', title: 'Concluído' };
  };

  if (!authLoaded) return <div className="p-8 text-center font-bold text-slate-500">Autenticando painel...</div>;

  const renderRow = (row: PdiEntry, index: number) => {
    const light = getTrafficLight(row);
    const minDateAttr = (!isAdmin && (row.status === 'analyst' || row.status === 'ok')) ? todayStr : undefined;

    return (
      <tr 
        key={index} 
        draggable 
        onDragStart={() => setDraggedIndex(index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(index)}
        className={`${row.is_extra ? 'bg-slate-50/50' : 'hover:bg-slate-50'} transition-all ${draggedIndex === index ? 'opacity-50 scale-[0.99] border-2 border-dashed border-[#2563eb]' : ''}`}
      >
        <td className="p-1 border-r border-slate-200 text-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-[#2563eb]">
          <GripVertical size={16} className="mx-auto" title="Clique e arraste para reordenar" />
        </td>

        <td className="p-1 border-r border-slate-200"><input type="text" value={row.empresa} onChange={(e) => handleInputChange(index, 'empresa', e.target.value)} disabled={!row.is_extra} className={`w-full p-2 outline-none uppercase font-bold text-xs ${!row.is_extra ? 'bg-transparent text-slate-700' : 'bg-white border border-slate-300 rounded'}`} placeholder="NOME DA EMPRESA" /></td>
        
        <td className="p-1 border-r border-slate-200">
          <input 
            type="text" 
            value={row.atividade} 
            onChange={(e) => handleInputChange(index, 'atividade', e.target.value)} 
            disabled={!row.is_extra} 
            className={`w-full p-2 outline-none bg-transparent text-[#1e3a8a] font-bold text-[11px] ${!row.is_extra && 'cursor-not-allowed'}`} 
            placeholder="Qual a ação?" 
            title={!row.is_extra && row.tempo_estimado !== undefined ? `Tempo estimado pela gestão: ${row.tempo_estimado} dia(s)` : (!row.is_extra ? 'Ação vinda do Cadastro Global' : '')} 
          />
        </td>
        
        <td className="p-1 border-r border-slate-200 text-center"><input type="text" value={row.competencia} onChange={(e) => handleInputChange(index, 'competencia', e.target.value)} className="w-full p-2 outline-none bg-transparent text-slate-500 text-[11px] font-bold text-center" /></td>
        <td className="p-1 border-r border-slate-200"><input type="date" value={row.inicio || ''} onChange={(e) => handleInputChange(index, 'inicio', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs font-medium text-slate-600 focus:border-[#2563eb]" /></td>
        <td className="p-1 border-r border-slate-200"><input type="date" value={row.termino || ''} onChange={(e) => handleInputChange(index, 'termino', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs font-medium text-slate-600 focus:border-[#2563eb]" /></td>
        <td className="p-1 border-r border-slate-200 bg-slate-50/50">
          <div className="flex flex-col gap-1 items-center">
            <input type="date" min={minDateAttr} value={row.prazo_realizado || ''} onChange={(e) => handleInputChange(index, 'prazo_realizado', e.target.value)} className="w-full p-1.5 outline-none bg-white border border-slate-200 rounded text-xs font-bold text-[#1e3a8a] focus:border-[#2563eb]" title={!isAdmin ? "Apenas datas a partir de hoje" : "O Administrador pode editar livremente"} />
            <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-200 px-1.5 rounded transition-colors" title="Marque se utilizou apenas meio expediente">
              <input type="checkbox" checked={row.meio_expediente || false} onChange={(e) => handleInputChange(index, 'meio_expediente', e.target.checked)} className="w-3 h-3 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb]" />
              <span className="text-[9px] font-bold text-slate-500 uppercase">-0,5 DIA</span>
            </label>
          </div>
        </td>
        <td className="p-1 border-r border-slate-200 text-center"><div className={`mx-auto w-4 h-4 rounded-full ${light.color} shadow-inner`} title={light.title}></div></td>
        <td className="p-1 border-r border-slate-200"><input type="text" value={row.observacao} onChange={(e) => handleInputChange(index, 'observacao', e.target.value)} className="w-full p-2 outline-none bg-transparent text-xs text-slate-600" placeholder="Insira uma nota..." /></td>
        <td className="p-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => handleAnalystConfirm(index)} className={`p-1.5 rounded-md transition-colors ${row.status === 'analyst' || row.status === 'ok' ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title={row.status === 'n' ? "Finalizar Tarefa (Analista)" : "Tarefa Finalizada"}><Check size={16} /></button>
            <button onClick={() => handleManagerConfirm(index)} disabled={row.status === 'n' || !isAdmin} className={`p-1.5 rounded-md transition-colors ${row.status === 'ok' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'} disabled:opacity-30 disabled:cursor-not-allowed`} title={row.status === 'ok' ? "Validado pelo Gestor" : isAdmin ? "Validar (Gestor)" : "Apenas o Gestor pode validar"}><CheckCheck size={16} /></button>
            {row.is_extra && <button onClick={() => handleDeleteExtra(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Excluir Extra"><Trash2 size={16} /></button>}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4 md:space-y-6">
      
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="text-[#1e3a8a]" /> PDI da Equipe: <span className="text-[#2563eb]">{currentDepartment}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Plano de Ação e Desempenho Mensal</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <select 
            value={activeResponsavel} 
            onChange={(e) => setActiveResponsavel(e.target.value)}
            disabled={!isAdmin} 
            className={`border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold focus:outline-none min-w-[150px] ${!isAdmin ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white text-slate-800 focus:border-[#2563eb]'}`}
          >
            {activeAnalysts.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="h-6 w-px bg-slate-300"></div>
          <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer uppercase">
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="text-slate-400">/</span>
          <select value={activeYear} onChange={(e) => setActiveYear(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {activeAnalysts.length === 0 && !isAdmin ? (
        <div className="bg-amber-50 p-8 rounded-2xl border border-amber-200 text-center max-w-2xl mx-auto mt-10">
          <ShieldAlert className="mx-auto text-amber-500 mb-4" size={48} />
          <h3 className="text-amber-800 font-bold text-xl">Nenhum Analista no {currentDepartment}</h3>
          <p className="text-amber-700 mt-2 font-medium">Cadastre empresas e responsáveis para este departamento no Painel.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Evolução Mensal</p>
                   <h3 className="text-3xl font-black text-[#1e3a8a]">{metrics.avg}%</h3>
                 </div>
                 <div className="relative w-12 h-12">
                  <svg className="w-full h-full transform -rotate-90 relative z-10">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (metrics.avg / 100) * 125.6} className="text-emerald-500 transition-all duration-1000 ease-out" />
                  </svg>
                 </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Entregas</p>
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="text-3xl font-black text-slate-800">{metrics.completed}</h3>
                <span className="text-sm font-bold text-slate-400 mb-1">/ {metrics.total}</span>
              </div>
              <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-block w-fit">Metas Validadas</p>
            </div>

            <div onClick={() => setShowHojeModal(true)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-400 transition-all group-hover:w-2"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 group-hover:text-amber-500 transition-colors">
                <CalendarClock size={12}/> Vencem Hoje
              </p>
              <h3 className="text-3xl font-black text-amber-500 mb-1">{tarefasHojeList.length}</h3>
              <p className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block w-fit">Ver Lista</p>
            </div>

            <div onClick={() => setShowAtrasadasModal(true)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 transition-all group-hover:w-2"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 group-hover:text-red-500 transition-colors">
                <AlertCircle size={12}/> Atrasadas
              </p>
              <h3 className="text-3xl font-black text-red-500 mb-1">{tarefasAtrasadasList.length}</h3>
              <p className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded inline-block w-fit">Ver Lista</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-slate-200 bg-slate-50 gap-4">
              <h2 className="font-bold text-slate-700 uppercase text-sm tracking-wider">Plano de Ação de {activeResponsavel}</h2>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Buscar empresa, ação ou data..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 transition-all"/>
                </div>

                <button onClick={handleAddExtra} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors shadow-sm">
                  <Plus size={16} /> Adicionar Extra
                </button>

                <button onClick={handleExportExcel} disabled={exporting || loading} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                  <FileSpreadsheet size={16} /> {exporting ? 'Gerando...' : 'Exportar Excel'}
                </button>

                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#2563eb] hover:bg-[#1e3a8a] rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                  <Save size={16} /> {saving ? 'Salvando...' : 'Salvar PDI'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500 font-bold">Processando metas do setor {currentDepartment}...</div>
              ) : (
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-2 py-3 border-r border-slate-300 w-8 text-center" title="Arraste para ordenar">☰</th>
                      <th className="px-4 py-3 border-r border-slate-300">Empresas</th>
                      <th className="px-4 py-3 border-r border-slate-300">Ação</th>
                      <th className="px-4 py-3 border-r border-slate-300 text-center w-24">Competência</th>
                      <th className="px-3 py-3 border-r border-slate-300 w-32 text-center">Início</th>
                      <th className="px-3 py-3 border-r border-slate-300 w-32 text-center">Término</th>
                      <th className="px-3 py-3 border-r border-slate-300 w-[140px] text-center">Prazo Realiz.</th>
                      <th className="px-3 py-3 border-r border-slate-300 w-16 text-center">Status</th>
                      <th className="px-4 py-3 border-r border-slate-300">Observação</th>
                      <th className="px-3 py-3 text-center">Validações / Ações</th>
                    </tr>
                  </thead>
                  
                  <tbody onClick={() => setShowPending(!showPending)} className="group cursor-pointer">
                    <tr>
                      <td colSpan={10} className="p-0">
                        <div className="bg-amber-50 border-y border-amber-200 p-3 flex items-center justify-between group-hover:bg-amber-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="font-bold text-amber-800 uppercase text-xs tracking-wider">Metas Pendentes ({groupedTasks.filteredPending.length})</span>
                          </div>
                          {showPending ? <ChevronUp size={16} className="text-amber-600"/> : <ChevronDown size={16} className="text-amber-600"/>}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  {showPending && (
                    <tbody className="divide-y divide-slate-200">
                      {groupedTasks.filteredPending.map(({row, index}) => renderRow(row, index))}
                      {groupedTasks.filteredPending.length === 0 && (
                        <tr><td colSpan={10} className="p-6 text-center text-slate-400 text-xs font-bold">Nenhuma meta pendente encontrada.</td></tr>
                      )}
                    </tbody>
                  )}

                  <tbody className="bg-white"><tr><td colSpan={10} className="p-1"></td></tr></tbody>

                  <tbody onClick={() => setShowCompleted(!showCompleted)} className="group cursor-pointer">
                    <tr>
                      <td colSpan={10} className="p-0">
                        <div className="bg-emerald-50 border-y border-emerald-200 p-3 flex items-center justify-between group-hover:bg-emerald-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="font-bold text-emerald-800 uppercase text-xs tracking-wider">Metas Concluídas ({groupedTasks.filteredCompleted.length})</span>
                          </div>
                          {showCompleted ? <ChevronUp size={16} className="text-emerald-600"/> : <ChevronDown size={16} className="text-emerald-600"/>}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  {showCompleted && (
                    <tbody className="divide-y divide-slate-200">
                      {groupedTasks.filteredCompleted.map(({row, index}) => renderRow(row, index))}
                      {groupedTasks.filteredCompleted.length === 0 && (
                        <tr><td colSpan={10} className="p-6 text-center text-slate-400 text-xs font-bold">Nenhuma meta concluída encontrada.</td></tr>
                      )}
                    </tbody>
                  )}
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {showHojeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50 rounded-t-2xl">
              <h2 className="text-lg font-black text-amber-600 flex items-center gap-2"><CalendarClock size={20}/> Tarefas que Vencem Hoje</h2>
              <button onClick={() => setShowHojeModal(false)} className="text-amber-400 hover:text-amber-600 bg-white p-1 rounded-full"><X size={20}/></button>
            </div>
            <div className="overflow-auto p-4 flex-1">
              <table className="w-full text-left text-sm border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                  <tr><th className="px-4 py-2">Empresa</th><th className="px-4 py-2">Ação</th><th className="px-4 py-2 text-right">Ação Rápida</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tarefasHojeList.map(item => (
                    <tr key={item.index} className="hover:bg-slate-50 group">
                      <td className="px-4 py-3 font-bold text-slate-800 text-xs">{item.row.empresa}</td>
                      <td className="px-4 py-3 text-[#1e3a8a] font-bold text-[10px] uppercase">{item.row.atividade}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleAnalystConfirm(item.index)} className="text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 font-bold px-3 py-1.5 rounded transition-colors uppercase flex items-center justify-end gap-1 ml-auto">
                          <Check size={12}/> Concluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tarefasHojeList.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-slate-400 font-medium">Você não tem mais tarefas para hoje!</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAtrasadasModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-red-50 rounded-t-2xl">
              <h2 className="text-lg font-black text-red-600 flex items-center gap-2"><AlertCircle size={20}/> Tarefas Atrasadas</h2>
              <button onClick={() => setShowAtrasadasModal(false)} className="text-red-400 hover:text-red-600 bg-white p-1 rounded-full"><X size={20}/></button>
            </div>
            <div className="overflow-auto p-4 flex-1">
              <table className="w-full text-left text-sm border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                  <tr><th className="px-4 py-2">Empresa</th><th className="px-4 py-2">Ação</th><th className="px-4 py-2 text-center">Venceu em</th><th className="px-4 py-2 text-right">Ação Rápida</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tarefasAtrasadasList.map(item => (
                    <tr key={item.index} className="hover:bg-slate-50 group">
                      <td className="px-4 py-3 font-bold text-slate-800 text-xs">{item.row.empresa}</td>
                      <td className="px-4 py-3 text-[#1e3a8a] font-bold text-[10px] uppercase">{item.row.atividade}</td>
                      <td className="px-4 py-3 text-center text-red-500 font-bold text-xs">{item.row.termino?.split('-').reverse().join('/')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleAnalystConfirm(item.index)} className="text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 font-bold px-3 py-1.5 rounded transition-colors uppercase flex items-center justify-end gap-1 ml-auto">
                          <Check size={12}/> Concluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tarefasAtrasadasList.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400 font-medium">Nenhuma tarefa atrasada!</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
