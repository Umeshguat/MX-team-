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

const screenWidth = Dimensions.get('window').width;

// ======================== CREATE ORDER MODAL ========================
function CreateOrderModal({ visible, onClose, onSubmit, user }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [dueDate, setDueDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');

  const paymentModes = [
    { label: 'Cash', value: 'cash' },
    { label: 'UPI', value: 'upi' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Credit', value: 'credit' },
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
      setTax('');
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
        tax: parseFloat(tax) || 0,
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
  const taxVal = parseFloat(tax) || 0;
  const grandTotal = subtotal - discountVal + taxVal;
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
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, keyboardHeight > 0 && { maxHeight: '95%', paddingBottom: keyboardHeight }]}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Create New Order</Text>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Text style={modalStyles.closeBtnText}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? 40 : 20 }} keyboardShouldPersistTaps="handled">
              {/* Vendor Details */}
              <Text style={modalStyles.sectionLabel}>Vendor Details</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="Vendor Name *"
                placeholderTextColor="#999"
                value={vendorName}
                onChangeText={setVendorName}
              />
              <TextInput
                style={modalStyles.input}
                placeholder="Vendor Mobile *"
                placeholderTextColor="#999"
                value={vendorMobile}
                onChangeText={setVendorMobile}
                keyboardType="phone-pad"
                maxLength={10}
              />

              {/* Product Selection */}
              <Text style={modalStyles.sectionLabel}>Select Products</Text>
              <TextInput
                style={modalStyles.searchInput}
                placeholder="Search products..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {loadingProducts ? (
                <ActivityIndicator size="small" color="#e53935" style={{ marginVertical: 20 }} />
              ) : (
                <View style={modalStyles.productList}>
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.find(p => p._id === product._id);
                    return (
                      <TouchableOpacity
                        key={product._id}
                        style={[modalStyles.productItem, isSelected && modalStyles.productItemSelected]}
                        onPress={() => toggleProduct(product)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={modalStyles.productName}>{product.product_name}</Text>
                          <Text style={modalStyles.productCode}>{product.product_code || ''} {product.brand ? '| ' + product.brand : ''}</Text>
                          <Text style={modalStyles.productPrice}>Rs. {product.selling_price || 0}</Text>
                        </View>
                        <View style={[modalStyles.checkBox, isSelected && modalStyles.checkBoxSelected]}>
                          {isSelected && <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <Text style={modalStyles.emptyText}>No products found</Text>
                  )}
                </View>
              )}

              {/* Selected Products with Quantity */}
              {selectedProducts.length > 0 && (
                <View>
                  <Text style={modalStyles.sectionLabel}>Order Items ({selectedProducts.length})</Text>
                  {selectedProducts.map((p) => (
                    <View key={p._id} style={modalStyles.orderItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={modalStyles.orderItemName}>{p.product_name}</Text>
                        <Text style={modalStyles.orderItemPrice}>Rs. {p.selling_price || 0} each</Text>
                      </View>
                      <View style={modalStyles.qtyRow}>
                        <TouchableOpacity
                          style={modalStyles.qtyBtn}
                          onPress={() => {
                            const val = Math.max(1, parseInt(p.orderQty || 1) - 1);
                            updateQty(p._id, String(val));
                          }}
                        >
                          <Text style={modalStyles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={modalStyles.qtyInput}
                          value={p.orderQty}
                          onChangeText={(val) => updateQty(p._id, val.replace(/[^0-9]/g, ''))}
                          keyboardType="number-pad"
                        />
                        <TouchableOpacity
                          style={modalStyles.qtyBtn}
                          onPress={() => {
                            const val = parseInt(p.orderQty || 0) + 1;
                            updateQty(p._id, String(val));
                          }}
                        >
                          <Text style={modalStyles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={modalStyles.itemTotal}>Rs. {(p.selling_price || 0) * parseInt(p.orderQty || 0)}</Text>
                    </View>
                  ))}
                  {/* Subtotal, Discount, Tax, Grand Total */}
                  <View style={{ padding: 14, backgroundColor: '#f8f8f8', borderRadius: 12, marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, color: '#666' }}>Subtotal</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>Rs. {subtotal}</Text>
                    </View>
                    {discountVal > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#4caf50' }}>Discount</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#4caf50' }}>- Rs. {discountVal}</Text>
                      </View>
                    )}
                    {taxVal > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#ff9800' }}>Tax</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#ff9800' }}>+ Rs. {taxVal}</Text>
                      </View>
                    )}
                  </View>
                  <View style={modalStyles.totalRow}>
                    <Text style={modalStyles.totalLabel}>Grand Total</Text>
                    <Text style={modalStyles.totalValue}>Rs. {grandTotal}</Text>
                  </View>
                </View>
              )}

              {/* Discount & Tax */}
              <Text style={modalStyles.sectionLabel}>Discount & Tax</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[modalStyles.input, { flex: 1 }]}
                  placeholder="Discount (Rs.)"
                  placeholderTextColor="#999"
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[modalStyles.input, { flex: 1 }]}
                  placeholder="Tax (Rs.)"
                  placeholderTextColor="#999"
                  value={tax}
                  onChangeText={setTax}
                  keyboardType="numeric"
                />
              </View>

              {/* Payment Mode */}
              <Text style={modalStyles.sectionLabel}>Payment Mode</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {paymentModes.map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: paymentMode === mode.value ? '#e53935' : '#f8f8f8',
                      borderWidth: 1,
                      borderColor: paymentMode === mode.value ? '#e53935' : '#eee',
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
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: paymentMode === mode.value ? '#fff' : '#666',
                    }}>{mode.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Due Date (only for credit) */}
              {paymentMode === 'credit' && (
                <>
                  <Text style={modalStyles.sectionLabel}>Due Date</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                </>
              )}

              {/* Delivery Address */}
              <Text style={modalStyles.sectionLabel}>Delivery Address</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="Address"
                placeholderTextColor="#999"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[modalStyles.input, { flex: 1 }]}
                  placeholder="City"
                  placeholderTextColor="#999"
                  value={deliveryCity}
                  onChangeText={setDeliveryCity}
                />
                <TextInput
                  style={[modalStyles.input, { flex: 1 }]}
                  placeholder="State"
                  placeholderTextColor="#999"
                  value={deliveryState}
                  onChangeText={setDeliveryState}
                />
              </View>
              <TextInput
                style={modalStyles.input}
                placeholder="Pincode"
                placeholderTextColor="#999"
                value={deliveryPincode}
                onChangeText={setDeliveryPincode}
                keyboardType="number-pad"
                maxLength={6}
              />

              {/* Notes */}
              <TextInput
                style={[modalStyles.input, { height: 80, textAlignVertical: 'top', marginTop: 10 }]}
                placeholder="Order notes (optional)"
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            </ScrollView>

            <TouchableOpacity
              style={[modalStyles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={modalStyles.submitBtnText}>Place Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: '#666' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 14, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
  searchInput: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
  productList: { maxHeight: 250 },
  productItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f8f8', borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#eee' },
  productItemSelected: { borderColor: '#e53935', backgroundColor: '#fff5f5' },
  productName: { fontSize: 14, fontWeight: '700', color: '#333' },
  productCode: { fontSize: 11, color: '#999', marginTop: 2 },
  productPrice: { fontSize: 12, fontWeight: '600', color: '#e53935', marginTop: 2 },
  checkBox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  checkBoxSelected: { backgroundColor: '#e53935', borderColor: '#e53935' },
  orderItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f8f8', borderRadius: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#e53935' },
  orderItemName: { fontSize: 13, fontWeight: '700', color: '#333' },
  orderItemPrice: { fontSize: 11, color: '#999', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e53935', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  qtyInput: { width: 40, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#333' },
  itemTotal: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', minWidth: 60, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#1a1a2e', borderRadius: 12, marginTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#ff8a80' },
  submitBtn: { backgroundColor: '#e53935', borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 13, marginVertical: 20 },
});

