import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { CallOutcome } from '../../types';
import {
  X,
  PhoneCall,
  CheckCircle2,
  PhoneForwarded,
  PhoneOff,
  ThumbsDown,
  Award,
} from 'lucide-react-native';

export const QuickCallLogModal: React.FC = () => {
  const {
    isQuickCallModalOpen,
    setIsQuickCallModalOpen,
    activeCallingLead,
    setActiveCallingLead,
    updateAssignedLeadStatus,
  } = useApp();

  const [outcome, setOutcome] = useState<CallOutcome>('INTERESTED');
  const [dealAmount, setDealAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'BANK' | 'UPI'>('BANK');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerBankName, setCustomerBankName] = useState<string>('');
  const [customerAccountNumber, setCustomerAccountNumber] = useState<string>('');
  const [customerIfscCode, setCustomerIfscCode] = useState<string>('');
  const [customerUpiId, setCustomerUpiId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (activeCallingLead) {
      setNotes(activeCallingLead.notes || '');
      setCustomerName(activeCallingLead.customerName || activeCallingLead.name || '');
      setCustomerPhone(activeCallingLead.customerPhone || activeCallingLead.phone || '');
      setCustomerBankName(activeCallingLead.customerBankName || '');
      setCustomerAccountNumber(activeCallingLead.customerAccountNumber || '');
      setCustomerIfscCode(activeCallingLead.customerIfscCode || '');
      setCustomerUpiId(activeCallingLead.customerUpiId || '');
      if (activeCallingLead.customerUpiId) setPayMethod('UPI');
      setDealAmount(activeCallingLead.dealValue ? String(activeCallingLead.dealValue) : '');
      setOutcome(
        activeCallingLead.status === 'CONVERTED'
          ? 'DEAL_CLOSED'
          : activeCallingLead.status === 'CALLBACK'
            ? 'CALLBACK'
            : activeCallingLead.status === 'BUSY'
              ? 'BUSY'
              : activeCallingLead.status === 'NOT_INTERESTED'
                ? 'NOT_INTERESTED'
                : 'INTERESTED'
      );
    } else {
      setOutcome('INTERESTED');
      setDealAmount('');
      setNotes('');
      setFollowUpDate('');
    }
  }, [activeCallingLead, isQuickCallModalOpen]);

  if (!isQuickCallModalOpen) return null;

  const handleClose = () => {
    setIsQuickCallModalOpen(false);
    setActiveCallingLead(null);
  };

  const handleSubmit = async () => {
    if (!activeCallingLead || submitting) return;
    setSubmitting(true);

    try {
      const mappedStatus =
        outcome === 'DEAL_CLOSED'
          ? 'CONVERTED'
          : outcome === 'INTERESTED'
            ? 'INTERESTED'
            : outcome === 'CALLBACK'
              ? 'CALLBACK'
              : outcome === 'BUSY'
                ? 'BUSY'
                : outcome === 'NOT_INTERESTED'
                  ? 'NOT_INTERESTED'
                  : 'INTERESTED';

      const numericDeal = dealAmount.trim() ? Number(dealAmount) : undefined;

      await updateAssignedLeadStatus(
        activeCallingLead.id,
        mappedStatus,
        notes,
        mappedStatus === 'CONVERTED' ? numericDeal || 0 : undefined,
        mappedStatus === 'CALLBACK' ? followUpDate || 'Tomorrow, 11:00 AM' : undefined,
        mappedStatus === 'CONVERTED'
          ? {
            customerName: customerName.trim() || activeCallingLead.name,
            customerPhone: customerPhone.trim() || activeCallingLead.phone,
            customerBankName: payMethod === 'BANK' ? customerBankName.trim() : undefined,
            customerAccountNumber: payMethod === 'BANK' ? customerAccountNumber.trim() : undefined,
            customerIfscCode: payMethod === 'BANK' ? customerIfscCode.trim().toUpperCase() : undefined,
            customerUpiId: payMethod === 'UPI' ? customerUpiId.trim() : undefined,
          }
          : undefined
      );

      handleClose();
    } catch (err) {
      console.warn('Call submission failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const outcomeOptions: {
    id: CallOutcome;
    label: string;
    sublabel: string;
    icon: any;
    color: string;
    bgColor: string;
  }[] = [
      {
        id: 'INTERESTED',
        label: 'Interested',
        sublabel: 'Wants quote or proposal',
        icon: CheckCircle2,
        color: Colors.info,
        bgColor: Colors.infoLight,
      },
      {
        id: 'CALLBACK',
        label: 'Call Later',
        sublabel: 'Customer requested callback',
        icon: PhoneForwarded,
        color: Colors.warning,
        bgColor: Colors.warningLight,
      },
      {
        id: 'BUSY',
        label: 'No Answer / Busy',
        sublabel: 'Rang out or disconnected',
        icon: PhoneOff,
        color: Colors.textSecondary,
        bgColor: Colors.borderLight,
      },
      {
        id: 'NOT_INTERESTED',
        label: 'Not Interested',
        sublabel: 'Declined or invalid lead',
        icon: ThumbsDown,
        color: Colors.danger,
        bgColor: Colors.dangerLight,
      },
      {
        id: 'DEAL_CLOSED',
        label: 'Won Deal',
        sublabel: 'Payment agreed or verified',
        icon: Award,
        color: Colors.success,
        bgColor: Colors.successLight,
      },
    ];

  return (
    <Modal visible={isQuickCallModalOpen} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIcon}>
                <PhoneCall size={18} color={Colors.secondary} />
              </View>
              <View>
                <Text style={styles.titleText}>Record Call Result</Text>
                <Text style={styles.subtitleText}>Save what happened on this call</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Phone Badge */}
            {activeCallingLead && (
              <View style={styles.phoneBadge}>
                <View>
                  <Text style={styles.badgeLabel}>Target Lead Phone</Text>
                  <Text style={styles.phoneText}>{activeCallingLead.phone || '—'}</Text>
                </View>
                <Text style={styles.statusPill}>
                  {(activeCallingLead.status || 'Pending').replace('_', ' ')}
                </Text>
              </View>
            )}

            {/* Outcome Selection Buttons */}
            <Text style={styles.sectionLabel}>Call Outcome</Text>
            <View style={styles.outcomeGrid}>
              {outcomeOptions.map((opt) => {
                const IconComp = opt.icon;
                const isSelected = outcome === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setOutcome(opt.id)}
                    style={[
                      styles.outcomeCard,
                      isSelected && { borderColor: opt.color, backgroundColor: opt.bgColor },
                    ]}
                  >
                    <IconComp size={18} color={opt.color} />
                    <View style={styles.outcomeTextGroup}>
                      <Text style={[styles.outcomeLabel, isSelected && { color: opt.color }]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.outcomeSublabel}>{opt.sublabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Won Deal Extra Inputs */}
            {outcome === 'DEAL_CLOSED' && (
              <View style={styles.wonDealSection}>
                <Text style={styles.wonDealTitle}>🏆 Won Deal Details (Payment Audit)</Text>

                <Text style={styles.fieldLabel}>Deal Amount (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="e.g. 50000"
                  value={dealAmount}
                  onChangeText={setDealAmount}
                />

                <Text style={styles.fieldLabel}>Payment Method</Text>
                <View style={styles.payToggleRow}>
                  <TouchableOpacity
                    onPress={() => setPayMethod('BANK')}
                    style={[styles.payToggleBtn, payMethod === 'BANK' && styles.payToggleActive]}
                  >
                    <Text
                      style={[
                        styles.payToggleText,
                        payMethod === 'BANK' && styles.payToggleTextActive,
                      ]}
                    >
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPayMethod('UPI')}
                    style={[styles.payToggleBtn, payMethod === 'UPI' && styles.payToggleActive]}
                  >
                    <Text
                      style={[
                        styles.payToggleText,
                        payMethod === 'UPI' && styles.payToggleTextActive,
                      ]}
                    >
                      UPI Transfer
                    </Text>
                  </TouchableOpacity>
                </View>

                {payMethod === 'BANK' ? (
                  <>
                    <Text style={styles.fieldLabel}>Bank Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. HDFC Bank"
                      value={customerBankName}
                      onChangeText={setCustomerBankName}
                    />
                    <Text style={styles.fieldLabel}>Account Number</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Account number"
                      value={customerAccountNumber}
                      onChangeText={setCustomerAccountNumber}
                    />
                    <Text style={styles.fieldLabel}>IFSC Code</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. HDFC0001234"
                      autoCapitalize="characters"
                      value={customerIfscCode}
                      onChangeText={setCustomerIfscCode}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Customer UPI ID</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@okaxis / upi"
                      value={customerUpiId}
                      onChangeText={setCustomerUpiId}
                    />
                  </>
                )}
              </View>
            )}

            {/* Call Later Date */}
            {outcome === 'CALLBACK' && (
              <View style={styles.wonDealSection}>
                <Text style={styles.fieldLabel}>Callback Scheduled Date / Time</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Tomorrow, 11:30 AM"
                  value={followUpDate}
                  onChangeText={setFollowUpDate}
                />
              </View>
            )}

            {/* Call Notes */}
            <Text style={styles.fieldLabel}>Notes / Client Remarks</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              multiline
              placeholder="Record details of conversation..."
              value={notes}
              onChangeText={setNotes}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={styles.submitText}>Submit Call Log</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 12,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  subtitleText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    maxHeight: 460,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.borderLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  badgeLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  phoneText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusPill: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.secondaryDark,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  outcomeGrid: {
    gap: 8,
    marginBottom: 16,
  },
  outcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  outcomeTextGroup: {
    flex: 1,
  },
  outcomeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  outcomeSublabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  wonDealSection: {
    backgroundColor: Colors.borderLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wonDealTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.primary,
  },
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  payToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  payToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  payToggleActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryLight,
  },
  payToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  payToggleTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
});

