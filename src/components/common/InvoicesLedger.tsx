import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getTodayDateIST } from '../../utils/dateUtils';
import { 
  Receipt, 
  Plus, 
  Search, 
  Calendar, 
  Send, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Download, 
  DollarSign, 
  Building2, 
  Mail, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { InvoiceData } from '../../types';

interface InvoicesLedgerProps {
  panelTitle?: string;
  panelSubtitle?: string;
}

export const InvoicesLedger: React.FC<InvoicesLedgerProps> = ({
  panelTitle = 'Commercial Invoices & Billing Ledger',
  panelSubtitle = 'Generate official tax invoices, dispatch to customer email, and audit billing history'
}) => {
  const {
    invoices,
    openGenerateInvoiceModal,
    setSelectedInvoice,
    setIsInvoiceModalOpen,
    resendInvoiceEmail,
    triggerToast,
  } = useApp();

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState(getTodayDateIST());
  const [customEndDate, setCustomEndDate] = useState(getTodayDateIST());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'PAID' | 'DRAFT'>('ALL');
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  const todayStr = getTodayDateIST();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => {
      // Parse invoice date
      const d = inv.createdAt ? new Date(inv.createdAt) : inv.date ? new Date(inv.date) : null;
      const invDateStr = d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : (inv.date || '');

      // Date timeframe match
      let dateMatches = true;
      if (dateFilter === 'TODAY') {
        dateMatches = invDateStr.startsWith(todayStr);
      } else if (dateFilter === 'YESTERDAY') {
        dateMatches = invDateStr.startsWith(yesterday);
      } else if (dateFilter === 'THIS_WEEK') {
        dateMatches = d ? d >= sevenDaysAgo : true;
      } else if (dateFilter === 'THIS_MONTH') {
        dateMatches = d ? d >= startOfMonth : true;
      } else if (dateFilter === 'CUSTOM') {
        dateMatches = invDateStr >= customStartDate && invDateStr <= customEndDate;
      }

      if (!dateMatches) return false;

      // Status filter
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = 
          (inv.invoiceNumber || '').toLowerCase().includes(q) ||
          (inv.clientName || '').toLowerCase().includes(q) ||
          (inv.clientCompany || '').toLowerCase().includes(q) ||
          (inv.clientEmail || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [invoices, dateFilter, customStartDate, customEndDate, statusFilter, searchQuery, todayStr, yesterday]);

  const totalBilled = filteredInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  const totalPaid = filteredInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  const totalPending = totalBilled - totalPaid;

  const handlePreviewInvoice = (inv: InvoiceData) => {
    setSelectedInvoice(inv);
    setIsInvoiceModalOpen(true);
  };

  const handleResendEmail = async (inv: InvoiceData) => {
    if (!inv.clientEmail) {
      triggerToast('⚠️ Invoice does not have a customer email on record');
      return;
    }
    setSendingInvoiceId(inv.id);
    try {
      await resendInvoiceEmail(inv.id);
      triggerToast(`✓ Invoice #${inv.invoiceNumber} emailed to ${inv.clientEmail}`);
    } catch {
      triggerToast(`✗ Failed to dispatch email for #${inv.invoiceNumber}`);
    } finally {
      setSendingInvoiceId(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#00A88B]" />
            <span>{panelTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{panelSubtitle}</p>
        </div>

        <button
          onClick={openGenerateInvoiceModal}
          className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs px-4 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 active:scale-95 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Commercial Invoice</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Invoices</span>
          <span className="font-mono-nums font-black text-xl text-[#0A2540] block mt-0.5">
            {filteredInvoices.length}
          </span>
          <span className="text-[9px] text-slate-400">In selected timeframe</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
          <span className="font-mono-nums font-black text-xl text-[#00A88B] block mt-0.5">
            ₹{totalBilled.toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-slate-400">Gross invoiced amount</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Settled / Paid</span>
          <span className="font-mono-nums font-black text-xl text-emerald-600 block mt-0.5">
            ₹{totalPaid.toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-slate-400">Received payments</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Due</span>
          <span className="font-mono-nums font-black text-xl text-amber-600 block mt-0.5">
            ₹{totalPending.toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-slate-400">Pending settlement</span>
        </div>
      </div>

      {/* Filter Toolbar (Day-Wise & Search) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Day-Wise Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            {(['ALL', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-tight whitespace-nowrap transition-all ${
                  dateFilter === filter
                    ? 'bg-white text-[#0A2540] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {filter === 'ALL' ? 'All Time' :
                 filter === 'TODAY' ? 'Today' :
                 filter === 'YESTERDAY' ? 'Yesterday' :
                 filter === 'THIS_WEEK' ? 'This Week' :
                 filter === 'THIS_MONTH' ? 'This Month' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer name, email, company..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0A2540] placeholder-slate-400 focus:outline-none focus:border-[#00C9A7]"
            />
          </div>
        </div>

        {/* Custom Date Pickers */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        )}
      </div>

      {/* Invoices List / Table */}
      {!filteredInvoices.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">No invoices found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No commercial invoices match the selected date range or filter. Create one to automatically send it to your customer's email.
          </p>
          <button
            onClick={openGenerateInvoiceModal}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-[#00A88B] hover:bg-teal-100 rounded-xl text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Invoice</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm text-[#0A2540]">
                      #{inv.invoiceNumber}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      • {inv.date || 'Today'}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : inv.status === 'OVERDUE'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {inv.status || 'PENDING'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700">
                    <strong className="text-slate-900">{inv.clientName}</strong>
                    {inv.clientCompany && <span className="text-slate-500"> ({inv.clientCompany})</span>}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {inv.clientEmail && (
                      <span className="flex items-center gap-1 text-slate-600 font-mono">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {inv.clientEmail}
                      </span>
                    )}
                    {inv.clientPhone && (
                      <span className="text-slate-400 font-mono">
                        {inv.clientPhone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right flex-shrink-0">
                  <span className="font-mono-nums font-black text-xl text-[#00A88B] block leading-tight">
                    ₹{(inv.grandTotal || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Sub: ₹{(inv.subTotal || 0).toLocaleString('en-IN')} · Tax: ₹{(inv.tax || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Items Summary Pill */}
              {inv.items && inv.items.length > 0 && (
                <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Billed Line Items ({inv.items.length})
                  </span>
                  <div className="space-y-0.5">
                    {inv.items.slice(0, 2).map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="truncate pr-2">• {it.description} (x{it.quantity})</span>
                        <span className="font-mono font-bold text-slate-700">₹{(it.total || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {inv.items.length > 2 && (
                      <span className="text-[10px] text-slate-400 italic block">
                        +{inv.items.length - 2} more item(s)...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => handlePreviewInvoice(inv)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview / Print</span>
                </button>

                <button
                  disabled={sendingInvoiceId === inv.id}
                  onClick={() => handleResendEmail(inv)}
                  className="px-3 py-1.5 bg-[#00C9A7]/10 hover:bg-[#00C9A7]/20 text-[#00A88B] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {sendingInvoiceId === inv.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{sendingInvoiceId === inv.id ? 'Sending Email...' : 'Resend Email'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
