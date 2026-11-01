import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AuthUser,
  TelecallerStats,
  CallLogItem,
  AssignedLead,
  AttendanceRecord,
  PaymentVerificationItem,
  TeamMember,
  CompanyHoliday,
  CalendarSettings,
  CallOutcome,
} from '../types';
import { api, initApiAuth, setAuthToken, setStoredAuthUser } from '../services/api';
import { storageService } from '../services/storageService';
import { getSocket, disconnectSocket } from '../services/socketService';
import { notificationService } from '../services/notificationService';

interface AppContextType {
  currentUser: AuthUser | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Data
  stats: TelecallerStats;
  callLogs: CallLogItem[];
  assignedLeads: AssignedLead[];
  paymentVerifications: PaymentVerificationItem[];
  attendanceRecords: AttendanceRecord[];
  teamMembers: TeamMember[];
  companyHolidays: CompanyHoliday[];
  weeklyOffDays: number[];
  calendarSettings: CalendarSettings | null;

  // Actions
  activeCallingLead: AssignedLead | null;
  setActiveCallingLead: (lead: AssignedLead | null) => void;
  isQuickCallModalOpen: boolean;
  setIsQuickCallModalOpen: (open: boolean) => void;
  openCallModalForLead: (lead: AssignedLead) => void;
  updateAssignedLeadStatus: (
    leadId: string,
    status: AssignedLead['status'],
    notes: string,
    dealValue?: number,
    followUpDate?: string,
    customerDetails?: {
      customerName?: string;
      customerPhone?: string;
      customerBankName?: string;
      customerAccountNumber?: string;
      customerIfscCode?: string;
      customerUpiId?: string;
    }
  ) => Promise<void>;
  punchInToday: (coords?: { latitude: number; longitude: number }, photo?: string) => Promise<boolean>;
  refreshAllData: () => Promise<void>;
  
  // UI
  toastMessage: string | null;
  triggerToast: (msg: string) => void;
}

