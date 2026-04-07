import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BASE_URL } from '../config';
import BackButton from '../components/BackButton';
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';

// ======================== CALENDAR DATE PICKER ========================
function CalendarPicker({ value, onSelect, onClose, theme }) {
  const parsed = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const daysInMonth = useMemo(() => new Date(viewYear, viewMonth + 1, 0).getDate(), [viewYear, viewMonth]);
  const firstDay = useMemo(() => new Date(viewYear, viewMonth, 1).getDay(), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDate = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onSelect(`${viewYear}-${m}-${d}`);
    onClose();
  };

  const selectedStr = value || '';

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={[calStyles.container, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
      <View style={calStyles.header}>
        <TouchableOpacity onPress={prevMonth} style={[calStyles.navBtn, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={[calStyles.navText, { color: theme.primary }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[calStyles.monthText, { color: theme.text }]}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={[calStyles.navBtn, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={[calStyles.navText, { color: theme.primary }]}>{'>'}</Text>
        </TouchableOpacity>
      </View>
      <View style={calStyles.daysRow}>
        {DAYS.map((d) => <Text key={d} style={[calStyles.dayLabel, { color: theme.textTertiary }]}>{d}</Text>)}
      </View>
      <View style={calStyles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={'e' + idx} style={calStyles.cell} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedStr;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          return (
            <TouchableOpacity
              key={day}
              style={[
                calStyles.cell,
                isSelected && { backgroundColor: theme.primary, borderRadius: 22 },
                isToday && !isSelected && { backgroundColor: theme.warningBg, borderRadius: 22 },
              ]}
              onPress={() => selectDate(day)}
              activeOpacity={0.6}
            >
              <Text style={[
                calStyles.cellText,
                { color: theme.text },
                isSelected && { color: '#fff', fontFamily: 'Poppins-Bold' },
                isToday && !isSelected && { color: '#e65100', fontFamily: 'Poppins-Bold' },
              ]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, marginTop: 4, marginBottom: 8, padding: 12, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navText: { fontSize: 16, fontFamily: 'Poppins-Bold' },
  monthText: { fontSize: 15, fontFamily: 'Poppins-Bold' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  dayLabel: { width: '14.28%', textAlign: 'center', fontSize: 12, fontFamily: 'Poppins-Bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
  cellText: { fontSize: 14, fontFamily: 'Poppins-Regular' },
});

const screenWidth = Dimensions.get('window').width;

// ======================== ERROR BOUNDARY ========================
class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.log('Screen crash:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Poppins-Bold', color: '#e53935', marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Poppins-Regular', color: '#666', textAlign: 'center', marginBottom: 16 }}>{this.state.error?.message || 'Unknown error'}</Text>
          <TouchableOpacity
            style={{ backgroundColor: '#4A67FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ======================== ALERTS TAB ========================
function AlertsTab({ user, refreshing, onRefresh, theme }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, low_stock, expiring

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

      // Fetch both low-stock and near-expiry alerts in parallel
      const [lowStockRes, expiryRes] = await Promise.all([
        fetch(`${BASE_URL}/api/inventory/alerts/low-stock`, { headers }),
        fetch(`${BASE_URL}/api/inventory/alerts/near-expiry?days=60`, { headers }),
      ]);

      const lowStockData = await lowStockRes.json();
      const expiryData = await expiryRes.json();

      const combined = [];

      // Map low stock products
      if (lowStockData.status === 200 && lowStockData.lowStockProducts) {
        lowStockData.lowStockProducts.forEach((p) => {
          combined.push({
            id: p._id,
            type: p.total_quantity === 0 ? 'out_of_stock' : 'low_stock',
            product: p.product_name,
            productCode: p.product_code,
            currentStock: p.total_quantity,
            minStock: p.reorder_level,
            severity: p.total_quantity === 0 ? 'critical' : (p.deficit > 20 ? 'high' : 'medium'),
            brand: p.brand,
            category: p.category,
            date: p.updatedAt ? p.updatedAt.split('T')[0] : '',
          });
        });
      }

      // Map near expiry alerts
      if (expiryData.status === 200 && expiryData.alerts) {
        expiryData.alerts.forEach((a) => {
          a.batches.forEach((b) => {
            combined.push({
              id: a._id + '_' + b.batch_id,
              type: 'expiring',
              product: a.product_name,
              productCode: a.product_code,
              currentStock: b.quantity,
              expiryDate: b.expiry_date ? b.expiry_date.split('T')[0] : '',
              daysToExpiry: b.days_to_expiry,
              batchNumber: b.batch_number,
              severity: b.days_to_expiry <= 0 ? 'critical' : (b.days_to_expiry <= 15 ? 'high' : (b.days_to_expiry <= 30 ? 'medium' : 'low')),
              brand: a.brand,
              date: b.expiry_date ? b.expiry_date.split('T')[0] : '',
            });
          });
        });
      }

      setAlerts(combined);
    } catch (e) {
      console.log('Inventory alerts fetch error:', e);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'low_stock': return <MaterialCommunityIcons name="trending-down" size={20} />;
      case 'expiring': return <Ionicons name="alarm" size={20} />;
      case 'out_of_stock': return <MaterialCommunityIcons name="cancel" size={20} />;
      default: return <Ionicons name="warning" size={20} />;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return theme.error || '#e53935';
      case 'high': return theme.warning;
      case 'medium': return theme.info;
      case 'low': return theme.success;
      default: return theme.textTertiary;
    }
  };

  const getAlertBg = (severity) => {
    switch (severity) {
      case 'critical': return theme.errorBg;
      case 'high': return theme.warningBg;
      case 'medium': return theme.infoBg;
      case 'low': return theme.successBg;
      default: return theme.surfaceVariant;
    }
  };

  const getAlertLabel = (type) => {
    switch (type) {
      case 'low_stock': return 'Low Stock';
      case 'expiring': return 'Expiring Soon';
      case 'out_of_stock': return 'Out of Stock';
      default: return 'Alert';
    }
  };

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'low_stock', label: 'Low Stock' },
    { key: 'expiring', label: 'Expiring' },
    { key: 'out_of_stock', label: 'Out of Stock' },
  ];

  const lowStockCount = alerts.filter(a => a.type === 'low_stock').length;
  const expiringCount = alerts.filter(a => a.type === 'expiring').length;
  const outOfStockCount = alerts.filter(a => a.type === 'out_of_stock').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { onRefresh(); fetchAlerts(); }} colors={[theme.primary]} />}
    >
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.summaryAccent, { backgroundColor: theme.error || theme.primary }]} />
          <View style={[styles.summaryIconWrap, { backgroundColor: theme.errorBg }]}>
            <MaterialCommunityIcons name="cancel" size={18} color={theme.error || theme.primary} />
          </View>
          <Text style={[styles.summaryCount, { color: theme.error || theme.primary }]}>{outOfStockCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textTertiary }]}>OUT OF STOCK</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.summaryAccent, { backgroundColor: theme.warning }]} />
          <View style={[styles.summaryIconWrap, { backgroundColor: theme.warningBg }]}>
            <MaterialCommunityIcons name="trending-down" size={18} color={theme.warning} />
          </View>
          <Text style={[styles.summaryCount, { color: theme.warning }]}>{lowStockCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textTertiary }]}>LOW STOCK</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.summaryAccent, { backgroundColor: theme.info }]} />
          <View style={[styles.summaryIconWrap, { backgroundColor: theme.infoBg }]}>
            <Ionicons name="alarm" size={18} color={theme.info} />
          </View>
          <Text style={[styles.summaryCount, { color: theme.info }]}>{expiringCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textTertiary }]}>EXPIRING</Text>
        </View>
      </View>

      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.filterChip,
              { backgroundColor: theme.surfaceVariant },
              filter === opt.key && { backgroundColor: theme.primary },
            ]}
            onPress={() => setFilter(opt.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterChipText,
              { color: theme.textSecondary },
              filter === opt.key && { color: '#fff' },
            ]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.successBg }]}>
            <Ionicons name="checkmark-circle" size={28} color={theme.success} />
          </View>
          <Text style={[styles.emptyText, { color: theme.text }]}>No alerts found</Text>
          <Text style={[styles.emptySubText, { color: theme.textTertiary }]}>All inventory levels are healthy</Text>
        </View>
      ) : (
        filteredAlerts.map((item) => (
          <View key={item.id} style={[styles.alertCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.alertAccentBar, { backgroundColor: getAlertColor(item.severity) }]} />
            <View style={[styles.alertIconWrap, { backgroundColor: getAlertBg(item.severity) }]}>
              <View style={styles.alertIconText}>{getAlertIcon(item.type)}</View>
            </View>
            <View style={styles.alertInfo}>
              <Text style={[styles.alertProduct, { color: theme.text }]} numberOfLines={1}>{item.product}</Text>
              <View style={styles.alertMeta}>
                <View style={[styles.alertBadge, { backgroundColor: getAlertBg(item.severity) }]}>
                  <Text style={[styles.alertBadgeText, { color: getAlertColor(item.severity) }]}>{getAlertLabel(item.type)}</Text>
                </View>
                <Text style={[styles.alertDate, { color: theme.textTertiary }]}>{item.date}</Text>
              </View>
              {item.type === 'low_stock' || item.type === 'out_of_stock' ? (
                <Text style={[styles.alertDetail, { color: theme.textSecondary }]}>Stock: {item.currentStock} / Min: {item.minStock}</Text>
              ) : (
                <Text style={[styles.alertDetail, { color: theme.textSecondary }]}>Expires: {item.expiryDate} | Qty: {item.currentStock}</Text>
              )}
            </View>
            <View style={[styles.severityDot, { backgroundColor: getAlertColor(item.severity) }]} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ======================== REPORTS TAB ========================
function ReportsTab({ user, refreshing, onRefresh, theme }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [agingReport, setAgingReport] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

      const [dashResult, agingResult] = await Promise.allSettled([
        fetch(`${BASE_URL}/api/inventory/dashboard`, { headers }).then(r => r.json()),
        fetch(`${BASE_URL}/api/inventory/reports/stock-aging`, { headers }).then(r => r.json()),
      ]);

      const dashData = dashResult.status === 'fulfilled' ? dashResult.value : {};
      const agingData = agingResult.status === 'fulfilled' ? agingResult.value : {};

      if (dashData.status === 200 && dashData.dashboard) {
        const d = dashData.dashboard;
        // Build brand summary for category chart
        const brandSummary = [];
        if (d.brandWise) {
          Object.keys(d.brandWise).forEach((brand) => {
            brandSummary.push({
              name: brand,
              count: d.brandWise[brand].products,
              quantity: d.brandWise[brand].total_quantity,
              value: d.brandWise[brand].value,
            });
          });
        }
        setReportData({
          totalProducts: d.totalProducts || 0,
          totalValue: d.totalStockValue || 0,
          lowStockItems: d.lowStockCount || 0,
          expiringItems: d.nearExpiryCount || 0,
          expiredItems: d.expiredCount || 0,
          brandSummary,
        });
      }

      if (agingData.status === 200 && agingData.report) {
        setAgingReport(agingData.report);
      }
    } catch (e) {
      console.log('Inventory reports fetch error:', e);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + val;
  };

  const reportMenus = [
    { key: 'stock_summary', icon: '📦', label: 'Stock Summary', color: theme.infoBg, desc: 'Current stock levels & value' },
    { key: 'movement', icon: '🔄', label: 'Stock Movement', color: theme.successBg, desc: 'Inward & outward transactions' },
    { key: 'expiry', icon: '⏰', label: 'Expiry Report', color: theme.warningBg, desc: 'Products nearing expiry' },
    { key: 'category', icon: '📊', label: 'Category Wise', color: theme.errorBg, desc: 'Category breakdown & analytics' },
    { key: 'valuation', icon: '💰', label: 'Valuation Report', color: theme.surfaceVariant, desc: 'Inventory valuation details' },
    { key: 'dead_stock', icon: '📉', label: 'Dead Stock', color: theme.surfaceVariant, desc: 'Non-moving inventory items' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { onRefresh(); fetchReportData(); }} colors={[theme.primary]} />}
    >
      {/* Overview Cards */}
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.overviewIconWrap, { backgroundColor: theme.infoBg }]}>
            <Text style={{ fontSize: 18 }}>📦</Text>
          </View>
          <Text style={[styles.overviewValue, { color: theme.text }]}>{reportData ? reportData.totalProducts : 0}</Text>
          <Text style={[styles.overviewLabel, { color: theme.textTertiary }]}>TOTAL PRODUCTS</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.overviewIconWrap, { backgroundColor: theme.successBg }]}>
            <Text style={{ fontSize: 18 }}>💰</Text>
          </View>
          <Text style={[styles.overviewValue, { color: theme.text }]}>{reportData ? formatCurrency(reportData.totalValue) : '₹0'}</Text>
          <Text style={[styles.overviewLabel, { color: theme.textTertiary }]}>STOCK VALUE</Text>
        </View>
      </View>
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.overviewIconWrap, { backgroundColor: theme.warningBg }]}>
            <Text style={{ fontSize: 18 }}>⚠</Text>
          </View>
          <Text style={[styles.overviewValue, { color: theme.warning }]}>{reportData ? reportData.lowStockItems : 0}</Text>
          <Text style={[styles.overviewLabel, { color: theme.textTertiary }]}>LOW STOCK</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.overviewIconWrap, { backgroundColor: theme.errorBg }]}>
            <Text style={{ fontSize: 18 }}>⏰</Text>
          </View>
          <Text style={[styles.overviewValue, { color: theme.error || theme.primary }]}>{reportData ? reportData.expiringItems : 0}</Text>
          <Text style={[styles.overviewLabel, { color: theme.textTertiary }]}>EXPIRING SOON</Text>
        </View>
      </View>

      {/* Brand Summary */}
      {reportData && reportData.brandSummary && reportData.brandSummary.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Brand Breakdown</Text>
          </View>
          {reportData.brandSummary.map((cat, idx) => {
            const maxCount = Math.max(...reportData.brandSummary.map(c => c.count), 1);
            const barWidth = (cat.count / maxCount) * 100;
            return (
              <View key={idx} style={[styles.categoryRow, { backgroundColor: theme.surface }]}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.text }]}>{cat.name}</Text>
                  <Text style={[styles.categoryCount, { color: theme.textTertiary }]}>{cat.count} products | {cat.quantity} units</Text>
                </View>
                <View style={[styles.categoryBarBg, { backgroundColor: theme.divider }]}>
                  <View style={[styles.categoryBar, { width: barWidth + '%', backgroundColor: theme.primary }]} />
                </View>
                <Text style={[styles.categoryValue, { color: theme.text }]}>{formatCurrency(cat.value)}</Text>
              </View>
            );
          })}
        </>
      ) : null}

      {/* Stock Aging Report */}
      {agingReport.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBar, { backgroundColor: theme.secondary }]} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Stock Aging Report</Text>
          </View>
          {agingReport.map((item) => {
            const categoryName = item.category?.category_name || (typeof item.category === 'string' ? item.category : '');
            const brandName = item.brand?.brand_name || (typeof item.brand === 'string' ? item.brand : '');
            return (
              <View key={item._id} style={[styles.movementCard, { backgroundColor: theme.surface }]}>
                <View style={styles.movementInfo}>
                  <Text style={[styles.movementProduct, { color: theme.text }]} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={[styles.movementParty, { color: theme.textTertiary }]}>{item.product_code}{brandName ? ` | ${brandName}` : ''}{categoryName ? ` | ${categoryName}` : ''}</Text>
                  <Text style={[styles.movementParty, { color: theme.textTertiary }]}>Qty: {item.total_quantity || 0} | Shelf Life: {item.shelf_life_days || 0} days</Text>
                </View>
                <View style={styles.agingBadges}>
                  {item.aging?.green?.total_qty > 0 ? (
                    <View style={[styles.agingBadge, { backgroundColor: theme.successBg }]}>
                      <Text style={[styles.agingBadgeText, { color: theme.success }]}>{item.aging.green.total_qty}</Text>
                    </View>
                  ) : null}
                  {item.aging?.yellow?.total_qty > 0 ? (
                    <View style={[styles.agingBadge, { backgroundColor: theme.warningBg }]}>
                      <Text style={[styles.agingBadgeText, { color: theme.warning }]}>{item.aging.yellow.total_qty}</Text>
                    </View>
                  ) : null}
                  {item.aging?.red?.total_qty > 0 ? (
                    <View style={[styles.agingBadge, { backgroundColor: theme.errorBg }]}>
                      <Text style={[styles.agingBadgeText, { color: theme.error || theme.primary }]}>{item.aging.red.total_qty}</Text>
                    </View>
                  ) : null}
                  {item.aging?.expired?.total_qty > 0 ? (
                    <View style={[styles.agingBadge, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={[styles.agingBadgeText, { color: theme.textTertiary }]}>{item.aging.expired.total_qty}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
          <View style={styles.agingLegend}>
            <View style={styles.agingLegendItem}><View style={[styles.agingLegendDot, { backgroundColor: theme.success }]} /><Text style={[styles.agingLegendText, { color: theme.textSecondary }]}>Good</Text></View>
            <View style={styles.agingLegendItem}><View style={[styles.agingLegendDot, { backgroundColor: theme.warning }]} /><Text style={[styles.agingLegendText, { color: theme.textSecondary }]}>{'<60d'}</Text></View>
            <View style={styles.agingLegendItem}><View style={[styles.agingLegendDot, { backgroundColor: theme.error || theme.primary }]} /><Text style={[styles.agingLegendText, { color: theme.textSecondary }]}>{'<30d'}</Text></View>
            <View style={styles.agingLegendItem}><View style={[styles.agingLegendDot, { backgroundColor: theme.textTertiary }]} /><Text style={[styles.agingLegendText, { color: theme.textSecondary }]}>Expired</Text></View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// ======================== PRODUCTS TAB ========================
function ProductsTab({ user, refreshing, onRefresh, theme, onGoBack }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Stock In/Out modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalType, setStockModalType] = useState('in'); // 'in' or 'out'
  const [stockQty, setStockQty] = useState('');
  const [stockBatchNumber, setStockBatchNumber] = useState('');
  const [stockMfgDate, setStockMfgDate] = useState('');
  const [stockExpDate, setStockExpDate] = useState('');
  const [showMfgCal, setShowMfgCal] = useState(false);
  const [showExpCal, setShowExpCal] = useState(false);
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [stockReference, setStockReference] = useState('');
  const [stockNote, setStockNote] = useState('');

  // Add product form states
  const [productName, setProductName] = useState('');
  const [productSKU, setProductSKU] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productBrand, setProductBrand] = useState('');
  const [productBrandId, setProductBrandId] = useState('');
  const [brandsList, setBrandsList] = useState([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [addingBrand, setAddingBrand] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [productPrice, setProductPrice] = useState('');
  const [productMinStock, setProductMinStock] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [productShelfLife, setProductShelfLife] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchBrands();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/inventory/products`, {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      console.log('Inventory products API:', JSON.stringify(result).substring(0, 200));
      if (result.status === 200 && result.products) {
        // Map backend fields to UI fields
        const mapped = result.products.map((p) => {
          var status = 'in_stock';
          if (p.total_quantity === 0) status = 'out_of_stock';
          else if (p.total_quantity <= p.reorder_level) status = 'low_stock';
          return {
            id: p._id || String(Math.random()),
            name: p.product_name || '',
            sku: p.product_code || '',
            brand: p.brand && typeof p.brand === 'object' ? p.brand.brand_name : (p.brand || ''),
            brandId: p.brand && typeof p.brand === 'object' ? p.brand._id : '',
            category: p.category && typeof p.category === 'object' ? p.category.category_name : (p.category || ''),
            categoryId: p.category && typeof p.category === 'object' ? p.category._id : '',
            price: p.selling_price || 0,
            stock: p.total_quantity || 0,
            minStock: p.reorder_level || 0,
            unit: p.unit || '',
            status: status,
            description: p.description || '',
            shelfLife: p.shelf_life_days || 0,
            batches: p.batches || [],
            image: p.image || null,
            is_active: p.is_active,
          };
        });
        setProducts(mapped);
      }
    } catch (e) {
      console.log('Inventory products fetch error:', e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/admin/brands`, {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      console.log('Brands API response:', JSON.stringify(result).substring(0, 500));
      if (result.brands) {
        setBrandsList(result.brands);
      } else if (result.data) {
        setBrandsList(result.data);
      } else if (Array.isArray(result)) {
        setBrandsList(result);
      }
    } catch (e) {
      console.log('Brands fetch error:', e);
    }
  };

  const addBrand = async () => {
    if (!newBrandName.trim()) {
      Alert.alert('Error', 'Brand name is required');
      return;
    }
    try {
      setAddingBrand(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/admin/brands`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_name: newBrandName.trim() }),
      });
      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Brand added successfully');
        const addedName = newBrandName.trim();
        const addedId = result._id || '';
        setNewBrandName('');
        setShowAddBrandModal(false);
        await fetchBrands();
        setProductBrand(addedName);
        setProductBrandId(addedId);
      } else {
        Alert.alert('Error', result.message || 'Failed to add brand');
      }
    } catch (e) {
      console.log('Add brand error:', e);
      Alert.alert('Error', 'Failed to add brand');
    } finally {
      setAddingBrand(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/admin/categories`, {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      console.log('Categories API response:', JSON.stringify(result).substring(0, 500));
      if (result.categories) {
        setCategoriesList(result.categories);
      } else if (result.data) {
        setCategoriesList(result.data);
      } else if (Array.isArray(result)) {
        setCategoriesList(result);
      }
    } catch (e) {
      console.log('Categories fetch error:', e);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    try {
      setAddingCategory(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/admin/categories`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_name: newCategoryName.trim() }),
      });
      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Category added successfully');
        const addedName = newCategoryName.trim();
        const addedId = result._id || '';
        setNewCategoryName('');
        setShowAddCategoryModal(false);
        await fetchCategories();
        setProductCategory(addedName);
        setProductCategoryId(addedId);
      } else {
        Alert.alert('Error', result.message || 'Failed to add category');
      }
    } catch (e) {
      console.log('Add category error:', e);
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setAddingCategory(false);
    }
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'in_stock': return theme.success;
      case 'low_stock': return theme.warning;
      case 'out_of_stock': return theme.error || theme.primary;
      default: return theme.textTertiary;
    }
  };

  const getStockStatusBg = (status) => {
    switch (status) {
      case 'in_stock': return theme.successBg;
      case 'low_stock': return theme.warningBg;
      case 'out_of_stock': return theme.errorBg;
      default: return theme.surfaceVariant;
    }
  };

  const getStockStatusLabel = (status) => {
    switch (status) {
      case 'in_stock': return 'In Stock';
      case 'low_stock': return 'Low Stock';
      case 'out_of_stock': return 'Out of Stock';
      default: return '--';
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const brands = ['all', ...new Set(products.map(p => p.brand).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || name.includes(query) || sku.includes(query);
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesBrand = brandFilter === 'all' || p.brand === brandFilter;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const pickProductImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProductImage(result.assets[0].uri);
    }
  };

  const resetForm = () => {
    setProductName('');
    setProductSKU('');
    setProductCategory('');
    setProductCategoryId('');
    setProductBrand('');
    setProductBrandId('');
    setProductPrice('');
    setProductMinStock('');
    setProductUnit('');
    setProductShelfLife('');
    setProductDescription('');
    setProductImage(null);
  };

  const resetStockForm = () => {
    setStockQty('');
    setStockBatchNumber('');
    setStockMfgDate('');
    setStockExpDate('');
    setStockPurchasePrice('');
    setStockReference('');
    setStockNote('');
    setShowMfgCal(false);
    setShowExpCal(false);
  };

  const submitProduct = async () => {
    if (!productName.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!productSKU.trim()) { Alert.alert('Error', 'Product code is required'); return; }
    if (!productBrandId) { Alert.alert('Error', 'Brand is required'); return; }
    if (!productCategoryId) { Alert.alert('Error', 'Category is required'); return; }
    if (!productPrice.trim()) { Alert.alert('Error', 'Selling price is required'); return; }
    if (!productUnit.trim()) { Alert.alert('Error', 'Unit is required'); return; }
    if (!productMinStock.trim()) { Alert.alert('Error', 'Reorder level is required'); return; }
    if (!productShelfLife.trim()) { Alert.alert('Error', 'Shelf life is required'); return; }

    try {
      setSubmitting(true);
      const token = user && user.token ? user.token : '';
      const payload = {
        product_name: productName.trim(),
        product_code: productSKU.trim(),
        brand: productBrandId,
        category: productCategoryId,
        description: productDescription.trim(),
        unit: productUnit.trim(),
        selling_price: parseFloat(productPrice),
        reorder_level: parseInt(productMinStock),
        shelf_life_days: parseInt(productShelfLife),
        image: productImage || '',
      };
      const response = await fetch(`${BASE_URL}/api/inventory/products`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log('Add product API:', JSON.stringify(result));
      if (result.status === 201) {
        Alert.alert('Success', 'Product created successfully');
        setShowAddModal(false);
        resetForm();
        fetchProducts();
      } else {
        Alert.alert('Error', result.message || 'Failed to add product');
      }
    } catch (e) {
      console.log('Add product error:', e);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitStockIn = async () => {
    if (!stockBatchNumber.trim()) { Alert.alert('Error', 'Batch number is required'); return; }
    if (!stockQty.trim()) { Alert.alert('Error', 'Quantity is required'); return; }
    if (!stockMfgDate.trim()) { Alert.alert('Error', 'Manufacturing date is required (YYYY-MM-DD)'); return; }
    if (!stockExpDate.trim()) { Alert.alert('Error', 'Expiry date is required (YYYY-MM-DD)'); return; }
    if (!stockPurchasePrice.trim()) { Alert.alert('Error', 'Purchase price is required'); return; }

    try {
      setSubmitting(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/inventory/products/${selectedProduct.id}/batches`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch_number: stockBatchNumber.trim(),
          quantity: parseInt(stockQty),
          manufacturing_date: stockMfgDate.trim(),
          expiry_date: stockExpDate.trim(),
          purchase_price: parseFloat(stockPurchasePrice),
          reference: stockReference.trim(),
          note: stockNote.trim(),
        }),
      });
      const result = await response.json();
      if (result.status === 201) {
        Alert.alert('Success', 'Stock added successfully');
        setShowStockModal(false);
        resetStockForm();
        fetchProducts();
      } else {
        Alert.alert('Error', result.message || 'Failed to add stock');
      }
    } catch (e) {
      console.log('Stock in error:', e);
      Alert.alert('Error', 'Failed to add stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitStockOut = async () => {
    if (!stockQty.trim()) { Alert.alert('Error', 'Quantity is required'); return; }

    try {
      setSubmitting(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/inventory/products/${selectedProduct.id}/stock-out`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: parseInt(stockQty),
          reference: stockReference.trim(),
          note: stockNote.trim(),
        }),
      });
      const result = await response.json();
      if (result.status === 200) {
        Alert.alert('Success', result.lowStockAlert || 'Stock out processed successfully');
        setShowStockModal(false);
        resetStockForm();
        fetchProducts();
      } else {
        Alert.alert('Error', result.message || 'Failed to process stock out');
      }
    } catch (e) {
      console.log('Stock out error:', e);
      Alert.alert('Error', 'Failed to process stock out. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchInputWrap, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search products or SKU..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.searchClear, { color: theme.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.addProductBtn, { backgroundColor: theme.buttonPrimary, shadowColor: theme.buttonPrimary }]}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addProductBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              { backgroundColor: theme.surfaceVariant },
              categoryFilter === cat && { backgroundColor: theme.primary },
            ]}
            onPress={() => setCategoryFilter(cat)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterChipText,
              { color: theme.textSecondary },
              categoryFilter === cat && { color: '#fff' },
            ]}>
              {cat === 'all' ? 'All' : cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Brand Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {brands.map((br) => (
          <TouchableOpacity
            key={br}
            style={[
              styles.filterChip,
              { backgroundColor: theme.surfaceVariant },
              brandFilter === br && { backgroundColor: theme.primary },
            ]}
            onPress={() => setBrandFilter(br)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterChipText,
              { color: theme.textSecondary },
              brandFilter === br && { color: '#fff' },
            ]}>
              {br === 'all' ? 'All Brands' : br}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.resultCount, { color: theme.textTertiary }]}>{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found</Text>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { onRefresh(); fetchProducts(); }} colors={[theme.primary]} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.productCard, { backgroundColor: theme.surface }]}
            activeOpacity={0.7}
            onPress={() => { setSelectedProduct(item); setShowDetailModal(true); }}
          >
            <View style={[styles.productAccentBar, { backgroundColor: getStockStatusColor(item.status) }]} />
            <View style={styles.productLeft}>
              <View style={[styles.productThumb, { backgroundColor: getStockStatusBg(item.status) }]}>
                <Text style={[styles.productThumbText, { color: theme.text }]}>{(item.name || '?').charAt(0)}</Text>
              </View>
            </View>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.productSKU, { color: theme.textTertiary }]}>SKU: {item.sku}</Text>
              <View style={styles.productMetaRow}>
                <Text style={[styles.productCategory, { color: theme.textSecondary }]}>{item.category}</Text>
                <View style={[styles.stockBadge, { backgroundColor: getStockStatusBg(item.status) }]}>
                  <Text style={[styles.stockBadgeText, { color: getStockStatusColor(item.status) }]}>{getStockStatusLabel(item.status)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.productRight}>
              <Text style={[styles.productPrice, { color: theme.text }]}>₹{item.price}</Text>
              <Text style={[styles.productStock, { color: theme.textTertiary }]}>{item.stock} {item.unit}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.infoBg }]}>
              <Text style={{ fontSize: 28 }}>📦</Text>
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>No products found</Text>
            <Text style={[styles.emptySubText, { color: theme.textTertiary }]}>Try adjusting your search or filters</Text>
          </View>
        }
      />

      {/* Add Product Modal */}
      <Modal visible={showAddModal} transparent={true} animationType="slide" onRequestClose={() => { setShowAddModal(false); resetForm(); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Add Product</Text>
                  <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceVariant }]} onPress={() => { setShowAddModal(false); resetForm(); }}>
                    <Text style={[styles.modalCloseText, { color: theme.textTertiary }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Product Name *</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.modalInputIcon}>📦</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="Enter product name" placeholderTextColor={theme.textTertiary} value={productName} onChangeText={setProductName} />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Product Code *</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.modalInputIcon}>🏷</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="Enter product code" placeholderTextColor={theme.textTertiary} value={productSKU} onChangeText={setProductSKU} autoCapitalize="characters" />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Brand *</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider, flex: 1 }]}>
                      <Text style={styles.modalInputIcon}>🏢</Text>
                      <TouchableOpacity
                        style={{ flex: 1, justifyContent: 'center', height: '100%' }}
                        onPress={() => { fetchBrands(); setShowBrandDropdown(!showBrandDropdown); }}
                      >
                        <Text style={[styles.modalInput, { color: productBrand ? theme.text : theme.textTertiary, paddingTop: 12 }]}>
                          {productBrand || 'Select brand'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, marginRight: 10, color: theme.textTertiary }}>{showBrandDropdown ? '▲' : '▼'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setNewBrandName(''); setShowAddBrandModal(true); }}
                      style={{ width: 44, height: 50, borderRadius: 14, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: -2 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {showBrandDropdown && (
                    <View style={{ backgroundColor: theme.card, borderColor: theme.divider, borderWidth: 1, borderRadius: 10, marginTop: 4, maxHeight: 180 }}>
                      <ScrollView nestedScrollEnabled>
                        {brandsList.length === 0 && (
                          <Text style={{ padding: 14, color: theme.textTertiary, textAlign: 'center' }}>No brands found</Text>
                        )}
                        {brandsList.map((b, idx) => {
                          const name = b.brand_name || b.name || b;
                          const id = b._id || '';
                          return (
                            <TouchableOpacity
                              key={id || idx}
                              onPress={() => { setProductBrand(name); setProductBrandId(id); setShowBrandDropdown(false); }}
                              style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: idx < brandsList.length - 1 ? 1 : 0, borderBottomColor: theme.divider, backgroundColor: productBrand === name ? (theme.primary + '15') : 'transparent' }}
                            >
                              <Text style={{ color: theme.text, fontSize: 15 }}>{name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Category *</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider, flex: 1 }]}>
                      <Text style={styles.modalInputIcon}>📂</Text>
                      <TouchableOpacity
                        style={{ flex: 1, justifyContent: 'center', height: '100%' }}
                        onPress={() => { fetchCategories(); setShowCategoryDropdown(!showCategoryDropdown); }}
                      >
                        <Text style={[styles.modalInput, { color: productCategory ? theme.text : theme.textTertiary, paddingTop: 12 }]}>
                          {productCategory || 'Select category'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, marginRight: 10, color: theme.textTertiary }}>{showCategoryDropdown ? '▲' : '▼'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setNewCategoryName(''); setShowAddCategoryModal(true); }}
                      style={{ width: 44, height: 50, borderRadius: 14, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: -2 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {showCategoryDropdown && (
                    <View style={{ backgroundColor: theme.card, borderColor: theme.divider, borderWidth: 1, borderRadius: 10, marginTop: 4, maxHeight: 180 }}>
                      <ScrollView nestedScrollEnabled>
                        {categoriesList.length === 0 && (
                          <Text style={{ padding: 14, color: theme.textTertiary, textAlign: 'center' }}>No categories found</Text>
                        )}
                        {categoriesList.map((c, idx) => {
                          const name = c.category_name || c.name || c;
                          const id = c._id || '';
                          return (
                            <TouchableOpacity
                              key={id || idx}
                              onPress={() => { setProductCategory(name); setProductCategoryId(id); setShowCategoryDropdown(false); }}
                              style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: idx < categoriesList.length - 1 ? 1 : 0, borderBottomColor: theme.divider, backgroundColor: productCategory === name ? (theme.primary + '15') : 'transparent' }}
                            >
                              <Text style={{ color: theme.text, fontSize: 15 }}>{name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Selling Price (₹) *</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.modalInputIcon}>💰</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="Enter selling price" placeholderTextColor={theme.textTertiary} value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Unit *</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.modalInputIcon}>📏</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="e.g. strips, bottles, tubes, vials" placeholderTextColor={theme.textTertiary} value={productUnit} onChangeText={setProductUnit} />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Reorder Level *</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.modalInputIcon}>🔔</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="Minimum stock alert level" placeholderTextColor={theme.textTertiary} value={productMinStock} onChangeText={setProductMinStock} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Shelf Life (days) *</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.modalInputIcon}>📅</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="e.g. 365, 730" placeholderTextColor={theme.textTertiary} value={productShelfLife} onChangeText={setProductShelfLife} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Description</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider, height: 90, alignItems: 'flex-start', paddingTop: 12 }]}>
                    <Text style={[styles.modalInputIcon, { marginTop: 2 }]}>📝</Text>
                    <TextInput
                      style={[styles.modalInput, { color: theme.text, textAlignVertical: 'top', height: 66 }]}
                      placeholder="Enter product description (optional)"
                      placeholderTextColor={theme.textTertiary}
                      value={productDescription}
                      onChangeText={setProductDescription}
                      multiline={true}
                      numberOfLines={3}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: theme.buttonPrimary }, submitting && { opacity: 0.7 }]}
                  onPress={submitProduct}
                  activeOpacity={0.8}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>ADD PRODUCT</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Brand Modal */}
      <Modal visible={showAddBrandModal} transparent={true} animationType="fade" onRequestClose={() => setShowAddBrandModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, width: '85%', maxWidth: 400, borderRadius: 16, padding: 24, maxHeight: undefined }]}>
            <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 20 }]}>Add New Brand</Text>
            <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
              <Text style={styles.modalInputIcon}>🏢</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text }]}
                placeholder="Enter brand name"
                placeholderTextColor={theme.textTertiary}
                value={newBrandName}
                onChangeText={setNewBrandName}
                autoFocus
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowAddBrandModal(false)}
                style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: theme.divider }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addBrand}
                disabled={addingBrand}
                style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: theme.primary }}
              >
                {addingBrand ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Add Brand</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={showAddCategoryModal} transparent={true} animationType="fade" onRequestClose={() => setShowAddCategoryModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, width: '85%', maxWidth: 400, borderRadius: 16, padding: 24, maxHeight: undefined }]}>
            <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 20 }]}>Add New Category</Text>
            <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
              <Text style={styles.modalInputIcon}>📂</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text }]}
                placeholder="Enter category name"
                placeholderTextColor={theme.textTertiary}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowAddCategoryModal(false)}
                style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: theme.divider }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addCategory}
                disabled={addingCategory}
                style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: theme.primary }}
              >
                {addingCategory ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Add Category</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Detail Modal */}
      <Modal visible={showDetailModal} transparent={true} animationType="slide" onRequestClose={() => { setShowDetailModal(false); setSelectedProduct(null); }}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Product Details</Text>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceVariant }]} onPress={() => { setShowDetailModal(false); setSelectedProduct(null); }}>
                  <Text style={[styles.modalCloseText, { color: theme.textTertiary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedProduct ? (
                <View>
                  <View style={[styles.detailHeaderCard, { borderBottomColor: theme.divider }]}>
                    <View style={[styles.detailThumb, { backgroundColor: getStockStatusBg(selectedProduct.status) }]}>
                      <Text style={[styles.detailThumbText, { color: theme.text }]}>{selectedProduct.name.charAt(0)}</Text>
                    </View>
                    <Text style={[styles.detailName, { color: theme.text }]}>{selectedProduct.name}</Text>
                    <Text style={[styles.detailSKU, { color: theme.textTertiary }]}>{selectedProduct.sku} | {selectedProduct.brand}</Text>
                    <View style={[styles.stockBadge, { backgroundColor: getStockStatusBg(selectedProduct.status), alignSelf: 'center', marginTop: 10 }]}>
                      <Text style={[styles.stockBadgeText, { color: getStockStatusColor(selectedProduct.status) }]}>{getStockStatusLabel(selectedProduct.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={[styles.detailItem, { backgroundColor: theme.background }]}>
                      <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>CATEGORY</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{selectedProduct.category}</Text>
                    </View>
                    <View style={[styles.detailItem, { backgroundColor: theme.background }]}>
                      <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>SELLING PRICE</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>₹{selectedProduct.price}</Text>
                    </View>
                    <View style={[styles.detailItem, { backgroundColor: theme.background }]}>
                      <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>CURRENT STOCK</Text>
                      <Text style={[styles.detailValue, { color: getStockStatusColor(selectedProduct.status) }]}>{selectedProduct.stock} {selectedProduct.unit}</Text>
                    </View>
                    <View style={[styles.detailItem, { backgroundColor: theme.background }]}>
                      <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>REORDER LEVEL</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{selectedProduct.minStock} {selectedProduct.unit}</Text>
                    </View>
                    <View style={[styles.detailItem, { backgroundColor: theme.background }]}>
                      <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>SHELF LIFE</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{selectedProduct.shelfLife} days</Text>
                    </View>
                    <View style={[styles.detailItem, { backgroundColor: theme.background }]}>
                      <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>BATCHES</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{selectedProduct.batches ? selectedProduct.batches.filter(b => b.is_active).length : 0}</Text>
                    </View>
                  </View>

                  <View style={styles.detailActions}>
                    <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: theme.success }]} activeOpacity={0.7} onPress={() => { setStockModalType('in'); resetStockForm(); setShowStockModal(true); }}>
                      <Text style={styles.detailActionText}>Stock In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: theme.error || theme.primary }]} activeOpacity={0.7} onPress={() => { setStockModalType('out'); resetStockForm(); setShowStockModal(true); }}>
                      <Text style={styles.detailActionText}>Stock Out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Stock In / Stock Out Modal */}
      <Modal visible={showStockModal} transparent={true} animationType="slide" onRequestClose={() => { setShowStockModal(false); resetStockForm(); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>{stockModalType === 'in' ? 'Stock In (Add Batch)' : 'Stock Out (FIFO)'}</Text>
                  <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceVariant }]} onPress={() => { setShowStockModal(false); resetStockForm(); }}>
                    <Text style={[styles.modalCloseText, { color: theme.textTertiary }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                {selectedProduct ? (
                  <View style={[styles.stockProductInfo, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]}>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, fontWeight: '600' }}>{selectedProduct.name} | Current: {selectedProduct.stock} {selectedProduct.unit}</Text>
                  </View>
                ) : null}

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Quantity *</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.modalInputIcon}>📊</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="Enter quantity" placeholderTextColor={theme.textTertiary} value={stockQty} onChangeText={setStockQty} keyboardType="numeric" />
                  </View>
                </View>

                {stockModalType === 'in' ? (
                  <>
                    <View style={styles.modalInputGroup}>
                      <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Batch Number *</Text>
                      <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                        <Text style={styles.modalInputIcon}>🏷</Text>
                        <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="Enter batch number" placeholderTextColor={theme.textTertiary} value={stockBatchNumber} onChangeText={setStockBatchNumber} />
                      </View>
                    </View>

                    <View style={styles.modalInputGroup}>
                      <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Manufacturing Date *</Text>
                      <TouchableOpacity
                        style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}
                        onPress={() => { setShowMfgCal(!showMfgCal); setShowExpCal(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.modalInputIcon}>📅</Text>
                        <Text style={[styles.modalInputPlaceholder, { color: stockMfgDate ? theme.text : theme.textTertiary }]}>{stockMfgDate || 'Select manufacturing date'}</Text>
                      </TouchableOpacity>
                    </View>
                    {showMfgCal && <CalendarPicker value={stockMfgDate} onSelect={setStockMfgDate} onClose={() => setShowMfgCal(false)} theme={theme} />}

                    <View style={styles.modalInputGroup}>
                      <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Expiry Date *</Text>
                      <TouchableOpacity
                        style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}
                        onPress={() => { setShowExpCal(!showExpCal); setShowMfgCal(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.modalInputIcon}>📅</Text>
                        <Text style={[styles.modalInputPlaceholder, { color: stockExpDate ? theme.text : theme.textTertiary }]}>{stockExpDate || 'Select expiry date'}</Text>
                      </TouchableOpacity>
                    </View>
                    {showExpCal && <CalendarPicker value={stockExpDate} onSelect={setStockExpDate} onClose={() => setShowExpCal(false)} theme={theme} />}

                    <View style={styles.modalInputGroup}>
                      <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Purchase Price *</Text>
                      <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                        <Text style={styles.modalInputIcon}>💰</Text>
                        <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="Enter purchase price per unit" placeholderTextColor={theme.textTertiary} value={stockPurchasePrice} onChangeText={setStockPurchasePrice} keyboardType="numeric" />
                      </View>
                    </View>
                  </>
                ) : null}

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Reference</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                    <Text style={styles.modalInputIcon}>📋</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text }]} placeholder="Invoice/PO number (optional)" placeholderTextColor={theme.textTertiary} value={stockReference} onChangeText={setStockReference} />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Note</Text>
                  <View style={[styles.modalInputWrap, { backgroundColor: theme.background, borderColor: theme.divider, height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                    <Text style={[styles.modalInputIcon, { marginTop: 2 }]}>📝</Text>
                    <TextInput style={[styles.modalInput, { color: theme.text, textAlignVertical: 'top', height: 56 }]} placeholder="Note (optional)" placeholderTextColor={theme.textTertiary} value={stockNote} onChangeText={setStockNote} multiline={true} />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: stockModalType === 'in' ? theme.success : (theme.error || theme.primary) }, submitting && { opacity: 0.7 }]}
                  onPress={stockModalType === 'in' ? submitStockIn : submitStockOut}
                  activeOpacity={0.8}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>{stockModalType === 'in' ? 'ADD STOCK' : 'REMOVE STOCK'}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.divider }]}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <Text style={[styles.navIcon, { color: theme.primary }]}>📦</Text>
          <Text style={[styles.navLabel, { color: theme.primary }]}>Inventory</Text>
          <View style={[styles.navDot, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onGoBack} activeOpacity={0.7}>
          <Text style={[styles.navIcon, { color: theme.textTertiary }]}>🏠</Text>
          <Text style={[styles.navLabel, { color: theme.textTertiary }]}>Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ======================== SUB SCREEN WRAPPER ========================
function SubScreenWrapper({ title, onGoBack, user, children, theme }) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <LinearGradient colors={[theme.gradient1, theme.gradient2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subHeader}>
        <View style={[styles.circle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.circle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={[styles.circle3, { backgroundColor: theme.secondary ? (theme.secondary + '26') : 'rgba(139,92,246,0.15)' }]} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <BackButton onPress={onGoBack} />
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.body}>
        {children}
      </View>
    </View>
  );
}

// ======================== MAIN SCREEN ========================
export default function InventoryDashboardScreen({ user, onGoBack, onLogout }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardStats();
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  useEffect(() => {
    if (currentScreen !== 'home') return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [currentScreen]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const response = await fetch(`${BASE_URL}/api/inventory/dashboard`, { headers });
      const result = await response.json();
      console.log('Inventory dashboard API:', JSON.stringify(result).substring(0, 300));
      if (result.status === 200 && result.dashboard) {
        const d = result.dashboard;
        setDashboardStats({
          totalProducts: d.totalProducts || 0,
          totalValue: d.totalStockValue || 0,
          lowStockItems: d.lowStockCount || 0,
          outOfStockItems: 0,
          expiringItems: d.nearExpiryCount || 0,
          totalAlerts: (d.lowStockCount || 0) + (d.nearExpiryCount || 0) + (d.expiredCount || 0),
          expiredItems: d.expiredCount || 0,
        });
      }
    } catch (e) {
      console.log('Inventory dashboard fetch error:', e);
      setDashboardStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + val;
  };

  const formatDate = (d) => {
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Sub-screens
  if (currentScreen === 'alerts') {
    return (
      <SubScreenWrapper title="Alerts" onGoBack={() => setCurrentScreen('home')} user={user} theme={theme}>
        <ScreenErrorBoundary>
          <AlertsTab user={user} refreshing={refreshing} onRefresh={onRefresh} theme={theme} />
        </ScreenErrorBoundary>
      </SubScreenWrapper>
    );
  }

  if (currentScreen === 'reports') {
    return (
      <SubScreenWrapper title="Reports" onGoBack={() => setCurrentScreen('home')} user={user} theme={theme}>
        <ScreenErrorBoundary>
          <ReportsTab user={user} refreshing={refreshing} onRefresh={onRefresh} theme={theme} />
        </ScreenErrorBoundary>
      </SubScreenWrapper>
    );
  }

  if (currentScreen === 'products') {
    return (
      <SubScreenWrapper title="Products" onGoBack={() => setCurrentScreen('home')} user={user} theme={theme}>
        <ScreenErrorBoundary>
          <ProductsTab user={user} refreshing={refreshing} onRefresh={onRefresh} theme={theme} onGoBack={() => setCurrentScreen('home')} />
        </ScreenErrorBoundary>
      </SubScreenWrapper>
    );
  }

  // Derive user initials for avatar
  const userInitial = user && user.fullName ? user.fullName.charAt(0).toUpperCase() : 'W';

  // Home Dashboard
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={[theme.gradient1, theme.gradient2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={[styles.circle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.circle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={[styles.circle3, { backgroundColor: theme.secondary ? (theme.secondary + '26') : 'rgba(139,92,246,0.15)' }]} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {onGoBack ? (
              <BackButton onPress={onGoBack} />
            ) : null}
            <View style={[styles.userAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.userAvatarText}>{userInitial}</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.greeting}>Welcome Back,</Text>
              <Text style={styles.userName}>{user && user.fullName ? user.fullName : 'Warehouse'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.navBtn} onPress={toggleTheme} activeOpacity={0.7}>
              <Text style={{ color: '#fff', fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      </LinearGradient>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
          <Text style={styles.profileAvatarText}>{(user && user.fullName ? user.fullName : 'W').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: theme.text }]}>{user && user.fullName ? user.fullName : 'Warehouse'}</Text>
          <Text style={[styles.profileRole, { color: theme.textTertiary }]}>Warehouse Manager</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.dashboardBody}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
      >
        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsIconWrap, { backgroundColor: theme.infoBg }]}>
              <Text style={{ fontSize: 18 }}>📦</Text>
            </View>
            <Text style={[styles.statsValue, { color: theme.text }]}>{loading ? '--' : (dashboardStats ? dashboardStats.totalProducts : 0)}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>TOTAL PRODUCTS</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsIconWrap, { backgroundColor: theme.successBg }]}>
              <Text style={{ fontSize: 18 }}>💰</Text>
            </View>
            <Text style={[styles.statsValue, { color: theme.text }]}>{loading ? '--' : (dashboardStats ? formatCurrency(dashboardStats.totalValue) : '₹0')}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>STOCK VALUE</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsIconWrap, { backgroundColor: theme.warningBg }]}>
              <Text style={{ fontSize: 18 }}>⚠</Text>
            </View>
            <Text style={[styles.statsValue, { color: theme.warning }]}>{loading ? '--' : (dashboardStats ? dashboardStats.lowStockItems : 0)}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>LOW STOCK</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsIconWrap, { backgroundColor: theme.errorBg }]}>
              <Text style={{ fontSize: 18 }}>🚫</Text>
            </View>
            <Text style={[styles.statsValue, { color: theme.error || theme.primary }]}>{loading ? '--' : (dashboardStats ? dashboardStats.outOfStockItems : 0)}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>OUT OF STOCK</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsIconWrap, { backgroundColor: theme.infoBg }]}>
              <Text style={{ fontSize: 18 }}>⏰</Text>
            </View>
            <Text style={[styles.statsValue, { color: theme.info }]}>{loading ? '--' : (dashboardStats ? dashboardStats.expiringItems : 0)}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>EXPIRING SOON</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statsIconWrap, { backgroundColor: theme.errorBg }]}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </View>
            <Text style={[styles.statsValue, { color: theme.error || theme.primary }]}>{loading ? '--' : (dashboardStats ? dashboardStats.totalAlerts : 0)}</Text>
            <Text style={[styles.statsLabel, { color: theme.textTertiary }]}>TOTAL ALERTS</Text>
          </View>
        </View>

        {/* Expired Items */}
        <View style={styles.activityRow}>
          <View style={[styles.activityCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.activityAccent, { backgroundColor: theme.secondary }]} />
            <View style={[styles.activityIconWrap, { backgroundColor: theme.warningBg }]}>
              <Text style={{ fontSize: 18 }}>⏰</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.activityValue, { color: theme.secondary }]}>{loading ? '--' : (dashboardStats ? dashboardStats.expiringItems : 0)}</Text>
              <Text style={[styles.activityLabel, { color: theme.textTertiary }]}>Near Expiry</Text>
            </View>
          </View>
          <View style={[styles.activityCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.activityAccent, { backgroundColor: '#795548' }]} />
            <View style={[styles.activityIconWrap, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={{ fontSize: 18 }}>🚫</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.activityValue, { color: '#795548' }]}>{loading ? '--' : (dashboardStats ? dashboardStats.expiredItems : 0)}</Text>
              <Text style={[styles.activityLabel, { color: theme.textTertiary }]}>Expired</Text>
            </View>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Manage Inventory</Text>
        </View>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={[styles.menuCard, { backgroundColor: theme.surface }]} onPress={() => setCurrentScreen('alerts')} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: theme.errorBg }]}>
              <Text style={styles.menuEmoji}>🔔</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuLabel, { color: theme.text }]}>Alerts</Text>
              <Text style={[styles.menuDesc, { color: theme.textTertiary }]}>Low stock & expiry alerts</Text>
            </View>
            <View style={[styles.menuArrow, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.menuArrowText, { color: theme.primary }]}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: theme.surface }]} onPress={() => setCurrentScreen('reports')} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: theme.infoBg }]}>
              <Text style={styles.menuEmoji}>📊</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuLabel, { color: theme.text }]}>Reports</Text>
              <Text style={[styles.menuDesc, { color: theme.textTertiary }]}>Stock & valuation reports</Text>
            </View>
            <View style={[styles.menuArrow, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.menuArrowText, { color: theme.primary }]}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { backgroundColor: theme.surface }]} onPress={() => setCurrentScreen('products')} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: theme.successBg }]}>
              <Text style={styles.menuEmoji}>📦</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuLabel, { color: theme.text }]}>Products</Text>
              <Text style={[styles.menuDesc, { color: theme.textTertiary }]}>View & manage products</Text>
            </View>
            <View style={[styles.menuArrow, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.menuArrowText, { color: theme.primary }]}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ======================== STYLES ========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: -20, padding: 14, borderRadius: 16, elevation: 4, shadowColor: 'rgba(0,0,0,0.1)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, zIndex: 10, marginBottom: 12 },
  profileAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800' },
  profileRole: { fontSize: 12, marginTop: 2 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  subHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 18,
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
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 60,
    left: -50,
  },
  circle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -30,
    right: 60,
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
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginLeft: 14,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  timeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 2,
  },
  dashboardBody: {
    padding: 16,
    paddingBottom: 40,
  },

  // Stats Cards
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.8,
  },

  // Activity Cards
  activityRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  activityAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
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

  // Menu Grid
  menuGrid: {
    marginBottom: 10,
  },
  menuCard: {
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
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuEmoji: {
    fontSize: 24,
  },
  menuTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  menuDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  menuArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuArrowText: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },

  // Summary Cards (Alerts)
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  summaryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.8,
  },

  // Filter Row
  filterRow: {
    marginBottom: 14,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    marginHorizontal: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Alert Cards
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  alertAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  alertIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 4,
  },
  alertIconText: {
    fontSize: 20,
  },
  alertInfo: {
    flex: 1,
  },
  alertProduct: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertDate: {
    fontSize: 11,
  },
  alertDetail: {
    fontSize: 12,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
  },

  // Overview Cards (Reports)
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  overviewCard: {
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
  overviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.8,
  },

  // Report Menu Grid
  reportMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportMenuItem: {
    width: (screenWidth - 48) / 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  reportMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportMenuEmoji: {
    fontSize: 22,
  },
  reportMenuLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  reportMenuDesc: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Category Breakdown
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  categoryInfo: {
    width: 90,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryCount: {
    fontSize: 11,
    marginTop: 2,
  },
  categoryBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  categoryBar: {
    height: 8,
    borderRadius: 4,
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 55,
    textAlign: 'right',
  },

  // Movement Cards
  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  movementIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movementArrow: {
    fontSize: 18,
    fontWeight: '900',
  },
  movementInfo: {
    flex: 1,
  },
  movementProduct: {
    fontSize: 14,
    fontWeight: '700',
  },
  movementParty: {
    fontSize: 12,
    marginTop: 2,
  },
  movementRight: {
    alignItems: 'flex-end',
  },
  movementQty: {
    fontSize: 16,
    fontWeight: '800',
  },
  movementDate: {
    fontSize: 11,
    marginTop: 2,
  },

  // Aging Report
  agingBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 4,
  },
  agingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  agingLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  agingLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  agingLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  agingLegendText: {
    fontSize: 11,
  },

  // Search Row (Products)
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    marginRight: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchClear: {
    fontSize: 16,
    padding: 4,
  },
  addProductBtn: {
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  addProductBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  resultCount: {
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },

  // Product Card
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  productAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  productLeft: {
    marginRight: 12,
    marginLeft: 4,
  },
  productThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productThumbText: {
    fontSize: 20,
    fontWeight: '800',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  productSKU: {
    fontSize: 11,
    marginBottom: 4,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCategory: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
  productStock: {
    fontSize: 11,
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
  },
  modalInputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
  },
  modalInputPlaceholder: {
    fontSize: 15,
    flex: 1,
  },
  stockProductInfo: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  imagePreviewWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Product Detail Modal
  detailHeaderCard: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  detailThumb: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailThumbText: {
    fontSize: 32,
    fontWeight: '800',
  },
  detailName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailSKU: {
    fontSize: 13,
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '47%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: '1.5%',
    marginBottom: 8,
    borderRadius: 14,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  detailActionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  detailActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bottomNav: { flexDirection: 'row', paddingVertical: 8, paddingBottom: 8, borderTopWidth: 1, alignItems: 'center', justifyContent: 'space-around' },
  navItem: { alignItems: 'center', paddingVertical: 4, flex: 1 },
  navIcon: { fontSize: 22, marginBottom: 4 },
  navLabel: { fontSize: 11, fontWeight: '600' },
  navDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
});
