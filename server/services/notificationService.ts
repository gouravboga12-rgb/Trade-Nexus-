import db from '../db/connection.js';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin with Service Account JSON if available
let firebaseApp: admin.app.App | null = null;
try {
  const serviceAccountPaths = [
    path.resolve(__dirname, '../firebase-service-account.json'),
    path.resolve(process.cwd(), 'server/firebase-service-account.json'),
    path.resolve('/home/ubuntu/tradex/server/firebase-service-account.json'),
    path.resolve(__dirname, '../../trade-nexus-trade-smart-f7ab1-firebase-adminsdk-fbsvc-057e43752b.json')
  ];

  let serviceAccountKeyPath = '';
  for (const p of serviceAccountPaths) {
    if (fs.existsSync(p)) {
      serviceAccountKeyPath = p;
      break;
    }
  }

  if (serviceAccountKeyPath) {
    const raw = fs.readFileSync(serviceAccountKeyPath, 'utf8');
    const serviceAccount = JSON.parse(raw);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    }, 'trade-nexus-fcm');
    console.log('[Firebase Admin] Successfully initialized FCM v1 engine with project:', serviceAccount.project_id);
  } else {
    console.warn('[Firebase Admin] Service account JSON not found. Will use Expo Push fallback.');
  }
} catch (fcmInitErr: any) {
  console.warn('[Firebase Admin Initialization Notice]:', fcmInitErr.message);
}

export interface PushNotificationPayload {
  targetUserId?: string | string[];
  targetEmpCode?: string | string[];
  targetRole?: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
}

export interface RegisterTokenPayload {
  token: string;
  userId?: string;
  empCode?: string;
  role?: string;
  userName?: string;
  platform?: string;
}

/**
 * Register or update an Expo / FCM Device Push Token
 */
