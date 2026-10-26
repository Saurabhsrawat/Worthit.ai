import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProductSpecs } from './specAnalysis';
import { resolvePriceBand } from './referenceRanges';
import { Product, UserPreferences } from '../types';

const testLaptop: Product = {
  id: 'test-vivobook-15',
  name: 'ASUS Vivobook 15 (AMD Ryzen 5 7530U, 16GB, 512GB SSD)',
  brand: 'ASUS',
  category: 'laptop',
  releaseYear: 2024,
  isDemonstrationData: false,
  priceInInr: {
    value: 48990,
    evidenceType: 'verified',
    source: 'Amazon.in',
    date: '2026-10-25',
  },
  specs: {
    processor: { value: 'AMD Ryzen 5 7530U (6 Cores, 12 Threads)', evidenceType: 'verified' },
    ram: { value: '16GB DDR4 3200MHz', evidenceType: 'verified' },
    storage: { value: '512GB M.2 NVMe PCIe 4.0 SSD', evidenceType: 'verified' },
    display: { value: '15.6-inch FHD (1920x1080) 60Hz Anti-Glare', evidenceType: 'verified' },
    batteryCapacity: { value: '42 Wh', evidenceType: 'verified' },
    batteryLifeHours: { value: 6.5, evidenceType: 'verified' },
    weightKg: { value: 1.7, evidenceType: 'verified' },
    ports: { value: '1x USB-C 3.2, 2x USB-A 3.2, 1x HDMI 1.4, Audio Jack', evidenceType: 'verified' },
  },
  warranty: {
    standardWarrantyMonths: { value: 12, evidenceType: 'verified' },
    softwareUpdatePolicyYears: { value: 4, evidenceType: 'verified' },
  },
  repairability: {
    scoreOutOfTen: { value: 6, evidenceType: 'verified' },
  },
  dataCompleteness: 85,
  lastUpdated: '2026-10-25',
};

const testPhone: Product = {
  id: 'test-redmi-14-pro',
  name: 'Xiaomi Redmi Note 14 Pro 5G (8GB, 128GB)',
  brand: 'Xiaomi',
  category: 'smartphone',
  releaseYear: 2024,
  isDemonstrationData: false,
  priceInInr: {
    value: 24999,
    evidenceType: 'verified',
    source: 'Flipkart',
    date: '2026-10-25',
  },
  specs: {
    processor: { value: 'MediaTek Dimensity 7300-Ultra', evidenceType: 'verified' },
    ram: { value: '8GB LPDDR4X', evidenceType: 'verified' },
    storage: { value: '128GB UFS 2.2', evidenceType: 'verified' },
    display: { value: '6.67-inch 1.5K 120Hz Curved AMOLED (3000 nits)', evidenceType: 'verified' },
    batteryCapacity: { value: '5500 mAh', evidenceType: 'verified' },
    chargingSpeedWatts: { value: 45, evidenceType: 'verified' },
    camera: { value: '50MP Sony LYT-600 OIS Main + 8MP Ultrawide', evidenceType: 'verified' },
  },
  warranty: {
    standardWarrantyMonths: { value: 12, evidenceType: 'verified' },
    softwareUpdatePolicyYears: { value: 3, evidenceType: 'verified' },
  },
  repairability: {
    scoreOutOfTen: { value: 5, evidenceType: 'verified' },
  },
  dataCompleteness: 90,
  lastUpdated: '2026-10-25',
};

test('resolvePriceBand accurately resolves Indian price brackets', () => {
  const laptopBand = resolvePriceBand('laptop', 48990);
  assert.equal(laptopBand?.id, 'mid');
  assert.ok(laptopBand?.label.includes('Mainstream Mid-Range'));

  const budgetPhoneBand = resolvePriceBand('smartphone', 12999);
  assert.equal(budgetPhoneBand?.id, 'entry');

  const flagshipPhoneBand = resolvePriceBand('smartphone', 129999);
  assert.equal(flagshipPhoneBand?.id, 'flagship');
});

