import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Image,
  BackHandler,
  Platform,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as ScreenCapture from 'expo-screen-capture';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const WEBSITE_URL = 'https://tradenexustradesmart.co.in';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configure Android Notification Channel for high-priority display and sound
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Trade Nexus Updates',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00C9A7',
    sound: 'default',
  });
}

const RNWebView = WebView as any;

function MainAppShell() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const pushTokenRef = useRef<string>('');

  // Handle hardware Android back button
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [canGoBack]);

  // Seamless Background-to-Foreground Resume Listener
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && webViewRef.current) {
        console.log('[AppState Active] Returning to foreground, notifying webview...');
        webViewRef.current.injectJavaScript(`
          if (window.__triggerTradeNexusResume) {
            window.__triggerTradeNexusResume();
          }
          if (window.__setPushToken && '${pushTokenRef.current}') {
            window.__setPushToken('${pushTokenRef.current}');
          }
          true;
        `);
      }
    });
    return () => sub.remove();
  }, []);

  // Push Notifications Setup & Deep-Linking Listener
  useEffect(() => {
    async function registerForPush() {
      if (!Device.isDevice) return;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('[Push] Permission not granted');
          return;
        }
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        const token = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        console.log('[Push] Device Push Token:', token.data);
        if (token?.data) {
          pushTokenRef.current = token.data;
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (window.__setPushToken) {
                window.__setPushToken('${token.data}');
              }
              true;
            `);
          }
        }
      } catch (err: any) {
        console.warn('[Push] Registration error:', err.message);
      }
    }
    registerForPush();

    // Notification tap listener -> deep-link into specific tab/record
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.targetTab && webViewRef.current) {
        const js = `
          if (window.__switchTradeNexusTab) {
            window.__switchTradeNexusTab('${data.targetTab}', '${data.recordId || ''}');
          } else {
            localStorage.setItem('tnx_activeTab', '${data.targetTab}');
            window.location.reload();
          }
          true;
        `;
        webViewRef.current.injectJavaScript(js);
      }
    });

    return () => responseSub.remove();
  }, []);

  // Injected JavaScript to monitor navigation, role state, and screen security
  const injectedBridgeScript = `
    (function() {
      var lastSecState = null;

      function monitorSecurityAndState() {
        try {
          var role = localStorage.getItem('tnx_currentRole') || '';
          var activeTab = localStorage.getItem('tnx_activeTab') || 'home';
          
          var isRestrictedRole = (role === 'telecaller' || role === 'team_leader' || role === 'employee');
          var isLeadsPage = (activeTab === 'calling');

          var shouldSecure = isRestrictedRole && isLeadsPage;
          if (shouldSecure !== lastSecState) {
            lastSecState = shouldSecure;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SET_SCREEN_SECURITY',
                secure: shouldSecure,
                role: role,
                tab: activeTab
              }));
            }
          }
        } catch(e) {}
      }

      // Initial check & interval monitor
      monitorSecurityAndState();
      window.addEventListener('storage', monitorSecurityAndState);
      setInterval(monitorSecurityAndState, 800);
    })();
    true;
  `;

  // Message Handler for React Native WebView Bridge
  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // 1. Native Direct File Download (Direct to Device Downloads Folder)
      if (data.type === 'DOWNLOAD_FILE') {
        try {
          const filename = data.filename || `TradeNexus_Doc_${Date.now()}.pdf`;
          const mimeType = data.mimeType || 'application/pdf';

          if (Platform.OS === 'android') {
            try {
              let safDirUri = await AsyncStorage.getItem('saf_downloads_dir');
              if (!safDirUri) {
                // Prompt user to pick/grant permission to their Downloads directory
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                  safDirUri = permissions.directoryUri;
                  await AsyncStorage.setItem('saf_downloads_dir', safDirUri);
                }
              }

              if (safDirUri) {
                const targetFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                  safDirUri,
                  filename,
                  mimeType
                );
                await FileSystem.writeAsStringAsync(targetFileUri, data.base64, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                Alert.alert(
                  'Download Complete',
                  `"${filename}" has been saved successfully to your device storage.`
                );
                return;
              }
            } catch (safErr: any) {
              console.warn('[SAF] StorageAccessFramework write failed, using sharing fallback:', safErr.message);
            }
          }

          // Fallback if permission was not granted or on other platforms: save to documentDirectory & share
          const fileUri = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, data.base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType,
              dialogTitle: `Save ${filename}`,
              UTI: 'com.adobe.pdf',
            });
          }
        } catch (err: any) {
          Alert.alert('Download Error', `Could not save file: ${err.message}`);
        }
        return;
      }

      // 2. Dynamic FLAG_SECURE: Leads Screen Screenshot & Recording Protection
      if (data.type === 'SET_SCREEN_SECURITY') {
        try {
          if (data.secure) {
            await ScreenCapture.preventScreenCaptureAsync();
            console.log('[Security] FLAG_SECURE ACTIVATED for Leads screen');
          } else {
            await ScreenCapture.allowScreenCaptureAsync();
            console.log('[Security] FLAG_SECURE DEACTIVATED');
          }
        } catch (err: any) {
          console.warn('[Security] ScreenCapture error:', err.message);
        }
        return;
      }

      // 3. Local & In-App Notification Trigger (plays buzzer + shows system notification)
      if (data.type === 'TRIGGER_NOTIFICATION') {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: data.title || 'Trade Nexus Alert',
              body: data.body || '',
              data: {
                targetTab: data.targetTab || 'home',
                recordId: data.recordId,
              },
              sound: 'default',
              channelId: 'default',
            },
            trigger: null,
          });
        } catch (err: any) {
          console.warn('[Notification] Trigger error:', err.message);
        }
        return;
      }
    } catch {
      // Non-json message
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          // Safe Area Insets: Clean padding gap avoiding status bar at top and gesture navigation at bottom
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom - 6, 4),
        },
      ]}
    >
      <StatusBar style="light" />

      <RNWebView
        ref={webViewRef}
        source={{ uri: WEBSITE_URL }}
        style={styles.webView}
        // Essential hardware & mobile capabilities
        overScrollMode="never"
        geolocationEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        injectedJavaScript={injectedBridgeScript}
        onMessage={handleMessage}
        onNavigationStateChange={(navState: any) => {
          setCanGoBack(navState.canGoBack);
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          if (pushTokenRef.current && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (window.__setPushToken) {
                window.__setPushToken('${pushTokenRef.current}');
              }
              true;
            `);
          }
        }}
        onError={(syntheticEvent: any) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('[WebView] Load error:', nativeEvent);
        }}
      />

      {loading && (
        <View style={styles.splashOverlay}>
          <Image
            source={require('./assets/logo-icon.png')}
            style={styles.splashLogo}
          />
          <Text style={styles.splashTitle}>TRADE NEXUS</Text>
          <Text style={styles.splashSub}>TRADE SMART</Text>
          <ActivityIndicator size="small" color="#00C9A7" style={{ marginTop: 24 }} />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainAppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07192C',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#07192C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  splashSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00C9A7',
    letterSpacing: 1.5,
    marginTop: 6,
  },
});
