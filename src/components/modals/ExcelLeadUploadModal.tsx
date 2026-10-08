import React, { useState } from 'react';
import * as XLSX from 'xlsx';
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
import { isTelecallerOrCallingEmployee } from '../../utils/teamUtils';

// Helper to check if a string contains a valid phone number (at least 7 digits, max 16)
const isLikelyPhone = (val: string): boolean => {
  if (!val) return false;
  const digits = val.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 16;
};

export const ExcelLeadUploadModal: React.FC = () => {
  const { 
    isExcelUploadModalOpen, 
    setIsExcelUploadModalOpen, 
    teamMembers, 
    importAndAssignLeads,
    triggerToast
  } = useApp();

  const telecallers = teamMembers.filter(isTelecallerOrCallingEmployee);

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

  // Supports both:
  // 1. Phone number only (1 column) -> auto-generates "Lead (+91 98765 43210)"
  // 2. Name + Phone + Company + City + Email (multi-column)
  const parseRows = (text: string): { validRows: Array<{ name: string; phone: string; company: string; city: string; email: string }>; skipped: number } => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return { validRows: [], skipped: 0 };

    // Drop a header row if the first cell is clearly a column name
    const firstCell = lines[0].split(/[,\t|]/)[0].trim().toLowerCase().replace(/["']/g, '');
    const headerKeywords = [
      'name', 'lead name', 'contact', 'contact name', 'customer', 'customer name',
      'phone', 'phone number', 'phonenumber', 'mobile', 'mobile number', 'number', 'mob', 'telephone'
    ];
    const isHeader = headerKeywords.some((h) => firstCell === h || firstCell.startsWith(h));
    const rows = isHeader ? lines.slice(1) : lines;

    const validRows: Array<{ name: string; phone: string; company: string; city: string; email: string }> = [];
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const line = rows[i];
      const cleaned = line.replace(/^"|"$/g, '');
      const parts = cleaned.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)|\t|\|/).map((p) => p.trim().replace(/^"|"$/g, ''));
      const nonEmpties = parts.filter(Boolean);

      if (!nonEmpties.length) continue;

      let name = '';
      let phone = '';
      let company = '';
      let city = '';
      let email = '';

      // Case A: Single Column — Phone Number Only
      if (nonEmpties.length === 1) {
        const val = nonEmpties[0];
        if (isLikelyPhone(val)) {
          phone = val;
          name = `Lead ${val}`;
          company = 'Private Client';
          city = 'Pan-India';
        } else {
          skipped++;
          continue;
        }
      } else {
        // Case B: Multi-Column
        const col0 = parts[0] || '';
        const col1 = parts[1] || '';

        if (isLikelyPhone(col1)) {
          // Standard: Col 0 is Name, Col 1 is Phone
          name = col0 || `Lead ${col1}`;
          phone = col1;
          company = parts[2] || 'Private Client';
          city = parts[3] || 'Pan-India';
          email = parts[4] || '';
        } else if (isLikelyPhone(col0)) {
          // Inverted: Col 0 is Phone, Col 1 is Name
          phone = col0;
          name = col1 || `Lead ${col0}`;
          company = parts[2] || 'Private Client';
          city = parts[3] || 'Pan-India';
          email = parts[4] || '';
        } else {
          // Search any column for phone digits
          const phoneIdx = parts.findIndex((p) => isLikelyPhone(p));
          if (phoneIdx !== -1) {
            phone = parts[phoneIdx];
            name = parts[0] || `Lead ${phone}`;
            company = parts[1] === phone ? (parts[2] || 'Private Client') : (parts[1] || 'Private Client');
            city = parts[3] || 'Pan-India';
            email = parts[4] || '';
          } else {
            skipped++;
            continue;
          }
        }
      }

      const trimmedPhone = phone.trim();
      if (!trimmedPhone) {
        skipped++;
        continue;
      }

      validRows.push({
        name: name.trim() || `Lead ${trimmedPhone}`,
        phone: trimmedPhone,
        company: company.trim() || 'Private Client',
        city: city.trim() || 'Pan-India',
        email: email.trim() || '',
      });
    }

    return { validRows, skipped };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);

    const isBinaryExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isBinaryExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const csvText = XLSX.utils.sheet_to_csv(sheet);
          const { validRows, skipped } = parseRows(csvText);
          setParsedLeads(validRows);
          setSkippedCount(skipped);
          if (!validRows.length) {
            setParseError(`No valid leads found in Excel file.${skipped > 0 ? ` (${skipped} invalid rows skipped)` : ''}`);
          } else {
            const skipInfo = skipped > 0 ? ` (${skipped} invalid rows skipped)` : '';
            triggerToast(`✓ Loaded ${validRows.length} leads${skipInfo} from ${file.name}`);
          }
        } catch (err: any) {
          setParseError(`Could not read Excel file: ${err?.message || 'Invalid format'}`);
        }
      };
      reader.onerror = () => setParseError('Could not read that file.');
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const { validRows, skipped } = parseRows(String(reader.result ?? ''));
        setParsedLeads(validRows);
        setSkippedCount(skipped);
        if (!validRows.length) {
          setParseError(`No valid leads found. Supported: Phone numbers only, or Name & Phone.${skipped > 0 ? ` (${skipped} invalid rows skipped)` : ''}`);
        } else {
          const skipInfo = skipped > 0 ? ` (${skipped} invalid rows skipped)` : '';
          triggerToast(`✓ Loaded ${validRows.length} leads${skipInfo} from ${file.name}`);
        }
      };
      reader.onerror = () => setParseError('Could not read that file.');
      reader.readAsText(file);
    }
  };

  const handleParseCustomText = () => {
    if (!pastedData.trim()) return;
    const { validRows, skipped } = parseRows(pastedData);
    setSkippedCount(skipped);
    if (!validRows.length) {
      setParseError(`No valid leads found. Supported: Phone numbers only, or Name & Phone.${skipped > 0 ? ` (${skipped} invalid rows skipped)` : ''}`);
      return;
    }
    setParsedLeads(validRows);
    setFileName(`Pasted_${validRows.length}_Leads.csv`);
    setPastedData('');
    setParseError(null);
    const skipInfo = skipped > 0 ? ` (${skipped} invalid rows skipped)` : '';
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
              {telecallers.length === 0 ? (
                <option value="">No active calling executives found</option>
              ) : (
                telecallers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.empCode}) — {m.role} ({m.group || 'Team'})
                  </option>
                ))
              )}
            </select>
            <p className="text-[11px] text-slate-500">
              Only <strong className="text-slate-800">{targetEmp?.name || 'the selected employee'}</strong> will see this allocated batch in their calling queue.
            </p>
          </div>

          {/* Step 2: Upload File or Quick Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
              2. Upload Excel (.xlsx) / CSV File or Paste Numbers
            </label>

            {/* Drop Zone */}
            <label className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/70 hover:bg-teal-50/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv,.txt" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-[#00C9A7] transition-colors mb-1.5" />
              <p className="text-xs font-bold text-slate-700 group-hover:text-teal-700">
                Click to browse or drop .xlsx or .csv file
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Supports: Phone numbers only, or Name &amp; Phone, Company, City, Email</p>
            </label>

            {/* Quick Paste Area */}
            <div className="pt-1">
              <textarea
                placeholder="Or paste rows: Phone numbers only (one per line) or Name, Phone..."
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
              <span>Skipped <strong>{skippedCount}</strong> row{skippedCount === 1 ? '' : 's'} without valid phone numbers. Valid rows preserved below.</span>
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