// ======================== ORDER DETAIL MODAL ========================
function OrderDetailModal({ visible, order, onClose, onOpenPayment }) {
  if (!order) return null;

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return '#ff9800';
      case 'confirmed': case 'approved': return '#1565c0';
      case 'dispatched': case 'shipped': return '#7b1fa2';
      case 'delivered': case 'completed': return '#4caf50';
      case 'cancelled': case 'rejected': return '#e53935';
      default: return '#999';
    }
  };

  const getStatusBg = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return '#fff3e0';
      case 'confirmed': case 'approved': return '#e3f2fd';
      case 'dispatched': case 'shipped': return '#f3e5f5';
      case 'delivered': case 'completed': return '#e8f5e9';
      case 'cancelled': case 'rejected': return '#ffebee';
      default: return '#f5f5f5';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Order Details</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a2e' }}>#{order.order_number || order._id?.slice(-6) || '--'}</Text>
              <View style={{ backgroundColor: getStatusBg(order.order_status), paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: getStatusColor(order.order_status) }}>{(order.order_status || 'Pending').toUpperCase()}</Text>
              </View>
            </View>

            <View style={{ marginTop: 14, padding: 14, backgroundColor: '#f8f8f8', borderRadius: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#333' }}>{order.vendor_name || '--'}</Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{order.vendor_mobile || '--'}</Text>
              {order.vendor_address ? <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{order.vendor_address}</Text> : null}
            </View>

            <Text style={modalStyles.sectionLabel}>Items ({(order.items || []).length})</Text>
            {(order.items || []).map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#f8f8f8', borderRadius: 8, marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>{item.product_name}</Text>
                  <Text style={{ fontSize: 11, color: '#999' }}>Qty: {item.quantity} x Rs. {item.unit_price || 0}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a1a2e' }}>Rs. {item.total_price || 0}</Text>
              </View>
            ))}

            <View style={modalStyles.totalRow}>
              <Text style={modalStyles.totalLabel}>Total Amount</Text>
              <Text style={modalStyles.totalValue}>Rs. {order.grand_total || 0}</Text>
            </View>

            {order.note ? (
              <View style={{ marginTop: 10, padding: 12, backgroundColor: '#fff3e0', borderRadius: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#e65100' }}>Notes:</Text>
                <Text style={{ fontSize: 12, color: '#333', marginTop: 4 }}>{order.note}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 11, color: '#999', marginTop: 14, textAlign: 'center' }}>
              Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '--'}
            </Text>

            {/* Payment / Credit Button */}
            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: '#1565c0',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={() => { if (onOpenPayment) onOpenPayment(order); }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Payment / Credit</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ======================== PAYMENT CREDIT MODAL ========================
function PaymentCreditModal({ visible, order, onClose, onPaymentSuccess, user }) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentCreditId, setPaymentCreditId] = useState(null);
  const [creditData, setCreditData] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);

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

  const paymentModes = [
    { label: 'Cash', value: 'cash' },
    { label: 'UPI', value: 'upi' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'Cheque', value: 'cheque' },
  ];

  useEffect(() => {
    if (visible && order) {
      setPaymentAmount('');
      setPaymentMode('cash');
      setPaymentNote('');
      fetchPaymentCredit();
    }
  }, [visible, order]);

  const fetchPaymentCredit = async () => {
    try {
      setLoadingPayments(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

      // Fetch order details with linked payment credit
      const response = await fetch(`${BASE_URL}/api/orders/${order._id}`, { headers });
      const result = await response.json();

      if (response.ok || result.status === 200) {
        const credit = result.paymentCredit || null;
        if (credit) {
          setPaymentCreditId(credit._id);
          setCreditData(credit);
          setPayments(credit.payment_history || []);
        } else {
          setPaymentCreditId(null);
          setCreditData(null);
          setPayments([]);
        }
      } else {
        setPayments([]);
      }
    } catch (e) {
      console.log('Fetch payment credit error:', e);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const totalPaid = creditData ? (creditData.paid_amount || 0) : payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const grandTotal = creditData ? (creditData.total_amount || 0) : (order ? (order.grand_total || 0) : 0);
  const balance = creditData ? (creditData.remaining_amount || 0) : (grandTotal - totalPaid);

  const handleSubmitPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    if (amount > balance) {
      Alert.alert('Error', 'Payment amount cannot exceed the balance of Rs. ' + balance);
      return;
    }

    try {
      setSubmitting(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

      // Auto-create PaymentCredit if not exists for this order
      let creditId = paymentCreditId;
      if (!creditId) {
        const createRes = await fetch(`${BASE_URL}/api/payment-credits`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            vendor_name: order.vendor_name || '--',
            vendor_mobile: order.vendor_mobile || '',
            order_id: order._id,
            total_amount: order.grand_total || 0,
            paid_amount: 0,
            payment_mode: 'cash',
            note: `Auto-created credit for order ${order.order_number || order._id}`,
          }),
        });
        const createResult = await createRes.json();
        if (createRes.ok || createResult.status === 201 || createResult.status === 200) {
          creditId = createResult.paymentCredit?._id || createResult.data?._id || createResult._id;
          setPaymentCreditId(creditId);
        } else {
          Alert.alert('Error', createResult.message || 'Failed to create payment credit for this order');
          return;
        }
      }

      const body = JSON.stringify({
        amount,
        payment_mode: paymentMode,
        note: paymentNote.trim(),
      });
      const response = await fetch(`${BASE_URL}/api/payment-credits/${creditId}/pay`, {
        method: 'POST',
        headers,
        body,
      });
      const result = await response.json();
      if (response.ok || result.status === 200 || result.status === 201) {
        Alert.alert('Success', result.message || 'Payment recorded successfully');
        setPaymentAmount('');
        setPaymentNote('');
        fetchPaymentCredit();
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        Alert.alert('Error', result.message || 'Failed to record payment');
      }
    } catch (e) {
      console.log('Payment submit error:', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, keyboardHeight > 0 && { maxHeight: '95%', paddingBottom: keyboardHeight }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Payment / Credit</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? 40 : 20 }} keyboardShouldPersistTaps="handled">
            {/* Order Summary */}
            <View style={{ marginTop: 14, padding: 14, backgroundColor: '#f8f8f8', borderRadius: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#333' }}>
                Order #{order.order_number || order._id?.slice(-6) || '--'}
              </Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{order.vendor_name || '--'}</Text>
            </View>

            {/* Payment Summary Cards */}
            <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#e3f2fd', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#1565c0' }}>Total Amount</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1565c0', marginTop: 4 }}>Rs. {grandTotal}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#4caf50' }}>Paid</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#4caf50', marginTop: 4 }}>Rs. {totalPaid}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: balance > 0 ? '#ffebee' : '#e8f5e9', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: balance > 0 ? '#e53935' : '#4caf50' }}>Balance</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: balance > 0 ? '#e53935' : '#4caf50', marginTop: 4 }}>Rs. {balance}</Text>
              </View>
            </View>

            {/* Payment History */}
            <Text style={modalStyles.sectionLabel}>Payment History</Text>
            {loadingPayments ? (
              <ActivityIndicator size="small" color="#1565c0" style={{ marginVertical: 10 }} />
            ) : payments.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 10 }}>
                <Text style={{ fontSize: 13, color: '#999' }}>No payments recorded yet</Text>
              </View>
            ) : (
              payments.map((p, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8f8f8', borderRadius: 10, marginBottom: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>Rs. {p.amount || 0}</Text>
                    <Text style={{ fontSize: 11, color: '#999' }}>{p.payment_mode || 'Cash'} {p.note ? '- ' + p.note : ''}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#bbb' }}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '--')}</Text>
                </View>
              ))
            )}

            {/* Add Payment Form */}
            {balance > 0 && (
              <>
                <Text style={modalStyles.sectionLabel}>Record Payment</Text>

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 }}>Payment Mode</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {paymentModes.map((mode) => (
                    <TouchableOpacity
                      key={mode.value}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: paymentMode === mode.value ? '#1565c0' : '#f0f0f0',
                        marginRight: 8,
                      }}
                      onPress={() => setPaymentMode(mode.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: paymentMode === mode.value ? '#fff' : '#666' }}>{mode.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  style={modalStyles.input}
                  placeholder="Payment Amount"
                  placeholderTextColor="#bbb"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />

                <TextInput
                  style={[modalStyles.input, { height: 60, textAlignVertical: 'top', marginTop: 8 }]}
                  placeholder="Payment Note (optional)"
                  placeholderTextColor="#bbb"
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  multiline
                />

                <TouchableOpacity
                  style={[modalStyles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmitPayment}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={modalStyles.submitBtnText}>Record Payment</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {balance <= 0 && payments.length > 0 && (
              <View style={{ marginTop: 14, padding: 16, backgroundColor: '#e8f5e9', borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#4caf50' }}>Fully Paid</Text>
                <Text style={{ fontSize: 12, color: '#66bb6a', marginTop: 4 }}>All payments have been recorded</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ======================== MAIN ORDER DASHBOARD ========================
export default function OrderDashboardScreen({ user, onGoBack, onLogout, onGoToProfile, onGoToInventory }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
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
      case 'pending': return '#ff9800';
      case 'confirmed': case 'approved': return '#1565c0';
      case 'dispatched': case 'shipped': return '#7b1fa2';
      case 'delivered': case 'completed': return '#4caf50';
      case 'cancelled': case 'rejected': return '#e53935';
      default: return '#999';
    }
  };

  const getStatusBg = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return '#fff3e0';
      case 'confirmed': case 'approved': return '#e3f2fd';
      case 'dispatched': case 'shipped': return '#f3e5f5';
      case 'delivered': case 'completed': return '#e8f5e9';
      case 'cancelled': case 'rejected': return '#ffebee';
      default: return '#f5f5f5';
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
              <Text style={styles.userName}>{user && user.fullName ? user.fullName : 'Sales'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {onGoToProfile ? (
              <TouchableOpacity style={styles.profileBtn} onPress={onGoToProfile} activeOpacity={0.7}>
                <Text style={styles.profileBtnText}>P</Text>
              </TouchableOpacity>
            ) : null}
            {onLogout ? (
              <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
            <Text style={styles.statsIcon}>📋</Text>
            <Text style={styles.statsValue}>{loading ? '--' : stats.total}</Text>
            <Text style={styles.statsLabel}>Total Orders</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsIcon}>💰</Text>
            <Text style={styles.statsValue}>{loading ? '--' : formatCurrency(stats.totalAmount)}</Text>
            <Text style={styles.statsLabel}>Total Value</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderTopWidth: 3, borderTopColor: '#ff9800' }]}>
            <Text style={styles.statsIcon}>⏳</Text>
            <Text style={[styles.statsValue, { color: '#ff9800' }]}>{loading ? '--' : stats.pending}</Text>
            <Text style={styles.statsLabel}>Pending</Text>
          </View>
          <View style={[styles.statsCard, { borderTopWidth: 3, borderTopColor: '#1565c0' }]}>
            <Text style={styles.statsIcon}>✅</Text>
            <Text style={[styles.statsValue, { color: '#1565c0' }]}>{loading ? '--' : stats.confirmed}</Text>
            <Text style={styles.statsLabel}>Confirmed</Text>
          </View>
          <View style={[styles.statsCard, { borderTopWidth: 3, borderTopColor: '#4caf50' }]}>
            <Text style={styles.statsIcon}>🚚</Text>
            <Text style={[styles.statsValue, { color: '#4caf50' }]}>{loading ? '--' : stats.delivered}</Text>
            <Text style={styles.statsLabel}>Delivered</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuCard} onPress={() => setShowCreateModal(true)} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#ffebee' }]}>
              <Text style={styles.menuEmoji}>+</Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>New Order</Text>
              <Text style={styles.menuDesc}>Create a new order</Text>
            </View>
            <View style={styles.menuArrow}>
              <Text style={styles.menuArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {onGoToInventory ? (
            <TouchableOpacity style={styles.menuCard} onPress={onGoToInventory} activeOpacity={0.7}>
              <View style={[styles.menuIconBox, { backgroundColor: '#f3e5f5' }]}>
                <Text style={styles.menuEmoji}>📦</Text>
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>Inventory</Text>
                <Text style={styles.menuDesc}>View stock</Text>
              </View>
              <View style={styles.menuArrow}>
                <Text style={styles.menuArrowText}>→</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Order Filters */}
        <Text style={styles.sectionTitle}>Orders</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
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

        {/* Orders List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e53935" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>Create your first order to get started</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreateModal(true)} activeOpacity={0.7}>
              <Text style={styles.emptyBtnText}>+ Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order._id}
              style={styles.orderCard}
              onPress={() => setSelectedOrder(order)}
              activeOpacity={0.7}
            >
              <View style={styles.orderCardHeader}>
                <Text style={styles.orderNumber}>#{order.order_number || order._id?.slice(-6) || '--'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(order.order_status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}>{(order.order_status || 'Pending').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.orderDistributor}>{order.vendor_name || '--'}</Text>
              <View style={styles.orderCardFooter}>
                <Text style={styles.orderItems}>{(order.items || []).length} items</Text>
                <Text style={styles.orderAmount}>Rs. {order.grand_total || 0}</Text>
              </View>
              <Text style={styles.orderDate}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '--'}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB - Create Order */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
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
        onOpenPayment={(order) => {
          setSelectedOrder(null);
          setPaymentOrder(order);
        }}
      />
      <PaymentCreditModal
        visible={!!paymentOrder}
        order={paymentOrder}
        onClose={() => setPaymentOrder(null)}
        onPaymentSuccess={fetchOrders}
        user={user}
      />
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
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileBtnText: {
    color: '#fff',
    fontSize: 16,
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
    paddingBottom: 100,
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

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    marginTop: 20,
    marginBottom: 12,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuEmoji: {
    fontSize: 22,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  menuDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  menuArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuArrowText: {
    fontSize: 16,
    color: '#999',
  },

  // Filter Chips
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterChipActive: {
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Order Card
  orderCard: {
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
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orderDistributor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItems: {
    fontSize: 12,
    color: '#999',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#e53935',
  },
  orderDate: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 6,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  emptyBtn: {
    backgroundColor: '#e53935',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#999',
    marginTop: 10,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
    marginTop: -2,
  },
});
