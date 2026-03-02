export type Status = 'completed' | 'pending' | 'delayed' | 'not_started';

export interface Client {
  id: string;
  responsavel: string;
  empresa: string;
  sem_movimento?: boolean;
  atividade: string;
  prioridade: string;
  tributacao: string;
  status: Record<string, Status>;
}

export interface AppSettings {
  responsaveis: string[];
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
  percentual: number;
  status: string;
  observacao: string;
  mes: string;
  ano: string;
  is_extra: boolean;
}
