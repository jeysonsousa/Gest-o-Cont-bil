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
  departamento?: string; // <-- NOVO CAMPO
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
  departamento?: string; // <-- NOVO CAMPO
}

export interface UsuarioConfig {
  nome: string;
  email: string;
}

export interface AppSettings {
  responsaveis: string[];
  atividades: string[];
  prioridades: string[];
  tributacoes: string[];
  empresas: string[];
  usuarios?: string | UsuarioConfig[]; 
}

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
