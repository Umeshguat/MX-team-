import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL } from '../config';
import BackButton from '../components/BackButton';
import { useTheme } from '../theme/ThemeContext';

const PAGE_LIMIT = 10;

export default function SalesListScreen({ user, onGoBack }) {
  const { theme, isDark } = useTheme();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    headquarter_name: '',
    phone_number: '',
    password: '',
  });

  const updateField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const resetForm = () => setForm({
    full_name: '',
    email: '',
    headquarter_name: '',
    phone_number: '',
    password: '',
  });

  const openAddModal = () => {
    setEditingId(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingId(item._id);
    setForm({
      full_name: item.full_name || '',
      email: item.email || '',
      headquarter_name: item.headquarter_name || '',
      phone_number: item.phone_number || '',
      password: '',
    });
    setModalVisible(true);
  };

  const handleAddSales = async () => {
    const requiredOk = editingId
      ? form.full_name && form.email && form.headquarter_name && form.phone_number
      : form.full_name && form.email && form.headquarter_name && form.phone_number && form.password;
    if (!requiredOk) {
      Alert.alert('Validation', 'Please fill all fields');
      return;
    }
    try {
      setSubmitting(true);
      const token = user && user.token ? user.token : '';
      const distributor_id = (user && (user._id || user.id)) || '';
      const body = { ...form, distributor_id };
      if (editingId && !body.password) delete body.password;
      const url = editingId
        ? `${BASE_URL}/api/employees/${editingId}`
        : `${BASE_URL}/api/employees/sales`;
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let result = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        console.log('Sales add parse error:', parseErr, 'raw:', text);
        Alert.alert('Error', `Server returned invalid response (${response.status})`);
        return;
      }
      if (response.ok && (result.status === 200 || result.status === 201 || result.success)) {
        Alert.alert('Success', result.message || (editingId ? 'Updated' : 'Sales employee added'));
        setModalVisible(false);
        setEditingId(null);
        resetForm();
        fetchSales(1, false);
      } else {
        Alert.alert('Error', result.message || 'Failed');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSales = (item) => {
    Alert.alert(
      'Delete',
      `Delete ${item.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(item._id);
              const token = user && user.token ? user.token : '';
              const response = await fetch(`${BASE_URL}/api/employees/${item._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
              });
              const result = await response.json().catch(() => ({}));
              if (response.ok && (result.status === 200 || result.success !== false)) {
                setSales((prev) => prev.filter((s) => s._id !== item._id));
              } else {
                Alert.alert('Error', result.message || 'Failed to delete');
              }
            } catch (e) {
              Alert.alert('Error', e.message || 'Something went wrong');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const fetchSales = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const url = `${BASE_URL}/api/employees/sales?page=${pageNum}&limit=${PAGE_LIMIT}`;
      const response = await fetch(url, { headers });
      const result = await response.json();
      const list = result.data || result.sales || [];
      const safeList = Array.isArray(list) ? list : [];
      setSales((prev) => (append ? [...prev, ...safeList] : safeList));
      setPage((result.pagination && result.pagination.page) || result.page || pageNum);
      setTotalPages((result.pagination && result.pagination.totalPages) || result.totalPages || 1);
      setTotal((result.pagination && result.pagination.total) || result.total || (Array.isArray(list) ? list.length : 0));
    } catch (e) {
      console.log('Sales fetch error:', e);
      if (!append) setSales([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user, refreshing]);

  useEffect(() => {
    fetchSales(1, false);
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSales(1, false);
  };

  const onEndReached = () => {
    if (loadingMore || loading) return;
    if (page >= totalPages) return;
    fetchSales(page + 1, true);
  };

  const filtered = sales.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (s.full_name || s.name || s.employee_name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const mobile = (s.phone_number || s.mobile || s.phone || '').toString().toLowerCase();
    const hq = (s.headquarter_name || '').toLowerCase();
    return name.includes(q) || email.includes(q) || mobile.includes(q) || hq.includes(q);
  });

  const renderItem = ({ item }) => {
    const name = item.full_name || item.name || item.employee_name || '--';
    const phone = item.phone_number || item.mobile || item.phone;
    const designation = item.designation_id && item.designation_id.designation_name;
    return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        borderLeftWidth: 4,
        borderLeftColor: theme.info,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.info + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }} numberOfLines={1}>{name}</Text>
            {phone ? (
              <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>{phone}</Text>
            ) : null}
          </View>
        </View>
        {item.headquarter_name ? (
          <View style={{ backgroundColor: theme.infoBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.info }}>{item.headquarter_name}</Text>
          </View>
        ) : null}
      </View>

      {item.email ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, marginRight: 6 }}>✉️</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={1}>{item.email}</Text>
        </View>
      ) : null}

      {designation ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, marginRight: 6 }}>🪪</Text>
          <Text style={{ fontSize: 12, color: theme.textTertiary }}>{designation}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: '#1976d222',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, color: '#1976d2' }}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={deletingId === item._id}
          onPress={() => handleDeleteSales(item)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: '#e5393522',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: deletingId === item._id ? 0.6 : 1,
          }}
          activeOpacity={0.7}
        >
          {deletingId === item._id ? (
            <ActivityIndicator size="small" color="#e53935" />
          ) : (
            <Text style={{ fontSize: 14 }}>🗑</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LinearGradient colors={[theme.gradient1, theme.gradient2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 22,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
      }}>
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -30 }} />
        <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', top: 70, left: -50 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          {onGoBack ? <BackButton onPress={onGoBack} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>Sales Team</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{loading ? '...' : `${total} sales found`}</Text>
          </View>
          <TouchableOpacity
            onPress={openAddModal}
            style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: -2 }}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{total}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Total</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{page}/{totalPages}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Page</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ marginHorizontal: 16, marginTop: -18, zIndex: 10 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.surface,
          borderRadius: 16,
          paddingHorizontal: 14,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
        }}>
          <Text style={{ fontSize: 18, marginRight: 10 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, paddingVertical: 14, fontSize: 14, color: theme.text }}
            placeholder="Search by name, email, mobile..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Text style={{ fontSize: 18, color: theme.textTertiary }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => (item._id || item.id || String(idx))}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Text style={{ fontSize: 14, color: theme.textTertiary }}>No sales found</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View
            style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '90%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, flex: 1 }}>
                {editingId ? 'Edit Sales Employee' : 'Add Sales Employee'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 22, color: theme.textTertiary }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {[
                { key: 'full_name', label: 'Full Name', placeholder: 'Enter full name' },
                { key: 'email', label: 'Email', placeholder: 'Enter email', keyboardType: 'email-address' },
                { key: 'phone_number', label: 'Phone Number', placeholder: 'Enter phone', keyboardType: 'phone-pad' },
                { key: 'headquarter_name', label: 'Headquarter', placeholder: 'Enter headquarter' },
                { key: 'password', label: editingId ? 'Password (leave blank to keep)' : 'Password', placeholder: 'Enter password', secure: true },
              ].map((f) => (
                <View key={f.key} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textTertiary, marginBottom: 6 }}>
                    {f.label}
                  </Text>
                  <TextInput
                    value={form[f.key]}
                    onChangeText={(v) => updateField(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={theme.textTertiary}
                    secureTextEntry={f.secure}
                    keyboardType={f.keyboardType || 'default'}
                    autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: theme.text,
                      fontSize: 14,
                      borderWidth: 1,
                      borderColor: theme.border || 'rgba(0,0,0,0.08)',
                    }}
                  />
                </View>
              ))}
              <TouchableOpacity
                disabled={submitting}
                onPress={handleAddSales}
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 8,
                  marginBottom: 20,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.buttonText} />
                ) : (
                  <Text style={{ color: theme.buttonText, fontWeight: '700', fontSize: 15 }}>
                    {editingId ? 'Update Sales Employee' : 'Add Sales Employee'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
