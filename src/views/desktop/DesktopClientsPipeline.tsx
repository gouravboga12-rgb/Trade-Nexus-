import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import { 
  Award, 
  Search, 
  Download, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Filter, 
  Clock, 
  X,
  Layers
} from 'lucide-react';

export const DesktopClientsPipeline: React.FC = () => {
  const { 
    assignedLeads, 
    profile, 
    stats,
    triggerToast 
  } = useApp();

  useScreenData('clientsPipeline');

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Won leads converted by this telecaller
  const myWonLeads = useMemo(() => {
    return assignedLeads.filter((l) => {
      const isMine =
        !l.assignedToEmployeeId ||
        l.assignedToEmployeeId === profile.id ||
        (l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === profile.name.toLowerCase()) ||
        l.assignedToEmployeeId === 'emp-101';
      return isMine && l.status === 'CONVERTED';
    });
  }, [assignedLeads, profile]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter won leads by date & search query
  const filteredWonLeads = useMemo(() => {
    return myWonLeads.filter((lead) => {
      const q = searchQuery.toLowerCase().trim();
      if (q && !lead.phone.includes(q)) {
        return false;
      }

      const leadDateStr = lead.updatedAt ? lead.updatedAt.split('T')[0] : todayStr;

      if (dateFilter === 'TODAY') return leadDateStr === todayStr;
      if (dateFilter === 'YESTERDAY') return leadDateStr === yesterdayStr;
      if (dateFilter === 'THIS_MONTH') {
        const currentMonth = todayStr.slice(0, 7);
        return leadDateStr.startsWith(currentMonth);
      }
      if (dateFilter === 'CUSTOM' && customDate) return leadDateStr === customDate;
      return true;
    });
  }, [myWonLeads, dateFilter, customDate, searchQuery, todayStr, yesterdayStr]);

  // Calculate dynamic revenue for active filter
  const totalSelectedRevenue = useMemo(() => {
    return filteredWonLeads.reduce((sum, lead) => {
      return sum + (lead.dealValue || 0);
    }, 0);
  }, [filteredWonLeads]);

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleExportCsv = () => {
    const header = 'Phone,Deal Value,Closed Date,Status,Dials,Notes';
    const rows = filteredWonLeads.map((l) =>
      `"${l.phone}",${l.dealValue || 0},"${l.updatedAt ? l.updatedAt.split('T')[0] : 'Today'}","Won Deal",${l.callCount || 0},"${(l.notes || '').replace(/"/g, '""')}"`
    );
    const csv = `data:text/csv;charset=utf-8,${header}\n${rows.join('\n')}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Won_Deals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ Won Deals exported to CSV');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Desktop Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
              Won Deals &amp; Revenue Hub
            </h2>
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Verified conversions register · Track daily earnings and closed deal values
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Won Deals CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Desktop Widescreen FinTech Hero (2 Columns: Revenue + Calendar Filter) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Luxury Light FinTech Total Revenue Card */}
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-6 rounded-3xl border border-emerald-200/90 shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-300/20 via-teal-200/15 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-6 h-6 stroke-[2.3]" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-800 font-black block">
                  Total Verified Revenue
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {dateFilter === 'ALL' && 'All-Time Cumulative Conversions'}
                  {dateFilter === 'TODAY' && 'Earned Today'}
                  {dateFilter === 'YESTERDAY' && 'Earned Yesterday'}
                  {dateFilter === 'THIS_MONTH' && 'This Month Revenue'}
                  {dateFilter === 'CUSTOM' && `Date: ${customDate}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-3 relative z-10 pt-2">
            <span className="font-display font-black text-5xl text-[#0A2540] tracking-tight">
              {inr(dateFilter === 'ALL' ? (totalSelectedRevenue || stats.monthlySalesAchieved) : totalSelectedRevenue)}
            </span>
          </div>
        </div>

        {/* Right 1 Col: Integrated Calendar & Date Filter Panel */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span>Filter by Period</span>
            </span>
            {dateFilter !== 'ALL' && (
              <button
                onClick={() => { setDateFilter('ALL'); setCustomDate(''); }}
                className="text-xs text-emerald-600 hover:underline font-bold cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Quick Date Pills */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_MONTH', label: 'This Month' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setDateFilter(tab.id as any);
                  setCustomDate('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  dateFilter === tab.id
                    ? 'bg-[#0A2540] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Picker Input */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0 pointer-events-none" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                if (e.target.value) setDateFilter('CUSTOM');
                else setDateFilter('ALL');
              }}
              className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
            />
            {customDate && (
              <button
                onClick={() => { setCustomDate(''); setDateFilter('ALL'); }}
                className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by phone number..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs font-mono font-bold text-slate-500">
          Showing {filteredWonLeads.length} won deals
        </span>
      </div>

      {/* 4. Desktop Rich Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Client Phone</th>
                <th className="py-3.5 px-6">Deal Revenue</th>
                <th className="py-3.5 px-6">Closed Date</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Dials</th>
                <th className="py-3.5 px-6">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredWonLeads.length > 0 ? (
                filteredWonLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-black text-sm text-[#0A2540]">
                      {lead.phone}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+{inr(lead.dealValue || 0)}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.updatedAt ? lead.updatedAt.split('T')[0] : 'Today'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Deal Closed
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">
                      {lead.callCount || 0}
                    </td>
                    <td className="py-4 px-6 text-slate-500 italic max-w-xs truncate">
                      {lead.notes && 
                       !lead.notes.toLowerCase().includes('test suite') && 
                       !lead.notes.toLowerCase().includes('automated_test')
                        ? `"${lead.notes}"`
                        : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-slate-700">No won deals for this date</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery ? 'No deals match your search.' : 'Deals closed on this date will appear here.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
