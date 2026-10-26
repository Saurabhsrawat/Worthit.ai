/**
 * WorthIt AI - Reference Ranges & Design Thresholds (Pure TypeScript constants)
 * All spec comparisons are evaluated strictly against these design thresholds.
 * If a spec is not documented or the price band cannot be established,
 * the engine returns "Unknown" without guessing.
 */

import { ProductCategory } from '../types';

export type PriceBandId = 'entry' | 'mid' | 'upper_mid' | 'flagship';

export interface PriceBandInfo {
  id: PriceBandId;
  label: string;
  minPriceInr: number;
  maxPriceInr: number;
}

// Design Thresholds: Laptop Price Bands in India (INR)
export const LAPTOP_PRICE_BANDS: Record<PriceBandId, PriceBandInfo> = {
  entry: {
    id: 'entry',
    label: 'Entry / Budget (< ₹45,000)',
    minPriceInr: 0,
    maxPriceInr: 45000,
  },
  mid: {
    id: 'mid',
    label: 'Mainstream Mid-Range (₹45,000 – ₹75,000)',
    minPriceInr: 45001,
    maxPriceInr: 75000,
  },
  upper_mid: {
    id: 'upper_mid',
    label: 'Upper-Mid / Premium (₹75,001 – ₹1,20,000)',
    minPriceInr: 75001,
    maxPriceInr: 120000,
  },
  flagship: {
    id: 'flagship',
    label: 'Flagship / Professional (> ₹1,20,000)',
    minPriceInr: 120001,
    maxPriceInr: 1000000,
  },
};

// Design Thresholds: Smartphone Price Bands in India (INR)
export const SMARTPHONE_PRICE_BANDS: Record<PriceBandId, PriceBandInfo> = {
  entry: {
    id: 'entry',
    label: 'Budget (< ₹15,000)',
    minPriceInr: 0,
    maxPriceInr: 15000,
  },
  mid: {
    id: 'mid',
    label: 'Mid-Range (₹15,001 – ₹35,000)',
    minPriceInr: 15001,
    maxPriceInr: 35000,
  },
  upper_mid: {
    id: 'upper_mid',
    label: 'Upper-Mid / Sub-Flagship (₹35,001 – ₹65,000)',
    minPriceInr: 35001,
    maxPriceInr: 65000,
  },
  flagship: {
    id: 'flagship',
    label: 'Flagship / Premium (> ₹65,000)',
    minPriceInr: 65001,
    maxPriceInr: 1000000,
  },
};

/**
 * Resolves current price band given category and price in INR
 */
export function resolvePriceBand(category: ProductCategory, priceInr?: number | null): PriceBandInfo | null {
  if (!priceInr || priceInr <= 0) return null;
  const bands = category === 'laptop' ? LAPTOP_PRICE_BANDS : SMARTPHONE_PRICE_BANDS;

  if (priceInr <= bands.entry.maxPriceInr) return bands.entry;
  if (priceInr <= bands.mid.maxPriceInr) return bands.mid;
  if (priceInr <= bands.upper_mid.maxPriceInr) return bands.upper_mid;
  return bands.flagship;
}

export type SpecRatingLevel = 'Excellent' | 'Good' | 'Average' | 'Weak' | 'Unknown';

export interface NumericThresholdRule {
  weakMax: number;
  averageMax: number;
  goodMax: number; // Values above goodMax are rated "Excellent"
}

export interface SpecReferenceRange {
  specKey: string;
  displayName: string;
  unit?: string;
  bands: Record<PriceBandId, {
    typicalDescription: string;
    numeric?: NumericThresholdRule;
    expectedTiers?: string[];
  }>;
}

