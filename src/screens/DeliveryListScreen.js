import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

const screenWidth = Dimensions.get('window').width;

const STATUS_COLORS = {
  assigned: '#FF9800',
  picked_up: '#2196F3',
  in_transit: '#9C27B0',
  delivered: '#4CAF50',
  failed: '#F44336',
  returned: '#795548',
};

const STATUS_LABELS = {
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed',
  returned: 'Returned',
};

const PRIORITY_COLORS = {
  low: '#8BC34A',
  medium: '#FF9800',
  high: '#F44336',
  urgent: '#D50000',
};

// ======================== DELIVERY DETAIL MODAL ========================
function DeliveryDetailModal({ visible, onClose, delivery, user, onStatusUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [receivedBy, setReceivedBy] = useState('');

  const getNextStatuses = (current) => {
    switch (current) {
      case 'assigned': return ['picked_up'];
      case 'picked_up': return ['in_transit'];
      case 'in_transit': return ['delivered', 'failed'];
      case 'failed': return ['in_transit', 'returned'];
      default: return [];
    }
  };

  const pickProofImage = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofImage(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'delivered' && !proofImage) {
      Alert.alert('Required', 'Please capture delivery proof photo before marking as delivered');
      return;
    }
    setUpdating(true);
    try {
      const token = user && user.token ? user.token : '';
      const body = { delivery_status: newStatus };
      if (newStatus === 'delivered') {
        if (proofImage && proofImage.base64) {
          body.delivery_proof = {
            image_url: 'data:image/jpeg;base64,' + proofImage.base64,
            received_by: receivedBy.trim() || 'N/A',
          };
        }
      }
      const response = await fetch(`${BASE_URL}/api/deliveries/${delivery._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Delivery status updated to ' + STATUS_LABELS[newStatus]);
        setProofImage(null);
        setReceivedBy('');
        onStatusUpdate();
        onClose();
      } else {
        Alert.alert('Error', result.message || 'Failed to update status');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (!delivery) return null;

  const nextStatuses = getNextStatuses(delivery.delivery_status);
  const addr = delivery.delivery_address || {};

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Delivery Details</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={modalStyles.closeBtn}>X</Text>
              </TouchableOpacity>
            </View>

            {/* Order Info */}
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Order Information</Text>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Order #</Text>
                <Text style={modalStyles.value}>{delivery.order_number || 'N/A'}</Text>
              </View>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Vendor</Text>
                <Text style={modalStyles.value}>{delivery.vendor_name || 'N/A'}</Text>
              </View>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Mobile</Text>
                <Text style={modalStyles.value}>{delivery.vendor_mobile || 'N/A'}</Text>
              </View>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Status</Text>
                <View style={[modalStyles.statusBadge, { backgroundColor: STATUS_COLORS[delivery.delivery_status] || '#999' }]}>
                  <Text style={modalStyles.statusText}>{STATUS_LABELS[delivery.delivery_status] || delivery.delivery_status}</Text>
                </View>
              </View>
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.label}>Priority</Text>
                <View style={[modalStyles.statusBadge, { backgroundColor: PRIORITY_COLORS[delivery.priority] || '#999' }]}>
                  <Text style={modalStyles.statusText}>{(delivery.priority || 'medium').toUpperCase()}</Text>
                </View>
              </View>
              {delivery.scheduled_date && (
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.label}>Scheduled</Text>
                  <Text style={modalStyles.value}>{new Date(delivery.scheduled_date).toLocaleDateString()}</Text>
                </View>
              )}
              {delivery.delivered_at && (
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.label}>Delivered</Text>
                  <Text style={modalStyles.value}>{new Date(delivery.delivered_at).toLocaleString()}</Text>
                </View>
              )}
            </View>

            {/* Delivery Address */}
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Delivery Address</Text>
              {addr.address ? <Text style={modalStyles.addressText}>{addr.address}</Text> : null}
              <Text style={modalStyles.addressText}>
                {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'No address provided'}
              </Text>
            </View>

            {/* Order Items */}
            {delivery.order_id && delivery.order_id.items && delivery.order_id.items.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Order Items</Text>
                {delivery.order_id.items.map((item, idx) => (
                  <View key={idx} style={modalStyles.itemRow}>
                    <Text style={modalStyles.itemName}>{item.product_name || 'Product'}</Text>
                    <Text style={modalStyles.itemQty}>x{item.quantity}</Text>
                    <Text style={modalStyles.itemPrice}>Rs.{(item.total_price || 0).toFixed(2)}</Text>
                  </View>
                ))}
                {delivery.order_id.grand_total != null && (
                  <View style={[modalStyles.itemRow, { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[modalStyles.itemName, { fontWeight: '700' }]}>Total</Text>
                    <Text style={[modalStyles.itemPrice, { fontWeight: '700' }]}>Rs.{delivery.order_id.grand_total.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Delivery Proof (if delivered) */}
            {delivery.delivery_status === 'delivered' && delivery.delivery_proof && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Delivery Proof</Text>
                {delivery.delivery_proof.received_by && (
                  <View style={modalStyles.infoRow}>
                    <Text style={modalStyles.label}>Received By</Text>
                    <Text style={modalStyles.value}>{delivery.delivery_proof.received_by}</Text>
                  </View>
                )}
                {delivery.delivery_proof.image_url && (
                  <Image source={{ uri: delivery.delivery_proof.image_url }} style={modalStyles.proofImage} />
                )}
              </View>
            )}

            {/* Update Status */}
            {nextStatuses.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Update Status</Text>

                {nextStatuses.includes('delivered') && (
                  <View style={{ marginBottom: 12 }}>
                    <TouchableOpacity style={modalStyles.proofBtn} onPress={pickProofImage}>
                      <Text style={modalStyles.proofBtnText}>
                        {proofImage ? 'Retake Proof Photo' : 'Capture Delivery Proof'}
                      </Text>
                    </TouchableOpacity>
                    {proofImage && (
                      <Image source={{ uri: proofImage.uri }} style={modalStyles.proofImage} />
                    )}
                    <TextInput
                      style={modalStyles.input}
                      placeholder="Received by (name)"
                      placeholderTextColor="#999"
                      value={receivedBy}
                      onChangeText={setReceivedBy}
                    />
                  </View>
                )}

                <View style={modalStyles.statusBtnsRow}>
                  {nextStatuses.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[modalStyles.statusUpdateBtn, { backgroundColor: STATUS_COLORS[s] }]}
                      onPress={() => handleStatusUpdate(s)}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={modalStyles.statusUpdateBtnText}>{STATUS_LABELS[s]}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ======================== MAIN LIST SCREEN ========================
export default function DeliveryListScreen({ user, onGoBack }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');

  const statusFilters = [
    { key: 'all', label: 'All' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'failed', label: 'Failed' },
    { key: 'returned', label: 'Returned' },
  ];

  const fetchDeliveries = useCallback(async (showLoader) => {
    if (showLoader) setLoading(true);
    try {
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/deliveries/my-deliveries`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (response.ok) {
        const list = result.deliveries || result.data || [];
        setDeliveries(list);
      } else {
        setDeliveries([]);
      }
    } catch (e) {
      console.log('Fetch deliveries error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeliveries(true);
  }, [fetchDeliveries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries(false);
  };

  const getFilteredDeliveries = () => {
    let list = deliveries;

    // Status filter
    if (activeStatusFilter !== 'all') {
      list = list.filter((d) => d.delivery_status === activeStatusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((d) => {
        const orderNum = (d.order_number || '').toLowerCase();
        const vendor = (d.vendor_name || '').toLowerCase();
        const mobile = (d.vendor_mobile || '').toLowerCase();
        const city = (d.delivery_address && d.delivery_address.city || '').toLowerCase();
        const address = (d.delivery_address && d.delivery_address.address || '').toLowerCase();
        return orderNum.includes(q) || vendor.includes(q) || mobile.includes(q) || city.includes(q) || address.includes(q);
      });
    }

    return list;
  };

  const filteredDeliveries = getFilteredDeliveries();

  // Count per status for filter badges
  const statusCounts = {};
  deliveries.forEach((d) => {
    statusCounts[d.delivery_status] = (statusCounts[d.delivery_status] || 0) + 1;
  });

  const openDetail = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetail(true);
  };

  const renderDeliveryCard = ({ item }) => {
    const addr = item.delivery_address || {};
    const addressText = [addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
    const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
    const deliveredDate = item.delivered_at ? new Date(item.delivered_at).toLocaleString() : '';

    return (
      <TouchableOpacity style={styles.deliveryCard} onPress={() => openDetail(item)} activeOpacity={0.7}>
        {/* Card Top Row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>{item.order_number || 'N/A'}</Text>
            {createdDate ? <Text style={styles.dateText}>{createdDate}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.delivery_status] || '#999' }]}>
              <Text style={styles.statusBadgeText}>{STATUS_LABELS[item.delivery_status] || item.delivery_status}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] || '#999', marginTop: 6 }]}>
              <Text style={styles.priorityText}>{(item.priority || 'medium').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardValue}>{item.vendor_name || 'N/A'}</Text>
            {item.vendor_mobile ? (
              <Text style={styles.cardMobile}>{item.vendor_mobile}</Text>
            ) : null}
          </View>
          {addressText ? (
            <View style={styles.cardRow}>
              <Text style={styles.cardIcon}>📍</Text>
              <Text style={[styles.cardValue, { flex: 1 }]} numberOfLines={2}>{addressText}</Text>
            </View>
          ) : null}
          {item.scheduled_date && (
            <View style={styles.cardRow}>
              <Text style={styles.cardIcon}>📅</Text>
              <Text style={styles.cardValue}>Scheduled: {new Date(item.scheduled_date).toLocaleDateString()}</Text>
            </View>
          )}
          {deliveredDate && item.delivery_status === 'delivered' ? (
            <View style={styles.cardRow}>
              <Text style={styles.cardIcon}>✅</Text>
              <Text style={[styles.cardValue, { color: '#4CAF50' }]}>Delivered: {deliveredDate}</Text>
            </View>
          ) : null}
        </View>

        {/* Order Total */}
        {item.order_id && item.order_id.grand_total != null && (
          <View style={styles.cardFooter}>
            <Text style={styles.totalLabel}>Order Total</Text>
            <Text style={styles.totalValue}>Rs.{item.order_id.grand_total.toFixed(2)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Deliveries</Text>
        <Text style={styles.headerCount}>{filteredDeliveries.length} items</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order #, vendor, mobile, city..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSearchQuery('')}>
            <Text style={styles.clearBtnText}>X</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {statusFilters.map((f) => {
          const count = f.key === 'all' ? deliveries.length : (statusCounts[f.key] || 0);
          const isActive = activeStatusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
                f.key !== 'all' && isActive && { backgroundColor: STATUS_COLORS[f.key] },
              ]}
              onPress={() => setActiveStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Delivery List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      ) : filteredDeliveries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>No deliveries found</Text>
          {searchQuery || activeStatusFilter !== 'all' ? (
            <TouchableOpacity
              style={styles.clearFiltersBtn}
              onPress={() => { setSearchQuery(''); setActiveStatusFilter('all'); }}
            >
              <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => item._id}
          renderItem={renderDeliveryCard}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" />}
        />
      )}

      {/* Detail Modal */}
      <DeliveryDetailModal
        visible={showDetail}
        onClose={() => { setShowDetail(false); setSelectedDelivery(null); }}
        delivery={selectedDelivery}
        user={user}
        onStatusUpdate={() => fetchDeliveries(false)}
      />
    </View>
  );
}

// ======================== STYLES ========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clearBtn: {
    position: 'absolute',
    right: 14,
    top: 12,
    padding: 4,
  },
  clearBtnText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '700',
  },

  // Filter Chips
  filterRow: {
    marginTop: 12,
    marginBottom: 8,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#1a1a2e',
    borderColor: '#1a1a2e',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Delivery Card
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  dateText: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  cardBody: {},
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIcon: {
    fontSize: 14,
    width: 24,
  },
  cardValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  cardMobile: {
    fontSize: 13,
    color: '#888',
    marginLeft: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '800',
  },

  // Empty / Loading
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  clearFiltersBtn: {
    marginTop: 16,
    backgroundColor: '#e53935',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearFiltersBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

// ======================== MODAL STYLES ========================
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: '700',
    color: '#999',
    padding: 8,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#f9f9fb',
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#888',
    width: 85,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  itemQty: {
    fontSize: 13,
    color: '#666',
    marginRight: 12,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 13,
    color: '#1a1a2e',
    fontWeight: '600',
  },
  proofBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  proofBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  proofImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  statusBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusUpdateBtn: {
    flex: 1,
    minWidth: 120,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statusUpdateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
