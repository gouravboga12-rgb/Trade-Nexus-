process.env.NODE_ENV = 'test';

import http from 'http';
import app from '../server.js';

interface TestResult {
  name: string;
  method: string;
  endpoint: string;
  status: number;
  expectedStatus: number[];
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function makeRequest(
  port: number,
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const jsonBody = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(jsonBody ? { 'Content-Length': Buffer.byteLength(jsonBody) } : {}),
          ...headers,
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            const data = responseData ? JSON.parse(responseData) : {};
            resolve({ status: res.statusCode || 500, data });
          } catch {
            resolve({ status: res.statusCode || 500, data: responseData });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (jsonBody) req.write(jsonBody);
    req.end();
  });
}

async function runTest(
  port: number,
  name: string,
  method: string,
  endpoint: string,
  expectedStatus: number[],
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  try {
    const res = await makeRequest(port, method, endpoint, body, headers);
    const passed = expectedStatus.includes(res.status);
    results.push({
      name,
      method,
      endpoint,
      status: res.status,
      expectedStatus,
      passed,
      error: passed ? undefined : `Expected ${expectedStatus.join('/')} got ${res.status}: ${JSON.stringify(res.data)}`,
    });
    return res.data;
  } catch (err: any) {
    results.push({
      name,
      method,
      endpoint,
      status: 0,
      expectedStatus,
      passed: false,
      error: err.message,
    });
    return null;
  }
}

