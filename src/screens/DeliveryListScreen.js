import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import BackButton from '../components/BackButton';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

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
function DeliveryDetailModal({ visible, onClose, delivery, user, onStatusUpdate, theme }) {
  var [updating, setUpdating] = useState(false);
  var [proofImage, setProofImage] = useState(null);
  var [receivedBy, setReceivedBy] = useState('');
  var [paymentAmount, setPaymentAmount] = useState('');
  var [paymentMode, setPaymentMode] = useState('cash');
  var [transactionReference, setTransactionReference] = useState('');
  var [note, setNote] = useState('');
  var PAYMENT_MODES = [
    { key: 'cash', label: 'Cash' },
    { key: 'upi', label: 'UPI' },
    { key: 'card', label: 'Card' },
    { key: 'online', label: 'Online' },
    { key: 'marginx_bharat', label: 'MarginX Bharat' },
  ];

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
      var perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Camera permission is required. Enable it in settings.');
        return;
      }
      var result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.4,
        base64: true,
        allowsEditing: false,
      });
      if (result.canceled) {
        return;
      }
      var asset = null;
      if (result.assets && result.assets.length > 0) {
        asset = result.assets[0];
      } else if (result.uri) {
        asset = result;
      }
      if (!asset || !asset.uri) {
        Alert.alert('Error', 'Camera returned no image. Please try again.');
        return;
      }
      setProofImage({
        uri: asset.uri,
        base64: asset.base64 || null,
      });
    } catch (e) {
      Alert.alert('Camera Error', (e && e.message) ? e.message : String(e));
    }
  };

  var handleStatusUpdate = async function(newStatus) {
    setUpdating(true);
    try {
      var token = user && user.token ? user.token : '';
      var body = { delivery_status: newStatus };
      if (newStatus === 'delivered') {
        body.delivery_proof = {
          image_url: proofImage && proofImage.base64
            ? 'data:image/jpeg;base64,' + proofImage.base64
            : (proofImage && proofImage.uri ? proofImage.uri : ''),
          received_by: receivedBy.trim() || 'N/A',
          payment_amount: paymentAmount.trim() ? parseFloat(paymentAmount.trim()) : 0,
          payment_mode: paymentMode,
        };
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
        // Call payment API if delivered with payment amount
        if (newStatus === 'delivered' && paymentAmount.trim()) {
          var orderId = delivery.order_id && delivery.order_id._id ? delivery.order_id._id : delivery.order_id;
          try {
            var payResponse = await fetch(BASE_URL + '/api/payment-credits/' + orderId + '/pay', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: parseFloat(paymentAmount.trim()),
                payment_mode: paymentMode,
                transaction_reference: transactionReference.trim() || undefined,
                note: note.trim() || undefined,
              }),
            });
            var payResult = await payResponse.json();
            if (!payResponse.ok) {
              Alert.alert('Payment Warning', payResult.message || 'Payment recording failed, but delivery was updated.');
            }
          } catch (payErr) {
            Alert.alert('Payment Warning', 'Could not record payment, but delivery was updated.');
          }
        }
        Alert.alert('Success', 'Delivery status updated to ' + STATUS_LABELS[newStatus]);
        setProofImage(null);
        setReceivedBy('');
        setPaymentAmount('');
        setPaymentMode('cash');
        setTransactionReference('');
        setNote('');
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
  var statusColor = STATUS_COLORS[delivery.delivery_status] || theme.textTertiary;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={[mStyles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[mStyles.container, { backgroundColor: theme.surface }]}>
          {/* Handle bar */}
          <View style={mStyles.handleBarWrap}>
            <View style={[mStyles.handleBar, { backgroundColor: theme.divider }]} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Modal header */}
            <View style={mStyles.header}>
              <Text style={[mStyles.title, { color: theme.primary }]}>Delivery Details</Text>
              <TouchableOpacity
                style={[mStyles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={onClose}
              >
                <Text style={[mStyles.closeBtnText, { color: theme.textTertiary }]}>X</Text>
              </TouchableOpacity>
            </View>

            {/* Order Information */}
            <View style={[mStyles.section, { backgroundColor: theme.surfaceVariant }]}>
              <View style={mStyles.sectionTitleRow}>
                <View style={[mStyles.sectionBar, { backgroundColor: theme.primary }]} />
                <Text style={[mStyles.sectionTitle, { color: theme.primary }]}>Order Information</Text>
              </View>
              <View style={[mStyles.infoRow, { borderBottomColor: theme.divider }]}>
                <Text style={[mStyles.label, { color: theme.textTertiary }]}>Order #</Text>
                <Text style={[mStyles.value, { color: theme.text }]}>{delivery.order_number || 'N/A'}</Text>
              </View>
              <View style={[mStyles.infoRow, { borderBottomColor: theme.divider }]}>
                <Text style={[mStyles.label, { color: theme.textTertiary }]}>Vendor</Text>
                <Text style={[mStyles.value, { color: theme.text }]}>{delivery.vendor_name || 'N/A'}</Text>
              </View>
              <View style={[mStyles.infoRow, { borderBottomColor: theme.divider }]}>
                <Text style={[mStyles.label, { color: theme.textTertiary }]}>Mobile</Text>
                <Text style={[mStyles.value, { color: theme.text }]}>{delivery.vendor_mobile || 'N/A'}</Text>
              </View>
              <View style={[mStyles.infoRow, { borderBottomColor: theme.divider }]}>
                <Text style={[mStyles.label, { color: theme.textTertiary }]}>Status</Text>
                <View style={[mStyles.statusChip, { backgroundColor: statusColor }]}>
                  <Text style={mStyles.statusChipText}>{STATUS_LABELS[delivery.delivery_status] || delivery.delivery_status}</Text>
                </View>
              </View>
              <View style={[mStyles.infoRow, { borderBottomColor: theme.divider }]}>
                <Text style={[mStyles.label, { color: theme.textTertiary }]}>Priority</Text>
                <View style={[mStyles.statusChip, { backgroundColor: PRIORITY_COLORS[delivery.priority] || theme.textTertiary }]}>
                  <Text style={mStyles.statusChipText}>{(delivery.priority || 'medium').toUpperCase()}</Text>
                </View>
              </View>
              {delivery.scheduled_date ? (
                <View style={[mStyles.infoRow, { borderBottomColor: theme.divider }]}>
                  <Text style={[mStyles.label, { color: theme.textTertiary }]}>Scheduled</Text>
                  <Text style={[mStyles.value, { color: theme.text }]}>{new Date(delivery.scheduled_date).toLocaleDateString()}</Text>
                </View>
              ) : null}
              {delivery.delivered_at ? (
                <View style={[mStyles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={[mStyles.label, { color: theme.textTertiary }]}>Delivered</Text>
                  <Text style={[mStyles.value, { color: theme.text }]}>{new Date(delivery.delivered_at).toLocaleString()}</Text>
                </View>
              ) : null}
            </View>

            {/* Delivery Address */}
            <View style={[mStyles.section, { backgroundColor: theme.surfaceVariant }]}>
              <View style={mStyles.sectionTitleRow}>
                <View style={[mStyles.sectionBar, { backgroundColor: theme.info }]} />
                <Text style={[mStyles.sectionTitle, { color: theme.primary }]}>Delivery Address</Text>
              </View>
              {addr.address ? <Text style={[mStyles.addressText, { color: theme.textSecondary }]}>{addr.address}</Text> : null}
              <Text style={[mStyles.addressText, { color: theme.textSecondary }]}>
                {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'No address provided'}
              </Text>
            </View>

            {/* Order Items */}
            {delivery.order_id && delivery.order_id.items && delivery.order_id.items.length > 0 ? (
              <View style={[mStyles.section, { backgroundColor: theme.surfaceVariant }]}>
                <View style={mStyles.sectionTitleRow}>
                  <View style={[mStyles.sectionBar, { backgroundColor: theme.warning }]} />
                  <Text style={[mStyles.sectionTitle, { color: theme.primary }]}>Order Items</Text>
                </View>
                {delivery.order_id.items.map(function(item, idx) {
                  return (
                    <View
                      key={idx}
                      style={[
                        mStyles.itemRow,
                        idx < delivery.order_id.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                      ]}
                    >
                      <Text style={[mStyles.itemName, { color: theme.text }]}>{item.product_name || 'Product'}</Text>
                      <Text style={[mStyles.itemQty, { color: theme.textSecondary }]}>x{item.quantity}</Text>
                      <Text style={[mStyles.itemPrice, { color: theme.primary }]}>Rs.{(item.total_price || 0).toFixed(2)}</Text>
                    </View>
                  );
                })}
                {delivery.order_id.grand_total != null ? (
                  <View style={[mStyles.totalRow, { borderTopColor: theme.divider }]}>
                    <Text style={[mStyles.totalLabel, { color: theme.text }]}>Total</Text>
                    <Text style={[mStyles.totalPrice, { color: theme.primary }]}>Rs.{delivery.order_id.grand_total.toFixed(2)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Delivery Proof (for delivered items) */}
            {delivery.delivery_status === 'delivered' && delivery.delivery_proof ? (
              <View style={[mStyles.section, { backgroundColor: theme.surfaceVariant }]}>
                <View style={mStyles.sectionTitleRow}>
                  <View style={[mStyles.sectionBar, { backgroundColor: theme.success }]} />
                  <Text style={[mStyles.sectionTitle, { color: theme.primary }]}>Delivery Proof</Text>
                </View>
                {delivery.delivery_proof.received_by ? (
                  <View style={[mStyles.infoRow, { borderBottomColor: theme.divider }]}>
                    <Text style={[mStyles.label, { color: theme.textTertiary }]}>Received By</Text>
                    <Text style={[mStyles.value, { color: theme.text }]}>{delivery.delivery_proof.received_by}</Text>
                  </View>
                ) : null}
                {delivery.delivery_proof.image_url ? (
                  <Image source={{ uri: delivery.delivery_proof.image_url }} style={mStyles.proofImage} />
                ) : null}
              </View>
            ) : null}

            {/* Update Status */}
            {nextStatuses.length > 0 ? (
              <View style={[mStyles.section, { backgroundColor: theme.surfaceVariant }]}>
                <View style={mStyles.sectionTitleRow}>
                  <View style={[mStyles.sectionBar, { backgroundColor: theme.secondary }]} />
                  <Text style={[mStyles.sectionTitle, { color: theme.primary }]}>Update Status</Text>
                </View>
                {nextStatuses.includes('delivered') ? (
                  <View style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[mStyles.proofBtn, { backgroundColor: theme.primary }]}
                      onPress={pickProofImage}
                    >
                      <Text style={mStyles.proofBtnIcon}>📷</Text>
                      <Text style={mStyles.proofBtnText}>
                        {proofImage ? 'Retake Proof Photo' : 'Capture Delivery Proof'}
                      </Text>
                    </TouchableOpacity>
                    {proofImage ? (
                      <View>
                        <Text style={{ color: theme.success || 'green', fontSize: 12, marginTop: 6, marginBottom: 4 }}>
                          ✓ Photo captured ({proofImage.base64 ? 'with base64' : 'uri only'})
                        </Text>
                        <Image source={{ uri: proofImage.uri }} style={mStyles.proofImage} />
                      </View>
                    ) : (
                      <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 6 }}>
                        No photo captured yet (optional)
                      </Text>
                    )}
                    <TextInput
                      style={[mStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.divider }]}
                      placeholder="Received by (name)"
                      placeholderTextColor={theme.textTertiary}
                      value={receivedBy}
                      onChangeText={setReceivedBy}
                    />
                    <TextInput
                      style={[mStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.divider }]}
                      placeholder="Payment Amount (₹)"
                      placeholderTextColor={theme.textTertiary}
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      keyboardType="numeric"
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 4 }}>Payment Mode</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      {PAYMENT_MODES.map(function(mode) {
                        var isSelected = paymentMode === mode.key;
                        return (
                          <TouchableOpacity
                            key={mode.key}
                            onPress={function() { setPaymentMode(mode.key); }}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                              borderWidth: 1,
                              borderColor: isSelected ? theme.primary : theme.divider,
                            }}
                          >
                            <Text style={{ color: isSelected ? '#fff' : theme.text, fontWeight: isSelected ? '700' : '500', fontSize: 13 }}>
                              {mode.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TextInput
                      style={[mStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.divider }]}
                      placeholder="Transaction Reference"
                      placeholderTextColor={theme.textTertiary}
                      value={transactionReference}
                      onChangeText={setTransactionReference}
                    />
                    <TextInput
                      style={[mStyles.input, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.divider }]}
                      placeholder="Note (optional)"
                      placeholderTextColor={theme.textTertiary}
                      value={note}
                      onChangeText={setNote}
                    />
                  </View>
                ) : null}
                <View style={mStyles.statusBtnsRow}>
                  {nextStatuses.map(function(s) {
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[mStyles.statusUpdateBtn, { backgroundColor: STATUS_COLORS[s] }]}
                        onPress={function() { handleStatusUpdate(s); }}
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={mStyles.statusUpdateBtnText}>{STATUS_LABELS[s]}</Text>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ======================== MAIN LIST SCREEN ========================
export default function DeliveryListScreen({ user, onGoBack }) {
  var { theme } = useTheme();
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
  var firstLetter = fullName.charAt(0).toUpperCase();

  var FILTER_OPTIONS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_transit', label: 'Transit' },
    { key: 'delivered', label: 'Done' },
    { key: 'failed', label: 'Failed' },
  ];

  var renderRecord = function({ item, index }) {
    var status = item.delivery_status || '';
    var statusColor = STATUS_COLORS[status] || theme.textTertiary;
    var addr = item.delivery_address || {};
    var cityText = [addr.city, addr.state].filter(Boolean).join(', ');
    var itemCount = item.order_id && item.order_id.items ? item.order_id.items.length : 0;

    return (
      <TouchableOpacity
        style={[styles.recordCard, { backgroundColor: theme.surface }]}
        onPress={function() { openDetail(item); }}
        activeOpacity={0.7}
      >
        {/* Left accent bar colored by status */}
        <View style={[styles.cardAccentBar, { backgroundColor: statusColor }]} />
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <Text style={[styles.orderNumber, { color: theme.primary }]}>{item.order_number || 'N/A'}</Text>
            <View style={[styles.cardStatusChip, { backgroundColor: statusColor }]}>
              <Text style={styles.cardStatusChipText}>{STATUS_LABELS[status] || status}</Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <View style={[styles.cardRow, { borderBottomColor: theme.divider }]}>
              <Text style={[styles.cardLabel, { color: theme.textTertiary }]}>Vendor</Text>
              <Text style={[styles.cardValue, { color: theme.text }]} numberOfLines={1}>{item.vendor_name || 'Unknown'}</Text>
            </View>
            {itemCount > 0 && (
              <View style={[styles.cardRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.cardLabel, { color: theme.textTertiary }]}>Items</Text>
                <Text style={[styles.cardValue, { color: theme.text }]}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
              </View>
            )}
            {cityText ? (
              <View style={[styles.cardRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.cardLabel, { color: theme.textTertiary }]}>Location</Text>
                <Text style={[styles.cardValue, { color: theme.text }]}>{cityText}</Text>
              </View>
            ) : null}
            <View style={[styles.cardRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.cardLabel, { color: theme.textTertiary }]}>Priority</Text>
              <View style={styles.cardRowRight}>
                <View style={[styles.priorityChip, { backgroundColor: PRIORITY_COLORS[item.priority] || '#FF9800' }]}>
                  <Text style={styles.priorityChipText}>{(item.priority || 'med').substring(0, 3).toUpperCase()}</Text>
                </View>
                {item.order_id && item.order_id.grand_total != null ? (
                  <View style={[styles.totalBadge, { backgroundColor: theme.surfaceVariant }]}>
                    <Text style={[styles.totalBadgeText, { color: theme.textSecondary }]}>Rs.{item.order_id.grand_total.toFixed(0)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  var renderHeader = function() {
    return (
      <View>
        {/* Summary Cards (stats) */}
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: theme.surface }]}
            onPress={function() { setActiveFilter('pending'); }}
          >
            <View style={[styles.summaryEmojiWrap, { backgroundColor: theme.warningBg }]}>
              <Text style={styles.summaryEmoji}>⏳</Text>
            </View>
            <Text style={[styles.summaryCount, { color: theme.primary }]}>{pendingCount}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textTertiary }]}>PENDING</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: theme.surface }]}
            onPress={function() { setActiveFilter('in_transit'); }}
          >
            <View style={[styles.summaryEmojiWrap, { backgroundColor: theme.infoBg }]}>
              <Text style={styles.summaryEmoji}>🚚</Text>
            </View>
            <Text style={[styles.summaryCount, { color: theme.primary }]}>{inTransitCount}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textTertiary }]}>IN TRANSIT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: theme.surface }]}
            onPress={function() { setActiveFilter('delivered'); }}
          >
            <View style={[styles.summaryEmojiWrap, { backgroundColor: theme.successBg }]}>
              <Text style={styles.summaryEmoji}>✅</Text>
            </View>
            <Text style={[styles.summaryCount, { color: theme.primary }]}>{deliveredCount}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textTertiary }]}>DELIVERED</Text>
          </TouchableOpacity>
        </View>

        {/* Filter pills */}
        <View style={[styles.filterRow, { backgroundColor: theme.surfaceVariant }]}>
          {FILTER_OPTIONS.map(function(f) {
            var isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isActive && { backgroundColor: theme.primary }]}
                onPress={function() { setActiveFilter(f.key); }}
              >
                <Text style={[styles.filterPillText, { color: theme.textSecondary }, isActive && { color: '#fff' }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section title */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Records</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={[theme.gradient1, theme.gradient2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <View style={styles.headerTop}>
          <BackButton onPress={onGoBack} />
          <Text style={styles.headerTitle}>All Deliveries</Text>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{firstLetter}</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>{fullName}</Text>

        <View style={styles.locationBar}>
          <Text style={styles.locationIcon}>📦</Text>
          <Text style={styles.locationText}>
            {totalCount} deliver{totalCount !== 1 ? 'ies' : 'y'} total
          </Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading deliveries...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          renderItem={renderRecord}
          keyExtractor={function(item, index) { return item._id || String(index); }}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.footerLoaderText, { color: theme.textTertiary }]}>Loading more...</Text>
              </View>
            ) : page < totalPages ? (
              <TouchableOpacity style={[styles.loadMoreBtn, { backgroundColor: theme.primary }]} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            ) : deliveries.length > 0 ? (
              <View style={styles.paginationWrap}>
                <View style={[styles.pageIndicator, { backgroundColor: theme.primary }]}>
                  <Text style={styles.pageIndicatorText}>{page}</Text>
                </View>
                <Text style={[styles.paginationText, { color: theme.textTertiary }]}>of {totalPages} page{totalPages !== 1 ? 's' : ''}</Text>
                <View style={[styles.pageBadge, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={[styles.pageBadgeText, { color: theme.textSecondary }]}>{totalCount} total</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.warningBg }]}>
                <Text style={styles.emptyIconText}>📦</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Deliveries Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>Try changing the filter to see more results</Text>
              {activeFilter !== 'all' ? (
                <TouchableOpacity style={[styles.clearFilterBtn, { backgroundColor: theme.primary }]} onPress={function() { setActiveFilter('all'); }}>
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
        theme={theme}
      />
    </View>
  );
}

// ======================== STYLES ========================
var styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -50,
    right: -40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 60,
    left: -50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -30,
    right: 60,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // Summary cards (stats)
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  summaryEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryEmoji: {
    fontSize: 18,
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 12,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Record card
  recordCard: {
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardAccentBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardStatusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  cardStatusChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {},
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  cardLabel: {
    fontSize: 12,
    width: 70,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  cardRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginRight: 8,
  },
  priorityChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  totalBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Empty state
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  clearFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  clearFilterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Footer / Pagination
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerLoaderText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  loadMoreBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  paginationWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  pageIndicator: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pageIndicatorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  paginationText: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 10,
  },
  pageBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

// ======================== MODAL STYLES ========================
var mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handleBarWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 13,
    width: 85,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  itemQty: {
    fontSize: 13,
    marginRight: 12,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  proofBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  proofBtnIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  proofBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  proofImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
  },
  statusBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusUpdateBtn: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  statusUpdateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
