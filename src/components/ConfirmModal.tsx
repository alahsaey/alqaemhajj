import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0B1221] border border-amber-500/30 text-white rounded-3xl p-8 max-w-md w-full space-y-6 text-right shadow-2xl">
        <div className="w-14 h-14 bg-red-500/15 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30 shadow-md">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-white">{title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-5 py-3 bg-[#070C18] hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-xl text-sm transition"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-sm transition shadow-lg shadow-red-600/30"
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
};
