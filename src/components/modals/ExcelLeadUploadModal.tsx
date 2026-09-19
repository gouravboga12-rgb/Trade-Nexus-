import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useListDefault } from '../../hooks/useListDefault';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

export const ExcelLeadUploadModal: React.FC = () => {
  const { 
    isExcelUploadModalOpen, 
    setIsExcelUploadModalOpen, 
    teamMembers, 
    importAndAssignLeads,
    triggerToast
  } = useApp();

  const telecallers = teamMembers.filter((m) => m.active !== 0);

  // Selected once the roster loads; the list arrives after first render.
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [fileName, setFileName] = useState('');
  const [pastedData, setPastedData] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [skippedCount, setSkippedCount] = useState<number>(0);

  // Populated only from a file the user picks or rows they paste
  const [parsedLeads, setParsedLeads] = useState<Array<{ name: string; phone: string; company: string; city: string; email: string }>>([]);

  useListDefault(selectedEmployeeId, setSelectedEmployeeId, telecallers, (m) => m.id);

  if (!isExcelUploadModalOpen) return null;

  // Rows are name, phone, company, city, email — separated by comma, tab or pipe.
  const parseRows = (text: string): { validRows: Array<{ name: string; phone: string; company: string; city: string; email: string }>; skipped: number } => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return { validRows: [], skipped: 0 };

    // Drop a header row if the first cell is clearly a column name
    const firstCell = lines[0].split(/[,\t|]/)[0].trim().toLowerCase().replace(/["']/g, '');
    const rows = ['name', 'lead name', 'contact', 'contact name'].includes(firstCell)
      ? lines.slice(1)
      : lines;

    const validRows: Array<{ name: string; phone: string; company: string; city: string; email: string }> = [];
    let skipped = 0;

    for (const line of rows) {
      const cleaned = line.replace(/^"|"$/g, '');
      const parts = cleaned.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)|\t|\|/).map((p) => p.trim().replace(/^"|"$/g, ''));
      const [name, phone, company, city, email] = parts;

      const trimmedName = (name || '').trim();
      const trimmedPhone = (phone || '').trim();

      // Safely reject incomplete rows: a lead must have a valid customer name and phone
      if (!trimmedName || !trimmedPhone) {
        skipped++;
        continue;
      }

      validRows.push({
        name: trimmedName,
        phone: trimmedPhone,
        company: (company || '').trim(),
        city: (city || '').trim(),
        email: (email || '').trim(),
      });
    }

    return { validRows, skipped };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const { validRows, skipped } = parseRows(String(reader.result ?? ''));
      setParsedLeads(validRows);
      setSkippedCount(skipped);
      if (!validRows.length) {
        setParseError(`No valid leads found. Expected format: Name, Phone, Company, City, Email.${skipped > 0 ? ` (${skipped} incomplete rows skipped)` : ''}`);
      } else {
        const skipInfo = skipped > 0 ? ` (${skipped} incomplete rows skipped)` : '';
        triggerToast(`✓ Loaded ${validRows.length} leads${skipInfo} from ${file.name}`);
      }
    };
    reader.onerror = () => setParseError('Could not read that file.');
    reader.readAsText(file);
  };

  const handleParseCustomText = () => {
    if (!pastedData.trim()) return;
    const { validRows, skipped } = parseRows(pastedData);
    setSkippedCount(skipped);
    if (!validRows.length) {
      setParseError(`No valid leads found. Expected format: Name, Phone, Company, City, Email.${skipped > 0 ? ` (${skipped} incomplete rows skipped)` : ''}`);
      return;
    }
    setParsedLeads(validRows);
    setFileName(`Pasted_${validRows.length}_Leads.csv`);
    setPastedData('');
    setParseError(null);
    const skipInfo = skipped > 0 ? ` (${skipped} incomplete rows skipped)` : '';
    triggerToast(`✓ Parsed ${validRows.length} pasted leads${skipInfo}!`);
  };

  const targetEmp = teamMembers.find((m) => m.id === selectedEmployeeId);
  const canAllocate = parsedLeads.length > 0 && !!targetEmp;

  const handleImportAndAllocate = () => {
    if (!canAllocate || !targetEmp) return;
    importAndAssignLeads(fileName || 'Manual_Import.csv', targetEmp.id, targetEmp.name, parsedLeads);
    setParsedLeads([]);
    setFileName('');
    setIsExcelUploadModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-[#0A192F] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-[#00C9A7] border border-teal-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                Import &amp; Allocate Leads
                <span className="text-[10px] bg-teal-500/30 text-teal-300 font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">Excel / CSV</span>
              </h3>
              <p className="text-xs text-slate-400">Assign confidential lead batches directly to any employee</p>
            </div>
          </div>
          <button 
            onClick={() => setIsExcelUploadModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm">
          
          {/* Step 1: Target Telecaller Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#00C9A7]" />
                1. Select Target Employee / Telecaller
              </span>
              <span className="text-[10px] font-normal text-slate-500">Confidential Allocation</span>
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {telecallers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.empCode}) — {m.role} ({m.group || 'Team'})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Only <strong className="text-slate-800">{targetEmp?.name || 'the selected employee'}</strong> will see this allocated batch in their calling queue.
            </p>
          </div>

          {/* Step 2: Upload File or Quick Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
              2. Upload .CSV File or Paste Leads
            </label>

            {/* Drop Zone */}
            <label className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/70 hover:bg-teal-50/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
              <input 
                type="file" 
                accept=".csv,.txt" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-[#00C9A7] transition-colors mb-1.5" />
              <p className="text-xs font-bold text-slate-700 group-hover:text-teal-700">
                Click to browse or drop .csv file
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Supports standard lead columns: Name, Phone, Company, City, Email</p>
            </label>

            {/* Quick Paste Area */}
            <div className="pt-1">
              <textarea
                placeholder="Or paste rows: Name, Phone, Company, City, Email..."
                rows={2}
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {pastedData.trim() && (
                <button
                  type="button"
                  onClick={handleParseCustomText}
                  className="mt-1 px-3 py-1 bg-teal-600 text-white rounded-lg text-[11px] font-bold hover:bg-teal-700 transition-colors"
                >
                  Parse &amp; Add Pasted Leads
                </button>
              )}
            </div>
          </div>

          {/* Parse Error Notification */}
          {parseError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 flex items-start gap-2 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Skipped Rows Notification */}
          {skippedCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 flex items-start gap-2 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Skipped <strong>{skippedCount}</strong> invalid/incomplete row{skippedCount === 1 ? '' : 's'} (missing customer Name or Phone Number). Valid rows preserved below.</span>
            </div>
          )}

          {/* Step 3: Parsed Lead Preview */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                3. Preview Batch ({parsedLeads.length} Leads)
              </span>
              <span className="text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md font-mono">
                {fileName || 'No file selected'}
              </span>
            </div>

            {parsedLeads.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                {parsedLeads.map((lead, idx) => (
                  <div key={idx} className="p-2.5 bg-white flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <strong className="text-slate-800 font-bold block truncate">{lead.name}</strong>
                      <span className="text-[11px] text-slate-500 font-mono">{lead.phone} • {lead.company} ({lead.city})</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Valid
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs">
                No file chosen yet. Click the box above and select your <strong>.csv</strong> file.
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsExcelUploadModalOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImportAndAllocate}
            disabled={!canAllocate}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-[#0A2540] font-black text-xs shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm &amp; Allocate {parsedLeads.length} Leads to {targetEmp?.name || 'Employee'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
