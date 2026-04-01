import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function ProfileScreen({ user, onGoBack, onLogout }) {
  const { theme, isDark, toggleTheme, fonts } = useTheme();

  const fullName = user && user.fullName ? user.fullName : 'Employee';
  const email = user && user.email ? user.email : '--';
  const designation = user && user.designation ? user.designation : '--';
  const phone = user && user.phone ? user.phone : '--';
  const headquarter = user && user.headquarter ? user.headquarter : '--';
  const profileImage = user && user.profile_image ? user.profile_image : '';

  const firstLetter = fullName.charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[theme.gradient1, theme.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={[styles.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

        <View style={styles.headerNav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={onGoBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>My Profile</Text>

          <View style={styles.navBtnPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card (overlaps header) ── */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarLetter}>{firstLetter}</Text>
            </View>
          )}
          <Text style={[styles.profileName, { color: theme.text }]}>{fullName}</Text>
        </View>

        {/* ── Personal Information ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="person" size={20} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>FULL NAME</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{fullName}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="email-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>EMAIL</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{email}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Feather name="phone" size={20} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>PHONE</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* ── Work Information ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: theme.secondary }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Work Information</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="briefcase-outline" size={20} color={theme.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>DESIGNATION</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{designation}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="office-building" size={20} color={theme.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>HEADQUARTER</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{headquarter}</Text>
            </View>
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: theme.accent }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="color-palette-outline" size={20} color={theme.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>THEME</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: isDark ? theme.surfaceVariant : theme.surfaceVariant }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              {isDark ? (
                <Ionicons name="sunny" size={20} color="#F59E0B" />
              ) : (
                <Ionicons name="moon" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity onPress={onLogout} activeOpacity={0.8}>
          <LinearGradient
            colors={[theme.error, '#FF6B6B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutBtnText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Header ── */
  header: {
    paddingTop: 52,
    paddingBottom: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 1,
  },
  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -40,
    right: -30,
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -20,
    left: -30,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    marginTop: -2,
  },
  navBtnPlaceholder: {
    width: 38,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: 0.3,
  },

  /* ── Scroll ── */
  scrollView: {
    flex: 1,
    marginTop: -35,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },

  /* ── Profile Card ── */
  profileCard: {
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 14,
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 40,
    fontFamily: 'Poppins-Black',
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },

  /* ── Section Header ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.2,
  },

  /* ── Info Card ── */
  infoCard: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 22,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  infoIconWrap: {
    width: 28,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  divider: {
    height: 1,
    marginLeft: 42,
  },

  /* ── Theme Toggle ── */
  themeToggle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleIcon: {
    fontSize: 20,
  },

  /* ── Logout ── */
  logoutBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: 1,
  },

  bottomSpacer: {
    height: 40,
  },
});
