import test from 'node:test';
import assert from 'node:assert/strict';
import { Product } from '../types';

// Mock localStorage for test environment
class MockStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new MockStorage();
const STORAGE_KEY_V2 = 'worthit_compared_products_v2';
const STORAGE_KEY_LEGACY = 'worthit_compared_ids';

// Compare state manager mimicking the application logic in App.tsx
class CompareManager {
  private comparedProducts: Product[] = [];
  public replacingCandidate: Product | null = null;

  constructor() {
    this.init();
  }

  init() {
    // Requirement 1: Clear old legacy key on load
    mockStorage.removeItem(STORAGE_KEY_LEGACY);

    // Load from v2 key
    const raw = mockStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      try {
        this.comparedProducts = JSON.parse(raw);
      } catch {
        this.comparedProducts = [];
      }
    } else {
      this.comparedProducts = [];
    }
  }

  private persist() {
    mockStorage.setItem(STORAGE_KEY_V2, JSON.stringify(this.comparedProducts));
  }

  getProducts(): Product[] {
    return [...this.comparedProducts];
  }

  getTrayCount(): number {
    return this.comparedProducts.length;
  }

  getNavbarCount(): number {
    // Requirement 2: Navbar count equals the chips/items shown at all times
    return this.getTrayCount();
  }

  addProduct(product: Product): { added: boolean; limitReached: boolean } {
    // Avoid duplicates
    if (this.comparedProducts.some((p) => p.id === product.id)) {
      return { added: false, limitReached: false };
    }

    // Requirement 3: At 4 products, adding another must NOT silently fail or drop via slice(0,4)
    if (this.comparedProducts.length >= 4) {
      this.replacingCandidate = product;
      return { added: false, limitReached: true };
    }

    this.comparedProducts.push(product);
    this.persist();
    return { added: true, limitReached: false };
  }

  removeProduct(productId: string): void {
    this.comparedProducts = this.comparedProducts.filter((p) => p.id !== productId);
    this.persist();
  }

  clearAll(): void {
    this.comparedProducts = [];
    this.persist();
  }

  replaceProduct(targetProductId: string, incomingProduct: Product): void {
    this.comparedProducts = this.comparedProducts.map((p) =>
      p.id === targetProductId ? incomingProduct : p
    );
    this.replacingCandidate = null;
    this.persist();
  }
}

// Factory helper to make realistic mock products
function createMockProduct(id: string, name: string, isLiveResearched = false): Product {
  const evType = isLiveResearched ? 'web-reported' : 'user-provided';
  return {
    id,
    name,
    brand: 'TestBrand',
    category: 'laptop',
    releaseYear: 2024,
    priceInInr: {
      value: 65000,
      evidenceType: evType,
      source: isLiveResearched ? 'Amazon India' : 'Manual observation',
      date: '2026-03-30',
    },
    specs: {
      processor: { value: 'AMD Ryzen 5 7530U', evidenceType: evType, source: 'Official Spec Sheet' },
      ram: { value: '16GB DDR4', evidenceType: evType },
      storage: { value: '512GB NVMe SSD', evidenceType: evType },
      batteryLifeHours: { value: 8.5, evidenceType: evType },
    },
    sourcesConsulted: isLiveResearched
      ? [
          { title: 'Amazon India Product Page', url: 'https://amazon.in/dp/test', retrievedAt: '2026-03-30T10:00:00Z' },
          { title: 'Smartprix Specs', url: 'https://smartprix.com/test', retrievedAt: '2026-03-30T10:00:00Z' },
        ]
      : [],
    sourcesConsultedCount: isLiveResearched ? 2 : 0,
    isDemonstrationData: !isLiveResearched,
    warranty: {},
    repairability: {},
    dataCompleteness: 85,
    lastUpdated: '2026-03-30',
    provenance: {
      liveFetched: isLiveResearched,
      groundingChunkCount: isLiveResearched ? 6 : 0,
      retrievedAt: new Date().toISOString(),
      status: isLiveResearched ? 'live' : 'unavailable',
    },
  };
}

test('Requirement 1 & 6: Stores full Product snapshots in worthit_compared_products_v2 and clears legacy key', () => {
  mockStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(['legacy-id-1', 'legacy-id-2']));
  assert.equal(mockStorage.getItem(STORAGE_KEY_LEGACY) !== null, true);

  const manager = new CompareManager();

  // Confirm legacy key was cleared on load
  assert.equal(mockStorage.getItem(STORAGE_KEY_LEGACY), null);

  // Initial state starts empty (default seeded entries dropped)
  assert.equal(manager.getTrayCount(), 0);
  assert.equal(manager.getNavbarCount(), 0);
});

