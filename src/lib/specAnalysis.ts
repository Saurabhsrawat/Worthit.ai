/**
 * WorthIt AI - Spec Analysis Engine (Pure TypeScript, deterministic, zero LLM)
 * Evaluates key product specifications against objective reference ranges
 * and design thresholds relative to category and price band in India.
 * Never guesses: if a spec or price band is unknown, it strictly returns "Unknown".
 */

import {
  Product,
  UserPreferences,
  ProductCategory,
  EvidenceType,
  RatedSpec,
  SpecRating,
  SpecRelevance,
  StrengthWeaknessItem,
  TradeoffItem,
  StandoutFeature,
  SuitednessTags,
  SpecAnalysisResult,
} from '../types';
import {
  resolvePriceBand,
  PriceBandInfo,
  LAPTOP_REFERENCE_RANGES,
  SMARTPHONE_REFERENCE_RANGES,
  NumericThresholdRule,
  ABSOLUTE_LAPTOP_THRESHOLDS,
  ABSOLUTE_SMARTPHONE_THRESHOLDS,
} from './referenceRanges';
import {
  parseRamGb,
  isSsdStorage,
  getCpuTier,
  hasDedicatedGpu,
  parseDisplaySpecs,
  parseBatteryMah,
  parseChargingWatts,
  parseCameraFeatures,
  parseDurability,
} from './fit';

/**
 * Rates a numeric spec against design thresholds
 */
function rateNumericSpec(
  val: number | null | undefined,
  rule?: NumericThresholdRule,
  lowerIsBetter = false
): { rating: SpecRating; score: number | null } {
  if (val === null || val === undefined || isNaN(val) || !rule) {
    return { rating: 'Unknown', score: null };
  }

  if (lowerIsBetter) {
    // e.g. Weight: <= goodMax is Excellent, <= averageMax is Good, <= weakMax is Average, > weakMax is Weak
    if (val <= rule.goodMax) return { rating: 'Excellent', score: 95 };
    if (val <= rule.averageMax) return { rating: 'Good', score: 80 };
    if (val <= rule.weakMax) return { rating: 'Average', score: 60 };
    return { rating: 'Weak', score: 35 };
  } else {
    // Higher is better
    if (val > rule.goodMax) return { rating: 'Excellent', score: 95 };
    if (val > rule.averageMax) return { rating: 'Good', score: 80 };
    if (val > rule.weakMax) return { rating: 'Average', score: 60 };
    return { rating: 'Weak', score: 35 };
  }
}

/**
 * Computes user-relevance for each spec given user profile
 */