// Design Thresholds: Laptop Spec Reference Ranges
export const LAPTOP_REFERENCE_RANGES: Record<string, SpecReferenceRange> = {
  ram: {
    specKey: 'ram',
    displayName: 'RAM Capacity',
    unit: 'GB',
    bands: {
      entry: {
        typicalDescription: '8GB DDR4 standard',
        numeric: { weakMax: 4, averageMax: 8, goodMax: 15 },
      },
      mid: {
        typicalDescription: '16GB standard in mid-range',
        numeric: { weakMax: 7, averageMax: 8, goodMax: 15 },
      },
      upper_mid: {
        typicalDescription: '16GB - 32GB high-speed LPDDR5/DDR5',
        numeric: { weakMax: 8, averageMax: 15, goodMax: 31 },
      },
      flagship: {
        typicalDescription: '32GB - 64GB unified / fast memory',
        numeric: { weakMax: 15, averageMax: 31, goodMax: 63 },
      },
    },
  },
  storage: {
    specKey: 'storage',
    displayName: 'Storage Capacity',
    unit: 'GB',
    bands: {
      entry: {
        typicalDescription: '256GB - 512GB PCIe SSD',
        numeric: { weakMax: 255, averageMax: 256, goodMax: 511 },
      },
      mid: {
        typicalDescription: '512GB PCIe 4.0 SSD standard',
        numeric: { weakMax: 256, averageMax: 511, goodMax: 1023 },
      },
      upper_mid: {
        typicalDescription: '512GB - 1TB fast NVMe SSD',
        numeric: { weakMax: 511, averageMax: 512, goodMax: 1023 },
      },
      flagship: {
        typicalDescription: '1TB - 2TB Gen4/Gen5 NVMe SSD',
        numeric: { weakMax: 512, averageMax: 1023, goodMax: 2047 },
      },
    },
  },
  batteryHours: {
    specKey: 'batteryHours',
    displayName: 'Claimed Battery Life',
    unit: 'hours',
    bands: {
      entry: {
        typicalDescription: '5 - 7 hours standard',
        numeric: { weakMax: 4.5, averageMax: 6.5, goodMax: 8.5 },
      },
      mid: {
        typicalDescription: '7 - 9 hours standard',
        numeric: { weakMax: 5.5, averageMax: 7.5, goodMax: 10.5 },
      },
      upper_mid: {
        typicalDescription: '9 - 13 hours (all-day battery)',
        numeric: { weakMax: 7.0, averageMax: 9.5, goodMax: 13.5 },
      },
      flagship: {
        typicalDescription: '12 - 18 hours (ARM/efficient silicon)',
        numeric: { weakMax: 8.5, averageMax: 12.0, goodMax: 16.0 },
      },
    },
  },
  weight: {
    specKey: 'weight',
    displayName: 'Chassis Weight',
    unit: 'kg',
    bands: {
      entry: {
        typicalDescription: '1.7 - 2.0 kg typical for budget 15.6"',
        // For weight, lower is better. We handle reverse in analyzer.
        numeric: { weakMax: 2.2, averageMax: 1.9, goodMax: 1.6 },
      },
      mid: {
        typicalDescription: '1.5 - 1.8 kg portable standard',
        numeric: { weakMax: 2.0, averageMax: 1.7, goodMax: 1.45 },
      },
      upper_mid: {
        typicalDescription: '1.2 - 1.5 kg thin & light premium',
        numeric: { weakMax: 1.8, averageMax: 1.5, goodMax: 1.3 },
      },
      flagship: {
        typicalDescription: '1.1 - 1.4 kg ultra-portable / carbon / magnesium',
        numeric: { weakMax: 1.7, averageMax: 1.4, goodMax: 1.25 },
      },
    },
  },
  displayRefresh: {
    specKey: 'displayRefresh',
    displayName: 'Display Refresh Rate',
    unit: 'Hz',
    bands: {
      entry: {
        typicalDescription: '60Hz standard panel',
        numeric: { weakMax: 59, averageMax: 60, goodMax: 89 },
      },
      mid: {
        typicalDescription: '60Hz - 120Hz depending on creator/gaming trim',
        numeric: { weakMax: 59, averageMax: 60, goodMax: 119 },
      },
      upper_mid: {
        typicalDescription: '120Hz - 144Hz smooth display',
        numeric: { weakMax: 60, averageMax: 89, goodMax: 119 },
      },
      flagship: {
        typicalDescription: '120Hz ProMotion / VRR OLED',
        numeric: { weakMax: 60, averageMax: 89, goodMax: 119 },
      },
    },
  },
  warrantyMonths: {
    specKey: 'warrantyMonths',
    displayName: 'Manufacturer Warranty',
    unit: 'months',
    bands: {
      entry: {
        typicalDescription: '12 months brand warranty',
        numeric: { weakMax: 11, averageMax: 12, goodMax: 23 },
      },
      mid: {
        typicalDescription: '12 - 24 months brand warranty',
        numeric: { weakMax: 11, averageMax: 12, goodMax: 23 },
      },
      upper_mid: {
        typicalDescription: '12 - 24 months with onsite support option',
        numeric: { weakMax: 11, averageMax: 12, goodMax: 23 },
      },
      flagship: {
        typicalDescription: '24 - 36 months premium / onsite coverage',
        numeric: { weakMax: 12, averageMax: 23, goodMax: 35 },
      },
    },
  },
};

