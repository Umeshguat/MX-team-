import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const screenWidth = Dimensions.get('window').width;

// ======================== ALERTS TAB ========================
function AlertsTab({ user, refreshing, onRefresh }) {
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
      case 'low_stock': return '📉';
      case 'expiring': return '⏰';
      case 'out_of_stock': return '🚫';
      default: return '⚠';
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return '#e53935';
      case 'high': return '#ff9800';
      case 'medium': return '#1565c0';
      case 'low': return '#4caf50';
      default: return '#999';
    }
  };

  const getAlertBg = (severity) => {
    switch (severity) {
      case 'critical': return '#ffebee';
      case 'high': return '#fff3e0';
      case 'medium': return '#e3f2fd';
      case 'low': return '#e8f5e9';
      default: return '#f5f5f5';
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
        <ActivityIndicator size="large" color="#e53935" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { onRefresh(); fetchAlerts(); }} colors={['#e53935']} />}
    >
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#e53935' }]}>
          <Text style={[styles.summaryCount, { color: '#e53935' }]}>{outOfStockCount}</Text>
          <Text style={styles.summaryLabel}>Out of Stock</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#ff9800' }]}>
          <Text style={[styles.summaryCount, { color: '#ff9800' }]}>{lowStockCount}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#1565c0' }]}>
          <Text style={[styles.summaryCount, { color: '#1565c0' }]}>{expiringCount}</Text>
          <Text style={styles.summaryLabel}>Expiring</Text>
        </View>
      </View>

      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 4 }}>
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

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>No alerts found</Text>
          <Text style={styles.emptySubText}>All inventory levels are healthy</Text>
        </View>
      ) : (
        filteredAlerts.map((item) => (
          <View key={item.id} style={styles.alertCard}>
            <View style={[styles.alertIconWrap, { backgroundColor: getAlertBg(item.severity) }]}>
              <Text style={styles.alertIconText}>{getAlertIcon(item.type)}</Text>
            </View>
            <View style={styles.alertInfo}>
              <Text style={styles.alertProduct} numberOfLines={1}>{item.product}</Text>
              <View style={styles.alertMeta}>
                <View style={[styles.alertBadge, { backgroundColor: getAlertBg(item.severity) }]}>
                  <Text style={[styles.alertBadgeText, { color: getAlertColor(item.severity) }]}>{getAlertLabel(item.type)}</Text>
                </View>
                <Text style={styles.alertDate}>{item.date}</Text>
              </View>
              {item.type === 'low_stock' || item.type === 'out_of_stock' ? (
                <Text style={styles.alertDetail}>Stock: {item.currentStock} / Min: {item.minStock}</Text>
              ) : (
                <Text style={styles.alertDetail}>Expires: {item.expiryDate} | Qty: {item.currentStock}</Text>
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
function ReportsTab({ user, refreshing, onRefresh }) {
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

      const [dashRes, agingRes] = await Promise.all([
        fetch(`${BASE_URL}/api/inventory/dashboard`, { headers }),
        fetch(`${BASE_URL}/api/inventory/reports/stock-aging`, { headers }),
      ]);

      const dashData = await dashRes.json();
      const agingData = await agingRes.json();

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
    { key: 'stock_summary', icon: '📦', label: 'Stock Summary', color: '#e3f2fd', desc: 'Current stock levels & value' },
    { key: 'movement', icon: '🔄', label: 'Stock Movement', color: '#e8f5e9', desc: 'Inward & outward transactions' },
    { key: 'expiry', icon: '⏰', label: 'Expiry Report', color: '#fff3e0', desc: 'Products nearing expiry' },
    { key: 'category', icon: '📊', label: 'Category Wise', color: '#fce4ec', desc: 'Category breakdown & analytics' },
    { key: 'valuation', icon: '💰', label: 'Valuation Report', color: '#f3e5f5', desc: 'Inventory valuation details' },
    { key: 'dead_stock', icon: '📉', label: 'Dead Stock', color: '#efebe9', desc: 'Non-moving inventory items' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e53935" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { onRefresh(); fetchReportData(); }} colors={['#e53935']} />}
    >
      {/* Overview Cards */}
      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>📦</Text>
          <Text style={styles.overviewValue}>{reportData ? reportData.totalProducts : 0}</Text>
          <Text style={styles.overviewLabel}>Total Products</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>💰</Text>
          <Text style={styles.overviewValue}>{reportData ? formatCurrency(reportData.totalValue) : '₹0'}</Text>
          <Text style={styles.overviewLabel}>Stock Value</Text>
        </View>
      </View>
      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>⚠</Text>
          <Text style={[styles.overviewValue, { color: '#ff9800' }]}>{reportData ? reportData.lowStockItems : 0}</Text>
          <Text style={styles.overviewLabel}>Low Stock</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>⏰</Text>
          <Text style={[styles.overviewValue, { color: '#e53935' }]}>{reportData ? reportData.expiringItems : 0}</Text>
          <Text style={styles.overviewLabel}>Expiring Soon</Text>
        </View>
      </View>

      {/* Brand Summary */}
      {reportData && reportData.brandSummary && reportData.brandSummary.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Brand Breakdown</Text>
          {reportData.brandSummary.map((cat, idx) => {
            const maxCount = Math.max(...reportData.brandSummary.map(c => c.count), 1);
            const barWidth = (cat.count / maxCount) * 100;
            return (
              <View key={idx} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryCount}>{cat.count} products | {cat.quantity} units</Text>
                </View>
                <View style={styles.categoryBarBg}>
                  <View style={[styles.categoryBar, { width: barWidth + '%' }]} />
                </View>
                <Text style={styles.categoryValue}>{formatCurrency(cat.value)}</Text>
              </View>
            );
          })}
        </>
      ) : null}

      {/* Stock Aging Report */}
      {agingReport.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Stock Aging Report</Text>
          {agingReport.map((item) => (
            <View key={item._id} style={styles.movementCard}>
              <View style={styles.movementInfo}>
                <Text style={styles.movementProduct} numberOfLines={1}>{item.product_name}</Text>
                <Text style={styles.movementParty}>{item.product_code} | {item.category}</Text>
              </View>
              <View style={styles.agingBadges}>
                {item.aging.green.total_qty > 0 ? (
                  <View style={[styles.agingBadge, { backgroundColor: '#e8f5e9' }]}>
                    <Text style={[styles.agingBadgeText, { color: '#4caf50' }]}>{item.aging.green.total_qty}</Text>
                  </View>
                ) : null}
                {item.aging.yellow.total_qty > 0 ? (
                  <View style={[styles.agingBadge, { backgroundColor: '#fff3e0' }]}>
                    <Text style={[styles.agingBadgeText, { color: '#ff9800' }]}>{item.aging.yellow.total_qty}</Text>
                  </View>
                ) : null}
                {item.aging.red.total_qty > 0 ? (
                  <View style={[styles.agingBadge, { backgroundColor: '#ffebee' }]}>
                    <Text style={[styles.agingBadgeText, { color: '#e53935' }]}>{item.aging.red.total_qty}</Text>
                  </View>
                ) : null}
                {item.aging.expired.total_qty > 0 ? (
                  <View style={[styles.agingBadge, { backgroundColor: '#f5f5f5' }]}>
                    <Text style={[styles.agingBadgeText, { color: '#999' }]}>{item.aging.expired.total_qty}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
          <View style={styles.agingLegend}>
            <View style={styles.agingLegendItem}><View style={[styles.agingLegendDot, { backgroundColor: '#4caf50' }]} /><Text style={styles.agingLegendText}>Good</Text></View>
            <View style={styles.agingLegendItem}><View style={[styles.agingLegendDot, { backgroundColor: '#ff9800' }]} /><Text style={styles.agingLegendText}>{'<60d'}</Text></View>
            <View style={styles.agingLegendItem}><View style={[styles.agingLegendDot, { backgroundColor: '#e53935' }]} /><Text style={styles.agingLegendText}>{'<30d'}</Text></View>
            <View style={styles.agingLegendItem}><View style={[styles.agingLegendDot, { backgroundColor: '#999' }]} /><Text style={styles.agingLegendText}>Expired</Text></View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// ======================== PRODUCTS TAB ========================
function ProductsTab({ user, refreshing, onRefresh }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
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
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [stockReference, setStockReference] = useState('');
  const [stockNote, setStockNote] = useState('');

  // Add product form states
  const [productName, setProductName] = useState('');
  const [productSKU, setProductSKU] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productBrand, setProductBrand] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productMinStock, setProductMinStock] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [productShelfLife, setProductShelfLife] = useState('');
  const [productDescription, setProductDescription] = useState('');

  useEffect(() => {
    fetchProducts();
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
            id: p._id,
            name: p.product_name,
            sku: p.product_code,
            brand: p.brand,
            category: p.category,
            price: p.selling_price,
            stock: p.total_quantity,
            minStock: p.reorder_level,
            unit: p.unit,
            status: status,
            description: p.description,
            shelfLife: p.shelf_life_days,
            batches: p.batches,
            image: p.image,
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

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'in_stock': return '#4caf50';
      case 'low_stock': return '#ff9800';
      case 'out_of_stock': return '#e53935';
      default: return '#999';
    }
  };

  const getStockStatusBg = (status) => {
    switch (status) {
      case 'in_stock': return '#e8f5e9';
      case 'low_stock': return '#fff3e0';
      case 'out_of_stock': return '#ffebee';
      default: return '#f5f5f5';
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const pickProductImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    setProductBrand('');
    setProductPrice('');
    setProductMinStock('');
    setProductUnit('');
    setProductShelfLife('');
    setProductDescription('');
  };

  const resetStockForm = () => {
    setStockQty('');
    setStockBatchNumber('');
    setStockMfgDate('');
    setStockExpDate('');
    setStockPurchasePrice('');
    setStockReference('');
    setStockNote('');
  };

  const submitProduct = async () => {
    if (!productName.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!productSKU.trim()) { Alert.alert('Error', 'Product code is required'); return; }
    if (!productBrand.trim()) { Alert.alert('Error', 'Brand is required'); return; }
    if (!productCategory.trim()) { Alert.alert('Error', 'Category is required'); return; }
    if (!productPrice.trim()) { Alert.alert('Error', 'Selling price is required'); return; }
    if (!productUnit.trim()) { Alert.alert('Error', 'Unit is required'); return; }
    if (!productMinStock.trim()) { Alert.alert('Error', 'Reorder level is required'); return; }
    if (!productShelfLife.trim()) { Alert.alert('Error', 'Shelf life is required'); return; }

    try {
      setSubmitting(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/inventory/products`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: productName.trim(),
          product_code: productSKU.trim(),
          brand: productBrand.trim(),
          category: productCategory.trim(),
          description: productDescription.trim(),
          unit: productUnit.trim(),
          selling_price: parseFloat(productPrice),
          reorder_level: parseInt(productMinStock),
          shelf_life_days: parseInt(productShelfLife),
        }),
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
        <ActivityIndicator size="large" color="#e53935" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products or SKU..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.addProductBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.7}>
          <Text style={styles.addProductBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
            onPress={() => setCategoryFilter(cat)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>
              {cat === 'all' ? 'All' : cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.resultCount}>{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found</Text>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { onRefresh(); fetchProducts(); }} colors={['#e53935']} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            activeOpacity={0.7}
            onPress={() => { setSelectedProduct(item); setShowDetailModal(true); }}
          >
            <View style={styles.productLeft}>
              <View style={[styles.productThumb, { backgroundColor: getStockStatusBg(item.status) }]}>
                <Text style={styles.productThumbText}>{item.name.charAt(0)}</Text>
              </View>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.productSKU}>SKU: {item.sku}</Text>
              <View style={styles.productMetaRow}>
                <Text style={styles.productCategory}>{item.category}</Text>
                <View style={[styles.stockBadge, { backgroundColor: getStockStatusBg(item.status) }]}>
                  <Text style={[styles.stockBadgeText, { color: getStockStatusColor(item.status) }]}>{getStockStatusLabel(item.status)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.productRight}>
              <Text style={styles.productPrice}>₹{item.price}</Text>
              <Text style={styles.productStock}>{item.stock} {item.unit}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
          </View>
        }
      />

      {/* Add Product Modal */}
      <Modal visible={showAddModal} transparent={true} animationType="slide" onRequestClose={() => { setShowAddModal(false); resetForm(); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Product</Text>
                  <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Product Name *</Text>
                <TextInput style={styles.modalInput} placeholder="Enter product name" placeholderTextColor="#999" value={productName} onChangeText={setProductName} />

                <Text style={styles.modalLabel}>Product Code *</Text>
                <TextInput style={styles.modalInput} placeholder="Enter product code" placeholderTextColor="#999" value={productSKU} onChangeText={setProductSKU} autoCapitalize="characters" />

                <Text style={styles.modalLabel}>Brand *</Text>
                <TextInput style={styles.modalInput} placeholder="Enter brand name" placeholderTextColor="#999" value={productBrand} onChangeText={setProductBrand} />

                <Text style={styles.modalLabel}>Category *</Text>
                <TextInput style={styles.modalInput} placeholder="e.g. Tablets, Syrups, Capsules" placeholderTextColor="#999" value={productCategory} onChangeText={setProductCategory} />

                <Text style={styles.modalLabel}>Selling Price (₹) *</Text>
                <TextInput style={styles.modalInput} placeholder="Enter selling price" placeholderTextColor="#999" value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" />

                <Text style={styles.modalLabel}>Unit *</Text>
                <TextInput style={styles.modalInput} placeholder="e.g. strips, bottles, tubes, vials" placeholderTextColor="#999" value={productUnit} onChangeText={setProductUnit} />

                <Text style={styles.modalLabel}>Reorder Level *</Text>
                <TextInput style={styles.modalInput} placeholder="Minimum stock alert level" placeholderTextColor="#999" value={productMinStock} onChangeText={setProductMinStock} keyboardType="numeric" />

                <Text style={styles.modalLabel}>Shelf Life (days) *</Text>
                <TextInput style={styles.modalInput} placeholder="e.g. 365, 730" placeholderTextColor="#999" value={productShelfLife} onChangeText={setProductShelfLife} keyboardType="numeric" />

                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Enter product description (optional)"
                  placeholderTextColor="#999"
                  value={productDescription}
                  onChangeText={setProductDescription}
                  multiline={true}
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
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

      {/* Product Detail Modal */}
      <Modal visible={showDetailModal} transparent={true} animationType="slide" onRequestClose={() => { setShowDetailModal(false); setSelectedProduct(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Product Details</Text>
                <TouchableOpacity onPress={() => { setShowDetailModal(false); setSelectedProduct(null); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedProduct ? (
                <View>
                  <View style={styles.detailHeaderCard}>
                    <View style={[styles.detailThumb, { backgroundColor: getStockStatusBg(selectedProduct.status) }]}>
                      <Text style={styles.detailThumbText}>{selectedProduct.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.detailName}>{selectedProduct.name}</Text>
                    <Text style={styles.detailSKU}>{selectedProduct.sku} | {selectedProduct.brand}</Text>
                    <View style={[styles.stockBadge, { backgroundColor: getStockStatusBg(selectedProduct.status), alignSelf: 'center', marginTop: 8 }]}>
                      <Text style={[styles.stockBadgeText, { color: getStockStatusColor(selectedProduct.status) }]}>{getStockStatusLabel(selectedProduct.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Category</Text>
                      <Text style={styles.detailValue}>{selectedProduct.category}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Selling Price</Text>
                      <Text style={styles.detailValue}>₹{selectedProduct.price}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Current Stock</Text>
                      <Text style={[styles.detailValue, { color: getStockStatusColor(selectedProduct.status) }]}>{selectedProduct.stock} {selectedProduct.unit}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Reorder Level</Text>
                      <Text style={styles.detailValue}>{selectedProduct.minStock} {selectedProduct.unit}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Shelf Life</Text>
                      <Text style={styles.detailValue}>{selectedProduct.shelfLife} days</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Batches</Text>
                      <Text style={styles.detailValue}>{selectedProduct.batches ? selectedProduct.batches.filter(b => b.is_active).length : 0}</Text>
                    </View>
                  </View>

                  <View style={styles.detailActions}>
                    <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#4caf50' }]} activeOpacity={0.7} onPress={() => { setStockModalType('in'); resetStockForm(); setShowStockModal(true); }}>
                      <Text style={styles.detailActionText}>Stock In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#e53935' }]} activeOpacity={0.7} onPress={() => { setStockModalType('out'); resetStockForm(); setShowStockModal(true); }}>
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{stockModalType === 'in' ? 'Stock In (Add Batch)' : 'Stock Out (FIFO)'}</Text>
                  <TouchableOpacity onPress={() => { setShowStockModal(false); resetStockForm(); }}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                {selectedProduct ? (
                  <Text style={{ fontSize: 14, color: '#555', marginBottom: 12, fontWeight: '600' }}>{selectedProduct.name} | Current: {selectedProduct.stock} {selectedProduct.unit}</Text>
                ) : null}

                <Text style={styles.modalLabel}>Quantity *</Text>
                <TextInput style={styles.modalInput} placeholder="Enter quantity" placeholderTextColor="#999" value={stockQty} onChangeText={setStockQty} keyboardType="numeric" />

                {stockModalType === 'in' ? (
                  <>
                    <Text style={styles.modalLabel}>Batch Number *</Text>
                    <TextInput style={styles.modalInput} placeholder="Enter batch number" placeholderTextColor="#999" value={stockBatchNumber} onChangeText={setStockBatchNumber} />

                    <Text style={styles.modalLabel}>Manufacturing Date * (YYYY-MM-DD)</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. 2026-01-15" placeholderTextColor="#999" value={stockMfgDate} onChangeText={setStockMfgDate} />

                    <Text style={styles.modalLabel}>Expiry Date * (YYYY-MM-DD)</Text>
                    <TextInput style={styles.modalInput} placeholder="e.g. 2027-01-15" placeholderTextColor="#999" value={stockExpDate} onChangeText={setStockExpDate} />

                    <Text style={styles.modalLabel}>Purchase Price *</Text>
                    <TextInput style={styles.modalInput} placeholder="Enter purchase price per unit" placeholderTextColor="#999" value={stockPurchasePrice} onChangeText={setStockPurchasePrice} keyboardType="numeric" />
                  </>
                ) : null}

                <Text style={styles.modalLabel}>Reference</Text>
                <TextInput style={styles.modalInput} placeholder="Invoice/PO number (optional)" placeholderTextColor="#999" value={stockReference} onChangeText={setStockReference} />

                <Text style={styles.modalLabel}>Note</Text>
                <TextInput style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]} placeholder="Note (optional)" placeholderTextColor="#999" value={stockNote} onChangeText={setStockNote} multiline={true} />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: stockModalType === 'in' ? '#4caf50' : '#e53935' }, submitting && { opacity: 0.7 }]}
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
    </View>
  );
}

// ======================== SUB SCREEN WRAPPER ========================
function SubScreenWrapper({ title, onGoBack, user, children }) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.subHeader}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={onGoBack} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
        </View>
      </View>
      <View style={styles.body}>
        {children}
      </View>
    </View>
  );
}

// ======================== MAIN SCREEN ========================
export default function InventoryDashboardScreen({ user, onGoBack, onLogout }) {
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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      <SubScreenWrapper title="Alerts" onGoBack={() => setCurrentScreen('home')} user={user}>
        <AlertsTab user={user} refreshing={refreshing} onRefresh={onRefresh} />
      </SubScreenWrapper>
    );
  }

  if (currentScreen === 'reports') {
    return (
      <SubScreenWrapper title="Reports" onGoBack={() => setCurrentScreen('home')} user={user}>
        <ReportsTab user={user} refreshing={refreshing} onRefresh={onRefresh} />
      </SubScreenWrapper>
    );
  }

  if (currentScreen === 'products') {
    return (
      <SubScreenWrapper title="Products" onGoBack={() => setCurrentScreen('home')} user={user}>
        <ProductsTab user={user} refreshing={refreshing} onRefresh={onRefresh} />
      </SubScreenWrapper>
    );
  }

  // Home Dashboard
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
              <Text style={styles.userName}>{user && user.fullName ? user.fullName : 'Warehouse'}</Text>
            </View>
          </View>
          {onLogout ? (
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          ) : null}
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
            <Text style={styles.statsIcon}>📦</Text>
            <Text style={styles.statsValue}>{loading ? '--' : (dashboardStats ? dashboardStats.totalProducts : 0)}</Text>
            <Text style={styles.statsLabel}>Total Products</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsIcon}>💰</Text>
            <Text style={styles.statsValue}>{loading ? '--' : (dashboardStats ? formatCurrency(dashboardStats.totalValue) : '₹0')}</Text>
            <Text style={styles.statsLabel}>Stock Value</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, styles.statsCardAlert]}>
            <Text style={styles.statsIcon}>⚠</Text>
            <Text style={[styles.statsValue, { color: '#ff9800' }]}>{loading ? '--' : (dashboardStats ? dashboardStats.lowStockItems : 0)}</Text>
            <Text style={styles.statsLabel}>Low Stock</Text>
          </View>
          <View style={[styles.statsCard, styles.statsCardDanger]}>
            <Text style={styles.statsIcon}>🚫</Text>
            <Text style={[styles.statsValue, { color: '#e53935' }]}>{loading ? '--' : (dashboardStats ? dashboardStats.outOfStockItems : 0)}</Text>
            <Text style={styles.statsLabel}>Out of Stock</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsIcon}>⏰</Text>
            <Text style={[styles.statsValue, { color: '#1565c0' }]}>{loading ? '--' : (dashboardStats ? dashboardStats.expiringItems : 0)}</Text>
            <Text style={styles.statsLabel}>Expiring Soon</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsIcon}>🔔</Text>
            <Text style={[styles.statsValue, { color: '#e53935' }]}>{loading ? '--' : (dashboardStats ? dashboardStats.totalAlerts : 0)}</Text>
            <Text style={styles.statsLabel}>Total Alerts</Text>
          </View>
        </View>

        {/* Expired Items */}
        <View style={styles.activityRow}>
          <View style={[styles.activityCard, { borderLeftColor: '#9c27b0' }]}>
            <Text style={styles.activityIcon}>⏰</Text>
            <View>
              <Text style={[styles.activityValue, { color: '#9c27b0' }]}>{loading ? '--' : (dashboardStats ? dashboardStats.expiringItems : 0)}</Text>
              <Text style={styles.activityLabel}>Near Expiry</Text>
            </View>
          </View>
          <View style={[styles.activityCard, { borderLeftColor: '#795548' }]}>
            <Text style={styles.activityIcon}>🚫</Text>
            <View>
              <Text style={[styles.activityValue, { color: '#795548' }]}>{loading ? '--' : (dashboardStats ? dashboardStats.expiredItems : 0)}</Text>
              <Text style={styles.activityLabel}>Expired</Text>
            </View>
          </View>
        </View>

        {/* Menu Options */}
        <Text style={styles.sectionTitle}>Manage Inventory</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuCard} onPress={() => setCurrentScreen('alerts')} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#ffebee' }]}>
              <Text style={styles.menuEmoji}>🔔</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Alerts</Text>
              <Text style={styles.menuDesc}>Low stock & expiry alerts</Text>
            </View>
            <View style={styles.menuArrow}>
              <Text style={styles.menuArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => setCurrentScreen('reports')} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#e3f2fd' }]}>
              <Text style={styles.menuEmoji}>📊</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Reports</Text>
              <Text style={styles.menuDesc}>Stock & valuation reports</Text>
            </View>
            <View style={styles.menuArrow}>
              <Text style={styles.menuArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => setCurrentScreen('products')} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#e8f5e9' }]}>
              <Text style={styles.menuEmoji}>📦</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>Products</Text>
              <Text style={styles.menuDesc}>View & manage products</Text>
            </View>
            <View style={styles.menuArrow}>
              <Text style={styles.menuArrowText}>→</Text>
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
  subHeader: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
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
    paddingBottom: 40,
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
  statsCardAlert: {},
  statsCardDanger: {},
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

  // Today's Activity
  activityRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 5,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  activityIcon: {
    fontSize: 22,
    fontWeight: '900',
    marginRight: 12,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginTop: 2,
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
    color: '#1a1a2e',
  },
  menuDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  menuArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f5f5f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuArrowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '800',
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
    color: '#999',
    marginTop: 12,
  },

  // Summary Cards (Alerts)
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Filter Row
  filterRow: {
    marginBottom: 14,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#eee',
  },
  filterChipActive: {
    backgroundColor: '#1a1a2e',
    borderColor: '#1a1a2e',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Alert Cards
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  alertIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    color: '#1a1a2e',
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
    borderRadius: 6,
    marginRight: 8,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertDate: {
    fontSize: 11,
    color: '#999',
  },
  alertDetail: {
    fontSize: 12,
    color: '#777',
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },

  // Overview Cards (Reports)
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  overviewIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 16,
    marginBottom: 12,
  },

  // Report Menu Grid
  reportMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportMenuItem: {
    width: (screenWidth - 48) / 2,
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
    color: '#1a1a2e',
    marginBottom: 4,
  },
  reportMenuDesc: {
    fontSize: 11,
    color: '#999',
    lineHeight: 15,
  },

  // Category Breakdown
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryInfo: {
    width: 90,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  categoryCount: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  categoryBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  categoryBar: {
    height: 8,
    backgroundColor: '#e53935',
    borderRadius: 4,
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    width: 55,
    textAlign: 'right',
  },

  // Movement Cards
  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
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
    color: '#1a1a2e',
  },
  movementParty: {
    fontSize: 12,
    color: '#999',
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
    color: '#999',
    marginTop: 2,
  },

  // Aging Report
  agingBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  agingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  agingLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
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
    color: '#777',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  searchClear: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  addProductBtn: {
    backgroundColor: '#e53935',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#e53935',
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
    color: '#999',
    marginBottom: 10,
    fontWeight: '600',
  },

  // Product Card
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  productLeft: {
    marginRight: 12,
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
    color: '#1a1a2e',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  productSKU: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#777',
    marginRight: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    color: '#1a1a2e',
  },
  productStock: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 25,
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
    color: '#1a1a2e',
  },
  modalClose: {
    fontSize: 20,
    color: '#999',
    fontWeight: '700',
    padding: 5,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
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
    backgroundColor: '#f5f5f7',
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
  },
  submitBtn: {
    backgroundColor: '#e53935',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    elevation: 6,
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
    borderBottomColor: '#f0f0f0',
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
    color: '#1a1a2e',
  },
  detailName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  detailSKU: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  detailActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  detailActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 6,
    elevation: 4,
  },
  detailActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
