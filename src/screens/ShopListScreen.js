import React, { useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
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
  const [filterCity, setFilterCity] = useState('all');

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const token = user && user.token ? user.token : '';
      const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const response = await fetch(`${BASE_URL}/api/admin/shops`, { headers });
      const result = await response.json();
      if ((result.status === 200 || response.ok) && result.data) {
        setShops(result.data);
      } else {
        setShops([]);
      }
    } catch (e) {
      console.log('Shops fetch error:', e);
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShops().finally(() => setRefreshing(false));
  }, []);

  // Get unique cities for filter
  const cities = ['all', ...new Set(shops.map(s => s.city).filter(Boolean))];

  // Filter and search
  const filteredShops = shops.filter(shop => {
    const matchesCity = filterCity === 'all' || (shop.city || '').toLowerCase() === filterCity.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      (shop.shop_name || '').toLowerCase().includes(query) ||
      (shop.shop_mobile || '').toLowerCase().includes(query) ||
      (shop.shop_address || '').toLowerCase().includes(query) ||
      (shop.city || '').toLowerCase().includes(query) ||
      (shop.state || '').toLowerCase().includes(query);
    return matchesCity && matchesSearch;
  });

  const handleCall = (mobile) => {
    if (mobile) {
      Linking.openURL(`tel:${mobile}`);
    }
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
            <TouchableOpacity
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}
              onPress={onGoBack}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>{'<'}</Text>
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>Shops</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{loading ? '...' : `${filteredShops.length} shops found`}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{shops.length}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Total</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{cities.length - 1}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Cities</Text>
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

      {/* City Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, paddingHorizontal: 16, maxHeight: 44 }} contentContainerStyle={{ alignItems: 'center' }}>
        {cities.map((city) => (
          <TouchableOpacity
            key={city}
            style={[{
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 20,
              backgroundColor: theme.surface,
              marginRight: 8,
              borderWidth: 1,
              borderColor: theme.divider,
            },
            filterCity === city && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setFilterCity(city)}
            activeOpacity={0.7}
          >
            <Text style={[{
              fontSize: 13,
              fontWeight: '600',
              color: theme.textSecondary,
            },
            filterCity === city && { color: theme.buttonText }
            ]}>{city === 'all' ? 'All Cities' : city}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Shop List */}
      <ScrollView
        style={{ flex: 1, marginTop: 10 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
      >
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 10 }}>Loading shops...</Text>
          </View>
        ) : filteredShops.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: theme.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 32 }}>🏪</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>No Shops Found</Text>
            <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 6 }}>
              {searchQuery ? 'Try a different search term' : 'No shops available'}
            </Text>
          </View>
        ) : (
          filteredShops.map((shop) => (
            <View
              key={shop._id}
              style={{
                backgroundColor: theme.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                borderLeftWidth: 4,
                borderLeftColor: theme.info,
              }}
            >
              {/* Shop Name & City Badge */}
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
                {shop.city ? (
                  <View style={{ backgroundColor: theme.infoBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.info }}>{shop.city}</Text>
                  </View>
                ) : null}
              </View>

              {/* Address */}
              {shop.shop_address ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, marginRight: 6 }}>📍</Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={2}>{shop.shop_address}</Text>
                </View>
              ) : null}

              {/* State */}
              {shop.state ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, marginRight: 6 }}>🗺️</Text>
                  <Text style={{ fontSize: 12, color: theme.textTertiary }}>{shop.state}</Text>
                </View>
              ) : null}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: theme.divider, marginVertical: 8 }} />

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                {shop.shop_mobile ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.success + '18',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 12,
                    }}
                    onPress={() => handleCall(shop.shop_mobile)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, marginRight: 6 }}>📞</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.success }}>Call</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
