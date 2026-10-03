import { db } from './db.js';
import { AdminSession, AdminUser } from './types.js';

async function runSecurityTestSuite() {
  console.log('===============================================================');
  console.log('🛡️ RUNNING COMPREHENSIVE GOOGLE AUTH & RBAC SECURITY TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [TEST ${total}] PASS: ${testName}`);
      if (detail) console.log(`   ℹ️ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [TEST ${total}] FAIL: ${testName}`);
      if (detail) console.error(`   ⚠️ Details: ${detail}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // TEST 1: Pre-approved Authorized Gmail (Store Owner) Login
  console.log('\n--- 1. Testing Authorized Gmail Authentication ---');
  const superAdminEmail = 'rohitjain221199@gmail.com';
  const superAdminAuth = db.authenticateGoogleAdmin(superAdminEmail, { name: 'Rohit Jain (Store Owner)' });
  assert(
    superAdminAuth.success === true && !!superAdminAuth.session && !!superAdminAuth.user,
    'Authorized Gmail (Owner) receives valid session and user profile',
    `Role: ${superAdminAuth.user?.role}, Token: ${superAdminAuth.session?.token.slice(0, 10)}...`
  );
  assert(
    superAdminAuth.user?.role === 'SUPER_ADMIN',
    'Primary store owner is recognized as SUPER_ADMIN'
  );

  // TEST 2: Unauthorized Gmail Login Attempt
  console.log('\n--- 2. Testing Unauthorized Gmail Account (Allowlist Protection) ---');
  const unauthorizedEmail = 'random.hacker@gmail.com';
  const unauthorizedAuth = db.authenticateGoogleAdmin(unauthorizedEmail);
  assert(
    unauthorizedAuth.success === false && unauthorizedAuth.session === undefined,
    'Unauthorized Google account is strictly denied access',
    `Error returned: "${unauthorizedAuth.error}"`
  );
  assert(
    Boolean(unauthorizedAuth.error?.includes('Access Denied')),
    'Returns clear "Access Denied" message for unauthorized accounts'
  );

  // TEST 3: Direct API / Session Token Verification
  console.log('\n--- 3. Testing Session Token Validation Server-Side ---');
  const validToken = superAdminAuth.session!.token;
  const verifiedSession = db.verifySession(validToken);
  assert(
    verifiedSession !== null && verifiedSession.email === superAdminEmail,
    'Valid session token successfully passes server-side verification'
  );

  const fakeSession = db.verifySession('fake-forged-token-xyz-123');
  assert(
    fakeSession === null,
    'Forged / invalid token is rejected by server'
  );

  const emptySession = db.verifySession('');
  assert(
    emptySession === null,
    'Empty token is rejected by server'
  );

  // TEST 4: SUPER_ADMIN Adding New Admin to Allowlist
  console.log('\n--- 4. Testing SUPER_ADMIN Adding New Operational Admin ---');
  const newOpsEmail = `manager.test.${Date.now()}@gmail.com`;
  const addedAdmin = await db.addAdminUser(
    { email: newOpsEmail, name: 'Ops Manager', role: 'ADMIN' },
    superAdminAuth.session!
  );
  assert(
    addedAdmin.email === newOpsEmail && addedAdmin.role === 'ADMIN' && addedAdmin.is_active === true,
    'SUPER_ADMIN can successfully add new ADMIN to allowlist',
    `Created Admin ID: ${addedAdmin.id}, Role: ${addedAdmin.role}`
  );

  // TEST 5: Newly Added Admin Can Now Authenticate
  console.log('\n--- 5. Testing Newly Added Admin Authentication ---');
  const opsAuth = db.authenticateGoogleAdmin(newOpsEmail, { name: 'Ops Manager' });
  assert(
    opsAuth.success === true && opsAuth.user?.role === 'ADMIN',
    'Newly authorized operational admin can log in with Google account',
    `User: ${opsAuth.user?.name} [Role: ${opsAuth.user?.role}]`
  );

  // TEST 6: Inactive / Deactivated Admin Access Rejection
  console.log('\n--- 6. Testing Deactivated Admin Rejection ---');
  await db.updateAdminUser(addedAdmin.id, { is_active: false }, superAdminAuth.session!);
  
  // Previous token must be revoked immediately
  const revokedSession = db.verifySession(opsAuth.session!.token);
  assert(
    revokedSession === null,
    'Deactivated admin session is immediately revoked and invalidated'
  );

  // New login attempt by deactivated admin must be rejected
  const deactivatedLogin = db.authenticateGoogleAdmin(newOpsEmail);
  assert(
    deactivatedLogin.success === false && Boolean(deactivatedLogin.error?.includes('deactivated')),
    'Login attempt by deactivated admin is rejected with clear deactivation notice',
    `Deactivation message: "${deactivatedLogin.error}"`
  );

  // Reactivate admin for further role tests
  await db.updateAdminUser(addedAdmin.id, { is_active: true }, superAdminAuth.session!);
  const reactivatedLogin = db.authenticateGoogleAdmin(newOpsEmail);
  assert(
    reactivatedLogin.success === true,
    'Reactivated admin can successfully authenticate again'
  );

  // TEST 7: Store Owner Protection (Cannot be deactivated or deleted)
  console.log('\n--- 7. Testing Store Owner Safety Invariant ---');
  const ownerUser = db.getAdminUsers().find(u => u.email === superAdminEmail)!;
  let ownerProtectionWorked = false;
  try {
    await db.updateAdminUser(ownerUser.id, { is_active: false }, superAdminAuth.session!);
  } catch (err: any) {
    ownerProtectionWorked = true;
  }
  assert(
    ownerProtectionWorked,
    'Primary Store Owner cannot be deactivated (Immunity enforced)'
  );

  let ownerDeleteProtectionWorked = false;
  try {
    await db.removeAdminUser(ownerUser.id, superAdminAuth.session!);
  } catch (err: any) {
    ownerDeleteProtectionWorked = true;
  }
  assert(
    ownerDeleteProtectionWorked,
    'Primary Store Owner cannot be removed from allowlist'
  );

  // TEST 8: Role Elevation / Change by SUPER_ADMIN
  console.log('\n--- 8. Testing Admin Role Elevation ---');
  await db.updateAdminUser(addedAdmin.id, { role: 'SUPER_ADMIN' }, superAdminAuth.session!);
  const updatedUser = db.getAdminUsers().find(u => u.id === addedAdmin.id)!;
  assert(
    updatedUser.role === 'SUPER_ADMIN',
    'SUPER_ADMIN can promote admin role to SUPER_ADMIN'
  );

  // TEST 9: Admin Session Invalidation on Logout
  console.log('\n--- 9. Testing Session Logout & Invalidation ---');
  const logoutToken = reactivatedLogin.session!.token;
  db.revokeSession(logoutToken);
  const postLogoutSession = db.verifySession(logoutToken);
  assert(
    postLogoutSession === null,
    'Logged-out session token is purged and rejected on all subsequent requests'
  );

  // TEST 10: Audit Logging of Admin Actions with Google Email
  console.log('\n--- 10. Testing Audit Logs for Sensitive Actions ---');
  const recentLogs = db.getAuditLogs(10);
  const lastAddLog = recentLogs.find(l => l.action === 'ADD_ADMIN');
  assert(
    lastAddLog !== undefined && lastAddLog.adminUser === superAdminEmail,
    'Sensitive admin operations log authenticated Google email address',
    `Action: ${lastAddLog?.action}, Admin: ${lastAddLog?.adminUser}, Target: ${lastAddLog?.newValue}`
  );
  assert(
    lastAddLog?.admin_user_id === superAdminAuth.session!.userId && lastAddLog?.email === superAdminEmail,
    'Audit log contains both camelCase and snake_case properties for compatibility'
  );

  // Clean up test admin
  await db.removeAdminUser(addedAdmin.id, superAdminAuth.session!);

  console.log('\n===============================================================');
  console.log(`🎉 ALL ${passed}/${total} SECURITY AND AUTHENTICATION TESTS PASSED!`);
  console.log('===============================================================\n');
}

runSecurityTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
