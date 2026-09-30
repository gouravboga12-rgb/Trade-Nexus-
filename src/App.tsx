import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { BottomNav } from './components/layout/BottomNav';
import { MobileHeader } from './components/layout/MobileHeader';
import { TradeNexusLogo } from './components/common/TradeNexusLogo';

// Auth Flow Views
import { EmployeeLoginView } from './views/auth/EmployeeLoginView';
import { TeamLeaderLoginView } from './views/auth/TeamLeaderLoginView';
import { HrLoginView } from './views/auth/HrLoginView';
import { AdminLoginView } from './views/auth/AdminLoginView';
import { FaceScanAttendanceView } from './views/auth/FaceScanAttendanceView';
import { AttendanceSuccessView } from './views/auth/AttendanceSuccessView';

// Modals
import { FaceIdScannerModal } from './components/modals/FaceIdScannerModal';
import { QuickCallLogModal } from './components/modals/QuickCallLogModal';
import { ApplyLeaveModal } from './components/modals/ApplyLeaveModal';
import { DigitalIdCardModal } from './components/modals/DigitalIdCardModal';
import { OfferLetterModal } from './components/modals/OfferLetterModal';
import { ExperienceCertModal } from './components/modals/ExperienceCertModal';
import { RelievingLetterModal } from './components/modals/RelievingLetterModal';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { GenerateOfferLetterModal } from './components/modals/GenerateOfferLetterModal';
import { GenerateExperienceCertModal } from './components/modals/GenerateExperienceCertModal';
import { GenerateRelievingLetterModal } from './components/modals/GenerateRelievingLetterModal';
import { GenerateInvoiceModal } from './components/modals/GenerateInvoiceModal';
import { PayslipDetailModal } from './components/modals/PayslipDetailModal';
import { RecentPayslipsModal } from './components/modals/RecentPayslipsModal';
import { DevSettingsModal } from './components/common/DevSettingsModal';
import { LiveVideoRoomModal } from './components/modals/LiveVideoRoomModal';

// Mobile Views
import { TelecallerHomeView } from './views/TelecallerHomeView';
import { DailyCallingView } from './views/DailyCallingView';
import { ClientsPipelineView } from './views/ClientsPipelineView';
import { AttendanceLeavesView } from './views/AttendanceLeavesView';
import { ProfileSelfServiceView } from './views/ProfileSelfServiceView';
import { AllModulesMenuView } from './views/AllModulesMenuView';

// Mobile Management Views
import { TeamLeaderDashboardView } from './views/TeamLeaderDashboardView';
import { HrDashboardView } from './views/HrDashboardView';
import { AdminDashboardView } from './views/AdminDashboardView';

import { 
  Home, 
  PhoneCall, 
  Users, 
  CalendarCheck, 
  User, 
  Bell, 
  Search, 
  Plus, 
  UserCheck, 
  Shield, 
  ChevronDown,
  LogOut,
  ScanFace,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  Award,
  Crown,
  FileSpreadsheet,
  FileText,
  UserPlus,
  Video,
  DollarSign,
  RotateCw,
  Receipt
} from 'lucide-react';
import { NavTab, UserRole } from './types';

