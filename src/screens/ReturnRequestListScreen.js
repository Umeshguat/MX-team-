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
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL } from '../config';
import BackButton from '../components/BackButton';
import { useTheme } from '../theme/ThemeContext';

const PAGE_LIMIT = 10;

const STATUS_COLORS = {
  requested: '#1976d2',
  approved: '#43a047',
  rejected: '#e53935',
  completed: '#43a047',
  pending: '#fb8c00',
  pickup: '#FF9800',
  received: '#4CAF50',
};

export default function ReturnRequestListScreen({ user, onGoBack }) {
  const { theme, isDark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [receiving, setReceiving] = useState(null);
  const [qcDescription, setQcDescription] = useState('');
  const isDistributor = user && user.role === 'Distributor';
  const isDeliveryAgent = user && user.role === 'DeliveryAgent';

  const receiveReturn = async (qcStatus, idOverride) => {
    const detailId = idOverride || (detail && (detail._id || detail.id));
    if (!detailId) {
      Alert.alert('Error', 'No return request selected');
      return;
    }
    try {
      setReceiving(qcStatus);
      const token = user && user.token ? user.token : '';
      if (!token) {
        Alert.alert('Auth Error', 'No auth token found. Please log in again.');
        setReceiving(null);
        return;
      }
      const payload = { qc_status: qcStatus, quality_check_description: qcDescription.trim() || undefined };
      const url = `${BASE_URL}/api/return-requests/${detailId}/receive`;
      const authHeader = 'Bearer ' + token;
      console.log('Receive return →', url);
      console.log('Auth header present:', !!token, 'token length:', token.length);
      console.log('Payload:', payload);
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      console.log('Receive return ←', response.status, result);
      if (response.ok) {
        Alert.alert('Success', result.message || `Return marked as QC ${qcStatus}`);
        const descVal = qcDescription.trim() || undefined;
        setDetail((prev) => (prev ? { ...prev, quality_check_status: qcStatus, quality_check_description: descVal } : prev));
        setItems((prev) => prev.map((it) => ((it._id || it.id) === detailId ? { ...it, quality_check_status: qcStatus, quality_check_description: descVal } : it)));
        setQcDescription('');
      } else {
        Alert.alert('Error', `${response.status}: ${result.message || 'Failed to receive return'}`);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Network error');
    } finally {
      setReceiving(null);
    }
  };
  const [completingRefund, setCompletingRefund] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const completeRefund = async () => {
    const detailId = detail && (detail._id || detail.id);
    if (!detailId) {
      Alert.alert('Error', 'No return request selected');
      return;
    }
    Alert.alert(
      'Confirm',
      'Complete refund and credit it to the shop wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setCompletingRefund(true);
              const token = user && user.token ? user.token : '';
              if (!token) {
                Alert.alert('Auth Error', 'No auth token found. Please log in again.');
                setCompletingRefund(false);
                return;
              }
              const url = `${BASE_URL}/api/return-requests/${detailId}/complete-refund`;
              const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
              });
              const result = await response.json().catch(() => ({}));
              if (response.ok) {
                Alert.alert('Success', result.message || 'Refund completed');
                const updatedData = result.data || {};
                setDetail((prev) => (prev ? { ...prev, refund_status: updatedData.refund_status || 'completed' } : prev));
                setItems((prev) => prev.map((it) => ((it._id || it.id) === detailId ? { ...it, refund_status: updatedData.refund_status || 'completed' } : it)));
              } else {
                Alert.alert('Error', `${response.status}: ${result.message || 'Failed to complete refund'}`);
              }
            } catch (e) {
              Alert.alert('Error', e.message || 'Network error');
            } finally {
              setCompletingRefund(false);
            }
          },
        },
      ],
    );
  };
  const [returnForm, setReturnForm] = useState({ order_id: '', product_id: '', reason: '', unit: '' });
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [orderDropdownList, setOrderDropdownList] = useState([]);
  const [productDropdownList, setProductDropdownList] = useState([]);
  const [loadingOrderDropdown, setLoadingOrderDropdown] = useState(false);
  const [loadingProductDropdown, setLoadingProductDropdown] = useState(false);
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedOrderLabel, setSelectedOrderLabel] = useState('');
  const [selectedProductLabel, setSelectedProductLabel] = useState('');

  const updateStatus = async (newStatus) => {
    const detailId = detail && (detail._id || detail.id);
    if (!detailId) return;
    Alert.alert(
      'Confirm',
      `Mark this return request as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setUpdatingStatus(newStatus);
              const token = user && user.token ? user.token : '';
              const response = await fetch(`${BASE_URL}/api/return-requests/${detailId}/status`, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
              });
              const result = await response.json().catch(() => ({}));
              if (response.ok) {
                Alert.alert('Success', result.message || 'Status updated');
                setDetail((prev) => (prev ? { ...prev, status: newStatus } : prev));
                setItems((prev) => prev.map((it) => ((it._id || it.id) === detailId ? { ...it, status: newStatus } : it)));
              } else {
                Alert.alert('Error', result.message || 'Failed to update status');
              }
            } catch (e) {
              Alert.alert('Error', e.message || 'Something went wrong');
            } finally {
              setUpdatingStatus(null);
            }
          },
        },
      ]
    );
  };

  const openDetail = async (id, cachedItem) => {
    setDetailVisible(true);
    setQcDescription('');
    if (cachedItem) setDetail(cachedItem);
    else setDetail(null);
    setDetailLoading(true);
    try {
      const token = user && user.token ? user.token : '';
      const detailEndpoint = isDeliveryAgent ? `pickup/${id}` : `${id}`;
      const response = await fetch(`${BASE_URL}/api/return-requests/${detailEndpoint}`, {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      const detailData = result.data || result.returnRequest || (result._id ? result : null);
      if (detailData) {
        setDetail(detailData);
      }
    } catch (e) {
      console.log('Return request detail error:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchOrderDropdown = async () => {
    try {
      setLoadingOrderDropdown(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/orders`, {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      const list = result.orders || result.data || [];
      setOrderDropdownList(Array.isArray(list) ? list : []);
    } catch (e) {
      console.log('Order dropdown fetch error:', e);
      setOrderDropdownList([]);
    } finally {
      setLoadingOrderDropdown(false);
    }
  };

  const fetchProductDropdown = async () => {
    try {
      setLoadingProductDropdown(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/inventory/products`, {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      const list = result.products || result.data || [];
      setProductDropdownList(Array.isArray(list) ? list : []);
    } catch (e) {
      console.log('Product dropdown fetch error:', e);
      setProductDropdownList([]);
    } finally {
      setLoadingProductDropdown(false);
    }
  };

  const openReturnModal = () => {
    setShowReturnModal(true);
    setReturnForm({ order_id: '', product_id: '', reason: '', unit: '' });
    setSelectedOrderLabel('');
    setSelectedProductLabel('');
    setOrderSearch('');
    setProductSearch('');
    setShowOrderDropdown(false);
    setShowProductDropdown(false);
    fetchOrderDropdown();
    fetchProductDropdown();
  };

  const submitReturnRequest = async () => {
    const { order_id, product_id, reason, unit } = returnForm;
    if (!order_id || !product_id || !reason || !unit) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      setSubmittingReturn(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/return-requests`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order_id.trim(),
          sales_person_id: user._id || user.id || '',
          product_id: product_id.trim(),
          reason: reason.trim(),
          unit: parseInt(unit) || 0,
        }),
      });
      const result = await response.json();
      if (response.ok || result.status === 200 || result.success) {
        Alert.alert('Success', result.message || 'Return request created successfully');
        setShowReturnModal(false);
        setReturnForm({ order_id: '', product_id: '', reason: '', unit: '' });
        fetchItems(1, false);
      } else {
        Alert.alert('Error', result.message || 'Failed to create return request');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const fetchItems = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const endpoint = isDeliveryAgent ? 'pickup' : isDistributor ? 'distributor' : 'sales';
      const url = `${BASE_URL}/api/return-requests/${endpoint}?page=${pageNum}&limit=${PAGE_LIMIT}`;
      const response = await fetch(url, { headers });
      const result = await response.json();
      const list = Array.isArray(result.data) ? result.data : [];
      setItems((prev) => (append ? [...prev, ...list] : list));
      setPage((result.pagination && result.pagination.page) || pageNum);
      setTotalPages((result.pagination && result.pagination.totalPages) || 1);
      setTotal((result.pagination && result.pagination.total) || list.length);
    } catch (e) {
      console.log('Return requests fetch error:', e);
      if (!append) setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user, refreshing]);

  useEffect(() => {
    fetchItems(1, false);
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems(1, false);
  };

  const onEndReached = () => {
    if (loadingMore || loading) return;
    if (page >= totalPages) return;
    fetchItems(page + 1, true);
  };

  const filtered = items.filter((it) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = ((it.product_id && it.product_id.product_name) || '').toLowerCase();
    const code = ((it.product_id && it.product_id.product_code) || '').toLowerCase();
    const reason = (it.reason || '').toLowerCase();
    const orderNo = ((it.order_id && it.order_id.order_number) || '').toLowerCase();
    const vendor = ((it.order_id && it.order_id.vendor_name) || '').toLowerCase();
    return name.includes(q) || code.includes(q) || reason.includes(q) || orderNo.includes(q) || vendor.includes(q);
  });

  const formatDate = (d) => {
    if (!d) return '--';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '--'; }
  };

  const renderItem = ({ item }) => {
    const product = (item.product_id && typeof item.product_id === 'object') ? item.product_id : {};
    const order = (item.order_id && typeof item.order_id === 'object') ? item.order_id : {};
    const addr = (order && order.delivery_address) || item.delivery_address || {};
    const orderNumber = order.order_number || item.order_number || 'N/A';
    const vendorName = order.vendor_name || item.vendor_name || 'N/A';
    const cityText = [addr.city, addr.state].filter(Boolean).join(', ');
    const statusColor = STATUS_COLORS[(item.status || '').toLowerCase()] || theme.textTertiary;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openDetail(item._id, item)}
        style={{
          backgroundColor: theme.surface,
          borderRadius: 16,
          marginBottom: 12,
          marginHorizontal: 16,
          flexDirection: 'row',
          overflow: 'hidden',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        }}
      >
        {/* Left accent bar */}
        <View style={{ width: 4, backgroundColor: statusColor }} />
        <View style={{ flex: 1, padding: 16 }}>
          {/* Header: order number + status chip */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.primary }} numberOfLines={1}>
              {orderNumber}
            </Text>
            <View style={{ backgroundColor: statusColor, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                {item.status || '--'}
              </Text>
            </View>
          </View>

          {/* Body rows */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
              <Text style={{ fontSize: 13, width: 75, fontWeight: '500', color: theme.textTertiary }}>Vendor</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', flex: 1, color: theme.text }} numberOfLines={1}>
                {vendorName}
              </Text>
            </View>

            {addr.shop_name ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                <Text style={{ fontSize: 13, width: 75, fontWeight: '500', color: theme.textTertiary }}>Shop</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', flex: 1, color: theme.text }} numberOfLines={1}>
                  {addr.shop_name}
                </Text>
              </View> 
            ) : null}

            {cityText ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                <Text style={{ fontSize: 13, width: 75, fontWeight: '500', color: theme.textTertiary }}>City</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', flex: 1, color: theme.text }} numberOfLines={1}>
                  {cityText}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
              <Text style={{ fontSize: 13, width: 75, fontWeight: '500', color: theme.textTertiary }}>Product</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', flex: 1, color: theme.text }} numberOfLines={1}>
                {product.product_name || '--'}{product.product_code ? ` (${product.product_code})` : ''}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary, marginLeft: 8 }}>x{item.unit || '--'}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
              <Text style={{ fontSize: 13, width: 75, fontWeight: '500', color: theme.textTertiary }}>Reason</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', flex: 1, color: theme.text }} numberOfLines={2}>
                {item.reason || '--'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, width: 75, fontWeight: '500', color: theme.textTertiary }}>QC</Text>
              <View style={{ backgroundColor: (STATUS_COLORS[(item.quality_check_status || '').toLowerCase()] || theme.textTertiary) + '22', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                <Text style={{ color: STATUS_COLORS[(item.quality_check_status || '').toLowerCase()] || theme.textTertiary, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                  {item.quality_check_status || '--'}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.textTertiary, marginLeft: 'auto' }}>🕒 {formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const Row = ({ label, value }) => (
    <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.divider || 'rgba(0,0,0,0.06)' }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textTertiary, width: 130 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: theme.text, flex: 1 }} selectable>{value == null || value === '' ? '--' : String(value)}</Text>
    </View>
  );

  const Section = ({ title, children }) => (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
      {children}
    </View>
  );

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
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>Return Requests</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{loading ? '...' : `${total} requests found`}</Text>
          </View>
          {!isDeliveryAgent ? (
            <TouchableOpacity
              onPress={openReturnModal}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, color: '#fff', marginRight: 4 }}>+</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Add</Text>
            </TouchableOpacity>
          ) : null}
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
            placeholder="Search by product, code, reason..."
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
              <Text style={{ fontSize: 14, color: theme.textTertiary }}>No return requests found</Text>
            </View>
          }
        />
      )}

      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: theme.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, flex: 1 }}>Return Request Details</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Text style={{ fontSize: 24, color: theme.textTertiary }}>×</Text>
              </TouchableOpacity>
            </View>
            {!detail ? (
              <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {(() => {
                  const d = detail || {};
                  const product = (d.product_id && typeof d.product_id === 'object') ? d.product_id : {};
                  const order = (d.order_id && typeof d.order_id === 'object') ? d.order_id : {};
                  const addr = (order && typeof order.delivery_address === 'object' && order.delivery_address) || {};
                  return (
                    <View style={{ paddingBottom: 20 }}>
                      {/* Order Information */}
                      <Section title="Order Information">
                        <Row label="Order No." value={order.order_number || (typeof d.order_id === 'string' ? d.order_id : '--')} />
                        <Row label="Vendor" value={order.vendor_name} />
                        <Row label="Status" value={d.status} />
                      </Section>

                      {/* Delivery Address */}
                      <Section title="Delivery Address">
                        <Row label="Shop Name" value={addr.shop_name} />
                        <Row label="Shop Mobile" value={addr.shop_mobile} />
                        <Row label="Address" value={addr.address} />
                        <Row label="City" value={addr.city} />
                        <Row label="State" value={addr.state} />
                        <Row label="Pincode" value={addr.pincode} />
                      </Section>

                      {/* Product */}
                      <Section title="Product">
                        <Row label="Name" value={product.product_name} />
                        <Row label="Code" value={product.product_code} />
                      </Section>

                      {/* Return Request */}
                      <Section title="Return Request">
                        <Row label="Reason" value={d.reason} />
                        <Row label="Quantity" value={d.unit} />
                        <Row label="QC Status" value={d.quality_check_status} />
                        {d.quality_check_description ? <Row label="QC Description" value={d.quality_check_description} /> : null}
                        <Row label="Refund Status" value={d.refund_status} />
                        <Row label="Created" value={formatDate(d.createdAt)} />
                        <Row label="Updated" value={formatDate(d.updatedAt)} />
                      </Section>

                      {isDistributor && ['requested', 'pending'].includes((d.status || '').toLowerCase()) ? (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                          <TouchableOpacity
                            disabled={!!updatingStatus}
                            onPress={() => updateStatus('rejected')}
                            style={{ flex: 1, backgroundColor: '#e53935', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: updatingStatus ? 0.7 : 1 }}
                          >
                            {updatingStatus === 'rejected' ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Reject</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={!!updatingStatus}
                            onPress={() => updateStatus('approved')}
                            style={{ flex: 1, backgroundColor: '#43a047', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: updatingStatus ? 0.7 : 1 }}
                          >
                            {updatingStatus === 'approved' ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Approve</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {(isDeliveryAgent || isDistributor) && (d.status || '').toLowerCase() === 'approved' ? (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                          {isDeliveryAgent ? (
                            <TouchableOpacity
                              disabled={!!updatingStatus}
                              onPress={() => updateStatus('picked_up')}
                              style={{ flex: 1, backgroundColor: '#FF9800', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: updatingStatus ? 0.7 : 1 }}
                            >
                              {updatingStatus === 'picked_up' ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Pickup</Text>
                              )}
                            </TouchableOpacity>
                          ) : null}
                          {isDistributor ? (
                            <TouchableOpacity
                              disabled={!!updatingStatus}
                              onPress={() => updateStatus('received')}
                              style={{ flex: 1, backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: updatingStatus ? 0.7 : 1 }}
                            >
                              {updatingStatus === 'received' ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Received</Text>
                              )}
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ) : null}

                      {isDeliveryAgent && (d.status || '').toLowerCase() === 'picked_up' ? (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                          <TouchableOpacity
                            disabled={!!updatingStatus}
                            onPress={() => updateStatus('received')}
                            style={{ flex: 1, backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: updatingStatus ? 0.7 : 1 }}
                          >
                            {updatingStatus === 'received' ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Received</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {isDistributor && (d.refund_status || '').toLowerCase() === 'processed' ? (
                        <View style={{ marginTop: 16 }}>
                          <TouchableOpacity
                            disabled={completingRefund}
                            onPress={completeRefund}
                            style={{ backgroundColor: '#1976d2', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: completingRefund ? 0.7 : 1 }}
                          >
                            {completingRefund ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Complete Refund</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {isDistributor && (d._id || d.id) && (d.status || '').toLowerCase() === 'received' && !['passed', 'failed'].includes((d.quality_check_status || '').toLowerCase()) ? (
                        <View style={{ marginTop: 16 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 }}>QC Description</Text>
                          <TextInput
                            style={{ backgroundColor: theme.background, borderRadius: 12, padding: 12, fontSize: 14, color: theme.text, borderWidth: 1, borderColor: theme.divider, marginBottom: 12, minHeight: 60, textAlignVertical: 'top' }}
                            placeholder="Enter quality check description..."
                            placeholderTextColor={theme.textTertiary}
                            value={qcDescription}
                            onChangeText={setQcDescription}
                            multiline
                          />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            disabled={!!receiving}
                            onPress={() => receiveReturn('failed', d._id || d.id)}
                            style={{ flex: 1, backgroundColor: '#e53935', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: receiving ? 0.7 : 1 }}
                          >
                            {receiving === 'failed' ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>QC Failed</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={!!receiving}
                            onPress={() => receiveReturn('passed', d._id || d.id)}
                            style={{ flex: 1, backgroundColor: '#43a047', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: receiving ? 0.7 : 1 }}
                          >
                            {receiving === 'passed' ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>QC Passed</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Return Request Modal */}
      <Modal visible={showReturnModal} transparent animationType="slide" onRequestClose={() => setShowReturnModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => { setShowOrderDropdown(false); setShowProductDropdown(false); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 24, elevation: 10, maxHeight: '85%' }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>New Return Request</Text>
                  <TouchableOpacity onPress={() => setShowReturnModal(false)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 24, color: theme.textTertiary }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Order Dropdown */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 }}>Select Order</Text>
                <TouchableOpacity
                  onPress={() => { setShowOrderDropdown(!showOrderDropdown); setShowProductDropdown(false); }}
                  style={{ backgroundColor: theme.background, borderRadius: 12, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: showOrderDropdown ? theme.primary : theme.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, color: selectedOrderLabel ? theme.text : theme.textTertiary, flex: 1 }} numberOfLines={1}>
                    {selectedOrderLabel || 'Select an order'}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textTertiary }}>{showOrderDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showOrderDropdown && (
                  <View style={{ backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.divider, marginBottom: 4, maxHeight: 200 }}>
                    <TextInput
                      style={{ padding: 10, fontSize: 13, color: theme.text, borderBottomWidth: 1, borderBottomColor: theme.divider }}
                      placeholder="Search order..."
                      placeholderTextColor={theme.textTertiary}
                      value={orderSearch}
                      onChangeText={setOrderSearch}
                    />
                    {loadingOrderDropdown ? (
                      <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color={theme.primary} /></View>
                    ) : (
                      <FlatList
                        data={orderDropdownList.filter(o => {
                          if (!orderSearch) return true;
                          const q = orderSearch.toLowerCase();
                          return (o._id || '').toLowerCase().includes(q) || (o.order_number || '').toLowerCase().includes(q) || String(o.grand_total || '').includes(q);
                        })}
                        keyExtractor={(item) => item._id}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        style={{ maxHeight: 150 }}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => {
                              setReturnForm(f => ({ ...f, order_id: item._id }));
                              setSelectedOrderLabel(item.order_number ? `#${item.order_number} - Rs.${item.grand_total || 0}` : `${item._id.slice(-8)} - Rs.${item.grand_total || 0}`);
                              setShowOrderDropdown(false);
                              setOrderSearch('');
                            }}
                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.divider, backgroundColor: returnForm.order_id === item._id ? (theme.primaryBg || 'rgba(59,130,246,0.08)') : 'transparent' }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                              {item.order_number ? `#${item.order_number}` : `ID: ...${item._id.slice(-8)}`}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>
                              Rs. {item.grand_total || 0} {item.order_status ? `• ${item.order_status}` : ''}
                            </Text>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={{ padding: 16, textAlign: 'center', fontSize: 13, color: theme.textTertiary }}>No orders found</Text>}
                      />
                    )}
                  </View>
                )}
                <View style={{ height: 10 }} />

                {/* Product Dropdown */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 }}>Select Product</Text>
                <TouchableOpacity
                  onPress={() => { setShowProductDropdown(!showProductDropdown); setShowOrderDropdown(false); }}
                  style={{ backgroundColor: theme.background, borderRadius: 12, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: showProductDropdown ? theme.primary : theme.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, color: selectedProductLabel ? theme.text : theme.textTertiary, flex: 1 }} numberOfLines={1}>
                    {selectedProductLabel || 'Select a product'}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textTertiary }}>{showProductDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showProductDropdown && (
                  <View style={{ backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.divider, marginBottom: 4, maxHeight: 200 }}>
                    <TextInput
                      style={{ padding: 10, fontSize: 13, color: theme.text, borderBottomWidth: 1, borderBottomColor: theme.divider }}
                      placeholder="Search product..."
                      placeholderTextColor={theme.textTertiary}
                      value={productSearch}
                      onChangeText={setProductSearch}
                    />
                    {loadingProductDropdown ? (
                      <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color={theme.primary} /></View>
                    ) : (
                      <FlatList
                        data={productDropdownList.filter(p => {
                          if (!productSearch) return true;
                          const q = productSearch.toLowerCase();
                          return (p.product_name || '').toLowerCase().includes(q) || (p.product_code || '').toLowerCase().includes(q);
                        })}
                        keyExtractor={(item) => item._id}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        style={{ maxHeight: 150 }}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => {
                              setReturnForm(f => ({ ...f, product_id: item._id }));
                              setSelectedProductLabel(`${item.product_name || 'Product'} (${item.product_code || item._id.slice(-6)})`);
                              setShowProductDropdown(false);
                              setProductSearch('');
                            }}
                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.divider, backgroundColor: returnForm.product_id === item._id ? (theme.primaryBg || 'rgba(59,130,246,0.08)') : 'transparent' }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                              {item.product_name || 'Unknown'}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>
                              {item.product_code ? `Code: ${item.product_code}` : ''} {item.selling_price ? `• Rs. ${item.selling_price}` : ''}
                            </Text>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={{ padding: 16, textAlign: 'center', fontSize: 13, color: theme.textTertiary }}>No products found</Text>}
                      />
                    )}
                  </View>
                )}
                <View style={{ height: 10 }} />

                {/* Reason */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 }}>Reason</Text>
                <TextInput
                  style={{ backgroundColor: theme.background, borderRadius: 12, padding: 12, fontSize: 14, color: theme.text, marginBottom: 14, borderWidth: 1, borderColor: theme.divider, minHeight: 60 }}
                  placeholder="Enter reason (e.g. damage, wrong item)"
                  placeholderTextColor={theme.textTertiary}
                  value={returnForm.reason}
                  onChangeText={(v) => setReturnForm(f => ({ ...f, reason: v }))}
                  multiline
                />

                {/* Unit */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 }}>Unit (Quantity)</Text>
                <TextInput
                  style={{ backgroundColor: theme.background, borderRadius: 12, padding: 12, fontSize: 14, color: theme.text, marginBottom: 20, borderWidth: 1, borderColor: theme.divider }}
                  placeholder="Enter quantity"
                  placeholderTextColor={theme.textTertiary}
                  value={returnForm.unit}
                  onChangeText={(v) => setReturnForm(f => ({ ...f, unit: v }))}
                  keyboardType="numeric"
                />

                {/* Submit */}
                <TouchableOpacity
                  onPress={submitReturnRequest}
                  disabled={submittingReturn}
                  style={{ backgroundColor: theme.error || '#EF4444', borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: submittingReturn ? 0.6 : 1 }}
                  activeOpacity={0.7}
                >
                  {submittingReturn ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Submit Return Request</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
