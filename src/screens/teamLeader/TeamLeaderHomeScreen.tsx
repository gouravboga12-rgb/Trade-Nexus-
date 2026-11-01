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
  PhoneCall,
  Award,
  TrendingUp,
  LogOut,
  Clock,
} from 'lucide-react-native';

export const TeamLeaderHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentUser, teamMembers, logout, refreshAllData, assignedLeads, paymentVerifications } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  };

  const callingStaff = teamMembers.filter((m) => m.portal === 'telecaller' || m.role?.toLowerCase().includes('telecaller'));
  const totalSquadDials = callingStaff.reduce((sum, m) => sum + (m.dialsToday || 0), 0);
  const totalSquadInterested = callingStaff.reduce((sum, m) => sum + (m.interested || 0), 0);

  const myLeads = assignedLeads.filter(
    (l) =>
      l.assignedToEmployeeId === currentUser?.employeeId ||
      l.assignedToEmployeeId === currentUser?.id ||
      (currentUser?.name && l.assignedToEmployeeName?.toLowerCase() === currentUser.name.toLowerCase())
  );
  const myWonDeals = myLeads.filter((l) => l.status === 'CONVERTED').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>Team Leader Command,</Text>
          <Text style={styles.nameText}>{currentUser?.name || 'Leader'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>SQUAD COMMAND & CLOSER</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* 4 Closer KPI Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Users size={16} color={Colors.info} />
          <Text style={styles.statNumber}>{callingStaff.length}</Text>
          <Text style={styles.statLabel}>Squad Staff</Text>
        </View>

        <View style={styles.statBox}>
          <PhoneCall size={16} color={Colors.secondaryDark} />
          <Text style={styles.statNumber}>{totalSquadDials}</Text>
          <Text style={styles.statLabel}>Squad Dials Today</Text>
        </View>

        <View style={styles.statBox}>
          <TrendingUp size={16} color={Colors.warning} />
          <Text style={styles.statNumber}>{totalSquadInterested}</Text>
          <Text style={styles.statLabel}>Squad Interested</Text>
        </View>

        <View style={styles.statBox}>
          <Award size={16} color={Colors.success} />
          <Text style={styles.statNumber}>{myWonDeals}</Text>
          <Text style={styles.statLabel}>My Won Deals</Text>
        </View>
      </View>

      {/* Launch Closer Desk */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Calling')}
        style={styles.actionCallBtn}
      >
        <View style={styles.actionCallIcon}>
          <PhoneCall size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionCallTitle}>My Closer Calling Desk</Text>
          <Text style={styles.actionCallSub}>
            {myLeads.length} leads assigned directly to your closer desk
          </Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </TouchableOpacity>

      {/* Squad Floor Roster Leaderboard */}
      <View style={styles.rosterCard}>
        <Text style={styles.rosterTitle}>Squad Real-time Floor Roster</Text>
        <Text style={styles.rosterSub}>Live dials and conversion rates</Text>

        <View style={{ gap: 8, marginTop: 12 }}>
          {callingStaff.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {(member.name || 'TM').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberStatus}>
                  {member.attendanceStatus || 'ABSENT'} • In: {member.checkInTime || '—'}
                </Text>
              </View>
              <View style={styles.dialsBadge}>
                <Text style={styles.dialsCount}>{member.dialsToday || 0}</Text>
                <Text style={styles.dialsLabel}>Dials</Text>
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
  actionCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 16,
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
  actionArrow: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },
  rosterCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rosterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  rosterSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    padding: 10,
    borderRadius: 14,
    gap: 10,
  },
  avatarCircle: {
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
  memberName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  memberStatus: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  dialsBadge: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dialsCount: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
  },
  dialsLabel: {
    fontSize: 8,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
});

