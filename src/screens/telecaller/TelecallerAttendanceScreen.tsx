import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Clock,
  Shield,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';

export const TelecallerAttendanceScreen: React.FC = () => {
  const { currentUser, punchInToday, attendanceRecords, calendarSettings, weeklyOffDays } = useApp();
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locStatus, setLocStatus] = useState<string>('Detecting location...');

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocStatus('Location permission denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setLocStatus(`GPS Locked: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      } catch (err: any) {
        setLocStatus('Could not acquire GPS fix');
      }
    })();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceRecords.find(
    (r) =>
      r.date === todayStr &&
      (r.employeeId === currentUser?.employeeId || r.employeeId === currentUser?.id)
  );

  const handlePunchIn = async () => {
    setLoading(true);
    await punchInToday(coords || undefined);
    setLoading(false);
  };

  const dayOfWeek = new Date().getDay();
  const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerIconCircle}>
          <Clock size={24} color={Colors.secondary} />
        </View>
        <Text style={styles.headerTitle}>Attendance & Geofence</Text>
        <Text style={styles.headerSub}>Official Shift Timing: {calendarSettings?.shiftStartTime || '09:00 AM'} - {calendarSettings?.shiftEndTime || '05:30 PM'}</Text>
      </View>

      {/* Weekly Off / Holiday Alert */}
      {isWeeklyOff && (
        <View style={styles.offDayBanner}>
          <Calendar size={18} color={Colors.info} />
          <View style={{ flex: 1 }}>
            <Text style={styles.offDayTitle}>Today is Weekly Off (Sunday)</Text>
            <Text style={styles.offDaySub}>Operations are scheduled for rest. Attendance is optional.</Text>
          </View>
        </View>
      )}

      {/* Status Box */}
      <View style={styles.statusBox}>
        <Text style={styles.boxTitle}>Today's Punch Status</Text>
        {todayRecord ? (
          <View style={styles.punchedState}>
            <CheckCircle2 size={36} color={Colors.success} />
            <Text style={styles.punchedTitle}>Punched In Successfully</Text>
            <Text style={styles.punchedTime}>Checked in at {todayRecord.checkIn || '09:15 AM'}</Text>
            <View style={styles.methodTag}>
              <Text style={styles.methodText}>Method: {todayRecord.method || 'Mobile Biometric'}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.unpunchedState}>
            <AlertCircle size={36} color={Colors.warning} />
            <Text style={styles.unpunchedTitle}>Not Checked In Today</Text>
            <Text style={styles.unpunchedSub}>Please punch in to begin your shift operations</Text>

            <TouchableOpacity
              onPress={handlePunchIn}
              disabled={loading}
              style={[styles.punchBtn, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={styles.punchBtnText}>Check In with Geofence</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Geofence Status */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <MapPin size={16} color={Colors.secondaryDark} />
          <Text style={styles.infoTitle}>Office Geofence Radius</Text>
        </View>
        <Text style={styles.infoDesc}>{locStatus}</Text>
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
  headerCard: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 201, 167, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '700',
    marginTop: 4,
  },
  offDayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.infoLight,
    borderWidth: 1,
    borderColor: Colors.info,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  offDayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.info,
  },
  offDaySub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBox: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  boxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 14,
  },
  punchedState: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  punchedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.success,
  },
  punchedTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  methodTag: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  unpunchedState: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  unpunchedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.warning,
  },
  unpunchedSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  punchBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  punchBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  infoDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
});

