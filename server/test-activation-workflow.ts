import { db } from './db.js';
import { AdminSession } from './types.js';

async function runTests() {
  console.log('--- STARTING ACTIVATION WORKFLOW TEST SUITE ---');

  const mockAdmin: AdminSession = {
    token: 'test-admin-token',
    userId: 'admin-super-rohit',
    email: 'rohitjain221199@gmail.com',
    name: 'Rohit Jain (Store Owner)',
    role: 'SUPER_ADMIN',
    expiresAt: Date.now() + 3600000
  };

  // 1: Create a test customer and unplayed entry
  console.log('\n[1] Registering fresh test customer & entry...');
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const testMobile = `98260${randomSuffix}`;
  const regResult = db.registerCustomerEntry({
    fullName: 'Test Customer Workflow',
    mobile: testMobile,
    billNumber: `BILL-${randomSuffix}`,
    locality: 'Ganj Basoda Market'
  });

  const entryId = regResult.entry.id;
  console.log(`✓ Entry registered: ${entryId} for mobile ${testMobile}`);

  // 2: Create a Pending Assignment
  console.log('\n[2] Creating Pending Prize Assignment for this entry...');
  const gifts = db.getAdminStats().gifts;
  const targetGift = gifts[0];

  const asgResult = await db.createPrizeAssignment(
    {
      campaignId: 'meru-festive-2024',
      prizeId: targetGift.id,
      mode: 'ENTRY_SPECIFIC',
      targetEntryId: entryId,
      targetMobile: testMobile,
      customerName: 'Test Customer Workflow',
      note: 'Activation workflow verification test'
    },
    mockAdmin
  );

  const asgId = asgResult.assignment.id;
  console.log(`✓ Assignment created: ${asgId}, Status: ${asgResult.assignment.status}`);
  if (asgResult.assignment.status !== 'PENDING') {
    throw new Error(`Expected status PENDING, got ${asgResult.assignment.status}`);
  }

  // 3: Verify Admin can see it in PENDING list
  console.log('\n[3] Checking Pending list query...');
  const pendingList = db.getPrizeAssignments({ status: 'PENDING' });
  const foundPending = pendingList.find(a => a.id === asgId);
  if (!foundPending) throw new Error('Assignment not found in PENDING list');
  console.log(`✓ Assignment found in PENDING list`);

  // 4: Activate Assignment (Pending -> Active)
  console.log('\n[4] Activating Assignment (Server-side validation & status update)...');
  const activateResult = await db.activatePrizeAssignment(asgId, mockAdmin);
  console.log(`✓ Activation result: status=${activateResult.assignment.status}`);
  if (activateResult.assignment.status !== 'ACTIVE') {
    throw new Error(`Expected status ACTIVE, got ${activateResult.assignment.status}`);
  }

  // 5: Verify Admin can see it in Active list
  console.log('\n[5] Checking Active list query...');
  const activeList = db.getPrizeAssignments({ status: 'ACTIVE' });
  const foundActive = activeList.find(a => a.id === asgId);
  if (!foundActive) throw new Error('Assignment not found in ACTIVE list');
  console.log(`✓ Assignment found in ACTIVE list`);

  // 6: Customer Plays (Active -> Allocated)
  console.log('\n[6] Testing Customer Play (Active -> Allocated Highest Priority)...');
  const spinResult = await db.allocateDraw({
    campaignId: 'meru-festive-2024',
    fullName: 'Test Customer Workflow',
    mobile: testMobile,
    gameType: 'spin',
    entryId: entryId
  });

  console.log(`✓ Customer played draw. Result gift: ${spinResult.entry.giftName}`);
  if (spinResult.entry.giftId !== targetGift.id) {
    throw new Error(`Expected prize ${targetGift.id} (${targetGift.name}), got ${spinResult.entry.giftId} (${spinResult.entry.giftName})`);
  }

  // 7: Check Assignment updated to ALLOCATED
  const updatedAsgList = db.getPrizeAssignments();
  const allocatedAsg = updatedAsgList.find(a => a.id === asgId);
  if (!allocatedAsg || allocatedAsg.status !== 'ALLOCATED') {
    throw new Error(`Expected assignment status ALLOCATED, got ${allocatedAsg?.status}`);
  }
  console.log(`✓ Assignment successfully marked ALLOCATED with allocatedAt=${allocatedAsg.allocatedAt}`);

  // 8: Test Cancellation of another Active Assignment
  console.log('\n[8] Testing Cancel Assignment Workflow...');
  const randomSuffix2 = Math.floor(10000 + Math.random() * 90000);
  const testMobile2 = `98260${randomSuffix2}`;
  const reg2 = db.registerCustomerEntry({
    fullName: 'Cancel Test User',
    mobile: testMobile2,
    billNumber: `BILL-${randomSuffix2}`
  });

  const asg2Result = await db.createPrizeAssignment(
    {
      campaignId: 'meru-festive-2024',
      prizeId: targetGift.id,
      mode: 'ENTRY_SPECIFIC',
      targetEntryId: reg2.entry.id,
      targetMobile: testMobile2
    },
    mockAdmin
  );

  await db.activatePrizeAssignment(asg2Result.assignment.id, mockAdmin);
  const cancelResult = await db.cancelPrizeAssignment(
    asg2Result.assignment.id,
    'Admin cancelled test',
    mockAdmin
  );

  if (!cancelResult.assignment || cancelResult.assignment.status !== 'CANCELLED') {
    throw new Error(`Expected status CANCELLED, got ${cancelResult.assignment?.status}`);
  }
  console.log(`✓ Assignment successfully CANCELLED before customer play`);

  console.log('\n🎉 ALL ACTIVATION WORKFLOW INTEGRATION TESTS PASSED!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
