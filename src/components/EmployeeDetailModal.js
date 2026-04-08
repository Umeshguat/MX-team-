import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';

export default function EmployeeDetailModal({ visible, employeeId, token, onClose }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !employeeId) return;
    let cancelled = false;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError('');
        setData(null);
        const response = await fetch(`${BASE_URL}/api/employees/${employeeId}`, {
          headers: {
            'Authorization': 'Bearer ' + (token || ''),
            'Content-Type': 'application/json',
          },
        });
        const result = await response.json().catch(() => ({}));
        if (cancelled) return;
        if ((result.status === 200 || response.ok) && result.data) {
          setData(result.data);
        } else {
          setError(result.message || 'Failed to load details');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [visible, employeeId, token]);

  const formatDate = (d) => {
    if (!d) return '--';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
    } catch (_) {
      return String(d);
    }
  };

  const Row = ({ icon, label, value, onPress }) => (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border || 'rgba(0,0,0,0.06)',
      }}
    >
      <Text style={{ fontSize: 16, marginRight: 10 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: theme.textTertiary, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 14, color: theme.text, marginTop: 2 }}>{value || '--'}</Text>
      </View>
    </TouchableOpacity>
  );

  const roleName = data && data.role_id && (data.role_id.role_name || data.role_id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '85%',
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={[theme.gradient1, theme.gradient2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
                Employee Details
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 26, color: '#FFFFFF' }}>×</Text>
              </TouchableOpacity>
            </View>
            {data ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                  }}
                >
                  <Text style={{ fontSize: 28, color: '#FFFFFF', fontWeight: '800' }}>
                    {(data.full_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
                    {data.full_name || '--'}
                  </Text>
                  {roleName ? (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        borderRadius: 10,
                        marginTop: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '700' }}>{roleName}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
          </LinearGradient>

          <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ marginTop: 10, color: theme.textTertiary, fontSize: 13 }}>Loading...</Text>
              </View>
            ) : error ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 32 }}>⚠️</Text>
                <Text style={{ marginTop: 10, color: theme.textSecondary, fontSize: 14 }}>{error}</Text>
              </View>
            ) : data ? (
              <View>
                <Row
                  icon="📞"
                  label="Phone"
                  value={data.phone_number}
                  onPress={data.phone_number ? () => Linking.openURL('tel:' + data.phone_number) : null}
                />
                <Row
                  icon="✉️"
                  label="Email"
                  value={data.email}
                  onPress={data.email ? () => Linking.openURL('mailto:' + data.email) : null}
                />
                <Row icon="🏢" label="Headquarter" value={data.headquarter_name} />
                <Row icon="🪪" label="Role" value={roleName} />
                <Row icon="🆔" label="Employee ID" value={data._id} />
                <Row icon="📅" label="Created At" value={formatDate(data.createdAt)} />
                <Row icon="🔄" label="Updated At" value={formatDate(data.updatedAt)} />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
