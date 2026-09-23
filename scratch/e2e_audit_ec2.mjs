import fs from 'fs';

const API_BASE = 'http://65.0.173.174/api';
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
  console.log('=== STARTING EC2 PROD AUDIT (http://65.0.173.174) ===\n');

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
      id: 'grp-squad-alpha-ec2',
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
      id: 'grp-squad-beta-ec2',
      name: 'Squad Beta',
      description: 'Beta Performance Squad',
      leaderName: 'TL Bob',
      memberCount: 3,
      monthlyTarget: 500000,
      achieved: 0,
      color: '#3B82F6'
    })
  });

  // 1.2 Create exactly 2 Team Leaders
  const tlAliceRes = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: 'tm-tl-alice-ec2',
      empCode: 'TNX-TL-01',
      name: 'TL Alice',
      role: 'Team Leader',
      group: 'Squad Alpha',
      portal: 'team_leader',
      email: 'tl_alice_ec2@tradenexus.com',
      password: 'password123',
      phone: '9876543210',
    })
  });

  const tlBobRes = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: 'tm-tl-bob-ec2',
      empCode: 'TNX-TL-02',
      name: 'TL Bob',
      role: 'Team Leader',
      group: 'Squad Beta',
      portal: 'team_leader',
      email: 'tl_bob_ec2@tradenexus.com',
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
      id: 'tm-emp-a1-ec2',
      empCode: 'TNX-EMP-A1',
      name: 'Emp A1',
      role: 'Telecaller',
      group: 'Squad Alpha',
      portal: 'telecaller',
      email: 'emp_a1_ec2@tradenexus.com',
      password: 'password123',
      phone: '9876543221',
    })
  });

  const empA2Res = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: 'tm-emp-a2-ec2',
      empCode: 'TNX-EMP-A2',
      name: 'Emp A2',
      role: 'Telecaller',
      group: 'Squad Alpha',
      portal: 'telecaller',
      email: 'emp_a2_ec2@tradenexus.com',
      password: 'password123',
      phone: '9876543222',
    })
  });

  const empB1Res = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: 'tm-emp-b1-ec2',
      empCode: 'TNX-EMP-B1',
      name: 'Emp B1',
      role: 'Telecaller',
      group: 'Squad Beta',
      portal: 'telecaller',
      email: 'emp_b1_ec2@tradenexus.com',
      password: 'password123',
      phone: '9876543231',
    })
  });

  const empB2Res = await api('/team-members', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: 'tm-emp-b2-ec2',
      empCode: 'TNX-EMP-B2',
      name: 'Emp B2',
      role: 'Telecaller',
      group: 'Squad Beta',
      portal: 'telecaller',
      email: 'emp_b2_ec2@tradenexus.com',
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
    { email: 'tl_alice_ec2@tradenexus.com', pass: 'password123', expRole: 'team_leader', name: 'TL Alice' },
    { email: 'tl_bob_ec2@tradenexus.com', pass: 'password123', expRole: 'team_leader', name: 'TL Bob' },
    { email: 'emp_a1_ec2@tradenexus.com', pass: 'password123', expRole: 'telecaller', name: 'Emp A1' },
    { email: 'emp_a2_ec2@tradenexus.com', pass: 'password123', expRole: 'telecaller', name: 'Emp A2' },
    { email: 'emp_b1_ec2@tradenexus.com', pass: 'password123', expRole: 'telecaller', name: 'Emp B1' },
    { email: 'emp_b2_ec2@tradenexus.com', pass: 'password123', expRole: 'telecaller', name: 'Emp B2' },
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

  // Test Requirement: Dual assignment
  const testLeadData = {
    id: `lead-test-dual-ec2-${Date.now()}`,
    name: 'Dual Assignee Client EC2',
    phone: '9988776655',
    email: 'dual@client.com',
    company: 'Apex Enterprise',
    city: 'Mumbai',
    assignedToEmployeeId: 'tm-emp-a1-ec2,tm-emp-a2-ec2',
    assignedToEmployeeName: 'Emp A1, Emp A2',
    status: 'PENDING',
    dealValue: 150000,
  };

  const dualAssignLeadRes = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(testLeadData)
  });

  // Individual assigned leads for each employee
  const leadA1Res = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-a1-ec2-${Date.now()}`,
      name: 'Client Alpha One',
      phone: '9123456781',
      email: 'alpha1@client.com',
      company: 'Alpha Corp',
      city: 'Delhi',
      assignedToEmployeeId: 'tm-emp-a1-ec2',
      assignedToEmployeeName: 'Emp A1',
      status: 'PENDING',
      dealValue: 80000,
    })
  });

  const leadA2Res = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-a2-ec2-${Date.now()}`,
      name: 'Client Alpha Two',
      phone: '9123456782',
      email: 'alpha2@client.com',
      company: 'Beta Logistics',
      city: 'Bengaluru',
      assignedToEmployeeId: 'tm-emp-a2-ec2',
      assignedToEmployeeName: 'Emp A2',
      status: 'PENDING',
      dealValue: 120000,
    })
  });

  const leadB1Res = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-b1-ec2-${Date.now()}`,
      name: 'Client Beta One',
      phone: '9123456783',
      email: 'beta1@client.com',
      company: 'Delta Retail',
      city: 'Pune',
      assignedToEmployeeId: 'tm-emp-b1-ec2',
      assignedToEmployeeName: 'Emp B1',
      status: 'PENDING',
      dealValue: 95000,
    })
  });

  const leadB2Res = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-b2-ec2-${Date.now()}`,
      name: 'Client Beta Two',
      phone: '9123456784',
      email: 'beta2@client.com',
      company: 'Omega Tech',
      city: 'Hyderabad',
      assignedToEmployeeId: 'tm-emp-b2-ec2',
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

  // Dual assignment check
  const empA1LeadsCheck = await api('/assigned-leads', { headers: empA1Headers });
  const empA1SeesDual = empA1LeadsCheck.data?.some(l => l.id === testLeadData.id);
  const empA2LeadsCheck = await api('/assigned-leads', { headers: empA2Headers });
  const empA2SeesDual = empA2LeadsCheck.data?.some(l => l.id === testLeadData.id);

  if (empA1SeesDual && empA2SeesDual) {
    recordTest({
      id: 'TC-LEAD-01',
      workflow: 'Lead Assigned to 2 Employees (Dual Assignment)',
      steps: 'Create lead with assignedToEmployeeId="tm-emp-a1-ec2,tm-emp-a2-ec2" and query leads as Emp A1 and Emp A2',
      expected: 'Both employees can see and access the dual-assigned lead',
      actual: 'Both employees see the dual-assigned lead',
      status: 'PASS',
      evidence: `empA1SeesDual=${empA1SeesDual}, empA2SeesDual=${empA2SeesDual}`,
    });
  } else {
    recordTest({
      id: 'TC-LEAD-01',
      workflow: 'Lead Assigned to 2 Employees (Dual Assignment)',
      steps: 'Create lead with assignedToEmployeeId="tm-emp-a1-ec2,tm-emp-a2-ec2" and query leads as Emp A1 and Emp A2',
      expected: 'Both employees can see and access the dual-assigned lead',
      actual: `Schema / backend uses exact equality match (assignedToEmployeeId = user.id) so comma-separated IDs fail scoping: empA1SeesDual=${empA1SeesDual}, empA2SeesDual=${empA2SeesDual}.`,
      status: 'FAIL',
      evidence: `assignedToEmployeeId is single string column in assigned_leads table. Queried WHERE assignedToEmployeeId = user.id. String 'tm-emp-a1-ec2,tm-emp-a2-ec2' != 'tm-emp-a1-ec2'.`,
      severity: 'HIGH',
    });
  }

  // Lead Assignment DB Persistence
  const dbLeadCheck = await api(`/assigned-leads?employeeId=tm-emp-a1-ec2`, { headers: adminHeaders });
  const savedInDb = dbLeadCheck.data?.some(l => l.id === leadA1Res.data?.id);

  if (savedInDb) {
    recordTest({
      id: 'TC-LEAD-02',
      workflow: 'Lead Assignment DB Persistence',
      steps: 'Query /api/assigned-leads from backend after creation',
      expected: 'Assigned lead record exists in database with correct assignedToEmployeeId',
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

  // Employee Isolated Lead Visibility
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

  // Team Leader Squad Lead Scoping
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

  // Admin Complete Lead Visibility
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
  // SCENARIO 3: EMPLOYEE WORKFLOW
  // ----------------------------------------------------
  console.log('\n--- Scenario 3: Employee Workflow ---');

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

  const reLoginA1 = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'emp_a1_ec2@tradenexus.com', password: 'password123' })
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

  const wonLeadRes = await api('/assigned-leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: `lead-won-ec2-${Date.now()}`,
      name: 'Won Deal Client EC2',
      phone: '9888777666',
      email: 'wondeal@client.com',
      company: 'Unicorn Ventures Ltd',
      city: 'Mumbai',
      assignedToEmployeeId: 'tm-emp-a1-ec2',
      assignedToEmployeeName: 'Emp A1',
      status: 'PENDING',
      dealValue: 250000,
    })
  });

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

  const empA1WonCheck = await api('/assigned-leads', { headers: newA1Headers });
  const a1WonLead = empA1WonCheck.data?.find(l => l.id === wonLeadRes.data.id);
  const a1WonVisible = a1WonLead && a1WonLead.status === 'CONVERTED' && a1WonLead.dealValue === 250000;

  const tlAliceWonCheck = await api('/assigned-leads', { headers: tlAliceHeaders });
  const aliceWonLead = tlAliceWonCheck.data?.find(l => l.id === wonLeadRes.data.id);
  const aliceWonVisible = aliceWonLead && aliceWonLead.status === 'CONVERTED' && aliceWonLead.dealValue === 250000;

  const adminWonCheck = await api('/assigned-leads', { headers: adminHeaders });
  const adminWonLead = adminWonCheck.data?.find(l => l.id === wonLeadRes.data.id);
  const adminWonVisible = adminWonLead && adminWonLead.status === 'CONVERTED' && adminWonLead.dealValue === 250000;

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

  const aliceMembersRes = await api('/team-members', { headers: tlAliceHeaders });
  const aliceMembers = aliceMembersRes.data || [];
  const aliceSeesA1Member = aliceMembers.some(m => m.name === 'Emp A1');
  const aliceSeesA2Member = aliceMembers.some(m => m.name === 'Emp A2');
  const aliceSeesB1Member = aliceMembers.some(m => m.name === 'Emp B1');
  const aliceSeesB2Member = aliceMembers.some(m => m.name === 'Emp B2');

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

  // Cross-squad lead query
  const crossSquadLeadRes = await api('/assigned-leads?employeeId=tm-emp-b1-ec2', { headers: tlAliceHeaders });
  if (crossSquadLeadRes.status === 403) {
    recordTest({
      id: 'TC-TL-03',
      workflow: 'TL Cross-Squad Access Rejection (Lead Query)',
      steps: 'GET /api/assigned-leads?employeeId=tm-emp-b1-ec2 with TL Alice token',
      expected: 'Status 403 Forbidden',
      actual: `Status 403 Forbidden: ${crossSquadLeadRes.data?.error}`,
      status: 'PASS',
      evidence: JSON.stringify(crossSquadLeadRes.data),
    });
  } else {
    recordTest({
      id: 'TC-TL-03',
      workflow: 'TL Cross-Squad Access Rejection (Lead Query)',
      steps: 'GET /api/assigned-leads?employeeId=tm-emp-b1-ec2 with TL Alice token',
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

  // Employee query param bypass
  const empA1QueryA2Res = await api('/assigned-leads?employeeId=tm-emp-a2-ec2', { headers: empA1Headers });
  const empA1GotA2Leads = empA1QueryA2Res.data?.some(l => l.id === leadA2Res.data.id);
  if (!empA1GotA2Leads) {
    recordTest({
      id: 'TC-SEC-01',
      workflow: 'Employee Bypassing Scoping via Query Param',
      steps: 'GET /api/assigned-leads?employeeId=tm-emp-a2-ec2 using Emp A1 token',
      expected: 'Employee cannot access another employee leads via query parameter; backend forces own leads filter',
      actual: 'Query parameter ignored; Emp A1 only received own leads',
      status: 'PASS',
      evidence: `Returned ${empA1QueryA2Res.data?.length} leads, none belonging to Emp A2`,
    });
  } else {
    recordTest({
      id: 'TC-SEC-01',
      workflow: 'Employee Bypassing Scoping via Query Param',
      steps: 'GET /api/assigned-leads?employeeId=tm-emp-a2-ec2 using Emp A1 token',
      expected: 'Backend restricts to own leads',
      actual: 'SECURITY VULNERABILITY: Emp A1 obtained Emp A2 leads by passing query param!',
      status: 'FAIL',
      evidence: JSON.stringify(empA1QueryA2Res.data),
      severity: 'CRITICAL',
    });
  }

  // Unauthenticated requests
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

  // Employee role enforcement on team-groups
  const empCreateGroupRes = await api('/team-groups', {
    method: 'POST',
    headers: empA1Headers,
    body: JSON.stringify({
      name: 'Hacked Squad',
      leaderName: 'Emp A1',
      monthlyTarget: 1000000,
    })
  });

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

  // User provisioning endpoint
  const unauthCreateUserRes = await api('/auth/users', {
    method: 'POST',
    body: JSON.stringify({
      email: 'hacker_admin_ec2@tradenexus.com',
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

  console.log('\n=== EC2 AUDIT RUN COMPLETED ===');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`Results: PASS=${passCount}, FAIL=${failCount}`);

  fs.writeFileSync('scratch/ec2_audit_results.json', JSON.stringify(results, null, 2));
  console.log('Saved results to scratch/ec2_audit_results.json');
}

runAudit().catch(console.error);
