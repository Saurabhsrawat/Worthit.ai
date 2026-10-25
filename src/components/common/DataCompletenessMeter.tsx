import React from 'react';

interface DataCompletenessMeterProps {
  score: number; // 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DataCompletenessMeter: React.FC<DataCompletenessMeterProps> = ({
  score,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const normalized = Math.min(100, Math.max(0, score));

  const getColor = () => {
    if (normalized >= 75) return 'bg-emerald-500';
    if (normalized >= 50) return 'bg-blue-500';
    if (normalized >= 30) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  const getHeight = () => {
    if (size === 'sm') return 'h-1.5';
    if (size === 'lg') return 'h-3';
    return 'h-2';
  };

  const getStatusText = () => {
    if (normalized >= 80) return 'High Coverage';
    if (normalized >= 50) return 'Moderate Coverage';
    if (normalized >= 30) return 'Partial Coverage';
    return 'Sparse Evidence';
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Data Completeness</span>
          <span className="font-mono tabular-nums font-semibold text-slate-800">
            {normalized}% · <span className="text-slate-500 font-normal">{getStatusText()}</span>
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${getHeight()}`}>
        <div
          className={`${getColor()} ${getHeight()} rounded-full transition-all duration-300`}
          style={{ width: `${normalized}%` }}
          role="progressbar"
          aria-valuenow={normalized}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};
