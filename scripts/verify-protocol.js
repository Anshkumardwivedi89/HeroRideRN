// Verification test script for Hero Scooter Cluster BLE Protocol Encoders
const assert = require('assert');

function padString(str, targetLength) {
  const sanitized = (str || '').replace(/~/g, ' ').trim();
  if (sanitized.length >= targetLength) {
    return sanitized.substring(0, targetLength);
  }
  return sanitized + '~'.repeat(targetLength - sanitized.length);
}

function buildNavigationPacket(icon, distanceMeters, streetName) {
  const paddedStreet = padString(streetName, 18);
  const clampedDist = Math.min(Math.max(Math.round(distanceMeters), 0), 99999);
  return `M${icon}~${clampedDist}~${paddedStreet}~\n`;
}

function buildClearNavigationPacket() {
  const emptyStreet = padString('', 18);
  return `M00~0~${emptyStreet}~\n`;
}

function buildIncomingCallPacket(caller) {
  const padded = padString(caller || 'Unknown', 14);
  return `1${padded}~\n`;
}

function buildActiveCallPacket(caller, seconds) {
  const padded = padString(caller || 'Unknown', 14);
  return `2${padded}~${seconds}~\n`;
}

function buildCallEndedPacket() {
  return `7~0~d\n`;
}

function buildSmsAlertPacket(sender) {
  const padded = padString(sender || 'New SMS', 14);
  return `6${padded}~\n`;
}

function buildBatteryAndSignalPacket(battery, signalBars, netType = '4G') {
  const b = Math.min(Math.max(battery, 0), 100);
  const s = Math.min(Math.max(signalBars, 0), 4);
  return `4${b}~${s}~${netType}~\n`;
}

function buildLowBatteryWarningPacket() {
  return `30124\n`;
}

function buildMusicTrackPacket(title, artist, isPlaying) {
  const t = padString(title, 12);
  const a = padString(artist, 10);
  return `9${t}~${a}~${isPlaying ? '1' : '0'}~\n`;
}

console.log('--- Verifying Hero Scooter BLE Encoders ---');

// 1. Navigation Packet
const nav = buildNavigationPacket('02', 500, 'MG Road');
assert.strictEqual(nav, 'M02~500~MG Road~~~~~~~~~~~~\n');
console.log('✓ Navigation Packet (M02 500m MG Road):', JSON.stringify(nav));

// 2. Clear Navigation
const clearNav = buildClearNavigationPacket();
assert.strictEqual(clearNav, 'M00~0~~~~~~~~~~~~~~~~~~~~\n');
console.log('✓ Clear Nav Packet:', JSON.stringify(clearNav));

// 3. Incoming Call
const call = buildIncomingCallPacket('John Doe');
assert.strictEqual(call, '1John Doe~~~~~~~\n');
console.log('✓ Incoming Call (John Doe):', JSON.stringify(call));

// 4. SMS Alert
const sms = buildSmsAlertPacket('Mom');
assert.strictEqual(sms, '6Mom~~~~~~~~~~~~\n');
console.log('✓ SMS Alert (Mom):', JSON.stringify(sms));

// 5. Battery and Signal
const batt = buildBatteryAndSignalPacket(85, 3, '4G');
assert.strictEqual(batt, '485~3~4G~\n');
console.log('✓ Battery & Signal (85%, 3 bars, 4G):', JSON.stringify(batt));

// 6. Call Ended
const endCall = buildCallEndedPacket();
assert.strictEqual(endCall, '7~0~d\n');
console.log('✓ Call Ended Packet:', JSON.stringify(endCall));

// 7. Low Battery Warning
const lowBatt = buildLowBatteryWarningPacket();
assert.strictEqual(lowBatt, '30124\n');
console.log('✓ Low Battery Warning Packet:', JSON.stringify(lowBatt));

// 8. Music Track
const music = buildMusicTrackPacket('Believer', 'Imagine D', true);
assert.strictEqual(music, '9Believer~~~~~Imagine D~~1~\n');
console.log('✓ Music Track Packet:', JSON.stringify(music));

console.log('\n--> ALL HERO SCOOTER CLUSTER PACKET TESTS PASSED WITH 100% ACCURACY! <--');
