import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  Users,
  Award,
  AlertTriangle,
  Clock,
  LogOut,
  Calendar,
  CheckCircle2,
} from 'lucide-react-native';

export const AdminHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    currentUser,
    teamMembers,
    paymentVerifications,
    logout,
    refreshAllData,
    calendarSettings,
    weeklyOffDays,
    companyHolidays,
  } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  };

  const todayDateObj = new Date();
  const todayDayOfWeek = todayDateObj.getDay();
  const todayYMD = todayDateObj.toISOString().split('T')[0];
  const isTodayWeeklyOff = weeklyOffDays.includes(todayDayOfWeek);
  const todayHoliday = companyHolidays.find((h) => h.date === todayYMD);
  const isNonWorkingDay = isTodayWeeklyOff || Boolean(todayHoliday);

  // Suppress absent alerts if today is weekly off or holiday
  const awayWithoutLeave = isNonWorkingDay
    ? []
    : teamMembers.filter((m) => m.attendanceStatus === 'ABSENT');

  const pendingPayments = paymentVerifications.filter(
    (p) => p.status === 'PENDING_HR_AUDIT'
  );

  const totalRevenue = paymentVerifications
    .filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + (p.dealAmount || 0), 0);

  const presentCount = teamMembers.filter((m) => m.attendanceStatus === 'PRESENT').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>Master Administrator,</Text>
          <Text style={styles.nameText}>{currentUser?.name || 'Super Admin'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>FULL ENTERPRISE ACCESS</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* 4 Metric Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Users size={16} color={Colors.info} />
          <Text style={styles.statNumber}>{teamMembers.length}</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </View>

        <View style={styles.statBox}>
          <Clock size={16} color={Colors.secondaryDark} />
          <Text style={styles.statNumber}>{presentCount}</Text>
          <Text style={styles.statLabel}>Present Today</Text>
        </View>

        <View style={styles.statBox}>
          <AlertTriangle size={16} color={Colors.warning} />
          <Text style={styles.statNumber}>{pendingPayments.length}</Text>
          <Text style={styles.statLabel}>Pending Audits</Text>
        </View>

        <View style={styles.statBox}>
          <Award size={16} color={Colors.success} />
          <Text style={styles.statNumber}>₹{(totalRevenue / 100000).toFixed(1)}L</Text>
          <Text style={styles.statLabel}>Verified Revenue</Text>
        </View>
      </View>

      {/* Quick Nav: Won Deals Ledger */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Ledger')}
        style={styles.ledgerBtn}
      >
        <View style={styles.ledgerIcon}>
          <Award size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ledgerTitle}>Payment Verifications & Ledger</Text>
          <Text style={styles.ledgerSub}>
            {pendingPayments.length} won deals awaiting audit verification
          </Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </TouchableOpacity>

      {/* Needs Your Attention Section */}
      <View style={styles.attentionCard}>
        <View style={styles.attentionHeader}>
          <Text style={styles.attentionTitle}>Needs Your Attention</Text>
          <Text style={styles.attentionBadge}>Real-time alerts</Text>
        </View>

        {isNonWorkingDay ? (
          <View style={styles.emptyAttention}>
            <Calendar size={20} color={Colors.secondaryDark} />
            <Text style={styles.emptyAttentionText}>
              ✨ Today is {isTodayWeeklyOff ? 'Weekly Off (Sunday)' : todayHoliday?.name || 'Company Holiday'} — Floor operations are on scheduled rest.
            </Text>
          </View>
        ) : awayWithoutLeave.length === 0 && pendingPayments.length === 0 ? (
          <View style={styles.emptyAttention}>
            <CheckCircle2 size={20} color={Colors.success} />
            <Text style={styles.emptyAttentionText}>
              ✨ All clear! No pending audits or absent alerts right now.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {/* Pending Payments Alert */}
            {pendingPayments.map((p) => (
              <View key={p.id} style={styles.alertCardWarning}>
                <View style={styles.alertIconYellow}>
                  <Award size={14} color={Colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {p.telecallerName || 'Representative'} closed ₹{p.dealAmount?.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.alertSub}>{p.companyName || p.leadName} • Awaiting Audit</Text>
                </View>
              </View>
            ))}

            {/* Absent Employees Alert */}
            {awayWithoutLeave.map((m) => (
              <View key={m.id} style={styles.alertCardDanger}>
                <View style={styles.alertIconRed}>
                  <AlertTriangle size={14} color={Colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitleDanger}>{m.name} is Absent</Text>
                  <Text style={styles.alertSubDanger}>No approved leave logged in system</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  greetingText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  roleBadge: {
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.secondaryDark,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 2,
  },
  ledgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  ledgerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
  },
  ledgerSub: {
    fontSize: 11,
    color: Colors.primary,
    opacity: 0.8,
  },
  actionArrow: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },
  attentionCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  attentionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  attentionBadge: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  emptyAttention: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  emptyAttentionText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  alertCardWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warning,
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  alertIconYellow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  alertSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  alertCardDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  alertIconRed: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitleDanger: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.danger,
  },
  alertSubDanger: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
