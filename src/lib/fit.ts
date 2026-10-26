/**
 * WorthIt AI - Fit Engine (Pure TypeScript, deterministic)
 * Evaluates whether a product's hardware and verified specifications
 * satisfy the user's workload needs and thresholds.
 */

import {
  Product,
  UserPreferences,
  FitEvaluation,
  RequirementItem,
  RequirementStatus,
  CustomSpecCondition,
  EvidenceType,
} from '../types';

// Spec parsing helpers

export function parseRamGb(ramStr?: string | null): number | null {
  if (!ramStr) return null;
  const match = ramStr.match(/(\d+)\s*(?:GB|gb|G)/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

export function isSsdStorage(storageStr?: string | null): boolean | null {
  if (!storageStr) return null;
  const lower = storageStr.toLowerCase();
  if (lower.includes('ssd') || lower.includes('nvme') || lower.includes('pcie') || lower.includes('ufs')) {
    return true;
  }
  if (lower.includes('emmc') || lower.includes('hdd') || lower.includes('hard drive') || lower.includes('rpm')) {
    return false;
  }
  return true; // Default assumption for modern solid state devices if storage present
}

export type CpuTier = 'flagship' | 'upper-mid' | 'mid' | 'entry' | 'unknown';

export function getCpuTier(cpuStr?: string | null, category: 'laptop' | 'smartphone' = 'laptop'): CpuTier {
  if (!cpuStr) return 'unknown';
  const s = cpuStr.toLowerCase();

  if (category === 'laptop') {
    if (s.includes('i9') || s.includes('ryzen 9') || s.includes('m3 max') || s.includes('m4 max') || s.includes('m2 ultra') || s.includes('core ultra 9')) {
      return 'flagship';
    }
    if (s.includes('i7') || s.includes('ryzen 7') || s.includes('m2 pro') || s.includes('m3 pro') || s.includes('m4 pro') || s.includes('core ultra 7')) {
      return 'upper-mid';
    }
    if (s.includes('i5') || s.includes('ryzen 5') || s.includes('m1') || s.includes('m2') || s.includes('m3') || s.includes('m4') || s.includes('core ultra 5')) {
      return 'mid';
    }
    if (s.includes('i3') || s.includes('ryzen 3') || s.includes('celeron') || s.includes('pentium') || s.includes('athlon')) {
      return 'entry';
    }
    return 'mid';
  } else {
    // Smartphone
    if (s.includes('8 gen 3') || s.includes('8 gen 2') || s.includes('8 elite') || s.includes('9300') || s.includes('9400') || s.includes('a17 pro') || s.includes('a18') || s.includes('tensor g4')) {
      return 'flagship';
    }
    if (s.includes('7s gen') || s.includes('7+ gen') || s.includes('8200') || s.includes('8300') || s.includes('7300') || s.includes('a16') || s.includes('tensor g3') || s.includes('exynos 2400')) {
      return 'upper-mid';
    }
    if (s.includes('6 gen') || s.includes('7020') || s.includes('7050') || s.includes('6080') || s.includes('g99') || s.includes('exynos 1380') || s.includes('exynos 1480')) {
      return 'mid';
    }
    if (s.includes('4 gen') || s.includes('g85') || s.includes('g36') || s.includes('unisoc') || s.includes('p35')) {
      return 'entry';
    }
    return 'mid';
  }
}

export function hasDedicatedGpu(product: Product): boolean | null {
  const combined = `${product.name} ${product.specs.processor?.value || ''} ${product.specs.display?.value || ''}`.toLowerCase();
  if (combined.includes('rtx') || combined.includes('gtx') || combined.includes('radeon rx') || combined.includes('arc a370') || combined.includes('geforce')) {
    return true;
  }
  if (combined.includes('integrated') || combined.includes('intel iris') || combined.includes('intel uhd') || combined.includes('radeon 680m') || combined.includes('radeon 780m')) {
    return false;
  }
  // Check if it's a slim office laptop with no GPU mentions
  if (product.specs.processor?.value) {
    return false;
  }
  return null;
}

export function parseDisplaySpecs(displayStr?: string | null): {
  is1080pOrBetter: boolean | null;
  refreshRateHz: number | null;
  hasGoodColorGamut: boolean | null;
} {
  if (!displayStr) {
    return { is1080pOrBetter: null, refreshRateHz: null, hasGoodColorGamut: null };
  }
  const s = displayStr.toLowerCase();
  
  const is1080pOrBetter =
    s.includes('1080') ||
    s.includes('fhd') ||
    s.includes('1920') ||
    s.includes('1200') ||
    s.includes('2k') ||
    s.includes('1.5k') ||
    s.includes('qhd') ||
    s.includes('retina') ||
    s.includes('4k') ||
    s.includes('uhd') ||
    s.includes('oled') ||
    s.includes('amoled');

  let refreshRateHz = null;
  const hzMatch = s.match(/(\d+)\s*hz/i);
  if (hzMatch) {
    refreshRateHz = parseInt(hzMatch[1], 10);
  } else if (s.includes('120hz')) {
    refreshRateHz = 120;
  } else if (s.includes('90hz')) {
    refreshRateHz = 90;
  } else if (s.includes('144hz')) {
    refreshRateHz = 144;
  }

  const hasGoodColorGamut =
    s.includes('100% srgb') ||
    s.includes('dci-p3') ||
    s.includes('oled') ||
    s.includes('amoled') ||
    s.includes('liquid retina') ||
    s.includes('100% dci');

  return { is1080pOrBetter, refreshRateHz, hasGoodColorGamut };
}

export function parseBatteryMah(batteryStr?: string | null): number | null {
  if (!batteryStr) return null;
  const match = batteryStr.match(/(\d{4,5})\s*mah/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

export function parseChargingWatts(product: Product): number | null {
  if (product.specs.chargingSpeedWatts?.value) {
    return product.specs.chargingSpeedWatts.value;
  }
  const s = `${product.specs.batteryCapacity?.value || ''} ${product.specs.display?.value || ''}`.toLowerCase();
  const match = s.match(/(\d{2,3})\s*w(?:att)?/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

export function parseCameraFeatures(cameraStr?: string | null): {
  hasOis: boolean | null;
  hasTelephoto: boolean | null;
  mainMegapixels: number | null;
} {
  if (!cameraStr) {
    return { hasOis: null, hasTelephoto: null, mainMegapixels: null };
  }
  const s = cameraStr.toLowerCase();
  const hasOis = s.includes('ois') || s.includes('optical image stabilization') || s.includes('sensor-shift');
  const hasTelephoto = s.includes('telephoto') || s.includes('periscope') || s.includes('optical zoom') || s.includes('3x zoom') || s.includes('5x zoom');
  const mpMatch = s.match(/(\d{2,3})\s*mp/i);
  const mainMegapixels = mpMatch ? parseInt(mpMatch[1], 10) : null;

  return { hasOis, hasTelephoto, mainMegapixels };
}

export function parseDurability(product: Product): {
  hasIpRating: boolean | null;
  ipRatingCode: string | null;
  hasToughGlass: boolean | null;
  repairabilityScore: number | null;
} {
  const allText = `${product.name} ${product.specs.display?.value || ''} ${product.warranty.sourceUrl || ''} ${product.repairability.notes?.value || ''}`.toLowerCase();
  
  let hasIpRating: boolean | null = null;
  let ipRatingCode: string | null = null;
  const ipMatch = allText.match(/ip(54|65|67|68)/i);
  if (ipMatch) {
    hasIpRating = true;
    ipRatingCode = `IP${ipMatch[1]}`;
  } else if (allText.includes('water resistant') || allText.includes('splash resistant')) {
    hasIpRating = true;
    ipRatingCode = 'Splash Resistant';
  }

  const hasToughGlass =
    allText.includes('gorilla') ||
    allText.includes('ceramic shield') ||
    allText.includes('kunlun') ||
    allText.includes('armor');

  const repairabilityScore = product.repairability.scoreOutOfTen?.value ?? null;

  return { hasIpRating, ipRatingCode, hasToughGlass, repairabilityScore };
}

/**
 * Evaluates custom user conditions (extracted by Gemini or manually provided)
 */
export function evaluateCustomCondition(
  condition: CustomSpecCondition,
  product: Product
): RequirementItem {
  const specKey = condition.field.toLowerCase();
  let actualVal: any = null;
  let evidenceType: EvidenceType = 'unknown';
  let source: string | undefined;
  let sourceUrl: string | undefined;

  // Search across product specs
  if (specKey.includes('ram')) {
    const gb = parseRamGb(product.specs.ram?.value);
    actualVal = gb !== null ? `${gb}GB` : product.specs.ram?.value;
    evidenceType = product.specs.ram?.evidenceType || 'unknown';
    source = product.specs.ram?.source;
    sourceUrl = product.specs.ram?.sourceUrl;
  } else if (specKey.includes('storage') || specKey.includes('ssd')) {
    actualVal = product.specs.storage?.value;
    evidenceType = product.specs.storage?.evidenceType || 'unknown';
    source = product.specs.storage?.source;
    sourceUrl = product.specs.storage?.sourceUrl;
  } else if (specKey.includes('cpu') || specKey.includes('processor')) {
    actualVal = product.specs.processor?.value;
    evidenceType = product.specs.processor?.evidenceType || 'unknown';
    source = product.specs.processor?.source;
    sourceUrl = product.specs.processor?.sourceUrl;
  } else if (specKey.includes('battery')) {
    actualVal = product.specs.batteryCapacity?.value;
    evidenceType = product.specs.batteryCapacity?.evidenceType || 'unknown';
    source = product.specs.batteryCapacity?.source;
    sourceUrl = product.specs.batteryCapacity?.sourceUrl;
  } else if (specKey.includes('display') || specKey.includes('screen') || specKey.includes('oled')) {
    actualVal = product.specs.display?.value;
    evidenceType = product.specs.display?.evidenceType || 'unknown';
    source = product.specs.display?.source;
    sourceUrl = product.specs.display?.sourceUrl;
  }

  let status: RequirementStatus = 'unknown';
  let reason = '';

  if (actualVal === null || actualVal === undefined) {
    status = 'unknown';
    reason = `Spec '${condition.field}' is not verified in current product data.`;
  } else {
    const strVal = String(actualVal).toLowerCase();
    const expVal = String(condition.expectedValue).toLowerCase();

    if (condition.operator === 'contains') {
      if (strVal.includes(expVal)) {
        status = 'meets';
        reason = `Includes required specification: ${condition.expectedValue}.`;
      } else {
        status = 'fails';
        reason = `Does not meet user requirement (${condition.expectedValue}). Found: ${actualVal}.`;
      }
    } else if (condition.operator === '>=') {
      const numActual = parseFloat(strVal.replace(/[^0-9.]/g, ''));
      const numExp = parseFloat(expVal.replace(/[^0-9.]/g, ''));
      if (!isNaN(numActual) && !isNaN(numExp)) {
        if (numActual >= numExp) {
          status = 'meets';
          reason = `Exceeds or meets threshold (${numActual} >= ${numExp}).`;
        } else if (numActual >= numExp * 0.8) {
          status = 'borderline';
          reason = `Slightly below target (${numActual} vs ${numExp} required).`;
        } else {
          status = 'fails';
          reason = `Significantly below required ${numExp} (${numActual} found).`;
        }
      } else {
        status = 'unknown';
        reason = 'Could not parse numeric comparison.';
      }
    } else {
      status = strVal.includes(expVal) ? 'meets' : 'fails';
      reason = status === 'meets' ? 'Condition satisfied.' : 'Condition not met.';
    }
  }

  return {
    id: `custom-${condition.field.replace(/\s+/g, '-')}`,
    label: condition.description || `Required: ${condition.field} ${condition.operator} ${condition.expectedValue}`,
    useCase: 'User Essential Requirement',
    status,
    actualValue: actualVal,
    threshold: `${condition.operator} ${condition.expectedValue}`,
    reason,
    weight: 5, // Top priority because user marked as essential
    source,
    sourceUrl,
    evidenceType,
    isCustom: true,
  };
}

/**
 * Main Fit Evaluation Engine
 * Evaluates Laptop or Smartphone specs against explicit use-case profiles.
 */
export function evaluateProductFit(
  product: Product,
  preferences?: UserPreferences,
  customConditions: CustomSpecCondition[] = []
): FitEvaluation {
  const requirements: RequirementItem[] = [];
  const missingCoreSpecs: string[] = [];

  const category = product.category;
  const uses = (preferences?.intendedUse && preferences.intendedUse.length > 0)
    ? preferences.intendedUse.map((u) => u.toLowerCase())
    : ['everyday'];

  const weights = preferences?.importanceWeights || {
    performance: 3,
    batteryLife: 3,
    portability: 3,
    repairability: 3,
  };

  // Check core spec presence
  if (!product.specs.processor?.value) missingCoreSpecs.push('Processor / Chipset');
  if (!product.specs.ram?.value) missingCoreSpecs.push('RAM Capacity');
  if (!product.specs.storage?.value) missingCoreSpecs.push('Storage Type & Size');
  if (!product.specs.display?.value) missingCoreSpecs.push('Display Specification');

  // Parse hardware attributes
  const ramGb = parseRamGb(product.specs.ram?.value);
  const ssdOk = isSsdStorage(product.specs.storage?.value);
  const cpuTier = getCpuTier(product.specs.processor?.value, category);
  const displaySpecs = parseDisplaySpecs(product.specs.display?.value);
  const batteryLifeClaimed = product.specs.batteryLifeHours?.value ?? null;
  const weightKg = product.specs.weightKg?.value ?? null;
  const hasGpu = hasDedicatedGpu(product);
  const batteryMah = parseBatteryMah(product.specs.batteryCapacity?.value);
  const chargingWatts = parseChargingWatts(product);
  const cameraSpecs = parseCameraFeatures(product.specs.camera?.value);
  const durability = parseDurability(product);
  const updatePolicyYears = product.warranty.softwareUpdatePolicyYears?.value ?? null;
  const securityYears = product.warranty.securityPatchesYears?.value ?? null;

  // --- LAPTOP EVALUATION ---
  if (category === 'laptop') {
    // 1. Programming Use Case
    if (uses.includes('programming') || uses.includes('developer') || uses.includes('coding')) {
      // RAM (min 8GB, ideal 16GB)
      if (ramGb === null) {
        requirements.push({
          id: 'prog-ram',
          label: 'RAM for Developer Workloads',
          useCase: 'Programming',
          status: 'unknown',
          actualValue: product.specs.ram?.value || null,
          threshold: 'Min 8GB, ideal 16GB+',
          reason: 'RAM capacity unknown or unverified.',
          weight: Math.max(weights.performance, 4),
          source: product.specs.ram?.source,
          sourceUrl: product.specs.ram?.sourceUrl,
          evidenceType: product.specs.ram?.evidenceType || 'unknown',
        });
      } else if (ramGb >= 16) {
        requirements.push({
          id: 'prog-ram',
          label: 'RAM for Developer Workloads',
          useCase: 'Programming',
          status: 'meets',
          actualValue: `${ramGb}GB`,
          threshold: 'Min 8GB, ideal 16GB+',
          reason: `${ramGb}GB provides generous headroom for IDEs, Docker, and local compile tasks.`,
          weight: Math.max(weights.performance, 4),
          source: product.specs.ram?.source,
          sourceUrl: product.specs.ram?.sourceUrl,
          evidenceType: product.specs.ram?.evidenceType || 'verified',
        });
      } else if (ramGb >= 8) {
        requirements.push({
          id: 'prog-ram',
          label: 'RAM for Developer Workloads',
          useCase: 'Programming',
          status: 'borderline',
          actualValue: `${ramGb}GB`,
          threshold: 'Min 8GB, ideal 16GB+',
          reason: `8GB is viable for web scripting, but will bottleneck with Docker containers or heavy IDEs.`,
          weight: Math.max(weights.performance, 4),
          source: product.specs.ram?.source,
          sourceUrl: product.specs.ram?.sourceUrl,
          evidenceType: product.specs.ram?.evidenceType || 'verified',
        });
      } else {
        requirements.push({
          id: 'prog-ram',
          label: 'RAM for Developer Workloads',
          useCase: 'Programming',
          status: 'fails',
          actualValue: `${ramGb}GB`,
          threshold: 'Min 8GB, ideal 16GB+',
          reason: `Only ${ramGb}GB RAM; falls below the 8GB baseline required for programming environments.`,
          weight: Math.max(weights.performance, 5),
          source: product.specs.ram?.source,
          sourceUrl: product.specs.ram?.sourceUrl,
          evidenceType: product.specs.ram?.evidenceType || 'verified',
        });
      }

      // Fast SSD Storage
      requirements.push({
        id: 'prog-storage',
        label: 'Fast NVMe/SSD Storage',
        useCase: 'Programming',
        status: ssdOk === true ? 'meets' : ssdOk === false ? 'fails' : 'unknown',
        actualValue: product.specs.storage?.value || null,
        threshold: 'PCIe NVMe / Solid State required',
        reason: ssdOk === true
          ? 'Fast random read/write speeds for build caches and project dependencies.'
          : 'Traditional HDD or unverified storage creates build indexing bottlenecks.',
        weight: weights.performance,
        source: product.specs.storage?.source,
        sourceUrl: product.specs.storage?.sourceUrl,
        evidenceType: product.specs.storage?.evidenceType || 'unknown',
      });

      // CPU Tier (Mid or better)
      const cpuStatus: RequirementStatus =
        cpuTier === 'flagship' || cpuTier === 'upper-mid' || cpuTier === 'mid'
          ? 'meets'
          : cpuTier === 'entry'
          ? 'fails'
          : 'unknown';
      requirements.push({
        id: 'prog-cpu',
        label: 'Multi-Core Processor',
        useCase: 'Programming',
        status: cpuStatus,
        actualValue: product.specs.processor?.value || null,
        threshold: 'Mid tier or higher (Core i5/Ryzen 5/Apple M-series)',
        reason: cpuStatus === 'meets'
          ? `Adequate multi-threaded compile throughput (${product.specs.processor?.value || 'Mid-tier CPU'}).`
          : cpuStatus === 'fails'
          ? 'Entry-level processor may struggle with multi-file builds and virtualization.'
          : 'Processor specifications could not be verified.',
        weight: weights.performance,
        source: product.specs.processor?.source,
        sourceUrl: product.specs.processor?.sourceUrl,
        evidenceType: product.specs.processor?.evidenceType || 'unknown',
      });

      // Display Resolution (1080p minimum for side-by-side editor/terminal)
      requirements.push({
        id: 'prog-display',
        label: 'FHD (1080p) Workspace Display',
        useCase: 'Programming',
        status: displaySpecs.is1080pOrBetter === true ? 'meets' : displaySpecs.is1080pOrBetter === false ? 'fails' : 'unknown',
        actualValue: product.specs.display?.value || null,
        threshold: '1080p (FHD) minimum screen real estate',
        reason: displaySpecs.is1080pOrBetter === true
          ? 'Sufficient pixels for split editor and terminal view.'
          : 'Sub-1080p displays limit code lines visible without excessive horizontal scrolling.',
        weight: 3,
        source: product.specs.display?.source,
        sourceUrl: product.specs.display?.sourceUrl,
        evidenceType: product.specs.display?.evidenceType || 'unknown',
      });
    }

    // 2. College / Office Workload
    if (uses.includes('college') || uses.includes('office') || uses.includes('student') || uses.includes('work')) {
      // RAM (8GB min)
      requirements.push({
        id: 'office-ram',
        label: 'RAM for Multi-Tab & Office Apps',
        useCase: 'College / Office',
        status: ramGb !== null ? (ramGb >= 8 ? 'meets' : 'fails') : 'unknown',
        actualValue: product.specs.ram?.value || null,
        threshold: 'Min 8GB RAM',
        reason: ramGb !== null
          ? ramGb >= 8 ? 'Reliable multi-tasking across browser research tabs and docs.' : 'Sub-8GB RAM causes aggressive browser tab discarding.'
          : 'RAM capacity unverified.',
        weight: 4,
        source: product.specs.ram?.source,
        sourceUrl: product.specs.ram?.sourceUrl,
        evidenceType: product.specs.ram?.evidenceType || 'unknown',
      });

      // Battery Life (6h+ claimed)
      let battStatus: RequirementStatus = 'unknown';
      let battReason = 'Battery endurance not specified.';
      if (batteryLifeClaimed !== null) {
        if (batteryLifeClaimed >= 6) {
          battStatus = 'meets';
          battReason = `${batteryLifeClaimed} hours claimed; comfortably covers typical campus or workday sessions.`;
        } else if (batteryLifeClaimed >= 4.5) {
          battStatus = 'borderline';
          battReason = `${batteryLifeClaimed} hours claimed; will require carrying a charger on full campus days.`;
        } else {
          battStatus = 'fails';
          battReason = `Only ${batteryLifeClaimed} hours; well below the 6-hour endurance threshold for mobile use.`;
        }
      }
      requirements.push({
        id: 'office-battery',
        label: 'Battery Endurance for Campus/Work',
        useCase: 'College / Office',
        status: battStatus,
        actualValue: batteryLifeClaimed !== null ? `${batteryLifeClaimed} hrs` : product.specs.batteryCapacity?.value || null,
        threshold: '6+ hours claimed runtime',
        reason: battReason,
        weight: weights.batteryLife,
        source: product.specs.batteryLifeHours?.source || product.specs.batteryCapacity?.source,
        sourceUrl: product.specs.batteryLifeHours?.sourceUrl || product.specs.batteryCapacity?.sourceUrl,
        evidenceType: product.specs.batteryLifeHours?.evidenceType || product.specs.batteryCapacity?.evidenceType || 'unknown',
      });

      // Weight (< 2.0 kg preferred)
      let weightStatus: RequirementStatus = 'unknown';
      let weightReason = 'Chassis weight unverified.';
      if (weightKg !== null) {
        if (weightKg <= 1.6) {
          weightStatus = 'meets';
          weightReason = `Lightweight portability at ${weightKg} kg for backpack commuting.`;
        } else if (weightKg <= 2.0) {
          weightStatus = 'borderline';
          weightReason = `Manageable ${weightKg} kg, acceptable for daily bag carry.`;
        } else {
          weightStatus = 'fails';
          weightReason = `${weightKg} kg is on the heavier side for frequent commuting.`;
        }
      }
      requirements.push({
        id: 'office-weight',
        label: 'Commute Portability (Chassis Weight)',
        useCase: 'College / Office',
        status: weightStatus,
        actualValue: weightKg !== null ? `${weightKg} kg` : null,
        threshold: 'Under 2.0 kg preferred (< 1.6 kg ideal)',
        reason: weightReason,
        weight: weights.portability,
        source: product.specs.weightKg?.source,
        sourceUrl: product.specs.weightKg?.sourceUrl,
        evidenceType: product.specs.weightKg?.evidenceType || 'unknown',
      });
    }

    // 3. Gaming Workload
    if (uses.includes('gaming')) {
      // Dedicated GPU
      let gpuStatus: RequirementStatus = 'unknown';
      let gpuReason = 'GPU configuration unverified.';
      if (hasGpu === true) {
        gpuStatus = 'meets';
        gpuReason = 'Dedicated GPU present for 3D rasterization and modern titles.';
      } else if (hasGpu === false) {
        gpuStatus = 'fails';
        gpuReason = 'Uses integrated graphics; unable to sustain modern 3D games smoothly.';
      }
      requirements.push({
        id: 'gaming-gpu',
        label: 'Dedicated Graphics Processing Unit (GPU)',
        useCase: 'Gaming',
        status: gpuStatus,
        actualValue: hasGpu === true ? 'Dedicated GPU found' : hasGpu === false ? 'Integrated graphics' : null,
        threshold: 'Dedicated GPU (NVIDIA RTX / AMD Radeon RX) required',
        reason: gpuReason,
        weight: 5,
        source: product.specs.processor?.source,
        sourceUrl: product.specs.processor?.sourceUrl,
        evidenceType: product.specs.processor?.evidenceType || 'unknown',
      });

      // 16GB RAM for gaming
      requirements.push({
        id: 'gaming-ram',
        label: '16GB RAM Headroom',
        useCase: 'Gaming',
        status: ramGb !== null ? (ramGb >= 16 ? 'meets' : ramGb >= 8 ? 'borderline' : 'fails') : 'unknown',
        actualValue: product.specs.ram?.value || null,
        threshold: '16GB RAM recommended for modern titles',
        reason: ramGb !== null
          ? ramGb >= 16 ? 'Ample memory for game assets and background OS services.' : '8GB RAM will stutter in AAA titles with high asset texture pools.'
          : 'RAM capacity unverified.',
        weight: 4,
        source: product.specs.ram?.source,
        sourceUrl: product.specs.ram?.sourceUrl,
        evidenceType: product.specs.ram?.evidenceType || 'unknown',
      });

      // 120Hz+ Refresh Rate
      const hz = displaySpecs.refreshRateHz;
      let hzStatus: RequirementStatus = 'unknown';
      if (hz !== null) {
        hzStatus = hz >= 120 ? 'meets' : hz >= 90 ? 'borderline' : 'fails';
      }
      requirements.push({
        id: 'gaming-refresh',
        label: 'High Refresh Rate Display (120Hz+)',
        useCase: 'Gaming',
        status: hzStatus,
        actualValue: hz ? `${hz}Hz` : product.specs.display?.value || null,
        threshold: '120Hz+ preferred for competitive response time',
        reason: hzStatus === 'meets'
          ? `Smooth ${hz}Hz refresh minimizes motion blur in fast-paced gameplay.`
          : hzStatus === 'fails'
          ? `Standard 60Hz panel lacks fluidity for competitive gaming.`
          : 'Display refresh rate unverified in data.',
        weight: 3,
        source: product.specs.display?.source,
        sourceUrl: product.specs.display?.sourceUrl,
        evidenceType: product.specs.display?.evidenceType || 'unknown',
      });
    }

    // 4. Design / Video Editing Workload
    if (uses.includes('design') || uses.includes('video') || uses.includes('content') || uses.includes('editing')) {
      // Color Gamut (100% sRGB or better)
      let gamutStatus: RequirementStatus = 'unknown';
      if (displaySpecs.hasGoodColorGamut === true) {
        gamutStatus = 'meets';
      } else if (displaySpecs.hasGoodColorGamut === false) {
        gamutStatus = 'borderline';
      }
      requirements.push({
        id: 'design-color',
        label: 'Accurate Color Gamut (100% sRGB / DCI-P3)',
        useCase: 'Design / Video',
        status: gamutStatus,
        actualValue: product.specs.display?.value || null,
        threshold: '100% sRGB or DCI-P3 wide color coverage',
        reason: gamutStatus === 'meets'
          ? 'Color calibrated panel suitable for print and digital color grading.'
          : 'Standard budget displays (~45% NTSC) produce washed-out inaccurate colors for design.',
        weight: 4,
        source: product.specs.display?.source,
        sourceUrl: product.specs.display?.sourceUrl,
        evidenceType: product.specs.display?.evidenceType || 'unknown',
      });

      // 16GB RAM for timeline scrubbing
      requirements.push({
        id: 'design-ram',
        label: '16GB+ System RAM for Video Timelines',
        useCase: 'Design / Video',
        status: ramGb !== null ? (ramGb >= 16 ? 'meets' : ramGb >= 8 ? 'borderline' : 'fails') : 'unknown',
        actualValue: product.specs.ram?.value || null,
        threshold: '16GB RAM minimum for 4K / multi-track editing',
        reason: ramGb !== null && ramGb >= 16
          ? 'Smooth timeline playback in Premiere, DaVinci, or After Effects.'
          : 'Video editing software exhausts 8GB RAM quickly during rendering.',
        weight: 4,
        source: product.specs.ram?.source,
        sourceUrl: product.specs.ram?.sourceUrl,
        evidenceType: product.specs.ram?.evidenceType || 'unknown',
      });
    }

    // 5. Everyday Use (default if no heavy use selected)
    if (requirements.length === 0 || uses.includes('everyday')) {
      requirements.push({
        id: 'everyday-ram',
        label: 'Standard Everyday Responsiveness',
        useCase: 'Everyday',
        status: ramGb !== null ? (ramGb >= 8 ? 'meets' : 'fails') : 'unknown',
        actualValue: product.specs.ram?.value || null,
        threshold: '8GB RAM baseline',
        reason: ramGb !== null && ramGb >= 8
          ? 'Sufficient for video streaming, email, and browsing.'
          : 'Sub-8GB RAM leads to system slowdowns during casual multitasking.',
        weight: 3,
        source: product.specs.ram?.source,
        sourceUrl: product.specs.ram?.sourceUrl,
        evidenceType: product.specs.ram?.evidenceType || 'unknown',
      });

      requirements.push({
        id: 'everyday-storage',
        label: 'Solid State Drive (SSD)',
        useCase: 'Everyday',
        status: ssdOk === true ? 'meets' : ssdOk === false ? 'fails' : 'unknown',
        actualValue: product.specs.storage?.value || null,
        threshold: 'SSD storage required for fast boot times',
        reason: ssdOk === true
          ? 'Fast OS boot and app launching under 10 seconds.'
          : 'Spinning hard drives deliver slow system response.',
        weight: 3,
        source: product.specs.storage?.source,
        sourceUrl: product.specs.storage?.sourceUrl,
        evidenceType: product.specs.storage?.evidenceType || 'unknown',
      });
    }
  }

  // --- SMARTPHONE EVALUATION ---
  if (category === 'smartphone') {
    // 1. Photography Needs
    if (uses.includes('photography') || uses.includes('camera') || uses.includes('social media')) {
      // OIS
      let oisStatus: RequirementStatus = 'unknown';
      let oisReason = 'Camera optical stabilization unverified.';
      if (cameraSpecs.hasOis === true) {
        oisStatus = 'meets';
        oisReason = 'Hardware OIS prevents blur in low-light indoor photos and steady handheld video.';
      } else if (cameraSpecs.hasOis === false) {
        oisStatus = 'fails';
        oisReason = 'No hardware OIS; handheld low-light photos will suffer motion blur.';
      }
      requirements.push({
        id: 'phone-ois',
        label: 'Optical Image Stabilization (OIS)',
        useCase: 'Photography',
        status: oisStatus,
        actualValue: cameraSpecs.hasOis === true ? 'OIS Supported' : cameraSpecs.hasOis === false ? 'No OIS (EIS only)' : null,
        threshold: 'Hardware OIS required on main sensor',
        reason: oisReason,
        weight: 5,
        source: product.specs.camera?.source,
        sourceUrl: product.specs.camera?.sourceUrl,
        evidenceType: product.specs.camera?.evidenceType || 'unknown',
      });

      // Telephoto / Sensor quality
      requirements.push({
        id: 'phone-telephoto',
        label: 'Dedicated Telephoto or Large Sensor',
        useCase: 'Photography',
        status: cameraSpecs.hasTelephoto === true ? 'meets' : cameraSpecs.mainMegapixels && cameraSpecs.mainMegapixels >= 50 ? 'borderline' : 'fails',
        actualValue: product.specs.camera?.value || null,
        threshold: 'Optical zoom lens or large sensor with in-sensor crop',
        reason: cameraSpecs.hasTelephoto === true
          ? 'True optical zoom captures crisp portraits without digital pixelation.'
          : 'Digital crop on secondary sensors loses clarity at 3x+ magnification.',
        weight: 4,
        source: product.specs.camera?.source,
        sourceUrl: product.specs.camera?.sourceUrl,
        evidenceType: product.specs.camera?.evidenceType || 'unknown',
      });
    }

    // 2. Battery & Charging Endurance
    if (uses.includes('battery') || uses.includes('heavy use') || uses.includes('travel')) {
      let battStatus: RequirementStatus = 'unknown';
      let battReason = 'Battery capacity unverified.';
      if (batteryMah !== null) {
        if (batteryMah >= 5000) {
          battStatus = 'meets';
          battReason = `${batteryMah} mAh capacity ensures all-day endurance under typical Indian 5G usage.`;
        } else if (batteryMah >= 4400) {
          battStatus = 'borderline';
          battReason = `${batteryMah} mAh is adequate on power-efficient chipsets but may require top-up on heavy 5G days.`;
        } else {
          battStatus = 'fails';
          battReason = `Only ${batteryMah} mAh; below 5000 mAh threshold, requiring midday recharges.`;
        }
      }
      requirements.push({
        id: 'phone-battery',
        label: 'All-Day Battery Capacity (5000+ mAh)',
        useCase: 'Battery & Endurance',
        status: battStatus,
        actualValue: batteryMah ? `${batteryMah} mAh` : product.specs.batteryCapacity?.value || null,
        threshold: '5000+ mAh capacity for 5G standby',
        reason: battReason,
        weight: weights.batteryLife,
        source: product.specs.batteryCapacity?.source,
        sourceUrl: product.specs.batteryCapacity?.sourceUrl,
        evidenceType: product.specs.batteryCapacity?.evidenceType || 'unknown',
      });

      // Charging wattage
      let chargeStatus: RequirementStatus = 'unknown';
      let chargeReason = 'Fast charging speed not verified.';
      if (chargingWatts !== null) {
        if (chargingWatts >= 45) {
          chargeStatus = 'meets';
          chargeReason = `${chargingWatts}W fast charging provides quick 0-50% top-ups under 25 minutes.`;
        } else if (chargingWatts >= 25) {
          chargeStatus = 'borderline';
          chargeReason = `${chargingWatts}W charging is standard but takes over 65 minutes for a full cycle.`;
        } else {
          chargeStatus = 'fails';
          chargeReason = `${chargingWatts}W slow charging takes extended time.`;
        }
      }
      requirements.push({
        id: 'phone-charging',
        label: 'Fast Charging Support (33W+)',
        useCase: 'Battery & Endurance',
        status: chargeStatus,
        actualValue: chargingWatts ? `${chargingWatts}W` : null,
        threshold: '33W - 65W+ quick replenishment',
        reason: chargeReason,
        weight: weights.batteryLife,
        source: product.specs.chargingSpeedWatts?.source || product.specs.batteryCapacity?.source,
        sourceUrl: product.specs.chargingSpeedWatts?.sourceUrl || product.specs.batteryCapacity?.sourceUrl,
        evidenceType: product.specs.chargingSpeedWatts?.evidenceType || 'unknown',
      });
    }

    // 3. Mobile Gaming
    if (uses.includes('gaming')) {
      const isGamingChip = cpuTier === 'flagship' || cpuTier === 'upper-mid';
      requirements.push({
        id: 'phone-chipset',
        label: 'High-Performance 5G Gaming SoC',
        useCase: 'Mobile Gaming',
        status: isGamingChip ? 'meets' : cpuTier === 'entry' ? 'fails' : cpuTier === 'mid' ? 'borderline' : 'unknown',
        actualValue: product.specs.processor?.value || null,
        threshold: 'Upper-mid or Flagship chipset (Snapdragon 7s/8-series or Dimensity 8000+)',
        reason: isGamingChip
          ? 'Strong GPU thermal stability sustains 60-90 FPS in BGMI / Genshin Impact.'
          : 'Mid-range chipset may throttle frames during extended gaming matches.',
        weight: weights.performance,
        source: product.specs.processor?.source,
        sourceUrl: product.specs.processor?.sourceUrl,
        evidenceType: product.specs.processor?.evidenceType || 'unknown',
      });

      const hz = displaySpecs.refreshRateHz;
      requirements.push({
        id: 'phone-display-hz',
        label: 'High Refresh Rate Display (90Hz / 120Hz)',
        useCase: 'Mobile Gaming',
        status: hz !== null ? (hz >= 90 ? 'meets' : 'fails') : 'unknown',
        actualValue: hz ? `${hz}Hz` : product.specs.display?.value || null,
        threshold: '90Hz - 120Hz touch sampling and refresh',
        reason: hz && hz >= 90
          ? 'Fluid touch sampling and animations for competitive reaction speed.'
          : 'Standard 60Hz display introduces noticeable visual lag in gaming.',
        weight: 3,
        source: product.specs.display?.source,
        sourceUrl: product.specs.display?.sourceUrl,
        evidenceType: product.specs.display?.evidenceType || 'unknown',
      });
    }

    // 4. Software Support Lifecycle
    if (uses.includes('software support') || uses.includes('longevity') || (preferences && preferences.expectedOwnershipYears >= 3)) {
      const minYearsNeeded = preferences?.expectedOwnershipYears || 3;
      let updateStatus: RequirementStatus = 'unknown';
      let updateReason = 'Software update policy not officially verified.';
      if (updatePolicyYears !== null) {
        if (updatePolicyYears >= minYearsNeeded) {
          updateStatus = 'meets';
          updateReason = `${updatePolicyYears} years of guaranteed OS updates protects your ${minYearsNeeded}-year ownership plan.`;
        } else {
          updateStatus = 'borderline';
          updateReason = `Guarantees ${updatePolicyYears} years of OS updates; falls short of your desired ${minYearsNeeded}-year lifespan.`;
        }
      }
      requirements.push({
        id: 'phone-updates',
        label: `Guaranteed OS & Security Updates (${minYearsNeeded}+ Years)`,
        useCase: 'Longevity & Support',
        status: updateStatus,
        actualValue: updatePolicyYears !== null ? `${updatePolicyYears} OS / ${securityYears || updatePolicyYears} Security yrs` : null,
        threshold: `${minYearsNeeded} years of software maintenance`,
        reason: updateReason,
        weight: 4,
        source: product.warranty.sourceUrl ? 'Manufacturer Policy' : undefined,
        sourceUrl: product.warranty.sourceUrl,
        evidenceType: product.warranty.softwareUpdatePolicyYears?.evidenceType || 'unknown',
      });
    }

    // 5. Durability & Build Quality
    if (uses.includes('durability') || weights.repairability >= 4) {
      let durStatus: RequirementStatus = 'unknown';
      let durReason = 'IP water resistance and glass rating not verified.';
      if (durability.hasIpRating) {
        durStatus = 'meets';
        durReason = `Certified ${durability.ipRatingCode || 'IP protection'} protects against monsoon rains and splashes in India.`;
      } else if (durability.hasToughGlass) {
        durStatus = 'borderline';
        durReason = 'Hardened glass present, but official IP water resistance rating is absent.';
      } else {
        durStatus = 'borderline';
        durReason = 'No official IP rating found in manufacturer documentation.';
      }
      requirements.push({
        id: 'phone-durability',
        label: 'Monsoon Splash & Drop Protection (IP Rating / Tough Glass)',
        useCase: 'Durability',
        status: durStatus,
        actualValue: durability.ipRatingCode || (durability.hasToughGlass ? 'Hardened Glass' : null),
        threshold: 'IP54+ water splash resistance and hardened glass',
        reason: durReason,
        weight: weights.repairability,
        source: product.repairability.notes?.source,
        sourceUrl: product.repairability.notes?.sourceUrl,
        evidenceType: product.repairability.notes?.evidenceType || 'unknown',
      });
    }

    // Default smartphone everyday checks if empty
    if (requirements.length === 0) {
      requirements.push({
        id: 'phone-everyday-ram',
        label: 'Smooth Multitasking RAM (6GB+)',
        useCase: 'Everyday',
        status: ramGb !== null ? (ramGb >= 6 ? 'meets' : 'fails') : 'unknown',
        actualValue: product.specs.ram?.value || null,
        threshold: 'Min 6GB RAM',
        reason: ramGb && ramGb >= 6 ? 'Sufficient for modern Android/iOS UI fluid animations.' : 'Sub-6GB phones struggle with modern social and banking apps.',
        weight: 3,
        source: product.specs.ram?.source,
        sourceUrl: product.specs.ram?.sourceUrl,
        evidenceType: product.specs.ram?.evidenceType || 'unknown',
      });
    }
  }

  // --- EVALUATE CUSTOM CONDITIONS ---
  for (const cond of customConditions) {
    requirements.push(evaluateCustomCondition(cond, product));
  }

  // Calculate statistics
  let meetsCount = 0;
  let borderlineCount = 0;
  let failsCount = 0;
  let unknownCount = 0;

  let totalWeightedScore = 0;
  let totalMaxWeight = 0;

  for (const r of requirements) {
    totalMaxWeight += r.weight;
    if (r.status === 'meets') {
      meetsCount++;
      totalWeightedScore += r.weight * 1.0;
    } else if (r.status === 'borderline') {
      borderlineCount++;
      totalWeightedScore += r.weight * 0.6;
    } else if (r.status === 'fails') {
      failsCount++;
      totalWeightedScore += r.weight * 0.0;
    } else {
      unknownCount++;
      // Neutral contribution for unknown
      totalWeightedScore += r.weight * 0.5;
    }
  }

  const fitPercentage = totalMaxWeight > 0 ? Math.round((totalWeightedScore / totalMaxWeight) * 100) : 50;

  // Determine overall fit status
  let overallFitStatus: 'fits' | 'borderline' | 'fails' | 'insufficient_specs' = 'fits';

  if (missingCoreSpecs.length >= 3) {
    overallFitStatus = 'insufficient_specs';
  } else if (failsCount > 0) {
    // If any high-weight requirement fails (weight >= 4), it fails fit
    const hasMajorFailure = requirements.some((r) => r.status === 'fails' && r.weight >= 4);
    overallFitStatus = hasMajorFailure || failsCount >= 2 ? 'fails' : 'borderline';
  } else if (borderlineCount > 0 || unknownCount > requirements.length / 2) {
    overallFitStatus = 'borderline';
  } else {
    overallFitStatus = 'fits';
  }

  return {
    overallFitStatus,
    fitPercentage,
    requirements,
    meetsCount,
    borderlineCount,
    failsCount,
    unknownCount,
    missingCoreSpecs,
  };
}
