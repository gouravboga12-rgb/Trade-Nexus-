import { Router, Request, Response } from 'express';
import { registerPushToken, sendPushNotification } from '../services/notificationService.js';

const router = Router();

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
