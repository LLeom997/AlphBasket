
import React from 'react';
import { X, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  currentConfig: any;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center text-slate-500 text-sm">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green">
              <Check size={24} />
            </div>
          </div>
          <p>Demo Mode is active.</p>
          <p className="mt-1">No configuration required.</p>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-brand-teal hover:opacity-90 text-white shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
