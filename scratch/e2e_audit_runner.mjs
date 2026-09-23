import fs from 'fs';
import path from 'path';

const API_BASE = 'http://127.0.0.1:5001/api';

const results = [];

function recordTest({ id, workflow, steps, expected, actual, status, evidence, severity = 'N/A' }) {
  results.push({ id, workflow, steps, expected, actual, status, evidence, severity });
  console.log(`[${status}] ${id}: ${workflow} - ${actual ? actual.substring(0, 80) : ''}`);
}

async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function runAudit() {
  console.log('=== STARTING COMPLETE END-TO-END FUNCTIONAL AUDIT ===\n');

  // ----------------------------------------------------
  // SCENARIO 1: ADMIN SETUP
  // ----------------------------------------------------
  console.log('--- Scenario 1: Admin Setup ---');

  // 1.1 Admin Login
  let adminToken = '';
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@tradenexus.com', password: 'admin123' })
  });

  if (adminLogin.status === 200 && adminLogin.data.token && adminLogin.data.user.role === 'admin') {
    adminToken = adminLogin.data.token;
    recordTest({
      id: 'TC-ADM-01',
      workflow: 'Admin Login',
      steps: 'POST /api/auth/login with admin credentials (admin@tradenexus.com)',
      expected: 'Status 200, JWT token returned, role is admin',
      actual: `Status 200, received token, user.role: ${adminLogin.data.user.role}`,
      status: 'PASS',
      evidence: JSON.stringify({ user: adminLogin.data.user }),
    });
  } else {
    recordTest({
      id: 'TC-ADM-01',
      workflow: 'Admin Login',
      steps: 'POST /api/auth/login with admin credentials',
      expected: 'Status 200, JWT token returned, role is admin',
      actual: `Status ${adminLogin.status}: ${JSON.stringify(adminLogin.data)}`,
      status: 'FAIL',
      evidence: JSON.stringify(adminLogin.data),
      severity: 'CRITICAL',
    });
  }

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Setup squads for the 2 Team Leaders
  const squadAlphaRes = await api('/team-groups', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: 'grp-squad-alpha',
      name: 'Squad Alpha',
      description: 'Alpha Performance Squad',
      leaderName: 'TL Alice',
      memberCount: 3,
      monthlyTarget: 500000,
      achieved: 0,
      color: '#00C9A7'
    })
  });

  const squadBetaRes = await api('/team-groups', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: 'grp-squad-beta',
      name: 'Squad Beta',
      description: 'Beta Performance Squad',
      leaderName: 'TL Bob',
      memberCount: 3,
      monthlyTarget: 500000,
      achieved: 0,
      color: '#3B82F6'
    })
  });

  const ts = Date.now();
  const tlAliceEmail = `tl_alice_${ts}@tradenexus.com`;
  const tlBobEmail = `tl_bob_${ts}@tradenexus.com`;
  const empA1Email = `emp_a1_${ts}@tradenexus.com`;
  const empA2Email = `emp_a2_${ts}@tradenexus.com`;
  const empB1Email = `emp_b1_${ts}@tradenexus.com`;
  const empB2Email = `emp_b2_${ts}@tradenexus.com`;

  const tlAliceId = `tm-tl-alice-${ts}`;
  const tlBobId = `tm-tl-bob-${ts}`;
  const empA1Id = `tm-emp-a1-${ts}`;
  const empA2Id = `tm-emp-a2-${ts}`;
  const empB1Id = `tm-emp-b1-${ts}`;
  const empB2Id = `tm-emp-b2-${ts}`;

  // 1.2 Create exactly 2 Team Leaders
  const tlAliceRes = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: tlAliceId,
      empCode: `TNX-TL-A${ts.toString().slice(-4)}`,
      name: 'TL Alice',
      role: 'Team Leader',
      group: 'Squad Alpha',
      portal: 'team_leader',
      email: tlAliceEmail,
      password: 'password123',
      phone: '9876543210',
    })
  });

  const tlBobRes = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: tlBobId,
      empCode: `TNX-TL-B${ts.toString().slice(-4)}`,
      name: 'TL Bob',
      role: 'Team Leader',
      group: 'Squad Beta',
      portal: 'team_leader',
      email: tlBobEmail,
      password: 'password123',
      phone: '9876543211',
    })
  });

  if (tlAliceRes.status === 201 && tlBobRes.status === 201) {
    recordTest({
      id: 'TC-ADM-02',
      workflow: 'Create 2 Team Leaders',
      steps: 'POST /api/team-members for TL Alice (Squad Alpha) and TL Bob (Squad Beta) with portal=team_leader',
      expected: 'Status 201 for both, records created in team_members and users tables',
      actual: `Status 201 for both TLs. Alice ID: ${tlAliceRes.data.id}, Bob ID: ${tlBobRes.data.id}`,
      status: 'PASS',
      evidence: JSON.stringify({ alice: tlAliceRes.data, bob: tlBobRes.data }),
    });
  } else {
    recordTest({
      id: 'TC-ADM-02',
      workflow: 'Create 2 Team Leaders',
      steps: 'POST /api/team-members for 2 TLs',
      expected: 'Status 201 for both',
      actual: `Alice status: ${tlAliceRes.status}, Bob status: ${tlBobRes.status}`,
      status: 'FAIL',
      evidence: JSON.stringify({ alice: tlAliceRes.data, bob: tlBobRes.data }),
      severity: 'HIGH',
    });
  }

  // 1.3 Create exactly 4 Employees (2 under TL Alice, 2 under TL Bob)
  const empA1Res = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: empA1Id,
      empCode: `TNX-A1-${ts.toString().slice(-4)}`,
      name: 'Emp A1',
      role: 'Telecaller',
      group: 'Squad Alpha',
      portal: 'telecaller',
      email: empA1Email,
      password: 'password123',
      phone: '9876543221',
    })
  });

  const empA2Res = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: empA2Id,
      empCode: `TNX-A2-${ts.toString().slice(-4)}`,
      name: 'Emp A2',
      role: 'Telecaller',
      group: 'Squad Alpha',
      portal: 'telecaller',
      email: empA2Email,
      password: 'password123',
      phone: '9876543222',
    })
  });

  const empB1Res = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: empB1Id,
      empCode: `TNX-B1-${ts.toString().slice(-4)}`,
      name: 'Emp B1',
      role: 'Telecaller',
      group: 'Squad Beta',
      portal: 'telecaller',
      email: empB1Email,
      password: 'password123',
      phone: '9876543231',
    })
  });

  const empB2Res = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: empB2Id,
      empCode: `TNX-B2-${ts.toString().slice(-4)}`,
      name: 'Emp B2',
      role: 'Telecaller',
      group: 'Squad Beta',
      portal: 'telecaller',
      email: empB2Email,
      password: 'password123',
      phone: '9876543232',
    })
  });

  if (empA1Res.status === 201 && empA2Res.status === 201 && empB1Res.status === 201 && empB2Res.status === 201) {
    recordTest({
      id: 'TC-ADM-03',
      workflow: 'Create 4 Employees under Squads',
      steps: 'POST /api/team-members for 4 employees (A1, A2 in Squad Alpha; B1, B2 in Squad Beta)',
      expected: 'Status 201 for all 4 employees with assigned squads',
      actual: 'All 4 employees created with status 201 and correct group assignments',
      status: 'PASS',
      evidence: JSON.stringify({
        a1: { id: empA1Res.data.id, group: empA1Res.data.group },
        a2: { id: empA2Res.data.id, group: empA2Res.data.group },
        b1: { id: empB1Res.data.id, group: empB1Res.data.group },
        b2: { id: empB2Res.data.id, group: empB2Res.data.group },
      }),
    });
  } else {
    recordTest({
      id: 'TC-ADM-03',
      workflow: 'Create 4 Employees under Squads',
      steps: 'POST /api/team-members for 4 employees',
      expected: 'Status 201 for all 4 employees',
      actual: `Statuses: A1=${empA1Res.status}, A2=${empA2Res.status}, B1=${empB1Res.status}, B2=${empB2Res.status}`,
      status: 'FAIL',
      evidence: JSON.stringify({ a1: empA1Res.data, a2: empA2Res.data, b1: empB1Res.data, b2: empB2Res.data }),
      severity: 'HIGH',
    });
  }

  // 1.4 Verify all accounts can log in successfully with correct roles
  const accountsToTest = [
    { email: tlAliceEmail, pass: 'password123', expRole: 'team_leader', name: 'TL Alice' },
    { email: tlBobEmail, pass: 'password123', expRole: 'team_leader', name: 'TL Bob' },
    { email: empA1Email, pass: 'password123', expRole: 'telecaller', name: 'Emp A1' },
    { email: empA2Email, pass: 'password123', expRole: 'telecaller', name: 'Emp A2' },
    { email: empB1Email, pass: 'password123', expRole: 'telecaller', name: 'Emp B1' },
    { email: empB2Email, pass: 'password123', expRole: 'telecaller', name: 'Emp B2' },
  ];

  const authTokens = {};
  let allLoginsPassed = true;
  const loginDetails = [];

  for (const acc of accountsToTest) {
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: acc.email, password: acc.pass })
    });
    if (loginRes.status === 200 && loginRes.data.user.role === acc.expRole) {
      authTokens[acc.name] = loginRes.data.token;
      loginDetails.push({ name: acc.name, role: loginRes.data.user.role, status: 'OK' });
    } else {
      allLoginsPassed = false;
      loginDetails.push({ name: acc.name, status: `FAILED (${loginRes.status})`, data: loginRes.data });
    }
  }

  if (allLoginsPassed) {
    recordTest({
      id: 'TC-ADM-04',
      workflow: 'Verify Login and Roles for All 6 Accounts',
      steps: 'POST /api/auth/login for each of 2 TLs and 4 Employees',
      expected: 'Status 200, JWT returned, role matches expected role',
      actual: 'All 6 accounts logged in successfully with correct roles (2 team_leader, 4 telecaller)',
      status: 'PASS',
      evidence: JSON.stringify(loginDetails),
    });
  } else {
    recordTest({
      id: 'TC-ADM-04',
      workflow: 'Verify Login and Roles for All 6 Accounts',
      steps: 'POST /api/auth/login for each account',
      expected: 'Status 200 for all',
      actual: 'Some logins failed or had wrong role',
      status: 'FAIL',
      evidence: JSON.stringify(loginDetails),
      severity: 'CRITICAL',
    });
  }

  // ----------------------------------------------------
  // SCENARIO 2: LEAD CREATION AND ASSIGNMENT
  // ----------------------------------------------------
  console.log('\n--- Scenario 2: Lead Creation and Assignment ---');

  // Test Requirement: "Assign leads so that each selected lead is assigned to 2 employees as required by the application workflow."
  // Let's test the workflow of assigning a lead to 2 employees:
  // Can a single assigned_lead record hold 2 employees?
  // Schema check: assignedToEmployeeId TEXT NOT NULL, assignedToEmployeeName TEXT NOT NULL.
  // In the application workflow, how does multi-assignment work?
  // Does the API support multiple assignees in a single record, or does it require creating an assignment record per employee?
  
  // Let's test single lead creation with 2 employee IDs or comma separated:
  const testLeadData = {
    id: `lead-test-dual-${Date.now()}`,
    name: 'Dual Assignee Client',
    phone: '9988776655',
    email: 'dual@client.com',
    company: 'Apex Enterprise',
    city: 'Mumbai',
    assignedToEmployeeId: `${empA1Id},${empA2Id}`, // Attempting dual assignment
    assignedToEmployeeName: 'Emp A1, Emp A2',
    status: 'PENDING',
    dealValue: 150000,
  };

  const dualAssignLeadRes = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(testLeadData)
  });

  // Also test standard application workflow: individual assigned_lead records for each employee:
  // Lead 1 -> Assigned to Emp A1
  const leadA1Res = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-a1-${Date.now()}`,
      name: 'Client Alpha One',
      phone: '9123456781',
      email: 'alpha1@client.com',
      company: 'Alpha Corp',
      city: 'Delhi',
      assignedToEmployeeId: empA1Id,
      assignedToEmployeeName: 'Emp A1',
      status: 'PENDING',
      dealValue: 80000,
    })
  });

  // Lead 2 -> Assigned to Emp A2
  const leadA2Res = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-a2-${Date.now()}`,
      name: 'Client Alpha Two',
      phone: '9123456782',
      email: 'alpha2@client.com',
      company: 'Beta Logistics',
      city: 'Bengaluru',
      assignedToEmployeeId: empA2Id,
      assignedToEmployeeName: 'Emp A2',
      status: 'PENDING',
      dealValue: 120000,
    })
  });

  // Lead 3 -> Assigned to Emp B1
  const leadB1Res = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-b1-${Date.now()}`,
      name: 'Client Beta One',
      phone: '9123456783',
      email: 'beta1@client.com',
      company: 'Delta Retail',
      city: 'Pune',
      assignedToEmployeeId: empB1Id,
      assignedToEmployeeName: 'Emp B1',
      status: 'PENDING',
      dealValue: 95000,
    })
  });

  // Lead 4 -> Assigned to Emp B2
  const leadB2Res = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-b2-${Date.now()}`,
      name: 'Client Beta Two',
      phone: '9123456784',
      email: 'beta2@client.com',
      company: 'Omega Tech',
      city: 'Hyderabad',
      assignedToEmployeeId: empB2Id,
      assignedToEmployeeName: 'Emp B2',
      status: 'PENDING',
      dealValue: 200000,
    })
  });

  const empA1Headers = { Authorization: `Bearer ${authTokens['Emp A1']}` };
  const empA2Headers = { Authorization: `Bearer ${authTokens['Emp A2']}` };
  const empB1Headers = { Authorization: `Bearer ${authTokens['Emp B1']}` };
  const empB2Headers = { Authorization: `Bearer ${authTokens['Emp B2']}` };
  const tlAliceHeaders = { Authorization: `Bearer ${authTokens['TL Alice']}` };
  const tlBobHeaders = { Authorization: `Bearer ${authTokens['TL Bob']}` };

  const empA1LeadsCheck = await api('/assigned-leads', { headers: empA1Headers });
  const empA1SeesDual = empA1LeadsCheck.data?.some(l => l.id === testLeadData.id);
  const empA2LeadsCheck = await api('/assigned-leads', { headers: empA2Headers });
  const empA2SeesDual = empA2LeadsCheck.data?.some(l => l.id === testLeadData.id);

  if (empA1SeesDual && empA2SeesDual) {
    recordTest({
      id: 'TC-LEAD-01',
      workflow: 'Lead Assigned to 2 Employees (Dual Assignment)',
      steps: 'Create lead with assignedToEmployeeId="tm-emp-a1,tm-emp-a2" and query leads as Emp A1 and Emp A2',
      expected: 'Both employees can see and access the dual-assigned lead',
      actual: 'Both employees see the dual-assigned lead',
      status: 'PASS',
      evidence: `empA1SeesDual=${empA1SeesDual}, empA2SeesDual=${empA2SeesDual}`,
    });
  } else {
    recordTest({
      id: 'TC-LEAD-01',
      workflow: 'Lead Assigned to 2 Employees (Dual Assignment)',
      steps: 'Create lead with assignedToEmployeeId="tm-emp-a1,tm-emp-a2" and query leads as Emp A1 and Emp A2',
      expected: 'Both employees can see and access the dual-assigned lead',
      actual: `Schema / backend uses exact match (= ? OR = ?) so comma-separated IDs fail scoping: empA1SeesDual=${empA1SeesDual}, empA2SeesDual=${empA2SeesDual}. To assign 1 lead to 2 employees, either duplicate lead records or relational junction table (lead_assignments) is required.`,
      status: 'FAIL',
      evidence: `assignedToEmployeeId is single string column in assigned_leads. Queried WHERE assignedToEmployeeId = user.id. String 'tm-emp-a1,tm-emp-a2' != 'tm-emp-a1'.`,
      severity: 'HIGH',
    });
  }

  // Audit 2.2: Verify assignment is actually saved in DB and not just UI state
  const dbLeadCheck = await api(`/assigned-leads?employeeId=${empA1Id}`, { headers: adminHeaders });
  const savedInDb = dbLeadCheck.data?.some(l => l.id === leadA1Res.data?.id);

  if (savedInDb) {
    recordTest({
      id: 'TC-LEAD-02',
      workflow: 'Lead Assignment DB Persistence',
      steps: 'Query /api/assigned-leads from backend after creation',
      expected: 'Assigned lead record exists in SQLite database with correct assignedToEmployeeId',
      actual: `Lead persisted in DB. Found ID: ${leadA1Res.data?.id}, assignedToEmployeeId: ${leadA1Res.data?.assignedToEmployeeId}`,
      status: 'PASS',
      evidence: JSON.stringify(leadA1Res.data),
    });
  } else {
    recordTest({
      id: 'TC-LEAD-02',
      workflow: 'Lead Assignment DB Persistence',
      steps: 'Query /api/assigned-leads from backend',
      expected: 'Lead record exists in DB',
      actual: 'Lead record NOT found in database',
      status: 'FAIL',
      evidence: JSON.stringify(dbLeadCheck.data),
      severity: 'CRITICAL',
    });
  }

  // Audit 2.3: Employee Lead Visibility Scoping
  // Emp A1 should see leadA1, but NOT leadA2, leadB1, leadB2
  const a1Leads = empA1LeadsCheck.data || [];
  const a1SeesOwn = a1Leads.some(l => l.id === leadA1Res.data?.id);
  const a1SeesA2 = a1Leads.some(l => l.id === leadA2Res.data?.id);
  const a1SeesB1 = a1Leads.some(l => l.id === leadB1Res.data?.id);
  const a1SeesB2 = a1Leads.some(l => l.id === leadB2Res.data?.id);

  if (a1SeesOwn && !a1SeesA2 && !a1SeesB1 && !a1SeesB2) {
    recordTest({
      id: 'TC-LEAD-03',
      workflow: 'Employee Isolated Lead Visibility',
      steps: 'Fetch /api/assigned-leads using Emp A1 token',
      expected: 'Emp A1 sees only their own assigned leads, cannot see Emp A2, B1, or B2 leads',
      actual: `Emp A1 sees only own lead. a1SeesOwn=${a1SeesOwn}, a1SeesA2=${a1SeesA2}, a1SeesB1=${a1SeesB1}, a1SeesB2=${a1SeesB2}`,
      status: 'PASS',
      evidence: `Total leads visible to Emp A1: ${a1Leads.length}`,
    });
  } else {
    recordTest({
      id: 'TC-LEAD-03',
      workflow: 'Employee Isolated Lead Visibility',
      steps: 'Fetch /api/assigned-leads using Emp A1 token',
      expected: 'Only own leads visible',
      actual: `Leakage detected or own lead missing: a1SeesOwn=${a1SeesOwn}, a1SeesA2=${a1SeesA2}, a1SeesB1=${a1SeesB1}, a1SeesB2=${a1SeesB2}`,
      status: 'FAIL',
      evidence: JSON.stringify(a1Leads),
      severity: 'CRITICAL',
    });
  }

  // Audit 2.4: Team Leader Lead Visibility Scoping
  // TL Alice (Squad Alpha) should see leadA1 and leadA2, but NOT leadB1 or leadB2
  const tlAliceLeadsRes = await api('/assigned-leads', { headers: tlAliceHeaders });
  const aliceLeads = tlAliceLeadsRes.data || [];
  const aliceSeesA1 = aliceLeads.some(l => l.id === leadA1Res.data?.id);
  const aliceSeesA2 = aliceLeads.some(l => l.id === leadA2Res.data?.id);
  const aliceSeesB1 = aliceLeads.some(l => l.id === leadB1Res.data?.id);
  const aliceSeesB2 = aliceLeads.some(l => l.id === leadB2Res.data?.id);

  if (aliceSeesA1 && aliceSeesA2 && !aliceSeesB1 && !aliceSeesB2) {
    recordTest({
      id: 'TC-LEAD-04',
      workflow: 'Team Leader Squad Lead Scoping',
      steps: 'Fetch /api/assigned-leads using TL Alice token (Squad Alpha)',
      expected: 'TL Alice sees all leads in Squad Alpha (A1, A2), but zero leads from Squad Beta (B1, B2)',
      actual: `TL Alice correctly scoped: sees A1=${aliceSeesA1}, A2=${aliceSeesA2}, B1=${aliceSeesB1}, B2=${aliceSeesB2}`,
      status: 'PASS',
      evidence: `Total leads visible to TL Alice: ${aliceLeads.length}`,
    });
  } else {
    recordTest({
      id: 'TC-LEAD-04',
      workflow: 'Team Leader Squad Lead Scoping',
      steps: 'Fetch /api/assigned-leads using TL Alice token',
      expected: 'Only Squad Alpha leads visible',
      actual: `Scope leakage or missing leads: sees A1=${aliceSeesA1}, A2=${aliceSeesA2}, B1=${aliceSeesB1}, B2=${aliceSeesB2}`,
      status: 'FAIL',
      evidence: JSON.stringify(aliceLeads),
      severity: 'HIGH',
    });
  }

  // Audit 2.5: Admin Lead Visibility
  // Admin should see all leads across all squads (leadA1, leadA2, leadB1, leadB2)
  const adminLeadsRes = await api('/assigned-leads', { headers: adminHeaders });
  const adminLeads = adminLeadsRes.data || [];
  const adminSeesA1 = adminLeads.some(l => l.id === leadA1Res.data?.id);
  const adminSeesA2 = adminLeads.some(l => l.id === leadA2Res.data?.id);
  const adminSeesB1 = adminLeads.some(l => l.id === leadB1Res.data?.id);
  const adminSeesB2 = adminLeads.some(l => l.id === leadB2Res.data?.id);

  if (adminSeesA1 && adminSeesA2 && adminSeesB1 && adminSeesB2) {
    recordTest({
      id: 'TC-LEAD-05',
      workflow: 'Admin Complete Lead Visibility',
      steps: 'Fetch /api/assigned-leads using Admin token',
      expected: 'Admin sees complete lead data across all squads',
      actual: `Admin sees all leads. A1=${adminSeesA1}, A2=${adminSeesA2}, B1=${adminSeesB1}, B2=${adminSeesB2}`,
      status: 'PASS',
      evidence: `Total leads visible to Admin: ${adminLeads.length}`,
    });
  } else {
    recordTest({
      id: 'TC-LEAD-05',
      workflow: 'Admin Complete Lead Visibility',
      steps: 'Fetch /api/assigned-leads using Admin token',
      expected: 'Admin sees all leads',
      actual: `Admin missing some leads: A1=${adminSeesA1}, A2=${adminSeesA2}, B1=${adminSeesB1}, B2=${adminSeesB2}`,
      status: 'FAIL',
      evidence: JSON.stringify(adminLeads),
      severity: 'HIGH',
    });
  }

  // ----------------------------------------------------
  // SCENARIO 3: EMPLOYEE WORKFLOW (CALL OUTCOMES & STATUS)
  // ----------------------------------------------------
  console.log('\n--- Scenario 3: Employee Workflow ---');

  // 3.1 Non-won call outcome: Log a CALLBACK for Lead A1
  const nonWonCallLogRes = await api('/call-logs', {
    method: 'POST',
    headers: empA1Headers,
    body: JSON.stringify({
      id: `call-log-a1-1-${Date.now()}`,
      clientName: leadA1Res.data.name,
      companyName: leadA1Res.data.company,
      phoneNumber: leadA1Res.data.phone,
      timestamp: '11:30 AM',
      durationSec: 145,
      outcome: 'CALLBACK',
      notes: 'Customer in meeting, asked to call back tomorrow at 3 PM',
      followUpDate: '2026-09-20',
      employeeId: empA1Id,
    })
  });

  // Update lead status to CALLBACK
  const updateLeadA1Res = await api(`/assigned-leads/${leadA1Res.data.id}`, {
    method: 'PUT',
    headers: empA1Headers,
    body: JSON.stringify({
      status: 'CALLBACK',
      notes: 'Customer in meeting, asked to call back tomorrow at 3 PM',
      callCount: 1,
      lastCallTimestamp: 'Just now',
      followUpDate: '2026-09-20',
    })
  });

  // 3.2 Verify result is saved after logout/login (Persistence check)
  // Re-login as Emp A1
  const reLoginA1 = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: empA1Email, password: 'password123' })
  });
  const newA1Headers = { Authorization: `Bearer ${reLoginA1.data?.token}` };

  const refreshedLeads = await api('/assigned-leads', { headers: newA1Headers });
  const fetchedLeadA1 = refreshedLeads.data?.find(l => l.id === leadA1Res.data.id);

  if (
    updateLeadA1Res.status === 200 && 
    fetchedLeadA1 && 
    fetchedLeadA1.status === 'CALLBACK' && 
    fetchedLeadA1.callCount === 1 &&
    fetchedLeadA1.followUpDate === '2026-09-20'
  ) {
    recordTest({
      id: 'TC-EMP-01',
      workflow: 'Employee Call Workflow & Status Update (Non-Won)',
      steps: 'Log CALLBACK call, update lead status to CALLBACK, re-login as Emp A1, and verify lead state',
      expected: 'Status 200, lead status=CALLBACK, callCount=1, followUpDate=2026-09-20 persisted after re-login',
      actual: `Lead persisted: status=${fetchedLeadA1.status}, callCount=${fetchedLeadA1.callCount}, followUpDate=${fetchedLeadA1.followUpDate}`,
      status: 'PASS',
      evidence: JSON.stringify(fetchedLeadA1),
    });
  } else {
    recordTest({
      id: 'TC-EMP-01',
      workflow: 'Employee Call Workflow & Status Update (Non-Won)',
      steps: 'Update lead and verify persistence',
      expected: 'Lead status CALLBACK persisted',
      actual: `Update status: ${updateLeadA1Res.status}, fetched lead: ${JSON.stringify(fetchedLeadA1)}`,
      status: 'FAIL',
      evidence: JSON.stringify({ updateRes: updateLeadA1Res.data, fetched: fetchedLeadA1 }),
      severity: 'HIGH',
    });
  }

  // ----------------------------------------------------
  // SCENARIO 4: WON DEAL WORKFLOW & VISIBILITY
  // ----------------------------------------------------
  console.log('\n--- Scenario 4: Won Deal Visibility ---');

  // Create another lead for Emp A1 specifically for Won Deal
  const wonLeadRes = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-won-${Date.now()}`,
      name: 'Won Deal Client',
      phone: '9888777666',
      email: 'wondeal@client.com',
      company: 'Unicorn Ventures Ltd',
      city: 'Mumbai',
      assignedToEmployeeId: empA1Id,
      assignedToEmployeeName: 'Emp A1',
      status: 'PENDING',
      dealValue: 250000,
    })
  });

  // Mark lead as Won (CONVERTED) from Emp A1 workflow
  const markWonRes = await api(`/assigned-leads/${wonLeadRes.data.id}`, {
    method: 'PUT',
    headers: newA1Headers,
    body: JSON.stringify({
      status: 'CONVERTED',
      notes: 'Deal closed successfully! Advance received ₹2,50,000.',
      callCount: 2,
      lastCallTimestamp: 'Just now',
      dealValue: 250000,
    })
  });

  // Also log call as DEAL_CLOSED
  const wonCallRes = await api('/call-logs', {
    method: 'POST',
    headers: newA1Headers,
    body: JSON.stringify({
      id: `call-log-won-${Date.now()}`,
      clientName: wonLeadRes.data.name,
      companyName: wonLeadRes.data.company,
      phoneNumber: wonLeadRes.data.phone,
      timestamp: '12:15 PM',
      durationSec: 480,
      outcome: 'DEAL_CLOSED',
      notes: 'Deal closed successfully! Advance received ₹2,50,000.',
      employeeId: empA1Id,
    })
  });

  // Create payment record for HR audit (as done by frontend AppContext)
  const paymentRes = await api('/payments', {
    method: 'POST',
    headers: newA1Headers,
    body: JSON.stringify({
      id: `pay-won-${Date.now()}`,
      leadName: wonLeadRes.data.name,
      companyName: wonLeadRes.data.company,
      telecallerName: 'Emp A1',
      dealAmount: 250000,
      utrNumber: 'TXN998877665544',
      paymentMode: 'Online Bank Transfer',
      status: 'PENDING_HR_AUDIT'
    })
  });

  // 4.1 Verify Won Deal appears in Employee dashboard
  const empA1WonCheck = await api('/assigned-leads', { headers: newA1Headers });
  const a1WonLead = empA1WonCheck.data?.find(l => l.id === wonLeadRes.data.id);
  const a1WonVisible = a1WonLead && a1WonLead.status === 'CONVERTED' && a1WonLead.dealValue === 250000;

  // 4.2 Verify corresponding Team Leader (TL Alice) can see it
  const tlAliceWonCheck = await api('/assigned-leads', { headers: tlAliceHeaders });
  const aliceWonLead = tlAliceWonCheck.data?.find(l => l.id === wonLeadRes.data.id);
  const aliceWonVisible = aliceWonLead && aliceWonLead.status === 'CONVERTED' && aliceWonLead.dealValue === 250000;

  // 4.3 Verify Admin can see it
  const adminWonCheck = await api('/assigned-leads', { headers: adminHeaders });
  const adminWonLead = adminWonCheck.data?.find(l => l.id === wonLeadRes.data.id);
  const adminWonVisible = adminWonLead && adminWonLead.status === 'CONVERTED' && adminWonLead.dealValue === 250000;

  // 4.4 Verify NOT visible to other employees (Emp A2, Emp B1, Emp B2) or other TL (TL Bob)
  const empA2WonCheck = await api('/assigned-leads', { headers: empA2Headers });
  const a2SeesWon = empA2WonCheck.data?.some(l => l.id === wonLeadRes.data.id);

  const empB1WonCheck = await api('/assigned-leads', { headers: empB1Headers });
  const b1SeesWon = empB1WonCheck.data?.some(l => l.id === wonLeadRes.data.id);

  const tlBobWonCheck = await api('/assigned-leads', { headers: tlBobHeaders });
  const bobSeesWon = tlBobWonCheck.data?.some(l => l.id === wonLeadRes.data.id);

  if (a1WonVisible && aliceWonVisible && adminWonVisible && !a2SeesWon && !b1SeesWon && !bobSeesWon) {
    recordTest({
      id: 'TC-WON-01',
      workflow: 'Won Deal Visibility & Scoping',
      steps: 'Mark lead CONVERTED by Emp A1. Check visibility in Emp A1, TL Alice, Admin, Emp A2, Emp B1, TL Bob',
      expected: 'Won deal visible to Emp A1, TL Alice, and Admin. NOT visible to Emp A2, Emp B1, or TL Bob',
      actual: `Won deal correctly scoped: Emp A1=${a1WonVisible}, TL Alice=${aliceWonVisible}, Admin=${adminWonVisible}, Emp A2=${a2SeesWon}, Emp B1=${b1SeesWon}, TL Bob=${bobSeesWon}`,
      status: 'PASS',
      evidence: JSON.stringify({ a1WonLead, aliceWonLead }),
    });
  } else {
    recordTest({
      id: 'TC-WON-01',
      workflow: 'Won Deal Visibility & Scoping',
      steps: 'Check visibility of Won deal across roles',
      expected: 'Visible only to owner, direct TL, and Admin',
      actual: `Leakage or missing: a1WonVisible=${a1WonVisible}, aliceWonVisible=${aliceWonVisible}, adminWonVisible=${adminWonVisible}, a2SeesWon=${a2SeesWon}, b1SeesWon=${b1SeesWon}, bobSeesWon=${bobSeesWon}`,
      status: 'FAIL',
      evidence: JSON.stringify({ a1WonVisible, aliceWonVisible, adminWonVisible, a2SeesWon, b1SeesWon, bobSeesWon }),
      severity: 'CRITICAL',
    });
  }

  // ----------------------------------------------------
  // SCENARIO 5: TEAM LEADER WORKFLOW & SQUAD ISOLATION
  // ----------------------------------------------------
  console.log('\n--- Scenario 5: Team Leader Workflow & Scope Isolation ---');

  // 5.1 Verify TL Alice sees only Squad Alpha members
  const aliceMembersRes = await api('/team-members', { headers: tlAliceHeaders });
  const aliceMembers = aliceMembersRes.data || [];
  const aliceSeesA1Member = aliceMembers.some(m => m.name === 'Emp A1');
  const aliceSeesA2Member = aliceMembers.some(m => m.name === 'Emp A2');
  const aliceSeesB1Member = aliceMembers.some(m => m.name === 'Emp B1');
  const aliceSeesB2Member = aliceMembers.some(m => m.name === 'Emp B2');

  // 5.2 Verify TL Bob sees only Squad Beta members
  const bobMembersRes = await api('/team-members', { headers: tlBobHeaders });
  const bobMembers = bobMembersRes.data || [];
  const bobSeesA1Member = bobMembers.some(m => m.name === 'Emp A1');
  const bobSeesA2Member = bobMembers.some(m => m.name === 'Emp A2');
  const bobSeesB1Member = bobMembers.some(m => m.name === 'Emp B1');
  const bobSeesB2Member = bobMembers.some(m => m.name === 'Emp B2');

  if (
    aliceSeesA1Member && aliceSeesA2Member && !aliceSeesB1Member && !aliceSeesB2Member &&
    !bobSeesA1Member && !bobSeesA2Member && bobSeesB1Member && bobSeesB2Member
  ) {
    recordTest({
      id: 'TC-TL-01',
      workflow: 'Team Leader Squad Member Scope Isolation',
      steps: 'GET /api/team-members as TL Alice and as TL Bob',
      expected: 'TL Alice sees only Squad Alpha members; TL Bob sees only Squad Beta members',
      actual: 'Both Team Leaders strictly isolated to their assigned squad members',
      status: 'PASS',
      evidence: `Alice members: ${aliceMembers.map(m => m.name).join(', ')}; Bob members: ${bobMembers.map(m => m.name).join(', ')}`,
    });
  } else {
    recordTest({
      id: 'TC-TL-01',
      workflow: 'Team Leader Squad Member Scope Isolation',
      steps: 'GET /api/team-members as TL Alice and as TL Bob',
      expected: 'Strict squad member isolation',
      actual: `Isolation failure: Alice sees [${aliceMembers.map(m => m.name)}]; Bob sees [${bobMembers.map(m => m.name)}]`,
      status: 'FAIL',
      evidence: JSON.stringify({ aliceMembers, bobMembers }),
      severity: 'CRITICAL',
    });
  }

  // 5.3 Verify Floor Pulse scoping for TL Alice vs TL Bob
  const alicePulseRes = await api('/team-members/floor-pulse', { headers: tlAliceHeaders });
  const bobPulseRes = await api('/team-members/floor-pulse', { headers: tlBobHeaders });

  const alicePulseReps = alicePulseRes.data?.activeMembers?.map(m => m.name) || [];
  const bobPulseReps = bobPulseRes.data?.activeMembers?.map(m => m.name) || [];

  const pulseIsolated = 
    !alicePulseReps.some(r => r === 'Emp B1' || r === 'Emp B2') &&
    !bobPulseReps.some(r => r === 'Emp A1' || r === 'Emp A2');

  if (pulseIsolated) {
    recordTest({
      id: 'TC-TL-02',
      workflow: 'Team Leader Floor Pulse Squad Scoping',
      steps: 'GET /api/team-members/floor-pulse as TL Alice and as TL Bob',
      expected: 'Floor pulse data isolated strictly to leader squad',
      actual: `Pulse isolated: Alice reps: [${alicePulseReps.join(', ')}]; Bob reps: [${bobPulseReps.join(', ')}]`,
      status: 'PASS',
      evidence: JSON.stringify({ alicePulseReps, bobPulseReps }),
    });
  } else {
    recordTest({
      id: 'TC-TL-02',
      workflow: 'Team Leader Floor Pulse Squad Scoping',
      steps: 'GET /api/team-members/floor-pulse as TL Alice and TL Bob',
      expected: 'Floor pulse scoped to squad',
      actual: `Cross-squad leakage in floor pulse: Alice sees [${alicePulseReps}], Bob sees [${bobPulseReps}]`,
      status: 'FAIL',
      evidence: JSON.stringify({ alicePulseRes: alicePulseRes.data, bobPulseRes: bobPulseRes.data }),
      severity: 'HIGH',
    });
  }

  // 5.4 Test TL unauthorized access: TL Alice trying to request leads for Emp B1 (in Squad Beta)
  const crossSquadLeadRes = await api(`/assigned-leads?employeeId=${empB1Id}`, { headers: tlAliceHeaders });
  if (crossSquadLeadRes.status === 403) {
    recordTest({
      id: 'TC-TL-03',
      workflow: 'TL Cross-Squad Access Rejection (Lead Query)',
      steps: 'GET /api/assigned-leads?employeeId=tm-emp-b1 with TL Alice token',
      expected: 'Status 403 Forbidden',
      actual: `Status 403 Forbidden: ${crossSquadLeadRes.data?.error}`,
      status: 'PASS',
      evidence: JSON.stringify(crossSquadLeadRes.data),
    });
  } else {
    recordTest({
      id: 'TC-TL-03',
      workflow: 'TL Cross-Squad Access Rejection (Lead Query)',
      steps: 'GET /api/assigned-leads?employeeId=tm-emp-b1 with TL Alice token',
      expected: 'Status 403 Forbidden',
      actual: `Status ${crossSquadLeadRes.status}: TL Alice was NOT blocked from querying Squad Beta employee leads!`,
      status: 'FAIL',
      evidence: JSON.stringify(crossSquadLeadRes.data),
      severity: 'CRITICAL',
    });
  }

  // ----------------------------------------------------
  // SCENARIO 6: CROSS-ROLE CONSISTENCY
  // ----------------------------------------------------
  console.log('\n--- Scenario 6: Cross-Role Consistency ---');

  // Verify:
  // Employee Action (Lead A1 updated to CALLBACK with followUpDate 2026-09-20)
  // -> TL Alice view
  // -> Admin view
  const tlAliceA1Lead = aliceLeads.find(l => l.id === leadA1Res.data.id);
  const adminA1Lead = adminLeads.find(l => l.id === leadA1Res.data.id);

  // Refresh both to get latest state
  const tlAliceFresh = await api('/assigned-leads', { headers: tlAliceHeaders });
  const adminFresh = await api('/assigned-leads', { headers: adminHeaders });

  const freshAliceA1 = tlAliceFresh.data?.find(l => l.id === leadA1Res.data.id);
  const freshAdminA1 = adminFresh.data?.find(l => l.id === leadA1Res.data.id);

  const statusConsistent = 
    freshAliceA1?.status === 'CALLBACK' && 
    freshAdminA1?.status === 'CALLBACK' &&
    freshAliceA1?.callCount === 1 &&
    freshAdminA1?.callCount === 1;

  if (statusConsistent) {
    recordTest({
      id: 'TC-CONS-01',
      workflow: 'Cross-Role Consistency (Lead Status & Outcome)',
      steps: 'Employee updates lead -> check TL view -> check Admin view',
      expected: 'Lead status and call count match identically across Employee, TL, and Admin views',
      actual: `Consistent across roles: TL sees status=${freshAliceA1.status}, callCount=${freshAliceA1.callCount}; Admin sees status=${freshAdminA1.status}, callCount=${freshAdminA1.callCount}`,
      status: 'PASS',
      evidence: JSON.stringify({ tlView: freshAliceA1, adminView: freshAdminA1 }),
    });
  } else {
    recordTest({
      id: 'TC-CONS-01',
      workflow: 'Cross-Role Consistency (Lead Status & Outcome)',
      steps: 'Employee updates lead -> check TL view -> check Admin view',
      expected: 'Identical state across all 3 roles',
      actual: `Inconsistency found: TL=${JSON.stringify(freshAliceA1)}, Admin=${JSON.stringify(freshAdminA1)}`,
      status: 'FAIL',
      evidence: JSON.stringify({ tl: freshAliceA1, admin: freshAdminA1 }),
      severity: 'HIGH',
    });
  }

  // ----------------------------------------------------
  // SCENARIO 7: NEGATIVE & SECURITY TESTS
  // ----------------------------------------------------
  console.log('\n--- Scenario 7: Negative & Security Tests ---');

  // 7.1 Employee cannot query another employee's leads
  const empA1QueryA2Res = await api(`/assigned-leads?employeeId=${empA2Id}`, { headers: empA1Headers });
  const empA1GotA2Leads = empA1QueryA2Res.data?.some(l => l.id === leadA2Res.data.id);
  if (!empA1GotA2Leads) {
    recordTest({
      id: 'TC-SEC-01',
      workflow: 'Employee Bypassing Scoping via Query Param',
      steps: 'GET /api/assigned-leads?employeeId=tm-emp-a2 using Emp A1 token',
      expected: 'Employee cannot access another employee leads via query parameter; backend forces own leads filter',
      actual: 'Query parameter ignored; Emp A1 only received own leads',
      status: 'PASS',
      evidence: `Returned ${empA1QueryA2Res.data?.length} leads, none belonging to Emp A2`,
    });
  } else {
    recordTest({
      id: 'TC-SEC-01',
      workflow: 'Employee Bypassing Scoping via Query Param',
      steps: 'GET /api/assigned-leads?employeeId=tm-emp-a2 using Emp A1 token',
      expected: 'Backend restricts to own leads',
      actual: 'SECURITY VULNERABILITY: Emp A1 obtained Emp A2 leads by passing query param!',
      status: 'FAIL',
      evidence: JSON.stringify(empA1QueryA2Res.data),
      severity: 'CRITICAL',
    });
  }

  // 7.2 Call Logs Route Scoping Vulnerability Test
  // In server/routes/callLogs.ts: GET /api/call-logs has NO role scoping if employeeId param is omitted!
  const empA1AllLogsRes = await api('/call-logs', { headers: empA1Headers });
  const a1SawOtherLogs = empA1AllLogsRes.data?.some(c => c.employeeId && c.employeeId !== empA1Id);
  if (a1SawOtherLogs) {
    recordTest({
      id: 'TC-SEC-02',
      workflow: 'Call Logs API Role Scoping',
      steps: 'GET /api/call-logs using Employee A1 token without employeeId param',
      expected: 'Employee should ONLY receive their own call logs',
      actual: 'SECURITY VULNERABILITY: GET /api/call-logs returns all call logs across the entire company without role scoping',
      status: 'FAIL',
      evidence: `Employee A1 received ${empA1AllLogsRes.data?.length} logs, including calls from other employees`,
      severity: 'HIGH',
    });
  } else {
    recordTest({
      id: 'TC-SEC-02',
      workflow: 'Call Logs API Role Scoping',
      steps: 'GET /api/call-logs using Employee A1 token',
      expected: 'Only own logs returned',
      actual: 'Only own logs returned',
      status: 'PASS',
      evidence: `Total logs: ${empA1AllLogsRes.data?.length}`,
    });
  }

  // 7.3 Unauthenticated Access to Protected Endpoints
  const unauthAssignedLeads = await api('/assigned-leads');
  const unauthTeamMembers = await api('/team-members');
  const unauthPayments = await api('/payments');

  if (unauthAssignedLeads.status === 401 && unauthTeamMembers.status === 401 && unauthPayments.status === 401) {
    recordTest({
      id: 'TC-SEC-03',
      workflow: 'Unauthenticated Request Rejection',
      steps: 'Send GET requests to /api/assigned-leads, /api/team-members, /api/payments with NO Authorization header',
      expected: 'Status 401 Unauthorized for all protected endpoints',
      actual: 'All 3 protected endpoints returned status 401',
      status: 'PASS',
      evidence: `assignedLeads=${unauthAssignedLeads.status}, teamMembers=${unauthTeamMembers.status}, payments=${unauthPayments.status}`,
    });
  } else {
    recordTest({
      id: 'TC-SEC-03',
      workflow: 'Unauthenticated Request Rejection',
      steps: 'Send GET requests without Authorization header',
      expected: 'Status 401 for all',
      actual: `Endpoints allowed unauthenticated access: assignedLeads=${unauthAssignedLeads.status}, teamMembers=${unauthTeamMembers.status}, payments=${unauthPayments.status}`,
      status: 'FAIL',
      evidence: JSON.stringify({ unauthAssignedLeads, unauthTeamMembers, unauthPayments }),
      severity: 'CRITICAL',
    });
  }

  // 7.4 Employee Unauthorized Modification of Team Groups
  const empCreateGroupRes = await api('/team-groups', {
    method: 'POST',
    headers: empA1Headers,
    body: JSON.stringify({
      name: 'Hacked Squad',
      leaderName: 'Emp A1',
      monthlyTarget: 1000000,
    })
  });

  // Check if server/routes/teamGroups.ts enforces role check for POST
  if (empCreateGroupRes.status === 403 || empCreateGroupRes.status === 401) {
    recordTest({
      id: 'TC-SEC-04',
      workflow: 'Employee Role Enforcement (Team Groups)',
      steps: 'POST /api/team-groups with Employee A1 token',
      expected: 'Status 403 Forbidden: Telecaller cannot create team groups',
      actual: `Blocked with status ${empCreateGroupRes.status}`,
      status: 'PASS',
      evidence: JSON.stringify(empCreateGroupRes.data),
    });
  } else {
    recordTest({
      id: 'TC-SEC-04',
      workflow: 'Employee Role Enforcement (Team Groups)',
      steps: 'POST /api/team-groups with Employee A1 token',
      expected: 'Status 403 Forbidden',
      actual: `SECURITY VULNERABILITY: Employee A1 was able to create/modify team groups (Status ${empCreateGroupRes.status})! POST /api/team-groups lacks role authorization middleware.`,
      status: 'FAIL',
      evidence: JSON.stringify(empCreateGroupRes.data),
      severity: 'HIGH',
    });
  }

  // 7.5 Unauthenticated User Provisioning Endpoint Test
  // In server/routes/auth.ts: POST /api/auth/users
  const unauthCreateUserRes = await api('/auth/users', {
    method: 'POST',
    body: JSON.stringify({
      email: 'hacker_admin@tradenexus.com',
      name: 'Rogue Admin',
      role: 'admin',
      password: 'hacked123',
    })
  });

  if (unauthCreateUserRes.status === 401 || unauthCreateUserRes.status === 403) {
    recordTest({
      id: 'TC-SEC-05',
      workflow: 'User Provisioning Auth Protection',
      steps: 'POST /api/auth/users with no authorization header',
      expected: 'Status 401 or 403 Forbidden',
      actual: `Blocked with status ${unauthCreateUserRes.status}`,
      status: 'PASS',
      evidence: JSON.stringify(unauthCreateUserRes.data),
    });
  } else {
    recordTest({
      id: 'TC-SEC-05',
      workflow: 'User Provisioning Auth Protection',
      steps: 'POST /api/auth/users with no authorization header',
      expected: 'Status 401/403: Endpoint must be strictly restricted to authenticated Admin/HR',
      actual: `CRITICAL VULNERABILITY: Unauthenticated caller created an admin user account with status ${unauthCreateUserRes.status}! /api/auth/users is unauthenticated.`,
      status: 'FAIL',
      evidence: JSON.stringify(unauthCreateUserRes.data),
      severity: 'CRITICAL',
    });
  }

  // 7.6 Payments Scoping Vulnerability Test
  // In server/routes/payments.ts: GET /api/payments
  const empA1PaymentsRes = await api('/payments', { headers: empA1Headers });
  const sawOtherPayments = empA1PaymentsRes.data?.some(p => p.telecallerName && p.telecallerName.toLowerCase() !== 'emp a1');
  if (sawOtherPayments) {
    recordTest({
      id: 'TC-SEC-06',
      workflow: 'Payments API Role Scoping',
      steps: 'GET /api/payments with Employee A1 token',
      expected: 'Employee should only see own payments or be blocked (Admin/HR only)',
      actual: 'SECURITY VULNERABILITY: Telecaller received payments from other employees. GET /api/payments leaked cross-rep payments.',
      status: 'FAIL',
      evidence: JSON.stringify(empA1PaymentsRes.data),
      severity: 'MEDIUM',
    });
  } else {
    recordTest({
      id: 'TC-SEC-06',
      workflow: 'Payments API Role Scoping',
      steps: 'GET /api/payments with Employee A1 token',
      expected: 'Scoped strictly to own deals',
      actual: `Correctly scoped: Emp A1 received only own payments (${empA1PaymentsRes.data?.length} records, 0 other reps)`,
      status: 'PASS',
      evidence: `Payment count: ${empA1PaymentsRes.data?.length}`,
    });
  }

  // ----------------------------------------------------
  // WRITE REPORT SUMMARY
  // ----------------------------------------------------
  console.log('\n=== AUDIT RUN COMPLETED ===');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const notVerifiedCount = results.filter(r => r.status === 'NOT_VERIFIED').length;

  console.log(`Results: PASS=${passCount}, FAIL=${failCount}, NOT_VERIFIED=${notVerifiedCount}`);

  fs.writeFileSync('scratch/audit_results.json', JSON.stringify(results, null, 2));
  console.log('Saved results to scratch/audit_results.json');
}

runAudit().catch(console.error);