export function registerPushToken(payload: RegisterTokenPayload): boolean {
  try {
    if (!payload.token || typeof payload.token !== 'string') return false;
    const cleanToken = payload.token.trim();
    if (!cleanToken) return false;

    const id = `token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userId = payload.userId || null;
    const empCode = payload.empCode || null;
    const role = payload.role || null;
    const userName = payload.userName || null;
    const platform = payload.platform || 'android';

    db.prepare(`
      INSERT INTO device_push_tokens (id, token, userId, empCode, role, userName, platform, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(token) DO UPDATE SET
        userId = COALESCE(excluded.userId, device_push_tokens.userId),
        empCode = COALESCE(excluded.empCode, device_push_tokens.empCode),
        role = COALESCE(excluded.role, device_push_tokens.role),
        userName = COALESCE(excluded.userName, device_push_tokens.userName),
        platform = excluded.platform,
        updatedAt = datetime('now')
    `).run(id, cleanToken, userId, empCode, role, userName, platform);

    console.log(`[Push Token Registered] Role: ${role || 'N/A'}, EmpCode: ${empCode || 'N/A'}, Token: ${cleanToken.substring(0, 25)}...`);
    return true;
  } catch (error) {
    console.error('[Push Token Error] Failed to register token:', error);
    return false;
  }
}

/**
 * Query active device tokens for the given recipient criteria
 */
function getTargetTokens(payload: PushNotificationPayload): string[] {
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    // Helper for multi-value filters
    const addMultiCondition = (field: string, val?: string | string[]) => {
      if (!val) return;
      const arr = (Array.isArray(val) ? val : [val]).map(v => String(v).trim()).filter(Boolean);
      if (arr.length === 0) return;
      const placeholders = arr.map(() => '?').join(',');
      conditions.push(`${field} IN (${placeholders})`);
      params.push(...arr);
    };

    const hasSpecificTarget = Boolean(payload.targetUserId || payload.targetEmpCode || payload.targetRole);

    if (hasSpecificTarget) {
      const orParts: string[] = [];
      const orParams: any[] = [];

      if (payload.targetUserId) {
        const arr = (Array.isArray(payload.targetUserId) ? payload.targetUserId : [payload.targetUserId]).map(v => String(v).trim()).filter(Boolean);
        if (arr.length > 0) {
          orParts.push(`userId IN (${arr.map(() => '?').join(',')})`);
          orParams.push(...arr);
        }
      }

      if (payload.targetEmpCode) {
        const arr = (Array.isArray(payload.targetEmpCode) ? payload.targetEmpCode : [payload.targetEmpCode]).map(v => String(v).trim()).filter(Boolean);
        if (arr.length > 0) {
          orParts.push(`empCode IN (${arr.map(() => '?').join(',')})`);
          orParams.push(...arr);
        }
      }

      if (payload.targetRole) {
        const arr = (Array.isArray(payload.targetRole) ? payload.targetRole : [payload.targetRole]).map(v => String(v).trim().toLowerCase()).filter(Boolean);
        if (arr.length > 0) {
          orParts.push(`LOWER(role) IN (${arr.map(() => '?').join(',')})`);
          orParams.push(...arr);
        }
      }

      if (orParts.length > 0) {
        conditions.push(`(${orParts.join(' OR ')})`);
        params.push(...orParams);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT DISTINCT token FROM device_push_tokens ${whereClause} ORDER BY updatedAt DESC LIMIT 500`;
    const rows = db.prepare(query).all(...params) as { token: string }[];
    return rows.map(r => r.token).filter(Boolean);
  } catch (err) {
    console.error('[Push Service] Error retrieving tokens:', err);
    return [];
  }
}

/**
 * Dispatch External Push Notification to user devices via Expo Push API (FCM V1 backed)
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<{ success: boolean; deliveredCount: number }> {
  try {
    const tokens = getTargetTokens(payload);
    if (!tokens || tokens.length === 0) {
      console.log(`[Push Notification] No device tokens found for target:`, {
        targetRole: payload.targetRole,
        targetEmpCode: payload.targetEmpCode,
        targetUserId: payload.targetUserId
      });
      return { success: true, deliveredCount: 0 };
    }

    console.log(`[Push Notification] Dispatching to ${tokens.length} device(s): "${payload.title}"`);

    // Prepare Expo-compatible push messages
    const messages = tokens.map(token => ({
      to: token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      priority: 'high',
      channelId: payload.channelId || 'default',
      data: {
        ...(payload.data || {}),
        title: payload.title,
        body: payload.body,
        timestamp: new Date().toISOString()
      }
    }));

    // Send in chunks of 100 per Expo API guidelines
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(chunk)
        });

        const resData = await response.json().catch(() => null);
        if (!response.ok) {
          console.warn('[Push Notification] Expo Push API warning/error:', resData);
        } else {
          console.log(`[Push Notification Delivered] Successfully sent ${chunk.length} notification(s) via Expo`);
        }
      } catch (chunkErr) {
        console.error('[Push Notification Network Error]', chunkErr);
      }
    }

    // Direct FCM V1 dispatch if native FCM tokens exist or firebaseApp is initialized
    if (firebaseApp) {
      const directFcmTokens = tokens.filter(t => !t.startsWith('ExponentPushToken['));
      if (directFcmTokens.length > 0) {
        try {
          const fcmResponse = await firebaseApp.messaging().sendEachForMulticast({
            tokens: directFcmTokens,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: payload.channelId || 'default',
                priority: 'max',
                visibility: 'public',
              }
            },
            data: {
              ...(payload.data ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)])) : {}),
              title: payload.title,
              body: payload.body,
              targetTab: String(payload.data?.targetTab || 'home'),
            }
          });
          console.log(`[Firebase Admin FCM V1] Dispatched: ${fcmResponse.successCount} success, ${fcmResponse.failureCount} failed`);
        } catch (fcmSendErr: any) {
          console.error('[Firebase Admin FCM Send Error]', fcmSendErr.message);
        }
      }
    }

    return { success: true, deliveredCount: tokens.length };
  } catch (err) {
    console.error('[Push Notification Failure]', err);
    return { success: false, deliveredCount: 0 };
  }
}

