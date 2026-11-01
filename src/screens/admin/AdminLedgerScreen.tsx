import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Award, CheckCircle2, Clock, XCircle } from 'lucide-react-native';

export const AdminLedgerScreen: React.FC = () => {
  const { paymentVerifications, refreshAllData, triggerToast } = useApp();
  const [actingId, setActingId] = React.useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      await api.updatePayment(id, { status: 'VERIFIED' });
      await refreshAllData();
      triggerToast('✓ Payment verified and added to company sales ledger');
    } catch (err: any) {
      triggerToast(err?.message || 'Verification failed');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    try {
      await api.updatePayment(id, { status: 'REJECTED' });
      await refreshAllData();
      triggerToast('Payment rejected');
    } catch (err: any) {
      triggerToast(err?.message || 'Rejection failed');
    } finally {
      setActingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={paymentVerifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Award size={40} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Payment Records</Text>
            <Text style={styles.emptySub}>Won deals submitted by telecallers will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'PENDING_HR_AUDIT';
          const isVerified = item.status === 'VERIFIED';
          const isProcessing = actingId === item.id;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName}>{item.companyName || item.leadName}</Text>
                  <Text style={styles.telecallerName}>Closed by {item.telecallerName || 'Representative'}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    isVerified && { backgroundColor: Colors.successLight },
                    isPending && { backgroundColor: Colors.warningLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isVerified && { color: Colors.success },
                      isPending && { color: Colors.warning },
                    ]}
                  >
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              {/* Amount & Mode */}
              <View style={styles.amountBox}>
                <View>
                  <Text style={styles.amountLabel}>Deal Amount</Text>
                  <Text style={styles.amountVal}>₹{item.dealAmount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amountLabel}>UTR / Reference</Text>
                  <Text style={styles.refVal}>{item.utrNumber || 'TXN-DIRECT'}</Text>
                </View>
              </View>

              {/* Banking & UPI Details */}
              {item.customerUpiId ? (
                <Text style={styles.bankDetail}>UPI: {item.customerUpiId}</Text>
              ) : item.customerAccountNumber ? (
                <Text style={styles.bankDetail}>
                  Bank: {item.customerBankName || 'Bank Wire'} • A/C: {item.customerAccountNumber} ({item.customerIfscCode})
                </Text>
              ) : null}

              {/* Audit Actions */}
              {isPending && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => handleReject(item.id)}
                    disabled={isProcessing}
                    style={styles.rejectBtn}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleApprove(item.id)}
                    disabled={isProcessing}
                    style={styles.verifyBtn}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={styles.verifyText}>Verify Payment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.primary,
  },
  telecallerName: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.borderLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  amountVal: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary,
  },
  refVal: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  bankDetail: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: Colors.dangerLight,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.danger,
  },
  verifyBtn: {
    flex: 2,
    backgroundColor: Colors.secondary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
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
  },
});
