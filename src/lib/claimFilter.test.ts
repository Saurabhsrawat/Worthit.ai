import test from 'node:test';
import assert from 'node:assert';
import { normalizeForMatch, valueAppearsInStepAText, filterClaimField } from './claimFilter';

test('normalizeForMatch cleans punctuation, currency, and whitespace', () => {
  assert.strictEqual(normalizeForMatch('₹48,990 '), '48990');
  assert.strictEqual(normalizeForMatch('AMD  Ryzen 5 7530U'), 'amd ryzen 5 7530u');
  assert.strictEqual(normalizeForMatch('5500 mAh'), '5500 mah');
});

test('valueAppearsInStepAText correctly matches numbers and text in raw Step A text', () => {
  const stepAText = `
    The ASUS Vivobook 15 is powered by the AMD Ryzen 5 7530U with 6 cores.
    It features 16GB RAM and a 512GB PCIe NVMe SSD.
    The 15.6-inch FHD display has 250 nits brightness and 60Hz refresh rate.
    Weighing 1.7 kg, it has a 42Wh battery with 45W fast charging.
    Available in India starting at ₹48,990 on Amazon.in.
  `;

  // String matches
  assert.strictEqual(valueAppearsInStepAText('AMD Ryzen 5 7530U', stepAText), true);
  assert.strictEqual(valueAppearsInStepAText('16GB', stepAText), true);
  assert.strictEqual(valueAppearsInStepAText('15.6-inch FHD', stepAText), true);

  // Number matches
  assert.strictEqual(valueAppearsInStepAText(48990, stepAText), true);
  assert.strictEqual(valueAppearsInStepAText(1.7, stepAText), true);
  assert.strictEqual(valueAppearsInStepAText(42, stepAText), true);

  // Value NOT in text
  assert.strictEqual(valueAppearsInStepAText('Intel Core i9 14900KS', stepAText), false);
  assert.strictEqual(valueAppearsInStepAText(99999, stepAText), false);
});

test('filterClaimField retains fields present in Step A and attributes sources', () => {
  const stepAText = 'The Redmi Note 14 Pro 5G features a MediaTek Dimensity 7300-Ultra processor and 5500mAh battery.';
  const chunks = [
    { web: { uri: 'https://www.mi.com/in/redmi-note-14-pro', title: 'Xiaomi India Official' } },
    { web: { uri: 'https://www.gsmarena.com/xiaomi_redmi_note_14_pro-13317.php', title: 'GSMArena' } },
  ];

  // Kept field (present in Step A)
  const cpuResult = filterClaimField(
    'processor',
    { value: 'MediaTek Dimensity 7300-Ultra' },
    stepAText,
    chunks
  );
  assert.strictEqual(cpuResult.kept, true);
  assert.strictEqual(cpuResult.status, 'verified'); // Official mi.com domain
  assert.strictEqual(cpuResult.sourceUrl, 'https://www.mi.com/in/redmi-note-14-pro');

  // Dropped field (absent from Step A)
  const fakeGpuResult = filterClaimField(
    'gpu',
    { value: 'NVIDIA GeForce RTX 4090 Mobile' },
    stepAText,
    chunks
  );
  assert.strictEqual(fakeGpuResult.kept, false);
  assert.ok(fakeGpuResult.dropReason?.toLowerCase().includes('absent'));
});
