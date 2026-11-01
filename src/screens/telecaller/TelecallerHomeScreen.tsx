import React from 'react';
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
  PhoneCall,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  LogOut,
  MapPin,
  Calendar,
} from 'lucide-react-native';

export const TelecallerHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentUser, stats, logout, refreshAllData, assignedLeads } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  };

  const myLeads = assignedLeads.filter(
    (l) =>
      l.assignedToEmployeeId === currentUser?.employeeId ||
      l.assignedToEmployeeId === currentUser?.id ||
      (currentUser?.name && l.assignedToEmployeeName?.toLowerCase() === currentUser.name.toLowerCase())
  );

  const freshLeadsCount = myLeads.filter((l) => (l.callCount || 0) === 0 && l.status !== 'CONVERTED').length;
  const wonDealsCount = myLeads.filter((l) => l.status === 'CONVERTED').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.nameText}>{currentUser?.name || 'Telecaller'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>TELECALLER DESK</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Target Progress Card */}
      <View style={styles.targetCard}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetTitle}>Today's Call Target</Text>
          <Text style={styles.targetValue}>
            {stats.dialsMade} / {stats.todayGoalCalls} Dials
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.round((stats.dialsMade / Math.max(1, stats.todayGoalCalls)) * 100))}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((stats.dialsMade / Math.max(1, stats.todayGoalCalls)) * 100)}% of daily quota completed
        </Text>
      </View>

      {/* 4 Metric Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <View style={[styles.statIconCircle, { backgroundColor: Colors.infoLight }]}>
            <PhoneCall size={16} color={Colors.info} />
          </View>
          <Text style={styles.statNumber}>{stats.dialsMade}</Text>
          <Text style={styles.statLabel}>Dials Made</Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconCircle, { backgroundColor: Colors.secondaryLight }]}>
            <CheckCircle2 size={16} color={Colors.secondaryDark} />
          </View>
          <Text style={styles.statNumber}>{stats.connected}</Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconCircle, { backgroundColor: Colors.warningLight }]}>
            <Clock size={16} color={Colors.warning} />
          </View>
          <Text style={styles.statNumber}>{stats.interested}</Text>
          <Text style={styles.statLabel}>Interested</Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconCircle, { backgroundColor: Colors.successLight }]}>
            <Award size={16} color={Colors.success} />
          </View>
          <Text style={styles.statNumber}>{wonDealsCount}</Text>
          <Text style={styles.statLabel}>Won Deals</Text>
        </View>
      </View>

      {/* Quick Action: Start Calling */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Calling')}
        style={styles.actionCallBtn}
      >
        <View style={styles.actionCallIcon}>
          <PhoneCall size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionCallTitle}>Launch Calling Desk</Text>
          <Text style={styles.actionCallSub}>
            {freshLeadsCount} fresh leads ready in your pipeline
          </Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </TouchableOpacity>

      {/* Quick Action: Biometric Punch In */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Attendance')}
        style={styles.actionAttBtn}
      >
        <View style={styles.actionAttIcon}>
          <MapPin size={20} color={Colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionAttTitle}>Office Attendance Punch-In</Text>
          <Text style={styles.actionAttSub}>Check-in with Geofence & Selfie Verification</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </TouchableOpacity>
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
  targetCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  targetValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.secondary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
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
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 2,
  },
  actionCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  actionCallIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCallTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.primary,
  },
  actionCallSub: {
    fontSize: 11,
    color: Colors.primary,
    opacity: 0.8,
  },
  actionAttBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  actionAttIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionAttTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  actionAttSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionArrow: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },
});

