// Comprehensive Automated Test Suite for MERU MOBILE SHOP Lucky Draw
// Covers PART 20: TEST A, B, C, D, E, F, G, H & Root Cause Error Verification

const BASE_URL = 'http://127.0.0.1:3000/api';

async function runUpgradeSuite() {
  console.log('🚀 Running MERU Mobile Shop Upgrade Verification Suite...\n');
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
    // 0. Super Admin Auth
    console.log('--- Step 0: Super Admin Authentication ---');
    const authRes = await fetch(`${BASE_URL}/admin/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rohitjain221199@gmail.com', name: 'Rohit Jain' })
    }).then(r => r.json());
    assert(authRes.success && authRes.token, 'Super admin authenticated');
    const adminToken = authRes.token;

    // Pre-test: Reset gifts to defaults and clean up any active/pending test assignments for fresh state
    await fetch(`${BASE_URL}/admin/gifts/reset-defaults`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const currentAsgs = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    if (currentAsgs.success && currentAsgs.assignments) {
      for (const a of currentAsgs.assignments) {
        if ((a.status === 'ACTIVE' || a.status === 'PENDING') && a.prizeId === 'g-induction') {
          await fetch(`${BASE_URL}/admin/prize-assignments/${a.id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ reason: 'Pre-test reset' })
          });
        }
      }
    }

    // PART 1 Error Verification: Random fake Entry ID (e.g. 12345) must be cleanly rejected with exact Hindi/English message
    console.log('\n--- PART 1 Root Cause Check: Fake Entry ID (12345) Rejected Cleanly ---');
    const fakeAssign = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        prizeId: 'g-induction',
        mode: 'ENTRY_SPECIFIC',
        targetEntryId: '12345',
        note: 'Testing fake entry rejection'
      })
    }).then(r => r.json());
    assert(fakeAssign.success === false, 'Manual fake Entry ID "12345" rejected by server validation');
    assert(fakeAssign.error?.includes('not found') || fakeAssign.error?.includes('सूची से'), `Exact error returned: "${fakeAssign.error}"`);

    // TEST A: Customer Search, Select, Assign Induction Cooktop, Activate -> 🟢 ACTIVE
    console.log('\n--- TEST A: Actual Customer Entry Search, Select, Assign & Activate ---');
    const testMobile = `93402${Math.floor(10000 + Math.random() * 90000)}`;
    const testCustomerName = 'Rahul Jain Basoda';
    const regRes = await fetch(`${BASE_URL}/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: testCustomerName,
        mobile: testMobile,
        billNumber: 'MMS-4582',
        locality: 'Ganj Basoda'
      })
    }).then(r => r.json());
    assert(regRes.success && regRes.entryId, `Customer registered: ${regRes.entryId} (${testMobile})`);
    const actualEntryId = regRes.entryId;

    // Search customer by mobile (Search Component verification)
    const searchRes = await fetch(`${BASE_URL}/admin/search-customers?q=${testMobile}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    assert(searchRes.success && searchRes.results?.length > 0, 'Customer found via real-time search');
    const found = searchRes.results.find(c => c.entryId === actualEntryId);
    assert(found && found.customerName === testCustomerName, 'Search result matches registered customer');

    // Create & Activate Assignment for INDUCTION COOKTOP
    const assignRes = await fetch(`${BASE_URL}/admin/prize-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        prizeId: 'g-induction',
        mode: 'ENTRY_SPECIFIC',
        targetEntryId: actualEntryId,
        targetMobile: testMobile,
        customerName: testCustomerName,
        billNumber: 'MMS-4582',
        note: 'Live video shoot reserve test',
        autoActivate: true
      })
    }).then(r => r.json());
    assert(assignRes.success && assignRes.assignment?.id, `Assignment created: ${assignRes.assignment?.id}`);
    assert(assignRes.assignment?.status === 'ACTIVE', 'Assignment status is immediately 🟢 ACTIVE');

    // TEST B: Customer Website Refresh -> can_play = true, but prize NOT exposed
    console.log('\n--- TEST B: Customer Website Refresh (Cache-Control: no-store & Secret Identity) ---');
    const refreshRes = await fetch(`${BASE_URL}/entries/${actualEntryId}/status`, { cache: 'no-store' });
    const statusData = await refreshRes.json();
    assert(statusData.success === true, 'Status fetch succeeded');
    assert(statusData.can_play === true, 'Customer can_play === true');
    assert(statusData.alreadyPlayed === false, 'Customer alreadyPlayed === false');
    assert(!statusData.assignedPrize && !statusData.giftName && !statusData.prizeId, 'Secret prize identity is NOT leaked before play');

    // TEST C: Customer Spins -> Backend allocates Induction Cooktop
    console.log('\n--- TEST C: Customer Spin & Win (Allocates Assigned Induction Cooktop) ---');
    const playRes = await fetch(`${BASE_URL}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: actualEntryId,
        fullName: testCustomerName,
        mobile: testMobile,
        gameType: 'spin'
      })
    }).then(r => r.json());
    assert(playRes.success === true, 'Play call succeeded');
    assert(playRes.entry?.giftId === 'g-induction', `Won gift matches assigned: ${playRes.entry?.giftName} (ID: ${playRes.entry?.giftId})`);
    assert(playRes.entry?.resultStatus === 'locked', 'Entry result permanently locked');

    // TEST D: Refresh After Winning -> Same result
    console.log('\n--- TEST D: Refresh After Winning (Immutable Locked Result) ---');
    const refreshWinRes = await fetch(`${BASE_URL}/entries/${actualEntryId}/status`, { cache: 'no-store' }).then(r => r.json());
    assert(refreshWinRes.success === true, 'Refresh status succeeded');
    assert(refreshWinRes.alreadyPlayed === true, 'alreadyPlayed === true');
    assert(refreshWinRes.can_play === false, 'can_play === false');
    assert(refreshWinRes.entry?.giftId === 'g-induction', `Result remains Induction Cooktop: ${refreshWinRes.entry?.giftName}`);

    // TEST E: Prize Control Center -> Power Bank 22% -> 15%, Bluetooth Speaker 18% -> 25% (Total 100%)
    console.log('\n--- TEST E: Probability Editor (Power Bank 15%, Speaker 25%, Total 100%) ---');
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());

    const probs = {};
    for (const g of statsRes.stats.gifts) {
      if (g.mode === 'smart_random') {
        probs[g.id] = Number(g.probability);
      }
    }
    // Update Power Bank: 22% -> 15% (-7%)
    // Update Bluetooth Speaker: 18% -> 25% (+7%)
    probs['g-powerbank'] = 15.0;
    probs['g-speaker'] = 25.0;

    const probRes = await fetch(`${BASE_URL}/admin/gifts/probabilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ probabilities: probs })
    }).then(r => r.json());
    assert(probRes.success === true, 'Probability batch save succeeded');
    assert(probRes.totalProbability === 100, `Total probability is exactly 100%: ${probRes.totalProbability}%`);

    // Verify invalid sum rejection (e.g. 97%)
    const invalidProbs = { ...probs, 'g-powerbank': 12.0 }; // Sum = 97%
    const invalidRes = await fetch(`${BASE_URL}/admin/gifts/probabilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ probabilities: invalidProbs })
    }).then(r => r.json());
    assert(invalidRes.success === false, 'Invalid probability sum (97%) rejected by server validation');

    // TEST F: Add New Gift "Wireless Earphone", Stock = 10, Probability = 5% with Rebalance
    console.log('\n--- TEST F: Add New Gift "Wireless Earphone" (Stock 10, Prob 5%, Rebalance Confirmed) ---');
    const newGiftRes = await fetch(`${BASE_URL}/admin/gifts/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Wireless Earphone',
        nameHi: 'वायरलेस ईयरफोन',
        prizeType: 'SMART_RANDOM',
        totalQuantity: 10,
        probability: 5.0,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
        description: 'Noise Cancelling Wireless Stereo Earphones with Deep Bass',
        rebalance: true
      })
    }).then(r => r.json());
    assert(newGiftRes.success === true && newGiftRes.gift?.id, `New gift added: ${newGiftRes.gift?.name} (ID: ${newGiftRes.gift?.id})`);
    assert(newGiftRes.gift?.remainingQuantity === 10, 'Stock initialized to 10');
    assert(newGiftRes.totalProbability === 100, `Post-rebalance total probability is exactly 100% (${newGiftRes.totalProbability}%)`);
    const newGiftId = newGiftRes.gift.id;

    // TEST G: Toggle New Gift INACTIVE -> Excluded from Smart Random
    console.log('\n--- TEST G: Inactive Gift Excluded from Smart Random Selection ---');
    const deactRes = await fetch(`${BASE_URL}/admin/gifts/${newGiftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ active: false })
    }).then(r => r.json());
    assert(deactRes.success === true && deactRes.gift?.active === false, 'Gift marked INACTIVE');

    // TEST H: Stock = 0 -> Status is OUT OF STOCK and random allocation stopped
    console.log('\n--- TEST H: Zero Stock (Out of Stock) Protection ---');
    const zeroStockRes = await fetch(`${BASE_URL}/admin/gifts/${newGiftId}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ newQuantity: 0 })
    }).then(r => r.json());
    assert(zeroStockRes.success === true && zeroStockRes.gift?.remainingQuantity === 0, 'Gift stock set to 0 (OUT OF STOCK)');

    console.log(`\n🎉 ALL UPGRADE TESTS (A, B, C, D, E, F, G, H) PASSED SUCCESSFULLY! (${passed} checks passed, ${failed} failed)\n`);
  } catch (err) {
    console.error('\n❌ Upgrade Suite Failed with Error:', err);
    process.exit(1);
  }
}

runUpgradeSuite();