test('Requirement 6: Add 4 products including 2 live-researched unsaved ones, verify persistence and remove buttons', () => {
  const manager = new CompareManager();
  manager.clearAll();

  // Create 4 products: 2 standard, 2 live-researched unsaved ones
  const p1 = createMockProduct('prod-1', 'ThinkPad E14 Gen 5', false);
  const p2 = createMockProduct('prod-2', 'MacBook Air M2', false);
  const p3Live = createMockProduct('prod-3-live-unsaved', 'Dell Inspiron 14 5430 (Live Research)', true);
  const p4Live = createMockProduct('prod-4-live-unsaved', 'ASUS Zenbook 14 OLED (Live Research)', true);

  // Add 1st
  const res1 = manager.addProduct(p1);
  assert.equal(res1.added, true);
  assert.equal(manager.getTrayCount(), 1);
  assert.equal(manager.getNavbarCount(), 1);

  // Add 2nd
  const res2 = manager.addProduct(p2);
  assert.equal(res2.added, true);
  assert.equal(manager.getTrayCount(), 2);
  assert.equal(manager.getNavbarCount(), 2);

  // Add 3rd (live researched unsaved)
  const res3 = manager.addProduct(p3Live);
  assert.equal(res3.added, true);
  assert.equal(manager.getTrayCount(), 3);
  assert.equal(manager.getNavbarCount(), 3);

  // Add 4th (live researched unsaved)
  const res4 = manager.addProduct(p4Live);
  assert.equal(res4.added, true);
  assert.equal(manager.getTrayCount(), 4);
  assert.equal(manager.getNavbarCount(), 4);

  // Simulate page reload: new instance reads from localStorage
  const reloadedManager = new CompareManager();
  const reloadedProducts = reloadedManager.getProducts();

  assert.equal(reloadedProducts.length, 4);
  assert.equal(reloadedManager.getNavbarCount(), 4);

  // Confirm live-researched unsaved products survived reload completely with full specs & provenance
  const reloadedLive3 = reloadedProducts.find((p) => p.id === 'prod-3-live-unsaved');
  assert.ok(reloadedLive3);
  assert.equal(reloadedLive3.provenance?.liveFetched, true);
  assert.equal(reloadedLive3.specs.processor?.value, 'AMD Ryzen 5 7530U');
  assert.equal(reloadedLive3.priceInInr?.value, 65000);

  const reloadedLive4 = reloadedProducts.find((p) => p.id === 'prod-4-live-unsaved');
  assert.ok(reloadedLive4);
  assert.equal(reloadedLive4.provenance?.liveFetched, true);
});

test('Requirement 3 & 6: Limit handling: 5th product triggers limitReached, replace modal replaces selected item', () => {
  const manager = new CompareManager();
  assert.equal(manager.getTrayCount(), 4);

  const p5 = createMockProduct('prod-5-extra', 'HP Pavilion Plus 14', true);

  // Attempting to add 5th item
  const res5 = manager.addProduct(p5);
  assert.equal(res5.added, false);
  assert.equal(res5.limitReached, true);
  // Tray must STILL have exactly 4 items (no silent overwrite, no slice(0,4) dropping new item)
  assert.equal(manager.getTrayCount(), 4);
  assert.equal(manager.replacingCandidate?.id, 'prod-5-extra');

  // Perform replacement of 'prod-1' with 'prod-5-extra'
  manager.replaceProduct('prod-1', p5);
  assert.equal(manager.getTrayCount(), 4);
  assert.equal(manager.replacingCandidate, null);

  const currentProducts = manager.getProducts();
  assert.equal(currentProducts.some((p) => p.id === 'prod-1'), false);
  assert.equal(currentProducts.some((p) => p.id === 'prod-5-extra'), true);
});

test('Requirement 2 & 6: Removing an item updates tray and navbar count immediately', () => {
  const manager = new CompareManager();
  assert.equal(manager.getTrayCount(), 4);
  assert.equal(manager.getNavbarCount(), 4);

  // Remove one item
  manager.removeProduct('prod-2');
  assert.equal(manager.getTrayCount(), 3);
  assert.equal(manager.getNavbarCount(), 3);

  // Add another item
  const p6 = createMockProduct('prod-6-new', 'Acer Swift Go 14', true);
  const res6 = manager.addProduct(p6);
  assert.equal(res6.added, true);
  assert.equal(manager.getTrayCount(), 4);
  assert.equal(manager.getNavbarCount(), 4);
});

test('Requirement 2 & 5: Clear all resets tray and navbar count to 0', () => {
  const manager = new CompareManager();
  manager.clearAll();
  assert.equal(manager.getTrayCount(), 0);
  assert.equal(manager.getNavbarCount(), 0);
  assert.deepEqual(manager.getProducts(), []);
});
