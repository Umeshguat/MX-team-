import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

function HandleBar({ theme }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.divider }} />
    </View>
  );
}

function SectionHeader({ title, color, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
      <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: color || theme.primary, marginRight: 10 }} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{title}</Text>
    </View>
  );
}

// Order Detail Modal (same as in OrderDashboardScreen)
function OrderDetailModal({ visible, order, onClose, user }) {
  const { theme, isDark } = useTheme();
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (visible && order) {
      fetchPaymentData();
    }
  }, [visible, order]);

  const fetchPaymentData = async () => {
    try {
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const response = await fetch(`${BASE_URL}/api/orders/${order._id}`, { headers });
      const result = await response.json();
      if (response.ok || result.status === 200) {
        const credit = result.paymentCredit || null;
        if (credit) {
          setPaymentData({
            grandTotal: credit.total_amount || 0,
            totalPaid: credit.paid_amount || 0,
            balance: credit.remaining_amount || 0,
            payments: credit.payment_history || [],
          });
        } else {
          setPaymentData({
            grandTotal: order.grand_total || 0,
            totalPaid: 0,
            balance: order.grand_total || 0,
            payments: [],
          });
        }
      }
    } catch (e) {
      console.log('Fetch payment data error:', e);
    }
  };

  if (!order) return null;

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return theme.warning;
      case 'confirmed': case 'approved': return theme.info;
      case 'dispatched': case 'shipped': return theme.secondary;
      case 'delivered': case 'completed': return theme.success;
      case 'cancelled': case 'rejected': return theme.error;
      default: return theme.textTertiary;
    }
  };

  const getStatusBg = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return theme.warningBg;
      case 'confirmed': case 'approved': return theme.infoBg;
      case 'dispatched': case 'shipped': return isDark ? theme.surfaceVariant : '#f3e5f5';
      case 'delivered': case 'completed': return theme.successBg;
      case 'cancelled': case 'rejected': return theme.errorBg;
      default: return theme.surfaceVariant;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingHorizontal: 20, paddingBottom: 20 }}>
          <HandleBar theme={theme} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.info + '18', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Text style={{ fontSize: 18 }}>📋</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>Order Details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textSecondary }}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text }}>#{order.order_number || order._id?.slice(-6) || '--'}</Text>
              <View style={{ backgroundColor: getStatusBg(order.order_status), paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: getStatusColor(order.order_status) }}>{(order.order_status || 'Pending').toUpperCase()}</Text>
              </View>
            </View>

            <View style={{ marginTop: 14, padding: 16, backgroundColor: theme.surfaceVariant, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: theme.info }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>🏢</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{order.vendor_name || '--'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>📞</Text>
                <Text style={{ fontSize: 13, color: theme.textTertiary }}>{order.vendor_mobile || '--'}</Text>
              </View>
            </View>

            <SectionHeader title={`Items (${(order.items || []).length})`} color={theme.secondary} theme={theme} />
            {(order.items || []).map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: theme.surfaceVariant, borderRadius: 12, marginBottom: 6, borderLeftWidth: 4, borderLeftColor: theme.secondary }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{item.product_name}</Text>
                  <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 3 }}>Qty: {item.quantity} x Rs. {item.unit_price || 0}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.primary, alignSelf: 'center' }}>Rs. {item.total_price || 0}</Text>
              </View>
            ))}

            <View style={{ padding: 16, backgroundColor: theme.primary, borderRadius: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>💰</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textOnPrimary }}>Total Amount</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textOnPrimary }}>Rs. {order.grand_total || 0}</Text>
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 }}>GST Included</Text>
            </View>

            {order.note ? (
              <View style={{ marginTop: 12, padding: 14, backgroundColor: theme.warningBg, borderRadius: 14, borderLeftWidth: 4, borderLeftColor: theme.warning }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, marginRight: 6 }}>📝</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.warning }}>Notes</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.text, lineHeight: 19 }}>{order.note}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 16, textAlign: 'center' }}>
              Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '--'}
            </Text>

            {paymentData ? (
              <>
                <SectionHeader title="Payment Summary" color={theme.info} theme={theme} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, backgroundColor: theme.infoBg, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.info }}>Rs. {paymentData.grandTotal}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.info, marginTop: 3, textTransform: 'uppercase' }}>Total</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: theme.successBg, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.success }}>Rs. {paymentData.totalPaid}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.success, marginTop: 3, textTransform: 'uppercase' }}>Paid</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: paymentData.balance > 0 ? theme.errorBg : theme.successBg, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: paymentData.balance > 0 ? theme.error : theme.success }}>Rs. {paymentData.balance}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: paymentData.balance > 0 ? theme.error : theme.success, marginTop: 3, textTransform: 'uppercase' }}>Balance</Text>
                  </View>
                </View>

                {paymentData.payments && paymentData.payments.length > 0 && (
                  <>
                    <SectionHeader title="Payment History" color={theme.info} theme={theme} />
                    {paymentData.payments.map((p, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: theme.surfaceVariant, borderRadius: 12, marginBottom: 6, borderLeftWidth: 4, borderLeftColor: theme.success }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Rs. {p.amount || 0}</Text>
                          <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>{p.payment_mode || 'Cash'} {p.note ? '- ' + p.note : ''}</Text>
                        </View>
                        <View style={{ backgroundColor: theme.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textTertiary }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '--'}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {paymentData.balance <= 0 && paymentData.payments.length > 0 && (
                  <View style={{ marginTop: 14, padding: 20, backgroundColor: theme.successBg, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: theme.success }}>Fully Paid</Text>
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function OrderListScreen({ user, onGoBack }) {
  const { theme, isDark } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

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
        setOrders(result.orders || result.data || []);
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.log('Orders fetch error:', e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return theme.warning;
      case 'confirmed': case 'approved': return theme.info;
      case 'dispatched': case 'shipped': return theme.secondary;
      case 'delivered': case 'completed': return theme.success;
      case 'cancelled': case 'rejected': return theme.error;
      default: return theme.textTertiary;
    }
  };

  const getStatusBg = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return theme.warningBg;
      case 'confirmed': case 'approved': return theme.infoBg;
      case 'dispatched': case 'shipped': return isDark ? theme.surfaceVariant : '#f3e5f5';
      case 'delivered': case 'completed': return theme.successBg;
      case 'cancelled': case 'rejected': return theme.errorBg;
      default: return theme.surfaceVariant;
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => {
        const s = (o.order_status || '').toLowerCase();
        if (filter === 'confirmed') return ['confirmed', 'approved'].includes(s);
        if (filter === 'delivered') return ['delivered', 'completed'].includes(s);
        if (filter === 'cancelled') return ['cancelled', 'rejected'].includes(s);
        return s === filter;
      });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => (o.order_status || '').toLowerCase() === 'pending').length,
    delivered: orders.filter(o => ['delivered', 'completed'].includes((o.order_status || '').toLowerCase())).length,
    totalAmount: orders.reduce((sum, o) => sum + (o.grand_total || 0), 0),
  };

  const renderOrder = ({ item: order }) => (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: theme.surface, borderLeftColor: getStatusColor(order.order_status) }]}
      onPress={() => setSelectedOrder(order)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[styles.orderNumber, { color: theme.text }]}>#{order.order_number || order._id?.slice(-6) || '--'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBg(order.order_status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}>{(order.order_status || 'Pending').toUpperCase()}</Text>
        </View>
      </View>
      <Text style={[styles.vendorName, { color: theme.text }]}>{order.vendor_name || '--'}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={[styles.itemCount, { color: theme.textTertiary }]}>{(order.items || []).length} items</Text>
        <Text style={[styles.orderTotal, { color: theme.primary }]}>Rs. {order.grand_total || 0}</Text>
      </View>
      <View style={[styles.dateDivider, { backgroundColor: theme.divider }]} />
      <Text style={[styles.orderDate, { color: theme.textTertiary }]}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '--'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[theme.gradient1, theme.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={[styles.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Orders</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.delivered}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontSize: 16 }]}>Rs.{stats.totalAmount}</Text>
            <Text style={styles.statLabel}>Amount</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={[styles.filterRow, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && { backgroundColor: theme.primary }]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, { color: theme.textSecondary }, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Order List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Loading orders...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 14 }}>📋</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Orders Found</Text>
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No orders match the selected filter</Text>
            </View>
          )
        }
      />

      <OrderDetailModal
        visible={!!selectedOrder}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        user={user}
      />
    </View>
  );
}

var styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -60, right: -40 },
  decorCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, bottom: -40, left: -30 },
  headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: '#fff', fontSize: 24, fontWeight: '600', marginTop: -2 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 30 },
  filterRow: { paddingVertical: 12, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: 'transparent' },
  filterText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  orderCard: { borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, borderLeftWidth: 4 },
  orderNumber: { fontSize: 15, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  vendorName: { fontSize: 15, fontWeight: '600' },
  itemCount: { fontSize: 12 },
  orderTotal: { fontSize: 17, fontWeight: '900' },
  dateDivider: { height: 1, marginVertical: 8 },
  orderDate: { fontSize: 11 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyText: { fontSize: 13, marginTop: 6 },
});
