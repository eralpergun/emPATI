
import React from 'react';
import { AlertCircle, X, Check } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: <AlertCircle className="text-red-500" size={32} />,
      button: "bg-red-500 hover:bg-red-600 shadow-red-100",
      bg: "bg-red-50"
    },
    warning: {
      icon: <AlertCircle className="text-orange-500" size={32} />,
      button: "bg-orange-500 hover:bg-orange-600 shadow-orange-100",
      bg: "bg-orange-50"
    },
    info: {
      icon: <AlertCircle className="text-blue-500" size={32} />,
      button: "bg-blue-500 hover:bg-blue-600 shadow-blue-100",
      bg: "bg-blue-50"
    },
    success: {
      icon: <Check className="text-green-500" size={32} />,
      button: "bg-green-500 hover:bg-green-600 shadow-green-100",
      bg: "bg-green-50"
    }
  };

  const style = typeStyles[type];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center space-y-6">
          <div className={`w-20 h-20 ${style.bg} rounded-[2rem] flex items-center justify-center mx-auto mb-2`}>
            {style.icon}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              {message}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              onClick={onConfirm}
              className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 ${style.button}`}
            >
              {confirmText}
            </button>
            {cancelText && onCancel && (
              <button
                onClick={onCancel}
                className="w-full py-4 rounded-2xl bg-slate-100 text-slate-500 font-bold uppercase tracking-widest text-sm hover:bg-slate-200 transition-all active:scale-95"
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
