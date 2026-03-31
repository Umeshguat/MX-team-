import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import GPSCameraScreen from '../components/GPSCameraScreen';

var screenWidth = Dimensions.get('window').width;

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
function DeliveryDetailModal({ visible, onClose, delivery, user, onStatusUpdate, theme }) {
  const [updating, setUpdating] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [showGPSCamera, setShowGPSCamera] = useState(false);

  const getNextStatuses = (current) => {
    switch (current) {
      case 'assigned': return ['picked_up'];
      case 'picked_up': return ['in_transit'];
      case 'in_transit': return ['delivered', 'failed'];
      case 'failed': return ['in_transit', 'returned'];
      default: return [];
    }
  };

  const pickProofImage = () => {
    setShowGPSCamera(true);
  };

  const handleGPSCapture = (photoData) => {
    setShowGPSCamera(false);
    if (photoData && photoData.uri) {
      setProofImage({ uri: photoData.uri, base64: photoData.base64 || null });
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

  if (showGPSCamera) {
    return (
      <Modal visible={visible} animationType="slide">
        <GPSCameraScreen
          onCapture={handleGPSCapture}
          onClose={() => setShowGPSCamera(false)}
        />
      </Modal>
    );
  }

  const nextStatuses = getNextStatuses(delivery.delivery_status);
  const addr = delivery.delivery_address || {};
  const statusColor = STATUS_COLORS[delivery.delivery_status] || theme.textTertiary;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[mStyles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[mStyles.container, { backgroundColor: theme.surface }]}>
          {/* Handle bar */}
          <View style={mStyles.handleBarWrap}>
            <View style={[mStyles.handleBar, { backgroundColor: theme.divider }]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
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
              {delivery.scheduled_date && (
                <View style={[mStyles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={[mStyles.label, { color: theme.textTertiary }]}>Scheduled</Text>
                  <Text style={[mStyles.value, { color: theme.text }]}>{new Date(delivery.scheduled_date).toLocaleDateString()}</Text>
                </View>
              )}
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
            {delivery.order_id && delivery.order_id.items && delivery.order_id.items.length > 0 && (
              <View style={[mStyles.section, { backgroundColor: theme.surfaceVariant }]}>
                <View style={mStyles.sectionTitleRow}>
                  <View style={[mStyles.sectionBar, { backgroundColor: theme.warning }]} />
                  <Text style={[mStyles.sectionTitle, { color: theme.primary }]}>Order Items</Text>
                </View>
                {delivery.order_id.items.map((item, idx) => (
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
                ))}
                {delivery.order_id.grand_total != null && (
                  <View style={[mStyles.totalRow, { borderTopColor: theme.divider }]}>
                    <Text style={[mStyles.totalLabel, { color: theme.text }]}>Total</Text>
                    <Text style={[mStyles.totalPrice, { color: theme.primary }]}>Rs.{delivery.order_id.grand_total.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Update Status */}
            {nextStatuses.length > 0 && (
              <View style={[mStyles.section, { backgroundColor: theme.surfaceVariant }]}>
                <View style={mStyles.sectionTitleRow}>
                  <View style={[mStyles.sectionBar, { backgroundColor: theme.success }]} />
                  <Text style={[mStyles.sectionTitle, { color: theme.primary }]}>Update Status</Text>
                </View>
                {nextStatuses.includes('delivered') && (
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
                    {proofImage && (
                      <Image source={{ uri: proofImage.uri }} style={mStyles.proofImage} />
                    )}
                    <TextInput
                      style={[mStyles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.divider }]}
                      placeholder="Received by (name)"
                      placeholderTextColor={theme.textTertiary}
                      value={receivedBy}
                      onChangeText={setReceivedBy}
                    />
                  </View>
                )}
                <View style={mStyles.statusBtnsRow}>
                  {nextStatuses.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[mStyles.statusUpdateBtn, { backgroundColor: STATUS_COLORS[s] }]}
                      onPress={() => handleStatusUpdate(s)}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={mStyles.statusUpdateBtnText}>{STATUS_LABELS[s]}</Text>
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

// ======================== MAIN DASHBOARD ========================
export default function DeliveryDashboardScreen({ user, onLogout, onGoToProfile, onGoToDeliveryList }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [stats, setStats] = useState({ assigned: 0, picked_up: 0, in_transit: 0, delivered: 0, failed: 0, total: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const fetchDashboard = useCallback(async (showLoader) => {
    if (showLoader) setLoading(true);
    try {
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/deliveries/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (response.ok && result.data) {
        const d = result.data;
        setStats({
          assigned: d.pendingDeliveries || 0,
          picked_up: d.pickedUpDeliveries || 0,
          in_transit: d.inTransitDeliveries || 0,
          delivered: d.deliveredDeliveries || 0,
          failed: d.failedDeliveries || 0,
          total: d.totalDeliveries || 0,
          deliveredToday: d.deliveredToday || 0,
        });
        setDeliveries(d.latestDeliveries || []);
      } else {
        setDeliveries([]);
      }
    } catch (e) {
      console.log('Fetch dashboard error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const pendingDeliveries = deliveries.filter((d) => ['assigned', 'picked_up'].includes(d.delivery_status));
  const activeDeliveries = deliveries.filter((d) => d.delivery_status === 'in_transit');
  const pendingCount = stats.assigned + stats.picked_up;
  const activeCount = stats.in_transit;

  const openDetail = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetail(true);
  };

  const todayDelivered = stats.deliveredToday || 0;
  const recentDeliveries = deliveries.slice(0, 5);
  const firstLetter = user && user.fullName ? user.fullName.charAt(0).toUpperCase() : 'D';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={[theme.gradient1, theme.gradient2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {/* User avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstLetter}</Text>
            </View>
            <View style={styles.greetingWrap}>
              <Text style={styles.greeting}>Welcome Back,</Text>
              <Text style={styles.userName}>{user && user.fullName ? user.fullName : 'Delivery Agent'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
              <Text style={styles.themeToggleText}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      </LinearGradient>

      {/* Profile Card */}
      <TouchableOpacity
        style={[styles.profileCard, { backgroundColor: theme.surface }]}
        onPress={onGoToProfile}
        activeOpacity={0.7}
      >
        <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
          <Text style={styles.profileAvatarText}>{(user && user.fullName ? user.fullName : 'D').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: theme.text }]}>{user && user.fullName ? user.fullName : 'Delivery Agent'}</Text>
          <Text style={[styles.profileRole, { color: theme.textTertiary }]}>Delivery Agent</Text>
        </View>
        <Text style={[styles.profileArrow, { color: theme.textTertiary }]}>›</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live status bar */}
        <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statusDot, activeCount > 0 ? { backgroundColor: theme.success } : { backgroundColor: theme.textTertiary }]} />
          <Text style={[styles.statusTextLabel, { color: theme.text }]}>
            {activeCount > 0
              ? activeCount + ' Deliver' + (activeCount > 1 ? 'ies' : 'y') + ' In Transit'
              : pendingCount > 0
                ? pendingCount + ' Pending Deliver' + (pendingCount > 1 ? 'ies' : 'y')
                : 'No Active Deliveries'}
          </Text>
        </View>

        {/* Stats cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsEmojiWrap, { backgroundColor: theme.warningBg }]}>
              <Text style={styles.statsEmoji}>⏳</Text>
            </View>
            <Text style={[styles.statsNumber, { color: theme.primary }]}>{pendingCount}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>PENDING</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsEmojiWrap, { backgroundColor: theme.infoBg }]}>
              <Text style={styles.statsEmoji}>🚚</Text>
            </View>
            <Text style={[styles.statsNumber, { color: theme.primary }]}>{activeCount}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>IN TRANSIT</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsEmojiWrap, { backgroundColor: theme.successBg }]}>
              <Text style={styles.statsEmoji}>📦</Text>
            </View>
            <Text style={[styles.statsNumber, { color: theme.primary }]}>{todayDelivered}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>TODAY</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsEmojiWrap, { backgroundColor: theme.successBg }]}>
              <Text style={styles.statsEmoji}>✅</Text>
            </View>
            <Text style={[styles.statsNumber, { color: theme.primary }]}>{stats.delivered}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>DELIVERED</Text>
          </View>
        </View>

        {/* Total card full-width */}
        <View style={[styles.totalCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.statsEmojiWrap, { backgroundColor: theme.infoBg }]}>
            <Text style={styles.statsEmoji}>📊</Text>
          </View>
          <View style={styles.totalCardText}>
            <Text style={[styles.totalCardNumber, { color: theme.primary }]}>{stats.total}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>TOTAL DELIVERIES</Text>
          </View>
        </View>

        {/* Menu Cards */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        </View>
        <TouchableOpacity style={[styles.menuCard, { backgroundColor: theme.surface }]} onPress={onGoToDeliveryList} activeOpacity={0.7}>
          <View style={[styles.menuIconBg, { backgroundColor: theme.infoBg }]}>
            <Text style={styles.menuEmoji}>📦</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: theme.text }]}>All Deliveries</Text>
            <Text style={[styles.menuSub, { color: theme.textTertiary }]}>View all delivery orders</Text>
          </View>
          <Text style={[styles.menuArrow, { color: theme.textTertiary }]}>›</Text>
        </TouchableOpacity>

        {/* Recent Deliveries */}
        <View style={styles.recentHeader}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Deliveries</Text>
          </View>
          {onGoToDeliveryList && (
            <TouchableOpacity onPress={onGoToDeliveryList}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading deliveries...</Text>
          </View>
        ) : recentDeliveries.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.warningBg }]}>
              <Text style={styles.emptyIconText}>📦</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Deliveries</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>No pending deliveries at the moment</Text>
          </View>
        ) : (
          recentDeliveries.map((item) => {
            const addr = item.delivery_address || {};
            const addressText = [addr.city, addr.state].filter(Boolean).join(', ');
            const statusColor = STATUS_COLORS[item.delivery_status] || theme.textTertiary;
            const itemCount = item.order_id && item.order_id.items ? item.order_id.items.length : 0;
            return (
              <TouchableOpacity
                key={item._id}
                style={[styles.deliveryCard, { backgroundColor: theme.surface }]}
                onPress={() => openDetail(item)}
                activeOpacity={0.7}
              >
                {/* Left accent bar */}
                <View style={[styles.cardAccentBar, { backgroundColor: statusColor }]} />
                <View style={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.orderNumber, { color: theme.primary }]}>{item.order_number || 'N/A'}</Text>
                    <View style={[styles.cardStatusChip, { backgroundColor: statusColor }]}>
                      <Text style={styles.cardStatusText}>{STATUS_LABELS[item.delivery_status] || item.delivery_status}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={[styles.cardRow, { borderBottomColor: theme.divider }]}>
                      <Text style={[styles.cardLabel, { color: theme.textTertiary }]}>Vendor</Text>
                      <Text style={[styles.cardValue, { color: theme.text }]}>{item.vendor_name || 'N/A'}</Text>
                    </View>
                    {itemCount > 0 && (
                      <View style={[styles.cardRow, { borderBottomColor: theme.divider }]}>
                        <Text style={[styles.cardLabel, { color: theme.textTertiary }]}>Items</Text>
                        <Text style={[styles.cardValue, { color: theme.text }]}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
                      </View>
                    )}
                    {addressText ? (
                      <View style={[styles.cardRow, { borderBottomColor: theme.divider }]}>
                        <Text style={[styles.cardLabel, { color: theme.textTertiary }]}>City</Text>
                        <Text style={[styles.cardValue, { color: theme.text }]}>{addressText}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.cardRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.cardLabel, { color: theme.textTertiary }]}>Priority</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] || theme.textTertiary }]}>
                        <Text style={styles.priorityText}>{(item.priority || 'medium').toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.divider }]}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <Text style={[styles.navIcon, { color: theme.primary }]}>🏠</Text>
          <Text style={[styles.navLabel, { color: theme.primary }]}>Home</Text>
          <View style={[styles.navDot, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onGoToDeliveryList} activeOpacity={0.7}>
          <Text style={[styles.navIcon, { color: theme.textTertiary }]}>📦</Text>
          <Text style={[styles.navLabel, { color: theme.textTertiary }]}>Deliveries</Text>
        </TouchableOpacity>
      </View>

      {/* Detail Modal */}
      <DeliveryDetailModal
        visible={showDetail}
        onClose={() => { setShowDetail(false); setSelectedDelivery(null); }}
        delivery={selectedDelivery}
        user={user}
        onStatusUpdate={() => fetchDashboard(false)}
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
    paddingBottom: 25,
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  greetingWrap: {},
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  themeToggleText: {
    fontSize: 16,
  },
  logoutBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoutText: {
    color: '#ff8a80',
    fontSize: 13,
    fontWeight: '700',
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

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },

  // Status card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusTextLabel: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Stats cards
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statsEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statsEmoji: {
    fontSize: 22,
  },
  statsNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },

  // Total card
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 4,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  totalCardText: {
    marginLeft: 16,
  },
  totalCardNumber: {
    fontSize: 28,
    fontWeight: '900',
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

  // Quick Actions
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionCard: {
    width: (screenWidth - 52) / 2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Recent header
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Delivery card
  deliveryCard: {
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
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardStatusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  cardStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {},
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  cardLabel: {
    fontSize: 13,
    width: 75,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Empty / Loading
  centered: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
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
  },

  // Menu cards
  menuCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10, marginHorizontal: 16, elevation: 2, shadowColor: 'rgba(0,0,0,0.08)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  menuIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuEmoji: { fontSize: 22 },
  menuTextCol: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700' },
  menuSub: { fontSize: 12, marginTop: 2 },
  menuArrow: { fontSize: 24, fontWeight: '300' },

  // Bottom navigation
  bottomNav: { flexDirection: 'row', paddingVertical: 8, paddingBottom: 8, borderTopWidth: 1, alignItems: 'center', justifyContent: 'space-around' },
  navItem: { alignItems: 'center', paddingVertical: 4, flex: 1 },
  navIcon: { fontSize: 22, marginBottom: 4 },
  navLabel: { fontSize: 11, fontWeight: '600' },
  navDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },

  // Profile card
  profileCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: -20, padding: 14, borderRadius: 16, elevation: 4, shadowColor: 'rgba(0,0,0,0.1)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, zIndex: 10, marginBottom: 12 },
  profileAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800' },
  profileRole: { fontSize: 12, marginTop: 2 },
  profileArrow: { fontSize: 24, fontWeight: '300' },
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
    width: 80,
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
