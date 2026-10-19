import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Undo2, 
  Trash2, 
  X, 
  RotateCcw,
  Users,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadBatch } from '../../types';
import { 
  getTodayDateIST, 
  getISTDateObject, 
  getDateRangeIST 
} from '../../utils/dateUtils';

type DateFilterMode = 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7' | 'THIS_MONTH' | 'CUSTOM';

interface RecentLeadUploadsLedgerProps {
  compact?: boolean;
}

const PREVIEW_LIMIT = 7;

/**
 * Safely extracts a YYYY-MM-DD date string in IST from a LeadBatch record.
 */
function extractBatchDate(batch: LeadBatch): string {
  // 1. Try createdAt (ISO or SQLite format)
  if (batch.createdAt) {
    if (/^\d{4}-\d{2}-\d{2}/.test(batch.createdAt)) {
      return batch.createdAt.slice(0, 10);
    }
    const d = new Date(batch.createdAt.includes('T') ? batch.createdAt : batch.createdAt.replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) {
      return getTodayDateIST(d);
    }
  }

  // 2. Try uploadedAt string
  if (batch.uploadedAt) {
    const lower = batch.uploadedAt.toLowerCase();
    if (lower.includes('today') || lower.includes('just now')) {
      return getTodayDateIST();
    }
    if (lower.includes('yesterday')) {
      const ist = getISTDateObject();
      ist.setDate(ist.getDate() - 1);
      return getTodayDateIST(ist);
    }

    const isoMatch = batch.uploadedAt.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const ddmmyyyy = batch.uploadedAt.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const d = ddmmyyyy[1].padStart(2, '0');
      const m = ddmmyyyy[2].padStart(2, '0');
      const y = ddmmyyyy[3];
      return `${y}-${m}-${d}`;
    }

    const parsed = new Date(batch.uploadedAt);
    if (!isNaN(parsed.getTime())) {
      return getTodayDateIST(parsed);
    }
  }

  return getTodayDateIST();
}

export const RecentLeadUploadsLedger: React.FC<RecentLeadUploadsLedgerProps> = ({ compact = false }) => {
  const { leadBatches, deleteLeadBatch } = useApp();

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Compute active date boundaries
  const dateRange = useMemo(() => {
    return getDateRangeIST(dateFilterMode, customStart, customEnd);
  }, [dateFilterMode, customStart, customEnd]);

  // Filtered batch list
  const filteredBatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return leadBatches.filter((b) => {
      // 1. Text Search Filter
      if (q) {
        const matchesFile = b.fileName && b.fileName.toLowerCase().includes(q);
        const matchesEmployee = b.assignedToEmployeeName && b.assignedToEmployeeName.toLowerCase().includes(q);
        const matchesId = b.id && b.id.toLowerCase().includes(q);
        if (!matchesFile && !matchesEmployee && !matchesId) {
          return false;
        }
      }

      // 2. Date Filter
      if (dateFilterMode !== 'ALL') {
        const batchDate = extractBatchDate(b);
        if (batchDate < dateRange.start || batchDate > dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }, [leadBatches, searchQuery, dateFilterMode, dateRange]);

  // Sliced batches: preview first 7 or all if expanded
  const visibleBatches = useMemo(() => {
    if (isExpanded) return filteredBatches;
    return filteredBatches.slice(0, PREVIEW_LIMIT);
  }, [filteredBatches, isExpanded]);

  const hasMoreThanLimit = filteredBatches.length > PREVIEW_LIMIT;
  const isFilterActive = searchQuery.trim() !== '' || dateFilterMode !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setDateFilterMode('ALL');
    setCustomStart('');
    setCustomEnd('');
  };

  return (
    <div className="nexus-card bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden transition-all">
      {/* Header */}
      <div className={`border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 ${compact ? 'px-4 py-3' : 'px-5 py-3.5'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-sm md:text-base text-[#0A2540]">
                Recent uploads
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700">
                {filteredBatches.length} {filteredBatches.length === 1 ? 'batch' : 'batches'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Rollback batch to pool or delete batch
            </p>
          </div>
        </div>

        {/* Filter Toggle & Quick Counts */}
        <div className="flex items-center gap-2">
          {isFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
              title="Reset all search and date filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
              showFilters || isFilterActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Filter</span>
            {isFilterActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white"></span>
            )}
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar (Collapsible / Toggleable or Persistent on active) */}
      {(showFilters || isFilterActive) && (
        <div className="bg-slate-50/70 border-b border-slate-100 px-4 md:px-5 py-3 space-y-2.5 transition-all">
          <div className="flex flex-col md:flex-row md:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file name or assigned employee..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Preset Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs font-bold scrollbar-none">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'YESTERDAY', label: 'Yesterday' },
                  { id: 'LAST_7', label: 'Last 7 Days' },
                  { id: 'THIS_MONTH', label: 'This Month' },
                  { id: 'CUSTOM', label: 'Custom' },
                ] as const
              ).map((preset) => {
                const isActive = dateFilterMode === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDateFilterMode(preset.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#0A2540] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {dateFilterMode === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
              <span className="text-[11px] font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              <span className="text-[11px] font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
          )}
        </div>
      )}

      {/* Content / Batch Rows */}
      {!leadBatches.length ? (
        <div className="p-8 text-center text-xs text-slate-400 font-semibold">
          No lead files uploaded yet.
        </div>
      ) : !filteredBatches.length ? (
        <div className="p-8 text-center space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            No uploads match your selected search or date criteria.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {visibleBatches.map((b) => (
            <div
              key={b.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                compact ? 'p-3' : 'px-5 py-3'
              }`}
            >
              {/* Batch Info */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0A2540] truncate max-w-md block" title={b.fileName}>
                    {b.fileName}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    {b.totalLeads} leads
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span>{b.assignedToEmployeeName}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{b.uploadedAt}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Return uncalled leads from batch "${b.fileName}" back to the Unassigned Pool? (Won deals remain preserved)`)) {
                      await deleteLeadBatch(b.id, 'unassign_leads');
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl active:scale-95 transition-all"
                  title="Reclaim uncontacted leads back into Unassigned Pool"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Return to Pool</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Permanently delete batch "${b.fileName}" and remove all its uncontacted leads? (Won deals remain preserved)`)) {
                      await deleteLeadBatch(b.id, 'delete_leads');
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl active:scale-95 transition-all"
                  title="Permanently delete batch and uncontacted leads"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Batch</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer: View More / Show Less Toggle */}
      {hasMoreThanLimit && (
        <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-slate-500">
            {isExpanded
              ? `Showing all ${filteredBatches.length} uploads`
              : `Showing 7 of ${filteredBatches.length} uploads`}
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-black text-[#0A2540] bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                <span>View More (+{filteredBatches.length - PREVIEW_LIMIT} more)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
