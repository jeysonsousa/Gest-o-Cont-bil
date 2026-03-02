export type Status = 'completed' | 'pending' | 'delayed' | 'not_started';

export interface Client {
  id: string;
  responsavel: string;
  empresa: string;
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
