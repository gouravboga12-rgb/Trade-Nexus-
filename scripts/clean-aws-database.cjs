const API_BASE = 'http://65.0.173.174/api';

async function resetAWS() {
  console.log('Connecting to AWS EC2 at', API_BASE);
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@tradenexus.com', password: 'admin123' })
  });
  
  if (!loginRes.ok) {
    throw new Error(`Failed to login as admin on AWS: status ${loginRes.status}`);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  
  const resetRes = await fetch(`${API_BASE}/admin/reset-to-clean`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const resetData = await resetRes.json();
  console.log('✅ AWS Live Database Reset:', resetData);
  
  // Verify
  const membersRes = await fetch(`${API_BASE}/team-members`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const members = await membersRes.json();
  console.log(`✅ AWS Live Team Members Count: ${members.length} (Pure Zero State)`);
}

resetAWS().catch(err => {
  console.error('Error resetting AWS:', err);
  process.exit(1);
});