async function startTestSuite() {
  const server = app.listen(0);
  const address = server.address();
  const TEST_PORT = typeof address === 'object' && address ? address.port : 5099;
  const uid = Date.now();

  console.log('\n========================================================');
  console.log(`🧪 RUNNING COMPREHENSIVE SQLITE & API UNIT TEST SUITE (Port: ${TEST_PORT})`);
  console.log('========================================================\n');

  try {
    // 1. Health Check (Public)
    await runTest(TEST_PORT, 'Health Check Endpoint', 'GET', '/api/health', [200]);

    // 2. Auth Security: Reject backdoor passwords
    await runTest(TEST_PORT, 'Reject Backdoor password123', 'POST', '/api/auth/login', [401], {
      email: 'admin@tradenexus.com',
      password: 'password123',
    });

    await runTest(TEST_PORT, 'Reject Invalid Password', 'POST', '/api/auth/login', [401], {
      email: 'admin@tradenexus.com',
      password: 'wrongpassword',
    });

    // 3. Valid Admin Login & Token
    const adminLoginRes = await runTest(TEST_PORT, 'POST Auth Login (Admin)', 'POST', '/api/auth/login', [200], {
      email: 'admin@tradenexus.com',
      password: 'admin123',
    });

    const adminToken = adminLoginRes?.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 4. Security RBAC: Unauthenticated calls must be blocked
    await runTest(TEST_PORT, 'Block Unauthenticated Reset', 'POST', '/api/admin/reset-to-clean', [401]);
    await runTest(TEST_PORT, 'Block Unauthenticated Team Members', 'GET', '/api/team-members', [401]);

    // 5. Profile GET & PUT (Authenticated)
    await runTest(TEST_PORT, 'GET Profile', 'GET', '/api/profile', [200, 404], undefined, adminHeaders);
    await runTest(TEST_PORT, 'PUT Profile', 'PUT', '/api/profile', [200], {
      name: 'Admin User (Verified)',
      checkInTime: '09:15 AM',
    }, adminHeaders);

    // 6. Stats GET & PUT
    await runTest(TEST_PORT, 'GET Stats', 'GET', '/api/stats', [200], undefined, adminHeaders);
    await runTest(TEST_PORT, 'PUT Stats', 'PUT', '/api/stats', [200], {
      dialsMade: 75,
      connected: 50,
    }, adminHeaders);

    // 7. Call Logs GET & POST
    await runTest(TEST_PORT, 'GET Call Logs', 'GET', '/api/call-logs', [200], undefined, adminHeaders);
    await runTest(TEST_PORT, 'POST Call Log (Add)', 'POST', '/api/call-logs', [201], {
      clientName: 'Sunil Gavaskar',
      companyName: 'Gavaskar Sports Corp',
      phoneNumber: '+91 98999 12345',
      outcome: 'INTERESTED',
      durationSec: 190,
      notes: 'Test call log from test suite',
    }, adminHeaders);

    // 8. Client Leads GET, POST, PUT
    await runTest(TEST_PORT, 'GET Client Leads', 'GET', '/api/clients', [200], undefined, adminHeaders);
    const createdClient = await runTest(TEST_PORT, 'POST Client Lead (Add)', 'POST', '/api/clients', [201], {
      id: `lead-test-${uid}`,
      name: 'Test Client Enterprise',
      company: 'Test Logistics Global',
      phone: '+91 98888 77777',
      dealValue: 60000,
      temperature: 'HOT',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Client Lead (Update)', 'PUT', `/api/clients/${createdClient?.id || `lead-test-${uid}`}`, [200], {
      status: 'Due Today',
      dealValue: 65000,
    }, adminHeaders);

    // 9. Attendance GET, POST, PUT
    await runTest(TEST_PORT, 'GET Attendance Records', 'GET', '/api/attendance', [200], undefined, adminHeaders);
    await runTest(TEST_PORT, 'POST Attendance (Check-in)', 'POST', '/api/attendance', [201, 200], {
      id: `att-test-${uid}`,
      date: '2025-05-29',
      dayNumber: 29,
      status: 'PRESENT',
      checkIn: '09:00 AM',
      method: 'Face ID Biometric',
      employeeId: 'emp-ad-1',
      employeeName: 'Super Admin',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Attendance (Update)', 'PUT', `/api/attendance/att-test-${uid}`, [200], {
      checkOut: '06:00 PM',
      workHours: '9h 00m',
    }, adminHeaders);

    // 10. Leaves GET, POST, PUT
    await runTest(TEST_PORT, 'GET Leave Requests', 'GET', '/api/leaves', [200], undefined, adminHeaders);
    const createdLeave = await runTest(TEST_PORT, 'POST Leave Request (Add)', 'POST', '/api/leaves', [201], {
      id: `leave-test-${uid}`,
      leaveType: 'Sick Leave',
      fromDate: '10 Jun 2025',
      toDate: '11 Jun 2025',
      totalDays: 2,
      reason: 'Medical checkup test',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Leave Request (Approve)', 'PUT', `/api/leaves/${createdLeave?.id || `leave-test-${uid}`}`, [200], {
      status: 'APPROVED',
      approvedBy: 'Ramesh Sharma (Team Leader)',
    }, adminHeaders);

    // 11. Team Members GET, POST, PUT (Employee Provisioning Test)
    await runTest(TEST_PORT, 'GET Team Members', 'GET', '/api/team-members', [200], undefined, adminHeaders);
    const telecallerEmpCode = `TNX-${Math.floor(1000 + Math.random() * 8999)}`;
    const telecallerEmail = `telecaller.${uid}@tradenexus.com`;
    const telecallerPassword = 'SecretPassword!123';
    const telecallerMemberId = `tm-tele-${uid}`;

    const createdMember = await runTest(TEST_PORT, 'POST Team Member (Provision New Employee & User)', 'POST', '/api/team-members', [201], {
      id: telecallerMemberId,
      empCode: telecallerEmpCode,
      name: 'Pooja Sharma',
      role: 'Telecaller Executive',
      group: 'HNI Closers',
      phone: '+91 99887 66554',
      email: telecallerEmail,
      password: telecallerPassword,
      portal: 'telecaller',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Team Member (Update)', 'PUT', `/api/team-members/${createdMember?.id || telecallerMemberId}`, [200], {
      dialsToday: 45,
      connected: 30,
    }, adminHeaders);

    // 12. Authenticate as the newly created Telecaller
    const telecallerLoginRes = await runTest(TEST_PORT, 'POST Auth Login (Newly Provisioned Telecaller)', 'POST', '/api/auth/login', [200], {
      email: telecallerEmail,
      password: telecallerPassword,
    });
    const telecallerToken = telecallerLoginRes?.token;
    const telecallerHeaders = { Authorization: `Bearer ${telecallerToken}` };

    // 13. Security RBAC: Telecaller must NOT be allowed to trigger reset-to-clean
    await runTest(TEST_PORT, 'RBAC: Telecaller Blocked from Admin Reset (403)', 'POST', '/api/admin/reset-to-clean', [403], undefined, telecallerHeaders);

    // 14. Team Groups GET, POST, PUT
    await runTest(TEST_PORT, 'GET Team Groups', 'GET', '/api/team-groups', [200], undefined, adminHeaders);
    const createdGroup = await runTest(TEST_PORT, 'POST Team Group (Add)', 'POST', '/api/team-groups', [201], {
      id: `grp-test-${uid}`,
      name: `Corporate Pioneers ${uid}`,
      description: 'Handling Fortune 500 Enterprise accounts',
      leaderName: 'Arjun Kumar',
      monthlyTarget: 500000,
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Team Group (Update)', 'PUT', `/api/team-groups/${createdGroup?.id || `grp-test-${uid}`}`, [200], {
      monthlyTarget: 550000,
      achieved: 120000,
    }, adminHeaders);

    // 15. Team Tasks GET, POST, PUT
    await runTest(TEST_PORT, 'GET Team Tasks', 'GET', '/api/team-tasks', [200], undefined, adminHeaders);
    const createdTask = await runTest(TEST_PORT, 'POST Team Task (Add)', 'POST', '/api/team-tasks', [201], {
      id: `task-test-${uid}`,
      title: 'Follow up with 10 hot enterprise leads',
      assignedTo: 'Arjun Kumar',
      dueDate: 'Today, 06:00 PM',
      priority: 'HIGH',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Team Task (Toggle Status)', 'PUT', `/api/team-tasks/${createdTask?.id || `task-test-${uid}`}`, [200], {
      status: 'COMPLETED',
    }, adminHeaders);

    // 16. Team Meetings GET, POST
    await runTest(TEST_PORT, 'GET Team Meetings', 'GET', '/api/team-meetings', [200], undefined, adminHeaders);
    await runTest(TEST_PORT, 'POST Team Meeting (Add)', 'POST', '/api/team-meetings', [201], {
      id: `mtg-test-${uid}`,
      title: 'Weekly Target Review',
      dateTime: 'Friday • 10:00 AM',
      type: 'Team Standup',
      location: 'Conference Room 1',
      agenda: 'Review sprint deliverables',
    }, adminHeaders);

    // 17. Candidate Interviews GET, POST, PUT
    await runTest(TEST_PORT, 'GET Candidate Interviews', 'GET', '/api/interviews', [200], undefined, adminHeaders);
    const createdCand = await runTest(TEST_PORT, 'POST Candidate Interview (Add)', 'POST', '/api/interviews', [201], {
      id: `cand-test-${uid}`,
      candidateName: 'Akash Deep',
      roleApplied: 'Telecaller Executive',
      experience: '2 Yrs B2B Sales',
      email: 'akash.d@gmail.com',
      phone: '+91 97777 66666',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Candidate Interview (Update Status)', 'PUT', `/api/interviews/${createdCand?.id || `cand-test-${uid}`}`, [200], {
      status: 'OFFER_EXTENDED',
      rating: 4.9,
    }, adminHeaders);

    // 18. Onboarding Employees GET, POST, PUT
    await runTest(TEST_PORT, 'GET Onboarding Employees', 'GET', '/api/onboarding', [200], undefined, adminHeaders);
    const createdOnb = await runTest(TEST_PORT, 'POST Onboarding Employee (Add)', 'POST', '/api/onboarding', [201], {
      id: `onb-test-${uid}`,
      empCode: `TNX-${Math.floor(1000 + Math.random() * 8999)}`,
      name: 'Simran Kaur',
      role: 'Sales Associate',
      department: 'Alpha Growth Team',
      joiningDate: '01 June 2025',
      probationEnd: '01 Dec 2025',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Onboarding Employee (Checklist)', 'PUT', `/api/onboarding/${createdOnb?.id || `onb-test-${uid}`}`, [200], {
      checklist: {
        documentsVerified: true,
        workstationAllocated: true,
        biometricEnrolled: true,
        trainingScheduled: true,
      },
    }, adminHeaders);

    // 19. Exit Employees GET, POST, PUT
    await runTest(TEST_PORT, 'GET Exit Employees', 'GET', '/api/exit-employees', [200], undefined, adminHeaders);
    const createdExit = await runTest(TEST_PORT, 'POST Exit Employee (Add)', 'POST', '/api/exit-employees', [201], {
      id: `exit-test-${uid}`,
      empCode: `TNX-${Math.floor(1000 + Math.random() * 8999)}`,
      name: 'Vikas Shah',
      role: 'Junior Telecaller',
      department: 'Retention Squad',
      resignationDate: '01 May 2025',
      lastWorkingDay: '31 May 2025',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Exit Employee (Clearance)', 'PUT', `/api/exit-employees/${createdExit?.id || `exit-test-${uid}`}`, [200], {
      checklist: {
        assetsReturned: true,
        accountsSettled: true,
        knowledgeTransfer: true,
        relievingLetterIssued: true,
      },
    }, adminHeaders);

    // 20. Lead Scoping and Isolation
    // Admin creates 2 leads: Lead A for telecaller, Lead B for other employee
    const leadForTelecaller = await runTest(TEST_PORT, 'POST Assigned Lead for Telecaller', 'POST', '/api/assigned-leads', [201], {
      id: `asg-tele-${uid}`,
      name: 'Telecaller Private Client',
      phone: '+91 96666 55555',
      company: 'Private Corp',
      assignedToEmployeeId: telecallerMemberId,
      assignedToEmployeeName: 'Pooja Sharma',
    }, adminHeaders);

    await runTest(TEST_PORT, 'POST Assigned Lead for Other Rep', 'POST', '/api/assigned-leads', [201], {
      id: `asg-other-${uid}`,
      name: 'Other Rep Client',
      phone: '+91 91111 22222',
      company: 'Other Corp',
      assignedToEmployeeId: 'emp-other-999',
      assignedToEmployeeName: 'Other Person',
    }, adminHeaders);

    // Telecaller queries assigned leads - must receive ONLY their own lead
    const telecallerLeads = await runTest(TEST_PORT, 'GET Assigned Leads (Telecaller Isolated Scoping)', 'GET', '/api/assigned-leads', [200], undefined, telecallerHeaders);
    if (Array.isArray(telecallerLeads)) {
      const hasOtherLead = telecallerLeads.some((l: any) => l.id === `asg-other-${uid}`);
      const hasOwnLead = telecallerLeads.some((l: any) => l.id === `asg-tele-${uid}`);
      if (hasOtherLead) {
        throw new Error('Data Exposure: Telecaller received leads assigned to another employee!');
      }
      if (!hasOwnLead) {
        throw new Error('Telecaller failed to receive their own assigned lead.');
      }
    }

    // Lead Batches GET
    await runTest(TEST_PORT, 'GET Lead Batches', 'GET', '/api/lead-batches', [200], undefined, adminHeaders);

    // 21. Biometrics Register & Verify Isolation
    await runTest(TEST_PORT, 'GET Biometric Profiles', 'GET', '/api/biometrics', [200], undefined, adminHeaders);
    await runTest(TEST_PORT, 'POST Register Face Biometric', 'POST', '/api/biometrics', [201], {
      employeeId: telecallerMemberId,
      employeeName: 'Pooja Sharma',
      registeredPhoto: 'data:image/jpeg;base64,mockFaceDataString',
      registeredAt: 'Just now',
    }, adminHeaders);

    await runTest(TEST_PORT, 'POST Verify Face Biometric (Scoped Check-in)', 'POST', '/api/biometrics/verify', [200], {
      employeeId: telecallerMemberId,
    }, adminHeaders);

    // 22. Payslips Generation & Scoping
    await runTest(TEST_PORT, 'POST Bulk Payslips (Generate)', 'POST', '/api/payslips/bulk', [201], {
      month: 'June',
      year: '2025',
    }, adminHeaders);

    const adminPayslips = await runTest(TEST_PORT, 'GET Payslips (Admin sees all)', 'GET', '/api/payslips', [200], undefined, adminHeaders);
    const telecallerPayslips = await runTest(TEST_PORT, 'GET Payslips (Telecaller sees only own)', 'GET', '/api/payslips', [200], undefined, telecallerHeaders);
    if (Array.isArray(telecallerPayslips) && Array.isArray(adminPayslips)) {
      const seesOthers = telecallerPayslips.some((p: any) => p.employeeId && p.employeeId !== telecallerMemberId);
      if (seesOthers) {
        throw new Error('Data Exposure: Telecaller received payslips belonging to another employee!');
      }
    }

    // 23. Offer Letters GET, POST
    await runTest(TEST_PORT, 'GET Offer Letters', 'GET', '/api/offer-letters', [200], undefined, adminHeaders);
    await runTest(TEST_PORT, 'POST Offer Letter (Generate)', 'POST', '/api/offer-letters', [201], {
      id: `off-test-${uid}`,
      candidateName: 'Kishore Kumar',
      candidateEmail: 'kishore@gmail.com',
      candidatePhone: '+91 94444 33333',
      roleTitle: 'Senior SDR Specialist',
      department: 'Sales & Client Acquisition',
      annualCtc: 480000,
      monthlyGross: 40000,
      joiningDate: '15 June 2025',
      reportingManager: 'Ramesh Sharma',
      location: 'Bengaluru Corporate HQ',
    }, adminHeaders);

    // 24. Payment Verifications GET, POST, PUT
    await runTest(TEST_PORT, 'GET Payment Verifications', 'GET', '/api/payments', [200], undefined, adminHeaders);
    const createdPay = await runTest(TEST_PORT, 'POST Payment Verification (Add)', 'POST', '/api/payments', [201], {
      id: `pay-test-${uid}`,
      leadName: 'Gaurav Gill',
      companyName: 'Gill Logistics',
      telecallerName: 'Arjun Kumar',
      dealAmount: 110000,
      utrNumber: 'HDFC123456789012',
      paymentMode: 'NEFT',
    }, adminHeaders);
    await runTest(TEST_PORT, 'PUT Payment Verification (HR Approve)', 'PUT', `/api/payments/${createdPay?.id || `pay-test-${uid}`}`, [200], {
      status: 'VERIFIED',
    }, adminHeaders);

    // 25. Auth Me (Session Validation)
    await runTest(TEST_PORT, 'GET Auth Me (Session Validation)', 'GET', '/api/auth/me', [200], undefined, adminHeaders);

    // 26. Shift State Persistence (Today Status)
    await runTest(TEST_PORT, 'GET Attendance Today Shift Status', 'GET', `/api/attendance/today?employeeId=${telecallerMemberId}`, [200], undefined, telecallerHeaders);

  } finally {
    server.close();
  }

  // Print Summary
  console.log('\n========================================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('========================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    const symbol = r.passed ? '✅' : '❌';
    console.log(`${symbol} [${r.method.padEnd(6)}] ${r.endpoint.padEnd(35)} -> HTTP ${r.status} (${r.name})`);
    if (r.passed) {
      passedCount++;
    } else {
      failedCount++;
      console.error(`   ⚠️ Failure: ${r.error}`);
    }
  }

  console.log('\n--------------------------------------------------------');
  console.log(`TOTAL TESTS : ${results.length}`);
  console.log(`PASSED      : ${passedCount}`);
  console.log(`FAILED      : ${failedCount}`);
  console.log('--------------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED WITH 200/201 SUCCESS CODES!\n');
    process.exit(0);
  }
}

startTestSuite();
