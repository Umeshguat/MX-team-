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
import * as ImagePicker from 'expo-image-picker';

const screenWidth = Dimensions.get('window').width;

// ======================== ALERTS TAB ========================
function AlertsTab({ user, refreshing, onRefresh }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, low_stock, expiring, out_of_stock

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/inventory/alerts`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      const text = await response.text();
      console.log('Inventory alerts API:', text);
      const result = JSON.parse(text);
      if (result.status === 200 && result.data) {
        setAlerts(result.data);
      }
    } catch (e) {
      console.log('Inventory alerts fetch error:', e);
      // Sample data for UI display
      setAlerts([
        { id: '1', type: 'low_stock', product: 'Paracetamol 500mg', currentStock: 15, minStock: 50, severity: 'high', date: '2026-03-23' },
        { id: '2', type: 'expiring', product: 'Amoxicillin 250mg', currentStock: 200, expiryDate: '2026-04-15', severity: 'medium', date: '2026-03-23' },
        { id: '3', type: 'out_of_stock', product: 'Vitamin D3 1000IU', currentStock: 0, minStock: 30, severity: 'critical', date: '2026-03-22' },
        { id: '4', type: 'low_stock', product: 'Cetrizine 10mg', currentStock: 8, minStock: 25, severity: 'high', date: '2026-03-22' },
        { id: '5', type: 'expiring', product: 'Ibuprofen 400mg', currentStock: 150, expiryDate: '2026-05-01', severity: 'low', date: '2026-03-21' },
        { id: '6', type: 'out_of_stock', product: 'Omeprazole 20mg', currentStock: 0, minStock: 40, severity: 'critical', date: '2026-03-21' },
        { id: '7', type: 'low_stock', product: 'Metformin 500mg', currentStock: 12, minStock: 60, severity: 'high', date: '2026-03-20' },
        { id: '8', type: 'expiring', product: 'Azithromycin 500mg', currentStock: 80, expiryDate: '2026-04-10', severity: 'medium', date: '2026-03-20' },
      ]);
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

  // Summary counts
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
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/inventory/reports`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      const text = await response.text();
      console.log('Inventory reports API:', text);
      const result = JSON.parse(text);
      if (result.status === 200 && result.data) {
        setReportData(result.data);
      }
    } catch (e) {
      console.log('Inventory reports fetch error:', e);
      // Sample data for UI
      setReportData({
        totalProducts: 1250,
        totalValue: 4850000,
        lowStockItems: 23,
        expiringItems: 15,
        categorySummary: [
          { name: 'Tablets', count: 450, value: 1800000 },
          { name: 'Capsules', count: 280, value: 1200000 },
          { name: 'Syrups', count: 180, value: 650000 },
          { name: 'Injections', count: 120, value: 800000 },
          { name: 'Ointments', count: 100, value: 200000 },
          { name: 'Others', count: 120, value: 200000 },
        ],
        recentMovements: [
          { id: '1', product: 'Paracetamol 500mg', type: 'out', quantity: 500, date: '2026-03-23', party: 'MedPlus Pharmacy' },
          { id: '2', product: 'Amoxicillin 250mg', type: 'in', quantity: 1000, date: '2026-03-22', party: 'PharmaCorp Ltd' },
          { id: '3', product: 'Vitamin D3', type: 'out', quantity: 200, date: '2026-03-22', party: 'Apollo Pharmacy' },
          { id: '4', product: 'Cetrizine 10mg', type: 'in', quantity: 800, date: '2026-03-21', party: 'Cipla Distributors' },
          { id: '5', product: 'Omeprazole 20mg', type: 'out', quantity: 300, date: '2026-03-21', party: 'Wellness Store' },
        ],
      });
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

      {/* Report Menu Grid */}
      <Text style={styles.sectionTitle}>Reports</Text>
      <View style={styles.reportMenuGrid}>
        {reportMenus.map((menu) => (
          <TouchableOpacity
            key={menu.key}
            style={styles.reportMenuItem}
            onPress={() => setSelectedReport(selectedReport === menu.key ? null : menu.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.reportMenuIcon, { backgroundColor: menu.color }]}>
              <Text style={styles.reportMenuEmoji}>{menu.icon}</Text>
            </View>
            <Text style={styles.reportMenuLabel}>{menu.label}</Text>
            <Text style={styles.reportMenuDesc}>{menu.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Summary */}
      {reportData && reportData.categorySummary ? (
        <>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {reportData.categorySummary.map((cat, idx) => {
            const maxCount = Math.max(...reportData.categorySummary.map(c => c.count));
            const barWidth = (cat.count / maxCount) * 100;
            return (
              <View key={idx} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryCount}>{cat.count} items</Text>
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

      {/* Recent Movements */}
      {reportData && reportData.recentMovements ? (
        <>
          <Text style={styles.sectionTitle}>Recent Stock Movements</Text>
          {reportData.recentMovements.map((mov) => (
            <View key={mov.id} style={styles.movementCard}>
              <View style={[styles.movementIcon, { backgroundColor: mov.type === 'in' ? '#e8f5e9' : '#ffebee' }]}>
                <Text style={styles.movementArrow}>{mov.type === 'in' ? '↓' : '↑'}</Text>
              </View>
              <View style={styles.movementInfo}>
                <Text style={styles.movementProduct} numberOfLines={1}>{mov.product}</Text>
                <Text style={styles.movementParty}>{mov.party}</Text>
              </View>
              <View style={styles.movementRight}>
                <Text style={[styles.movementQty, { color: mov.type === 'in' ? '#4caf50' : '#e53935' }]}>
                  {mov.type === 'in' ? '+' : '-'}{mov.quantity}
                </Text>
                <Text style={styles.movementDate}>{mov.date}</Text>
              </View>
            </View>
          ))}
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

  // Add product form states
  const [productName, setProductName] = useState('');
  const [productSKU, setProductSKU] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productMinStock, setProductMinStock] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [productImage, setProductImage] = useState(null);
  const [productDescription, setProductDescription] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const response = await fetch(`${BASE_URL}/api/inventory/products`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      const text = await response.text();
      console.log('Inventory products API:', text);
      const result = JSON.parse(text);
      if (result.status === 200 && result.data) {
        setProducts(result.data);
      }
    } catch (e) {
      console.log('Inventory products fetch error:', e);
      // Sample data for UI
      setProducts([
        { id: '1', name: 'Paracetamol 500mg', sku: 'PCM500', category: 'Tablets', price: 25, stock: 15, minStock: 50, unit: 'strips', status: 'low_stock' },
        { id: '2', name: 'Amoxicillin 250mg', sku: 'AMX250', category: 'Capsules', price: 85, stock: 200, minStock: 30, unit: 'strips', status: 'in_stock' },
        { id: '3', name: 'Vitamin D3 1000IU', sku: 'VTD1000', category: 'Tablets', price: 320, stock: 0, minStock: 30, unit: 'bottles', status: 'out_of_stock' },
        { id: '4', name: 'Cetrizine 10mg', sku: 'CTZ10', category: 'Tablets', price: 35, stock: 8, minStock: 25, unit: 'strips', status: 'low_stock' },
        { id: '5', name: 'Ibuprofen 400mg', sku: 'IBU400', category: 'Tablets', price: 42, stock: 150, minStock: 20, unit: 'strips', status: 'in_stock' },
        { id: '6', name: 'Omeprazole 20mg', sku: 'OMP20', category: 'Capsules', price: 65, stock: 0, minStock: 40, unit: 'strips', status: 'out_of_stock' },
        { id: '7', name: 'Metformin 500mg', sku: 'MTF500', category: 'Tablets', price: 30, stock: 12, minStock: 60, unit: 'strips', status: 'low_stock' },
        { id: '8', name: 'Azithromycin 500mg', sku: 'AZT500', category: 'Tablets', price: 120, stock: 80, minStock: 20, unit: 'strips', status: 'in_stock' },
        { id: '9', name: 'Cough Syrup', sku: 'CGH100', category: 'Syrups', price: 95, stock: 65, minStock: 15, unit: 'bottles', status: 'in_stock' },
        { id: '10', name: 'Betadine Ointment', sku: 'BTD50', category: 'Ointments', price: 78, stock: 45, minStock: 10, unit: 'tubes', status: 'in_stock' },
        { id: '11', name: 'Insulin Injection', sku: 'INS100', category: 'Injections', price: 450, stock: 25, minStock: 10, unit: 'vials', status: 'in_stock' },
        { id: '12', name: 'Dolo 650', sku: 'DLO650', category: 'Tablets', price: 32, stock: 300, minStock: 50, unit: 'strips', status: 'in_stock' },
      ]);
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

  const categories = ['all', ...new Set(products.map(p => p.category))];

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
    setProductPrice('');
    setProductStock('');
    setProductMinStock('');
    setProductUnit('');
    setProductImage(null);
    setProductDescription('');
  };

  const submitProduct = async () => {
    if (!productName.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!productSKU.trim()) { Alert.alert('Error', 'SKU is required'); return; }
    if (!productPrice.trim()) { Alert.alert('Error', 'Price is required'); return; }
    if (!productStock.trim()) { Alert.alert('Error', 'Stock quantity is required'); return; }

    try {
      setSubmitting(true);
      const token = user && user.token ? user.token : '';
      const formData = new FormData();
      formData.append('name', productName.trim());
      formData.append('sku', productSKU.trim());
      formData.append('category', productCategory.trim());
      formData.append('price', productPrice.trim());
      formData.append('stock', productStock.trim());
      formData.append('minStock', productMinStock.trim());
      formData.append('unit', productUnit.trim());
      formData.append('description', productDescription.trim());

      if (productImage) {
        formData.append('image', {
          uri: productImage,
          type: 'image/jpeg',
          name: 'product_image.jpg',
        });
      }

      const response = await fetch(`${BASE_URL}/api/inventory/products`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
        },
        body: formData,
      });
      const text = await response.text();
      console.log('Add product API:', text);
      const result = JSON.parse(text);
      if (result.status === 200 || result.status === 201) {
        Alert.alert('Success', 'Product added successfully');
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

                <Text style={styles.modalLabel}>SKU Code *</Text>
                <TextInput style={styles.modalInput} placeholder="Enter SKU code" placeholderTextColor="#999" value={productSKU} onChangeText={setProductSKU} autoCapitalize="characters" />

                <Text style={styles.modalLabel}>Category</Text>
                <TextInput style={styles.modalInput} placeholder="e.g. Tablets, Syrups, Capsules" placeholderTextColor="#999" value={productCategory} onChangeText={setProductCategory} />

                <Text style={styles.modalLabel}>Price (₹) *</Text>
                <TextInput style={styles.modalInput} placeholder="Enter price" placeholderTextColor="#999" value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" />

                <Text style={styles.modalLabel}>Stock Quantity *</Text>
                <TextInput style={styles.modalInput} placeholder="Enter current stock" placeholderTextColor="#999" value={productStock} onChangeText={setProductStock} keyboardType="numeric" />

                <Text style={styles.modalLabel}>Minimum Stock Level</Text>
                <TextInput style={styles.modalInput} placeholder="Enter minimum stock alert level" placeholderTextColor="#999" value={productMinStock} onChangeText={setProductMinStock} keyboardType="numeric" />

                <Text style={styles.modalLabel}>Unit</Text>
                <TextInput style={styles.modalInput} placeholder="e.g. strips, bottles, tubes" placeholderTextColor="#999" value={productUnit} onChangeText={setProductUnit} />

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

                <Text style={styles.modalLabel}>Product Image</Text>
                {productImage ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: productImage }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setProductImage(null)}>
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadRow}>
                    <TouchableOpacity style={styles.uploadBtn} onPress={pickProductImage}>
                      <Text style={styles.uploadIcon}>📷</Text>
                      <Text style={styles.uploadText}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                )}

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
                    <Text style={styles.detailSKU}>SKU: {selectedProduct.sku}</Text>
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
                      <Text style={styles.detailLabel}>Price</Text>
                      <Text style={styles.detailValue}>₹{selectedProduct.price}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Current Stock</Text>
                      <Text style={[styles.detailValue, { color: getStockStatusColor(selectedProduct.status) }]}>{selectedProduct.stock} {selectedProduct.unit}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Min Stock</Text>
                      <Text style={styles.detailValue}>{selectedProduct.minStock} {selectedProduct.unit}</Text>
                    </View>
                  </View>

                  <View style={styles.detailActions}>
                    <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#4caf50' }]} activeOpacity={0.7}>
                      <Text style={styles.detailActionText}>Stock In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#e53935' }]} activeOpacity={0.7}>
                      <Text style={styles.detailActionText}>Stock Out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ======================== MAIN SCREEN ========================
export default function InventoryDashboardScreen({ user, onGoBack, onLogout }) {
  const [activeTab, setActiveTab] = useState('alerts');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const tabs = [
    { key: 'alerts', label: 'Alerts', icon: '🔔' },
    { key: 'reports', label: 'Reports', icon: '📊' },
    { key: 'products', label: 'Products', icon: '📦' },
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
              <Text style={styles.headerTitle}>Inventory</Text>
              <Text style={styles.headerSubtitle}>Manage your stock & products</Text>
            </View>
          </View>
          {onLogout ? (
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {activeTab === 'alerts' && <AlertsTab user={user} refreshing={refreshing} onRefresh={onRefresh} />}
        {activeTab === 'reports' && <ReportsTab user={user} refreshing={refreshing} onRefresh={onRefresh} />}
        {activeTab === 'products' && <ProductsTab user={user} refreshing={refreshing} onRefresh={onRefresh} />}
      </View>
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
    paddingHorizontal: 20,
    paddingBottom: 0,
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
  tabBar: {
    flexDirection: 'row',
    marginTop: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#e53935',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
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
