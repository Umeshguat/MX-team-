import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL } from '../config';
import BackButton from '../components/BackButton';
import { useTheme } from '../theme/ThemeContext';

const PAGE_LIMIT = 10;

export default function SalesListScreen({ user, onGoBack }) {
  const { theme, isDark } = useTheme();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSales = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const url = `${BASE_URL}/api/deliveries/sales/list?page=${pageNum}&limit=${PAGE_LIMIT}`;
      const response = await fetch(url, { headers });
      const result = await response.json();
      const list = result.sales || result.data || [];
      const safeList = Array.isArray(list) ? list : [];
      setSales((prev) => (append ? [...prev, ...safeList] : safeList));
      setPage(result.page || pageNum);
      setTotalPages(result.totalPages || 1);
    } catch (e) {
      console.log('Sales fetch error:', e);
      if (!append) setSales([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user, refreshing]);

  useEffect(() => {
    fetchSales(1, false);
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSales(1, false);
  };

  const onEndReached = () => {
    if (loadingMore || loading) return;
    if (page >= totalPages) return;
    fetchSales(page + 1, true);
  };

  const filtered = sales.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (s.full_name || s.name || s.employee_name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const mobile = (s.phone_number || s.mobile || s.phone || '').toString().toLowerCase();
    const hq = (s.headquarter_name || '').toLowerCase();
    return name.includes(q) || email.includes(q) || mobile.includes(q) || hq.includes(q);
  });

  const renderItem = ({ item }) => (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
        {item.full_name || item.name || item.employee_name || 'Unnamed'}
      </Text>
      {item.email ? (
        <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 4 }}>{item.email}</Text>
      ) : null}
      {item.phone_number || item.mobile || item.phone ? (
        <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>
          {item.phone_number || item.mobile || item.phone}
        </Text>
      ) : null}
      {item.headquarter_name ? (
        <Text style={{ fontSize: 11, color: theme.primary, marginTop: 6, fontWeight: '600' }}>
          {item.headquarter_name}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.primary, theme.primaryDark || theme.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <BackButton onPress={onGoBack} color={theme.buttonText} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.buttonText, marginLeft: 12 }}>
            Sales Team
          </Text>
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search sales..."
          placeholderTextColor={theme.textTertiary}
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: theme.text,
            fontSize: 14,
          }}
        />
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => (item._id || item.id || String(idx))}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Text style={{ fontSize: 14, color: theme.textTertiary }}>No sales found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
