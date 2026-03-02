import React from 'react';
import { Status } from '../types';

interface StatusIndicatorProps {
  status: Status;
  onClick?: () => void;
}

export function StatusIndicator({ status, onClick }: StatusIndicatorProps) {
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500 hover:bg-emerald-600';
      case 'pending':
        return 'bg-amber-400 hover:bg-amber-500';
      case 'delayed':
        return 'bg-red-500 hover:bg-red-600';
      case 'not_started':
      default:
        return 'bg-gray-200 hover:bg-gray-300';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-6 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${getStatusColor(status)}`}
      title={status === 'not_started' ? 'Não iniciado' : status === 'completed' ? 'Concluído' : status === 'pending' ? 'Pendente' : 'Atrasado'}
    />
  );
}
