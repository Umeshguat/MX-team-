import { Platform, StatusBar } from 'react-native';

// Device-safe top inset for screen headers.
// Android (edge-to-edge in SDK 55+): real status-bar / notch height.
// iOS: typical notch safe area.
export const SAFE_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 47;

// Bottom padding for scroll content so the last items clear
// bottom nav bars / gesture areas on every phone.
export const SCROLL_BOTTOM = 110;
