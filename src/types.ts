/**
 * @developer Jeyson Lins
 * @contact jeyson.cont@gmail.com | 91983617032
 */

export type Status = 'completed' | 'pending' | 'delayed' | 'not_started';

// SOLICITAÇÃO: Registro histórico para auditoria de quem concluiu a tarefa na época
export interface StatusRecord {
  val: Status;
  resp: string; // Nome do analista responsável no momento da conclusão
}

export interface Client {
  id: string;
  responsavel: string;
  empresa: string;
  sem_movimento?: boolean;
  is_inactive?: boolean; // SOLICITAÇÃO: Flag para empresas que deixaram de ser clientes
  atividade: string;
  prioridade: string;
  tributacao: string;
  // O status agora aceita o formato simples (legado) ou o objeto com histórico
  status: Record<string, Status | StatusRecord>;
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
  atividade: string; // Coluna "AÇÃO" no layout do PDI
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
