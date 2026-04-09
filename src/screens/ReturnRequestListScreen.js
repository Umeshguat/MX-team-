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
};

function StatusBadge({ label, value, theme }) {
  const color = STATUS_COLORS[(value || '').toLowerCase()] || theme.textTertiary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10, marginTop: 6 }}>
      <Text style={{ fontSize: 11, color: theme.textTertiary, marginRight: 4 }}>{label}:</Text>
      <View style={{ backgroundColor: color + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'capitalize' }}>{value || '--'}</Text>
      </View>
    </View>
  );
}

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
  const isDistributor = user && user.role === 'Distributor';

  const updateStatus = async (newStatus) => {
    if (!detail || !detail._id) return;
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
              const response = await fetch(`${BASE_URL}/api/return-requests/${detail._id}/status`, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
              });
              const result = await response.json().catch(() => ({}));
              if (response.ok && (result.status === 200 || result.success !== false)) {
                Alert.alert('Success', result.message || 'Status updated');
                setDetail((prev) => (prev ? { ...prev, status: newStatus } : prev));
                setItems((prev) => prev.map((it) => (it._id === detail._id ? { ...it, status: newStatus } : it)));
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

  const openDetail = async (id) => {
    setDetailVisible(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/return-requests/${id}`, {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      setDetail(result.data || result || null);
    } catch (e) {
      console.log('Return request detail error:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchItems = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const endpoint = isDistributor ? 'distributor' : 'sales';
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
    return name.includes(q) || code.includes(q) || reason.includes(q);
  });

  const formatDate = (d) => {
    if (!d) return '--';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '--'; }
  };

  const renderItem = ({ item }) => {
    const product = item.product_id || {};
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openDetail(item._id)}
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
          borderLeftColor: theme.error || '#e53935',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: (theme.error || '#e53935') + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 20 }}>↩️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }} numberOfLines={1}>
              {product.product_name || '--'}
            </Text>
            {product.product_code ? (
              <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>{product.product_code}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: theme.textTertiary }}>Qty</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text }}>{item.unit || '--'}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
          <Text style={{ fontSize: 13, marginRight: 6 }}>📝</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }}>{item.reason || '--'}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <StatusBadge label="Status" value={item.status} theme={theme} />
          <StatusBadge label="QC" value={item.qc_status} theme={theme} />
          <StatusBadge label="Refund" value={item.refund_status} theme={theme} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Text style={{ fontSize: 11, color: theme.textTertiary }}>🕒 {formatDate(item.createdAt)}</Text>
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
            {detailLoading || !detail ? (
              <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {(() => {
                  const d = detail || {};
                  const product = d.product_id || {};
                  const sales = d.sales_person_id || {};
                  const order = d.order_id || {};
                  const agent = d.delivery_agent_id || {};
                  const isObj = (v) => v && typeof v === 'object';
                  return (
                    <View style={{ paddingBottom: 20 }}>
                      <Section title="Return Request">
                        <Row label="Reason" value={d.reason} />
                        <Row label="Quantity" value={d.unit} />
                        <Row label="Status" value={d.status} />
                        <Row label="QC Status" value={d.qc_status} />
                        <Row label="Refund Status" value={d.refund_status} />
                        <Row label="Created" value={formatDate(d.createdAt)} />
                        <Row label="Updated" value={formatDate(d.updatedAt)} />
                      </Section>

                      {isObj(product) ? (
                        <Section title="Product">
                          <Row label="Name" value={product.product_name} />
                          <Row label="Code" value={product.product_code} />
                          <Row label="Description" value={product.description} />
                          <Row label="Unit" value={product.unit} />
                          <Row label="Selling Price" value={product.selling_price} />
                          <Row label="Total Quantity" value={product.total_quantity} />
                          <Row label="Reorder Level" value={product.reorder_level} />
                          <Row label="Shelf Life (days)" value={product.shelf_life_days} />
                          <Row label="Active" value={product.is_active ? 'Yes' : 'No'} />
                        </Section>
                      ) : (
                        <Section title="Product"><Row label="Product" value={d.product_id} /></Section>
                      )}

                      {Array.isArray(product.batches) && product.batches.length > 0 ? (
                        <Section title="Batches">
                          {product.batches.map((b, i) => (
                            <View key={b._id || i} style={{ marginBottom: 8, padding: 10, backgroundColor: theme.surface, borderRadius: 10 }}>
                              <Row label="Batch No." value={b.batch_number} />
                              <Row label="Mfg Date" value={formatDate(b.manufacturing_date)} />
                              <Row label="Expiry" value={formatDate(b.expiry_date)} />
                              <Row label="Quantity" value={b.quantity} />
                              <Row label="Purchase Price" value={b.purchase_price} />
                              <Row label="Active" value={b.is_active ? 'Yes' : 'No'} />
                            </View>
                          ))}
                        </Section>
                      ) : null}

                      <Section title="Order">
                        {isObj(order) ? (
                          <>
                            <Row label="Order No." value={order.order_number || order._id} />
                            <Row label="Total" value={order.total_amount} />
                            <Row label="Status" value={order.status} />
                          </>
                        ) : (
                          <Row label="Order" value={d.order_id} />
                        )}
                      </Section>

                      <Section title="Sales Person">
                        {isObj(sales) ? (
                          <>
                            <Row label="Name" value={sales.full_name} />
                            <Row label="Email" value={sales.email} />
                            <Row label="Phone" value={sales.phone_number} />
                          </>
                        ) : (
                          <Row label="Sales Person" value={d.sales_person_id} />
                        )}
                      </Section>

                      <Section title="Delivery Agent">
                        {isObj(agent) ? (
                          <>
                            <Row label="Name" value={agent.full_name} />
                            <Row label="Phone" value={agent.phone_number} />
                          </>
                        ) : (
                          <Row label="Delivery Agent" value={d.delivery_agent_id} />
                        )}
                      </Section>
                    </View>
                  );
                })()}
              </ScrollView>
            )}
            {detail && !detailLoading && (detail.status || '').toLowerCase() === 'requested' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
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
          </View>
        </View>
      </Modal>
    </View>
  );
}
