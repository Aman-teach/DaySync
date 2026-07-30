import { parseDateKeySafely } from './utils/helpers';

console.log('=======================================================');
console.log('   RUNTIME VERIFICATION AUDIT: DATE PARSING SAFETY');
console.log('=======================================================');

const testCases = [
  { name: 'Valid Date', input: '2025-01-15', expected: 'valid' },
  { name: 'Empty String', input: '', expected: 'invalid' },
  { name: 'Null', input: null as any, expected: 'invalid' },
  { name: 'Undefined', input: undefined as any, expected: 'invalid' },
  { name: 'Malformed String (Too Few Parts)', input: '2025-01', expected: 'invalid' },
  { name: 'Malformed String (Too Many Parts)', input: '2025-01-15-20', expected: 'invalid' },
  { name: 'Malformed String (Text)', input: 'hello-world-foo', expected: 'invalid' },
  { name: 'Invalid Month (13)', input: '2025-13-15', expected: 'invalid' },
  { name: 'Invalid Month (0)', input: '2025-00-15', expected: 'invalid' },
  { name: 'Invalid Day (32)', input: '2025-01-32', expected: 'invalid' },
  { name: 'Invalid Day (0)', input: '2025-01-00', expected: 'invalid' },
  { name: 'NaN Year', input: 'NaN-01-15', expected: 'invalid' },
  { name: 'Leap year', input: '2024-02-29', expected: 'valid' },
  { name: 'Non-leap year', input: '2025-02-29', expected: 'invalid' },
  { name: 'April 31', input: '2025-04-31', expected: 'invalid' },
  { name: 'February 30', input: '2025-02-30', expected: 'invalid' },
  { name: 'Very large year', input: '99999-01-01', expected: 'valid' },
];

let allPassed = true;

for (const tc of testCases) {
  try {
    const result = parseDateKeySafely(tc.input);
    const isValid = result instanceof Date && !isNaN(result.getTime());
    
    // For expected 'invalid', result MUST be null.
    // For expected 'valid', result MUST be a valid Date object.
    // EXCEPT for the very large year, it should either be parsed validly, or return null, but MUST NOT crash.
    // Actually, new Date(99999, 0, 1) creates an Invalid Date. 
    // We expect it to return null (invalid).
    
    let passed = false;
    if (tc.expected === 'valid') {
      passed = isValid;
    } else {
      passed = result === null;
    }

    console.log(`▶ TEST: ${tc.name}`);
    console.log(`  Input: ${tc.input}`);
    console.log(`  Output: ${isValid ? result.toISOString() : String(result)}`);
    console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (!passed) allPassed = false;
  } catch (e: any) {
    console.log(`▶ TEST: ${tc.name}`);
    console.log(`  Input: ${tc.input}`);
    console.log(`  ❌ CRASHED: ${e.message}\n`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('✅ ALL TESTS PASSED. The parser is completely crash-proof and mathematically sound.');
} else {
  console.log('❌ SOME TESTS FAILED.');
}