const defaultStats: TelecallerStats = {
  todayGoalCalls: 80,
  dialsMade: 0,
  connected: 0,
  interested: 0,
  rejected: 0,
  averageCallDurationSec: 0,
  monthlySalesTarget: 1000000,
  monthlySalesAchieved: 0,
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Core Data Collections
  const [stats, setStats] = useState<TelecallerStats>(defaultStats);
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<AssignedLead[]>([]);
  const [paymentVerifications, setPaymentVerifications] = useState<PaymentVerificationItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [companyHolidays, setCompanyHolidays] = useState<CompanyHoliday[]>([]);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([0]); // Default Sunday
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | null>(null);

  // Calling Modal States
  const [activeCallingLead, setActiveCallingLead] = useState<AssignedLead | null>(null);
  const [isQuickCallModalOpen, setIsQuickCallModalOpen] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Hydrate Auth from SecureStore on startup
  useEffect(() => {
    (async () => {
      try {
        await initApiAuth();
        const storedUser = await storageService.getUser();
        if (storedUser) {
          setCurrentUser(storedUser);
          // Verify with /auth/me
          try {
            const meRes = await api.me();
            if (meRes.user) {
              setCurrentUser(meRes.user);
              await storageService.setUser(meRes.user);
            }
          } catch {
            // Offline or expired
          }
        }
      } catch (err) {
        console.warn('[AppContext] Hydration error:', err);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // Fetch all data for current role
  const refreshAllData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [
        statsRes,
        logsRes,
        leadsRes,
        paysRes,
        calRes,
        holRes,
        attRes,
        teamRes,
      ] = await Promise.allSettled([
        api.getStats(),
        api.getCallLogs({ all: true }),
        api.getAssignedLeads(),
        api.getPayments(),
        api.getCalendarSettings(),
        api.getHolidays(),
        api.getAttendance(),
        api.getTeamMembers(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (logsRes.status === 'fulfilled') setCallLogs(logsRes.value || []);
      if (leadsRes.status === 'fulfilled') setAssignedLeads(leadsRes.value || []);
      if (paysRes.status === 'fulfilled') setPaymentVerifications(paysRes.value || []);
      if (calRes.status === 'fulfilled' && calRes.value) {
        setCalendarSettings(calRes.value);
        if (calRes.value.weeklyOffDays) setWeeklyOffDays(calRes.value.weeklyOffDays);
      }
      if (holRes.status === 'fulfilled') setCompanyHolidays(holRes.value || []);
      if (attRes.status === 'fulfilled') setAttendanceRecords(attRes.value || []);
      if (teamRes.status === 'fulfilled') setTeamMembers(teamRes.value || []);
    } catch (err) {
      console.warn('[AppContext] refreshAllData error:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
      const socket = getSocket();

      // Listen for real-time WebSocket events
      socket.on('lead:updated', (updatedLead: AssignedLead) => {
        setAssignedLeads((prev) =>
          prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
        );
      });

      socket.on('payment:created', (newPay: PaymentVerificationItem) => {
        setPaymentVerifications((prev) => [newPay, ...prev]);
        notificationService.scheduleLocalNotification(
          '💰 Payment Audit Required',
          `${newPay.telecallerName || 'A representative'} recorded deal of ₹${newPay.dealAmount.toLocaleString('en-IN')}.`,
          { targetScreen: 'ledger', recordId: newPay.id }
        );
      });

      socket.on('team_member:updated', (member: TeamMember) => {
        setTeamMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
      });

      return () => {
        socket.off('lead:updated');
        socket.off('payment:created');
        socket.off('team_member:updated');
      };
    } else {
      disconnectSocket();
    }
  }, [currentUser, refreshAllData]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await api.login(email, pass);
      if (res.token && res.user) {
        setAuthToken(res.token);
        setStoredAuthUser(res.user);
        setCurrentUser(res.user);
        triggerToast(`Welcome back, ${res.user.name}`);
        return true;
      }
      return false;
    } catch (err: any) {
      triggerToast(err?.message || 'Invalid email or password');
      return false;
    }
  };

  const logout = async () => {
    setAuthToken(null);
    setStoredAuthUser(null);
    await storageService.clearAuth();
    setCurrentUser(null);
    disconnectSocket();
    triggerToast('Logged out successfully');
  };

  const openCallModalForLead = useCallback((lead: AssignedLead) => {
    setActiveCallingLead(lead);
    setIsQuickCallModalOpen(true);
  }, []);

  const updateAssignedLeadStatus = async (
    leadId: string,
    status: AssignedLead['status'],
    notes: string,
    dealValue?: number,
    followUpDate?: string,
    customerDetails?: {
      customerName?: string;
      customerPhone?: string;
      customerBankName?: string;
      customerAccountNumber?: string;
      customerIfscCode?: string;
      customerUpiId?: string;
    }
  ) => {
    const existing = assignedLeads.find((l) => l.id === leadId);
    if (!existing) return;

    const dealAmountNum = dealValue !== undefined ? dealValue : existing.dealValue || 0;
    const targetLead: AssignedLead = {
      ...existing,
      status,
      notes: notes || existing.notes,
      callCount: (existing.callCount || 0) + 1,
      lastCallTimestamp: 'Just now',
      dealValue: dealAmountNum,
      followUpDate: followUpDate || existing.followUpDate,
      customerName: customerDetails?.customerName || existing.customerName || existing.name,
      customerPhone: customerDetails?.customerPhone || existing.customerPhone || existing.phone,
      customerBankName: customerDetails?.customerBankName || existing.customerBankName,
      customerAccountNumber: customerDetails?.customerAccountNumber || existing.customerAccountNumber,
      customerIfscCode: customerDetails?.customerIfscCode || existing.customerIfscCode,
      customerUpiId: customerDetails?.customerUpiId || existing.customerUpiId,
      updatedAt: new Date().toISOString(),
    };

    // Optimistically update
    setAssignedLeads((prev) => prev.map((l) => (l.id === leadId ? targetLead : l)));

    const newCallItem: CallLogItem = {
      id: `call-${Date.now()}`,
      clientName: targetLead.name,
      companyName: targetLead.company,
      phoneNumber: targetLead.phone,
      durationSec: status === 'BUSY' ? 0 : 180,
      outcome:
        status === 'CONVERTED'
          ? 'DEAL_CLOSED'
          : status === 'INTERESTED'
          ? 'INTERESTED'
          : status === 'CALLBACK'
          ? 'CALLBACK'
          : status === 'BUSY'
          ? 'BUSY'
          : status === 'NOT_INTERESTED'
          ? 'NOT_INTERESTED'
          : 'CONNECTED',
      notes: notes || `Outcome set to ${status}`,
      timestamp: 'Just now',
      followUpDate,
      employeeId: targetLead.assignedToEmployeeId || currentUser?.employeeId || currentUser?.id,
      employeeName: targetLead.assignedToEmployeeName || currentUser?.name,
    };

    setCallLogs((prev) => [newCallItem, ...prev]);

    // Update stats
    setStats((prev) => ({
      ...prev,
      dialsMade: prev.dialsMade + 1,
      connected: status !== 'NOT_INTERESTED' && status !== 'BUSY' ? prev.connected + 1 : prev.connected,
      interested: status === 'INTERESTED' ? prev.interested + 1 : prev.interested,
      rejected: status === 'NOT_INTERESTED' || status === 'BUSY' ? prev.rejected + 1 : prev.rejected,
    }));

    try {
      await Promise.all([
        api.updateAssignedLead(leadId, targetLead),
        api.createCallLog(newCallItem),
      ]);
      triggerToast(`✓ Status updated: ${status.replace('_', ' ')}`);
    } catch (err: any) {
      triggerToast(`✗ Sync warning: ${err?.message || 'Updated locally'}`);
    }
  };

  const punchInToday = async (coords?: { latitude: number; longitude: number }, photo?: string): Promise<boolean> => {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const record: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId: currentUser?.employeeId || currentUser?.id || 'emp',
        employeeName: currentUser?.name || 'Employee',
        date: now.toISOString().split('T')[0],
        dayNumber: now.getDate(),
        checkIn: timeStr,
        status: 'PRESENT',
        method: 'Face ID Biometric',
        checkInLat: coords?.latitude,
        checkInLng: coords?.longitude,
        locationStatus: coords ? 'AT_OFFICE' : 'AWAY',
        checkInPhoto: photo,
      };

      await api.recordAttendance(record);
      setAttendanceRecords((prev) => [record, ...prev]);
      triggerToast('✓ Checked in successfully for today!');
      return true;
    } catch (err: any) {
      triggerToast(`Punch-in error: ${err?.message || 'Could not punch in'}`);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        authLoading,
        login,
        logout,
        stats,
        callLogs,
        assignedLeads,
        paymentVerifications,
        attendanceRecords,
        teamMembers,
        companyHolidays,
        weeklyOffDays,
        calendarSettings,
        activeCallingLead,
        setActiveCallingLead,
        isQuickCallModalOpen,
        setIsQuickCallModalOpen,
        openCallModalForLead,
        updateAssignedLeadStatus,
        punchInToday,
        refreshAllData,
        toastMessage,
        triggerToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
