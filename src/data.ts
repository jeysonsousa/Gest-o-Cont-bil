import { Client, AppSettings } from './types';

export const initialSettings: AppSettings = {
  responsaveis: ['CAMILA', 'ALEX', 'DARA', 'GABRIEL'],
  atividades: ['COMÉRCIO', 'SERVIÇO'],
  prioridades: ['A', 'B', 'C'],
  tributacoes: ['PRESUMIDO', 'SIMPLES', 'IMUNE'],
  empresas: ['3P FLORESTAL', 'AMAZONIA ZEN', 'AMPORT', 'ASPEB MTZ', 'ASPEB FILIAIS', 'BBS (sem faturamento)', 'BIONORTE', 'BIO PATRIMONIAL'],
};

export const initialClients: Client[] = [
  {
    id: '1',
    responsavel: 'CAMILA',
    empresa: '3P FLORESTAL',
    atividade: 'COMÉRCIO',
    prioridade: 'A',
    tributacao: 'PRESUMIDO',
    status: {
      'jan/26': 'completed', 'fev/26': 'completed', 'mar/26': 'completed', 'abr/26': 'completed', 'mai/26': 'completed', 'jun/26': 'completed', 'jul/26': 'pending'
    }
  },
  {
    id: '2',
    responsavel: 'ALEX',
    empresa: 'AMAZONIA ZEN',
    atividade: 'COMÉRCIO',
    prioridade: 'A',
    tributacao: 'SIMPLES',
    status: {
      'jan/26': 'pending', 'fev/26': 'pending', 'mar/26': 'pending', 'abr/26': 'pending', 'mai/26': 'pending', 'jun/26': 'pending', 'jul/26': 'pending'
    }
  },
  {
    id: '3',
    responsavel: 'CAMILA',
    empresa: 'AMPORT',
    atividade: 'SERVIÇO',
    prioridade: 'A',
    tributacao: 'IMUNE',
    status: {
      'jan/26': 'completed', 'fev/26': 'completed', 'mar/26': 'completed', 'abr/26': 'completed', 'mai/26': 'completed', 'jun/26': 'completed', 'jul/26': 'pending'
    }
  },
  {
    id: '4',
    responsavel: 'CAMILA',
    empresa: 'ASPEB MTZ',
    atividade: 'SERVIÇO',
    prioridade: 'A',
    tributacao: 'PRESUMIDO',
    status: {
      'jan/26': 'completed', 'fev/26': 'completed', 'mar/26': 'completed', 'abr/26': 'completed', 'mai/26': 'completed', 'jun/26': 'completed', 'jul/26': 'pending'
    }
  },
  {
    id: '5',
    responsavel: 'CAMILA',
    empresa: 'ASPEB FILIAIS',
    atividade: 'SERVIÇO',
    prioridade: 'A',
    tributacao: 'PRESUMIDO',
    status: {
      'jan/26': 'completed', 'fev/26': 'completed', 'mar/26': 'completed', 'abr/26': 'completed', 'mai/26': 'completed', 'jun/26': 'completed', 'jul/26': 'pending'
    }
  },
  {
    id: '6',
    responsavel: 'DARA',
    empresa: 'BBS (sem faturamento)',
    atividade: 'SERVIÇO',
    prioridade: 'A',
    tributacao: 'PRESUMIDO',
    status: {
      'jan/26': 'completed', 'fev/26': 'completed', 'mar/26': 'completed', 'abr/26': 'completed', 'mai/26': 'completed', 'jun/26': 'completed', 'jul/26': 'completed'
    }
  },
  {
    id: '7',
    responsavel: 'GABRIEL',
    empresa: 'BIONORTE',
    atividade: 'SERVIÇO',
    prioridade: 'B',
    tributacao: 'PRESUMIDO',
    status: {
      'jan/26': 'pending', 'fev/26': 'pending', 'mar/26': 'pending', 'abr/26': 'pending', 'mai/26': 'pending', 'jun/26': 'pending', 'jul/26': 'pending'
    }
  },
  {
    id: '8',
    responsavel: 'GABRIEL',
    empresa: 'BIO PATRIMONIAL',
    atividade: 'SERVIÇO',
    prioridade: 'B',
    tributacao: 'PRESUMIDO',
    status: {
      'jan/26': 'pending', 'fev/26': 'pending', 'mar/26': 'pending', 'abr/26': 'pending', 'mai/26': 'pending', 'jun/26': 'pending', 'jul/26': 'pending'
    }
  }
];
