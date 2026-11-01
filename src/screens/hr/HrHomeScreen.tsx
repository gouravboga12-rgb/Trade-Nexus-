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
  Users,
  Clock,
  Calendar,
  LogOut,
  Award,
  CheckCircle2,
} from 'lucide-react-native';

export const HrHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentUser, teamMembers, logout, refreshAllData } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  };

  const presentCount = teamMembers.filter((m) => m.attendanceStatus === 'PRESENT').length;
  const onLeaveCount = teamMembers.filter((m) => m.attendanceStatus === 'ON_LEAVE').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>HR & Operations Desk,</Text>
          <Text style={styles.nameText}>{currentUser?.name || 'HR Manager'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>PEOPLE & OPERATIONS</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* 3 Metric Cards */}
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
          <Calendar size={16} color={Colors.warning} />
          <Text style={styles.statNumber}>{onLeaveCount}</Text>
          <Text style={styles.statLabel}>On Leave</Text>
        </View>
      </View>

      {/* Staff Directory List */}
      <View style={styles.directoryCard}>
        <Text style={styles.cardTitle}>Employee Directory & Live Attendance</Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {teamMembers.map((emp) => (
            <View key={emp.id} style={styles.empRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(emp.name || 'EM').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{emp.name}</Text>
                <Text style={styles.empRole}>{emp.role || 'Staff'} • {emp.empCode || 'TNX-00'}</Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  emp.attendanceStatus === 'PRESENT' && { backgroundColor: Colors.successLight },
                  emp.attendanceStatus === 'ABSENT' && { backgroundColor: Colors.dangerLight },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    emp.attendanceStatus === 'PRESENT' && { color: Colors.success },
                    emp.attendanceStatus === 'ABSENT' && { color: Colors.danger },
                  ]}
                >
                  {(emp.attendanceStatus || 'OFF').replace('_', ' ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
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
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
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
  directoryCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    padding: 10,
    borderRadius: 14,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.secondary,
  },
  empName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  empRole: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.borderLight,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
});

