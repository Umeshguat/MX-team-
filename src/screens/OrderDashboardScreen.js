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
import { useTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

// ======================== SECTION HEADER ========================
function SectionHeader({ title, color, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
      <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: color || theme.primary, marginRight: 10 }} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{title}</Text>
    </View>
  );
}

// ======================== MODAL INPUT ========================
function ModalInput({ emoji, placeholder, value, onChangeText, theme, style, ...rest }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceVariant, borderRadius: 14, borderWidth: 1, borderColor: theme.divider, marginBottom: 10, paddingHorizontal: 12 }, style]}>
      {emoji ? <Text style={{ fontSize: 16, marginRight: 8 }}>{emoji}</Text> : null}
      <TextInput
        style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: theme.text }}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        value={value}
        onChangeText={onChangeText}
        {...rest}
      />
    </View>
  );
}

// ======================== HANDLE BAR ========================
function HandleBar({ theme }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.divider }} />
    </View>
  );
}

// ======================== CREATE ORDER MODAL ========================
function CreateOrderModal({ visible, onClose, onSubmit, user }) {
  const { theme, isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [dueDate, setDueDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');

  const paymentModes = [
    { label: 'Cash', value: 'cash', emoji: '💵' },
    { label: 'UPI', value: 'upi', emoji: '📱' },
    { label: 'Bank Transfer', value: 'bank_transfer', emoji: '🏦' },
    { label: 'Cheque', value: 'cheque', emoji: '📝' },
    { label: 'Credit', value: 'credit', emoji: '💳' },
    { label: 'MarginX Bharat', value: 'marginx_bharat', emoji: '🇮🇳' },
  ];

  useEffect(() => {
    if (visible) {
      fetchProducts();
      setSelectedProducts([]);
      setVendorName('');
      setVendorMobile('');
      setNotes('');
      setSearchQuery('');
      setDiscount('');
      setPaymentMode('cash');
      setDueDate('');
      setDeliveryAddress('');
      setDeliveryCity('');
      setDeliveryState('');
      setDeliveryPincode('');
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
    if (!vendorName.trim()) {
      Alert.alert('Error', 'Please enter vendor name');
      return;
    }
    if (!vendorMobile.trim()) {
      Alert.alert('Error', 'Please enter vendor mobile number');
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
      const orderItems = selectedProducts.map(p => ({
        product_id: p._id,
        quantity: parseInt(p.orderQty),
        unit_price: p.selling_price || 0,
      }));

      const orderPayload = {
        vendor_name: vendorName.trim(),
        vendor_mobile: vendorMobile.trim(),
        vendor_address: null,
        items: orderItems,
        discount: parseFloat(discount) || 0,
        payment_mode: paymentMode,
        note: notes.trim(),
      };

      if (paymentMode === 'credit' && dueDate.trim()) {
        orderPayload.due_date = dueDate.trim();
      }

      if (deliveryAddress.trim() || deliveryCity.trim() || deliveryState.trim() || deliveryPincode.trim()) {
        orderPayload.delivery_address = {
          address: deliveryAddress.trim(),
          city: deliveryCity.trim(),
          state: deliveryState.trim(),
          pincode: deliveryPincode.trim(),
        };
      }

      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
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
      Alert.alert('Error', e.message || 'Unable to connect to server');
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

  const subtotal = selectedProducts.reduce((sum, p) => sum + ((p.selling_price || 0) * parseInt(p.orderQty || 0)), 0);
  const discountVal = parseFloat(discount) || 0;
  const grandTotal = subtotal - discountVal;
  const scrollViewRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' }}>
        <View style={[{
          backgroundColor: theme.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '92%',
          paddingHorizontal: 20,
          paddingBottom: 20,
        }, keyboardHeight > 0 && { maxHeight: '95%', paddingBottom: keyboardHeight }]}>

          <HandleBar theme={theme} />

          {/* Modal Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primary + '18', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Text style={{ fontSize: 18 }}>📦</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>Create New Order</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textSecondary }}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? 40 : 20 }} keyboardShouldPersistTaps="handled">
            {/* Vendor Details */}
            <SectionHeader title="Vendor Details" color={theme.info} theme={theme} />
            <ModalInput emoji="👤" placeholder="Vendor Name *" value={vendorName} onChangeText={setVendorName} theme={theme} />
            <ModalInput emoji="📞" placeholder="Vendor Mobile *" value={vendorMobile} onChangeText={setVendorMobile} theme={theme} keyboardType="phone-pad" maxLength={10} />

            {/* Product Selection */}
            <SectionHeader title="Select Products" color={theme.secondary} theme={theme} />
            <ModalInput emoji="🔍" placeholder="Search products..." value={searchQuery} onChangeText={setSearchQuery} theme={theme} />

            {loadingProducts ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ maxHeight: 250 }}>
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.find(p => p._id === product._id);
                  return (
                    <TouchableOpacity
                      key={product._id}
                      style={[{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: theme.surfaceVariant,
                        borderRadius: 12,
                        marginBottom: 8,
                        borderWidth: 1.5,
                        borderColor: theme.divider,
                      },
                      isSelected && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                      ]}
                      onPress={() => toggleProduct(product)}
                      activeOpacity={0.7}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isSelected ? theme.primary + '20' : theme.background, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                        <Text style={{ fontSize: 18 }}>🏷️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{product.product_name}</Text>
                        <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>{product.product_code || ''} {product.brand ? '| ' + product.brand : ''}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary, marginTop: 3 }}>Rs. {product.selling_price || 0}</Text>
                      </View>
                      <View style={[{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: theme.textTertiary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                      isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}>
                        {isSelected && <Text style={{ color: theme.buttonText, fontWeight: '700', fontSize: 14 }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 22 }}>🔍</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSecondary }}>No products found</Text>
                  </View>
                )}
              </View>
            )}

            {/* Selected Products with Quantity */}
            {selectedProducts.length > 0 && (
              <View>
                <SectionHeader title={`Order Items (${selectedProducts.length})`} color={theme.primary} theme={theme} />
                {selectedProducts.map((p) => (
                  <View key={p._id} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: theme.surfaceVariant,
                    borderRadius: 12,
                    marginBottom: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: theme.primary,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>{p.product_name}</Text>
                      <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>Rs. {p.selling_price || 0} each</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 }}>
                      <TouchableOpacity
                        style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => {
                          const val = Math.max(1, parseInt(p.orderQty || 1) - 1);
                          updateQty(p._id, String(val));
                        }}
                      >
                        <Text style={{ color: theme.buttonText, fontSize: 16, fontWeight: '700' }}>-</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={{ width: 44, textAlign: 'center', fontSize: 15, fontWeight: '800', color: theme.text }}
                        value={p.orderQty}
                        onChangeText={(val) => updateQty(p._id, val.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                      <TouchableOpacity
                        style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => {
                          const val = parseInt(p.orderQty || 0) + 1;
                          updateQty(p._id, String(val));
                        }}
                      >
                        <Text style={{ color: theme.buttonText, fontSize: 16, fontWeight: '700' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.primary, minWidth: 65, textAlign: 'right' }}>Rs. {(p.selling_price || 0) * parseInt(p.orderQty || 0)}</Text>
                  </View>
                ))}

                {/* Summary */}
                <View style={{ padding: 16, backgroundColor: theme.surfaceVariant, borderRadius: 16, marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: theme.textSecondary }}>Subtotal</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Rs. {subtotal}</Text>
                  </View>
                  {discountVal > 0 && (
                    <>
                      <View style={{ height: 1, backgroundColor: theme.divider, marginBottom: 8 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, color: theme.success }}>Discount</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.success }}>- Rs. {discountVal}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Grand Total */}
                <View style={{
                  padding: 16,
                  backgroundColor: theme.primary,
                  borderRadius: 16,
                  marginTop: 10,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>💰</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textOnPrimary }}>Grand Total</Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textOnPrimary }}>Rs. {grandTotal}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 }}>GST Included</Text>
                </View>
              </View>
            )}

            {/* Discount & Tax */}
            <SectionHeader title="Discount" color={theme.success} theme={theme} />
            <ModalInput emoji="🏷️" placeholder="Discount (Rs.)" value={discount} onChangeText={setDiscount} theme={theme} keyboardType="numeric" />

            {/* Payment Mode */}
            <SectionHeader title="Payment Mode" color={theme.warning} theme={theme} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {paymentModes.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 20,
                    backgroundColor: paymentMode === mode.value ? theme.primary : theme.surfaceVariant,
                    borderWidth: 1,
                    borderColor: paymentMode === mode.value ? theme.primary : theme.divider,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setPaymentMode(mode.value);
                    if (mode.value === 'credit') {
                      const d = new Date();
                      d.setDate(d.getDate() + 5);
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      setDueDate(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setDueDate('');
                    }
                  }}
                >
                  <Text style={{ fontSize: 14, marginRight: 5 }}>{mode.emoji}</Text>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: paymentMode === mode.value ? theme.buttonText : theme.textSecondary,
                  }}>{mode.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Due Date (only for credit) */}
            {paymentMode === 'credit' && (
              <>
                <SectionHeader title="Due Date" color={theme.primary} theme={theme} />
                <ModalInput emoji="📅" placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} theme={theme} />
              </>
            )}

            {/* Delivery Address */}
            <SectionHeader title="Delivery Address" color={theme.info} theme={theme} />
            <ModalInput emoji="📍" placeholder="Address" value={deliveryAddress} onChangeText={setDeliveryAddress} theme={theme} multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <ModalInput emoji="🏙️" placeholder="City" value={deliveryCity} onChangeText={setDeliveryCity} theme={theme} />
              </View>
              <View style={{ flex: 1 }}>
                <ModalInput emoji="🗺️" placeholder="State" value={deliveryState} onChangeText={setDeliveryState} theme={theme} />
              </View>
            </View>
            <ModalInput emoji="📮" placeholder="Pincode" value={deliveryPincode} onChangeText={setDeliveryPincode} theme={theme} keyboardType="number-pad" maxLength={6} />

            {/* Notes */}
            <ModalInput
              emoji="📝"
              placeholder="Order notes (optional)"
              value={notes}
              onChangeText={setNotes}
              theme={theme}
              multiline
              style={{ minHeight: 70, alignItems: 'flex-start', paddingTop: 12 }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
          </ScrollView>

          <TouchableOpacity
            style={[{
              backgroundColor: theme.primary,
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 8,
            }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color={theme.buttonText} size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 18, marginRight: 8 }}>🛒</Text>
                <Text style={{ color: theme.buttonText, fontSize: 16, fontWeight: '800' }}>Place Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ======================== ORDER DETAIL MODAL ========================
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
      case 'cancelled': case 'rejected': return theme.primary;
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

          {/* Modal Header */}
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
            {/* Order Number + Status */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text }}>#{order.order_number || order._id?.slice(-6) || '--'}</Text>
              <View style={{ backgroundColor: getStatusBg(order.order_status), paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: getStatusColor(order.order_status) }}>{(order.order_status || 'Pending').toUpperCase()}</Text>
              </View>
            </View>

            {/* Vendor Info */}
            <View style={{ marginTop: 14, padding: 16, backgroundColor: theme.surfaceVariant, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: theme.info }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>👤</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{order.vendor_name || '--'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>📞</Text>
                <Text style={{ fontSize: 13, color: theme.textTertiary }}>{order.vendor_mobile || '--'}</Text>
              </View>
              {order.vendor_address ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 14, marginRight: 8 }}>📍</Text>
                  <Text style={{ fontSize: 13, color: theme.textTertiary }}>{order.vendor_address}</Text>
                </View>
              ) : null}
            </View>

            {/* Items */}
            <SectionHeader title={`Items (${(order.items || []).length})`} color={theme.secondary} theme={theme} />
            {(order.items || []).map((item, idx) => (
              <View key={idx} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 12,
                backgroundColor: theme.surfaceVariant,
                borderRadius: 12,
                marginBottom: 6,
                borderLeftWidth: 4,
                borderLeftColor: theme.secondary,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{item.product_name}</Text>
                  <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 3 }}>Qty: {item.quantity} x Rs. {item.unit_price || 0}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.primary, alignSelf: 'center' }}>Rs. {item.total_price || 0}</Text>
              </View>
            ))}

            {/* Total */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              backgroundColor: theme.primary,
              borderRadius: 16,
              marginTop: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>💰</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textOnPrimary }}>Total Amount</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textOnPrimary }}>Rs. {order.grand_total || 0}</Text>
            </View>

            {/* Notes */}
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

            {/* Payment Summary Cards */}
            {paymentData ? (
              <>
                <SectionHeader title="Payment Summary" color={theme.info} theme={theme} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, backgroundColor: theme.infoBg, borderRadius: 16, padding: 14, alignItems: 'center', elevation: 1 }}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>💰</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.info }}>Rs. {paymentData.grandTotal}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.info, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: theme.successBg, borderRadius: 16, padding: 14, alignItems: 'center', elevation: 1 }}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>✅</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.success }}>Rs. {paymentData.totalPaid}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.success, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paid</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: paymentData.balance > 0 ? theme.errorBg : theme.successBg, borderRadius: 16, padding: 14, alignItems: 'center', elevation: 1 }}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{paymentData.balance > 0 ? '⏳' : '🎉'}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: paymentData.balance > 0 ? theme.primary : theme.success }}>Rs. {paymentData.balance}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: paymentData.balance > 0 ? theme.primary : theme.success, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Balance</Text>
                  </View>
                </View>

                {/* Payment History */}
                {paymentData.payments && paymentData.payments.length > 0 && (
                  <>
                    <SectionHeader title="Payment History" color={theme.info} theme={theme} />
                    {paymentData.payments.map((p, idx) => (
                      <View key={idx} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 14,
                        backgroundColor: theme.surfaceVariant,
                        borderRadius: 12,
                        marginBottom: 6,
                        borderLeftWidth: 4,
                        borderLeftColor: theme.success,
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Rs. {p.amount || 0}</Text>
                          <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>{p.payment_mode || 'Cash'} {p.note ? '- ' + p.note : ''}</Text>
                        </View>
                        <View style={{ backgroundColor: theme.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textTertiary }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '--')}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {paymentData.balance <= 0 && paymentData.payments.length > 0 && (
                  <View style={{ marginTop: 14, padding: 20, backgroundColor: theme.successBg, borderRadius: 16, alignItems: 'center' }}>
                    <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: theme.success + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 26 }}>🎉</Text>
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: theme.success }}>Fully Paid</Text>
                    <Text style={{ fontSize: 13, color: theme.success, marginTop: 4 }}>All payments have been recorded</Text>
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

// ======================== MAIN ORDER DASHBOARD ========================
export default function OrderDashboardScreen({ user, onGoBack, onLogout, onGoToProfile, onGoToInventory }) {
  const { theme, isDark, toggleTheme } = useTheme();
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
    const pending = orderList.filter(o => (o.order_status || '').toLowerCase() === 'pending').length;
    const confirmed = orderList.filter(o => ['confirmed', 'approved'].includes((o.order_status || '').toLowerCase())).length;
    const delivered = orderList.filter(o => ['delivered', 'completed'].includes((o.order_status || '').toLowerCase())).length;
    const totalAmount = orderList.reduce((sum, o) => sum + (o.grand_total || 0), 0);
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
      case 'pending': return theme.warning;
      case 'confirmed': case 'approved': return theme.info;
      case 'dispatched': case 'shipped': return theme.secondary;
      case 'delivered': case 'completed': return theme.success;
      case 'cancelled': case 'rejected': return theme.primary;
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

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => {
        const s = (o.order_status || '').toLowerCase();
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={[theme.gradient1, theme.gradient2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 22,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
      }}>
        {/* Decorative Circles */}
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -30 }} />
        <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', top: 70, left: -50 }} />
        <View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: theme.secondary ? (theme.secondary + '26') : 'rgba(255,255,255,0.15)', bottom: -20, right: 60 }} />

        {/* Nav Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {onGoBack ? (
              <TouchableOpacity
                style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}
                onPress={onGoBack}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>{'<'}</Text>
              </TouchableOpacity>
            ) : null}
            <View>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Welcome Back,</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>{user && user.fullName ? user.fullName : 'Sales'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            {onGoToProfile ? (
              <TouchableOpacity
                style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}
                onPress={onGoToProfile}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>P</Text>
              </TouchableOpacity>
            ) : null}
            {onLogout ? (
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}
                onPress={onLogout}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#ff8a80', fontSize: 13, fontWeight: '700' }}>Logout</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Date & Time */}
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{formatDate(currentTime)}</Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginTop: 4, letterSpacing: 2 }}>{formatTime(currentTime)}</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
      >
        {/* Stats Overview */}
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 4,
            alignItems: 'center',
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          }}>
            <Text style={{ fontSize: 26, marginBottom: 6 }}>📋</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: theme.text }}>{loading ? '--' : stats.total}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textTertiary, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total Orders</Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 4,
            alignItems: 'center',
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          }}>
            <Text style={{ fontSize: 26, marginBottom: 6 }}>💰</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: theme.text }}>{loading ? '--' : formatCurrency(stats.totalAmount)}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textTertiary, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total Value</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 4,
            alignItems: 'center',
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            borderLeftWidth: 4,
            borderLeftColor: theme.warning,
          }}>
            <Text style={{ fontSize: 26, marginBottom: 6 }}>⏳</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: theme.warning }}>{loading ? '--' : stats.pending}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textTertiary, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>Pending</Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 4,
            alignItems: 'center',
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            borderLeftWidth: 4,
            borderLeftColor: theme.info,
          }}>
            <Text style={{ fontSize: 26, marginBottom: 6 }}>✅</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: theme.info }}>{loading ? '--' : stats.confirmed}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textTertiary, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>Confirmed</Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 4,
            alignItems: 'center',
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            borderLeftWidth: 4,
            borderLeftColor: theme.success,
          }}>
            <Text style={{ fontSize: 26, marginBottom: 6 }}>🚚</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: theme.success }}>{loading ? '--' : stats.delivered}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textTertiary, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>Delivered</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 14 }}>
          <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: theme.primary, marginRight: 10 }} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>Quick Actions</Text>
        </View>
        <View style={{ marginBottom: 10 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              padding: 18,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              elevation: 3,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
            }}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.7}
          >
            <View style={{ width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: theme.primary + '18' }}>
              <Text style={{ fontSize: 22 }}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>New Order</Text>
              <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>Create a new order</Text>
            </View>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: theme.textTertiary }}>→</Text>
            </View>
          </TouchableOpacity>

          {onGoToInventory ? (
            <TouchableOpacity
              style={{
                backgroundColor: theme.surface,
                borderRadius: 16,
                padding: 18,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                elevation: 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
              }}
              onPress={onGoToInventory}
              activeOpacity={0.7}
            >
              <View style={{ width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: theme.secondary ? (theme.secondary + '18') : (isDark ? theme.surfaceVariant : '#f3e5f5') }}>
                <Text style={{ fontSize: 22 }}>🏬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>Inventory</Text>
                <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>View stock</Text>
              </View>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: theme.textTertiary }}>→</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Order Filters */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 14 }}>
          <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: theme.secondary || theme.primary, marginRight: 10 }} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>Orders</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {filterOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[{
                paddingHorizontal: 18,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: theme.surface,
                marginRight: 8,
                borderWidth: 1,
                borderColor: theme.divider,
              },
              filter === opt.key && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setFilter(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[{
                fontSize: 13,
                fontWeight: '600',
                color: theme.textSecondary,
              },
              filter === opt.key && { color: theme.buttonText }
              ]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Orders List */}
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 10 }}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 32 }}>📋</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>No Orders Found</Text>
            <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 6 }}>Create your first order to get started</Text>
            <TouchableOpacity
              style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 18 }}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.buttonText, fontSize: 14, fontWeight: '700' }}>+ Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order._id}
              style={{
                backgroundColor: theme.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                borderLeftWidth: 4,
                borderLeftColor: getStatusColor(order.order_status),
                flexDirection: 'row',
              }}
              onPress={() => setSelectedOrder(order)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>#{order.order_number || order._id?.slice(-6) || '--'}</Text>
                  <View style={{ backgroundColor: getStatusBg(order.order_status), paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: getStatusColor(order.order_status) }}>{(order.order_status || 'Pending').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 8 }}>{order.vendor_name || '--'}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: theme.textTertiary }}>{(order.items || []).length} items</Text>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: theme.primary }}>Rs. {order.grand_total || 0}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: theme.divider, marginVertical: 8 }} />
                <Text style={{ fontSize: 11, color: theme.textTertiary }}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '--'}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB - Create Order */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 80,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: theme.primary,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 6,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 28, color: theme.buttonText, fontWeight: '600', marginTop: -2 }}>+</Text>
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
        user={user}
      />

      {/* Bottom Navigation */}
      <View style={{ flexDirection: 'row', paddingVertical: 8, paddingBottom: 8, borderTopWidth: 1, alignItems: 'center', justifyContent: 'space-around', backgroundColor: theme.surface, borderTopColor: theme.divider }}>
        <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 4, flex: 1 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 22, marginBottom: 4, color: theme.primary }}>📋</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>Orders</Text>
          <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 3, backgroundColor: theme.primary }} />
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 4, flex: 1 }} onPress={onGoToInventory} activeOpacity={0.7}>
          <Text style={{ fontSize: 22, marginBottom: 4, color: theme.textTertiary }}>📦</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textTertiary }}>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 4, flex: 1 }} onPress={onGoToProfile} activeOpacity={0.7}>
          <Text style={{ fontSize: 22, marginBottom: 4, color: theme.textTertiary }}>👤</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textTertiary }}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
