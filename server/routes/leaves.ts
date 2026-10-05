import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/leaves
// Scoped according to user role:
// - telecaller / employee: only own leaves
// - team_leader: leaves for members in their assigned squad(s) + their own leaves
// - hr / admin: all leaves
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      const leaves = db.prepare('SELECT * FROM leave_requests ORDER BY createdAt DESC').all();
      return res.status(200).json(leaves);
    }

    if (user.role === 'telecaller' || user.role === 'employee') {
      const ownId = user.employeeId || user.id;
      const ownEmpCode = user.empCode || '';
      const leaves = db.prepare(`
        SELECT * FROM leave_requests 
        WHERE employeeId = NULLIF(?, '') OR employeeCode = NULLIF(?, '') OR LOWER(employeeName) = LOWER(NULLIF(?, ''))
        ORDER BY createdAt DESC
      `).all(ownId || '', ownEmpCode, user.name || '');
      return res.status(200).json(leaves);
    }

    if (user.role === 'team_leader') {
      const leaderRow = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = NULLIF(?, '') OR empCode = NULLIF(?, '') OR LOWER(name) = LOWER(NULLIF(?, ''))
        LIMIT 1
      `).get(user.employeeId || user.id || '', user.empCode || '', user.name || '') as any;

      const groupRow = db.prepare(`
        SELECT name FROM team_groups 
        WHERE LOWER(leaderName) = LOWER(?)
        LIMIT 1
      `).get(user.name || '') as any;

      const squadName = leaderRow?.groupName || groupRow?.name || '';

      if (squadName) {
        const squadMembers = db.prepare(`
          SELECT id, empCode, name FROM team_members 
          WHERE LOWER(groupName) = LOWER(?)
        `).all(squadName) as any[];

        const squadCodes = squadMembers.map(m => m.empCode).filter(Boolean);
        const squadIds = squadMembers.map(m => m.id).filter(Boolean);
        const squadNames = squadMembers.map(m => (m.name || '').toLowerCase());

        // Include leader's own leaves
        if (user.employeeId) squadIds.push(user.employeeId);
        if (user.empCode) squadCodes.push(user.empCode);
        squadNames.push((user.name || '').toLowerCase());

        const allLeaves = db.prepare(`
          SELECT * FROM leave_requests 
          ORDER BY createdAt DESC
        `).all() as any[];

        const filtered = allLeaves.filter(l => {
          if (l.teamName && l.teamName.toLowerCase() === squadName.toLowerCase()) return true;
          if (l.employeeId && squadIds.includes(l.employeeId)) return true;
          if (l.employeeCode && squadCodes.includes(l.employeeCode)) return true;
          if (l.employeeName && squadNames.includes(l.employeeName.toLowerCase())) return true;
          return false;
        });

        return res.status(200).json(filtered);
      }

      // No squad resolved: TL sees only their own leave requests (never the whole company)
      const ownLeaves = db.prepare(`
        SELECT * FROM leave_requests 
        WHERE employeeId = NULLIF(?, '') OR employeeCode = NULLIF(?, '') OR LOWER(employeeName) = LOWER(NULLIF(?, ''))
        ORDER BY createdAt DESC
      `).all(user.employeeId || user.id || '', user.empCode || '', user.name || '');
      return res.status(200).json(ownLeaves);
    }

    // HR and Admin get all leave requests
    const leaves = db.prepare('SELECT * FROM leave_requests ORDER BY createdAt DESC').all();
    return res.status(200).json(leaves);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/leaves
router.post('/', (req: Request, res: Response) => {
  try {
    const user = req.user;
    const {
      id, employeeName, employeeCode, employeeId, employeeRole, teamName,
      leaveType, fromDate, toDate, totalDays, reason, status, approvalStage,
      appliedOn, approvedBy
    } = req.body;

    const leaveId = id || `lv-${Date.now()}`;
    const days = totalDays ? Number(totalDays) : 1;

    const finalEmpId = employeeId || user?.employeeId || user?.id || '';
    const finalEmpCode = employeeCode || user?.empCode || '';
    const finalEmpName = employeeName || user?.name || 'Employee';
    const finalRole = employeeRole || user?.role || 'telecaller';

    // Look up applicant's squad / team if not provided
    let finalTeam = teamName || '';
    if (!finalTeam && (finalEmpId || finalEmpCode || finalEmpName)) {
      const mem = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = NULLIF(?, '') OR empCode = NULLIF(?, '') OR LOWER(name) = LOWER(NULLIF(?, ''))
        LIMIT 1
      `).get(finalEmpId, finalEmpCode, finalEmpName) as any;
      const prof = db.prepare(`
        SELECT teamName FROM employee_profiles 
        WHERE id = NULLIF(?, '') OR empCode = NULLIF(?, '') OR LOWER(name) = LOWER(NULLIF(?, ''))
        LIMIT 1
      `).get(finalEmpId, finalEmpCode, finalEmpName) as any;
      finalTeam = mem?.groupName || prof?.teamName || '';
    }

    // Default approvalStage based on hierarchical flow:
    // telecaller / employee: starts at PENDING_TEAM_LEADER
    // team_leader: starts at PENDING_HR
    // hr: starts at PENDING_ADMIN
    let initialStage = approvalStage;
    if (!initialStage) {
      if (finalRole === 'hr') {
        initialStage = 'PENDING_ADMIN';
      } else if (finalRole === 'team_leader') {
        initialStage = 'PENDING_HR';
      } else {
        initialStage = 'PENDING_TEAM_LEADER';
      }
    }

    db.prepare(`
      INSERT INTO leave_requests (
        id, employeeName, employeeCode, employeeId, employeeRole, teamName,
        leaveType, fromDate, toDate, totalDays, reason, status, approvalStage, appliedOn, approvedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leaveId,
      finalEmpName,
      finalEmpCode,
      finalEmpId,
      finalRole,
      finalTeam,
      leaveType || 'Casual Leave',
      fromDate,
      toDate,
      days,
      reason || '',
      status || 'PENDING',
      initialStage,
      appliedOn || 'Today',
      approvedBy || null
    );

    // Deduct leave balance ONLY from this applicant's profile
    if (finalEmpId || finalEmpCode || finalEmpName) {
      db.prepare(`
        UPDATE employee_profiles
        SET totalLeaveBalance = MAX(0, totalLeaveBalance - ?)
        WHERE id = NULLIF(?, '') OR empCode = NULLIF(?, '')
      `).run(days, finalEmpId, finalEmpCode);
    }

    const created = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(leaveId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/leaves/:id (Approve / Advance / Reject)
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const merged = { ...existing, ...req.body };

    // Enforce hierarchical stage transitions on the server
    const actorRole = req.user?.role;
    const isStageChange = req.body.approvalStage !== undefined && req.body.approvalStage !== existing.approvalStage;
    const isStatusChange = req.body.status !== undefined && req.body.status !== existing.status;
    if (actorRole && actorRole !== 'telecaller' && actorRole !== 'employee' && (isStageChange || isStatusChange)) {
      if (existing.status !== 'PENDING') {
        return res.status(409).json({ error: `Leave request is already ${existing.status}` });
      }
      const currentStage = existing.approvalStage || 'PENDING_TEAM_LEADER';
      const rejecting = merged.status === 'REJECTED';
      if (!rejecting) {
        const allowed =
          (actorRole === 'team_leader' && currentStage === 'PENDING_TEAM_LEADER' && merged.approvalStage === 'PENDING_HR') ||
          (actorRole === 'hr' && currentStage === 'PENDING_HR' && merged.approvalStage === 'PENDING_ADMIN') ||
          (actorRole === 'admin' && currentStage === 'PENDING_ADMIN' && merged.approvalStage === 'APPROVED');
        if (!allowed) {
          return res.status(409).json({ error: `Cannot move leave from ${currentStage} as ${actorRole}` });
        }
        // Only the final admin sign-off marks the leave APPROVED; intermediate stages stay PENDING
        merged.status = merged.approvalStage === 'APPROVED' ? 'APPROVED' : 'PENDING';
      } else {
        merged.approvalStage = 'REJECTED';
      }
    }

    // If status transitions to REJECTED, refund leave balance to the applicant
    if (existing.status !== 'REJECTED' && merged.status === 'REJECTED') {
      const days = Number(existing.totalDays || merged.totalDays || 1);
      const applicantId = existing.employeeId || merged.employeeId || '';
      const applicantCode = existing.employeeCode || merged.employeeCode || '';
      const applicantName = existing.employeeName || merged.employeeName || '';

      if (applicantId || applicantCode || applicantName) {
        db.prepare(`
          UPDATE employee_profiles 
          SET totalLeaveBalance = totalLeaveBalance + ? 
          WHERE id = NULLIF(?, '') OR empCode = NULLIF(?, '')
        `).run(days, applicantId, applicantCode);
      }
    }

    db.prepare(`
      UPDATE leave_requests
      SET employeeName = ?, employeeCode = ?, employeeId = ?, employeeRole = ?, teamName = ?,
          leaveType = ?, fromDate = ?, toDate = ?, totalDays = ?, reason = ?,
          status = ?, approvalStage = ?, appliedOn = ?, approvedBy = ?,
          teamLeaderApprovedBy = ?, teamLeaderApprovedAt = ?,
          hrApprovedBy = ?, hrApprovedAt = ?,
          adminApprovedBy = ?, adminApprovedAt = ?,
          rejectedBy = ?, rejectionReason = ?
      WHERE id = ?
    `).run(
      merged.employeeName ?? null,
      merged.employeeCode ?? null,
      merged.employeeId ?? null,
      merged.employeeRole ?? null,
      merged.teamName ?? null,
      merged.leaveType,
      merged.fromDate,
      merged.toDate,
      merged.totalDays,
      merged.reason,
      merged.status,
      merged.approvalStage,
      merged.appliedOn,
      merged.approvedBy ?? null,
      merged.teamLeaderApprovedBy ?? null,
      merged.teamLeaderApprovedAt ?? null,
      merged.hrApprovedBy ?? null,
      merged.hrApprovedAt ?? null,
      merged.adminApprovedBy ?? null,
      merged.adminApprovedAt ?? null,
      merged.rejectedBy ?? null,
      merged.rejectionReason ?? null,
      id
    );

    const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/leaves/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // If leave was pending, refund balance
    if (existing.status === 'PENDING') {
      const days = Number(existing.totalDays || 1);
      const applicantId = existing.employeeId || '';
      const applicantCode = existing.employeeCode || '';
      const applicantName = existing.employeeName || '';
      if (applicantId || applicantCode || applicantName) {
        db.prepare(`
          UPDATE employee_profiles 
          SET totalLeaveBalance = totalLeaveBalance + ? 
          WHERE id = NULLIF(?, '') OR empCode = NULLIF(?, '')
        `).run(days, applicantId, applicantCode);
      }
    }

    db.prepare('DELETE FROM leave_requests WHERE id = ?').run(id);
    return res.status(200).json({ success: true, message: 'Leave request deleted and quota refunded' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