function computeRelevance(
  specKey: string,
  category: ProductCategory,
  preferences?: UserPreferences
): { relevance: SpecRelevance; reason: string; weightFactor: number } {
  const uses = (preferences?.intendedUse || ['everyday']).map((u) => u.toLowerCase());
  const weights = preferences?.importanceWeights || {
    performance: 3,
    batteryLife: 3,
    portability: 3,
    repairability: 3,
  };

  const isDev = uses.some((u) => u.includes('program') || u.includes('code') || u.includes('developer'));
  const isGamer = uses.some((u) => u.includes('game') || u.includes('gaming'));
  const isCreator = uses.some((u) => u.includes('video') || u.includes('edit') || u.includes('design') || u.includes('photo'));
  const isEveryday = uses.some((u) => u.includes('everyday') || u.includes('office') || u.includes('study') || u.includes('student'));
  const isPhotoUser = uses.some((u) => u.includes('photo') || u.includes('camera') || u.includes('creator'));
  const isTravelUser = uses.some((u) => u.includes('travel') || u.includes('battery') || u.includes('mobility'));

  switch (specKey) {
    case 'processor':
      if (isDev || isGamer || isCreator || weights.performance >= 4) {
        return { relevance: 'High', reason: 'Directly dictates code compile times, rendering speed, and sustained workload capacity.', weightFactor: 1.5 };
      }
      return { relevance: 'Medium', reason: 'Ensures snappy everyday responsiveness and fluid multitasking.', weightFactor: 1.0 };

    case 'ram':
      if (isDev) {
        return { relevance: 'High', reason: 'Essential for running IDEs, local Docker containers, and browser tabs without paging.', weightFactor: 1.5 };
      }
      if (isCreator || isGamer || weights.performance >= 4) {
        return { relevance: 'High', reason: 'Prevents asset buffer bottlenecks and multitasking stutter during heavy load.', weightFactor: 1.4 };
      }
      return { relevance: 'Medium', reason: 'Maintains smooth app switching in daily use.', weightFactor: 1.0 };

    case 'storage':
      if (isDev || isCreator || isGamer) {
        return { relevance: 'High', reason: 'Accommodates project builds, game libraries, and 4K media without immediate external drives.', weightFactor: 1.3 };
      }
      return { relevance: 'Medium', reason: 'Sufficient capacity for OS updates and offline media.', weightFactor: 1.0 };

    case 'gpu':
      if (isGamer || isCreator) {
        return { relevance: 'High', reason: 'Crucial hardware component for real-time 3D rasterization and hardware video encoding.', weightFactor: 1.6 };
      }
      return { relevance: 'Low', reason: 'Integrated graphics handle everyday productivity and streaming with lower power consumption.', weightFactor: 0.6 };

    case 'display':
      if (isCreator) {
        return { relevance: 'High', reason: 'Accurate color reproduction and high sharpness are critical for design and color grading.', weightFactor: 1.5 };
      }
      if (isGamer) {
        return { relevance: 'High', reason: 'High refresh rate provides visual fluid motion and reduced input latency.', weightFactor: 1.4 };
      }
      if (isDev) {
        return { relevance: 'Medium', reason: 'Sharp text scaling reduces eye fatigue during prolonged coding sessions.', weightFactor: 1.1 };
      }
      return { relevance: 'Medium', reason: 'Quality screen enhances daily media and reading experience.', weightFactor: 1.0 };

    case 'battery':
      if (isTravelUser || weights.batteryLife >= 4) {
        return { relevance: 'High', reason: 'Enables reliable untethered operation across your typical workday or commute.', weightFactor: 1.5 };
      }
      return { relevance: 'Medium', reason: 'Ensures comfortable multi-hour unplugged utility.', weightFactor: 1.0 };

    case 'charging':
      if (weights.batteryLife >= 4 || isTravelUser) {
        return { relevance: 'High', reason: 'Fast top-ups reduce downtime when preparing for on-the-go work.', weightFactor: 1.3 };
      }
      return { relevance: 'Medium', reason: 'Convenient quick replenishment during breaks.', weightFactor: 0.9 };

    case 'weight':
      if (weights.portability >= 4 || isTravelUser || isEveryday) {
        return { relevance: 'High', reason: 'Lightweight chassis drastically reduces shoulder strain during daily transit.', weightFactor: 1.4 };
      }
      return { relevance: 'Low', reason: 'Chassis weight has minimal impact if primarily used at a dedicated desk.', weightFactor: 0.7 };

    case 'camera':
      if (category === 'smartphone' && (isPhotoUser || isCreator)) {
        return { relevance: 'High', reason: 'Primary creative tool for capturing stabilized photos and high-dynamic-range video.', weightFactor: 1.5 };
      }
      if (category === 'smartphone') {
        return { relevance: 'Medium', reason: 'Standard social sharing and document capture.', weightFactor: 0.9 };
      }
      return { relevance: 'Low', reason: 'Webcam is used occasionally for video conferences.', weightFactor: 0.5 };

    case 'durability':
      if (weights.repairability >= 4 || isTravelUser) {
        return { relevance: 'High', reason: 'Robust physical protection and water resistance prevent costly accidental damage.', weightFactor: 1.3 };
      }
      return { relevance: 'Medium', reason: 'Standard physical resilience for typical indoor handling.', weightFactor: 1.0 };

    case 'softwareSupport':
      if ((preferences?.expectedOwnershipYears || 3) >= 4 || weights.repairability >= 4) {
        return { relevance: 'High', reason: 'Long-term OS and security updates are vital for your planned 4+ year ownership tenure.', weightFactor: 1.5 };
      }
      return { relevance: 'Medium', reason: 'Keeps device secure and compatible with modern application APIs.', weightFactor: 1.0 };

    case 'ports':
      if (isDev || isCreator) {
        return { relevance: 'High', reason: 'Versatile I/O avoids cumbersome dongles when connecting external monitors and peripherals.', weightFactor: 1.2 };
      }
      return { relevance: 'Medium', reason: 'Covers standard charging and data transfer requirements.', weightFactor: 0.9 };

    default:
      return { relevance: 'Medium', reason: 'Standard evaluation factor for this category.', weightFactor: 1.0 };
  }
}

/**
 * Main spec analysis function: evaluates 12 key specifications
 * against design thresholds, computing relative rating, user relevance,
 * top strengths, weaknesses, standout features, and tradeoffs.
 */
