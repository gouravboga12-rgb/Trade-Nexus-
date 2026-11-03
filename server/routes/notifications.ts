import { Router, Request, Response } from 'express';
import { registerPushToken, sendPushNotification } from '../services/notificationService.js';
import { getIO } from '../services/socketService.js';
import db from '../db/connection.js';

const router = Router();

// Ensure notifications history table exists in SQLite
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_broadcasts (
      id TEXT PRIMARY KEY,
      senderId TEXT,
      senderName TEXT,
      senderRole TEXT,
      category TEXT,
      targetScope TEXT,
      targetRoles TEXT,
      targetUserIds TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      actionUrl TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
} catch (tableErr: any) {
  console.warn('[Broadcast Table Setup]', tableErr.message);
}

// POST /api/notifications/broadcast
// Admin & HR custom announcements, birthday celebration alerts, target reminders, and performance nudges
router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const {
      senderId,
      senderName,
      senderRole,
      category = 'ANNOUNCEMENT',
      targetScope = 'ALL',
      targetRoles,
      targetUserIds,
      title,
      message,
      actionUrl
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const broadcastId = `bcast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const rolesArray = Array.isArray(targetRoles) ? targetRoles : (targetRoles ? [targetRoles] : []);
    const userIdsArray = Array.isArray(targetUserIds) ? targetUserIds : (targetUserIds ? [targetUserIds] : []);

    // 1. Persist broadcast in database
    try {
      db.prepare(`
        INSERT INTO company_broadcasts (
          id, senderId, senderName, senderRole, category, targetScope, targetRoles, targetUserIds, title, message, actionUrl, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        broadcastId,
        senderId || 'management',
        senderName || 'Management',
        senderRole || 'admin',
        category,
        targetScope,
        JSON.stringify(rolesArray),
        JSON.stringify(userIdsArray),
        title,
        message,
        actionUrl || 'home'
      );
    } catch (saveErr) {
      console.warn('[Broadcast DB Save Warning]', saveErr);
    }

    // 2. Real-time WebSocket Dispatch via Socket.IO
    const io = getIO();
    const broadcastPayload = {
      id: broadcastId,
      senderId,
      senderName,
      senderRole,
      category,
      title,
      body: message,
      targetTab: actionUrl || 'home',
      timestamp: new Date().toISOString()
    };

    if (io) {
      if (targetScope === 'ALL') {
        io.emit('broadcast:received', broadcastPayload);
      } else if (targetScope === 'ROLE' && rolesArray.length > 0) {
        rolesArray.forEach((role) => {
          const r = String(role).toLowerCase();
          if (r === 'telecaller' || r === 'employee') io.to('room:telecaller').emit('broadcast:received', broadcastPayload);
          else if (r === 'team_leader') io.to('room:team_leader').emit('broadcast:received', broadcastPayload);
          else if (r === 'hr') io.to('room:hr').emit('broadcast:received', broadcastPayload);
          else if (r === 'admin') io.to('room:admin').emit('broadcast:received', broadcastPayload);
        });
      } else if (targetScope === 'CUSTOM' && userIdsArray.length > 0) {
        userIdsArray.forEach((uid) => {
          io.to(`room:user_${uid}`).emit('broadcast:received', broadcastPayload);
        });
      }
    }

    // 3. High-Priority External Push Notification (wakes up lock screen / app closed)
    let pushRoleFilter: string[] | undefined = undefined;
    let pushUserFilter: string[] | undefined = undefined;

    if (targetScope === 'ROLE' && rolesArray.length > 0) {
      pushRoleFilter = rolesArray.map(r => String(r).toLowerCase());
    } else if (targetScope === 'CUSTOM' && userIdsArray.length > 0) {
      pushUserFilter = userIdsArray;
    }

    const pushResult = await sendPushNotification({
      targetRole: pushRoleFilter,
      targetUserId: pushUserFilter,
      targetEmpCode: pushUserFilter,
      title: title,
      body: message,
      channelId: 'high-priority',
      data: {
        broadcastId,
        category,
        targetTab: actionUrl || 'home',
        senderName: senderName || 'Management'
      }
    });

    return res.status(200).json({
      success: true,
      broadcastId,
      deliveredDevices: pushResult.deliveredCount
    });
  } catch (error) {
    console.error('[Broadcast Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/notifications/broadcasts
// Retrieve recent broadcasts
router.get('/broadcasts', (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM company_broadcasts ORDER BY createdAt DESC LIMIT 50
    `).all();
    return res.status(200).json({ broadcasts: rows });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/notifications/register-token
// Register a mobile device's push token (Expo Push Token or FCM token)
router.post('/register-token', (req: Request, res: Response) => {
  try {
    const { token, userId, empCode, role, userName, platform } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Missing device push token' });
    }

    const user = req.user;
    const finalUserId = userId || user?.employeeId || user?.id;
    const finalEmpCode = empCode || user?.empCode;
    const finalRole = role || user?.role;
    const finalName = userName || user?.name;

    const registered = registerPushToken({
      token,
      userId: finalUserId,
      empCode: finalEmpCode,
      role: finalRole,
      userName: finalName,
      platform: platform || 'android'
    });

    return res.status(200).json({ success: registered });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/notifications/send (Admin test or broadcast)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { targetUserId, targetEmpCode, targetRole, title, body, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const result = await sendPushNotification({
      targetUserId,
      targetEmpCode,
      targetRole,
      title,
      body,
      data
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

