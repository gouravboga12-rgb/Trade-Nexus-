import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { useLeadsScreenSecurity } from '../../hooks/useScreenSecurity';
import { AssignedLead } from '../../types';
import {
  PhoneCall,
  Search,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Award,
} from 'lucide-react-native';

export const TelecallerCallingScreen: React.FC = () => {
  const { currentUser, assignedLeads, openCallModalForLead, triggerToast } = useApp();

  // Enforce Android FLAG_SECURE: blocks screenshots & screen recordings exclusively on this Leads screen
  useLeadsScreenSecurity(currentUser?.role);

  const [searchQuery, setSearchQuery] = useState('');
  type StatusFilter = 'ALL' | 'FRESH' | 'INTERESTED' | 'CALLBACK' | 'CONVERTED' | 'BUSY' | 'NOT_INTERESTED';
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');

  // Filter leads allocated strictly to this telecaller
  const myLeads = useMemo(() => {
    const validIds = new Set(
      [currentUser?.id, currentUser?.employeeId, currentUser?.empCode].filter(Boolean)
    );
    const validName = (currentUser?.name || '').trim().toLowerCase();

    return assignedLeads.filter((l) => {
      const matchesId = l.assignedToEmployeeId && validIds.has(l.assignedToEmployeeId);
      const matchesName = validName && l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === validName;
      return matchesId || matchesName;
    });
  }, [assignedLeads, currentUser]);

  const filteredLeads = useMemo(() => {
    return myLeads.filter((l) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.company && l.company.toLowerCase().includes(q));

      const matchesStatus =
        activeFilter === 'ALL'
          ? true
          : activeFilter === 'FRESH'
          ? (l.callCount || 0) === 0 && l.status !== 'CONVERTED'
          : l.status === activeFilter;

      return matchesQ && matchesStatus;
    });
  }, [myLeads, searchQuery, activeFilter]);

  const handleCall = (lead: AssignedLead) => {
    openCallModalForLead(lead);
    if (lead.phone) {
      Linking.openURL(`tel:${lead.phone}`).catch(() => {
        triggerToast('Could not launch phone dialer');
      });
    }
  };

  const filterTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: myLeads.length },
    { id: 'FRESH', label: 'Fresh', count: myLeads.filter((l) => (l.callCount || 0) === 0 && l.status !== 'CONVERTED').length },
    { id: 'INTERESTED', label: 'Interested', count: myLeads.filter((l) => l.status === 'INTERESTED').length },
    { id: 'CALLBACK', label: 'Call Later', count: myLeads.filter((l) => l.status === 'CALLBACK').length },
    { id: 'CONVERTED', label: 'Won Deals', count: myLeads.filter((l) => l.status === 'CONVERTED').length },
    { id: 'BUSY', label: 'No Answer', count: myLeads.filter((l) => l.status === 'BUSY').length },
    { id: 'NOT_INTERESTED', label: 'Not Interested', count: myLeads.filter((l) => l.status === 'NOT_INTERESTED').length },
  ];

  return (
    <View style={styles.container}>
      {/* Header with Security Badge */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Daily Calling Desk</Text>
          <View style={styles.secureBadge}>
            <ShieldCheck size={12} color={Colors.secondary} />
            <Text style={styles.secureText}>Protected View (FLAG_SECURE Active)</Text>
          </View>
        </View>
        <View style={styles.leadsCountBox}>
          <Text style={styles.leadsCountNum}>{filteredLeads.length}</Text>
          <Text style={styles.leadsCountLabel}>Leads</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by phone, name, or company..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScrollWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const active = activeFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.id)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label}
                </Text>
                <View style={[styles.filterCountBadge, active && styles.filterCountBadgeActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {item.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <PhoneCall size={36} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Leads in this Queue</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No results matching "${searchQuery}"`
                : 'All clear in this disposition filter!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isWon = item.status === 'CONVERTED';
          const isFresh = (item.callCount || 0) === 0 && !isWon;
          return (
            <View
              style={[
                styles.leadCard,
                isWon && { borderColor: Colors.success, backgroundColor: Colors.successLight },
                item.status === 'INTERESTED' && { borderColor: Colors.info, backgroundColor: Colors.infoLight },
                item.status === 'CALLBACK' && { borderColor: Colors.warning, backgroundColor: Colors.warningLight },
              ]}
            >
              <View style={styles.leadHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{item.name}</Text>
                  {item.company ? <Text style={styles.leadCompany}>{item.company}</Text> : null}
                </View>
                <Text
                  style={[
                    styles.leadStatusPill,
                    isWon && { backgroundColor: Colors.success, color: '#FFFFFF' },
                    item.status === 'INTERESTED' && { backgroundColor: Colors.info, color: '#FFFFFF' },
                  ]}
                >
                  {isWon ? 'Won Deal' : isFresh ? 'Fresh' : item.status.replace('_', ' ')}
                </Text>
              </View>

              {/* Phone & Calls */}
              <View style={styles.phoneRow}>
                <Text style={styles.leadPhone}>{item.phone || '—'}</Text>
                <Text style={styles.leadDials}>📞 {item.callCount || 0} Dials</Text>
              </View>

              {item.notes ? (
                <Text style={styles.leadNotes} numberOfLines={2}>
                  💬 "{item.notes}"
                </Text>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => handleCall(item)}
                  style={styles.callNowBtn}
                >
                  <Phone size={14} color={Colors.primary} />
                  <Text style={styles.callNowText}>Call Lead</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openCallModalForLead(item)}
                  style={styles.logResultBtn}
                >
                  <CheckCircle2 size={14} color={Colors.secondaryDark} />
                  <Text style={styles.logResultText}>Log Result</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.primary,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  secureText: {
    fontSize: 10,
    color: Colors.secondary,
    fontWeight: '700',
  },
  leadsCountBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  leadsCountNum: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.secondary,
  },
  leadsCountLabel: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    margin: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
  },
  filterScrollWrapper: {
    marginBottom: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterCountBadge: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  filterCountBadgeActive: {
    backgroundColor: Colors.secondary,
  },
  filterCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  filterCountTextActive: {
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  leadCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  leadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  leadName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  leadCompany: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  leadStatusPill: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
    color: Colors.textSecondary,
  },
  phoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  leadPhone: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  leadDials: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  leadNotes: {
    fontSize: 11,
    color: Colors.textSecondary,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  callNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  callNowText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primary,
  },
  logResultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  logResultText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

