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

export default function DeliveryAgentListScreen({ user, onGoBack }) {
  const { theme, isDark } = useTheme();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const handleSubmit = async () => {
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
        : `${BASE_URL}/api/employees/delivery`;
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
        Alert.alert('Error', `Server returned invalid response (${response.status})`);
        return;
      }
      if (response.ok && (result.status === 200 || result.status === 201 || result.success)) {
        Alert.alert('Success', result.message || (editingId ? 'Updated' : 'Delivery agent added'));
        setModalVisible(false);
        setEditingId(null);
        resetForm();
        fetchAgents(1, false);
      } else {
        Alert.alert('Error', result.message || 'Failed');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
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
              const response = await fetch(`${BASE_URL}/api/employees/delivery/${item._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
              });
              const result = await response.json().catch(() => ({}));
              if (response.ok && (result.status === 200 || result.success !== false)) {
                setAgents((prev) => prev.filter((s) => s._id !== item._id));
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

  const fetchAgents = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const url = `${BASE_URL}/api/employees/delivery?page=${pageNum}&limit=${PAGE_LIMIT}`;
      const response = await fetch(url, { headers });
      const result = await response.json();
      const list = result.data || [];
      const safeList = Array.isArray(list) ? list : [];
      setAgents((prev) => (append ? [...prev, ...safeList] : safeList));
      setPage((result.pagination && result.pagination.page) || pageNum);
      setTotalPages((result.pagination && result.pagination.totalPages) || 1);
    } catch (e) {
      console.log('Delivery agents fetch error:', e);
      if (!append) setAgents([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user, refreshing]);

  useEffect(() => {
    fetchAgents(1, false);
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgents(1, false);
  };

  const onEndReached = () => {
    if (loadingMore || loading) return;
    if (page >= totalPages) return;
    fetchAgents(page + 1, true);
  };

  const filtered = agents.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (s.full_name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const mobile = (s.phone_number || '').toString().toLowerCase();
    const hq = (s.headquarter_name || '').toLowerCase();
    return name.includes(q) || email.includes(q) || mobile.includes(q) || hq.includes(q);
  });

  const renderItem = ({ item }) => {
    const designation = item.designation_id && item.designation_id.designation_name;
    const role = item.role_id && item.role_id.role_name;
    return (
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 10,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.primary + '22',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 20 }}>🚚</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
              {item.full_name || 'Unnamed'}
            </Text>
            {role ? (
              <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>{role}</Text>
            ) : null}
          </View>
        </View>
        {item.email ? (
          <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 8 }}>✉ {item.email}</Text>
        ) : null}
        {item.phone_number ? (
          <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>📞 {item.phone_number}</Text>
        ) : null}
        {item.headquarter_name ? (
          <Text style={{ fontSize: 11, color: theme.primary, marginTop: 6, fontWeight: '600' }}>
            📍 {item.headquarter_name}
          </Text>
        ) : null}
        {designation ? (
          <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 4 }}>{designation}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
          <TouchableOpacity
            onPress={() => openEditModal(item)}
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: theme.buttonText, fontSize: 12, fontWeight: '700' }}>✎ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={deletingId === item._id}
            onPress={() => handleDelete(item)}
            style={{
              backgroundColor: '#e53935',
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 8,
              opacity: deletingId === item._id ? 0.6 : 1,
            }}
          >
            {deletingId === item._id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>🗑 Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.primary, theme.primaryDark || theme.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <BackButton onPress={onGoBack} color={theme.buttonText} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.buttonText, marginLeft: 12, flex: 1 }}>
            Delivery Agents
          </Text>
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
            <Text style={{ color: theme.buttonText, fontSize: 22, fontWeight: '700', marginTop: -2 }}>+</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search delivery agents..."
          placeholderTextColor={theme.textTertiary}
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: theme.text,
            fontSize: 14,
          }}
        />
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => (item._id || String(idx))}
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
              <Text style={{ fontSize: 14, color: theme.textTertiary }}>No delivery agents found</Text>
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
                {editingId ? 'Edit Delivery Agent' : 'Add Delivery Agent'}
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
                onPress={handleSubmit}
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
                    {editingId ? 'Update Delivery Agent' : 'Add Delivery Agent'}
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
