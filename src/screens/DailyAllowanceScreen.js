import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

var ALLOWANCE_TYPES = [
  { key: 'km', label: 'KM Allowance', icon: '🚗', color: '#4caf50', bg: '#e8f5e9', unit: '/km' },
  { key: 'stay', label: 'Stay Allowance', icon: '🏨', color: '#1565c0', bg: '#e3f2fd', unit: '' },
  { key: 'food', label: 'Food Allowance', icon: '🍽', color: '#ff9800', bg: '#fff3e0', unit: '' },
  { key: 'fare', label: 'Fare Allowance', icon: '🚌', color: '#9c27b0', bg: '#f3e5f5', unit: '' },
];

var DISTRICT_OPTIONS = [
  'Same District',
  'Other District',
];


function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusStyle(status) {
  switch (status) {
    case 'approved': return { color: '#4caf50', bg: '#e8f5e9', label: 'Approved' };
    case 'rejected': return { color: '#e53935', bg: '#ffebee', label: 'Rejected' };
    case 'pending': return { color: '#ff9800', bg: '#fff3e0', label: 'Pending' };
    default: return { color: '#999', bg: '#f5f5f5', label: '--' };
  }
}

export default function DailyAllowanceScreen({ user, onGoBack }) {
  var [showAddModal, setShowAddModal] = useState(false);
  var [history, setHistory] = useState([]);
  var [totalApproved, setTotalApproved] = useState(0);
  var [totalPending, setTotalPending] = useState(0);
  var [loading, setLoading] = useState(true);

  var [selectedDistrict, setSelectedDistrict] = useState('Same District');
  var [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  var [kmStart, setKmStart] = useState('');
  var [kmEnd, setKmEnd] = useState('');
  var [stayAmount, setStayAmount] = useState('');
  var [foodAmount, setFoodAmount] = useState('');
  var [fareAmount, setFareAmount] = useState('');
  var [remarks, setRemarks] = useState('');
  var [submitting, setSubmitting] = useState(false);

  var kmDistance = (kmStart && kmEnd && Number(kmEnd) > Number(kmStart))
    ? Number(kmEnd) - Number(kmStart) : 0;
  var kmAllowance = kmDistance * 5;

  var isOtherDistrict = selectedDistrict === 'Other District';

  var totalAllowance = kmAllowance
    + (isOtherDistrict && stayAmount ? Number(stayAmount) : 0)
    + (foodAmount ? Number(foodAmount) : 0)
    + (isOtherDistrict && fareAmount ? Number(fareAmount) : 0);

  var fetchDailyAllowance = function() {
    var token = user && user.token ? user.token : '';
    setLoading(true);
    fetch(`${BASE_URL}/api/users/daily-allowance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.status === 200) {
          setTotalApproved(data.total_approved_amount || 0);
          setTotalPending(data.total_pending_amount || 0);
          var records = (data.dailyAllowances || []).map(function(item, index) {
            var details = {};
            var total = 0;
            if (item.total_km_price > 0) { details.km = item.total_km_price; total += item.total_km_price; }
            if (item.food > 0) { details.food = item.food; total += item.food; }
            if (item.stay > 0) { details.stay = item.stay; total += item.stay; }
            if (item.other > 0) { details.fare = item.other; total += item.other; }
            if (item.daily > 0) { total += item.daily; }
            return {
              id: item._id || String(index),
              date: new Date(item.date || item.createdAt),
              district: item.total_km > 0 ? item.total_km + ' km' : '--',
              details: details,
              total: total,
              status: item.status || 'pending',
            };
          });
          setHistory(records);
        } else {
          Alert.alert('Error', data.message || 'Failed to fetch daily allowances');
        }
        setLoading(false);
      })
      .catch(function(error) {
        console.error('Error fetching daily allowance:', error);
        Alert.alert('Error', 'Failed to fetch daily allowances');
        setLoading(false);
      });
  };

  useEffect(function() {
    fetchDailyAllowance();
  }, []);

  var resetForm = function() {
    setSelectedDistrict('Same District');
    setKmStart('');
    setKmEnd('');
    setStayAmount('');
    setFoodAmount('');
    setFareAmount('');
    setRemarks('');
  };

  var submitAllowance = function() {
    if (submitting) return;
    if (!kmStart.trim() || !kmEnd.trim()) {
      Alert.alert('Error', 'Please enter KM start and end readings');
      return;
    }
    if (Number(kmEnd) <= Number(kmStart)) {
      Alert.alert('Error', 'KM end reading must be greater than start reading');
      return;
    }
    if (isOtherDistrict && !stayAmount.trim() && !fareAmount.trim()) {
      Alert.alert('Error', 'Please enter stay or fare allowance for other district');
      return;
    }

    setSubmitting(true);
    Alert.alert('Success', 'Daily allowance submitted for approval!');
    setShowAddModal(false);
    resetForm();
    fetchDailyAllowance();
    setSubmitting(false);
  };

  var fullName = user && user.fullName ? user.fullName : 'Employee';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Allowance</Text>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerSubtitle}>{fullName}</Text>

        <View style={styles.headerSummary}>
          <View style={styles.headerSummaryItem}>
            <Text style={styles.headerSummaryValue}>₹{totalApproved}</Text>
            <Text style={styles.headerSummaryLabel}>Approved</Text>
          </View>
          <View style={styles.headerSummaryDivider} />
          <View style={styles.headerSummaryItem}>
            <Text style={[styles.headerSummaryValue, { color: '#ffab40' }]}>₹{totalPending}</Text>
            <Text style={styles.headerSummaryLabel}>Pending</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.allowanceTypesRow}>
          {ALLOWANCE_TYPES.map(function(type) {
            return (
              <View key={type.key} style={[styles.typeCard, { backgroundColor: type.bg }]}>
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text style={[styles.typeLabel, { color: type.color }]}>{type.label}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Recent Claims</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#9c27b0" style={{ marginTop: 30 }} />
        ) : history.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#999', marginTop: 30, fontSize: 14 }}>No allowance records found</Text>
        ) : null}

        {history.map(function(item) {
          var statusInfo = getStatusStyle(item.status);
          return (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                  <Text style={styles.historyDistrict}>{item.district}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
              </View>

              <View style={styles.historyDetails}>
                {item.details.km != null ? (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipIcon}>🚗</Text>
                    <Text style={styles.detailChipText}>₹{item.details.km}</Text>
                  </View>
                ) : null}
                {item.details.stay != null ? (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipIcon}>🏨</Text>
                    <Text style={styles.detailChipText}>₹{item.details.stay}</Text>
                  </View>
                ) : null}
                {item.details.food != null ? (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipIcon}>🍽</Text>
                    <Text style={styles.detailChipText}>₹{item.details.food}</Text>
                  </View>
                ) : null}
                {item.details.fare != null ? (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipIcon}>🚌</Text>
                    <Text style={styles.detailChipText}>₹{item.details.fare}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.historyFooter}>
                <Text style={styles.historyTotal}>Total: ₹{item.total}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add Allowance Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={function() { setShowAddModal(false); resetForm(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Daily Allowance</Text>
                <TouchableOpacity onPress={function() { setShowAddModal(false); resetForm(); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* District Type */}
              <Text style={styles.modalLabel}>District Type</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={function() { setShowDistrictDropdown(true); }}
              >
                <Text style={styles.dropdownBtnText}>{selectedDistrict}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* KM Allowance */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <Text style={styles.sectionCardIcon}>🚗</Text>
                  <Text style={styles.sectionCardTitle}>KM Allowance</Text>
                </View>
                <View style={styles.kmRow}>
                  <View style={styles.kmField}>
                    <Text style={styles.kmFieldLabel}>Start KM</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={kmStart}
                      onChangeText={setKmStart}
                    />
                  </View>
                  <View style={styles.kmField}>
                    <Text style={styles.kmFieldLabel}>End KM</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={kmEnd}
                      onChangeText={setKmEnd}
                    />
                  </View>
                </View>
                <View style={styles.kmSummaryRow}>
                  <Text style={styles.kmSummaryText}>Distance: {kmDistance} km</Text>
                  <Text style={styles.kmSummaryAmount}>₹{kmAllowance} (@₹5/km)</Text>
                </View>
              </View>

              {/* Food Allowance */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <Text style={styles.sectionCardIcon}>🍽</Text>
                  <Text style={styles.sectionCardTitle}>Food Allowance</Text>
                </View>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter food allowance amount"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={foodAmount}
                  onChangeText={setFoodAmount}
                />
              </View>

              {/* Other District Allowances */}
              {isOtherDistrict ? (
                <View>
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionCardHeader}>
                      <Text style={styles.sectionCardIcon}>🏨</Text>
                      <Text style={styles.sectionCardTitle}>Stay Allowance</Text>
                    </View>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter stay allowance amount"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={stayAmount}
                      onChangeText={setStayAmount}
                    />
                  </View>

                  <View style={styles.sectionCard}>
                    <View style={styles.sectionCardHeader}>
                      <Text style={styles.sectionCardIcon}>🚌</Text>
                      <Text style={styles.sectionCardTitle}>Fare Allowance</Text>
                    </View>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter fare allowance amount"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={fareAmount}
                      onChangeText={setFareAmount}
                    />
                  </View>
                </View>
              ) : null}

              {/* Remarks */}
              <Text style={styles.modalLabel}>Remarks (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Add any remarks..."
                placeholderTextColor="#999"
                multiline={true}
                value={remarks}
                onChangeText={setRemarks}
              />

              {/* Total */}
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Allowance</Text>
                <Text style={styles.totalValue}>₹{totalAllowance}</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={submitAllowance}
                activeOpacity={0.8}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>SUBMIT ALLOWANCE</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* District Dropdown Modal */}
      <Modal
        visible={showDistrictDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={function() { setShowDistrictDropdown(false); }}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={function() { setShowDistrictDropdown(false); }}
        >
          <View style={styles.dropdownList}>
            <Text style={styles.dropdownListTitle}>Select District Type</Text>
            {DISTRICT_OPTIONS.map(function(option) {
              var isSelected = option === selectedDistrict;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                  onPress={function() {
                    setSelectedDistrict(option);
                    setShowDistrictDropdown(false);
                    if (option === 'Same District') {
                      setStayAmount('');
                      setFareAmount('');
                    }
                  }}
                >
                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

var screenWidth = Dimensions.get('window').width;

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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  headerSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  headerSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  headerSummaryDivider: {
    width: 1,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
  },
  headerSummaryValue: {
    color: '#69f0ae',
    fontSize: 20,
    fontWeight: '900',
  },
  headerSummaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },
  allowanceTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeCard: {
    width: (screenWidth - 52) / 2,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#9c27b0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#9c27b0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 15,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  historyDistrict: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  detailChipIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  detailChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  historyFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  historyTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  // Modal styles
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
    maxHeight: '90%',
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
  dropdownBtn: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownBtnText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#999',
  },
  sectionCard: {
    backgroundColor: '#fafafa',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionCardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  kmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kmField: {
    flex: 1,
    marginHorizontal: 4,
  },
  kmFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
    marginBottom: 4,
  },
  kmSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  kmSummaryText: {
    fontSize: 13,
    color: '#777',
    fontWeight: '600',
  },
  kmSummaryAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4caf50',
  },
  totalCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 18,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#69f0ae',
  },
  submitBtn: {
    backgroundColor: '#9c27b0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    elevation: 6,
    shadowColor: '#9c27b0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  // Dropdown modal
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: screenWidth - 60,
  },
  dropdownListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 14,
    textAlign: 'center',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#f5f5f7',
  },
  dropdownItemSelected: {
    backgroundColor: '#f3e5f5',
    borderWidth: 1.5,
    borderColor: '#9c27b0',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
  },
  dropdownItemTextSelected: {
    color: '#9c27b0',
    fontWeight: '700',
  },
});
