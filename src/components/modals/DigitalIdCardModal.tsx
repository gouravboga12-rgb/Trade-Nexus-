import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Download, 
  Printer, 
  Upload, 
  Building2, 
  Phone, 
  Mail, 
  QrCode, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  MapPin,
  Globe
} from 'lucide-react';
import { TeamMember } from '../../types';

export const DigitalIdCardModal: React.FC = () => {
  const { 
    isIdCardModalOpen, 
    setIsIdCardModalOpen, 
    profile, 
    teamMembers, 
    triggerToast,
    selectedIdCardEmpId 
  } = useApp();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(selectedIdCardEmpId || profile.id || 'emp-101');
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'template'>('card');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedIdCardEmpId) {
      setSelectedEmpId(selectedIdCardEmpId);
      setCustomPhotoUrl(null);
    }
  }, [selectedIdCardEmpId, isIdCardModalOpen]);

  if (!isIdCardModalOpen) return null;

  // Selected Employee or current user profile
  const matchedEmp = teamMembers.find(m => m.id === selectedEmpId);
  const empName = matchedEmp?.name || profile.name || 'Employee';
  const empRole = (matchedEmp?.role || profile.roleTitle || 'Sales Executive').toUpperCase();
  const empCode = matchedEmp?.empCode || profile.empCode || '—';
  const bloodGroup = (matchedEmp as any)?.bloodGroup || profile.bloodGroup || '—';
  const dob = (matchedEmp as any)?.dob || '—';
  const cellNumber = matchedEmp?.phone || profile.phone || '—';
  const initials = empName.trim() ? empName.trim().split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EM';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setCustomPhotoUrl(uploadEvent.target?.result as string);
        triggerToast(`✓ Photo updated for ${empName}'s ID card`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
    triggerToast('✓ Opening print dialogue for ID Card...');
  };

  const handleDownload = () => {
    triggerToast(`✓ Official Digital ID Card for ${empName} ready to print/save`);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="bg-[#0A192F] px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7] animate-pulse" />
            <h3 className="font-display font-bold text-sm text-white">Official Identity Card Studio</h3>
          </div>

          <button 
            onClick={() => setIsIdCardModalOpen(false)}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Employee Switcher & Photo Upload Controls */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex-1">
            <select
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setCustomPhotoUrl(null);
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-[#0A2540] text-xs focus:outline-none focus:border-[#00C9A7]"
            >
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.empCode} • {m.group || 'Sales'})</option>
              ))}
            </select>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
            accept="image/*" 
            className="hidden" 
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#00C9A7] text-slate-700 font-bold flex items-center gap-1.5 shadow-2xs transition-all flex-shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-[#00A88B]" />
            <span>Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode(prev => prev === 'card' ? 'template' : 'card')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
              viewMode === 'template'
                ? 'bg-[#00C9A7] text-[#0A2540] border-[#00C9A7]'
                : 'bg-white border-slate-300 text-slate-700 hover:border-[#00C9A7]'
            }`}
          >
            <span>{viewMode === 'template' ? 'Dynamic Badge' : 'Official Template'}</span>
          </button>
        </div>

        {/* Vertical Printable ID Card (Exact Image 1 Pixel-Perfect Template) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center items-center">
          
          {viewMode === 'template' ? (
            <div className="flex flex-col items-center animate-in fade-in duration-200">
              <div className="w-[320px] rounded-[28px] overflow-hidden shadow-2xl border-2 border-[#00C9A7]/40 bg-white">
                <img 
                  src="/templates/id_card_template.png" 
                  alt="Official Trade Nexus ID Card Template" 
                  className="w-full h-auto object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-2.5 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                Official Company Master Template: tradenexus-id.png
              </p>
            </div>
          ) : (
          <div 
            id="digital-id-card-sheet"
            className="w-[320px] bg-[#06172E] text-white rounded-[28px] overflow-hidden shadow-2xl relative border-2 border-[#00C9A7]/40 flex flex-col justify-between"
            style={{ minHeight: '530px' }}
          >
            
            {/* Lanyard Clip Slot */}
            <div className="pt-3 flex justify-center">
              <div className="w-16 h-3 bg-white/20 rounded-full border border-white/40 shadow-inner flex items-center justify-center">
                <div className="w-12 h-1.5 bg-[#06172E] rounded-full" />
              </div>
            </div>

            {/* Top Brand Logo & Header */}
            <div className="pt-2 pb-1 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00C9A7] to-[#0A2540] p-0.5 shadow-lg shadow-[#00C9A7]/40 mb-1.5 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#06172E] flex items-center justify-center text-[#00C9A7]">
                  <TrendingUp className="w-6 h-6 stroke-[2.5]" />
                </div>
              </div>

              <h2 className="font-display font-black text-lg text-white tracking-widest leading-none">
                TRADE NEXUS
              </h2>
              
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-px w-4 bg-[#00C9A7]" />
                <span className="text-[8px] font-extrabold tracking-[0.25em] text-[#00C9A7]">
                  TRADE SMART
                </span>
                <span className="h-px w-4 bg-[#00C9A7]" />
              </div>
            </div>

            {/* Circular Photo with Glowing Cyan Concentric Border */}
            <div className="flex justify-center my-2">
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#00C9A7] via-[#38E1B7] to-[#0A2540] shadow-xl shadow-[#00C9A7]/30">
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center border-2 border-[#06172E]">
                  {customPhotoUrl ? (
                    <img src={customPhotoUrl} alt={empName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-900 flex items-center justify-center text-[#00C9A7] font-display font-black text-2xl">
                      {initials}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Employee Name & Designation */}
            <div className="text-center px-4 space-y-0.5">
              <h3 className="font-display font-black text-base text-white tracking-wider uppercase">
                {empName}
              </h3>
              <p className="text-[10px] font-extrabold tracking-widest text-[#00C9A7] uppercase">
                {empRole}
              </p>
              <div className="w-8 h-0.5 bg-[#00C9A7] mx-auto rounded-full" />
            </div>

            {/* Clean Key Details Matrix */}
            <div className="px-6 py-2 text-xs font-medium space-y-1 text-slate-200">
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-5 text-slate-300 font-semibold">Emp. ID</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 font-mono font-bold text-white">{empCode || '001'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-5 text-slate-300 font-semibold">Emp. Type</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 font-mono font-bold text-white">Full - Time</span>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-5 text-slate-300 font-semibold">Blood Group</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 font-mono font-bold text-white">{bloodGroup || 'O+ ve'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-5 text-slate-300 font-semibold">D.O.B.</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 font-mono font-bold text-white">{dob || '05/11/1997'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-5 text-slate-300 font-semibold">Cell</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-6 font-mono font-bold text-white truncate">{cellNumber || '0000XXXX97'}</span>
              </div>
            </div>

            {/* Bottom Curved Wave with Corporate Details (Exact Image 1 pixel-perfect) */}
            <div className="relative bg-white text-[#0A2540] px-4 py-3.5 rounded-t-[36px] mt-2 border-t-4 border-[#00C9A7] shadow-lg">
              
              <div className="flex items-end justify-between gap-2 relative z-10">
                {/* Left contact icons */}
                <div className="space-y-1 text-[8.5px] font-semibold text-slate-700 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#0A2540] text-[#00C9A7] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-2.5 h-2.5" />
                    </div>
                    <span className="truncate max-w-[130px]">123 Business Avenue, Financial Dist.</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#0A2540] text-[#00C9A7] flex items-center justify-center flex-shrink-0">
                      <Mail className="w-2.5 h-2.5" />
                    </div>
                    <span className="truncate">info@tradenexus.com</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#0A2540] text-[#00C9A7] flex items-center justify-center flex-shrink-0">
                      <Globe className="w-2.5 h-2.5" />
                    </div>
                    <span className="truncate">www.tradenexus.com</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#0A2540] text-[#00C9A7] flex items-center justify-center flex-shrink-0">
                      <Phone className="w-2.5 h-2.5" />
                    </div>
                    <span className="truncate">+91 98765 43210</span>
                  </div>
                </div>

                {/* Right CEO Signature & Watermark (Matching tradenexus-id.png) */}
                <div className="text-right flex-shrink-0 relative">
                  <div className="absolute -top-3 right-0 opacity-15 pointer-events-none">
                    <TrendingUp className="w-14 h-14 text-[#00C9A7]" />
                  </div>
                  <div className="relative z-10 space-y-0.5 pt-1">
                    <div className="font-serif italic text-sm text-[#0A2540] leading-none transform -rotate-2 select-none">
                      T. Vidhya sagar
                    </div>
                    <div className="text-[8.5px] font-bold text-[#0A2540] tracking-tight leading-tight">
                      T.Vidhya Sagar
                    </div>
                    <div className="text-[7.5px] font-semibold text-slate-500 tracking-tight leading-none">
                      Chief executive Officer
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsIdCardModalOpen(false)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-sm hover:brightness-105 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
