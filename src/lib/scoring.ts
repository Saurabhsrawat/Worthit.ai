/**
 * WorthIt AI - Transparent Scoring Engine
 * Implements pure, deterministic evaluation logic in plain TypeScript.
 */

import { Product, UserPreferences, WorthItScoreResult, DimensionScore, EvidenceType } from '../types';

export const DEFAULT_DESIGN_WEIGHTS = {
  suitability: 0.30,
  value: 0.20,
  ownershipCost: 0.20,
  repairability: 0.15,
  issueIndicators: 0.15,
};

/**
 * Calculates evidence coverage for a product across essential data fields (0 - 100)
 */
export function calculateDataCompleteness(product: Product): number {
  let totalFields = 0;
  let filledFields = 0;

  const isGroundedField = (field?: { value?: any; evidenceType?: string }) => {
    if (!field || field.value === null || field.value === undefined || field.value === 'Unknown' || field.value === '') {
      return false;
    }
    // Only verified, web-reported, user-provided, or demo seed count towards completeness. AI-recalled does NOT count as grounded completeness.
    return field.evidenceType === 'verified' ||
      field.evidenceType === 'web-reported' ||
      field.evidenceType === 'user-provided' ||
      (product.isDemonstrationData && field.evidenceType === 'seed-demo');
  };

  // 1. Price
  totalFields++;
  if (isGroundedField(product.priceInInr)) {
    filledFields++;
  }

  // 2. Processor
  totalFields++;
  if (isGroundedField(product.specs.processor)) {
    filledFields++;
  }

  // 3. RAM
  totalFields++;
  if (isGroundedField(product.specs.ram)) {
    filledFields++;
  }

  // 4. Storage
  totalFields++;
  if (isGroundedField(product.specs.storage)) {
    filledFields++;
  }

  // 5. Display
  totalFields++;
  if (isGroundedField(product.specs.display)) {
    filledFields++;
  }

  // 6. Battery
  totalFields++;
  if (isGroundedField(product.specs.batteryCapacity) || isGroundedField((product.specs as any).battery)) {
    filledFields++;
  }

  // 7. Weight
  totalFields++;
  if (isGroundedField(product.specs.weightKg) || isGroundedField((product.specs as any).weight)) {
    filledFields++;
  }

  // 8. Warranty
  totalFields++;
  if (isGroundedField(product.warranty.standardWarrantyMonths)) {
    filledFields++;
  }

  // 9. Software updates
  totalFields++;
  if (isGroundedField(product.warranty.softwareUpdatePolicyYears) || isGroundedField((product.specs as any).softwareUpdates)) {
    filledFields++;
  }

  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
}

/**
 * Calculates the transparent WorthIt score and dimension breakdown.
 */
