import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWorthItScore, calculateDataCompleteness } from './scoring';
import { calculateOwnershipCost, getDefaultOwnershipInputs } from './ownershipCost';
import { Product, UserPreferences } from '../types';

const mockProduct: Product = {
  id: 'test-laptop-1',
  name: 'MacBook Air M3 (16GB, 512GB)',
  brand: 'Apple',
  category: 'laptop',
  releaseYear: 2024,
  isDemonstrationData: true,
  priceInInr: {
    value: 124900,
    evidenceType: 'verified',
    source: 'Apple India Official Store',
    date: '2026-03-15',
  },
  specs: {
    processor: { value: 'Apple M3 (8-core CPU, 10-core GPU)', evidenceType: 'verified' },
    ram: { value: '16GB Unified Memory', evidenceType: 'verified' },
    storage: { value: '512GB SSD', evidenceType: 'verified' },
    display: { value: '13.6-inch Liquid Retina (500 nits)', evidenceType: 'verified' },
    batteryCapacity: { value: '52.6 Wh', evidenceType: 'verified' },
  },
  warranty: {
    standardWarrantyMonths: { value: 12, evidenceType: 'verified' },
    softwareUpdatePolicyYears: { value: 6, evidenceType: 'verified' },
  },
  repairability: {
    scoreOutOfTen: { value: 4, evidenceType: 'verified' },
    batteryReplaceable: { value: true, evidenceType: 'estimate' },
    ramUpgradable: { value: false, evidenceType: 'verified' },
  },
  reviewData: {
    reviewCount: 42,
    dateRange: 'Jan 2024 - Oct 2026',
    source: 'Aggregated verified purchaser discussions',
    sampleType: 'demonstration',
    aspects: [
      {
        aspect: 'Battery Life & Charging',
        positivePercentage: 92,
        neutralPercentage: 5,
        negativePercentage: 3,
        totalMentions: 38,
        keyPhrases: ['Insane 15hr battery', 'Runs all day without charger'],
      },
    ],
    reportedIssues: [
      {
        category: 'Non-upgradable Unified RAM',
        frequency: 'Occasional',
        mentionCount: 8,
        description: 'Memory is permanently soldered; must configure adequate RAM at checkout.',
        sampleQuotes: ['Cannot upgrade RAM down the line'],
      },
    ],
  },
  dataCompleteness: 90,
  lastUpdated: '2026-10-20',
};

test('calculateDataCompleteness calculates percentage accurately', () => {
  const completeness = calculateDataCompleteness(mockProduct);
  assert.ok(completeness >= 80, `Expected completeness >= 80, got ${completeness}`);
});

test('calculateWorthItScore produces a valid normalized score with active dimensions', () => {
  const prefs: UserPreferences = {
    category: 'laptop',
    intendedUse: ['programming', 'college work'],
    maxBudgetInInr: 140000,
    expectedOwnershipYears: 3,
    importanceWeights: { batteryLife: 5, performance: 4, portability: 4, repairability: 2 },
    essentialRequirements: 'Silent fanless operation',
  };

  const result = calculateWorthItScore(mockProduct, prefs);
  assert.equal(result.isInsufficientEvidence, false);
  assert.ok(result.overallScore !== null && result.overallScore > 0 && result.overallScore <= 100);
  assert.ok(result.activeDimensionCount >= 3);
  assert.ok(result.strengths.length > 0);
  assert.ok(result.verdictSummary.length > 0);

  // Check that weights sum to approximately 1
  const sumWeights = result.dimensions.reduce((sum, d) => sum + d.weight, 0);
  assert.ok(Math.abs(sumWeights - 1.0) < 0.05, `Weights sum should be ~1.0, got ${sumWeights}`);
});

test('calculateWorthItScore triggers insufficient evidence when too few fields exist', () => {
  const emptyProduct: Product = {
    id: 'empty-1',
    name: 'Unknown Laptop',
    brand: 'Generic',
    category: 'laptop',
    releaseYear: 2024,
    isDemonstrationData: true,
    priceInInr: { value: null, evidenceType: 'unknown' },
    specs: {},
    warranty: {},
    repairability: {},
    dataCompleteness: 0,
    lastUpdated: '2026-10-20',
  };

  const result = calculateWorthItScore(emptyProduct);
  assert.equal(result.isInsufficientEvidence, true);
  assert.equal(result.overallScore, null);
  assert.ok(result.verdictSummary.includes('Insufficient evidence'));
});

test('calculateOwnershipCost computes electricity, totals, and scenarios correctly', () => {
  const inputs = getDefaultOwnershipInputs('laptop', 60000, 'verified', 3);
  const result = calculateOwnershipCost(inputs);

  assert.equal(result.purchasePrice, 60000);
  assert.ok(result.annualElectricityCost > 0);
  assert.ok(result.totalElectricityCost > 0);
  assert.ok(result.totalCostOfOwnership > result.purchasePrice);
  assert.equal(result.monthlyEquivalent, Math.round(result.totalCostOfOwnership / 36));

  // Scenarios order: low <= typical (without repairs added) <= high
  assert.ok(result.scenarios.low <= result.scenarios.typical);
  assert.ok(result.scenarios.typical <= result.scenarios.high);
});
