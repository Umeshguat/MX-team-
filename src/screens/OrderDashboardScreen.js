import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const screenWidth = Dimensions.get('window').width;

// ======================== CREATE ORDER MODAL ========================
function CreateOrderModal({ visible, onClose, onSubmit, user }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [distributorName, setDistributorName] = useState('');
  const [distributorMobile, setDistributorMobile] = useState('');
  const [distributorAddress, setDistributorAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      fetchProducts();
      setSelectedProducts([]);
      setDistributorName('');
      setDistributorMobile('');
      setDistributorAddress('');
      setNotes('');
      setSearchQuery('');
    }
  }, [visible]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const response = await fetch(`${BASE_URL}/api/inventory/products`, { headers });
      const result = await response.json();
      if (result.status === 200 && result.products) {
        setProducts(result.products);
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.log('Fetch products error:', e);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleProduct = (product) => {
    const exists = selectedProducts.find(p => p._id === product._id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p._id !== product._id));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, orderQty: '1' }]);
    }
  };

  const updateQty = (productId, qty) => {
    setSelectedProducts(selectedProducts.map(p =>
      p._id === productId ? { ...p, orderQty: qty } : p
    ));
  };

  const handleSubmit = async () => {
    if (!distributorName.trim()) {
      Alert.alert('Error', 'Please enter distributor name');
      return;
    }
    if (!distributorMobile.trim()) {
      Alert.alert('Error', 'Please enter distributor mobile number');
      return;
    }
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return;
    }
    for (const p of selectedProducts) {
      if (!p.orderQty || parseInt(p.orderQty) <= 0) {
        Alert.alert('Error', `Please enter valid quantity for ${p.product_name}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = user && user.token ? user.token : '';
      const orderItems = selectedProducts.map(p => {
        const activeBatch = (p.batches || []).find(b => b.is_active && b.quantity > 0);
        return {
          product_id: p._id,
          batch_id: activeBatch ? activeBatch._id : null,
          product_name: p.product_name,
          product_code: p.product_code || '',
          quantity: parseInt(p.orderQty),
          unit_price: p.selling_price || 0,
          total_price: (p.selling_price || 0) * parseInt(p.orderQty),
        };
      });

      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendor_name: distributorName.trim(),
          vendor_mobile: distributorMobile.trim(),
          vendor_address: distributorAddress.trim(),
          items: orderItems,
          note: notes.trim(),
        }),
      });

      const result = await response.json();
      if (response.ok || result.status === 200 || result.status === 201) {
        Alert.alert('Success', 'Order created successfully');
        onSubmit && onSubmit();
        onClose();
      } else {
        Alert.alert('Error', result.message || 'Failed to create order');
      }
    } catch (e) {
      console.log('Create order error:', e);
      Alert.alert('Error', 'Unable to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = searchQuery.trim()
    ? products.filter(p =>
        (p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.product_code || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const totalAmount = selectedProducts.reduce((sum, p) => sum + ((p.selling_price || 0) * parseInt(p.orderQty || 0)), 0);
  const scrollViewRef = useRef(null);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Create New Order</Text>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Text style={modalStyles.closeBtnText}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              {/* Distributor Details */}
              <Text style={modalStyles.sectionLabel}>Distributor Details</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="Distributor Name *"
                placeholderTextColor="#999"
                value={distributorName}
                onChangeText={setDistributorName}
              />
              <TextInput
                style={modalStyles.input}
                placeholder="Mobile Number *"
                placeholderTextColor="#999"
                value={distributorMobile}
                onChangeText={setDistributorMobile}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <TextInput
                style={modalStyles.input}
                placeholder="Address"
                placeholderTextColor="#999"
                value={distributorAddress}
                onChangeText={setDistributorAddress}
                multiline
              />

              {/* Product Selection */}
              <Text style={modalStyles.sectionLabel}>Select Products</Text>
              <TextInput
                style={modalStyles.searchInput}
                placeholder="Search products..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {loadingProducts ? (
                <ActivityIndicator size="small" color="#e53935" style={{ marginVertical: 20 }} />
              ) : (
                <View style={modalStyles.productList}>
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.find(p => p._id === product._id);
                    return (
                      <TouchableOpacity
                        key={product._id}
                        style={[modalStyles.productItem, isSelected && modalStyles.productItemSelected]}
                        onPress={() => toggleProduct(product)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={modalStyles.productName}>{product.product_name}</Text>
                          <Text style={modalStyles.productCode}>{product.product_code || ''} {product.brand ? '| ' + product.brand : ''}</Text>
                          <Text style={modalStyles.productPrice}>Rs. {product.selling_price || 0}</Text>
                        </View>
                        <View style={[modalStyles.checkBox, isSelected && modalStyles.checkBoxSelected]}>
                          {isSelected && <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <Text style={modalStyles.emptyText}>No products found</Text>
                  )}
                </View>
              )}

              {/* Selected Products with Quantity */}
              {selectedProducts.length > 0 && (
                <View>
                  <Text style={modalStyles.sectionLabel}>Order Items ({selectedProducts.length})</Text>
                  {selectedProducts.map((p) => (
                    <View key={p._id} style={modalStyles.orderItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={modalStyles.orderItemName}>{p.product_name}</Text>
                        <Text style={modalStyles.orderItemPrice}>Rs. {p.selling_price || 0} each</Text>
                      </View>
                      <View style={modalStyles.qtyRow}>
                        <TouchableOpacity
                          style={modalStyles.qtyBtn}
                          onPress={() => {
                            const val = Math.max(1, parseInt(p.orderQty || 1) - 1);
                            updateQty(p._id, String(val));
                          }}
                        >
                          <Text style={modalStyles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={modalStyles.qtyInput}
                          value={p.orderQty}
                          onChangeText={(val) => updateQty(p._id, val.replace(/[^0-9]/g, ''))}
                          keyboardType="number-pad"
                        />
                        <TouchableOpacity
                          style={modalStyles.qtyBtn}
                          onPress={() => {
                            const val = parseInt(p.orderQty || 0) + 1;
                            updateQty(p._id, String(val));
                          }}
                        >
                          <Text style={modalStyles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={modalStyles.itemTotal}>Rs. {(p.selling_price || 0) * parseInt(p.orderQty || 0)}</Text>
                    </View>
                  ))}
                  <View style={modalStyles.totalRow}>
                    <Text style={modalStyles.totalLabel}>Total Amount</Text>
                    <Text style={modalStyles.totalValue}>Rs. {totalAmount}</Text>
                  </View>
                </View>
              )}

              {/* Notes */}
              <TextInput
                style={[modalStyles.input, { height: 80, textAlignVertical: 'top', marginTop: 10 }]}
                placeholder="Order notes (optional)"
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            </ScrollView>

            <TouchableOpacity
              style={[modalStyles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={modalStyles.submitBtnText}>Place Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: '#666' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 14, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
  searchInput: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
  productList: { maxHeight: 250 },
  productItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f8f8', borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#eee' },
  productItemSelected: { borderColor: '#e53935', backgroundColor: '#fff5f5' },
  productName: { fontSize: 14, fontWeight: '700', color: '#333' },
  productCode: { fontSize: 11, color: '#999', marginTop: 2 },
  productPrice: { fontSize: 12, fontWeight: '600', color: '#e53935', marginTop: 2 },
  checkBox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  checkBoxSelected: { backgroundColor: '#e53935', borderColor: '#e53935' },
  orderItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f8f8', borderRadius: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#e53935' },
  orderItemName: { fontSize: 13, fontWeight: '700', color: '#333' },
  orderItemPrice: { fontSize: 11, color: '#999', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e53935', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  qtyInput: { width: 40, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#333' },
  itemTotal: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', minWidth: 60, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#1a1a2e', borderRadius: 12, marginTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#ff8a80' },
  submitBtn: { backgroundColor: '#e53935', borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 13, marginVertical: 20 },
});

// ======================== ORDER DETAIL MODAL ========================
function OrderDetailModal({ visible, order, onClose }) {
  if (!order) return null;

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return '#ff9800';
      case 'confirmed': case 'approved': return '#1565c0';
      case 'dispatched': case 'shipped': return '#7b1fa2';
      case 'delivered': case 'completed': return '#4caf50';
      case 'cancelled': case 'rejected': return '#e53935';
      default: return '#999';
    }
  };

  const getStatusBg = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return '#fff3e0';
      case 'confirmed': case 'approved': return '#e3f2fd';
      case 'dispatched': case 'shipped': return '#f3e5f5';
      case 'delivered': case 'completed': return '#e8f5e9';
      case 'cancelled': case 'rejected': return '#ffebee';
      default: return '#f5f5f5';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Order Details</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a2e' }}>#{order.order_number || order._id?.slice(-6) || '--'}</Text>
              <View style={{ backgroundColor: getStatusBg(order.status), paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: getStatusColor(order.status) }}>{(order.status || 'Pending').toUpperCase()}</Text>
              </View>
            </View>

            <View style={{ marginTop: 14, padding: 14, backgroundColor: '#f8f8f8', borderRadius: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#333' }}>{order.distributor_name || '--'}</Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{order.distributor_mobile || '--'}</Text>
              {order.distributor_address ? <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{order.distributor_address}</Text> : null}
            </View>

            <Text style={modalStyles.sectionLabel}>Items ({(order.items || []).length})</Text>
            {(order.items || []).map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#f8f8f8', borderRadius: 8, marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>{item.product_name}</Text>
                  <Text style={{ fontSize: 11, color: '#999' }}>Qty: {item.quantity} x Rs. {item.unit_price || 0}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a1a2e' }}>Rs. {item.total_price || 0}</Text>
              </View>
            ))}

            <View style={modalStyles.totalRow}>
              <Text style={modalStyles.totalLabel}>Total Amount</Text>
              <Text style={modalStyles.totalValue}>Rs. {order.total_amount || 0}</Text>
            </View>

            {order.notes ? (
              <View style={{ marginTop: 10, padding: 12, backgroundColor: '#fff3e0', borderRadius: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#e65100' }}>Notes:</Text>
                <Text style={{ fontSize: 12, color: '#333', marginTop: 4 }}>{order.notes}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 11, color: '#999', marginTop: 14, textAlign: 'center' }}>
              Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '--'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ======================== MAIN ORDER DASHBOARD ========================
export default function OrderDashboardScreen({ user, onGoBack, onLogout, onGoToProfile, onGoToInventory }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, delivered: 0, totalAmount: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const response = await fetch(`${BASE_URL}/api/orders`, { headers });
      const result = await response.json();
      if ((result.status === 200 || response.ok) && (result.orders || result.data)) {
        const orderList = result.orders || result.data || [];
        setOrders(orderList);
        computeStats(orderList);
      } else {
        setOrders([]);
        computeStats([]);
      }
    } catch (e) {
      console.log('Orders fetch error:', e);
      setOrders([]);
      computeStats([]);
    } finally {
      setLoading(false);
    }
  };

  const computeStats = (orderList) => {
    const total = orderList.length;
    const pending = orderList.filter(o => (o.status || '').toLowerCase() === 'pending').length;
    const confirmed = orderList.filter(o => ['confirmed', 'approved'].includes((o.status || '').toLowerCase())).length;
    const delivered = orderList.filter(o => ['delivered', 'completed'].includes((o.status || '').toLowerCase())).length;
    const totalAmount = orderList.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    setStats({ total, pending, confirmed, delivered, totalAmount });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatCurrency = (val) => {
    if (!val) return 'Rs. 0';
    if (val >= 100000) return 'Rs. ' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return 'Rs. ' + (val / 1000).toFixed(1) + 'K';
    return 'Rs. ' + val;
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return '#ff9800';
      case 'confirmed': case 'approved': return '#1565c0';
      case 'dispatched': case 'shipped': return '#7b1fa2';
      case 'delivered': case 'completed': return '#4caf50';
      case 'cancelled': case 'rejected': return '#e53935';
      default: return '#999';
    }
  };

  const getStatusBg = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return '#fff3e0';
      case 'confirmed': case 'approved': return '#e3f2fd';
      case 'dispatched': case 'shipped': return '#f3e5f5';
      case 'delivered': case 'completed': return '#e8f5e9';
      case 'cancelled': case 'rejected': return '#ffebee';
      default: return '#f5f5f5';
    }
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => {
        const s = (o.status || '').toLowerCase();
        if (filter === 'pending') return s === 'pending';
        if (filter === 'confirmed') return s === 'confirmed' || s === 'approved';
        if (filter === 'delivered') return s === 'delivered' || s === 'completed';
        if (filter === 'cancelled') return s === 'cancelled' || s === 'rejected';
        return true;
      });

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {onGoBack ? (
              <TouchableOpacity style={styles.backBtn} onPress={onGoBack} activeOpacity={0.7}>
                <Text style={styles.backBtnText}>{'<'}</Text>
              </TouchableOpacity>
            ) : null}
            <View>
              <Text style={styles.greeting}>Welcome Back,</Text>
              <Text style={styles.userName}>{user && user.fullName ? user.fullName : 'Sales'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {onGoToProfile ? (
              <TouchableOpacity style={styles.profileBtn} onPress={onGoToProfile} activeOpacity={0.7}>
                <Text style={styles.profileBtnText}>P</Text>
              </TouchableOpacity>
            ) : null}
            {onLogout ? (
              <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.dashboardBody}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e53935']} />}
      >
        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsIcon}>📋</Text>
            <Text style={styles.statsValue}>{loading ? '--' : stats.total}</Text>
            <Text style={styles.statsLabel}>Total Orders</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsIcon}>💰</Text>
            <Text style={styles.statsValue}>{loading ? '--' : formatCurrency(stats.totalAmount)}</Text>
            <Text style={styles.statsLabel}>Total Value</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderTopWidth: 3, borderTopColor: '#ff9800' }]}>
            <Text style={styles.statsIcon}>⏳</Text>
            <Text style={[styles.statsValue, { color: '#ff9800' }]}>{loading ? '--' : stats.pending}</Text>
            <Text style={styles.statsLabel}>Pending</Text>
          </View>
          <View style={[styles.statsCard, { borderTopWidth: 3, borderTopColor: '#1565c0' }]}>
            <Text style={styles.statsIcon}>✅</Text>
            <Text style={[styles.statsValue, { color: '#1565c0' }]}>{loading ? '--' : stats.confirmed}</Text>
            <Text style={styles.statsLabel}>Confirmed</Text>
          </View>
          <View style={[styles.statsCard, { borderTopWidth: 3, borderTopColor: '#4caf50' }]}>
            <Text style={styles.statsIcon}>🚚</Text>
            <Text style={[styles.statsValue, { color: '#4caf50' }]}>{loading ? '--' : stats.delivered}</Text>
            <Text style={styles.statsLabel}>Delivered</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuCard} onPress={() => setShowCreateModal(true)} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#ffebee' }]}>
              <Text style={styles.menuEmoji}>+</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>New Order</Text>
              <Text style={styles.menuDesc}>Create a new order</Text>
            </View>
            <View style={styles.menuArrow}>
              <Text style={styles.menuArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {onGoToInventory ? (
            <TouchableOpacity style={styles.menuCard} onPress={onGoToInventory} activeOpacity={0.7}>
              <View style={[styles.menuIconBox, { backgroundColor: '#f3e5f5' }]}>
                <Text style={styles.menuEmoji}>📦</Text>
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>Inventory</Text>
                <Text style={styles.menuDesc}>View stock</Text>
              </View>
              <View style={styles.menuArrow}>
                <Text style={styles.menuArrowText}>→</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Order Filters */}
        <Text style={styles.sectionTitle}>Orders</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {filterOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, filter === opt.key && styles.filterChipActive]}
              onPress={() => setFilter(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filter === opt.key && styles.filterChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Orders List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e53935" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>Create your first order to get started</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreateModal(true)} activeOpacity={0.7}>
              <Text style={styles.emptyBtnText}>+ Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order._id}
              style={styles.orderCard}
              onPress={() => setSelectedOrder(order)}
              activeOpacity={0.7}
            >
              <View style={styles.orderCardHeader}>
                <Text style={styles.orderNumber}>#{order.order_number || order._id?.slice(-6) || '--'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(order.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{(order.status || 'Pending').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.orderDistributor}>{order.distributor_name || '--'}</Text>
              <View style={styles.orderCardFooter}>
                <Text style={styles.orderItems}>{(order.items || []).length} items</Text>
                <Text style={styles.orderAmount}>Rs. {order.total_amount || 0}</Text>
              </View>
              <Text style={styles.orderDate}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '--'}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB - Create Order */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modals */}
      <CreateOrderModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={fetchOrders}
        user={user}
      />
      <OrderDetailModal
        visible={!!selectedOrder}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </View>
  );
}

// ======================== STYLES ========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingHorizontal: 25,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
    top: -50,
    right: -40,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    top: 60,
    left: -50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#ff8a80',
    fontSize: 13,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  timeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 2,
  },
  dashboardBody: {
    padding: 20,
    paddingBottom: 100,
  },

  // Stats Cards
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statsIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    marginTop: 20,
    marginBottom: 12,
  },

  // Menu Grid
  menuGrid: {
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuEmoji: {
    fontSize: 22,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  menuDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  menuArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuArrowText: {
    fontSize: 16,
    color: '#999',
  },

  // Filter Chips
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterChipActive: {
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Order Card
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orderDistributor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItems: {
    fontSize: 12,
    color: '#999',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#e53935',
  },
  orderDate: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 6,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  emptyBtn: {
    backgroundColor: '#e53935',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#999',
    marginTop: 10,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
    marginTop: -2,
  },
});
