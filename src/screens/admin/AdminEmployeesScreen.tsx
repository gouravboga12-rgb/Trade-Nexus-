import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Users, Search, Plus, KeyRound } from 'lucide-react-native';

export const AdminEmployeesScreen: React.FC = () => {
  const { teamMembers, refreshAllData, triggerToast } = useApp();
  const [search, setSearch] = useState('');

  const filteredMembers = teamMembers.filter((m) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.empCode && m.empCode.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={16} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees by name, role, empCode..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.name || 'TM').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.role}>{item.role || 'Staff'} • {item.empCode || 'TNX-00'}</Text>
                <Text style={styles.email}>{item.email || 'No email'}</Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  item.attendanceStatus === 'PRESENT' && { backgroundColor: Colors.successLight },
                  item.attendanceStatus === 'ABSENT' && { backgroundColor: Colors.dangerLight },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    item.attendanceStatus === 'PRESENT' && { color: Colors.success },
                    item.attendanceStatus === 'ABSENT' && { color: Colors.danger },
                  ]}
                >
                  {(item.attendanceStatus || 'OFF').replace('_', ' ')}
                </Text>
              </View>
            </View>

            {/* Performance Row */}
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{item.dialsToday || 0}</Text>
                <Text style={styles.metricLbl}>Dials</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{item.interested || 0}</Text>
                <Text style={styles.metricLbl}>Interested</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>₹{((item.salesAchieved || 0) / 1000).toFixed(0)}k</Text>
                <Text style={styles.metricLbl}>Revenue</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    margin: 16,
    marginBottom: 8,
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
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.secondary,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  role: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  email: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: 'monospace',
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
  metricRow: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    padding: 10,
    borderRadius: 12,
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.primary,
  },
  metricLbl: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 1,
  },
});

