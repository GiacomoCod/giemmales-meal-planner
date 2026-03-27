import { Info } from 'lucide-react';
import './InfoTooltip.css';

interface InfoTooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ text, position = 'bottom' }: InfoTooltipProps) {
  return (
    <div className="info-tooltip-wrapper">
      <Info size={18} className="info-icon" />
      <div className={`info-tooltip pos-${position}`}>
        {text}
      </div>
    </div>
  );
}
