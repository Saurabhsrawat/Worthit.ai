/**
 * WorthIt AI - Type Definitions
 * Transparent, evidence-based product evaluation for India
 */

export type EvidenceType =
  | 'verified'
  | 'web-reported'
  | 'seed-demo'
  | 'ai-recalled'
  | 'user-provided'
  | 'estimate'
  | 'ai-interpretation'
  | 'unknown';

export interface EvidenceField<T> {
  value: T | null;
  evidenceType: EvidenceType;
  source?: string;
  sourceUrl?: string;
  date?: string;
  notes?: string;
}

export type ProductCategory = 'laptop' | 'smartphone';

export interface ProductSpecs {
  processor?: EvidenceField<string>;
  ram?: EvidenceField<string>;
  storage?: EvidenceField<string>;
  display?: EvidenceField<string>;
  batteryCapacity?: EvidenceField<string>;
  batteryLifeHours?: EvidenceField<number>;
  battery?: EvidenceField<string>;
  weightKg?: EvidenceField<number>;
  weight?: EvidenceField<string>;
  camera?: EvidenceField<string>;
  gpu?: EvidenceField<string>;
  os?: EvidenceField<string>;
  ports?: EvidenceField<string>;
  refreshRate?: EvidenceField<string>;
  chargingSpeedWatts?: EvidenceField<number>;
  chargingSpeed?: EvidenceField<string>;
  durability?: EvidenceField<string>;
  softwareUpdates?: EvidenceField<string>;
  [key: string]: EvidenceField<any> | undefined;
}

export interface AspectSentiment {
  aspect: string; // e.g. "Battery Life", "Thermal & Heating", "Display Quality"
  positivePercentage: number; // 0-100
  neutralPercentage: number;
  negativePercentage: number;
  totalMentions: number;
  keyPhrases: string[];
}

export interface PriceQuote {
  seller: string;
  priceInr: number;
  sourceUrl?: string;
  retrievedAt: string;
  notes?: string;
}

export interface ConflictingEvidence {
  field: string;
  claimA: { claim: string; source: string; sourceUrl?: string };
  claimB: { claim: string; source: string; sourceUrl?: string };
  explanation: string;
}

export interface GroundedSource {
  title: string;
  url: string;
  domain?: string;
  snippet?: string;
  topic?: 'specs' | 'pricing' | 'warranty' | 'repairability' | 'issues';
  retrievedAt: string;
}

export interface ReviewSourceStat {
  sourceId: string;
  sourceName: string;
  status: 'ok' | 'no_key' | 'quota' | 'error' | 'no_results' | 'skipped';
  callsMade: number;
  commentsFetched: number;
  commentsRejected: number;
  commentsAnalyzed: number;
  message?: string;
  urlsConsulted?: { title: string; url: string }[];
}

export interface ReviewQuote {
  quote: string;
  sourceTitle: string;
  sourceUrl?: string;
  author?: string;
}

export interface ReportedIssue {
  category: string; // e.g. "Motherboard failure", "Green line on AMOLED", "Hinge cracking"
  frequency: 'High' | 'Moderate' | 'Occasional' | 'Rare';
  mentionCount: number;
  description: string;
  sampleQuotes: string[];
  statusOrFix?: string; // e.g. "Free screen replacement program announced by brand in India"
  sourcesMentioning?: { title: string; url?: string }[];
  verifiedQuotes?: ReviewQuote[];
  isRepeatedTheme?: boolean; // 3+ comments across at least 2 sources
  distinctSourcesCount?: number;
}

export interface ReviewDataset {
  reviewCount: number;
  dateRange: string;
  source: string;
  sampleType: 'licensed' | 'user-supplied' | 'demonstration';
  aspects: AspectSentiment[];
  reportedIssues: ReportedIssue[];
  sourcesConsultedList?: { title: string; url?: string }[];
  sourcesConsultedCount?: number;
  sourceStats?: ReviewSourceStat[];
  totalCommentsFetched?: number;
  totalCommentsRejected?: number;
  rejectionBreakdown?: {
    notMatchingModel: number;
    tooShort: number;
    duplicate: number;
  };
  summaryNotice?: string;
  analyzedAt?: string;
}

export interface RepairabilityInfo {
  scoreOutOfTen?: EvidenceField<number>;
  batteryReplaceable?: EvidenceField<boolean>;
  ramUpgradable?: EvidenceField<boolean>;
  storageUpgradable?: EvidenceField<boolean>;
  officialSparePartsInIndia?: EvidenceField<boolean>;
  repairGuideAvailable?: EvidenceField<boolean>;
  iFixitGuideUrl?: string;
  notes?: EvidenceField<string>;
}

export interface WarrantySupportInfo {
  standardWarrantyMonths?: EvidenceField<number>;
  extendedWarrantyCostInr?: EvidenceField<number>;
  softwareUpdatePolicyYears?: EvidenceField<number>;
  securityPatchesYears?: EvidenceField<number>;
  serviceCenterNetworkInIndia?: EvidenceField<string>;
  sourceUrl?: string;
}

