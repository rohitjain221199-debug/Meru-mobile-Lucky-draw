// Automated Security & Authentication Test Suite for MERU MOBILE SHOP
// Tests all 14 scenarios specified in Requirement 21

const BASE_URL = 'http://127.0.0.1:3000/api';

async function runSecurityTestSuite() {
  console.log('🔒 Running MERU Mobile Shop Production Admin Authentication Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // TEST 1: Logged out access check
    console.log('--- TEST 1: Logged Out User Calling Admin Me API ---');
    const noAuthRes = await fetch(`${BASE_URL}/admin/auth/me`);
    assert(noAuthRes.status === 401, `Unauthenticated request returned HTTP ${noAuthRes.status} (Expected 401)`);
    const noAuthData = await noAuthRes.json();
    assert(noAuthData.success === false, 'success is false for logged out user');

    // TEST 2: Random Unauthorized Gmail attempting Google Login
    console.log('\n--- TEST 2: Random Unauthorized Gmail Account ---');
    const randomEmail = `intruder_${Date.now()}@gmail.com`;
    const randomLoginRes = await fetch(`${BASE_URL}/admin/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail, name: 'Random Person' })
    });
    assert(randomLoginRes.status === 403, `Unauthorized Gmail returned HTTP ${randomLoginRes.status} (Expected 403)`);
    const randomLoginData = await randomLoginRes.json();
    assert(randomLoginData.success === false, 'Access Denied confirmed');
    assert(
      randomLoginData.error?.includes('authorized नहीं') || randomLoginData.error?.includes('not authorized'),
      `Exact bilingual Access Denied message returned: "${randomLoginData.error}"`
    );

    // TEST 3: Authorized Gmail -> Google Login (SUPER_ADMIN)
    console.log('\n--- TEST 3: Authorized Gmail Super Admin Login ---');
    const superAdminEmail = 'rohitjain221199@gmail.com';
    const authUserUUID = '00000000-0000-4000-8000-000000000001';
    const authRes = await fetch(`${BASE_URL}/admin/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: superAdminEmail,
        name: 'Rohit Jain (Store Owner)',
        authUserId: authUserUUID,
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user'
      })
    });
    assert(authRes.status === 200, `Authorized Super Admin login returned HTTP ${authRes.status}`);
    const authData = await authRes.json();
    assert(authData.success === true && authData.token, 'Session token issued');
    assert(authData.user?.role === 'SUPER_ADMIN', `User role is ${authData.user?.role}`);
    assert(authData.user?.auth_user_id === authUserUUID, `auth_user_id securely bound: ${authData.user?.auth_user_id}`);
    const superAdminToken = authData.token;

    // Verify /admin/auth/me with Super Admin token
    const meRes = await fetch(`${BASE_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(meRes.status === 200, `Super Admin /admin/auth/me returned HTTP ${meRes.status}`);
    const meData = await meRes.json();
    assert(meData.user?.email === superAdminEmail, 'Profile email matches Super Admin');
    assert(meData.user?.role === 'SUPER_ADMIN', 'Profile role is SUPER_ADMIN');

    // TEST 4: Authorized Gmail -> Logout -> Admin Inaccessible
    console.log('\n--- TEST 4: Authorized Gmail Signs Out ---');
    const logoutRes = await fetch(`${BASE_URL}/admin/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(logoutRes.status === 200, 'Logout succeeded');
    const postLogoutMe = await fetch(`${BASE_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(postLogoutMe.status === 401, `After logout, token is revoked (HTTP ${postLogoutMe.status})`);

    // TEST 5: Re-login and Refresh while authorized
    console.log('\n--- TEST 5: Refresh While Authorized ---');
    const freshLogin = await fetch(`${BASE_URL}/admin/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: superAdminEmail, authUserId: authUserUUID })
    }).then(r => r.json());
    assert(freshLogin.success && freshLogin.token, 'Fresh session created');
    const activeToken = freshLogin.token;

    const refreshCheck = await fetch(`${BASE_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    });
    assert(refreshCheck.status === 200, 'Session remains valid across requests');

    // TEST 6: Expired / Invalid session token
    console.log('\n--- TEST 6: Expired / Forged Session Token ---');
    const fakeTokenRes = await fetch(`${BASE_URL}/admin/auth/me`, {
      headers: { Authorization: 'Bearer fake_tampered_token_999999' }
    });
    assert(fakeTokenRes.status === 401, `Forged token returns HTTP ${fakeTokenRes.status} (Expected 401)`);

    // TEST 7: Random user direct API call: POST /admin/prize-assignments/.../activate
    console.log('\n--- TEST 7: Unauthenticated Direct Call to Activate Assignment ---');
    const directActivate = await fetch(`${BASE_URL}/admin/prize-assignments/ASG-12345/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert(directActivate.status === 401 || directActivate.status === 403, `Unauthenticated call returned HTTP ${directActivate.status} (Protected)`);

    // TEST 8: Random user attempts probability change
    console.log('\n--- TEST 8: Unauthenticated Direct Call to Change Probability ---');
    const directProb = await fetch(`${BASE_URL}/admin/gifts/probabilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ probabilities: { 'g-box': 100 } })
    });
    assert(directProb.status === 401 || directProb.status === 403, `Direct probability call returned HTTP ${directProb.status} (Protected)`);

    // TEST 9: Random user attempts Add Prize
    console.log('\n--- TEST 9: Unauthenticated Direct Call to Add Prize ---');
    const directAddPrize = await fetch(`${BASE_URL}/admin/gifts/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Prize', totalQuantity: 100 })
    });
    assert(directAddPrize.status === 401 || directAddPrize.status === 403, `Direct Add Prize call returned HTTP ${directAddPrize.status} (Protected)`);

    // TEST 11: SUPER_ADMIN adds a new ADMIN account
    console.log('\n--- TEST 11: SUPER_ADMIN Adds New ADMIN Account ---');
    const newAdminEmail = `staff_${Date.now()}@gmail.com`;
    const addAdminRes = await fetch(`${BASE_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`
      },
      body: JSON.stringify({
        email: newAdminEmail,
        name: 'Staff Member',
        role: 'ADMIN'
      })
    });
    assert(addAdminRes.status === 200, `Add Admin returned HTTP ${addAdminRes.status}`);
    const addAdminData = await addAdminRes.json();
    assert(addAdminData.success && addAdminData.user?.id, `Admin created with ID: ${addAdminData.user?.id}`);
    assert(addAdminData.user?.role === 'ADMIN', 'Role is ADMIN');
    const createdAdminId = addAdminData.user.id;

    // Staff member logs in with authorized Google email
    const staffLogin = await fetch(`${BASE_URL}/admin/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newAdminEmail, name: 'Staff Member' })
    }).then(r => r.json());
    assert(staffLogin.success && staffLogin.token, 'Newly authorized ADMIN can log in');
    const staffToken = staffLogin.token;

    // TEST 10: Normal ADMIN tries Admin Management (Add/Delete/Change Admin) -> 403 Forbidden
    console.log('\n--- TEST 10: Normal ADMIN Tries Admin Management (Super Admin Only) ---');
    const staffTriesAdd = await fetch(`${BASE_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        email: 'attacker@gmail.com',
        name: 'Attacker',
        role: 'SUPER_ADMIN'
      })
    });
    assert(staffTriesAdd.status === 403, `Normal ADMIN blocked from Admin Management (HTTP ${staffTriesAdd.status})`);
    const staffAddData = await staffTriesAdd.json();
    assert(staffAddData.error?.includes('SUPER_ADMIN'), `Error message indicates SUPER_ADMIN required: "${staffAddData.error}"`);

    // TEST 12: SUPER_ADMIN deactivates ADMIN -> immediately loses access
    console.log('\n--- TEST 12: SUPER_ADMIN Deactivates ADMIN Account ---');
    const deactivateRes = await fetch(`${BASE_URL}/admin/users/${createdAdminId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`
      },
      body: JSON.stringify({ is_active: false })
    });
    assert(deactivateRes.status === 200, 'Deactivation call succeeded');

    // The staff member's active session is immediately revoked
    const deactivatedStaffMe = await fetch(`${BASE_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(deactivatedStaffMe.status === 401 || deactivatedStaffMe.status === 403, `Deactivated staff token immediately rejected: HTTP ${deactivatedStaffMe.status}`);

    // If deactivated staff tries to log in again with Google
    const reloginDeactivated = await fetch(`${BASE_URL}/admin/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newAdminEmail, name: 'Staff Member' })
    });
    assert(reloginDeactivated.status === 403, `Deactivated Google login rejected with HTTP ${reloginDeactivated.status}`);
    const reloginData = await reloginDeactivated.json();
    assert(reloginData.error?.includes('deactivated'), `Error mentions account deactivated: "${reloginData.error}"`);

    // TEST 13: LocalStorage manipulation check (Backend server is source of truth)
    console.log('\n--- TEST 13: LocalStorage / Fake Token Manipulation Prevention ---');
    const fakeAdminToken = 'token_with_role_super_admin_injected';
    const fakeTokenCheck = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${fakeAdminToken}` }
    });
    assert(fakeTokenCheck.status === 401, `Client-side token forgery rejected by server (HTTP ${fakeTokenCheck.status})`);

    // TEST 14: Public customer functionality remains 100% accessible without any auth
    console.log('\n--- TEST 14: Public Lucky Draw Campaign Verification (Zero Login Required for Customers) ---');
    const publicConfig = await fetch(`${BASE_URL}/config`);
    assert(publicConfig.status === 200, `Public config accessible without login: HTTP ${publicConfig.status}`);
    const configData = await publicConfig.json();
    assert(configData.success === true, 'Public config response success: true');
    assert(configData.gifts?.length >= 10, `Public gifts catalog available: ${configData.gifts?.length} gifts`);

    // Public customer registers and plays without login
    const publicMobile = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    const regRes = await fetch(`${BASE_URL}/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Public Shopper',
        mobile: publicMobile,
        billNumber: 'MMS-9999',
        locality: 'Ganj Basoda'
      })
    }).then(r => r.json());
    assert(regRes.success === true && regRes.entryId, `Public customer registered without login: ${regRes.entryId}`);

    const playRes = await fetch(`${BASE_URL}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: regRes.entryId,
        fullName: 'Public Shopper',
        mobile: publicMobile,
        gameType: 'spin'
      })
    }).then(r => r.json());
    assert(playRes.success === true && playRes.entry?.giftName, `Public customer spun & won: ${playRes.entry?.giftName}`);

    // Verify Audit Logs recorded LOGIN, LOGOUT, ADMIN_CREATED, ADMIN_DEACTIVATED
    console.log('\n--- Audit Logs Verification ---');
    const auditLogsRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    }).then(r => r.json());
    assert(auditLogsRes.success && auditLogsRes.logs?.length > 0, 'Audit logs recorded');
    const actions = auditLogsRes.logs.map(l => l.action);
    console.log('  Recent recorded audit actions:', actions.slice(0, 7));
    assert(actions.includes('LOGIN'), 'Audit log contains LOGIN');
    assert(actions.includes('LOGOUT'), 'Audit log contains LOGOUT');
    assert(actions.includes('ADMIN_CREATED'), 'Audit log contains ADMIN_CREATED');
    assert(actions.includes('ADMIN_DEACTIVATED'), 'Audit log contains ADMIN_DEACTIVATED');

    console.log(`\n🎉 ALL 14 SECURITY & AUTHENTICATION TESTS PASSED SUCCESSFULLY! (${passed} checks passed, ${failed} failed)\n`);
  } catch (err) {
    console.error('\n❌ Security Test Suite Failed:', err);
    process.exit(1);
  }
}

runSecurityTestSuite();
