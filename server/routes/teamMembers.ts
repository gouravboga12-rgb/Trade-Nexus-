import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { hashPassword } from '../db/authUtils.js';
import { syncDailyRosterStatus } from '../services/attendanceLifecycle.js';

const router = Router();

function ensureAllStaffInTeamMembers() {
  try {
    const admin = db.prepare("SELECT id FROM team_members WHERE id = 'emp-ad-1' OR empCode = 'TNX-AD01'").get();
    if (!admin) {
      db.prepare(`
        INSERT INTO team_members (
          id, empCode, name, avatar, role, groupName, phone, emergencyPhone, dob, 
          employeeType, attendanceStatus, dialsToday, goalCalls, connected, interested, 
          salesAchieved, salesTarget, conversionRate, portal, email, password, active, 
          salary, joiningDate, address, bloodGroup
        ) VALUES (
          'emp-ad-1', 'TNX-AD01', 'Super Admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          'Executive Director', 'Executive Management', '+91 98765 43210', '+91 98765 43210',
          '1985-04-12', 'Full - Time', 'PRESENT', 0, 0, 0, 0, 0, 0, 0,
          'admin', 'sagarsuchi26@gmail.com', 'admin123', 1, 150000, '2023-01-01',
          'Trade Nexus Corporate HQ, Financial District', 'O+ ve'
        )
      `).run();
    }
    const hr = db.prepare("SELECT id FROM team_members WHERE id = 'emp-hr-1' OR empCode = 'TNX-HR01'").get();
    if (!hr) {
      db.prepare(`
        INSERT INTO team_members (
          id, empCode, name, avatar, role, groupName, phone, emergencyPhone, dob, 
          employeeType, attendanceStatus, dialsToday, goalCalls, connected, interested, 
          salesAchieved, salesTarget, conversionRate, portal, email, password, active, 
          salary, joiningDate, address, bloodGroup
        ) VALUES (
          'emp-hr-1', 'TNX-HR01', 'HR Manager', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          'HR Head', 'Human Resources', '+91 98765 43211', '+91 98765 43211',
          '1990-08-20', 'Full - Time', 'PRESENT', 0, 0, 0, 0, 0, 0, 0,
          'hr', 'hr@tradenexus.com', 'hr123', 1, 85000, '2023-06-15',
          'Trade Nexus Corporate HQ, Financial District', 'B+ ve'
        )
      `).run();
    }
  } catch (e) {
    // ignore
  }
}

