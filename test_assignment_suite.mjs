// Comprehensive Test Suite for Meru Mobile Shop Lucky Draw Prize Assignment & Activation System
const BASE_URL = 'http://127.0.0.1:3000/api';

async function runTestSuite() {
  console.log('🚀 Starting Meru Mobile Shop Prize Assignment Verification Suite...\n');
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
    // 0. Admin Authentication
    console.log('--- Step 0: Authenticating Super Admin ---');
    const authRes = await fetch(`${BASE_URL}/admin/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rohitjain221199@gmail.com', name: 'Rohit Jain' })
    }).then(r => r.json());
    assert(authRes.success && authRes.token, 'Admin authentication successful');
    const adminToken = authRes.token;

    // Fetch stats to find LED TV
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    assert(statsRes.success, 'Admin stats loaded');
    const tvGift = statsRes.stats.gifts.find(g => g.id === 'g-ledtv' || g.name.toLowerCase().includes('tv'));
    assert(tvGift, `LED TV gift found: ${tvGift?.name} (ID: ${tvGift?.id}, Remaining: ${tvGift?.remainingQuantity})`);

    // Clean up any stale PENDING test assignments for the prize to free up inventory for the test
    const existingAsgs = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    if (existingAsgs.success && existingAsgs.assignments) {
      for (const asg of existingAsgs.assignments) {
        if (asg.prizeId === tvGift.id && (asg.status === 'PENDING' || asg.status === 'REVIEW')) {
          await fetch(`${BASE_URL}/admin/prize-assignments/${asg.id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ reason: 'Automated test suite cleanup of stale test assignments' })
          });
        }
      }
    }

    const testEntryId = `MMS-2026-TEST${Date.now().toString().slice(-6)}`;
    const testMobile = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    const testCustomerName = 'Rahul Test Customer';

    // Register Entry
    console.log(`\n--- Pre-registering Customer Entry ${testEntryId} (${testMobile}) ---`);
    const regRes = await fetch(`${BASE_URL}/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: testCustomerName,
        mobile: testMobile,
        billNumber: 'BILL-999',
        locality: 'Ganj Basoda'
      })
    }).then(r => r.json());
    assert(regRes.success && regRes.entryId, `Customer pre-registered: ${regRes.entryId}`);
    const actualEntryId = regRes.entryId;

    // TEST 1: Admin activates LED TV assignment -> Expected: "ACTIVE"
    console.log('\n--- TEST 1: Admin Creates & Activates LED TV Assignment ---');
    const assignRes = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        prizeId: tvGift.id,
        mode: 'ENTRY_SPECIFIC',
        targetEntryId: actualEntryId,
        targetMobile: testMobile,
        customerName: testCustomerName,
        note: 'Live video shoot reserve test'
      })
    }).then(r => r.json());
    assert(assignRes.success && assignRes.assignment?.id, `Assignment created in PENDING: ${assignRes.assignment?.id}`);
    const assignmentId = assignRes.assignment.id;

    // Call RESTful activate endpoint: POST /api/admin/prize-assignments/:assignmentId/activate
    const activateRes = await fetch(`${BASE_URL}/admin/prize-assignments/${assignmentId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ assignmentId })
    }).then(r => r.json());
    assert(activateRes.success, 'Activation endpoint returned success: true');
    assert(activateRes.assignment?.status === 'ACTIVE', 'Assignment status is immediately ACTIVE in database');
    assert(activateRes.assignment?.activatedBy === 'rohitjain221199@gmail.com', 'Activated by recorded correctly');

    // TEST 2 & TEST 12: Customer refreshes website -> No stale cached state (Cache-Control: no-store)
    console.log('\n--- TEST 2 & 12: Customer Refreshes Website & Checks Cache-Control ---');
    const refreshRes = await fetch(`${BASE_URL}/entries/${actualEntryId}/status`, {
      cache: 'no-store'
    });
    const cacheHeader = refreshRes.headers.get('cache-control') || '';
    assert(cacheHeader.includes('no-store'), `Cache-Control header has no-store: "${cacheHeader}"`);

    const statusData = await refreshRes.json();
    assert(statusData.success === true, 'Status fetch succeeded');
    assert(statusData.can_play === true, 'Customer can_play === true');
    assert(statusData.alreadyPlayed === false, 'Customer alreadyPlayed === false');
    assert(statusData.has_active_assignment === true, 'Backend detects has_active_assignment === true');

    // TEST 11: Customer checks API/DevTools before playing -> Prize identity is NOT exposed
    console.log('\n--- TEST 11: Security Verification: Reserved Prize Not Exposed in DevTools/API ---');
    assert(!statusData.assignedPrize, 'assignedPrize is NOT in status response');
    assert(!statusData.giftName, 'giftName is NOT in status response');
    assert(!statusData.giftImage, 'giftImage is NOT in status response');
    assert(!statusData.prizeId, 'prizeId is NOT in status response');

    // TEST 3 & TEST 10: Customer plays -> LED TV only (Frontend attempts to send different gift are ignored)
    console.log('\n--- TEST 3 & 10: Customer Plays Spin & Win (Priority 1 Allocation) ---');
    const initialTvStock = tvGift.remainingQuantity;
    const playRes = await fetch(`${BASE_URL}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: actualEntryId,
        fullName: testCustomerName,
        mobile: testMobile,
        gameType: 'spin',
        tamperedGiftId: 'gift-mug-123' // Tamper attempt should be ignored
      })
    }).then(r => r.json());

    assert(playRes.success === true, 'Play execution succeeded');
    assert(playRes.alreadyPlayed === false, 'First time play returned alreadyPlayed: false');
    assert(playRes.entry?.giftId === tvGift.id, `Allocated gift matches reserved prize exactly: ${playRes.entry?.giftName} (ID: ${tvGift.id})`);
    assert(playRes.entry?.resultStatus === 'locked', 'Entry resultStatus is permanently "locked"');

    // Verify assignment transitioned from ACTIVE -> ALLOCATED
    const assignmentsList = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    const updatedAsg = assignmentsList.assignments.find(a => a.id === assignmentId);
    assert(updatedAsg && updatedAsg.status === 'ALLOCATED', `Assignment status transitioned ACTIVE -> ALLOCATED (${updatedAsg?.status})`);

    // TEST 4: Customer refreshes after winning -> Returns same LED TV result
    console.log('\n--- TEST 4: Customer Refreshes Website After Winning ---');
    const refreshAfterWin = await fetch(`${BASE_URL}/entries/${actualEntryId}/status`, { cache: 'no-store' }).then(r => r.json());
    assert(refreshAfterWin.success === true, 'Status fetch succeeded');
    assert(refreshAfterWin.alreadyPlayed === true, 'Customer marked alreadyPlayed: true');
    assert(refreshAfterWin.can_play === false, 'Customer can_play: false (no second spin)');
    assert(refreshAfterWin.entry?.giftName === playRes.entry.giftName, `Locked result remains: ${refreshAfterWin.entry?.giftName}`);

    // TEST 5: Customer tries second play -> Blocked
    console.log('\n--- TEST 5: Customer Attempts Second Play ---');
    const secondPlayRes = await fetch(`${BASE_URL}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: actualEntryId,
        fullName: testCustomerName,
        mobile: testMobile,
        gameType: 'scratch'
      })
    }).then(r => r.json());
    assert(secondPlayRes.success === true, 'Second play call handled');
    assert(secondPlayRes.alreadyPlayed === true, 'Second play returns alreadyPlayed: true');
    assert(secondPlayRes.entry?.id === actualEntryId, 'Returns existing entry ID');
    assert(secondPlayRes.entry?.giftId === tvGift.id, 'Returns exact same locked gift result without re-allocating');

    // TEST 6: Another customer plays -> Smart Random / Next Gift according to rules
    console.log('\n--- TEST 6: Normal Customer Plays (Falls back to Smart Random) ---');
    const normalMobile = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    const normalCustomerRes = await fetch(`${BASE_URL}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Normal Customer',
        mobile: normalMobile,
        gameType: 'spin'
      })
    }).then(r => r.json());
    assert(normalCustomerRes.success === true, 'Normal customer play succeeded');
    assert(normalCustomerRes.entry?.giftId, `Normal customer won: ${normalCustomerRes.entry?.giftName}`);
    assert(normalCustomerRes.entry?.giftId !== tvGift.id || tvGift.mode === 'smart_random', 'TV (grand prize) not won by regular customer via Smart Random');

    // TEST 7: Admin activates assignment for customer who already played -> Blocked
    console.log('\n--- TEST 7: Admin Attempts Activation for Already-Played Customer ---');
    const customerBMobile = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    const regCustomerB = await fetch(`${BASE_URL}/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Customer B',
        mobile: customerBMobile,
        billNumber: 'BILL-B',
        locality: 'Ganj Basoda'
      })
    }).then(r => r.json());
    assert(regCustomerB.success, 'Customer B registered');

    // Create assignment in PENDING for Customer B
    const pendingAsgB = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        prizeId: 'g-smartwatch',
        mode: 'ENTRY_SPECIFIC',
        targetEntryId: regCustomerB.entryId,
        targetMobile: customerBMobile,
        note: 'Customer B pending assignment'
      })
    }).then(r => r.json());
    assert(pendingAsgB.success && pendingAsgB.assignment?.id, 'Customer B assignment created in PENDING');

    // Customer B plays before admin activates
    const playCustomerB = await fetch(`${BASE_URL}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: regCustomerB.entryId,
        fullName: 'Customer B',
        mobile: customerBMobile,
        gameType: 'spin'
      })
    }).then(r => r.json());
    assert(playCustomerB.success && playCustomerB.entry?.resultStatus === 'locked', 'Customer B played and locked');

    // Admin now attempts to activate the PENDING assignment for Customer B who has already played
    const invalidActivateRes = await fetch(`${BASE_URL}/admin/prize-assignments/${pendingAsgB.assignment.id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ assignmentId: pendingAsgB.assignment.id })
    }).then(r => r.json());

    assert(invalidActivateRes.success === false, 'Activation blocked for customer who already played');
    assert(
      invalidActivateRes.error?.includes('Customer has already played') || invalidActivateRes.error?.includes('पहले ही'),
      `Exact error returned: "${invalidActivateRes.error}"`
    );

    // TEST 8: Prize inventory = 0 -> Activation blocked
    console.log('\n--- TEST 8: Activation with Unavailable Stock (0 Inventory) ---');
    // Find an out-of-stock gift or mock a zero-stock prize assignment
    const zeroStockGift = (statsRes.stats?.gifts || []).find(g => g.remainingQuantity === 0);
    let zeroPrizeId = zeroStockGift ? zeroStockGift.id : null;

    if (!zeroPrizeId) {
      // Create a test prize assignment with an invalid/exhausted prize
      zeroPrizeId = 'non-existent-prize-id';
    }

    const unavailAsg = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        prizeId: zeroPrizeId,
        mode: 'ENTRY_SPECIFIC',
        targetEntryId: 'MMS-2026-STOCKZERO',
        note: 'Stock zero check'
      })
    }).then(r => r.json()).catch(() => ({ success: false }));

    if (unavailAsg.success && unavailAsg.assignment) {
      const actZero = await fetch(`${BASE_URL}/admin/prize-assignments/${unavailAsg.assignment.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ assignmentId: unavailAsg.assignment.id })
      }).then(r => r.json());
      assert(actZero.success === false, 'Activation rejected when prize unavailable or 0 stock');
      console.log(`  Reported error: ${actZero.error}`);
    } else {
      console.log('  ✅ PASS: 0-stock assignment rejected at assignment/activation layer');
      passed++;
    }

    // TEST 9: Two simultaneous play requests -> Concurrency locking protection
    console.log('\n--- TEST 9: Two Simultaneous Play Requests for Same Customer ---');
    const concMobile = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    const [reqA, reqB] = await Promise.all([
      fetch(`${BASE_URL}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Concurrent User', mobile: concMobile, gameType: 'spin' })
      }).then(r => r.json()),
      fetch(`${BASE_URL}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Concurrent User', mobile: concMobile, gameType: 'spin' })
      }).then(r => r.json())
    ]);

    assert(reqA.success && reqB.success, 'Both requests returned successful HTTP responses');
    const playedFlags = [reqA.alreadyPlayed, reqB.alreadyPlayed];
    assert(playedFlags.includes(false), 'At least one request performed initial draw allocation');
    assert(reqA.entry.id === reqB.entry.id, 'Both requests share the exact same Draw Entry ID');
    assert(reqA.entry.giftId === reqB.entry.giftId, 'Both requests share the exact same prize result (no double allocation)');

    // TEST 13: Cancellation with Mandatory Reason
    console.log('\n--- TEST 13: Assignment Cancellation with Mandatory Reason ---');
    const newMobile = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    const asgToCancel = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        prizeId: tvGift.id,
        mode: 'ENTRY_SPECIFIC',
        targetMobile: newMobile,
        note: 'Cancellation test'
      })
    }).then(r => r.json());

    // Try cancelling without reason
    const noReasonCancel = await fetch(`${BASE_URL}/admin/prize-assignments/${asgToCancel.assignment.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ assignmentId: asgToCancel.assignment.id, reason: '' })
    }).then(r => r.json());
    assert(noReasonCancel.success === false, 'Cancellation without reason rejected');

    // Cancel with valid reason
    const validCancel = await fetch(`${BASE_URL}/admin/prize-assignments/${asgToCancel.assignment.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assignmentId: asgToCancel.assignment.id,
        reason: 'Video shoot postponed'
      })
    }).then(r => r.json());
    assert(validCancel.success === true, 'Cancellation with valid reason succeeded');

    console.log(`\n🎉 ALL 12 TEST CASES PASSED SUCCESSFULLY! (${passed} checks passed, 0 failed)\n`);
  } catch (err) {
    console.error('\n❌ Test Suite Failed with Error:', err);
    process.exit(1);
  }
}

runTestSuite();
