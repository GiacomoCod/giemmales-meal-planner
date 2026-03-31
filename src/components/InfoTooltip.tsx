import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import './InfoTooltip.css';

interface InfoTooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ text, position = 'bottom' }: InfoTooltipProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleIconClick = (e: React.MouseEvent) => {
    // If screen is mobile-like, open modal
    if (window.innerWidth <= 768) {
      e.stopPropagation();
      setIsModalOpen(true);
    }
  };

  return (
    <div className="info-tooltip-wrapper">
      <div className="info-icon-container" onClick={handleIconClick}>
        <Info size={18} className="info-icon" />
      </div>
      
      {!isModalOpen && (
        <div className={`info-tooltip pos-${position}`}>
          {text}
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="info-mobile-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="info-mobile-modal" onClick={(e) => e.stopPropagation()}>
            {/* Background Glows for Premium Look */}
            <div className="info-modal-glow-1"></div>
            <div className="info-modal-glow-2"></div>

            <button className="info-mobile-close" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <div className="info-mobile-header">
              <div className="info-icon-3d-wrapper">
                <Info size={32} className="info-modal-icon" />
              </div>
              <h3>Informazioni</h3>
            </div>
            <div className="info-mobile-body">
              {text}
            </div>
            <button className="info-mobile-ok" onClick={() => setIsModalOpen(false)}>
              Ho capito
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