// GET /api/team-members
router.get('/', (req: Request, res: Response) => {
  try {
    ensureAllStaffInTeamMembers();
    syncDailyRosterStatus();
    const user = req.user;

    // Team Leader: Scoped strictly to employees belonging to their assigned squad/team
    if (user && user.role === 'team_leader') {
      const leaderId = user.employeeId || user.id;
      const leaderEmpCode = user.empCode || '';
      const leaderName = user.name || '';

      const leaderRow = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(leaderId, leaderEmpCode, leaderName) as any;

      const groupRow = db.prepare(`
        SELECT name FROM team_groups 
        WHERE LOWER(leaderName) = LOWER(?)
        LIMIT 1
      `).get(leaderName) as any;

      const squadName = leaderRow?.groupName || groupRow?.name;

      if (squadName) {
        const members = db.prepare(`
          SELECT id, empCode, name, avatar, role, groupName as "group", phone, emergencyPhone, dob, employeeType, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, password, active, deactivatedOn, bankName, bankAccountNumber, bankIfscCode, panDocumentName, panDocumentUrl, aadhaarDocumentName, aadhaarDocumentUrl, salary, joiningDate, address, bloodGroup 
          FROM team_members 
          WHERE LOWER(groupName) = LOWER(?) OR id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        `).all(squadName, leaderId, leaderEmpCode, leaderName);
        return res.status(200).json(members);
      } else {
        const members = db.prepare(`
          SELECT id, empCode, name, avatar, role, groupName as "group", phone, emergencyPhone, dob, employeeType, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, password, active, deactivatedOn, bankName, bankAccountNumber, bankIfscCode, panDocumentName, panDocumentUrl, aadhaarDocumentName, aadhaarDocumentUrl, salary, joiningDate, address, bloodGroup 
          FROM team_members 
          WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        `).all(leaderId, leaderEmpCode, leaderName);
        return res.status(200).json(members);
      }
    }

    const members = db.prepare('SELECT id, empCode, name, avatar, role, groupName as "group", phone, emergencyPhone, dob, employeeType, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, password, active, deactivatedOn, bankName, bankAccountNumber, bankIfscCode, panDocumentName, panDocumentUrl, aadhaarDocumentName, aadhaarDocumentUrl, salary, joiningDate, address, bloodGroup, companyAddress, companyPhone, companyEmail, companyWebsite, signatoryName, signatoryRole FROM team_members').all();
    return res.status(200).json(members);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/team-members/floor-pulse
router.get('/floor-pulse', (req: Request, res: Response) => {
  try {
    const user = req.user;
    let squadFilter = '';
    let squadParam: string | null = null;

    if (user && user.role === 'team_leader') {
      const leaderRow = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(user.employeeId || user.id, user.empCode || '', user.name || '') as any;
      const groupRow = db.prepare('SELECT name FROM team_groups WHERE LOWER(leaderName) = LOWER(?) LIMIT 1').get(user.name || '') as any;
      squadParam = leaderRow?.groupName || groupRow?.name || null;
      if (squadParam) {
        squadFilter = 'AND LOWER(groupName) = LOWER(?)';
      }
    }

    // 1. Live Floor Attendance: Active telecallers with dynamic punctuality and metrics
    const activeMembers = squadParam
      ? db.prepare(`
          SELECT id, empCode, name, avatar, role, groupName as "group", phone, 
                 attendanceStatus, checkInTime, dialsToday, goalCalls, connected, 
                 interested, salesAchieved, salesTarget
          FROM team_members 
          WHERE active = 1 AND LOWER(groupName) = LOWER(?)
          ORDER BY 
            (CASE WHEN attendanceStatus = 'PRESENT' THEN 1 WHEN attendanceStatus = 'LATE' THEN 2 ELSE 3 END),
            salesAchieved DESC,
            dialsToday DESC
          LIMIT 6
        `).all(squadParam) as any[]
      : db.prepare(`
          SELECT id, empCode, name, avatar, role, groupName as "group", phone, 
                 attendanceStatus, checkInTime, dialsToday, goalCalls, connected, 
                 interested, salesAchieved, salesTarget
          FROM team_members 
          WHERE active = 1
          ORDER BY 
            (CASE WHEN attendanceStatus = 'PRESENT' THEN 1 WHEN attendanceStatus = 'LATE' THEN 2 ELSE 3 END),
            salesAchieved DESC,
            dialsToday DESC
          LIMIT 6
        `).all() as any[];

    // 2. Live Working Leads Pulse: Most recent active lead touchpoints
    const recentLeads = squadParam
      ? db.prepare(`
          SELECT 
            al.id, 
            al.name as contactName, 
            al.company, 
            al.assignedToEmployeeName as repName, 
            al.status, 
            al.dealValue, 
            al.notes, 
            al.lastCallTimestamp,
            al.updatedAt,
            al.createdAt
          FROM assigned_leads al
          JOIN team_members tm ON (tm.id = al.assignedToEmployeeId OR LOWER(tm.name) = LOWER(al.assignedToEmployeeName))
          WHERE LOWER(tm.groupName) = LOWER(?)
          ORDER BY al.updatedAt DESC, al.createdAt DESC
          LIMIT 8
        `).all(squadParam) as any[]
      : db.prepare(`
          SELECT 
            al.id, 
            al.name as contactName, 
            al.company, 
            al.assignedToEmployeeName as repName, 
            al.status, 
            al.dealValue, 
            al.notes, 
            al.lastCallTimestamp,
            al.updatedAt,
            al.createdAt
          FROM assigned_leads al
          ORDER BY al.updatedAt DESC, al.createdAt DESC
          LIMIT 8
        `).all() as any[];

    const pulseLeads = recentLeads.map((lead, idx) => {
      let type = 'CONNECTED';
      const statusUpper = (lead.status || '').toUpperCase();
      if (statusUpper.includes('CONVERT') || statusUpper.includes('WON') || lead.dealValue >= 75000) {
        type = 'WON_DEAL';
      } else if (statusUpper.includes('INTEREST')) {
        type = 'INTERESTED';
      } else if (statusUpper.includes('CALLBACK') || statusUpper.includes('CALL_BACK')) {
        type = 'CALLBACK';
      }

      const formattedAmount = lead.dealValue > 0
        ? (lead.dealValue >= 100000 ? `₹${(lead.dealValue / 100000).toFixed(2).replace(/\\.00$/, '')} L` : `₹${Number(lead.dealValue).toLocaleString('en-IN')}`)
        : '—';

      const relativeTimes = ['12m ago', '26m ago', '42m ago', '1h ago', '2h ago', '3h ago'];

      return {
        id: lead.id,
        rep: lead.repName || 'Employee',
        client: lead.company || 'Enterprise Client',
        contact: lead.contactName || 'Key Decision Maker',
        type,
        amount: formattedAmount,
        time: lead.lastCallTimestamp || relativeTimes[idx % relativeTimes.length],
        note: lead.notes || 'Spoke with client, follow-up scheduled.'
      };
    });

    return res.status(200).json({
      activeMembers,
      pulseLeads,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/team-members
router.post('/', (req: Request, res: Response) => {
  try {
    const { 
      id, empCode, name, avatar, role, group, phone, 
      attendanceStatus, checkInTime, checkInMethod, 
      dialsToday, goalCalls, connected, interested, 
      salesAchieved, salesTarget, conversionRate, portal, email, password,
      bankName, bankAccountNumber, bankIfscCode,
      panDocumentName, panDocumentUrl, aadhaarDocumentName, aadhaarDocumentUrl,
      salary, joiningDate, address
    } = req.body;

    const memberId = id || `tm-${Date.now()}`;
    const finalEmpCode = empCode || `TNX-${Math.floor(8000 + Math.random() * 999)}`;
    const finalName = name || 'Team Member';
    const finalRole = role || 'Sales Executive';
    const finalGroup = group || 'General';
    const finalPhone = phone || '';
    const finalEmail = email ? email.toLowerCase().trim() : `${finalEmpCode.toLowerCase()}@tradenexus.com`;
    const finalPortal = portal || 'telecaller';

    // 0. Validate uniqueness: Check if email or phone is already in use by an existing employee
    if (finalEmail) {
      const existingEmailMember = db.prepare('SELECT id, empCode, name, email FROM team_members WHERE LOWER(email) = LOWER(?)').get(finalEmail) as any;
      const existingEmailUser = db.prepare('SELECT id, email, name, role, empCode FROM users WHERE LOWER(email) = LOWER(?)').get(finalEmail) as any;
      if (existingEmailMember || existingEmailUser) {
        const match = existingEmailMember || existingEmailUser;
        return res.status(400).json({ 
          error: `Cannot create employee: Email "${finalEmail}" is already registered to ${match.name} (${match.empCode || 'Existing Account'}). Please use a different email address.` 
        });
      }
    }

    const cleanDigitsPhone = finalPhone.replace(/[^0-9]/g, '');
    if (cleanDigitsPhone.length >= 10) {
      const phoneLast10 = cleanDigitsPhone.slice(-10);
      const existingPhoneMember = db.prepare(`
        SELECT id, empCode, name, phone FROM team_members 
        WHERE replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') LIKE '%' || ?
      `).get(phoneLast10) as any;
      if (existingPhoneMember) {
        return res.status(400).json({ 
          error: `Cannot create employee: Phone number "${finalPhone}" is already registered to ${existingPhoneMember.name} (${existingPhoneMember.empCode}). Please use a different phone number.` 
        });
      }
    }

    const createAtomic = db.transaction(() => {
      // 1. Insert Team Member
      const finalPassword = password || 'Trade@1234';
      const finalBloodGroup = req.body.bloodGroup || 'O+';
      const finalDob = req.body.dob || null;
      const finalEmergencyPhone = req.body.emergencyPhone || finalPhone;
      const finalEmployeeType = req.body.employeeType || 'Full Time';
      const finalAvatar = avatar || req.body.avatar || 'TM';

      db.prepare(`
        INSERT INTO team_members (
          id, empCode, name, avatar, role, groupName, phone, attendanceStatus, 
          checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, 
          salesAchieved, salesTarget, conversionRate, portal, email, password,
          bankName, bankAccountNumber, bankIfscCode,
          panDocumentName, panDocumentUrl, aadhaarDocumentName, aadhaarDocumentUrl,
          salary, joiningDate, address, bloodGroup, dob, emergencyPhone, employeeType
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memberId, finalEmpCode, finalName,
        finalAvatar, finalRole, finalGroup,
        finalPhone, attendanceStatus || 'ABSENT', checkInTime || null, checkInMethod || '',
        dialsToday ? Number(dialsToday) : 0, goalCalls ? Number(goalCalls) : 0,
        connected ? Number(connected) : 0, interested ? Number(interested) : 0,
        salesAchieved ? Number(salesAchieved) : 0, salesTarget ? Number(salesTarget) : 0,
        conversionRate ? Number(conversionRate) : 0,
        finalPortal, finalEmail, finalPassword,
        bankName || null, bankAccountNumber || null, bankIfscCode || null,
        panDocumentName || null, panDocumentUrl || null,
        aadhaarDocumentName || null, aadhaarDocumentUrl || null,
        salary ? Number(salary) : null, joiningDate || null, address || null,
        finalBloodGroup, finalDob, finalEmergencyPhone, finalEmployeeType
      );

      // 2. Insert Employee Profile
      db.prepare(`
        INSERT INTO employee_profiles (id, empCode, name, roleTitle, department, teamName, teamLeaderName, email, phone, joinDate, bloodGroup, faceIdStatus, checkInTime, totalLeaveBalance, dob, avatar, emergencyPhone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memberId, finalEmpCode, finalName, finalRole, finalGroup, finalGroup, '',
        finalEmail, finalPhone, joiningDate || new Date().toISOString().split('T')[0], finalBloodGroup, 'NOT_CHECKED_IN', '', 14,
        finalDob, finalAvatar, finalEmergencyPhone
      );

      // 3. Insert User Credentials for login (strictly avoid converting or overwriting existing user accounts)
      if (finalEmail) {
        const rawPassword = password || 'Trade@1234';
        const passHash = hashPassword(rawPassword);
        db.prepare(`
          INSERT INTO users (id, email, passwordHash, name, role, empCode, employeeId, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          `usr-${Date.now()}`,
          finalEmail,
          passHash,
          finalName,
          finalPortal,
          finalEmpCode,
          memberId
        );
      }

      // 4. Insert isolated clean baseline stats for this employee
      db.prepare(`
        INSERT OR IGNORE INTO telecaller_stats (
          id, todayGoalCalls, dialsMade, connected, interested, rejected, averageCallDurationSec, monthlySalesTarget, monthlySalesAchieved
        ) VALUES (?, ?, 0, 0, 0, 0, 0, ?, 0)
      `).run(`stat-${memberId}`, goalCalls ? Number(goalCalls) : 60, salesTarget ? Number(salesTarget) : 200000);
    });

    createAtomic();

    const created = db.prepare('SELECT id, empCode, name, avatar, role, groupName as "group", phone, emergencyPhone, dob, employeeType, attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, salesAchieved, salesTarget, conversionRate, portal, email, password, active, deactivatedOn, bankName, bankAccountNumber, bankIfscCode, panDocumentName, panDocumentUrl, aadhaarDocumentName, aadhaarDocumentUrl, salary, joiningDate, address, bloodGroup, companyAddress, companyPhone, companyEmail, companyWebsite, signatoryName, signatoryRole FROM team_members WHERE id = ?').get(memberId);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/team-members/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`
      SELECT id, empCode, name, avatar, role, groupName as "group", phone, emergencyPhone, dob, employeeType, 
             attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, 
             salesAchieved, salesTarget, conversionRate, portal, email, password, active, 
             deactivatedOn, bankName, bankAccountNumber, bankIfscCode, panDocumentName, 
             panDocumentUrl, aadhaarDocumentName, aadhaarDocumentUrl, salary, joiningDate, 
             address, bloodGroup, companyAddress, companyPhone, companyEmail, companyWebsite,
             signatoryName, signatoryRole 
      FROM team_members 
      WHERE id = ? OR empCode = ?
    `).get(id, id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const user = req.user;
    if (user && user.role === 'team_leader') {
      const leaderId = user.employeeId || user.id;
      const leaderEmpCode = user.empCode || '';
      const leaderName = user.name || '';
      const leaderRow = db.prepare(`
        SELECT groupName FROM team_members 
        WHERE id = ? OR empCode = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(leaderId, leaderEmpCode, leaderName) as any;
      const groupRow = db.prepare('SELECT name FROM team_groups WHERE LOWER(leaderName) = LOWER(?) LIMIT 1').get(leaderName) as any;
      const squadName = leaderRow?.groupName || groupRow?.name || '';
      const memberGroup = existing.group || existing.groupName || '';
      if (squadName && memberGroup.toLowerCase() !== squadName.toLowerCase() && existing.id !== leaderId) {
        return res.status(403).json({ error: 'Forbidden: Team Leader cannot modify staff outside assigned squad' });
      }
    }

    const targetGroup = req.body.group !== undefined 
      ? req.body.group 
      : (req.body.groupName !== undefined ? req.body.groupName : (existing.group || 'Unassigned'));

    const finalEmployeeType = req.body.employeeType !== undefined 
      ? req.body.employeeType 
      : (req.body.empType !== undefined ? req.body.empType : (existing.employeeType || 'Full Time'));

    const finalEmergencyPhone = req.body.emergencyPhone !== undefined
      ? req.body.emergencyPhone
      : (req.body.phone !== undefined ? req.body.phone : (existing.emergencyPhone || existing.phone || null));

    const finalBloodGroup = req.body.bloodGroup !== undefined
      ? req.body.bloodGroup
      : (existing.bloodGroup || 'O+');

    const finalDob = req.body.dob !== undefined
      ? req.body.dob
      : (existing.dob || null);

    const finalCompanyAddress = req.body.companyAddress !== undefined ? req.body.companyAddress : (existing.companyAddress || null);
    const finalCompanyPhone = req.body.companyPhone !== undefined ? req.body.companyPhone : (existing.companyPhone || null);
    const finalCompanyEmail = req.body.companyEmail !== undefined ? req.body.companyEmail : (existing.companyEmail || null);
    const finalCompanyWebsite = req.body.companyWebsite !== undefined ? req.body.companyWebsite : (existing.companyWebsite || null);
    const finalSignatoryName = req.body.signatoryName !== undefined ? req.body.signatoryName : (existing.signatoryName || null);
    const finalSignatoryRole = req.body.signatoryRole !== undefined ? req.body.signatoryRole : (existing.signatoryRole || null);

    const merged = { 
      ...existing, 
      ...req.body, 
      group: targetGroup,
      employeeType: finalEmployeeType,
      emergencyPhone: finalEmergencyPhone,
      bloodGroup: finalBloodGroup,
      dob: finalDob,
      companyAddress: finalCompanyAddress,
      companyPhone: finalCompanyPhone,
      companyEmail: finalCompanyEmail,
      companyWebsite: finalCompanyWebsite,
      signatoryName: finalSignatoryName,
      signatoryRole: finalSignatoryRole,
    };

    db.prepare(`
      UPDATE team_members 
      SET empCode = ?, name = ?, avatar = ?, role = ?, groupName = ?, phone = ?, 
          attendanceStatus = ?, checkInTime = ?, checkInMethod = ?, dialsToday = ?, 
          goalCalls = ?, connected = ?, interested = ?, salesAchieved = ?, 
          salesTarget = ?, conversionRate = ?, portal = ?, email = ?,
          password = ?,
          active = ?, deactivatedOn = ?,
          bankName = ?, bankAccountNumber = ?, bankIfscCode = ?,
          panDocumentName = ?, panDocumentUrl = ?,
          aadhaarDocumentName = ?, aadhaarDocumentUrl = ?,
          salary = ?, joiningDate = ?, address = ?, bloodGroup = ?,
          dob = ?, emergencyPhone = ?, employeeType = ?,
          companyAddress = ?, companyPhone = ?, companyEmail = ?, companyWebsite = ?,
          signatoryName = ?, signatoryRole = ?
      WHERE id = ? OR empCode = ?
    `).run(
      merged.empCode, merged.name, merged.avatar, merged.role, targetGroup, merged.phone,
      merged.attendanceStatus, merged.checkInTime, merged.checkInMethod, merged.dialsToday,
      merged.goalCalls, merged.connected, merged.interested, merged.salesAchieved,
      merged.salesTarget, merged.conversionRate,
      merged.portal || 'telecaller', merged.email ?? null,
      merged.password || existing.password || 'Trade@1234',
      merged.active === 0 ? 0 : 1, merged.deactivatedOn ?? null,
      merged.bankName ?? null, merged.bankAccountNumber ?? null, merged.bankIfscCode ?? null,
      merged.panDocumentName ?? null, merged.panDocumentUrl ?? null,
      merged.aadhaarDocumentName ?? null, merged.aadhaarDocumentUrl ?? null,
      merged.salary != null ? Number(merged.salary) : null, merged.joiningDate ?? null, merged.address ?? null,
      finalBloodGroup,
      finalDob,
      finalEmergencyPhone,
      finalEmployeeType,
      finalCompanyAddress,
      finalCompanyPhone,
      finalCompanyEmail,
      finalCompanyWebsite,
      finalSignatoryName,
      finalSignatoryRole,
      existing.id, existing.empCode
    );

    // Also update employee_profiles if present
    try {
      db.prepare(`
        UPDATE employee_profiles
        SET name = ?, roleTitle = ?, department = ?, teamName = ?, email = ?, phone = ?, joinDate = coalesce(?, joinDate), bloodGroup = coalesce(?, bloodGroup), dob = coalesce(?, dob), avatar = coalesce(?, avatar), emergencyPhone = coalesce(?, emergencyPhone)
        WHERE id = ? OR empCode = ?
      `).run(merged.name, merged.role, targetGroup, targetGroup, merged.email, merged.phone, merged.joiningDate || null, finalBloodGroup, finalDob, merged.avatar || null, finalEmergencyPhone, existing.id, existing.empCode);
    } catch {}

    // Synchronize squad member counts in team_groups
    try {
      db.prepare(`
        UPDATE team_groups
        SET memberCount = (
          SELECT COUNT(*) FROM team_members 
          WHERE LOWER(team_members.groupName) = LOWER(team_groups.name) 
          AND team_members.active = 1
        )
      `).run();
    } catch (_) {}

    // Sync password to users table if a new plain-text password was provided
    if (req.body.password) {
      try {
        const newHash = hashPassword(req.body.password);
        // Update by employeeId first, then fall back to empCode
        const affected = db.prepare(`
          UPDATE users SET passwordHash = ?, name = ? WHERE employeeId = ?
        `).run(newHash, merged.name, existing.id);
        if ((affected as any).changes === 0) {
          db.prepare(`
            UPDATE users SET passwordHash = ?, name = ? WHERE empCode = ?
          `).run(newHash, merged.name, existing.empCode);
        }
      } catch (_) {}
    }

    const updated = db.prepare(`
      SELECT id, empCode, name, avatar, role, groupName as "group", phone, emergencyPhone, dob, employeeType, 
             attendanceStatus, checkInTime, checkInMethod, dialsToday, goalCalls, connected, interested, 
             salesAchieved, salesTarget, conversionRate, portal, email, password, active, deactivatedOn, 
             bankName, bankAccountNumber, bankIfscCode, panDocumentName, panDocumentUrl, 
             aadhaarDocumentName, aadhaarDocumentUrl, salary, joiningDate, address, bloodGroup,
             companyAddress, companyPhone, companyEmail, companyWebsite, signatoryName, signatoryRole 
      FROM team_members 
      WHERE id = ? OR empCode = ?
    `).get(existing.id, merged.empCode || existing.empCode);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/team-members/:id (Admin Only)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Only Admin can delete employees
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only Admin can delete employees' });
    }

    // Find target employee by id or empCode
    const existing = (db.prepare(`
      SELECT id, empCode, name, groupName, portal, email 
      FROM team_members 
      WHERE id = ? OR empCode = ?
    `).get(id, id) || db.prepare(`
      SELECT id, empCode, name, teamName as groupName, email 
      FROM employee_profiles 
      WHERE id = ? OR empCode = ?
    `).get(id, id)) as any;

    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Safety: Protect Super Admin accounts from deletion
    const isSuperAdmin = 
      existing.portal === 'admin' || 
      existing.empCode === 'TNX-AD01' || 
      (existing.email && existing.email.toLowerCase() === 'sagarsuchi26@gmail.com') ||
      (user && (user.employeeId === existing.id || user.empCode === existing.empCode));

    if (isSuperAdmin) {
      return res.status(400).json({ error: 'Super Admin account cannot be deleted' });
    }

    const empId = existing.id;
    const empCode = existing.empCode;
    const email = existing.email ? existing.email.toLowerCase().trim() : null;
    const name = existing.name;

    const deleteAtomic = db.transaction(() => {
      // 1. Delete from team_members
      db.prepare('DELETE FROM team_members WHERE id = ? OR empCode = ?').run(empId, empCode);

      // 2. Delete from employee_profiles
      db.prepare('DELETE FROM employee_profiles WHERE id = ? OR empCode = ?').run(empId, empCode);

      // 3. Delete from users (credentials), protecting admin accounts
      if (email) {
        db.prepare('DELETE FROM users WHERE (employeeId = ? OR empCode = ? OR LOWER(email) = ?) AND role != ?').run(empId, empCode, email, 'admin');
      } else {
        db.prepare('DELETE FROM users WHERE (employeeId = ? OR empCode = ?) AND role != ?').run(empId, empCode, 'admin');
      }

      // 4. Delete face biometric profiles
      try {
        db.prepare('DELETE FROM face_biometric_profiles WHERE employeeId = ? OR employeeName = ?').run(empId, name);
      } catch (_) {}

      // 5. Delete employee documents
      try {
        db.prepare('DELETE FROM employee_documents WHERE employeeId = ?').run(empId);
      } catch (_) {}

      // 6. Delete call logs belonging to this employee
      try {
        db.prepare(`DELETE FROM call_logs WHERE employeeId = ? OR employeeId = ?`).run(empId, empCode);
      } catch (_) {}

      // 7. Delete attendance records for this employee
      try {
        db.prepare(`DELETE FROM attendance_records WHERE employeeId = ? OR employeeId = ? OR LOWER(employeeName) = LOWER(?)`).run(empId, empCode, name);
      } catch (_) {}

      // 8. Delete payment verifications (won deal submissions) by this employee
      try {
        db.prepare(`DELETE FROM payment_verifications WHERE LOWER(telecallerName) = LOWER(?)`).run(name);
      } catch (_) {}

      // 9. Delete leave requests submitted by this employee
      try {
        db.prepare(`DELETE FROM leave_requests WHERE LOWER(employeeName) = LOWER(?) OR employeeCode = ?`).run(name, empCode);
      } catch (_) {}

      // 10. Delete or unassign assigned leads so leads are not orphaned
      try {
        db.prepare(`
          UPDATE assigned_leads 
          SET assignedToEmployeeId = '', assignedToEmployeeName = 'Unassigned' 
          WHERE assignedToEmployeeId = ? OR assignedToEmployeeId = ? OR LOWER(assignedToEmployeeName) = LOWER(?)
        `).run(empId, empCode, name);
      } catch (_) {}

      // 11. If this person is a Team Leader of any team, clear the leader in team_groups
      try {
        db.prepare(`
          UPDATE team_groups 
          SET leaderName = '', leaderEmpCode = '' 
          WHERE leaderEmpCode = ? OR LOWER(leaderName) = LOWER(?)
        `).run(empCode, name);
      } catch (_) {}

      // 12. Delete offer letters belonging to this candidate/employee
      try {
        db.prepare(`
          DELETE FROM offer_letters 
          WHERE LOWER(candidateName) = LOWER(?) OR (candidateEmail IS NOT NULL AND LOWER(candidateEmail) = LOWER(?))
        `).run(name, email || '');
      } catch (_) {}

      // 13. Delete payslips belonging to this employee
      try {
        db.prepare(`
          DELETE FROM payslips 
          WHERE employeeId = ? OR empCode = ? OR LOWER(employeeName) = LOWER(?)
        `).run(empId, empCode, name);
      } catch (_) {}

      // 14. Update team groups member count
      try {
        db.prepare(`
          UPDATE team_groups 
          SET memberCount = (
            SELECT COUNT(*) FROM team_members WHERE LOWER(groupName) = LOWER(team_groups.name)
          )
        `).run();
      } catch (_) {}
    });

    deleteAtomic();

    console.log(`[Admin Action] Deleted employee: ${name} (${empCode}) [ID: ${empId}]`);

    return res.status(200).json({
      success: true,
      deletedId: empId,
      empCode,
      name,
      message: `Employee ${name} (${empCode}) permanently deleted.`
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
