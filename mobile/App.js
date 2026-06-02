import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, Platform, Vibration, BackHandler, ToastAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('commove-alerts', {
      name: 'Commove Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8b5cf6',
    });
  }
}

async function requestNativePermissions() {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

async function getPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'prompt';
}

export default function App() {
  const WEB_URL = 'https://commove.vercel.app/';
  const webviewRef = useRef(null);
  const backPressedOnceRef = useRef(false);

  const postToWebView = (data) => {
    if (webviewRef.current) {
      const escaped = JSON.stringify(data).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      webviewRef.current.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: '${escaped}' })); true;`);
    }
  };

  useEffect(() => { setupAndroidChannel(); }, []);

  // Intercept Android hardware back button — delegate decision to the web app
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(
          `if (typeof window.__commoveHandleBack === 'function') { window.__commoveHandleBack(); } true;`
        );
      }
      return true; // always intercept; web app calls BACK_AT_ROOT when it wants to exit
    });
    return () => subscription.remove();
  }, []);

  const handleWebViewMessage = async (event) => {
    let data;
    try { data = JSON.parse(event.nativeEvent.data); } catch { return; }

    switch (data?.type) {
      case 'GET_NOTIFICATION_STATUS': {
        const status = await getPermissionStatus();
        postToWebView({ type: 'INITIAL_NOTIFICATION_STATUS', status });
        break;
      }
      case 'REQUEST_NOTIFICATION_PERMISSION': {
        const granted = await requestNativePermissions();
        postToWebView({ type: 'NOTIFICATION_PERMISSION_RESULT', granted });
        break;
      }
      case 'SEND_NOTIFICATION': {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: data.title || 'Commove',
              body: data.body || 'You have a new notification.',
              sound: true,
              android: { channelId: 'commove-alerts' },
            },
            trigger: null,
          });
        } catch (e) { console.warn('[Commove] scheduleNotification failed:', e); }
        break;
      }
      case 'VIBRATE': {
        try {
          if (Platform.OS === 'ios') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            Vibration.vibrate(Array.isArray(data.pattern) ? data.pattern : [0, 200]);
          }
        } catch (e) { console.warn('[Commove] Haptic/vibrate failed:', e); }
        break;
      }
      case 'BACK_AT_ROOT': {
        // Double-press to exit, matching standard Android UX
        if (backPressedOnceRef.current) {
          BackHandler.exitApp();
        } else {
          backPressedOnceRef.current = true;
          if (Platform.OS === 'android') {
            ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          }
          setTimeout(() => { backPressedOnceRef.current = false; }, 2000);
        }
        break;
      }
      default: break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <WebView
        ref={webviewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        geolocationEnabled={true}
        allowFileAccess={true}
        mediaPlaybackRequiresUserAction={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        injectedJavaScriptBeforeContentLoaded={`window.__commoveNative = true; true;`}
        onMessage={handleWebViewMessage}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  webview: { flex: 1 },
  loadingContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827',
  },
});
