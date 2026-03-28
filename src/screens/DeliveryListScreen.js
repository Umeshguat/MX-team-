import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

var STATUS_COLORS = {
  assigned: '#FF9800',
  picked_up: '#2196F3',
  in_transit: '#9C27B0',
  delivered: '#4CAF50',
  failed: '#F44336',
  returned: '#795548',
};

var STATUS_LABELS = {
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed',
  returned: 'Returned',
};

var STATUS_BG = {
  assigned: '#fff3e0',
  picked_up: '#e3f2fd',
  in_transit: '#f3e5f5',
  delivered: '#e8f5e9',
  failed: '#ffebee',
  returned: '#efebe9',
};

var PRIORITY_COLORS = {
  low: '#8BC34A',
  medium: '#FF9800',
  high: '#F44336',
  urgent: '#D50000',
};

// ======================== DELIVERY DETAIL MODAL ========================
function DeliveryDetailModal({ visible, onClose, delivery, user, onStatusUpdate }) {
  var [updating, setUpdating] = useState(false);
  var [proofImage, setProofImage] = useState(null);
  var [receivedBy, setReceivedBy] = useState('');

  var getNextStatuses = function(current) {
    switch (current) {
      case 'assigned': return ['picked_up'];
      case 'picked_up': return ['in_transit'];
      case 'in_transit': return ['delivered', 'failed'];
      case 'failed': return ['in_transit', 'returned'];
      default: return [];
    }
  };

  var pickProofImage = async function() {
    try {
      var result = await ImagePicker.launchCameraAsync({
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

  var handleStatusUpdate = async function(newStatus) {
    if (newStatus === 'delivered' && !proofImage) {
      Alert.alert('Required', 'Please capture delivery proof photo before marking as delivered');
      return;
    }
    setUpdating(true);
    try {
      var token = user && user.token ? user.token : '';
      var body = { delivery_status: newStatus };
      if (newStatus === 'delivered') {
        if (proofImage && proofImage.base64) {
          body.delivery_proof = {
            image_url: 'data:image/jpeg;base64,' + proofImage.base64,
            received_by: receivedBy.trim() || 'N/A',
          };
        }
      }
      var response = await fetch(BASE_URL + '/api/deliveries/' + delivery._id + '/status', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      var result = await response.json();
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

  var nextStatuses = getNextStatuses(delivery.delivery_status);
  var addr = delivery.delivery_address || {};

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Delivery Details</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={modalStyles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

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
              {delivery.scheduled_date ? (
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.label}>Scheduled</Text>
                  <Text style={modalStyles.value}>{new Date(delivery.scheduled_date).toLocaleDateString()}</Text>
                </View>
              ) : null}
              {delivery.delivered_at ? (
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.label}>Delivered</Text>
                  <Text style={modalStyles.value}>{new Date(delivery.delivered_at).toLocaleString()}</Text>
                </View>
              ) : null}
            </View>

            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Delivery Address</Text>
              {addr.address ? <Text style={modalStyles.addressText}>{addr.address}</Text> : null}
              <Text style={modalStyles.addressText}>
                {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'No address provided'}
              </Text>
            </View>

            {delivery.order_id && delivery.order_id.items && delivery.order_id.items.length > 0 ? (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Order Items</Text>
                {delivery.order_id.items.map(function(item, idx) {
                  return (
                    <View key={idx} style={modalStyles.itemRow}>
                      <Text style={modalStyles.itemName}>{item.product_name || 'Product'}</Text>
                      <Text style={modalStyles.itemQty}>x{item.quantity}</Text>
                      <Text style={modalStyles.itemPrice}>Rs.{(item.total_price || 0).toFixed(2)}</Text>
                    </View>
                  );
                })}
                {delivery.order_id.grand_total != null ? (
                  <View style={[modalStyles.itemRow, { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[modalStyles.itemName, { fontWeight: '700' }]}>Total</Text>
                    <Text style={[modalStyles.itemPrice, { fontWeight: '700' }]}>Rs.{delivery.order_id.grand_total.toFixed(2)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {delivery.delivery_status === 'delivered' && delivery.delivery_proof ? (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Delivery Proof</Text>
                {delivery.delivery_proof.received_by ? (
                  <View style={modalStyles.infoRow}>
                    <Text style={modalStyles.label}>Received By</Text>
                    <Text style={modalStyles.value}>{delivery.delivery_proof.received_by}</Text>
                  </View>
                ) : null}
                {delivery.delivery_proof.image_url ? (
                  <Image source={{ uri: delivery.delivery_proof.image_url }} style={modalStyles.proofImage} />
                ) : null}
              </View>
            ) : null}

            {nextStatuses.length > 0 ? (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Update Status</Text>
                {nextStatuses.includes('delivered') ? (
                  <View style={{ marginBottom: 12 }}>
                    <TouchableOpacity style={modalStyles.proofBtn} onPress={pickProofImage}>
                      <Text style={modalStyles.proofBtnText}>
                        {proofImage ? 'Retake Proof Photo' : 'Capture Delivery Proof'}
                      </Text>
                    </TouchableOpacity>
                    {proofImage ? (
                      <Image source={{ uri: proofImage.uri }} style={modalStyles.proofImage} />
                    ) : null}
                    <TextInput
                      style={modalStyles.input}
                      placeholder="Received by (name)"
                      placeholderTextColor="#999"
                      value={receivedBy}
                      onChangeText={setReceivedBy}
                    />
                  </View>
                ) : null}
                <View style={modalStyles.statusBtnsRow}>
                  {nextStatuses.map(function(s) {
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[modalStyles.statusUpdateBtn, { backgroundColor: STATUS_COLORS[s] }]}
                        onPress={function() { handleStatusUpdate(s); }}
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={modalStyles.statusUpdateBtnText}>{STATUS_LABELS[s]}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ======================== MAIN LIST SCREEN ========================
export default function DeliveryListScreen({ user, onGoBack }) {
  var [deliveries, setDeliveries] = useState([]);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);
  var [loadingMore, setLoadingMore] = useState(false);
  var [selectedDelivery, setSelectedDelivery] = useState(null);
  var [showDetail, setShowDetail] = useState(false);
  var [activeFilter, setActiveFilter] = useState('all');
  var [page, setPage] = useState(1);
  var [totalPages, setTotalPages] = useState(1);
  var [totalCount, setTotalCount] = useState(0);
  var [pendingCount, setPendingCount] = useState(0);
  var [inTransitCount, setInTransitCount] = useState(0);
  var [deliveredCount, setDeliveredCount] = useState(0);

  var token = user && user.token ? user.token : '';
  var LIMIT = 10;

  var getStatusFilter = function(filter) {
    if (filter === 'pending') return 'assigned';
    if (filter === 'in_transit') return 'in_transit';
    if (filter === 'delivered') return 'delivered';
    if (filter === 'failed') return 'failed';
    return '';
  };

  var fetchDeliveries = function(pageNum, isRefresh, filter) {
    if (isRefresh) {
      setRefreshing(true);
    } else if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    var payload = {
      delivery_status: getStatusFilter(filter !== undefined ? filter : activeFilter),
      priority: '',
      from: '',
      to: '',
      page: pageNum,
      limit: LIMIT,
    };

    fetch(BASE_URL + '/api/deliveries/my-deliveries', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(function(response) { return response.json(); })
      .then(function(result) {
        var list = result.deliveries || [];
        if (pageNum === 1) {
          setDeliveries(list);
        } else {
          setDeliveries(function(prev) { return prev.concat(list); });
        }
        setPage(result.page || pageNum);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.total || 0);
        setPendingCount(result.totalPending || 0);
        setInTransitCount(result.totalInTransit || 0);
        setDeliveredCount(result.totalDelivered || 0);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      })
      .catch(function(err) {
        console.log('Fetch deliveries error:', err);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      });
  };

  useEffect(function() {
    fetchDeliveries(1, false, activeFilter);
  }, [activeFilter]);

  var onRefresh = function() {
    fetchDeliveries(1, true);
  };

  var loadMore = function() {
    if (loadingMore || page >= totalPages) return;
    fetchDeliveries(page + 1, false);
  };

  var filteredList = deliveries;

  var openDetail = function(delivery) {
    setSelectedDelivery(delivery);
    setShowDetail(true);
  };

  var fullName = user && user.fullName ? user.fullName : (user && user.full_name ? user.full_name : 'Agent');

  var renderRecord = function({ item, index }) {
    var status = item.delivery_status || '';
    var statusColor = STATUS_COLORS[status] || '#bdbdbd';
    var statusBg = STATUS_BG[status] || '#f5f5f5';
    var addr = item.delivery_address || {};
    var cityText = [addr.city, addr.state].filter(Boolean).join(', ');

    return (
      <TouchableOpacity style={styles.recordCard} onPress={function() { openDetail(item); }} activeOpacity={0.7}>
        <View style={styles.recordLeft}>
          <View style={[styles.numBox, { backgroundColor: statusBg }]}>
            <Text style={[styles.numText, { color: statusColor }]}>{index + 1}</Text>
          </View>
        </View>
        <View style={styles.recordMiddle}>
          <Text style={styles.vendorName} numberOfLines={1}>{item.order_number || 'N/A'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{STATUS_LABELS[status] || status}</Text>
          </View>
          <Text style={styles.vendorInfo}>{item.vendor_name || 'Unknown'}{item.vendor_mobile ? ' | ' + item.vendor_mobile : ''}</Text>
          {cityText ? (
            <Text style={styles.addressInfo}>📍 {cityText}</Text>
          ) : null}
        </View>
        <View style={styles.recordRight}>
          <View style={[styles.priorityBox, { backgroundColor: PRIORITY_COLORS[item.priority] || '#FF9800' }]}>
            <Text style={styles.priorityText}>{(item.priority || 'med').substring(0, 3).toUpperCase()}</Text>
          </View>
          {item.order_id && item.order_id.grand_total != null ? (
            <View style={styles.totalBox}>
              <Text style={styles.totalValue}>Rs.{item.order_id.grand_total.toFixed(0)}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  var renderHeader = function() {
    return (
      <View>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <TouchableOpacity style={[styles.summaryCard, { backgroundColor: '#fff3e0' }]} onPress={function() { setActiveFilter('pending'); }}>
            <Text style={[styles.summaryCount, { color: '#FF9800' }]}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.summaryCard, { backgroundColor: '#f3e5f5' }]} onPress={function() { setActiveFilter('in_transit'); }}>
            <Text style={[styles.summaryCount, { color: '#9C27B0' }]}>{inTransitCount}</Text>
            <Text style={styles.summaryLabel}>In Transit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]} onPress={function() { setActiveFilter('delivered'); }}>
            <Text style={[styles.summaryCount, { color: '#4CAF50' }]}>{deliveredCount}</Text>
            <Text style={styles.summaryLabel}>Delivered</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'in_transit', label: 'Transit' },
            { key: 'delivered', label: 'Done' },
            { key: 'failed', label: 'Failed' },
          ].map(function(f) {
            var isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={function() { setActiveFilter(f.key); }}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Delivery Records</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Deliveries</Text>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerSubtitle}>{fullName}</Text>

        <View style={styles.locationBar}>
          <Text style={styles.locationIcon}>📦</Text>
          <Text style={styles.locationText}>
            {totalCount} deliver{totalCount !== 1 ? 'ies' : 'y'} total
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565c0" />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          renderItem={renderRecord}
          keyExtractor={function(item, index) { return item._id || String(index); }}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1565c0']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#1565c0" />
                <Text style={styles.footerLoaderText}>Loading more...</Text>
              </View>
            ) : page < totalPages ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            ) : deliveries.length > 0 ? (
              <Text style={styles.endText}>No more deliveries</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No deliveries found</Text>
              {activeFilter !== 'all' ? (
                <TouchableOpacity style={styles.clearFilterBtn} onPress={function() { setActiveFilter('all'); }}>
                  <Text style={styles.clearFilterText}>Show All</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <DeliveryDetailModal
        visible={showDetail}
        onClose={function() { setShowDetail(false); setSelectedDelivery(null); }}
        delivery={selectedDelivery}
        user={user}
        onStatusUpdate={function() { fetchDeliveries(1, false); }}
      />
    </View>
  );
}

// ======================== STYLES ========================
var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(229, 57, 53, 0.2)', top: -50, right: -40,
  },
  circle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255, 87, 34, 0.15)', top: 60, left: -50,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  backText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginBottom: 15,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  locationIcon: { fontSize: 16, marginRight: 8 },
  locationText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999', fontWeight: '600' },
  bodyContent: { padding: 16, paddingBottom: 30 },

  // Summary
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16,
  },
  summaryCard: {
    flex: 1, borderRadius: 14, padding: 12, marginHorizontal: 4, alignItems: 'center',
  },
  summaryCount: { fontSize: 22, fontWeight: '900' },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#666', marginTop: 4 },

  // Filter Tabs
  filterRow: {
    flexDirection: 'row', backgroundColor: '#e8e8ec', borderRadius: 12, padding: 3, marginBottom: 16,
  },
  filterTab: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#1a1a2e',
  },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  filterTabTextActive: { color: '#fff' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 15 },

  // Record Card
  recordCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  recordLeft: { marginRight: 12 },
  numBox: {
    width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  numText: { fontSize: 18, fontWeight: '800' },
  recordMiddle: { flex: 1 },
  vendorName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  vendorInfo: { fontSize: 12, color: '#999', fontWeight: '500' },
  addressInfo: { fontSize: 12, color: '#666', fontWeight: '500', marginTop: 2 },
  recordRight: { alignItems: 'center', minWidth: 55 },
  priorityBox: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6,
  },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  totalBox: {
    backgroundColor: '#f0f0f5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  totalValue: { fontSize: 11, fontWeight: '700', color: '#555' },

  // Empty
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 40, alignItems: 'center', elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999', fontWeight: '600' },
  clearFilterBtn: {
    marginTop: 14, backgroundColor: '#e53935', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  clearFilterText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  footerLoader: { paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  footerLoaderText: { marginLeft: 8, fontSize: 13, color: '#999', fontWeight: '600' },
  loadMoreBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8, marginBottom: 8,
  },
  loadMoreText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  endText: { textAlign: 'center', color: '#bbb', fontSize: 13, paddingVertical: 16, fontWeight: '500' },
});

// ======================== MODAL STYLES ========================
var modalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25,
    paddingHorizontal: 25, paddingTop: 20, paddingBottom: 40, maxHeight: '85%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  closeBtn: { fontSize: 20, color: '#999', fontWeight: '700', padding: 5 },
  section: {
    marginBottom: 20, backgroundColor: '#f9f9fb', borderRadius: 12, padding: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 13, color: '#888', width: 85, fontWeight: '500' },
  value: { fontSize: 14, color: '#333', fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  addressText: { fontSize: 14, color: '#555', lineHeight: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemName: { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },
  itemQty: { fontSize: 13, color: '#666', marginRight: 12, fontWeight: '600' },
  itemPrice: { fontSize: 13, color: '#1a1a2e', fontWeight: '600' },
  proofBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10,
  },
  proofBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  proofImage: {
    width: '100%', height: 150, borderRadius: 14, marginBottom: 10, resizeMode: 'cover',
  },
  input: {
    backgroundColor: '#f5f5f7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#eee',
  },
  statusBtnsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusUpdateBtn: {
    flex: 1, minWidth: 120, borderRadius: 12, paddingVertical: 14, alignItems: 'center', elevation: 6,
  },
  statusUpdateBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});