export const App: React.FC = () => {
  const { 
    authStep,
    setAuthStep,
    logout,
    currentRole, 
    setCurrentRole, 
    activeTab, 
    setActiveTab, 
    activeToast,
    selectedPayslip,
    isPayslipModalOpen,
    setIsPayslipModalOpen, 
    isGenerateOfferLetterModalOpen,
    setIsGenerateOfferLetterModalOpen,
    isGenerateExperienceCertModalOpen,
    setIsGenerateExperienceCertModalOpen,
    isGenerateRelievingLetterModalOpen,
    setIsGenerateRelievingLetterModalOpen,
    isGenerateInvoiceModalOpen,
    setIsGenerateInvoiceModalOpen,
    profile, 
    stats, 
    clients,
    assignedLeads,
    teamMembers,
    teamGroups,
    leaveRequests,
    paymentVerifications,
    setIsFaceIdModalOpen, 
    setIsQuickCallModalOpen, 
    setIsExcelUploadModalOpen,
    currentUser,
    isDataLoading,
    backendError,
    invalidateAll,
    triggerToast,
    isRefreshing,
    refreshAllData
  } = useApp();

  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  const backendBanner = (backendError && isLocalhost) ? (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center shadow-lg print:hidden">
      Backend unreachable — showing empty data. {backendError}
    </div>
  ) : (isDataLoading && isLocalhost) ? (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-[#0A2540] text-[#00C9A7] text-xs font-bold px-4 py-1.5 text-center print:hidden">
      Loading live data from SQLite…
    </div>
  ) : null;

  // 1. If currently in the 4-step Authentication / Face ID flow, render the active step
  if (authStep === 'LOGIN' || authStep === 'FACE_SCAN' || authStep === 'ATTENDANCE_SUCCESS') {
    return (
      <div className="relative min-h-screen">
        {backendBanner}
        {authStep === 'LOGIN' && (
          currentRole === 'team_leader' ? <TeamLeaderLoginView /> :
          currentRole === 'hr' ? <HrLoginView /> :
          currentRole === 'admin' ? <AdminLoginView /> :
          <EmployeeLoginView />
        )}
        {authStep === 'FACE_SCAN' && <FaceScanAttendanceView />}
        {authStep === 'ATTENDANCE_SUCCESS' && <AttendanceSuccessView />}
        
        {/* Floating Notification Toast */}
        {activeToast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0A2540] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-[#00C9A7]/40 flex items-center gap-2 animate-in slide-in-from-bottom duration-200 print:hidden">
            <span>{activeToast}</span>
          </div>
        )}

        {/* Dev Settings Modal accessible on Login & Face Scan */}
        <DevSettingsModal />
      </div>
    );
  }

  // Full Unified Workspace once authenticated (Same for Mobile & Desktop)
  const renderActiveView = () => {
    if (currentRole === 'team_leader') return <TeamLeaderDashboardView />;
    if (currentRole === 'hr') return <HrDashboardView />;
    if (currentRole === 'admin') return <AdminDashboardView />;

    switch (activeTab) {
      case 'home':    return <TelecallerHomeView />;
      case 'calling': return <DailyCallingView />;
      case 'clients': return <ClientsPipelineView />;
      case 'leaves':  return <AttendanceLeavesView />;
      case 'profile': return <ProfileSelfServiceView />;
      case 'menu':    return <AllModulesMenuView />;
      default:        return <TelecallerHomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#00C9A7]/20 print:bg-white print:min-h-0 print:h-auto">
      {backendBanner}

      {/* 2. UNIFIED RESPONSIVE APP WORKSPACE (Mobile, Tablet, Laptop & Desktop) - Strictly hidden during print */}
      <div className="flex flex-col min-h-screen w-full bg-[#F8FAFC] relative print:hidden">
        {/* Global Responsive Header */}
        {activeTab !== 'profile' && <MobileHeader />}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto print:hidden">
          {renderActiveView()}
        </main>

        {/* Bottom Navigation only for Telecaller (Sticky on mobile, Floating Island Dock on desktop) */}
        {currentRole === 'telecaller' && <BottomNav />}
      </div>

      {/* Floating Notification Toast */}
      {activeToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0A2540] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-[#00C9A7]/40 flex items-center gap-2 animate-in slide-in-from-bottom duration-200 print:hidden">
          <span>{activeToast}</span>
        </div>
      )}

      {/* All Action Modals */}
      <FaceIdScannerModal />
      <QuickCallLogModal />
      <ApplyLeaveModal />
      <DigitalIdCardModal />
      <OfferLetterModal />
      <ExperienceCertModal />
      <RelievingLetterModal />
      <InvoiceModal />
      <GenerateOfferLetterModal 
        isOpen={isGenerateOfferLetterModalOpen} 
        onClose={() => setIsGenerateOfferLetterModalOpen(false)} 
      />
      <GenerateExperienceCertModal 
        isOpen={isGenerateExperienceCertModalOpen} 
        onClose={() => setIsGenerateExperienceCertModalOpen(false)} 
      />
      <GenerateRelievingLetterModal 
        isOpen={isGenerateRelievingLetterModalOpen} 
        onClose={() => setIsGenerateRelievingLetterModalOpen(false)} 
      />
      <GenerateInvoiceModal 
        isOpen={isGenerateInvoiceModalOpen} 
        onClose={() => setIsGenerateInvoiceModalOpen(false)} 
      />
      <PayslipDetailModal
        payslip={selectedPayslip}
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
      />
      <RecentPayslipsModal />
      <DevSettingsModal />
      <LiveVideoRoomModal />
    </div>
  );
};
