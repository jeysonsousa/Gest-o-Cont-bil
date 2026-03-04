/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

export type Status = 'completed' | 'pending' | 'delayed' | 'not_started';

export interface StatusRecord {
  val: Status;
  resp: string; 
}

export interface Client {
  id: string;
  responsavel: string;
  empresa: string;
  sem_movimento?: boolean;
  is_inactive?: boolean; 
  tempo_estimado?: number; 
  atividade: string;
  prioridade: string;
  tributacao: string;
  status: Record<string, Status | StatusRecord>;
}

// NOVO: Estrutura para vincular o Analista ao E-mail de acesso
export interface UsuarioConfig {
  nome: string;
  email: string;
}

export interface AppSettings {
  responsaveis: string[]; // Mantido por retrocompatibilidade
  usuarios?: UsuarioConfig[]; // NOVO CAMPO DE GESTÃO DE ACESSOS
  atividades: string[];
  prioridades: string[];
  tributacoes: string[];
  empresas: string[];
}

export const MONTHS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'
];

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
  status: string;
  observacao: string;
  mes: string;
  ano: string;
  is_extra: boolean;
}
