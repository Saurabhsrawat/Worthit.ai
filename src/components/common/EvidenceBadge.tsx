import React from 'react';
import { EvidenceType } from '../../types';
import { CheckCircle2, HelpCircle, AlertTriangle, UserCheck, Sparkles, ExternalLink } from 'lucide-react';

interface EvidenceBadgeProps {
  type: EvidenceType;
  source?: string;
  sourceUrl?: string;
  date?: string;
  notes?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  type,
  source,
  sourceUrl,
  date,
  notes,
  size = 'sm',
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'verified':
        return {
          label: 'Verified Fact',
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-600',
        };
      case 'estimate':
        return {
          label: 'Estimate / Assumption',
          icon: AlertTriangle,
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-600',
        };
      case 'user-provided':
        return {
          label: 'User-provided',
          icon: UserCheck,
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-600',
        };
      case 'ai-interpretation':
        return {
          label: 'AI Interpretation',
          icon: Sparkles,
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-600',
        };
      case 'unknown':
      default:
        return {
          label: 'Unknown / Not Verified',
          icon: HelpCircle,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium tracking-tight whitespace-nowrap ${config.bg} ${className}`}
      title={source ? `Source: ${source}${date ? ` (${date})` : ''}` : config.label}
    >
      <Icon className={isSm ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} aria-hidden="true" />
      <span>{config.label}</span>

      {source && (
        <span className="text-[11px] opacity-85 ml-0.5 truncate max-w-[120px] sm:max-w-xs">
          · {source}
          {date && ` (${date})`}
        </span>
      )}

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-0.5 hover:underline inline-flex items-center"
          aria-label={`Source reference: ${source || 'Link'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
        </a>
      )}
    </span>
  );
};