export interface TopicDebugInfo {
  topic: string;
  status: 'ok' | 'quota' | 'error' | 'empty' | 'no_search_key';
  httpStatus: number;
  groundingChunksCount: number;
  groundingSupportsCount: number;
  stepATextLength: number;
  stepBFieldsExtracted: number;
  fieldsKept: { field: string; value: any; status: string; sourceUrl?: string; sourceTitle?: string }[];
  fieldsDropped: { field: string; value: any; reason: string }[];
  directPageFetch?: {
    urlsAttempted: string[];
    urlsFetched: string[];
    specsExtractedCount: number;
    log: string[];
  };
  searchProvider?: string;
  searchQueries?: string[];
  pagesFetched?: string[];
  retryCount: number;
  errorMessage?: string;
  durationMs: number;
  reviewSources?: ReviewSourceStat[];
}

export type SectionState = 'loaded' | 'partial' | 'failed' | 'quota-cooldown' | 'pending' | 'loading' | 'no-search-key';

export interface SectionStatusInfo {
  state: SectionState;
  reason?: string;
  countdownSeconds?: number;
  updatedAt: string;
}

export interface ProductVariantOption {
  id: string;
  label: string; // e.g. "16GB RAM / 512GB SSD / Intel Core i5"
  ram?: string;
  storage?: string;
  processor?: string;
  indicativePriceInr?: number;
}

export interface ProvenanceInfo {
  liveFetched: boolean;
  groundingChunkCount: number;
  retrievedAt: string;
  status: 'live' | 'partial' | 'unavailable';
  reason?: 'quota' | 'no_results' | 'error' | 'no_key' | 'no_search_key';
  retryAfterSeconds?: number;
  searchProvider?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  releaseYear: number;
  imagePlaceholder?: string;
  isDemonstrationData: boolean;
  isLiveFetched?: boolean;
  retrievedAt?: string;
  provenance?: ProvenanceInfo;
  selectedVariant?: string;
  availableVariants?: ProductVariantOption[];
  priceInInr: EvidenceField<number>;
  priceQuotes?: PriceQuote[];
  conflictingSources?: ConflictingEvidence[];
  specs: ProductSpecs;
  warranty: WarrantySupportInfo;
  repairability: RepairabilityInfo;
  reviewData?: ReviewDataset;
  sourcesConsulted?: GroundedSource[];
  sourcesConsultedCount?: number;
  dataCompleteness: number; // 0-100
  lastUpdated: string;
  sourceLinks?: { title: string; url: string; date: string }[];
  researchDebug?: Record<string, TopicDebugInfo>;
  sectionStatuses?: Record<string, SectionStatusInfo>;
}

export interface UserPreferences {
  category: ProductCategory;
  intendedUse: string[];
  maxBudgetInInr?: number;
  expectedOwnershipYears: number; // e.g. 2, 3, 4, 5
  importanceWeights: {
    batteryLife: number; // 1-5
    performance: number; // 1-5
    portability: number; // 1-5
    repairability: number; // 1-5
  };
  essentialRequirements: string;
}

export interface DimensionScore {
  id: string;
  name: string;
  score: number; // 0 - 100
  weight: number; // 0 - 1 (normalized)
  rawWeight: number; // Initial design weight
  active: boolean;
  evidenceCoverage: number; // 0 - 100%
  reason: string;
  evidenceType: EvidenceType;
}

export interface WorthItScoreResult {
  overallScore: number | null; // null if insufficient evidence
  isInsufficientEvidence: boolean;
  activeDimensionCount: number;
  totalDimensionCount: number;
  dimensions: DimensionScore[];
  strengths: string[];
  issueSignals: string[];
  tradeoffs: string[];
  verdictSummary: string;
  isProvisional: boolean;
}

export interface OwnershipCostInputs {
  purchasePriceInr: number;
  purchasePriceType: EvidenceType;
  years: number;
  dailyUsageHours: number;
  powerDrawWatts: number;
  electricityTariffInr: number; // Default ~7.5
  batteryReplacementIncluded: boolean;
  estimatedBatteryCostInr: number;
  repairScenarioIncluded: boolean;
  estimatedRepairCostInr: number;
  accessoriesCostInr: number;
}

export interface OwnershipCostResult {
  purchasePrice: number;
  totalElectricityCost: number;
  annualElectricityKwh: number;
  annualElectricityCost: number;
  maintenanceCost: number;
  repairScenarioCost: number;
  accessoriesCost: number;
  totalCostOfOwnership: number;
  monthlyEquivalent: number;
  scenarios: {
    low: number;
    typical: number;
    high: number;
  };
  assumptions: {
    label: string;
    value: string;
    type: EvidenceType;
  }[];
}

export interface CandidateProductMatch {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  releaseYear: number;
  matchConfidence: number; // 0 - 1
  keyAttributes: string[];
  needsConfirmationList: string[];
  sourceInputType: 'photo' | 'url' | 'search' | 'ai-suggested';
  isAiSuggested?: boolean;
  identifiedDetails?: {
    modelNumber?: string;
    generation?: string;
    variant?: string;
  };
  variants?: string[];
}