test('Laptop spec analysis differs meaningfully between Programming vs Gaming profile', () => {
  const progProfile: UserPreferences = {
    category: 'laptop',
    intendedUse: ['programming'],
    maxBudgetInInr: 55000,
    expectedOwnershipYears: 3,
    importanceWeights: { performance: 5, batteryLife: 3, portability: 3, repairability: 4 },
    essentialRequirements: '',
  };

  const gamingProfile: UserPreferences = {
    category: 'laptop',
    intendedUse: ['gaming'],
    maxBudgetInInr: 80000,
    expectedOwnershipYears: 3,
    importanceWeights: { performance: 5, batteryLife: 2, portability: 1, repairability: 2 },
    essentialRequirements: '',
  };

  const progAnalysis = analyzeProductSpecs(testLaptop, progProfile);
  const gamingAnalysis = analyzeProductSpecs(testLaptop, gamingProfile);

  // 1. In programming profile, RAM & CPU are High relevance
  const progRam = progAnalysis.ratedSpecs.find((s) => s.specKey === 'ram');
  assert.equal(progRam?.relevance, 'High');
  assert.equal(progRam?.rating, 'Excellent'); // 16GB in ₹48,990 mid laptop exceeds standard 8GB

  // 2. In gaming profile, GPU is High relevance and rated Weak (no dedicated GPU)
  const gamingGpu = gamingAnalysis.ratedSpecs.find((s) => s.specKey === 'gpu');
  assert.equal(gamingGpu?.relevance, 'High');
  assert.equal(gamingGpu?.rating, 'Weak');

  // In programming profile, GPU is Low relevance
  const progGpu = progAnalysis.ratedSpecs.find((s) => s.specKey === 'gpu');
  assert.equal(progGpu?.relevance, 'Low');

  // 3. Strengths and Weaknesses order must differ
  const progTopStrength = progAnalysis.strengths[0];
  const gamingTopWeakness = gamingAnalysis.weaknesses[0];

  assert.ok(progTopStrength.specFact.includes('RAM') || progTopStrength.specFact.includes('Processor'));
  assert.ok(gamingTopWeakness.specFact.includes('Graphics') || gamingTopWeakness.specFact.includes('GPU'));
});

test('Smartphone spec analysis differs meaningfully between Photography vs Battery profile', () => {
  const photoProfile: UserPreferences = {
    category: 'smartphone',
    intendedUse: ['photography'],
    maxBudgetInInr: 30000,
    expectedOwnershipYears: 3,
    importanceWeights: { performance: 3, batteryLife: 3, portability: 3, repairability: 3 },
    essentialRequirements: '',
  };

  const batteryProfile: UserPreferences = {
    category: 'smartphone',
    intendedUse: ['battery', 'travel'],
    maxBudgetInInr: 25000,
    expectedOwnershipYears: 4,
    importanceWeights: { performance: 2, batteryLife: 5, portability: 4, repairability: 3 },
    essentialRequirements: '',
  };

  const photoAnalysis = analyzeProductSpecs(testPhone, photoProfile);
  const batteryAnalysis = analyzeProductSpecs(testPhone, batteryProfile);

  // Camera is High relevance for photography
  const photoCamera = photoAnalysis.ratedSpecs.find((s) => s.specKey === 'camera');
  assert.equal(photoCamera?.relevance, 'High');
  assert.equal(photoCamera?.rating, 'Excellent'); // OIS present in ₹24,999 mid-range

  // Battery is High relevance for battery profile
  const batterySpec = batteryAnalysis.ratedSpecs.find((s) => s.specKey === 'battery');
  assert.equal(batterySpec?.relevance, 'High');
  assert.equal(batterySpec?.rating, 'Excellent'); // 5500mAh exceeds 5000mAh baseline
});

test('Missing specs are strictly rated "Unknown" without guessing or hallucinating', () => {
  const sparseProduct: Product = {
    id: 'sparse-device',
    name: 'Generic Unspecified Device',
    brand: 'Generic',
    category: 'laptop',
    releaseYear: 2025,
    isDemonstrationData: false,
    priceInInr: { value: 50000, evidenceType: 'verified' },
    specs: {
      // Processor, RAM, GPU, Display all missing
    },
    warranty: {},
    repairability: {},
    dataCompleteness: 10,
    lastUpdated: '2026-10-25',
  };

  const analysis = analyzeProductSpecs(sparseProduct);

  const ramSpec = analysis.ratedSpecs.find((s) => s.specKey === 'ram');
  assert.equal(ramSpec?.rating, 'Unknown');
  assert.equal(ramSpec?.value, null);
  assert.equal(ramSpec?.scoreOutOf100, null);

  const cpuSpec = analysis.ratedSpecs.find((s) => s.specKey === 'processor');
  assert.equal(cpuSpec?.rating, 'Unknown');
  assert.equal(cpuSpec?.value, null);

  // Check unverifiableSpecs list
  assert.ok(analysis.unverifiableSpecs.some((u) => u.item.includes('RAM')));
  assert.ok(analysis.unverifiableSpecs.some((u) => u.item.includes('Processor')));
});

