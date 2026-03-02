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
  'jan/26', 'fev/26', 'mar/26', 'abr/26', 'mai/26', 'jun/26', 'jul/26', 'ago/26', 'set/26', 'out/26', 'nov/26', 'dez/26'
];