export interface UserFeedbackReport {
  id: string;
  productId: string;
  productName: string;
  type: 'incorrect_match' | 'misleading_result' | 'outdated_price' | 'inaccurate_specs' | 'other';
  comment: string;
  userEmail?: string;
  timestamp: string;
}

// --- PART A: FIT ENGINE & NEEDS-BASED VERDICT TYPES ---

export type RequirementStatus = 'meets' | 'borderline' | 'fails' | 'unknown';

export interface RequirementItem {
  id: string;
  label: string;
  useCase?: string;
  status: RequirementStatus;
  actualValue: string | number | boolean | null;
  threshold: string;
  reason: string;
  weight: number; // 1 - 5 from importance sliders or use case default
  source?: string;
  sourceUrl?: string;
  evidenceType: EvidenceType;
  isCustom?: boolean;
}

export interface CustomSpecCondition {
  field: string;
  operator: '>=' | '<=' | 'contains' | 'equals';
  expectedValue: any;
  description: string;
}

export interface FitEvaluation {
  overallFitStatus: 'fits' | 'borderline' | 'fails' | 'insufficient_specs';
  fitPercentage: number; // 0 - 100
  requirements: RequirementItem[];
  meetsCount: number;
  borderlineCount: number;
  failsCount: number;
  unknownCount: number;
  missingCoreSpecs: string[];
}

export type VerdictOutcome =
  | 'worth_it'
  | 'worth_it_with_caveats'
  | 'not_worth_it'
  | 'cant_tell_yet';

export type VerdictConfidence = 'High' | 'Medium' | 'Low';

export interface AlternativeProduct {
  name: string;
  priceInr: number;
  keySpecs: string;
  comparisonReason: string;
  url?: string;
  isGrounded: boolean;
}

export interface PriceHistoryEvent {
  date: string;
  priceInr: number;
  type: 'launch' | 'price_cut' | 'sale';
  title: string;
  source?: string;
  sourceUrl?: string;
}

export interface ObservedPriceSnapshot {
  date: string;
  priceInr: number;
  seller: string;
  sourceUrl?: string;
}

export interface VerdictResult {
  outcome: VerdictOutcome;
  title: string; // "Worth it for you" | "Worth it with caveats" | "Not worth it for you" | "Can't tell yet"
  confidence: VerdictConfidence;
  confidenceLabel: string; // e.g. "Based on specs and price only"
  fit: FitEvaluation;
  budgetAnalysis: {
    withinBudget: boolean;
    deltaInr: number;
    deltaPercentage: number;
    maxBudget?: number;
    actualPrice?: number;
  };
  decisiveReasons: string[];
  whatWouldMakeItWorthIt: string[];
  whatWeCouldntCheck: {
    item: string;
    impactOnConfidence: string;
  }[];
  alternatives: AlternativeProduct[];
  alternativesComparison: string;
  launchPriceInfo?: {
    launchPriceInr: number;
    deltaFromLaunchInr: number;
    launchDate?: string;
    source?: string;
    sourceUrl?: string;
  };
  worthItScore: number | null;
  activeDimensionCount: number;
  totalDimensionCount: number;
}

// --- PERSONAL REVIEW & SPEC ANALYSIS TYPES ---

export type SpecRating = 'Excellent' | 'Good' | 'Average' | 'Weak' | 'Unknown';
export type SpecRelevance = 'High' | 'Medium' | 'Low';

export interface RatedSpec {
  specKey: string;
  specName: string;
  rawText: string;
  value: any;
  evidenceType: EvidenceType;
  source?: string;
  sourceUrl?: string;
  rating: SpecRating;
  comparisonNote: string;
  relevance: SpecRelevance;
  relevanceReason: string;
  scoreOutOf100: number | null;
  priceBand: string;
  isHighlight?: boolean;
}

export interface StrengthWeaknessItem {
  id: string;
  specKey: string;
  specFact: string;
  whyItMatters: string;
  rating: SpecRating;
  relevance: SpecRelevance;
  evidenceType: EvidenceType;
  source?: string;
  sourceUrl?: string;
}

export interface TradeoffItem {
  strongSpec: string;
  weakSpec: string;
  explanation: string;
}

export interface StandoutFeature {
  specName: string;
  value: string;
  whyStandout: string;
  evidenceType: EvidenceType;
  source?: string;
  sourceUrl?: string;
}

export interface SuitednessTags {
  bestSuitedFor: string[];
  notIdealFor: string[];
}

export interface SpecAnalysisResult {
  ratedSpecs: RatedSpec[];
  strengths: StrengthWeaknessItem[];
  weaknesses: StrengthWeaknessItem[];
  standouts: StandoutFeature[];
  tradeoffs: TradeoffItem[];
  suitedness: SuitednessTags;
  unverifiableSpecs: { item: string; impact: string }[];
  priceBand: string;
}

export interface PersonalReviewData {
  productId: string;
  profileHash: string;
  verdict: VerdictResult;
  analysis: SpecAnalysisResult;
  writtenReview: string | null;
  reviewStatus: 'verified' | 'ai-generated' | 'failed-validation' | 'quota-fallback';
  generatedAt: string;
}