export function analyzeProductSpecs(
  product: Product,
  preferences?: UserPreferences,
  userPrice?: number
): SpecAnalysisResult {
  const category = product.category;
  const price = userPrice || product.priceInInr?.value || 0;
  const priceBand = resolvePriceBand(category, price);
  const bandId = priceBand ? priceBand.id : null;
  const bandLabel = priceBand ? priceBand.label : 'Price Band Unknown';

  const ratedSpecs: RatedSpec[] = [];
  const unverifiableSpecs: { item: string; impact: string }[] = [];

  // Helper to push unknown spec
  const pushUnknownSpec = (specKey: string, specName: string, rawText = 'Not documented in research data', impact = 'Reduces verdict certainty') => {
    const rel = computeRelevance(specKey, category, preferences);
    ratedSpecs.push({
      specKey,
      specName,
      rawText,
      value: null,
      evidenceType: 'unknown',
      rating: 'Unknown',
      comparisonNote: `${specName} missing from research data`,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: null,
      priceBand: bandLabel,
    });
    unverifiableSpecs.push({ item: specName, impact });
  };

  // --- 1. CPU / Chipset Tier ---
  const cpuVal = product.specs.processor?.value;
  if (!cpuVal) {
    pushUnknownSpec('processor', 'Processor / SoC', undefined, 'Cannot evaluate raw compute potential without verified chipset model');
  } else {
    const tier = getCpuTier(cpuVal, category);
    let rating: SpecRating = 'Average';
    let score = 70;
    let note = '';

    if (category === 'laptop') {
      if (bandId === 'entry') {
        if (tier === 'mid' || tier === 'upper-mid' || tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Significantly exceeds entry laptop baseline (mid/high tier CPU)'; }
        else if (tier === 'entry') { rating = 'Good'; score = 80; note = 'Meets expected entry laptop computing standard'; }
        else { rating = 'Average'; score = 65; note = 'Basic compute capability for price band'; }
      } else if (bandId === 'mid') {
        if (tier === 'upper-mid' || tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'High-end processing tier unusual in mainstream ₹45k-₹75k price band'; }
        else if (tier === 'mid') { rating = 'Good'; score = 85; note = 'Standard solid mid-range performance tier'; }
        else { rating = 'Weak'; score = 40; note = 'Underpowered CPU tier for a mid-range laptop'; }
      } else if (bandId === 'upper_mid') {
        if (tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Flagship-grade compute tier'; }
        else if (tier === 'upper-mid') { rating = 'Good'; score = 85; note = 'Expected premium CPU silicon'; }
        else if (tier === 'mid') { rating = 'Average'; score = 65; note = 'Acceptable, but modest for ₹75k-₹1.2L price point'; }
        else { rating = 'Weak'; score = 35; note = 'Entry silicon unsuitable for premium price band'; }
      } else if (bandId === 'flagship') {
        if (tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Top-tier flagship silicon with maximum core density'; }
        else if (tier === 'upper-mid') { rating = 'Good'; score = 80; note = 'Solid premium performance, though below top-tier enthusiast chips'; }
        else { rating = 'Weak'; score = 30; note = 'Under-spec CPU for flagship tier'; }
      } else {
        // Absolute rating when price band is unverified
        if (tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Top-tier flagship processor with high core count and maximum throughput'; }
        else if (tier === 'upper-mid') { rating = 'Good'; score = 85; note = 'High-performance processor delivering strong sustained output'; }
        else if (tier === 'mid') { rating = 'Good'; score = 78; note = 'Solid mainstream processor delivering reliable day-to-day speed'; }
        else { rating = 'Average'; score = 65; note = 'Entry-level processor suited for lightweight productivity'; }
      }
    } else {
      // Smartphone
      if (bandId === 'entry') {
        if (tier === 'mid' || tier === 'upper-mid' || tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Rare high-performance chipset for budget phone'; }
        else if (tier === 'entry') { rating = 'Good'; score = 80; note = 'Standard budget everyday SoC'; }
        else { rating = 'Average'; score = 60; note = 'Modest everyday processor'; }
      } else if (bandId === 'mid') {
        if (tier === 'upper-mid' || tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Flagship-level architecture at mid-range pricing'; }
        else if (tier === 'mid') { rating = 'Good'; score = 82; note = 'Expected mid-range benchmark performance'; }
        else { rating = 'Weak'; score = 40; note = 'Weak chipset choice for ₹15k-₹35k phone'; }
      } else if (bandId === 'upper_mid') {
        if (tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Flagship SoC in sub-flagship value bracket'; }
        else if (tier === 'upper-mid') { rating = 'Good'; score = 85; note = 'Upper-tier chipset with strong sustained performance'; }
        else { rating = 'Weak'; score = 45; note = 'Below-par chipset for upper-mid category'; }
      } else if (bandId === 'flagship') {
        if (tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Best-in-class flagship processing architecture'; }
        else { rating = 'Average'; score = 60; note = 'Non-flagship chipset in premium price bracket'; }
      } else {
        // Absolute rating when price band is unverified
        if (tier === 'flagship') { rating = 'Excellent'; score = 95; note = 'Best-in-class flagship SoC architecture'; }
        else if (tier === 'upper-mid') { rating = 'Good'; score = 85; note = 'Upper-tier mobile processor with strong gaming and AI capabilities'; }
        else if (tier === 'mid') { rating = 'Good'; score = 78; note = 'Capable mid-tier processor for smooth multitasking'; }
        else { rating = 'Average'; score = 60; note = 'Everyday mobile processor'; }
      }
    }

    const rel = computeRelevance('processor', category, preferences);
    ratedSpecs.push({
      specKey: 'processor',
      specName: 'Processor / SoC Tier',
      rawText: cpuVal,
      value: cpuVal,
      evidenceType: product.specs.processor?.evidenceType || 'verified',
      source: product.specs.processor?.source,
      sourceUrl: product.specs.processor?.sourceUrl,
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 2. RAM Capacity ---
  const ramVal = product.specs.ram?.value;
  const ramGb = parseRamGb(ramVal);
  if (ramGb === null) {
    pushUnknownSpec('ram', 'RAM Capacity', ramVal || undefined, 'Memory capacity unconfirmed; affects multitasking certainty');
  } else {
    const rule = bandId
      ? (category === 'laptop' ? LAPTOP_REFERENCE_RANGES.ram : SMARTPHONE_REFERENCE_RANGES.ram).bands[bandId]?.numeric
      : (category === 'laptop' ? ABSOLUTE_LAPTOP_THRESHOLDS.ram : ABSOLUTE_SMARTPHONE_THRESHOLDS.ram);
    const { rating, score } = rateNumericSpec(ramGb, rule);
    const typicalDesc = bandId
      ? (category === 'laptop' ? LAPTOP_REFERENCE_RANGES.ram : SMARTPHONE_REFERENCE_RANGES.ram).bands[bandId]?.typicalDescription
      : 'standard memory baseline';
    const note = rating === 'Excellent'
      ? `${ramGb}GB exceeds typical standard (${typicalDesc})`
      : rating === 'Good'
      ? `${ramGb}GB provides solid multitasking capacity`
      : rating === 'Average'
      ? `${ramGb}GB is acceptable baseline but offers modest headroom`
      : `${ramGb}GB is below expected standard (${typicalDesc})`;

    const rel = computeRelevance('ram', category, preferences);
    ratedSpecs.push({
      specKey: 'ram',
      specName: 'RAM Capacity',
      rawText: ramVal || `${ramGb}GB`,
      value: ramGb,
      evidenceType: product.specs.ram?.evidenceType || 'verified',
      source: product.specs.ram?.source,
      sourceUrl: product.specs.ram?.sourceUrl,
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 3. Storage Type & Size ---
  const storageVal = product.specs.storage?.value;
  if (!storageVal) {
    pushUnknownSpec('storage', 'Storage Configuration', undefined, 'Storage volume and type unconfirmed');
  } else {
    const isSsd = isSsdStorage(storageVal);
    const numMatch = storageVal.match(/(\d+)\s*(?:GB|TB|gb|tb)/i);
    let sizeGb = numMatch ? parseInt(numMatch[1], 10) : null;
    if (sizeGb && /TB/i.test(numMatch?.[0] || '')) sizeGb *= 1024;

    const rule = bandId
      ? (category === 'laptop' ? LAPTOP_REFERENCE_RANGES.storage : SMARTPHONE_REFERENCE_RANGES.storage).bands[bandId]?.numeric
      : (category === 'laptop' ? ABSOLUTE_LAPTOP_THRESHOLDS.storage : ABSOLUTE_SMARTPHONE_THRESHOLDS.storage);
    let { rating, score } = rateNumericSpec(sizeGb, rule);

    // Penalize slow HDD or eMMC in non-entry tiers
    if (isSsd === false && bandId && bandId !== 'entry') {
      rating = 'Weak';
      score = 30;
    }

    const typicalDesc = bandId
      ? (category === 'laptop' ? LAPTOP_REFERENCE_RANGES.storage : SMARTPHONE_REFERENCE_RANGES.storage).bands[bandId]?.typicalDescription
      : 'standard storage baseline';
    const note = rating === 'Excellent'
      ? `${storageVal} provides generous high-speed storage`
      : rating === 'Good'
      ? `${storageVal} meets standard capacity requirements`
      : rating === 'Average'
      ? `${storageVal} offers basic storage headroom`
      : `${storageVal} is constrained compared to peer average`;

    const rel = computeRelevance('storage', category, preferences);
    ratedSpecs.push({
      specKey: 'storage',
      specName: 'Storage Configuration',
      rawText: storageVal,
      value: storageVal,
      evidenceType: product.specs.storage?.evidenceType || 'verified',
      source: product.specs.storage?.source,
      sourceUrl: product.specs.storage?.sourceUrl,
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 4. Display Quality & Refresh Rate ---
  const displayVal = product.specs.display?.value;
  if (!displayVal) {
    pushUnknownSpec('display', 'Display Specifications', undefined, 'Display resolution and refresh rate unconfirmed');
  } else {
    const { is1080pOrBetter, refreshRateHz, hasGoodColorGamut } = parseDisplaySpecs(displayVal);
    const isOled = /oled|amoled/i.test(displayVal);

    let rating: SpecRating = 'Average';
    let score = 70;
    let note = '';

    if (category === 'laptop') {
      if (isOled && (refreshRateHz || 60) >= 120) {
        rating = 'Excellent'; score = 95; note = 'Premium 120Hz OLED panel delivers outstanding contrast and smooth visuals';
      } else if (isOled) {
        rating = 'Excellent'; score = 90; note = 'OLED technology provides true blacks and vibrant color accuracy';
      } else if (is1080pOrBetter && (refreshRateHz || 60) >= 120) {
        rating = 'Good'; score = 85; note = 'High refresh rate IPS panel suitable for fluid UI and gaming';
      } else if (is1080pOrBetter) {
        rating = bandId === 'flagship' ? 'Average' : 'Good';
        score = bandId === 'flagship' ? 65 : 80;
        note = 'Standard FHD IPS panel with clean viewability';
      } else {
        rating = 'Weak'; score = 40; note = 'Sub-1080p resolution or low-quality panel';
      }
    } else {
      // Smartphone
      if (isOled && (refreshRateHz || 60) >= 120) {
        rating = 'Excellent'; score = 95; note = '120Hz AMOLED delivers superb peak brightness and fluid navigation';
      } else if (isOled || (refreshRateHz || 60) >= 120) {
        rating = 'Good'; score = 85; note = 'Modern high-refresh or AMOLED screen well-suited for media';
      } else if (bandId === 'entry') {
        rating = 'Good'; score = 78; note = 'Adequate standard display for budget tier';
      } else {
        rating = 'Average'; score = 60; note = 'Standard 60Hz LCD display';
      }
    }

    const rel = computeRelevance('display', category, preferences);
    ratedSpecs.push({
      specKey: 'display',
      specName: 'Display Specifications',
      rawText: displayVal,
      value: displayVal,
      evidenceType: product.specs.display?.evidenceType || 'verified',
      source: product.specs.display?.source,
      sourceUrl: product.specs.display?.sourceUrl,
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 5. Battery Capacity & Life ---
  const batteryCap = product.specs.batteryCapacity?.value;
  const batteryHours = product.specs.batteryLifeHours?.value;
  const batteryMahVal = parseBatteryMah(batteryCap);

  if (!batteryCap && batteryHours === undefined && !batteryMahVal) {
    pushUnknownSpec('battery', 'Battery Capacity & Life', undefined, 'Battery capacity and claimed runtime unconfirmed');
  } else {
    let rating: SpecRating = 'Average';
    let score = 70;
    let note = '';

    if (category === 'laptop') {
      const rule = bandId ? LAPTOP_REFERENCE_RANGES.batteryHours.bands[bandId]?.numeric : ABSOLUTE_LAPTOP_THRESHOLDS.batteryHours;
      if (batteryHours !== null && batteryHours !== undefined) {
        const res = rateNumericSpec(batteryHours, rule);
        rating = res.rating;
        score = res.score || 70;
        note = rating === 'Excellent'
          ? `${batteryHours}h claimed endurance supports full all-day mobile work without charger`
          : rating === 'Good'
          ? `${batteryHours}h claimed endurance satisfies standard workday requirements`
          : `${batteryHours}h claimed battery is modest for modern portable laptops`;
      } else if (batteryCap) {
        const whMatch = batteryCap.match(/(\d+)\s*wh/i);
        const wh = whMatch ? parseInt(whMatch[1], 10) : 50;
        if (wh >= 70) { rating = 'Excellent'; score = 92; note = `Large ${wh}Wh battery capacity provides ample endurance`; }
        else if (wh >= 50) { rating = 'Good'; score = 80; note = `Standard ${wh}Wh battery pack for portable laptop`; }
        else { rating = 'Average'; score = 60; note = `${wh}Wh battery is relatively modest`; }
      }
    } else {
      // Smartphone
      const mah = batteryMahVal || 5000;
      const rule = bandId ? SMARTPHONE_REFERENCE_RANGES.batteryMah.bands[bandId]?.numeric : ABSOLUTE_SMARTPHONE_THRESHOLDS.batteryMah;
      const res = rateNumericSpec(mah, rule);
      rating = res.rating;
      score = res.score || 75;
      note = rating === 'Excellent'
        ? `${mah}mAh high-capacity pack delivers confident multi-day endurance`
        : rating === 'Good'
        ? `${mah}mAh standard capacity easily powers heavy single-day usage`
        : `${mah}mAh is smaller than current market peer averages`;
    }

    const rel = computeRelevance('battery', category, preferences);
    ratedSpecs.push({
      specKey: 'battery',
      specName: 'Battery Capacity & Life',
      rawText: batteryCap || (batteryHours ? `${batteryHours} Hours Claimed` : 'Documented'),
      value: batteryHours || batteryCap,
      evidenceType: product.specs.batteryLifeHours?.evidenceType || product.specs.batteryCapacity?.evidenceType || 'verified',
      source: product.specs.batteryLifeHours?.source || product.specs.batteryCapacity?.source,
      sourceUrl: product.specs.batteryLifeHours?.sourceUrl || product.specs.batteryCapacity?.sourceUrl,
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 6. Charging Speed ---
  const chargingWatts = parseChargingWatts(product);
  if (chargingWatts === null) {
    if (category === 'smartphone') {
      pushUnknownSpec('charging', 'Charging Speed', undefined, 'Charging wattage not verified');
    }
  } else {
    const rule = category === 'smartphone'
      ? (bandId ? SMARTPHONE_REFERENCE_RANGES.chargingWatts.bands[bandId]?.numeric : ABSOLUTE_SMARTPHONE_THRESHOLDS.chargingWatts)
      : undefined;
    let rating: SpecRating = 'Average';
    let score = 70;
    let note = '';

    if (category === 'smartphone' && rule) {
      const res = rateNumericSpec(chargingWatts, rule);
      rating = res.rating;
      score = res.score || 70;
      note = rating === 'Excellent'
        ? `${chargingWatts}W rapid charging drastically cuts tethered socket time`
        : rating === 'Good'
        ? `${chargingWatts}W fast charging matches current mid/high segment benchmarks`
        : `${chargingWatts}W charging speed is comparatively sluggish`;
    } else {
      if (chargingWatts >= 100) { rating = 'Excellent'; score = 95; note = `${chargingWatts}W high-capacity USB-C PD fast charging`; }
      else if (chargingWatts >= 65) { rating = 'Good'; score = 85; note = `${chargingWatts}W standard fast charging`; }
      else { rating = 'Average'; score = 65; note = `${chargingWatts}W standard charger`; }
    }

    const rel = computeRelevance('charging', category, preferences);
    ratedSpecs.push({
      specKey: 'charging',
      specName: 'Charging Speed',
      rawText: `${chargingWatts}W`,
      value: chargingWatts,
      evidenceType: product.specs.chargingSpeedWatts?.evidenceType || 'verified',
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 7. Weight & Portability ---
  const weightKg = product.specs.weightKg?.value;
  if (weightKg === null || weightKg === undefined) {
    if (category === 'laptop') {
      pushUnknownSpec('weight', 'Chassis Weight & Portability', undefined, 'Chassis weight unconfirmed');
    }
  } else {
    const rule = bandId ? LAPTOP_REFERENCE_RANGES.weight.bands[bandId]?.numeric : ABSOLUTE_LAPTOP_THRESHOLDS.weight;
    const { rating, score } = rateNumericSpec(weightKg, rule, true); // Lower weight is better
    const note = rating === 'Excellent'
      ? `${weightKg}kg featherweight chassis is exceptionally easy to carry daily`
      : rating === 'Good'
      ? `${weightKg}kg maintains comfortable commuter portability`
      : rating === 'Average'
      ? `${weightKg}kg is standard weight for a desktop replacement or budget build`
      : `${weightKg}kg is bulky compared to modern thin-and-light peers`;

    const rel = computeRelevance('weight', category, preferences);
    ratedSpecs.push({
      specKey: 'weight',
      specName: 'Chassis Weight & Portability',
      rawText: `${weightKg} kg`,
      value: weightKg,
      evidenceType: product.specs.weightKg?.evidenceType || 'verified',
      source: product.specs.weightKg?.source,
      sourceUrl: product.specs.weightKg?.sourceUrl,
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 8. Dedicated GPU (Laptops) ---
  if (category === 'laptop') {
    const hasGpu = hasDedicatedGpu(product);
    if (hasGpu === null) {
      pushUnknownSpec('gpu', 'Graphics Processor (GPU)', undefined, 'Graphics architecture unverified');
    } else {
      const isGamerOrCreator = (preferences?.intendedUse || []).some((u) => /gam(e|ing)|video|3d|render|edit/i.test(u));
      const rating: SpecRating = hasGpu ? 'Excellent' : isGamerOrCreator ? 'Weak' : 'Good';
      const score = hasGpu ? 95 : isGamerOrCreator ? 35 : 78;
      const note = hasGpu
        ? 'Dedicated graphics silicon provides hardware acceleration for 3D and rendering workloads'
        : isGamerOrCreator
        ? 'Lacks dedicated GPU; will struggle with high-framerate modern gaming and heavy timeline renders'
        : 'Integrated graphics efficiently manages dual-monitor output and 4K video playback with low heat';

      const rel = computeRelevance('gpu', category, preferences);
      ratedSpecs.push({
        specKey: 'gpu',
        specName: 'Graphics Processing (GPU)',
        rawText: hasGpu ? 'Dedicated Discrete GPU' : 'Integrated Power-Efficient Graphics',
        value: hasGpu,
        evidenceType: 'verified',
        rating,
        comparisonNote: note,
        relevance: rel.relevance,
        relevanceReason: rel.reason,
        scoreOutOf100: score,
        priceBand: bandLabel,
      });
    }
  }

  // --- 9. Camera Hardware (Smartphones) ---
  if (category === 'smartphone') {
    const camStr = product.specs.camera?.value;
    if (!camStr) {
      pushUnknownSpec('camera', 'Camera Hardware & Optics', undefined, 'Camera sensor and OIS details unconfirmed');
    } else {
      const { hasOis, hasTelephoto, mainMegapixels } = parseCameraFeatures(camStr);
      let rating: SpecRating = 'Average';
      let score = 70;
      let note = '';

      if (hasOis && hasTelephoto) {
        rating = 'Excellent'; score = 95; note = 'Flagship camera array with optical image stabilization and dedicated zoom optics';
      } else if (hasOis) {
        rating = (bandId === 'flagship') ? 'Good' : 'Excellent';
        score = (bandId === 'flagship') ? 85 : 92;
        note = 'Optical Image Stabilization (OIS) secures sharp low-light stills and steady video';
      } else if (bandId === 'entry' || (mainMegapixels && mainMegapixels >= 50)) {
        rating = 'Good'; score = 78; note = 'High-resolution main camera sensor for everyday photography';
      } else {
        rating = 'Weak'; score = 45; note = 'Lacks OIS hardware; prone to motion blur in low-light conditions';
      }

      const rel = computeRelevance('camera', category, preferences);
      ratedSpecs.push({
        specKey: 'camera',
        specName: 'Camera Hardware & Optics',
        rawText: camStr,
        value: camStr,
        evidenceType: product.specs.camera?.evidenceType || 'verified',
        source: product.specs.camera?.source,
        sourceUrl: product.specs.camera?.sourceUrl,
        rating,
        comparisonNote: note,
        relevance: rel.relevance,
        relevanceReason: rel.reason,
        scoreOutOf100: score,
        priceBand: bandLabel,
      });
    }
  }

  // --- 10. Build & Durability ---
  const durability = parseDurability(product);
  const durabilityText = durability.ipRatingCode
    ? `${durability.ipRatingCode} Ingress Protection`
    : durability.hasToughGlass
    ? 'Reinforced Glass Protection'
    : null;

  if (!durabilityText && !durability.repairabilityScore) {
    pushUnknownSpec('durability', 'Build Quality & Ingress Protection', undefined, 'IP rating and chassis material unconfirmed');
  } else {
    let rating: SpecRating = 'Good';
    let score = 80;
    let note = '';

    if (durability.ipRatingCode === 'IP68') {
      rating = 'Excellent'; score = 96; note = 'Full IP68 submersible dust/water resistance protection';
    } else if (durability.hasIpRating) {
      rating = 'Good'; score = 82; note = `${durability.ipRatingCode || 'Splash'} water resistance rated for Indian monsoon weather`;
    } else if (durability.hasToughGlass) {
      rating = 'Good'; score = 78; note = 'Toughened front glass reduces scratching risk from daily handling';
    } else {
      rating = 'Average'; score = 65; note = 'Standard chassis build with no formal water/dust ingress rating';
    }

    const rel = computeRelevance('durability', category, preferences);
    ratedSpecs.push({
      specKey: 'durability',
      specName: 'Build & Physical Durability',
      rawText: durabilityText || 'Standard Tested Materials',
      value: durabilityText,
      evidenceType: 'verified',
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 11. Software Support Lifespan ---
  const updatePolicyYears = product.warranty.softwareUpdatePolicyYears?.value;
  if (updatePolicyYears === null || updatePolicyYears === undefined) {
    pushUnknownSpec('softwareSupport', 'Software Support Horizon', undefined, 'Manufacturer official OS upgrade commitment unconfirmed');
  } else {
    let rating: SpecRating = 'Average';
    let score = 70;
    let note = '';

    if (updatePolicyYears >= 5) {
      rating = 'Excellent'; score = 96; note = `${updatePolicyYears}-year extended update commitment leads the industry for longevity`;
    } else if (updatePolicyYears >= 3) {
      rating = 'Good'; score = 85; note = `${updatePolicyYears} major OS upgrades provide reassuring multi-year support`;
    } else if (updatePolicyYears >= 2) {
      rating = (bandId === 'entry' || !bandId) ? 'Good' : 'Average';
      score = (bandId === 'entry' || !bandId) ? 80 : 65;
      note = `${updatePolicyYears} major updates matches baseline Indian market commitments`;
    } else {
      rating = 'Weak'; score = 40; note = `${updatePolicyYears} year update window is truncated for prolonged ownership`;
    }

    const rel = computeRelevance('softwareSupport', category, preferences);
    ratedSpecs.push({
      specKey: 'softwareSupport',
      specName: 'Software Support Horizon',
      rawText: `${updatePolicyYears} Years Guaranteed OS Upgrades`,
      value: updatePolicyYears,
      evidenceType: product.warranty.softwareUpdatePolicyYears?.evidenceType || 'verified',
      source: product.warranty.softwareUpdatePolicyYears?.source,
      sourceUrl: product.warranty.softwareUpdatePolicyYears?.sourceUrl,
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // --- 12. Ports & Connectivity ---
  const portsVal = product.specs.ports?.value;
  if (!portsVal) {
    pushUnknownSpec('ports', 'Ports & Connectivity', undefined, 'Port selection and interface generations unconfirmed');
  } else {
    const hasTypeC = /type-c|usb-c|thunderbolt|usb4/i.test(portsVal);
    const hasThunderbolt = /thunderbolt|usb4/i.test(portsVal);
    const hasHdmi = /hdmi/i.test(portsVal);

    let rating: SpecRating = 'Good';
    let score = 80;
    let note = '';

    if (hasThunderbolt) {
      rating = 'Excellent'; score = 95; note = 'Thunderbolt / USB4 high-speed interface supports dual 4K displays and external eGPUs';
    } else if (hasTypeC && hasHdmi) {
      rating = 'Good'; score = 85; note = 'Comprehensive I/O selection connects modern peripherals and external monitors without adapters';
    } else if (hasTypeC) {
      rating = 'Good'; score = 78; note = 'Standard reversible USB-C interface present';
    } else {
      rating = 'Average'; score = 65; note = 'Basic peripheral connectivity provided';
    }

    const rel = computeRelevance('ports', category, preferences);
    ratedSpecs.push({
      specKey: 'ports',
      specName: 'I/O Ports & Connectivity',
      rawText: portsVal,
      value: portsVal,
      evidenceType: product.specs.ports?.evidenceType || 'verified',
      source: product.specs.ports?.source,
      sourceUrl: product.specs.ports?.sourceUrl,
      rating,
      comparisonNote: note,
      relevance: rel.relevance,
      relevanceReason: rel.reason,
      scoreOutOf100: score,
      priceBand: bandLabel,
    });
  }

  // Mark highlights on rated specs: rows that matter most to THIS user (High relevance)
  ratedSpecs.forEach((s) => {
    s.isHighlight = s.relevance === 'High';
  });

  // --- COMPUTE RANKED STRENGTHS & WEAKNESSES ---
  // Strengths: Excellent or Good rating, ordered by (score * weightFactor) descending
  const strengthsCandidates = ratedSpecs.filter((s) => s.rating === 'Excellent' || s.rating === 'Good');
  strengthsCandidates.sort((a, b) => {
    const weightA = a.relevance === 'High' ? 1.5 : a.relevance === 'Medium' ? 1.0 : 0.7;
    const weightB = b.relevance === 'High' ? 1.5 : b.relevance === 'Medium' ? 1.0 : 0.7;
    return ((b.scoreOutOf100 || 0) * weightB) - ((a.scoreOutOf100 || 0) * weightA);
  });

  const strengths: StrengthWeaknessItem[] = strengthsCandidates.slice(0, 4).map((s) => ({
    id: `strength-${s.specKey}`,
    specKey: s.specKey,
    specFact: `${s.specName}: ${s.rawText}`,
    whyItMatters: s.relevanceReason,
    rating: s.rating,
    relevance: s.relevance,
    evidenceType: s.evidenceType,
    source: s.source,
    sourceUrl: s.sourceUrl,
  }));

  // Weaknesses: Weak or Average rating, ordered by ((100 - score) * weightFactor) descending
  const weaknessesCandidates = ratedSpecs.filter((s) => s.rating === 'Weak' || s.rating === 'Average');
  weaknessesCandidates.sort((a, b) => {
    const weightA = a.relevance === 'High' ? 1.5 : a.relevance === 'Medium' ? 1.0 : 0.7;
    const weightB = b.relevance === 'High' ? 1.5 : b.relevance === 'Medium' ? 1.0 : 0.7;
    const deficitA = (100 - (a.scoreOutOf100 || 70)) * weightA;
    const deficitB = (100 - (b.scoreOutOf100 || 70)) * weightB;
    return deficitB - deficitA;
  });

  const weaknesses: StrengthWeaknessItem[] = weaknessesCandidates.slice(0, 4).map((s) => ({
    id: `weakness-${s.specKey}`,
    specKey: s.specKey,
    specFact: `${s.specName}: ${s.rawText}`,
    whyItMatters: s.relevanceReason,
    rating: s.rating,
    relevance: s.relevance,
    evidenceType: s.evidenceType,
    source: s.source,
    sourceUrl: s.sourceUrl,
  }));

  // --- STANDOUT FEATURES (beats typical level for price) ---
  const standouts: StandoutFeature[] = ratedSpecs
    .filter((s) => s.rating === 'Excellent' && (s.scoreOutOf100 || 0) >= 90)
    .slice(0, 3)
    .map((s) => ({
      specName: s.specName,
      value: s.rawText,
      whyStandout: s.comparisonNote,
      evidenceType: s.evidenceType,
      source: s.source,
      sourceUrl: s.sourceUrl,
    }));

  // --- TRADEOFFS (strong in one area, weak in another) ---
  const tradeoffs: TradeoffItem[] = [];
  const topStrength = strengths[0];
  const topWeakness = weaknesses[0];

  if (topStrength && topWeakness) {
    tradeoffs.push({
      strongSpec: topStrength.specFact,
      weakSpec: topWeakness.specFact,
      explanation: `Offers superior ${topStrength.specFact.split(':')[0].toLowerCase()}, but compromises on ${topWeakness.specFact.split(':')[0].toLowerCase()} to maintain target price.`,
    });
  }

  // Check specific hardware tradeoffs
  const hasStrongCpu = ratedSpecs.some((s) => s.specKey === 'processor' && s.rating === 'Excellent');
  const hasWeakBattery = ratedSpecs.some((s) => s.specKey === 'battery' && (s.rating === 'Average' || s.rating === 'Weak'));
  if (hasStrongCpu && hasWeakBattery) {
    tradeoffs.push({
      strongSpec: 'High-performance CPU silicon',
      weakSpec: 'Modest battery endurance',
      explanation: 'High clock speeds and peak core power draw trade off unplugged battery life for raw burst speed.',
    });
  }

  const hasOled = ratedSpecs.some((s) => s.specKey === 'display' && /oled|amoled/i.test(s.rawText));
  const hasPlasticBuild = ratedSpecs.some((s) => s.specKey === 'durability' && s.rating === 'Average');
  if (hasOled && hasPlasticBuild) {
    tradeoffs.push({
      strongSpec: 'Vibrant OLED / AMOLED display',
      weakSpec: 'Plastic chassis materials',
      explanation: 'Bill-of-materials prioritized display visual fidelity over premium unibody metal chassis materials.',
    });
  }

  // --- SUITEDNESS TAGS (across all use cases, not just user's) ---
  const suitedness = computeSuitednessTags(product, ratedSpecs);

  return {
    ratedSpecs,
    strengths,
    weaknesses,
    standouts,
    tradeoffs: tradeoffs.slice(0, 3),
    suitedness,
    unverifiableSpecs,
    priceBand: bandLabel,
  };
}

/**
 * Computes "Best suited for" and "Not ideal for" tags across ALL potential use cases
 */
function computeSuitednessTags(product: Product, specs: RatedSpec[]): SuitednessTags {
  const category = product.category;
  const bestSuitedFor: string[] = [];
  const notIdealFor: string[] = [];

  const getRating = (key: string) => specs.find((s) => s.specKey === key)?.rating || 'Unknown';
  const cpuRating = getRating('processor');
  const ramRating = getRating('ram');
  const gpuRating = getRating('gpu');
  const displayRating = getRating('display');
  const batteryRating = getRating('battery');
  const weightRating = getRating('weight');
  const cameraRating = getRating('camera');
  const durabilityRating = getRating('durability');

  if (category === 'laptop') {
    // Coding / Software Development
    if ((cpuRating === 'Excellent' || cpuRating === 'Good') && (ramRating === 'Excellent' || ramRating === 'Good')) {
      bestSuitedFor.push('Programming & Developer Workloads');
    } else if (ramRating === 'Weak') {
      notIdealFor.push('Heavy Docker / Virtual Machine Coding');
    }

    // Gaming
    if (gpuRating === 'Excellent') {
      bestSuitedFor.push('AAA 3D Gaming & High-FPS Esports');
    } else {
      notIdealFor.push('Heavy 3D Gaming (Requires Dedicated GPU)');
    }

    // Video Editing & Design
    if ((cpuRating === 'Excellent' || cpuRating === 'Good') && (displayRating === 'Excellent' || displayRating === 'Good')) {
      bestSuitedFor.push('Photo & Light Video Creation');
    }

    // Commuting & Travel
    if ((batteryRating === 'Excellent' || batteryRating === 'Good') && (weightRating === 'Excellent' || weightRating === 'Good')) {
      bestSuitedFor.push('On-the-go Commuting & Travel');
    } else if (weightRating === 'Weak' || weightRating === 'Average') {
      notIdealFor.push('Frequent Travel (Bulkier Desk Laptop)');
    }

    // Everyday Office & Study
    if (bestSuitedFor.length < 2) {
      bestSuitedFor.push('Everyday Productivity & Academic Research');
    }
  } else {
    // Smartphone
    // Photography
    if (cameraRating === 'Excellent') {
      bestSuitedFor.push('Mobile Photography & Cinematic Video');
    } else if (cameraRating === 'Weak') {
      notIdealFor.push('Low-Light Photography Enthusiasts');
    }

    // Gaming & Heavy Multitasking
    if (cpuRating === 'Excellent' && displayRating === 'Excellent') {
      bestSuitedFor.push('Sustained Mobile Gaming (BGMI / Genshin)');
    } else if (cpuRating === 'Weak') {
      notIdealFor.push('High-FPS Competitive Gaming');
    }

    // Battery Road Warrior
    if (batteryRating === 'Excellent') {
      bestSuitedFor.push('All-Day Battery Road Warriors');
    }

    // Media & Streaming
    if (displayRating === 'Excellent') {
      bestSuitedFor.push('HDR Video Streaming & Outdoor Viewing');
    }

    if (bestSuitedFor.length === 0) {
      bestSuitedFor.push('Reliable Daily Calling & Social Multitasking');
    }
  }

  return {
    bestSuitedFor: bestSuitedFor.slice(0, 3),
    notIdealFor: notIdealFor.slice(0, 2),
  };
}
