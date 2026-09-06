import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ title = "An error occurred", message, onRetry }) {
  return (
    <div className="flex-center flex-column p-12 bg-red-500/5 rounded-xl border border-dashed border-red-500/20 text-center">
      <div className="bg-red-500/20 p-4 rounded-full text-red-400 mb-4">
        <AlertTriangle size={48} />
      </div>
      <h3 className="text-xl font-bold mb-2 text-red-400">{title}</h3>
      {message && <p className="text-muted mb-6 max-w-md">{message}</p>}
      {onRetry && <Button onClick={onRetry} variant="danger">Retry</Button>}
    </div>
  );
}
