import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import BackButton from '../components/BackButton';
import EmployeeDetailModal from '../components/EmployeeDetailModal';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function ShopListScreen({ user, onGoBack }) {
  const { theme, isDark } = useTheme();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailEmployeeId, setDetailEmployeeId] = useState(null);

  const openShopDetail = (shop) => {
    const empId =
      shop.created_by ||
      shop.added_by ||
      shop.salesman_id ||
      shop.employee_id ||
      shop.user_id ||
      (shop.salesman && (shop.salesman._id || shop.salesman)) ||
      (shop.created_by_id && (shop.created_by_id._id || shop.created_by_id));
    if (!empId) return;
    setDetailEmployeeId(empId);
    setDetailVisible(true);
  };

  const fetchShops = async (pageNum = 1, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const token = user && user.token ? user.token : '';
      console.log('Shop API user object:', JSON.stringify(user));
      console.log('Shop API Token Value:', token);
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const url = `${BASE_URL}/api/shops/list?page=${pageNum}&limit=10`;
      console.log('Shop API URL:', url);
      console.log('Shop API Headers:', JSON.stringify(headers));
      const response = await fetch(url, { headers });
      const result = await response.json();
      console.log('Shop API Status Code:', response.status);
      console.log('Shop API Response:', JSON.stringify(result));

      if ((result.status === 200 || response.ok) && result.data) {
        console.log('Shop API Data Count:', result.data.length);
      } else {
        console.log('Shop API Failed - response.ok:', response.ok, 'result.status:', result.status);
      }

      if ((result.status === 200 || response.ok) && result.data) {
        if (reset) {
          setShops(result.data);
        } else {
          setShops(prev => [...prev, ...result.data]);
        }
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages || 1);
          setTotal(result.pagination.total || 0);
        }
        setPage(pageNum);
      } else {
        if (reset) setShops([]);
      }
    } catch (e) {
      console.log('Shops fetch error:', e);
      if (reset) setShops([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user && user.token) {
      fetchShops(1, true);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShops(1, true).finally(() => setRefreshing(false));
  }, []);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchShops(page + 1, false);
  };

  // Filter and search (client-side on loaded data)
  const filteredShops = shops.filter(shop => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (shop.shop_name || '').toLowerCase().includes(query) ||
      (shop.shop_mobile || '').toLowerCase().includes(query) ||
      (shop.shop_address || '').toLowerCase().includes(query) ||
      (shop.city || '').toLowerCase().includes(query) ||
      (shop.state || '').toLowerCase().includes(query)
    );
  });

  const handleCall = (mobile) => {
    if (mobile) {
      Linking.openURL(`tel:${mobile}`);
    }
  };

  const renderShopCard = ({ item: shop }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => openShopDetail(shop)}
      style={{
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        borderLeftWidth: 4,
        borderLeftColor: theme.info,
      }}
    >
      {/* Shop Name, City Badge & Call */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.info + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 20 }}>🏪</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }} numberOfLines={1}>{shop.shop_name || '--'}</Text>
            {shop.shop_mobile ? (
              <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>{shop.shop_mobile}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {shop.shop_mobile ? (
            <TouchableOpacity
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: theme.success + '18',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => handleCall(shop.shop_mobile)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14 }}>📞</Text>
            </TouchableOpacity>
          ) : null}
          {shop.city ? (
            <View style={{ backgroundColor: theme.infoBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.info }}>{shop.city}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Address */}
      {shop.shop_address ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, marginRight: 6 }}>📍</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={2}>{shop.shop_address}</Text>
        </View>
      ) : null}

      {/* State & Pincode */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {shop.state ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <Text style={{ fontSize: 13, marginRight: 6 }}>🗺️</Text>
            <Text style={{ fontSize: 12, color: theme.textTertiary }}>{shop.state}</Text>
          </View>
        ) : null}
        {shop.pincode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, marginRight: 6 }}>📮</Text>
            <Text style={{ fontSize: 12, color: theme.textTertiary }}>{shop.pincode}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 6 }}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 32 }}>🏪</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>No Shops Found</Text>
        <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 6 }}>
          {searchQuery ? 'Try a different search term' : 'No shops available'}
        </Text>
      </View>
    );
  };

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

        {/* Nav Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          {onGoBack ? (
            <BackButton onPress={onGoBack} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>Shops</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{loading ? '...' : `${total} shops found`}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{total}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Total</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{page}/{totalPages}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Page</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={{ marginHorizontal: 16, marginTop: -18, zIndex: 10 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.surface,
          borderRadius: 16,
          paddingHorizontal: 14,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
        }}>
          <Text style={{ fontSize: 18, marginRight: 10 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, paddingVertical: 14, fontSize: 14, color: theme.text }}
            placeholder="Search by name, mobile, city..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Text style={{ fontSize: 18, color: theme.textTertiary }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Shop List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 10 }}>Loading shops...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={(item) => item._id}
          renderItem={renderShopCard}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}

      <EmployeeDetailModal
        visible={detailVisible}
        employeeId={detailEmployeeId}
        token={user && user.token}
        onClose={() => setDetailVisible(false)}
      />
    </View>
  );
}
