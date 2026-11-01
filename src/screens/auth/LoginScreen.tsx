import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { Shield, Lock, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react-native';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'hr' | 'team_leader' | 'telecaller'>('telecaller');

  const handleRolePreset = (role: 'admin' | 'hr' | 'team_leader' | 'telecaller') => {
    setSelectedRole(role);
    if (role === 'admin') setEmail('admin@tradenexus.com');
    else if (role === 'hr') setEmail('hr@tradenexus.com');
    else if (role === 'team_leader') setEmail('leader@tradenexus.com');
    else setEmail('telecaller@tradenexus.com');
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    await login(email.trim(), password);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../../../assets/logo-icon.png')}
            style={{ width: 68, height: 68, resizeMode: 'contain', marginBottom: 12 }}
          />
          <Text style={styles.brandTitle}>TRADE NEXUS</Text>
          <Text style={styles.brandSubtitle}>TRADE SMART • ENTERPRISE OPERATING SYSTEM</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In to Portal</Text>
          <Text style={styles.cardSubtitle}>Select your account role to authenticate</Text>

          {/* Role Presets */}
          <View style={styles.roleGrid}>
            {[
              { id: 'telecaller', label: 'Telecaller' },
              { id: 'team_leader', label: 'Team Leader' },
              { id: 'hr', label: 'HR' },
              { id: 'admin', label: 'Admin' },
            ].map((r) => {
              const active = selectedRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => handleRolePreset(r.id as any)}
                  style={[styles.roleBtn, active && styles.roleBtnActive]}
                >
                  <Text style={[styles.roleText, active && styles.roleTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Email Input */}
          <Text style={styles.inputLabel}>Official Email</Text>
          <View style={styles.inputContainer}>
            <Mail size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. employee@tradenexus.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.textInput}
              placeholder="Enter your secret password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={16} color={Colors.textSecondary} />
              ) : (
                <Eye size={16} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Access Workspace</Text>
            )}
          </TouchableOpacity>

          <View style={styles.securityNotice}>
            <CheckCircle size={14} color={Colors.secondaryDark} />
            <Text style={styles.securityText}>
              Protected with Encrypted Biometric & Session Storage
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 201, 167, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 16,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  roleBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryLight,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  roleTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
  },
  loginBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  securityText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

