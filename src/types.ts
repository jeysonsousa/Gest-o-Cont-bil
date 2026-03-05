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
  tempo_estimado?: number; // NOVO: Para exibir no balãozinho (Tooltip)
}

export interface UsuarioConfig {
  id?: string; 
  nome: string;
  email: string;
  departamentos?: string[]; 
  isEstagiario?: boolean; 
  isAdmin?: boolean; 
}

export interface MetaGlobal {
  id: string;
  nome: string;
  departamento: string; 
}

export interface MetaVinculada {
  metaId: string;
  tempo_estimado: number;
}

export interface DeptAlocacao {
  responsavel: string;
  prioridade: string;
  sem_movimento: boolean;
}

export interface EmpresaBase {
  id: string;
  nome: string;
  tributacao: string;
  atividade?: string; 
  metas_vinculadas?: MetaVinculada[];
  is_inactive?: boolean; 
  alocacoes?: Record<string, DeptAlocacao>; 
}

export interface AppSettings {
  responsaveis: string[];
  atividades: string[];
  prioridades: string[];
  tributacoes: string[];
  empresas: string[]; 
  usuarios?: string | UsuarioConfig[]; 
  departamentos?: string[]; 
  empresas_base?: EmpresaBase[]; 
  metas_globais?: MetaGlobal[]; 
}

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