export function calculateWorthItScore(
  product: Product,
  preferences?: UserPreferences
): WorthItScoreResult {
  const dimensions: DimensionScore[] = [];
  const strengths: string[] = [];
  const issueSignals: string[] = [];
  const tradeoffs: string[] = [];

  // 1. Suitability for intended use (Base 30%)
  // Evaluate based on specs matching preferences or general category standards
  let suitabilityScore = 70;
  let suitabilityCoverage = 0;
  let suitabilityReason = 'Evaluated against baseline category standards.';
  let suitabilityEvidence: EvidenceType = 'estimate';

  const specs = product.specs;
  const specCount = Object.keys(specs).length;
  if (specCount > 0) {
    const validSpecs = Object.values(specs).filter((s) => s?.value !== null && s?.evidenceType !== 'unknown');
    suitabilityCoverage = Math.min(100, Math.round((validSpecs.length / 5) * 100));

    if (preferences && preferences.intendedUse.length > 0) {
      let matchCount = 0;
      const uses = preferences.intendedUse.map((u) => u.toLowerCase());

      if (product.category === 'laptop') {
        const proc = String(specs.processor?.value || '').toLowerCase();
        const ram = String(specs.ram?.value || '').toLowerCase();
        const isHighPerf = proc.includes('i7') || proc.includes('i9') || proc.includes('ryzen 7') || proc.includes('ryzen 9') || proc.includes('m2 pro') || proc.includes('m3') || proc.includes('m4');
        const has16Gb = ram.includes('16') || ram.includes('32') || ram.includes('64');

        if (uses.includes('gaming')) {
          if (isHighPerf && has16Gb) {
            suitabilityScore += 15;
            strengths.push('Hardware configuration aligns well with gaming workload demands.');
          } else {
            suitabilityScore -= 15;
            tradeoffs.push('Modest processing/RAM configuration for intense gaming titles.');
          }
          matchCount++;
        }
        if (uses.includes('programming')) {
          if (has16Gb) {
            suitabilityScore += 12;
            strengths.push('Adequate RAM headroom (16GB+) for developer tooling and containers.');
          } else {
            suitabilityScore -= 10;
            tradeoffs.push('8GB RAM may face memory bottlenecks during multi-container dev workflows.');
          }
          matchCount++;
        }
        if (uses.includes('college work') || uses.includes('everyday')) {
          suitabilityScore += 10;
          strengths.push('Form factor and architecture well-suited for academic and routine productivity.');
          matchCount++;
        }
      } else {
        // Smartphone
        if (uses.includes('photography')) {
          const cam = String(specs.camera?.value || '').toLowerCase();
          if (cam.includes('50mp') || cam.includes('ois') || cam.includes('telephoto') || cam.includes('triple') || cam.includes('ultra')) {
            suitabilityScore += 15;
            strengths.push('Optics setup includes advanced sensors / optical image stabilization.');
          } else {
            suitabilityScore -= 5;
          }
          matchCount++;
        }
        if (uses.includes('battery')) {
          const bat = Number(specs.batteryCapacity?.value) || (String(specs.batteryCapacity?.value).includes('5000') ? 5000 : 4000);
          if (bat >= 5000) {
            suitabilityScore += 15;
            strengths.push('5000mAh+ battery offers high endurance for heavy daily screen time.');
          }
          matchCount++;
        }
      }

      suitabilityReason = matchCount > 0
        ? `Matched against user requirements: ${preferences.intendedUse.join(', ')}.`
        : 'General suitability based on core hardware specs.';
    } else {
      suitabilityReason = 'General hardware suitability baseline (no specific use selected).';
    }
    suitabilityEvidence = validSpecs.some((s) => s?.evidenceType === 'verified') ? 'verified' : 'estimate';
  } else {
    suitabilityCoverage = 0;
    suitabilityReason = 'No confirmed specifications available to assess suitability.';
    suitabilityEvidence = 'unknown';
  }

  suitabilityScore = Math.min(100, Math.max(10, suitabilityScore));
  const suitabilityActive = suitabilityCoverage >= 30;

  dimensions.push({
    id: 'suitability',
    name: 'Suitability for Intended Use',
    score: suitabilityScore,
    weight: DEFAULT_DESIGN_WEIGHTS.suitability,
    rawWeight: DEFAULT_DESIGN_WEIGHTS.suitability,
    active: suitabilityActive,
    evidenceCoverage: suitabilityCoverage,
    reason: suitabilityReason,
    evidenceType: suitabilityEvidence,
  });

  // 2. Value relative to budget (Base 20%)
  let valueScore = 60;
  let valueCoverage = 0;
  let valueReason = 'Price not verified.';
  let valueEvidence: EvidenceType = product.priceInInr?.evidenceType || 'unknown';

  const priceVal = product.priceInInr?.value;
  if (priceVal && priceVal > 0) {
    valueCoverage = 100;
    if (preferences?.maxBudgetInInr && preferences.maxBudgetInInr > 0) {
      const budget = preferences.maxBudgetInInr;
      const ratio = priceVal / budget;
      if (ratio <= 0.85) {
        valueScore = 90;
        valueReason = `Priced at ₹${priceVal.toLocaleString('en-IN')}, comfortably within your ₹${budget.toLocaleString('en-IN')} budget headroom.`;
        strengths.push('Priced well below maximum budget, leaving buffer for accessories or warranty.');
      } else if (ratio <= 1.05) {
        valueScore = 75;
        valueReason = `Priced at ₹${priceVal.toLocaleString('en-IN')}, closely fitting your ₹${budget.toLocaleString('en-IN')} ceiling.`;
      } else if (ratio <= 1.25) {
        valueScore = 45;
        valueReason = `Priced at ₹${priceVal.toLocaleString('en-IN')}, which exceeds your ₹${budget.toLocaleString('en-IN')} budget by ~${Math.round((ratio - 1) * 100)}%.`;
        tradeoffs.push(`Exceeds preferred budget limit by ₹${(priceVal - budget).toLocaleString('en-IN')}.`);
      } else {
        valueScore = 25;
        valueReason = `Priced significantly above designated budget (₹${priceVal.toLocaleString('en-IN')} vs ₹${budget.toLocaleString('en-IN')}).`;
        tradeoffs.push('Substantially above stated budget parameter.');
      }
    } else {
      valueScore = 65;
      valueReason = `Current market price is ₹${priceVal.toLocaleString('en-IN')}. No user budget specified for comparison.`;
    }
  } else {
    valueCoverage = 0;
    valueReason = 'Price unknown / not verified. User can provide observed price to calculate.';
  }

  const valueActive = valueCoverage > 0;
  dimensions.push({
    id: 'value',
    name: 'Value Relative to Budget',
    score: valueScore,
    weight: DEFAULT_DESIGN_WEIGHTS.value,
    rawWeight: DEFAULT_DESIGN_WEIGHTS.value,
    active: valueActive,
    evidenceCoverage: valueCoverage,
    reason: valueReason,
    evidenceType: valueEvidence,
  });

  // 3. Estimated Ownership Cost (Base 20%)
  // Lower long-term operating and maintenance friction gives higher score
  let costScore = 65;
  let costCoverage = 0;
  let costReason = 'Ownership cost baseline computed from typical Indian electricity rates.';
  let costEvidence: EvidenceType = 'estimate';

  if (priceVal && priceVal > 0) {
    costCoverage = 80;
    const isPhone = product.category === 'smartphone';
    const annualPowerCost = isPhone ? 150 : 1800; // rough benchmark in India
    const years = preferences?.expectedOwnershipYears || 3;
    const totalEst = priceVal + annualPowerCost * years;

    costScore = Math.min(95, Math.max(30, Math.round(100 - (totalEst / (priceVal * 1.5)) * 30)));
    costReason = `Projected ${years}-year running cost includes estimated energy consumption and standard upkeep.`;
  } else {
    costCoverage = 0;
    costReason = 'Cannot project total ownership cost without verified or user-provided purchase price.';
    costEvidence = 'unknown';
  }

  const costActive = costCoverage > 0;
  dimensions.push({
    id: 'ownershipCost',
    name: 'Estimated Ownership Cost',
    score: costScore,
    weight: DEFAULT_DESIGN_WEIGHTS.ownershipCost,
    rawWeight: DEFAULT_DESIGN_WEIGHTS.ownershipCost,
    active: costActive,
    evidenceCoverage: costCoverage,
    reason: costReason,
    evidenceType: costEvidence,
  });

  // 4. Repairability & Support Evidence (Base 15%)
  let repairScore = 50;
  let repairCoverage = 0;
  let repairReason = 'Searched iFixit, EU energy label, manufacturer pages: not found';
  let repairEvidence: EvidenceType = 'unknown';

  const rep = product.repairability as any;

  // Strict check: only count facts with a real sourceUrl or user-provided/third-party evidence
  const isSourcedFact = (field: any) => {
    if (!field || field.value === null || field.value === undefined) return false;
    if (field.evidenceType === 'unknown') return false;
    return Boolean(field.sourceUrl || field.evidenceType === 'user-provided' || field.evidenceType === 'third_party_database' || field.evidenceType === 'primary_source');
  };

  const hasSourcedScore = isSourcedFact(rep?.scoreOutOfTen);
  const hasSourcedEu = isSourcedFact(rep?.euEnergyLabelClass);
  const hasSourcedBattery = isSourcedFact(rep?.batteryReplaceable);
  const hasSourcedRam = isSourcedFact(rep?.ramUpgradable);
  const hasSourcedStorage = isSourcedFact(rep?.storageUpgradable);
  const hasSourcedParts = isSourcedFact(rep?.officialSparePartsInIndia) || isSourcedFact(rep?.sparePartsStatement);
  const hasSourcedService = isSourcedFact(rep?.serviceCenterInfoIndia);
  const hasSourcedNotes = isSourcedFact(rep?.notes);

  const sourcedFactsCount = [
    hasSourcedScore,
    hasSourcedEu,
    hasSourcedBattery,
    hasSourcedRam,
    hasSourcedStorage,
    hasSourcedParts,
    hasSourcedService,
    hasSourcedNotes
  ].filter(Boolean).length;

  if (sourcedFactsCount >= 1) {
    let baseScore = 50;
    let scoreSource = '';

    if (hasSourcedScore && typeof rep.scoreOutOfTen.value === 'number') {
      // iFixit 0-10 score mapped to 0-100 (* 10)
      baseScore = rep.scoreOutOfTen.value * 10;
      scoreSource = `iFixit score ${rep.scoreOutOfTen.value}/10`;
      repairEvidence = rep.scoreOutOfTen.evidenceType || 'web-reported';
      if (rep.scoreOutOfTen.value >= 7) {
        strengths.push(`High modularity / repairability rating (${rep.scoreOutOfTen.value}/10).`);
      } else if (rep.scoreOutOfTen.value <= 4) {
        tradeoffs.push(`Restricted repairability (${rep.scoreOutOfTen.value}/10); glued chassis or non-modular components.`);
      }
    } else if (hasSourcedEu && rep.euEnergyLabelClass.value) {
      // EU classes: A=90, B=75, C=60, D=45, E=30
      const euVal = String(rep.euEnergyLabelClass.value).trim().toUpperCase();
      const euMap: Record<string, number> = { A: 90, B: 75, C: 60, D: 45, E: 30 };
      if (euMap[euVal]) {
        baseScore = euMap[euVal];
        scoreSource = `EU repairability class ${euVal} (EU rating, may differ for the Indian variant)`;
        repairEvidence = rep.euEnergyLabelClass.evidenceType || 'web-reported';
      }
    }

    if (hasSourcedBattery) {
      if (rep.batteryReplaceable.value === true) {
        baseScore += 10;
        strengths.push('User or easily replaceable battery.');
      } else if (rep.batteryReplaceable.value === false) {
        baseScore -= 10;
        tradeoffs.push('Battery is glued in and not easily user-replaceable.');
      }
    }

    if (hasSourcedParts && rep.officialSparePartsInIndia?.value === true) {
      baseScore += 5;
      strengths.push('Official spare parts or self-repair catalog available.');
    }

    repairScore = Math.min(100, Math.max(15, Math.round(baseScore)));
    repairCoverage = Math.min(100, Math.round((sourcedFactsCount / 4) * 100));
    repairReason = scoreSource
      ? `Computed from ${scoreSource} and ${sourcedFactsCount} sourced repairability fact(s).`
      : `Based on ${sourcedFactsCount} sourced repairability and serviceability observation(s).`;
    if (repairEvidence === 'unknown') {
      repairEvidence = 'web-reported';
    }
  }

  const repairActive = sourcedFactsCount >= 1;

  dimensions.push({
    id: 'repairability',
    name: 'Repairability & Support Evidence',
    score: repairActive ? repairScore : 0,
    weight: DEFAULT_DESIGN_WEIGHTS.repairability,
    rawWeight: DEFAULT_DESIGN_WEIGHTS.repairability,
    active: repairActive,
    evidenceCoverage: repairActive ? repairCoverage : 0,
    reason: repairReason,
    evidenceType: repairEvidence,
  });

  // 5. Customer-reported issue indicators (Base 15%)
  let issueScore = 70;
  let issueCoverage = 0;
  let issueReason = 'Not enough public comments found (searched YouTube, Reddit, Team-BHP...)';
  let issueEvidence: EvidenceType = 'unknown';

  const revCount = product.reviewData?.reviewCount || 0;
  const sourcesCount =
    product.reviewData?.sourcesConsultedCount ||
    product.reviewData?.sourcesConsultedList?.length ||
    product.reviewData?.sourceStats?.filter((s) => s.commentsAnalyzed > 0).length ||
    0;

  const hasEnoughEvidence = revCount >= 30 || sourcesCount >= 2;

  if (product.reviewData && revCount > 0 && hasEnoughEvidence) {
    issueCoverage = 100;
    issueEvidence = product.reviewData.sampleType === 'licensed' ? 'verified' : 'ai-interpretation';
    const reportedIssues = product.reviewData.reportedIssues || [];

    let totalPenalty = 0;
    for (const issue of reportedIssues) {
      if (issue.frequency === 'High') {
        totalPenalty += 18;
        issueSignals.push(`${issue.category}: Frequent owner reports (${issue.mentionCount} mentions). ${issue.description}`);
      } else if (issue.frequency === 'Moderate') {
        totalPenalty += 10;
        issueSignals.push(`${issue.category}: Noticeable reports (${issue.mentionCount} mentions).`);
      } else {
        totalPenalty += 4;
      }
    }

    issueScore = Math.max(20, Math.min(95, 88 - totalPenalty));
    issueReason = `Analyzed across ${revCount} public comments from ${sourcesCount} source${sourcesCount !== 1 ? 's' : ''}.`;
  } else {
    issueCoverage = 0;
    issueReason = 'Not enough public comments found (searched YouTube, Reddit, Team-BHP...)';
  }

  const issueActive = issueCoverage > 0;
  dimensions.push({
    id: 'issueIndicators',
    name: 'Customer-Reported Issue Signals',
    score: issueScore,
    weight: DEFAULT_DESIGN_WEIGHTS.issueIndicators,
    rawWeight: DEFAULT_DESIGN_WEIGHTS.issueIndicators,
    active: issueActive,
    evidenceCoverage: issueCoverage,
    reason: issueReason,
    evidenceType: issueEvidence,
  });

  // Shift weights if user adjusted sliders
  if (preferences?.importanceWeights) {
    const { batteryLife, performance, portability, repairability } = preferences.importanceWeights;
    // Boost suitability if battery/perf are top priority
    const perfBoost = (performance - 3) * 0.03;
    const repairBoost = (repairability - 3) * 0.04;
    const portBoost = (portability - 3) * 0.02;

    const suitDim = dimensions.find((d) => d.id === 'suitability');
    if (suitDim) suitDim.rawWeight = Math.max(0.15, suitDim.rawWeight + perfBoost + portBoost);

    const repDim = dimensions.find((d) => d.id === 'repairability');
    if (repDim) repDim.rawWeight = Math.max(0.10, repDim.rawWeight + repairBoost);
  }

  // Renormalize active weights
  const activeDimensions = dimensions.filter((d) => d.active);
  const activeCount = activeDimensions.length;

  let overallScore: number | null = null;
  const isInsufficientEvidence = activeCount < 2;

  if (!isInsufficientEvidence) {
    const totalRawActiveWeight = activeDimensions.reduce((sum, d) => sum + d.rawWeight, 0);
    let weightedSum = 0;

    for (const dim of dimensions) {
      if (dim.active && totalRawActiveWeight > 0) {
        dim.weight = Number((dim.rawWeight / totalRawActiveWeight).toFixed(3));
        weightedSum += dim.score * dim.weight;
      } else {
        dim.weight = 0;
      }
    }
    overallScore = Math.round(weightedSum);
  } else {
    for (const dim of dimensions) {
      dim.weight = 0;
    }
  }

  // Generate plain-language verdict summary
  let verdictSummary = '';
  if (isInsufficientEvidence) {
    verdictSummary = 'Insufficient evidence for an overall score. At least 2 active dimensions with verified or user-provided data are required to avoid arbitrary ratings.';
  } else if (overallScore !== null) {
    if (overallScore >= 78) {
      verdictSummary = `Strong match (${overallScore}/100) based on ${activeCount} of 5 measurable dimensions. Evidence highlights solid fit for your criteria with manageable trade-offs.`;
    } else if (overallScore >= 60) {
      verdictSummary = `Moderate fit (${overallScore}/100) based on ${activeCount} of 5 measurable dimensions. The product satisfies standard requirements, but notable trade-offs or reported patterns deserve inspection.`;
    } else {
      verdictSummary = `Low fit score (${overallScore}/100) based on ${activeCount} of 5 measurable dimensions. Note: A low score does not mean the product is defective; it highlights a discrepancy with budget parameters, high projected costs, or specific user-reported signals.`;
    }
  }

  return {
    overallScore,
    isInsufficientEvidence,
    activeDimensionCount: activeCount,
    totalDimensionCount: dimensions.length,
    dimensions,
    strengths: strengths.length > 0 ? strengths : ['Standard commercial specifications in category.'],
    issueSignals: issueSignals.length > 0 ? issueSignals : ['No critical issue clusters detected in existing data.'],
    tradeoffs: tradeoffs.length > 0 ? tradeoffs : ['Examine specific warranty and return terms before purchase.'],
    verdictSummary,
    isProvisional: true,
  };
}
