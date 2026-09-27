import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { TeamGroup } from '../../types';

interface DeleteTeamModalProps {
  isOpen: boolean;
  team: TeamGroup | null;
  onClose: () => void;
}

export const DeleteTeamModal: React.FC<DeleteTeamModalProps> = ({ isOpen, team, onClose }) => {
  const { teamMembers, deleteTeamGroup } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !team) return null;

  const memberCount = teamMembers.filter((m) => m.group === team.name).length;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTeamGroup(team.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="font-display font-black text-lg text-[#0A2540]">
            Delete Team Squad?
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Are you sure you want to permanently delete <strong className="text-slate-800">{team.name}</strong>?
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-amber-800">
            <span>⚠️ Safety Notice:</span>
          </p>
          <p className="text-[11px] leading-relaxed text-amber-800">
            All <strong className="underline">{memberCount} employee members</strong> currently assigned to this squad will be safely moved to the <strong>Unassigned</strong> pool. No employee accounts or sales logs will be deleted.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
