/**
 * WorthIt AI - Needs-Based Verdict Engine (Pure TypeScript, deterministic)
 * Computes transparent, multi-layered verdict:
 * 1. Hardware Fit (pure specs against user workload)
 * 2. Budget Ceiling Check
 * 3. Market Value (relative to Indian alternatives)
 * 4. Ownership & Review Signal Adjustments (never blocks verdict)
 */

import {
  Product,
  UserPreferences,
  FitEvaluation,
  VerdictResult,
  VerdictOutcome,
  VerdictConfidence,
  AlternativeProduct,
} from '../types';

export function evaluateVerdict(
  product: Product,
  preferences?: UserPreferences,
  fit?: FitEvaluation,
  alternatives: AlternativeProduct[] = [],
  userPrice?: number
): VerdictResult {
  // If fit not precomputed, compute a simple baseline
  const activeFit = fit || {
    overallFitStatus: 'fits',
    fitPercentage: 75,
    requirements: [],
    meetsCount: 0,
    borderlineCount: 0,
    failsCount: 0,
    unknownCount: 0,
    missingCoreSpecs: [],
  };

  const actualPrice = userPrice || product.priceInInr?.value || 0;
  const maxBudget = preferences?.maxBudgetInInr;

  // 1. Budget Analysis
  let withinBudget = true;
  let deltaInr = 0;
  let deltaPercentage = 0;

  if (maxBudget && maxBudget > 0 && actualPrice > 0) {
    deltaInr = actualPrice - maxBudget;
    deltaPercentage = Math.round((Math.abs(deltaInr) / maxBudget) * 100);
    withinBudget = actualPrice <= maxBudget;
  }

  // 2. Active Dimensions & Confidence Calculation
  let activeDimCount = 0;
  const totalDimCount = 5;

  // Dim 1: Specs & Fit
  const hasSpecs = activeFit.missingCoreSpecs.length <= 1;
  if (hasSpecs) activeDimCount++;

  // Dim 2: Price
  const hasPrice = actualPrice > 0 && product.priceInInr?.evidenceType !== 'unknown';
  if (hasPrice) activeDimCount++;

  // Dim 3: Reviews
  const hasReviews = !!(product.reviewData && product.reviewData.reviewCount > 0);
  if (hasReviews) activeDimCount++;

  // Dim 4: Repairability
  const hasRepair = product.repairability.scoreOutOfTen?.value !== null && product.repairability.scoreOutOfTen?.value !== undefined;
  if (hasRepair) activeDimCount++;

  // Dim 5: Warranty & Software Updates
  const hasWarranty = product.warranty.standardWarrantyMonths?.value !== null || product.warranty.softwareUpdatePolicyYears?.value !== null;
  if (hasWarranty) activeDimCount++;

  let confidence: VerdictConfidence = 'Low';
  let confidenceLabel = 'Based on preliminary data';

  if (activeDimCount >= 4) {
    confidence = 'High';
    confidenceLabel = `High confidence (${activeDimCount} of 5 dimensions verified: specs, price, reviews, repair/warranty)`;
  } else if (hasSpecs && hasPrice) {
    confidence = 'Medium';
    confidenceLabel = `Medium confidence (Based on specs and price only; ${activeDimCount} of 5 dimensions available)`;
  } else if (hasSpecs) {
    confidence = 'Low';
    confidenceLabel = 'Low confidence (Based on specs only; retail pricing or owner consensus unverified)';
  } else {
    confidence = 'Low';
    confidenceLabel = 'Low confidence (Core hardware specifications incomplete)';
  }

  // 3. Outcome Determination
  let outcome: VerdictOutcome = 'worth_it';
  let title = 'Worth it for you';

  if (activeFit.overallFitStatus === 'insufficient_specs') {
    outcome = 'cant_tell_yet';
    title = "Can't tell yet";
  } else if (activeFit.overallFitStatus === 'fails') {
    outcome = 'not_worth_it';
    title = 'Not worth it for you';
  } else if (maxBudget && actualPrice > maxBudget * 1.15) {
    // Over budget by more than 15%
    outcome = 'not_worth_it';
    title = 'Not worth it for you';
  } else if (
    (maxBudget && !withinBudget) ||
    activeFit.overallFitStatus === 'borderline' ||
    (product.reviewData?.reportedIssues && product.reviewData.reportedIssues.some((i) => i.frequency === 'High'))
  ) {
    outcome = 'worth_it_with_caveats';
    title = 'Worth it with caveats';
  } else {
    outcome = 'worth_it';
    title = 'Worth it for you';
  }

  // 4. Decisive Reasons (3 to 5 ranked decisive reasons)
  const decisiveReasons: string[] = [];

  // Reason: Failures first
  const failedReqs = activeFit.requirements.filter((r) => r.status === 'fails');
  for (const r of failedReqs) {
    if (decisiveReasons.length < 5) {
      decisiveReasons.push(`${r.label}: ${r.actualValue ? `Found ${r.actualValue}` : 'Unverified'}, below required threshold (${r.threshold}). ${r.reason}`);
    }
  }

  // Reason: Budget
  if (maxBudget && maxBudget > 0 && actualPrice > 0) {
    if (withinBudget) {
      decisiveReasons.push(
        `Within your ₹${maxBudget.toLocaleString('en-IN')} budget with ₹${Math.abs(deltaInr).toLocaleString('en-IN')} headroom (₹${actualPrice.toLocaleString('en-IN')}).`
      );
    } else {
      decisiveReasons.push(
        `₹${deltaInr.toLocaleString('en-IN')} over your ₹${maxBudget.toLocaleString('en-IN')} budget (${deltaPercentage}% stretch).`
      );
    }
  } else if (actualPrice > 0) {
    decisiveReasons.push(`Current indicative retail price is ₹${actualPrice.toLocaleString('en-IN')}.`);
  }

  // Reason: Key strengths or borderlines
  const borderlineReqs = activeFit.requirements.filter((r) => r.status === 'borderline');
  for (const r of borderlineReqs) {
    if (decisiveReasons.length < 4) {
      decisiveReasons.push(`${r.label}: Borderline (${r.actualValue || 'standard'}). ${r.reason}`);
    }
  }

  const topMeets = activeFit.requirements.filter((r) => r.status === 'meets' && r.weight >= 4);
  for (const r of topMeets) {
    if (decisiveReasons.length < 4) {
      decisiveReasons.push(`${r.label}: Strong fit (${r.actualValue}). ${r.reason}`);
    }
  }

  // Reason: Alternatives check
  if (alternatives.length > 0 && decisiveReasons.length < 5) {
    const topAlt = alternatives[0];
    if (topAlt.priceInr && actualPrice > topAlt.priceInr) {
      decisiveReasons.push(`Alternative '${topAlt.name}' is priced at ₹${topAlt.priceInr.toLocaleString('en-IN')} with comparable performance.`);
    } else {
      decisiveReasons.push(`Competes against '${topAlt.name}' (₹${topAlt.priceInr ? topAlt.priceInr.toLocaleString('en-IN') : 'similar'}).`);
    }
  }

  // Reason: Review issue notice
  const majorIssue = product.reviewData?.reportedIssues?.find((i) => i.frequency === 'High');
  if (majorIssue && decisiveReasons.length < 5) {
    decisiveReasons.push(`Owner feedback note: '${majorIssue.category}' reported frequently in Indian user forums.`);
  }

  // If still fewer than 3, add general category summary
  if (decisiveReasons.length < 3) {
    decisiveReasons.push(`Overall hardware specification scores ${activeFit.fitPercentage}% on workload alignment.`);
  }

  // 5. What would make it worth it
  const whatWouldMakeItWorthIt: string[] = [];

  if (maxBudget && !withinBudget && actualPrice > maxBudget) {
    whatWouldMakeItWorthIt.push(
      `A price reduction to ₹${maxBudget.toLocaleString('en-IN')} during Indian festive events (Flipkart BBD / Amazon GIF) or with bank card discounts.`
    );
  }

  const failedRam = activeFit.requirements.find((r) => r.id.includes('ram') && r.status === 'fails');
  if (failedRam) {
    whatWouldMakeItWorthIt.push(
      `Choosing the 16GB RAM tier instead of 8GB, or verifying whether an open SO-DIMM slot allows an aftermarket RAM upgrade.`
    );
  }

  const failedGpu = activeFit.requirements.find((r) => r.id.includes('gpu') && r.status === 'fails');
  if (failedGpu) {
    whatWouldMakeItWorthIt.push(
      `Selecting an alternative variant with dedicated NVIDIA RTX 3050/4050 graphics if AAA gaming remains an essential requirement.`
    );
  }

  const failedOis = activeFit.requirements.find((r) => r.id.includes('ois') && r.status === 'fails');
  if (failedOis) {
    whatWouldMakeItWorthIt.push(
      `Choosing a model with optical image stabilization (OIS) or using an external handheld gimbal for shake-free low-light photos.`
    );
  }

  if (whatWouldMakeItWorthIt.length === 0) {
    whatWouldMakeItWorthIt.push(
      `Verifying the retailer unit includes the official 1-year brand warranty in India before checkout.`
    );
    whatWouldMakeItWorthIt.push(
      `Confirming whether bundled accessories (e.g. 65W/90W fast charger) are included in the retail box.`
    );
  }

  // 6. What we couldn't check (unknown items)
  const whatWeCouldntCheck: { item: string; impactOnConfidence: string }[] = [];

  const unknownReqs = activeFit.requirements.filter((r) => r.status === 'unknown');
  for (const u of unknownReqs) {
    whatWeCouldntCheck.push({
      item: u.label,
      impactOnConfidence: `Specification unverified in official feeds; assumed standard baseline.`,
    });
  }

  if (!hasRepair) {
    whatWeCouldntCheck.push({
      item: 'Teardown repairability score & spare parts cost in India',
      impactOnConfidence: 'Unknown DIY repairability; official authorized service center replacement costs apply.',
    });
  }

  if (!hasReviews) {
    whatWeCouldntCheck.push({
      item: 'Long-term owner reliability consensus',
      impactOnConfidence: 'No verified customer review sample analyzed yet; early hardware failure rates unverified.',
    });
  }

  if (!hasWarranty) {
    whatWeCouldntCheck.push({
      item: 'Published OS & security update duration',
      impactOnConfidence: 'Manufacturer update roadmap unverified in India.',
    });
  }

  // 7. Alternatives comparison summary
  let alternativesComparison = '';
  if (alternatives.length > 0) {
    alternativesComparison = `Compared against ${alternatives.length} similar ${product.category} models in India.`;
  } else {
    alternativesComparison = `Alternative comparison available via live search.`;
  }

  // 8. Launch Price Info
  let launchPriceInfo = undefined;
  // Check if we have launch price in product specs or quotes
  const launchQuote = product.priceQuotes?.find((q) => q.notes?.toLowerCase().includes('launch') || q.seller.toLowerCase().includes('launch'));
  if (launchQuote && launchQuote.priceInr > 0 && actualPrice > 0) {
    launchPriceInfo = {
      launchPriceInr: launchQuote.priceInr,
      deltaFromLaunchInr: actualPrice - launchQuote.priceInr,
      launchDate: launchQuote.retrievedAt,
      source: launchQuote.seller,
      sourceUrl: launchQuote.sourceUrl,
    };
  }

  // 9. WorthIt Score Calculation (0-100 from fit + available dimensions, renormalized)
  let worthItScore: number | null = null;
  if (hasSpecs) {
    // Base fit score (40%)
    let scoreSum = activeFit.fitPercentage * 0.4;
    let weightSum = 0.4;

    // Value/Budget score (25%)
    if (hasPrice) {
      let priceScore = 70;
      if (maxBudget && maxBudget > 0) {
        if (withinBudget) {
          const headroom = (maxBudget - actualPrice) / maxBudget;
          priceScore = Math.min(100, Math.round(75 + headroom * 25));
        } else {
          const stretch = (actualPrice - maxBudget) / maxBudget;
          priceScore = Math.max(20, Math.round(65 - stretch * 50));
        }
      }
      scoreSum += priceScore * 0.25;
      weightSum += 0.25;
    }

    // Repairability score (15%)
    if (hasRepair && product.repairability.scoreOutOfTen?.value) {
      scoreSum += (product.repairability.scoreOutOfTen.value * 10) * 0.15;
      weightSum += 0.15;
    }

    // Review sentiment score (10%)
    if (hasReviews && product.reviewData?.aspects?.length) {
      const avgPositive =
        product.reviewData.aspects.reduce((acc, a) => acc + a.positivePercentage, 0) /
        product.reviewData.aspects.length;
      scoreSum += avgPositive * 0.10;
      weightSum += 0.10;
    }

    // Warranty / Updates score (10%)
    if (product.warranty.softwareUpdatePolicyYears?.value) {
      const updateYears = product.warranty.softwareUpdatePolicyYears.value;
      const wScore = Math.min(100, updateYears * 20);
      scoreSum += wScore * 0.10;
      weightSum += 0.10;
    }

    // Renormalize
    worthItScore = Math.round(scoreSum / weightSum);
  }

  return {
    outcome,
    title,
    confidence,
    confidenceLabel,
    fit: activeFit,
    budgetAnalysis: {
      withinBudget,
      deltaInr,
      deltaPercentage,
      maxBudget,
      actualPrice,
    },
    decisiveReasons,
    whatWouldMakeItWorthIt,
    whatWeCouldntCheck,
    alternatives,
    alternativesComparison,
    launchPriceInfo,
    worthItScore,
    activeDimensionCount: activeDimCount,
    totalDimensionCount: totalDimCount,
  };
}
