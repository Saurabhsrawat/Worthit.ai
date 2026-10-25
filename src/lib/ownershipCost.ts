/**
 * WorthIt AI - Total Ownership Cost (TCO) Calculator
 * Pure calculation logic for computing Indian ownership expenses.
 */

import { OwnershipCostInputs, OwnershipCostResult, EvidenceType } from '../types';

export const DEFAULT_INDIAN_TARIFF_INR_PER_KWH = 7.5; // Average residential tariff in urban India

export function getDefaultOwnershipInputs(
  category: 'laptop' | 'smartphone',
  purchasePriceInr: number = 0,
  purchasePriceType: EvidenceType = 'unknown',
  expectedYears: number = 3
): OwnershipCostInputs {
  const isLaptop = category === 'laptop';

  return {
    purchasePriceInr,
    purchasePriceType,
    years: expectedYears,
    dailyUsageHours: isLaptop ? 6 : 5,
    powerDrawWatts: isLaptop ? 45 : 5, // 45W average working draw for laptop; 5W average charging load for phone
    electricityTariffInr: DEFAULT_INDIAN_TARIFF_INR_PER_KWH,
    batteryReplacementIncluded: false,
    estimatedBatteryCostInr: isLaptop ? 4500 : 2600,
    repairScenarioIncluded: false,
    estimatedRepairCostInr: isLaptop ? 6000 : 3500, // E.g. out-of-warranty screen or keyboard/port repair
    accessoriesCostInr: isLaptop ? 2500 : 1200, // Laptop bag/mouse vs Phone case/protector/charger
  };
}

export function calculateOwnershipCost(inputs: OwnershipCostInputs): OwnershipCostResult {
  const {
    purchasePriceInr,
    purchasePriceType,
    years,
    dailyUsageHours,
    powerDrawWatts,
    electricityTariffInr,
    batteryReplacementIncluded,
    estimatedBatteryCostInr,
    repairScenarioIncluded,
    estimatedRepairCostInr,
    accessoriesCostInr,
  } = inputs;

  const validYears = Math.max(1, years || 3);
  const annualHours = Math.max(0, dailyUsageHours) * 365;
  const annualElectricityKwh = Number(((powerDrawWatts * annualHours) / 1000).toFixed(1));
  const annualElectricityCost = Math.round(annualElectricityKwh * Math.max(0, electricityTariffInr));
  const totalElectricityCost = Math.round(annualElectricityCost * validYears);

  const maintenanceCost = batteryReplacementIncluded ? Math.max(0, estimatedBatteryCostInr) : 0;
  const repairScenarioCost = repairScenarioIncluded ? Math.max(0, estimatedRepairCostInr) : 0;
  const accessoriesCost = Math.max(0, accessoriesCostInr);

  const totalCostOfOwnership = Math.round(
    purchasePriceInr +
    totalElectricityCost +
    maintenanceCost +
    repairScenarioCost +
    accessoriesCost
  );

  const totalMonths = validYears * 12;
  const monthlyEquivalent = Math.round(totalCostOfOwnership / totalMonths);

  // Scenario projections (Low, Typical, High)
  // Low: No repairs, modest 3.5 hrs/day usage, tariff ₹6/kWh, no accessories
  const lowAnnualKwh = (powerDrawWatts * 3.5 * 365) / 1000;
  const lowElectricity = Math.round(lowAnnualKwh * 6.0 * validYears);
  const lowScenario = Math.round(purchasePriceInr + lowElectricity);

  // Typical: Current user inputs
  const typicalScenario = totalCostOfOwnership;

  // High: Intensive 9 hrs/day usage, tariff ₹9.5/kWh, battery replacement + repair contingency + accessories
  const highAnnualKwh = (powerDrawWatts * 9.0 * 365) / 1000;
  const highElectricity = Math.round(highAnnualKwh * 9.5 * validYears);
  const highScenario = Math.round(
    purchasePriceInr +
    highElectricity +
    estimatedBatteryCostInr +
    estimatedRepairCostInr +
    accessoriesCostInr
  );

  const assumptions = [
    {
      label: 'Purchase Price',
      value: `₹${purchasePriceInr.toLocaleString('en-IN')}`,
      type: purchasePriceType,
    },
    {
      label: 'Average Electricity Tariff (India)',
      value: `₹${electricityTariffInr.toFixed(2)} / kWh`,
      type: 'estimate' as EvidenceType,
    },
    {
      label: 'Average Power Draw',
      value: `${powerDrawWatts} W (${dailyUsageHours} hrs/day)`,
      type: 'estimate' as EvidenceType,
    },
    {
      label: 'Ownership Timeline',
      value: `${validYears} years (${totalMonths} months)`,
      type: 'user-provided' as EvidenceType,
    },
    {
      label: 'Battery Replacement (Optional)',
      value: batteryReplacementIncluded ? `₹${estimatedBatteryCostInr.toLocaleString('en-IN')} (Selected)` : 'Not included in baseline',
      type: 'estimate' as EvidenceType,
    },
    {
      label: 'Repair Scenario (Contingency)',
      value: repairScenarioIncluded ? `₹${estimatedRepairCostInr.toLocaleString('en-IN')} (Hypothetical)` : 'Excluded (repair is not guaranteed spend)',
      type: 'estimate' as EvidenceType,
    },
  ];

  return {
    purchasePrice: purchasePriceInr,
    totalElectricityCost,
    annualElectricityKwh,
    annualElectricityCost,
    maintenanceCost,
    repairScenarioCost,
    accessoriesCost,
    totalCostOfOwnership,
    monthlyEquivalent,
    scenarios: {
      low: lowScenario,
      typical: typicalScenario,
      high: highScenario,
    },
    assumptions,
  };
}
