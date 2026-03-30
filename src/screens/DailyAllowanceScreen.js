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
import { useTheme } from '../theme/ThemeContext';

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

function getStatusStyle(status, theme) {
  switch (status) {
    case 'approved': return { color: theme.success, bg: theme.successBg, label: 'Approved', icon: '\u2713' };
    case 'rejected': return { color: theme.error, bg: theme.errorBg, label: 'Rejected', icon: '\u2717' };
    case 'pending': return { color: theme.warning, bg: theme.warningBg, label: 'Pending', icon: '\u25CF' };
    default: return { color: theme.textTertiary, bg: theme.background, label: '--', icon: '' };
  }
}

export default function DailyAllowanceScreen({ user, onGoBack }) {
  var { theme } = useTheme();

  var ALLOWANCE_TYPES = [
    { key: 'km', label: 'KM Allowance', icon: '\uD83D\uDE97', color: theme.success, bg: theme.successBg, unit: '/km' },
    { key: 'stay', label: 'Stay Allowance', icon: '\uD83C\uDFE8', color: theme.info, bg: theme.infoBg, unit: '' },
    { key: 'food', label: 'Food Allowance', icon: '\uD83C\uDF7D', color: theme.warning, bg: theme.warningBg, unit: '' },
    { key: 'fare', label: 'Fare Allowance', icon: '\uD83D\uDE8C', color: theme.secondary, bg: theme.surfaceVariant, unit: '' },
  ];

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
  var avatarLetter = fullName.charAt(0).toUpperCase();

  var screenWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* ===== HEADER ===== */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={[styles.decorCircle3, { backgroundColor: theme.secondary + '26' }]} />

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack}>
            <Text style={styles.backArrow}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Allowance</Text>
          <View style={[styles.avatar, { backgroundColor: theme.secondary }]}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>{fullName}</Text>

        <View style={styles.headerSummary}>
          <View style={styles.headerSummaryItem}>
            <Text style={[styles.headerSummaryValue, { color: theme.success }]}>{'\u20B9'}{totalApproved}</Text>
            <Text style={styles.headerSummaryLabel}>APPROVED</Text>
          </View>
          <View style={styles.headerSummaryDivider} />
          <View style={styles.headerSummaryItem}>
            <Text style={[styles.headerSummaryValue, { color: theme.warning }]}>{'\u20B9'}{totalPending}</Text>
            <Text style={styles.headerSummaryLabel}>PENDING</Text>
          </View>
        </View>
      </View>

      {/* ===== BODY ===== */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          {ALLOWANCE_TYPES.map(function(type) {
            return (
              <View key={type.key} style={[styles.statsCard, { backgroundColor: theme.surface, width: (screenWidth - 52) / 2 }]}>
                <View style={[styles.statsIconCircle, { backgroundColor: type.bg }]}>
                  <Text style={styles.statsIconText}>{type.icon}</Text>
                </View>
                <Text style={[styles.statsLabel, { color: type.color }]}>{type.label.toUpperCase()}</Text>
              </View>
            );
          })}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Claims</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.secondary} style={{ marginTop: 30 }} />
        ) : history.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: theme.warningBg }]}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDCCB'}</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Claims Yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>Your allowance records will appear here</Text>
          </View>
        ) : null}

        {history.map(function(item) {
          var statusInfo = getStatusStyle(item.status, theme);
          return (
            <View key={item.id} style={[styles.historyCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.cardAccent, { backgroundColor: statusInfo.color }]} />
              <View style={styles.historyInner}>
                <View style={styles.historyHeader}>
                  <View>
                    <Text style={[styles.historyDate, { color: theme.text }]}>{formatDate(item.date)}</Text>
                    <Text style={[styles.historyDistrict, { color: theme.textTertiary }]}>{item.district}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusChipDot, { color: statusInfo.color }]}>{statusInfo.icon}</Text>
                    <Text style={[styles.statusChipText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.historyDetails}>
                  {item.details.km != null ? (
                    <View style={[styles.detailChip, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={styles.detailChipIcon}>{'\uD83D\uDE97'}</Text>
                      <Text style={[styles.detailChipText, { color: theme.textSecondary }]}>{'\u20B9'}{item.details.km}</Text>
                    </View>
                  ) : null}
                  {item.details.stay != null ? (
                    <View style={[styles.detailChip, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={styles.detailChipIcon}>{'\uD83C\uDFE8'}</Text>
                      <Text style={[styles.detailChipText, { color: theme.textSecondary }]}>{'\u20B9'}{item.details.stay}</Text>
                    </View>
                  ) : null}
                  {item.details.food != null ? (
                    <View style={[styles.detailChip, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={styles.detailChipIcon}>{'\uD83C\uDF7D'}</Text>
                      <Text style={[styles.detailChipText, { color: theme.textSecondary }]}>{'\u20B9'}{item.details.food}</Text>
                    </View>
                  ) : null}
                  {item.details.fare != null ? (
                    <View style={[styles.detailChip, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={styles.detailChipIcon}>{'\uD83D\uDE8C'}</Text>
                      <Text style={[styles.detailChipText, { color: theme.textSecondary }]}>{'\u20B9'}{item.details.fare}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.historyFooter, { borderTopColor: theme.divider }]}>
                  <Text style={[styles.historyTotal, { color: theme.primary }]}>Total: {'\u20B9'}{item.total}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ===== ADD ALLOWANCE MODAL ===== */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={function() { setShowAddModal(false); resetForm(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.primary }]}>Add Daily Allowance</Text>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceVariant }]}
                  onPress={function() { setShowAddModal(false); resetForm(); }}
                >
                  <Text style={[styles.modalCloseText, { color: theme.textTertiary }]}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>

              {/* District Type */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>District Type</Text>
              <TouchableOpacity
                style={[styles.dropdownBtn, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
                onPress={function() { setShowDistrictDropdown(true); }}
              >
                <Text style={styles.inputIcon}>{'\uD83D\uDCCD'}</Text>
                <Text style={[styles.dropdownBtnText, { color: theme.text }]}>{selectedDistrict}</Text>
                <Text style={[styles.dropdownArrow, { color: theme.textTertiary }]}>{'\u25BC'}</Text>
              </TouchableOpacity>

              {/* KM Allowance */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]}>
                <View style={styles.sectionCardHeader}>
                  <View style={[styles.sectionCardIconCircle, { backgroundColor: theme.successBg }]}>
                    <Text style={styles.sectionCardIcon}>{'\uD83D\uDE97'}</Text>
                  </View>
                  <Text style={[styles.sectionCardTitle, { color: theme.text }]}>KM Allowance</Text>
                </View>
                <View style={styles.kmRow}>
                  <View style={styles.kmField}>
                    <Text style={[styles.kmFieldLabel, { color: theme.textSecondary }]}>Start KM</Text>
                    <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                      <Text style={styles.inputIcon}>{'\uD83D\uDCCF'}</Text>
                      <TextInput
                        style={[styles.modalInputInner, { color: theme.inputText }]}
                        placeholder="0"
                        placeholderTextColor={theme.placeholder}
                        keyboardType="numeric"
                        value={kmStart}
                        onChangeText={setKmStart}
                      />
                    </View>
                  </View>
                  <View style={styles.kmField}>
                    <Text style={[styles.kmFieldLabel, { color: theme.textSecondary }]}>End KM</Text>
                    <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                      <Text style={styles.inputIcon}>{'\uD83C\uDFC1'}</Text>
                      <TextInput
                        style={[styles.modalInputInner, { color: theme.inputText }]}
                        placeholder="0"
                        placeholderTextColor={theme.placeholder}
                        keyboardType="numeric"
                        value={kmEnd}
                        onChangeText={setKmEnd}
                      />
                    </View>
                  </View>
                </View>
                <View style={[styles.kmSummaryRow, { borderTopColor: theme.divider }]}>
                  <Text style={[styles.kmSummaryText, { color: theme.textSecondary }]}>Distance: {kmDistance} km</Text>
                  <Text style={[styles.kmSummaryAmount, { color: theme.success }]}>{'\u20B9'}{kmAllowance} (@{'\u20B9'}5/km)</Text>
                </View>
              </View>

              {/* Food Allowance */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]}>
                <View style={styles.sectionCardHeader}>
                  <View style={[styles.sectionCardIconCircle, { backgroundColor: theme.warningBg }]}>
                    <Text style={styles.sectionCardIcon}>{'\uD83C\uDF7D'}</Text>
                  </View>
                  <Text style={[styles.sectionCardTitle, { color: theme.text }]}>Food Allowance</Text>
                </View>
                <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <Text style={styles.inputIcon}>{'\u20B9'}</Text>
                  <TextInput
                    style={[styles.modalInputInner, { color: theme.inputText }]}
                    placeholder="Enter food allowance amount"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="numeric"
                    value={foodAmount}
                    onChangeText={setFoodAmount}
                  />
                </View>
              </View>

              {/* Other District Allowances */}
              {isOtherDistrict ? (
                <View>
                  <View style={[styles.sectionCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]}>
                    <View style={styles.sectionCardHeader}>
                      <View style={[styles.sectionCardIconCircle, { backgroundColor: theme.infoBg }]}>
                        <Text style={styles.sectionCardIcon}>{'\uD83C\uDFE8'}</Text>
                      </View>
                      <Text style={[styles.sectionCardTitle, { color: theme.text }]}>Stay Allowance</Text>
                    </View>
                    <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                      <Text style={styles.inputIcon}>{'\u20B9'}</Text>
                      <TextInput
                        style={[styles.modalInputInner, { color: theme.inputText }]}
                        placeholder="Enter stay allowance amount"
                        placeholderTextColor={theme.placeholder}
                        keyboardType="numeric"
                        value={stayAmount}
                        onChangeText={setStayAmount}
                      />
                    </View>
                  </View>

                  <View style={[styles.sectionCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.divider }]}>
                    <View style={styles.sectionCardHeader}>
                      <View style={[styles.sectionCardIconCircle, { backgroundColor: theme.surfaceVariant }]}>
                        <Text style={styles.sectionCardIcon}>{'\uD83D\uDE8C'}</Text>
                      </View>
                      <Text style={[styles.sectionCardTitle, { color: theme.text }]}>Fare Allowance</Text>
                    </View>
                    <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                      <Text style={styles.inputIcon}>{'\u20B9'}</Text>
                      <TextInput
                        style={[styles.modalInputInner, { color: theme.inputText }]}
                        placeholder="Enter fare allowance amount"
                        placeholderTextColor={theme.placeholder}
                        keyboardType="numeric"
                        value={fareAmount}
                        onChangeText={setFareAmount}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Remarks */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Remarks (Optional)</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, alignItems: 'flex-start' }]}>
                <Text style={[styles.inputIcon, { marginTop: 14 }]}>{'\uD83D\uDCDD'}</Text>
                <TextInput
                  style={[styles.modalInputInner, { color: theme.inputText, height: 70, textAlignVertical: 'top' }]}
                  placeholder="Add any remarks..."
                  placeholderTextColor={theme.placeholder}
                  multiline={true}
                  value={remarks}
                  onChangeText={setRemarks}
                />
              </View>

              {/* Total */}
              <View style={[styles.totalCard, { backgroundColor: theme.primary }]}>
                <Text style={styles.totalLabel}>Total Allowance</Text>
                <Text style={styles.totalValue}>{'\u20B9'}{totalAllowance}</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.secondary, shadowColor: theme.secondary }, submitting && { opacity: 0.7 }]}
                onPress={submitAllowance}
                activeOpacity={0.8}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.buttonText} />
                ) : (
                  <Text style={[styles.submitBtnText, { color: theme.buttonText }]}>SUBMIT ALLOWANCE</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== DISTRICT DROPDOWN MODAL ===== */}
      <Modal
        visible={showDistrictDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={function() { setShowDistrictDropdown(false); }}
      >
        <TouchableOpacity
          style={[styles.dropdownOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={function() { setShowDistrictDropdown(false); }}
        >
          <View style={[styles.dropdownList, { backgroundColor: theme.surface, width: screenWidth - 60 }]}>
            <Text style={[styles.dropdownListTitle, { color: theme.primary }]}>Select District Type</Text>
            {DISTRICT_OPTIONS.map(function(option) {
              var isSelected = option === selectedDistrict;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownItem,
                    { backgroundColor: theme.background },
                    isSelected && { backgroundColor: theme.surfaceVariant, borderWidth: 1.5, borderColor: theme.secondary },
                  ]}
                  onPress={function() {
                    setSelectedDistrict(option);
                    setShowDistrictDropdown(false);
                    if (option === 'Same District') {
                      setStayAmount('');
                      setFareAmount('');
                    }
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    { color: theme.textSecondary },
                    isSelected && { color: theme.secondary, fontWeight: '700' },
                  ]}>
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

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ---- Header ---- */
  header: {
    paddingTop: 50,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 70,
    left: -40,
  },
  decorCircle3: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    bottom: -120,
    right: -60,
  },

  /* ---- Nav Row ---- */
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  headerSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  headerSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  headerSummaryDivider: {
    width: 1,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  headerSummaryValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  headerSummaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },

  /* ---- Body ---- */
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 80,
  },

  /* ---- Stats Cards ---- */
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsIconText: {
    fontSize: 18,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  /* ---- Section Header ---- */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  /* ---- Empty State ---- */
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* ---- History Card ---- */
  historyCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
  },
  historyInner: {
    flex: 1,
    padding: 16,
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
  },
  historyDistrict: {
    fontSize: 12,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusChipDot: {
    fontSize: 10,
    marginRight: 5,
  },
  statusChipText: {
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
  },
  historyFooter: {
    borderTopWidth: 1,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  historyTotal: {
    fontSize: 16,
    fontWeight: '800',
  },

  /* ---- Modal ---- */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },

  /* ---- Inputs ---- */
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modalInputInner: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 13,
  },

  /* ---- Dropdown ---- */
  dropdownBtn: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 12,
  },

  /* ---- Section Card (modal) ---- */
  sectionCard: {
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionCardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionCardIcon: {
    fontSize: 18,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
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
    marginBottom: 4,
  },
  kmSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  kmSummaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  kmSummaryAmount: {
    fontSize: 15,
    fontWeight: '800',
  },

  /* ---- Total Card ---- */
  totalCard: {
    borderRadius: 16,
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
    color: '#fff',
  },

  /* ---- Submit Button ---- */
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* ---- Dropdown Modal ---- */
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownList: {
    borderRadius: 24,
    padding: 20,
  },
  dropdownListTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
