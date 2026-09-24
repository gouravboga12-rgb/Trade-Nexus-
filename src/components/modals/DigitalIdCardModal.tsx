import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Download, 
  Printer, 
  Upload, 
  Phone, 
  Mail, 
  MapPin, 
  Globe,
  TrendingUp,
  Edit3,
  User,
  Check
} from 'lucide-react';

export const DigitalIdCardModal: React.FC = () => {
  const { 
    isIdCardModalOpen, 
    setIsIdCardModalOpen, 
    profile, 
    teamMembers, 
    triggerToast,
    selectedIdCardEmpId,
    updateEmployeeAvatar
  } = useApp();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(selectedIdCardEmpId || profile.id || 'emp-101');
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields state
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [customEmpCode, setCustomEmpCode] = useState('');
  const [customEmpType, setCustomEmpType] = useState('Full - Time');
  const [customBloodGroup, setCustomBloodGroup] = useState('O+ ve');
  const [customDob, setCustomDob] = useState('05/11/1997');
  const [customPhone, setCustomPhone] = useState('9876543210');

  useEffect(() => {
    if (selectedIdCardEmpId) {
      setSelectedEmpId(selectedIdCardEmpId);
    }
  }, [selectedIdCardEmpId, isIdCardModalOpen]);

  useEffect(() => {
    const matched = teamMembers.find(m => m.id === selectedEmpId || m.empCode === selectedEmpId);
    if (matched) {
      setCustomName(matched.name);
      setCustomRole(matched.role);
      setCustomEmpCode(matched.empCode);
      setCustomEmpType('Full - Time');
      setCustomBloodGroup((matched as any).bloodGroup || 'O+ ve');
      setCustomDob((matched as any).dob || '05/11/1997');
      setCustomPhone(matched.phone || '9876543210');
      setCustomPhotoUrl(matched.avatar ? matched.avatar : null);
    } else if (profile) {
      setCustomName(profile.name || 'Employee');
      setCustomRole(profile.roleTitle || 'Sales Executive');
      setCustomEmpCode(profile.empCode || '001');
      setCustomEmpType('Full - Time');
      setCustomBloodGroup(profile.bloodGroup || 'O+ ve');
      setCustomDob('05/11/1997');
      setCustomPhone(profile.phone || '9876543210');
      setCustomPhotoUrl(profile.avatar || null);
    }
  }, [selectedEmpId, teamMembers, profile, isIdCardModalOpen]);

  if (!isIdCardModalOpen) return null;

  const initials = customName.trim() 
    ? customName.trim().split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'TN';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        setCustomPhotoUrl(dataUrl);
        if (selectedEmpId) {
          updateEmployeeAvatar(selectedEmpId, dataUrl);
        }
        triggerToast(`✓ Photo updated & saved for ${customName}'s ID card`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    triggerToast('✓ Opening print dialogue for ID Card...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = () => {
    triggerToast(`✓ Official Digital ID Card for ${customName} ready to save as PDF`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Top Header */}
        <div className="bg-[#06152B] px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7] animate-pulse" />
            <h3 className="font-display font-bold text-sm text-white">Official Identity Card Studio</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isEditing ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Done' : 'Edit'}</span>
            </button>

            <button 
              onClick={() => setIsIdCardModalOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Employee Switcher & Photo Upload Controls */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs print:hidden flex-shrink-0">
          <div className="flex-1">
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-[#0A2540] text-xs focus:outline-none focus:border-[#00C9A7]"
            >
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.empCode} • {m.role})</option>
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
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#00C9A7] text-slate-700 font-bold flex items-center gap-1.5 shadow-2xs transition-all flex-shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-[#00A88B]" />
            <span>Upload Photo</span>
          </button>
        </div>

        {/* Edit fields collapsible drawer */}
        {isEditing && (
          <div className="p-3.5 bg-slate-100 border-b border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto print:hidden">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Name</label>
              <input 
                type="text" 
                value={customName} 
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Designation</label>
              <input 
                type="text" 
                value={customRole} 
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Emp. ID</label>
              <input 
                type="text" 
                value={customEmpCode} 
                onChange={(e) => setCustomEmpCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Emp. Type</label>
              <input 
                type="text" 
                value={customEmpType} 
                onChange={(e) => setCustomEmpType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Blood Group</label>
              <input 
                type="text" 
                value={customBloodGroup} 
                onChange={(e) => setCustomBloodGroup(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">D.O.B.</label>
              <input 
                type="text" 
                value={customDob} 
                onChange={(e) => setCustomDob(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Vertical Printable ID Card (Exact Template matching tradenexus-id.png) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/70 flex justify-center items-center flex-1">
          
          <div 
            id="digital-id-card-sheet"
            className="printable-id-badge-sheet w-[340px] text-white rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col justify-between"
            style={{ 
              backgroundColor: '#051326',
              minHeight: '580px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            
            {/* Top Lanyard Clip Punch Hole */}
            <div className="pt-3.5 flex justify-center relative z-20">
              <div 
                className="w-16 h-3 rounded-full flex items-center justify-center shadow-inner"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)' }}
              >
                <div 
                  className="w-12 h-1.5 rounded-full"
                  style={{ backgroundColor: '#051326' }}
                />
              </div>
            </div>

            {/* Top Brand Logo & Header */}
            <div className="pt-2 pb-1 text-center flex flex-col items-center relative z-10">
              {/* Circular Logo Icon */}
              <div 
                className="w-12 h-12 rounded-full p-0.5 shadow-lg mb-1.5 flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, #00C9A7 0%, #00897B 100%)',
                  boxShadow: '0 4px 14px rgba(0, 201, 167, 0.4)'
                }}
              >
                <div 
                  className="w-full h-full rounded-full flex items-center justify-center text-[#00C9A7]"
                  style={{ backgroundColor: '#051326' }}
                >
                  <TrendingUp className="w-6 h-6 stroke-[2.5]" />
                </div>
              </div>

              <h2 className="font-display font-black text-xl text-white tracking-[0.18em] leading-none uppercase">
                TRADE NEXUS
              </h2>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="h-px w-6" style={{ backgroundColor: '#00C9A7' }} />
                <span className="text-[9px] font-black tracking-[0.28em]" style={{ color: '#00C9A7' }}>
                  TRADE SMART
                </span>
                <span className="h-px w-6" style={{ backgroundColor: '#00C9A7' }} />
              </div>
            </div>

            {/* Circular Photo with Concentric Cyan Glowing Ring & Click-to-Upload */}
            <div className="flex justify-center my-2.5 relative z-10">
              <div 
                onClick={() => fileInputRef.current?.click()}
                title="Click to change or upload employee photo"
                className="w-28 h-28 rounded-full p-1 shadow-2xl flex items-center justify-center cursor-pointer group relative"
                style={{ 
                  background: 'linear-gradient(135deg, #00C9A7 0%, #2CD5B5 50%, #0A2540 100%)',
                  boxShadow: '0 8px 24px rgba(0, 201, 167, 0.35)'
                }}
              >
                <div 
                  className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative"
                  style={{ backgroundColor: '#0A2540', border: '3px solid #051326' }}
                >
                  {customPhotoUrl ? (
                    <img src={customPhotoUrl} alt={customName} className="w-full h-full object-cover" />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center font-display font-black text-3xl"
                      style={{ 
                        background: 'linear-gradient(180deg, #133353 0%, #06152B 100%)',
                        color: '#00C9A7'
                      }}
                    >
                      {initials}
                    </div>
                  )}

                  {/* Hover Upload Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold">
                    <Upload className="w-4 h-4 text-[#00C9A7] mb-0.5" />
                    <span>Change</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Name & Designation */}
            <div className="text-center px-4 space-y-1 relative z-10">
              <h3 className="font-display font-black text-lg text-white tracking-widest uppercase">
                {customName || 'NAME'}
              </h3>
              <p 
                className="text-[11px] font-extrabold tracking-[0.2em] uppercase"
                style={{ color: '#00C9A7' }}
              >
                {customRole || 'DESIGNATION'}
              </p>
              <div 
                className="w-10 h-0.5 mx-auto rounded-full mt-1"
                style={{ backgroundColor: '#00C9A7' }}
              />
            </div>

            {/* Clean Key Details Matrix */}
            <div className="px-8 py-2 text-xs font-semibold space-y-1.5 text-slate-200 relative z-10">
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-bold">Emp. ID</span>
                <span className="col-span-1 text-slate-400 font-bold">:</span>
                <span className="col-span-6 font-mono font-bold text-white text-sm">{customEmpCode || '001'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-bold">Emp. Type</span>
                <span className="col-span-1 text-slate-400 font-bold">:</span>
                <span className="col-span-6 font-bold text-white">{customEmpType || 'Full - Time'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-bold">Blood Group</span>
                <span className="col-span-1 text-slate-400 font-bold">:</span>
                <span className="col-span-6 font-bold text-white">{customBloodGroup || 'O+ ve'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-bold">D.O.B.</span>
                <span className="col-span-1 text-slate-400 font-bold">:</span>
                <span className="col-span-6 font-mono font-bold text-white">{customDob || '05/11/1997'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-bold">Cell</span>
                <span className="col-span-1 text-slate-400 font-bold">:</span>
                <span className="col-span-6 font-mono font-bold text-white truncate">
                  {customPhone ? (customPhone.length > 7 ? `${customPhone.slice(0, 4)}XXXX${customPhone.slice(-2)}` : customPhone) : '0000XXXX97'}
                </span>
              </div>
            </div>

            {/* Bottom Curved Wave Container with Corporate Info & Signature (Exact tradenexus-id.png) */}
            <div 
              className="relative bg-white text-[#0A2540] px-5 pt-5 pb-4 mt-2 border-t-4 shadow-xl"
              style={{ 
                borderTopColor: '#00C9A7',
                borderTopLeftRadius: '36px',
                borderTopRightRadius: '36px',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              
              {/* Watermark in bottom right */}
              <div className="absolute right-3 bottom-3 opacity-15 pointer-events-none select-none">
                <div 
                  className="w-20 h-20 rounded-full border-4 flex items-center justify-center"
                  style={{ borderColor: '#00C9A7' }}
                >
                  <TrendingUp className="w-12 h-12 stroke-[2.5]" style={{ color: '#00C9A7' }} />
                </div>
              </div>

              <div className="flex items-end justify-between relative z-10 gap-2">
                
                {/* Left Contact Details with Circular Dark Icons */}
                <div className="space-y-1.5 text-[8.5px] font-bold text-slate-700 max-w-[170px]">
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#051326', color: '#00C9A7' }}
                    >
                      <MapPin className="w-2.5 h-2.5" />
                    </div>
                    <span className="leading-tight">123 Business Avenue, Financial District, 500001</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#051326', color: '#00C9A7' }}
                    >
                      <Mail className="w-2.5 h-2.5" />
                    </div>
                    <span className="truncate">info@tradenexus.com</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#051326', color: '#00C9A7' }}
                    >
                      <Globe className="w-2.5 h-2.5" />
                    </div>
                    <span className="truncate">www.tradenexus.com</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#051326', color: '#00C9A7' }}
                    >
                      <Phone className="w-2.5 h-2.5" />
                    </div>
                    <span className="truncate">+91 98765 43210</span>
                  </div>
                </div>

                {/* Right Signature Block matching tradenexus-id.png */}
                <div className="text-right flex-shrink-0 space-y-0.5 pr-1">
                  <div className="py-0.5">
                    <span 
                      className="inline-block font-signature text-2xl text-slate-900 select-none transform -rotate-3"
                      style={{ 
                        fontFamily: "'Caveat', 'Great Vibes', 'Dancing Script', cursive",
                        color: '#051326'
                      }}
                    >
                      T. Vidhya sagar
                    </span>
                  </div>
                  <p className="font-bold text-[9px] text-[#0A2540] leading-none">
                    T.Vidhya Sagar
                  </p>
                  <p className="text-[7.5px] text-slate-500 font-semibold leading-tight">
                    Chief executive Officer
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden flex-shrink-0">
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
              className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 text-xs flex items-center gap-1.5 shadow-2xs"
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