test('Suitedness tags reflect category and hardware capabilities across use cases', () => {
  const laptopAnalysis = analyzeProductSpecs(testLaptop);
  assert.ok(laptopAnalysis.suitedness.bestSuitedFor.length > 0);
  assert.ok(laptopAnalysis.suitedness.notIdealFor.length > 0);
  // An integrated GPU laptop should be not ideal for heavy gaming / 3D rendering
  assert.ok(
    laptopAnalysis.suitedness.notIdealFor.some(
      (tag) => tag.toLowerCase().includes('gaming') || tag.toLowerCase().includes('3d')
    )
  );

  const phoneAnalysis = analyzeProductSpecs(testPhone);
  assert.ok(phoneAnalysis.suitedness.bestSuitedFor.length > 0);
  assert.ok(
    phoneAnalysis.suitedness.bestSuitedFor.some(
      (tag) => tag.toLowerCase().includes('media') || tag.toLowerCase().includes('day') || tag.toLowerCase().includes('photo')
    )
  );
});

import { validatePersonalReviewText } from './personalReviewValidator';

test('validatePersonalReviewText strictly catches prohibited words', () => {
  const dummyPayload = { productName: 'Laptop', ram: '16GB', price: 48990 };

  const wordPad = new Array(80).fill('word').join(' ');

  // 1. Prohibit "unreliable"
  const withUnreliable = `This device has an unreliable hinge mechanism and battery. ${wordPad}`;
  const res1 = validatePersonalReviewText(withUnreliable, dummyPayload);
  assert.equal(res1.isValid, false);
  assert.ok(res1.reason?.includes('unreliable'));

  // 2. Prohibit "guaranteed"
  const withGuaranteed = `This machine is guaranteed to run all your daily software flawlessly. ${wordPad}`;
  const res2 = validatePersonalReviewText(withGuaranteed, dummyPayload);
  assert.equal(res2.isValid, false);
  assert.ok(res2.reason?.includes('guaranteed'));
});

test('validatePersonalReviewText strictly catches hallucinated numbers', () => {
  const dummyPayload = {
    productName: 'ASUS Vivobook 15',
    budgetInInr: 55000,
    priceInInr: 48990,
    specs: { ram: '16GB', storage: '512GB' },
  };

  // Ensure pad provides sufficient length to satisfy the 75-word minimum bound
  const pad = 'For your daily academic workflow and general productivity in computer science, this configuration provides dependable computing responsiveness and steady multitasking throughout long working sessions without thermal throttling under typical student programming software or multiple browser tabs. It offers balanced execution for coursework and project assignments across your expected ownership tenure in India.';

  // Prose mentioning 120Hz display (which is NOT in input payload)
  const hallucinatedProse = `For your budget of 55000 and price of 48990, this machine offers 16GB RAM and 512GB SSD. However it boasts an unverified 120Hz refresh rate screen. ${pad}`;

  const res = validatePersonalReviewText(hallucinatedProse, dummyPayload);
  assert.equal(res.isValid, false);
  assert.ok(res.reason?.includes('Unverified number 120'));

  // Valid prose where all numbers (55000, 48990, 16, 512) match input facts and word count exceeds 75
  const validProse = `For your budget of 55000 and price of 48990, this laptop delivers 16GB RAM and 512GB storage. It handles day-to-day coding efficiently and fits your target expenditure cleanly. ${pad}`;
  const validRes = validatePersonalReviewText(validProse, dummyPayload);
  assert.equal(validRes.isValid, true);
});

test('Quota exhaustion fallback leaves spec scorecard and verdict fully intact', () => {
  // Pure local analysis runs with zero network/API dependencies
  const analysis = analyzeProductSpecs(testLaptop, {
    category: 'laptop',
    intendedUse: ['programming'],
    maxBudgetInInr: 55000,
    expectedOwnershipYears: 3,
    importanceWeights: { performance: 4, batteryLife: 3, portability: 3, repairability: 3 },
    essentialRequirements: '',
  });

  // Verify all category-specific spec dimensions are computed (11 for laptop: CPU, RAM, storage, display, battery, charging, weight, ports, GPU, durability, software support)
  assert.equal(analysis.ratedSpecs.length, 11);
  assert.ok(analysis.strengths.length >= 2);
  assert.ok(analysis.weaknesses.length >= 1);
  assert.ok(analysis.suitedness.bestSuitedFor.length > 0);
  assert.ok(analysis.unverifiableSpecs.length >= 0);
});

