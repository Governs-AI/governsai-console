'use client';

import { Decision, isValidDecision } from '@/lib/types';

interface DecisionBadgeProps {
  decision: Decision | string;
  reasons?: string[];
  className?: string;
}

const decisionStyles: Record<Decision, { bg: string; text: string; icon: string }> = {
  allow: {
    bg: 'bg-green-100 border-green-200',
    text: 'text-green-800',
    icon: '✓',
  },
  redact: {
    bg: 'bg-yellow-100 border-yellow-200',
    text: 'text-yellow-800',
    icon: '✂',
  },
  confirm: {
    bg: 'bg-yellow-100 border-yellow-200',
    text: 'text-yellow-800',
    icon: '⏸️',
  },
  block: {
    bg: 'bg-red-100 border-red-300',
    text: 'text-red-900',
    icon: '🚫',
  },
};

export default function DecisionBadge({ decision, reasons, className = '' }: DecisionBadgeProps) {
  // Don't render if decision is not provided
  if (!decision) {
    return null;
  }
  
  // Get style with fallback for unknown decision types
  let style;
  if (isValidDecision(decision)) {
    style = decisionStyles[decision];
  } else {
    // Fallback for unknown decision types
    style = {
      bg: 'bg-gray-100 border-gray-200',
      text: 'text-gray-800',
      icon: '?',
    };
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${style.bg} ${style.text} ${className}`}>
      <span className="text-xs">{style.icon}</span>
      <span className="capitalize">{decision}</span>
      {reasons && reasons.length > 0 && (
        <span 
          className="cursor-help border-l border-current pl-1.5 ml-1" 
          title={reasons.join(', ')}
        >
          info
        </span>
      )}
    </div>
  );
}
