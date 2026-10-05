import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { getTodayDateIST } from '../utils/dateUtils.js';

const router = Router();

// GET /api/stats
// Scoped to the authenticated employee (or requested employeeId) with live dials from call_logs
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;
    const requestedEmpId = (req.query.employeeId as string) || '';
    const targetId = requestedEmpId || user?.employeeId || user?.id || '';
    const targetEmpCode = user?.empCode || '';

    // 1. Fetch roster targets for this specific employee
    let roster: any = null;
    if (targetId || targetEmpCode || user?.email || user?.name) {
      roster = db.prepare(`
        SELECT * FROM team_members 
        WHERE id = ? OR empCode = ? OR (email IS NOT NULL AND LOWER(email) = LOWER(?)) OR (name IS NOT NULL AND LOWER(name) = LOWER(?))
        LIMIT 1
      `).get(targetId, targetEmpCode, user?.email || '', (user?.name || '').toLowerCase()) as any;
    }

    // 2. Dynamically aggregate from assigned_leads (deals won, dials, status breakdown)
    let leadMetrics: any = null;
    if (targetId || targetEmpCode || user?.name) {
      leadMetrics = db.prepare(`
        SELECT 
          COALESCE(SUM(dealValue), 0) as totalRevenue,
          COALESCE(SUM(callCount), 0) as totalDials,
          SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) as wonCount,
          SUM(CASE WHEN status = 'INTERESTED' THEN 1 ELSE 0 END) as interested,
          SUM(CASE WHEN status = 'NOT_INTERESTED' OR status = 'FAILED' THEN 1 ELSE 0 END) as rejected
        FROM assigned_leads
        WHERE assignedToEmployeeId = ? OR assignedToEmployeeId = ? OR (assignedToEmployeeName IS NOT NULL AND LOWER(assignedToEmployeeName) = LOWER(?))
      `).get(targetId, targetEmpCode, user?.name || '') as any;
    }

    // 3. Dynamically calculate dials today from live call_logs
    const todayStr = getTodayDateIST();
    let dialMetrics: any = null;
    if (targetId || targetEmpCode || user?.name) {
      dialMetrics = db.prepare(`
        SELECT 
          COUNT(*) as dialsMade,
          SUM(CASE WHEN outcome = 'CONNECTED' THEN 1 ELSE 0 END) as connected,
          SUM(CASE WHEN outcome = 'INTERESTED' THEN 1 ELSE 0 END) as interested,
          SUM(CASE WHEN outcome = 'NOT_INTERESTED' OR outcome = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
          AVG(durationSec) as avgSec
        FROM call_logs
        WHERE (employeeId = ? OR employeeId = ? OR LOWER(clientName) = LOWER(?))
          AND (date = ? OR createdAt LIKE ?)
      `).get(targetId, targetEmpCode, user?.name || '', todayStr, `${todayStr}%`) as any;
    }

    // 4. Look up baseline stats row strictly for this employee
    let stats = targetId
      ? (db.prepare('SELECT * FROM telecaller_stats WHERE id = ? OR id = ?').get(`stat-${targetId}`, targetId) as any)
      : null;

    const dialsToday = Math.max(
      Number(leadMetrics?.totalDials || 0),
      Number(dialMetrics?.dialsMade || 0),
      Number(stats?.dialsMade || 0)
    );
    const connected = Math.max(
      Number(dialMetrics?.connected || 0),
      Number(leadMetrics?.wonCount || 0),
      Number(stats?.connected || 0)
    );
    const interested = Math.max(
      Number(leadMetrics?.interested || 0),
      Number(dialMetrics?.interested || 0),
      Number(stats?.interested || 0)
    );
    const rejected = Math.max(
      Number(leadMetrics?.rejected || 0),
      Number(dialMetrics?.rejected || 0),
      Number(stats?.rejected || 0)
    );
    const avgSec = Math.round(dialMetrics?.avgSec ?? stats?.averageCallDurationSec ?? 0);

    const achievedRevenue = Math.max(
      Number(leadMetrics?.totalRevenue || 0),
      Number(roster?.salesAchieved || 0),
      Number(stats?.monthlySalesAchieved || 0)
    );

    const goalCalls = (roster?.goalCalls && Number(roster.goalCalls) > 0)
      ? Number(roster.goalCalls)
      : (stats?.todayGoalCalls && Number(stats.todayGoalCalls) > 0 ? Number(stats.todayGoalCalls) : 60);

    const monthlySalesTarget = (roster?.salesTarget && Number(roster.salesTarget) > 0)
      ? Number(roster.salesTarget)
      : (stats?.monthlySalesTarget && Number(stats.monthlySalesTarget) > 0 ? Number(stats.monthlySalesTarget) : 200000);

    return res.status(200).json({
      id: stats?.id || `stat-${targetId || 'default'}`,
      todayGoalCalls: goalCalls,
      dialsMade: dialsToday,
      dialsToday: dialsToday,
      dailyTarget: goalCalls,
      connected: connected,
      interested: interested,
      rejected: rejected,
      averageCallDurationSec: avgSec,
      monthlySalesTarget: monthlySalesTarget,
      monthlySalesAchieved: achievedRevenue,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/stats
router.put('/', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const targetId = data.id || req.user?.employeeId || req.user?.id;
    const statId = (targetId && String(targetId).startsWith('stat-')) ? targetId : `stat-${targetId || 'default'}`;
    let current = targetId
      ? (db.prepare('SELECT * FROM telecaller_stats WHERE id = ? OR id = ?').get(targetId, statId) as any)
      : null;

    if (!current) {
      db.prepare(`
        INSERT OR IGNORE INTO telecaller_stats (
          id, todayGoalCalls, dialsMade, connected, interested, rejected, averageCallDurationSec, monthlySalesTarget, monthlySalesAchieved
        ) VALUES (?, 60, 0, 0, 0, 0, 0, 200000, 0)
      `).run(statId);
      current = db.prepare('SELECT * FROM telecaller_stats WHERE id = ?').get(statId) as any;
    }

    const merged = { ...current, ...data };
    if (data.dialsToday !== undefined && data.dialsMade === undefined) {
      merged.dialsMade = Number(data.dialsToday);
    }
    if (data.dailyTarget !== undefined && data.todayGoalCalls === undefined) {
      merged.todayGoalCalls = Number(data.dailyTarget);
    }
    // Prevent accidental wipe of targets when calling PUT /api/stats with partial/empty targets
    if (!data.monthlySalesTarget || Number(data.monthlySalesTarget) <= 0) {
      merged.monthlySalesTarget = current.monthlySalesTarget || 200000;
    }
    if (!data.todayGoalCalls && !data.dailyTarget) {
      merged.todayGoalCalls = current.todayGoalCalls || 60;
    }

    db.prepare(`
      UPDATE telecaller_stats 
      SET todayGoalCalls = ?, dialsMade = ?, connected = ?, interested = ?, rejected = ?, 
          averageCallDurationSec = ?, monthlySalesTarget = ?, monthlySalesAchieved = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      merged.todayGoalCalls, merged.dialsMade, merged.connected, merged.interested, merged.rejected,
      merged.averageCallDurationSec, merged.monthlySalesTarget, merged.monthlySalesAchieved, current.id
    );

    const updated = db.prepare('SELECT * FROM telecaller_stats WHERE id = ?').get(current.id) as any;
    return res.status(200).json({
      ...updated,
      dialsToday: updated.dialsMade,
      dailyTarget: updated.todayGoalCalls
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
