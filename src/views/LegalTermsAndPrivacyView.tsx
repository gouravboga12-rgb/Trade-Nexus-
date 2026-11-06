import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  ArrowLeft, 
  Printer, 
  Lock, 
  Camera, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Scale
} from 'lucide-react';
import { scrollToTop } from '../utils/scrollUtils';

interface LegalTermsAndPrivacyViewProps {
  initialTab?: 'privacy' | 'terms';
  onBack?: () => void;
}

export const LegalTermsAndPrivacyView: React.FC<LegalTermsAndPrivacyViewProps> = ({
  initialTab = 'privacy',
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    scrollToTop();
  }, [activeTab]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = '';
        window.location.pathname = '/';
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-[#00C9A7]/20 pb-20">
      {/* Top Corporate Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-[#0A2540] hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Return to application"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-display font-black text-sm shadow-xs">
                TN
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black font-display text-[#0A2540] leading-tight tracking-tight">
                  Trade Nexus Trade Smart
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">
                  Official Workforce &amp; CRM Legal Charter
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <div className="flex items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'privacy'
                  ? 'bg-[#0A2540] text-[#00C9A7] shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'terms'
                  ? 'bg-[#0A2540] text-[#00C9A7] shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Terms &amp; Conditions</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Legal Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Printable Official Letterhead Header */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00C9A7] via-[#0A2540] to-[#00B4D8]" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 inline-block mb-2">
                Official Compliance Document
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-[#0A2540] tracking-tight">
                {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Trade Nexus Trade Smart Employee Portal &amp; Android Application
              </p>
            </div>

            <div className="text-left sm:text-right text-[11px] text-slate-500 space-y-0.5">
              <p><strong className="text-slate-800">Effective Date:</strong> November 05, 2026</p>
              <p><strong className="text-slate-800">Last Updated:</strong> November 05, 2026</p>
              <p><strong className="text-slate-800">Applicable Version:</strong> 2.4.0 (Enterprise)</p>
            </div>
          </div>

          {/* Corporate Metadata Pill Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-6 text-[11px]">
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="w-4 h-4 text-[#00C9A7] flex-shrink-0" />
              <span className="truncate">Trade nexus trade Smart</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Globe className="w-4 h-4 text-[#00C9A7] flex-shrink-0" />
              <a href="https://tradenexustradesmart.co.in" target="_blank" rel="noreferrer" className="text-[#00A88B] hover:underline truncate">
                tradenexustradesmart.co.in
              </a>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4 text-[#00C9A7] flex-shrink-0" />
              <a href="mailto:hr@tradenexustradesmart.in" className="text-[#00A88B] hover:underline truncate">
                hr@tradenexustradesmart.in
              </a>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 text-[#00C9A7] flex-shrink-0" />
              <span>+919483001083</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PRIVACY POLICY CONTENT (CLEAN & SIMPLE)                         */}
        {/* ============================================================== */}
        {activeTab === 'privacy' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6 text-slate-700 leading-relaxed text-xs sm:text-sm">
            
            {/* Section 1 */}
            <section className="space-y-2">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">1</span>
                <span>About Us</span>
              </h3>
              <p>
                This Privacy Policy explains how <strong>Trade Nexus Trade Smart</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) handles personal data when you use our mobile application and employee management platform.
              </p>
              <p>
                Our application is an internal workplace portal designed for authorized team members to check daily attendance, view company documents, and manage regular work tasks.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-2">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">2</span>
                <span>What Information We Collect</span>
              </h3>
              <p>We collect only the basic information necessary for everyday work functions:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li><strong>Profile &amp; Account Details:</strong> Name, employee ID, company email, phone number, and assigned team role.</li>
                <li><strong>Attendance Verification:</strong> When you punch in or punch out for your shift, the app records your check-in time, optional attendance selfie, and your location coordinates to confirm presence at the office. We do not track your location continuously in the background.</li>
                <li><strong>Work Records:</strong> Shift records, leave applications, payslip history, and assigned task statuses.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-2">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">3</span>
                <span>How We Use Your Information</span>
              </h3>
              <p>Your information is used strictly for internal workplace operations:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>To record and verify daily attendance and work hours.</li>
                <li>To display your employee profile, digital ID card, and company offer letters.</li>
                <li>To send you important work updates, attendance notifications, and shift alerts.</li>
                <li>To ensure workplace safety and prevent unauthorized access to corporate accounts.</li>
              </ul>
              <p className="font-semibold text-slate-800 pt-1">
                We never sell, rent, or trade your personal data with any third parties or advertisers.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-2">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">4</span>
                <span>Data Storage &amp; Security</span>
              </h3>
              <p>
                All information is securely transmitted using encrypted HTTPS (TLS) connections. Access to employee data is strictly limited to authorized administrative and HR personnel through secure credentials.
              </p>
            </section>

            {/* Section 5 - Deletion Request */}
            <section className="space-y-3 bg-[#E8FAF5]/70 border border-[#00C9A7]/50 rounded-2xl p-5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#007A65] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#00A88B]" />
                <span>5. Account &amp; Data Deletion Requests</span>
              </h3>
              <p className="text-slate-700">
                You have full control over your personal data. If you leave the organization or want your account and personal records permanently removed, you can submit a deletion request at any time.
              </p>
              <div className="bg-white rounded-xl p-4 border border-[#00C9A7]/30 space-y-2 text-xs">
                <strong className="text-[#0A2540] font-bold block text-sm">How to Request Permanent Data &amp; Account Deletion:</strong>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-700">
                  <li>Send an email to: <a href="mailto:hr@tradenexustradesmart.in?subject=Account%20and%20Data%20Deletion%20Request" className="text-[#00A88B] font-bold underline">hr@tradenexustradesmart.in</a></li>
                  <li>Include your <strong>full name</strong> and <strong>employee ID</strong>.</li>
                  <li>Mention that you want your account and personal records deleted.</li>
                </ol>
                <p className="text-slate-600 pt-1">
                  Upon receiving your request, our HR desk will verify your details and permanently delete your profile, attendance photos, and account credentials from our active database.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-2">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">6</span>
                <span>Contact Us</span>
              </h3>
              <p>If you have any questions about this Privacy Policy or wish to get in touch with our team, please contact us:</p>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1.5">
                <p><strong>Company:</strong> Trade Nexus Trade Smart</p>
                <p><strong>Email:</strong> <a href="mailto:hr@tradenexustradesmart.in" className="text-[#00A88B] underline font-medium">hr@tradenexustradesmart.in</a></p>
                <p><strong>Phone:</strong> +91 94830 01083</p>
                <p><strong>Address:</strong> RR westbrook, 6th main HSR layout, beside pizza artistry, Bengaluru 102, Karnataka, India</p>
              </div>
            </section>

          </div>
        )}

        {/* ============================================================== */}
        {/* TERMS & CONDITIONS CONTENT                                      */}
        {/* ============================================================== */}
        {activeTab === 'terms' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 leading-relaxed text-xs sm:text-sm">
            
            {/* Quick Summary Alert Box */}
            <div className="bg-[#0A2540] text-white rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
              <Scale className="w-5 h-5 text-[#00C9A7] flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <strong className="text-xs sm:text-sm font-bold text-white block">
                  Enterprise Agreement &amp; Code of Telecalling Conduct
                </strong>
                <p className="text-slate-300">
                  By accessing or utilizing the <strong>Trade Nexus Trade Smart</strong> portal or Android mobile application, you acknowledge and agree to abide strictly by these corporate Terms and Conditions, our enterprise code of conduct, and all applicable telecommunications regulations.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">1</span>
                <span>Acceptance of Terms</span>
              </h3>
              <p>
                These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (whether as an employee, contractor, or authorized representative) and <strong>Trade nexus trade Smart</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;).
              </p>
              <p>
                If you do not agree with any provision of these Terms, you must immediately cease accessing the Platform and notify the Human Resources department.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">2</span>
                <span>Authorized User Access &amp; Credential Security</span>
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Access to the Platform is restricted strictly to active employees who have been assigned official credentials by the Super Administrator or HR Manager.</li>
                <li>Users are strictly prohibited from sharing, lending, transferring, or disclosing login passwords or OTPs to any third party or colleague.</li>
                <li>You are solely responsible for all actions conducted under your account. Any suspicious login activity must be immediately reported to <a href="mailto:hr@tradenexustradesmart.in" className="text-[#00A88B] underline">hr@tradenexustradesmart.in</a>.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">3</span>
                <span>Attendance, Biometric &amp; Geofence Integrity</span>
              </h3>
              <p>
                The Platform employs automated facial selfie verification and GPS coordinates to register daily attendance:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li><strong>No Proxy Punching:</strong> Attempting to clock in on behalf of another employee or having another individual stand in for your camera scan is deemed gross misconduct warranting immediate termination.</li>
                <li><strong>No Mock Locations:</strong> Utilizing GPS spoofing tools, virtual location emulators, or fake webcams will be automatically detected and flagged as fraudulent attendance.</li>
                <li><strong>Shift Punctuality:</strong> Employees must punch in within company shift timings and grace periods established in company calendar settings.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">4</span>
                <span>Confidentiality of Leads &amp; Proprietary CRM Data</span>
              </h3>
              <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 text-xs space-y-1 text-rose-950">
                <strong className="block text-rose-900 font-bold">Strict Non-Disclosure &amp; Trade Secret Protection:</strong>
                <p>
                  All customer contact records, telephone numbers, client portfolios, sales scripts, batch lists, and payment transaction slips provided through the Platform are the exclusive, confidential trade secrets of Trade nexus trade Smart.
                </p>
                <p>
                  Employees must <strong>never copy, export, photograph, take screenshots of, or transmit</strong> customer lead information to personal devices or outside entities. Any breach constitutes unlawful data theft under the Information Technology Act, 2000 and will result in criminal prosecution and financial damages.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">5</span>
                <span>Telecalling &amp; Regulatory Compliance (TRAI / NDNC)</span>
              </h3>
              <p>When executing calling duties through the Platform, sales telecallers must strictly adhere to:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Telecom Regulatory Authority of India (TRAI) telemarketing guidelines and Do-Not-Call (DND) regulations.</li>
                <li>Professional, ethical, and courteous communication standards at all times.</li>
                <li>Calling prospective clients strictly within sanctioned commercial hours (09:00 AM to 06:30 PM).</li>
                <li>Accurately recording genuine call dispositions (e.g. Interested, Callback, Not Interested) without falsification.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">6</span>
                <span>Intellectual Property</span>
              </h3>
              <p>
                The Platform, including its user interface design, logo marks, document templates (Offer Letters, Payslips, ID Cards, Invoices, Experience Certificates), algorithms, and databases are the sole proprietary property of <strong>Trade nexus trade Smart</strong>. No portion may be reverse-engineered, reproduced, or exploited.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">7</span>
                <span>Termination &amp; Revocation of Access</span>
              </h3>
              <p>
                Company reserves the absolute right to terminate, suspend, or revoke account access immediately without prior notice upon resignation, dismissal, breach of confidentiality, or violation of these Terms.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">8</span>
                <span>Governing Law &amp; Jurisdiction</span>
              </h3>
              <p>
                These Terms are governed by and construed in accordance with the substantive laws of the Republic of India. Any legal action, dispute, or proceeding arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts situated in <strong>Bengaluru, Karnataka, India</strong>.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-2.5">
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A88B] flex items-center justify-center text-xs font-bold">9</span>
                <span>Corporate Contact Information</span>
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs space-y-1 text-slate-700">
                <p><strong>Company:</strong> Trade nexus trade Smart</p>
                <p><strong>Corporate Address:</strong> RR westbrook, 6th main HSR layout, beside pizza artistry, Bengaluru 102, Karnataka, India</p>
                <p><strong>Official Email:</strong> hr@tradenexustradesmart.in</p>
                <p><strong>Official Phone:</strong> +919483001083</p>
                <p><strong>Website:</strong> https://tradenexustradesmart.co.in</p>
              </div>
            </section>

          </div>
        )}

        {/* Footer info note */}
        <div className="text-center text-slate-400 text-xs py-8">
          <p>© {new Date().getFullYear()} Trade nexus trade Smart. All rights reserved.</p>
          <p className="mt-1 font-mono text-[11px]">Bengaluru Corporate Office • ISO-Compliant Enterprise Workforce Charter</p>
        </div>
      </main>
    </div>
  );
};