// Design Thresholds: Smartphone Spec Reference Ranges
export const SMARTPHONE_REFERENCE_RANGES: Record<string, SpecReferenceRange> = {
  ram: {
    specKey: 'ram',
    displayName: 'RAM Capacity',
    unit: 'GB',
    bands: {
      entry: {
        typicalDescription: '4GB - 6GB standard in budget phones',
        numeric: { weakMax: 3, averageMax: 4, goodMax: 5 },
      },
      mid: {
        typicalDescription: '8GB standard in mid-range',
        numeric: { weakMax: 5, averageMax: 6, goodMax: 7 },
      },
      upper_mid: {
        typicalDescription: '8GB - 12GB fast LPDDR5/5X',
        numeric: { weakMax: 7, averageMax: 8, goodMax: 11 },
      },
      flagship: {
        typicalDescription: '12GB - 16GB flagship tier',
        numeric: { weakMax: 8, averageMax: 11, goodMax: 15 },
      },
    },
  },
  storage: {
    specKey: 'storage',
    displayName: 'Internal Storage',
    unit: 'GB',
    bands: {
      entry: {
        typicalDescription: '64GB - 128GB standard',
        numeric: { weakMax: 63, averageMax: 64, goodMax: 127 },
      },
      mid: {
        typicalDescription: '128GB - 256GB UFS 2.2/3.1',
        numeric: { weakMax: 127, averageMax: 128, goodMax: 255 },
      },
      upper_mid: {
        typicalDescription: '256GB UFS 3.1 / 4.0 standard',
        numeric: { weakMax: 128, averageMax: 255, goodMax: 511 },
      },
      flagship: {
        typicalDescription: '256GB - 512GB UFS 4.0 high speed',
        numeric: { weakMax: 255, averageMax: 256, goodMax: 511 },
      },
    },
  },
  batteryMah: {
    specKey: 'batteryMah',
    displayName: 'Battery Capacity',
    unit: 'mAh',
    bands: {
      entry: {
        typicalDescription: '5000mAh standard in Indian budget phones',
        numeric: { weakMax: 4400, averageMax: 4900, goodMax: 5400 },
      },
      mid: {
        typicalDescription: '5000mAh - 5500mAh typical',
        numeric: { weakMax: 4700, averageMax: 4999, goodMax: 5499 },
      },
      upper_mid: {
        typicalDescription: '4800mAh - 5500mAh silicon-carbon',
        numeric: { weakMax: 4500, averageMax: 4999, goodMax: 5400 },
      },
      flagship: {
        typicalDescription: '4500mAh - 5000mAh high-density pack',
        numeric: { weakMax: 4300, averageMax: 4700, goodMax: 5200 },
      },
    },
  },
  chargingWatts: {
    specKey: 'chargingWatts',
    displayName: 'Charging Speed',
    unit: 'W',
    bands: {
      entry: {
        typicalDescription: '18W - 33W in budget phones',
        numeric: { weakMax: 15, averageMax: 25, goodMax: 44 },
      },
      mid: {
        typicalDescription: '45W - 67W fast charging standard',
        numeric: { weakMax: 25, averageMax: 44, goodMax: 79 },
      },
      upper_mid: {
        typicalDescription: '67W - 100W+ rapid charging',
        numeric: { weakMax: 33, averageMax: 66, goodMax: 99 },
      },
      flagship: {
        typicalDescription: '45W wired + 15W wireless (or 80W+ on Chinese flagships)',
        numeric: { weakMax: 25, averageMax: 44, goodMax: 79 },
      },
    },
  },
  displayRefresh: {
    specKey: 'displayRefresh',
    displayName: 'Display Refresh Rate',
    unit: 'Hz',
    bands: {
      entry: {
        typicalDescription: '60Hz - 90Hz standard',
        numeric: { weakMax: 59, averageMax: 60, goodMax: 89 },
      },
      mid: {
        typicalDescription: '120Hz AMOLED standard in India mid-range',
        numeric: { weakMax: 60, averageMax: 89, goodMax: 119 },
      },
      upper_mid: {
        typicalDescription: '120Hz 1.5K LTPO AMOLED',
        numeric: { weakMax: 89, averageMax: 119, goodMax: 120 },
      },
      flagship: {
        typicalDescription: '1-120Hz adaptive LTPO AMOLED 2X',
        numeric: { weakMax: 89, averageMax: 119, goodMax: 120 },
      },
    },
  },
  softwareSupportYears: {
    specKey: 'softwareSupportYears',
    displayName: 'OS Update Support',
    unit: 'years',
    bands: {
      entry: {
        typicalDescription: '1 - 2 major Android OS updates',
        numeric: { weakMax: 1, averageMax: 2, goodMax: 3 },
      },
      mid: {
        typicalDescription: '2 - 3 major Android OS updates',
        numeric: { weakMax: 1, averageMax: 2, goodMax: 3 },
      },
      upper_mid: {
        typicalDescription: '3 - 4 major Android OS updates',
        numeric: { weakMax: 2, averageMax: 3, goodMax: 4 },
      },
      flagship: {
        typicalDescription: '4 - 7 years (Samsung/Google/Apple standard)',
        numeric: { weakMax: 3, averageMax: 4, goodMax: 6 },
      },
    },
  },
};
