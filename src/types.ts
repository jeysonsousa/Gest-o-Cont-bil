export type Status = 'not_started' | 'pending' | 'completed' | 'delayed';

export interface StatusRecord {
  val: Status;
  resp?: string;
}

export interface Client {
  id: string;
  created_at: string;
  responsavel: string;
  empresa: string;
  atividade: string;
  prioridade: string;
  tributacao: string;
  sem_movimento?: boolean;
  is_inactive?: boolean;
  tempo_estimado?: number;
  departamento?: string; 
  status: Record<string, Status | StatusRecord>;
}

export interface PdiEntry {
  id?: string;
  responsavel: string;
  empresa: string;
  atividade: string;
  competencia: string;
  inicio: string;
  termino: string;
  prazo_realizado: string;
  meio_expediente?: boolean;
  percentual: number;
  status: 'n' | 'analyst' | 'ok';
  observacao: string;
  mes: string;
  ano: string;
  is_extra?: boolean;
  departamento?: string; 
}

export interface UsuarioConfig {
  id?: string; // Adicionado ID para facilitar edição
  nome: string;
  email: string;
  departamentos?: string[]; 
}

// NOVO: Estrutura da Empresa Base
export interface EmpresaBase {
  id: string;
  nome: string;
  tributacao: string;
}

// NOVO: Estrutura das Metas
export interface MetaGlobal {
  id: string;
  nome: string;
  departamento: string; // Para filtrar: meta de Folha só aparece no Pessoal
}

export interface AppSettings {
  responsaveis: string[];
  atividades: string[];
  prioridades: string[];
  tributacoes: string[];
  empresas: string[]; // Antigo (manteremos por enquanto para não quebrar)
  usuarios?: string | UsuarioConfig[]; 
  departamentos?: string[]; 
  empresas_base?: EmpresaBase[]; // NOVO
  metas_globais?: MetaGlobal[]; // NOVO
}

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
