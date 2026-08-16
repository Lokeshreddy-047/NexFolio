import { auth } from "./firebase";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    if (typeof window !== "undefined" && typeof auth.authStateReady === "function") {
      await auth.authStateReady();
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.warn("Could not retrieve Firebase auth token:", error);
  }

  return headers;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = await getAuthHeaders();
  const customHeaders = (options.headers || {}) as Record<string, string>;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...customHeaders,
    },
  });

  if (!response.ok) {
    let message = "Unknown API error";
    try {
      const errorJson = await response.json();
      message = errorJson.detail || JSON.stringify(errorJson);
    } catch {
      message = await response.text().catch(() => "Unknown API error");
    }
    throw new Error(`API error (${response.status}): ${message}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// User Profile Types
export interface UserProfile {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  created_at?: string;
  last_login?: string;
  portfolio_count: number;
  predictions_count: number;
}

export async function getUserProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/v1/auth/me");
}

// Portfolio Types
export interface PortfolioSummary {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  currency: string;
  is_default: boolean;
  total_invested: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  realized_pnl: number;
  holdings_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface AllocationBreakdown {
  name: string;
  value: number;
  percentage: number;
  holdings_count: number;
}

export interface HoldingItem {
  id: string;
  portfolio_id: string;
  user_id: string;
  symbol: string;
  company_name: string;
  asset_type: string;
  sector: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  invested_value: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  weight: number;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioDetail extends PortfolioSummary {
  holdings: HoldingItem[];
  asset_allocation: AllocationBreakdown[];
  sector_allocation: AllocationBreakdown[];
}

export interface FeatureImpact {
  feature: string;
  impact: number;
}

export interface QuantitativeMetrics {
  annualized_return: number;
  annualized_volatility: number;
  portfolio_beta: number;
  portfolio_sharpe_ratio: number;
  portfolio_sortino_ratio: number;
  portfolio_calmar_ratio: number;
  diversification_score: number;
  portfolio_max_drawdown: number;
  asset_count: number;
  sector_count: number;
}

export interface PortfolioAnalyticsResponse {
  portfolio_id: string;
  portfolio_name: string;
  total_invested: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  risk_category: string;
  confidence: number;
  probabilities: Record<string, number>;
  top_positive_contributors: FeatureImpact[];
  top_negative_contributors: FeatureImpact[];
  recommendations: string[];
  portfolio_health_score: number;
  quantitative_metrics: QuantitativeMetrics;
}

// Portfolio API methods
export async function getPortfolios(): Promise<PortfolioSummary[]> {
  return apiRequest<PortfolioSummary[]>("/api/v1/portfolios");
}

export async function getPortfolio(id: string): Promise<PortfolioDetail> {
  return apiRequest<PortfolioDetail>(`/api/v1/portfolios/${id}`);
}

export async function createPortfolio(data: {
  name: string;
  description?: string;
  currency?: string;
  is_default?: boolean;
}): Promise<PortfolioSummary> {
  return apiRequest<PortfolioSummary>("/api/v1/portfolios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePortfolio(
  id: string,
  data: {
    name?: string;
    description?: string;
    currency?: string;
    is_default?: boolean;
  }
): Promise<PortfolioSummary> {
  return apiRequest<PortfolioSummary>(`/api/v1/portfolios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePortfolio(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/portfolios/${id}`, {
    method: "DELETE",
  });
}

export async function getPortfolioAnalytics(id: string): Promise<PortfolioAnalyticsResponse> {
  return apiRequest<PortfolioAnalyticsResponse>(`/api/v1/portfolios/${id}/analytics`);
}

// Holdings API methods
export async function getHoldings(portfolioId: string): Promise<HoldingItem[]> {
  return apiRequest<HoldingItem[]>(`/api/v1/holdings?portfolio_id=${encodeURIComponent(portfolioId)}`);
}

export async function addHolding(data: {
  portfolio_id: string;
  symbol: string;
  company_name?: string;
  asset_type?: string;
  sector?: string;
  quantity: number;
  buy_price: number;
  current_price?: number;
  notes?: string;
}): Promise<HoldingItem> {
  return apiRequest<HoldingItem>("/api/v1/holdings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateHolding(
  holdingId: string,
  data: {
    quantity?: number;
    buy_price?: number;
    current_price?: number;
    sector?: string;
    asset_type?: string;
    notes?: string;
  }
): Promise<HoldingItem> {
  return apiRequest<HoldingItem>(`/api/v1/holdings/${holdingId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteHolding(holdingId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/holdings/${holdingId}`, {
    method: "DELETE",
  });
}

// Transactions API Types & methods
export interface TransactionItem {
  id: string;
  portfolio_id: string;
  user_id: string;
  symbol: string;
  company_name: string;
  transaction_type: "BUY" | "SELL";
  quantity: number;
  price: number;
  total_amount: number;
  asset_type: string;
  sector: string;
  transaction_date: string;
  notes?: string;
  created_at?: string;
}

export async function getTransactions(params?: {
  portfolio_id?: string;
  symbol?: string;
  transaction_type?: string;
  limit?: number;
}): Promise<TransactionItem[]> {
  const query = new URLSearchParams();
  if (params?.portfolio_id) query.append("portfolio_id", params.portfolio_id);
  if (params?.symbol) query.append("symbol", params.symbol);
  if (params?.transaction_type) query.append("transaction_type", params.transaction_type);
  if (params?.limit) query.append("limit", params.limit.toString());

  const queryString = query.toString();
  return apiRequest<TransactionItem[]>(`/api/v1/transactions${queryString ? `?${queryString}` : ""}`);
}

export async function createTransaction(data: {
  portfolio_id: string;
  symbol: string;
  company_name?: string;
  transaction_type: "BUY" | "SELL";
  quantity: number;
  price: number;
  asset_type?: string;
  sector?: string;
  transaction_date?: string;
  notes?: string;
}): Promise<TransactionItem> {
  return apiRequest<TransactionItem>("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/transactions/${id}`, {
    method: "DELETE",
  });
}

// Stock Directory API
export interface StockSearchItem {
  symbol: string;
  base_symbol: string;
  company_name: string;
  sector: string;
  asset_type: string;
  reference_price: number;
}

export async function searchStocks(query: string = ""): Promise<StockSearchItem[]> {
  return apiRequest<StockSearchItem[]>(`/api/v1/stocks/search?q=${encodeURIComponent(query)}`);
}

// Legacy Prediction & Recommendation API methods for compatibility
export interface PredictionHistoryItem {
  prediction_id: string;
  portfolio_id: string;
  risk_category: string;
  confidence: number;
  created_at: string;
}

export interface SavePredictionPayload {
  portfolio_id: string;
  portfolio_data: Record<string, number>;
  user_id?: string;
}

export interface RecommendationResponse {
  recommendations: string[];
  count: number;
}

export async function getRecommendations(
  portfolioData: Record<string, number>
): Promise<RecommendationResponse> {
  return apiRequest<RecommendationResponse>("/api/v1/recommendations", {
    method: "POST",
    body: JSON.stringify(portfolioData),
  });
}

export async function savePrediction(payload: SavePredictionPayload) {
  return apiRequest("/api/v1/predictions/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPredictionHistory(): Promise<PredictionHistoryItem[]> {
  return apiRequest<PredictionHistoryItem[]>("/api/v1/predictions");
}

// Command Center & Historical Performance API Types & Methods
export interface PulseMetrics {
  total_value: number;
  invested_capital: number;
  day_pnl: number;
  day_pnl_pct: number;
  total_pnl: number;
  total_roi_pct: number;
  realized_pnl: number;
  holdings_count: number;
  data_badge: "LIVE" | "DELAYED" | "REFERENCE" | "UNAVAILABLE";
}

export interface TopMover {
  symbol: string;
  company_name: string;
  quantity: number;
  current_price: number;
  day_change_pct: number;
  day_pnl_contribution: number;
  total_pnl: number;
  sector: string;
  weight: number;
}

export interface TopMoversGroup {
  gainers: TopMover[];
  losers: TopMover[];
}

export interface ConcentrationMetrics {
  largest_holding_symbol?: string;
  largest_holding_name?: string;
  largest_holding_pct: number;
  largest_holding_value: number;
  top_5_concentration_pct: number;
  sector_concentration_warning: boolean;
  overconcentrated_sector?: string;
  overconcentrated_sector_pct?: number;
}

export interface HealthCompactSummary {
  health_score: number;
  risk_category: string;
  confidence: number;
  diversification_score: number;
  volatility_label: string;
  sharpe_ratio: number;
  max_drawdown_label: string;
}

export interface CommandCenterOverviewResponse {
  portfolio: PortfolioSummary;
  pulse: PulseMetrics;
  top_movers: TopMoversGroup;
  concentration: ConcentrationMetrics;
  health: HealthCompactSummary;
  asset_allocation: AllocationBreakdown[];
  sector_allocation: AllocationBreakdown[];
  recent_activity: TransactionItem[];
  holdings: HoldingItem[];
}

export interface TimelinePoint {
  date: string;
  portfolio_value: number;
  invested_capital: number;
  portfolio_pnl: number;
  portfolio_return_pct: number;
  nifty_return_pct?: number;
}

export interface TimelinePerformanceResponse {
  portfolio_id: string;
  time_range: string;
  has_sufficient_history: boolean;
  data_badge: string;
  benchmark_status: "AVAILABLE" | "UNAVAILABLE";
  data_points: TimelinePoint[];
}

export interface PortfolioSnapshotResponse {
  id: string;
  portfolio_id: string;
  user_id: string;
  total_value: number;
  invested_capital: number;
  day_pnl: number;
  total_pnl: number;
  total_roi_pct: number;
  timestamp: string;
}

export async function getCommandCenter(portfolioId: string): Promise<CommandCenterOverviewResponse> {
  return apiRequest<CommandCenterOverviewResponse>(`/api/v1/portfolios/${portfolioId}/command-center`);
}

export async function getPerformanceTimeline(
  portfolioId: string,
  range: string = "ALL"
): Promise<TimelinePerformanceResponse> {
  return apiRequest<TimelinePerformanceResponse>(
    `/api/v1/portfolios/${portfolioId}/performance?range=${encodeURIComponent(range)}`
  );
}

export async function takePortfolioSnapshot(portfolioId: string): Promise<PortfolioSnapshotResponse> {
  return apiRequest<PortfolioSnapshotResponse>(`/api/v1/portfolios/${portfolioId}/snapshots`, {
    method: "POST",
  });
}

// NexFolio Intelligence Domain Types & API Methods
export interface ModelProvenance {
  model_name: string;
  model_version: string;
  feature_dataset_version: string;
  data_quality_badge: "REFERENCE" | "LIVE" | "DELAYED";
  analyzed_at: string;
  data_sufficiency_status: "READY" | "INSUFFICIENT_HISTORY" | "MARKET_DATA_UNAVAILABLE" | "MODEL_UNAVAILABLE";
  data_sufficiency_notes?: string;
}

export interface HumanReadableDriver {
  feature_key: string;
  feature_name: string;
  impact_score: number;
  direction: "RISK_MITIGATOR" | "RISK_AMPLIFIER";
  observed_value: number;
  benchmark_baseline: number;
  headline: string;
  narrative: string;
  contextual_effect: string;
}

export interface HealthScorePillar {
  name: string;
  score: number;
  max_score: number;
  rating: "EXCELLENT" | "GOOD" | "MODERATE" | "NEEDS_ATTENTION";
  description: string;
  key_metric_label: string;
  key_metric_value: string;
  scoring_logic?: string;
  formula?: string;
  inputs_observed?: Record<string, unknown>;
}

export interface HealthScorecard {
  overall_score: number;
  grade: string;
  pillars: HealthScorePillar[];
  summary: string;
}

export interface TraceableRecommendation {
  id: string;
  priority_rank: number;
  category: "SECTOR_REBALANCING" | "ASSET_DIVERSIFICATION" | "DEFENSIVE_ALLOCATION" | "VOLATILITY_MITIGATION";
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  trigger_condition: string;
  metric_name: string;
  metric_observed: string;
  metric_threshold: string;
  affected_holdings: string[];
  suggested_review_action: string;
}

export interface DecisionTimelinePoint {
  checkpoint_date: string;
  health_score: number;
  risk_category: string;
  primary_driver: string;
  portfolio_value: number;
}

export interface PortfolioIntelligenceResponse {
  portfolio_id: string;
  portfolio_name: string;
  provenance: ModelProvenance;
  risk_category: "LOW" | "MODERATE" | "HIGH";
  confidence: number;
  probabilities: Record<string, number>;
  health_scorecard: HealthScorecard;
  risk_mitigators: HumanReadableDriver[];
  risk_amplifiers: HumanReadableDriver[];
  recommendations: TraceableRecommendation[];
  quantitative_metrics: QuantitativeMetrics;
  ai_decision_timeline: DecisionTimelinePoint[];
  scenario_presets: Record<string, Record<string, number>>;
}

export interface SimulationMetricDelta {
  current_value: string;
  simulated_value: string;
  delta: string;
  direction: "IMPROVED" | "DEGRADED" | "UNCHANGED";
}

export interface WhatIfSimulationResponse {
  portfolio_id: string;
  validation_status: string;
  allocations_used: Record<string, number>;
  current_risk_category: string;
  simulated_risk_category: string;
  current_confidence: number;
  simulated_confidence: number;
  current_health_score: number;
  simulated_health_score: number;
  score_delta: number;
  risk_level_changed: boolean;
  metrics_comparison: Record<string, SimulationMetricDelta>;
  top_driver_shifts: HumanReadableDriver[];
  simulation_notes: string;
}

export async function getPortfolioIntelligence(portfolioId: string): Promise<PortfolioIntelligenceResponse> {
  return apiRequest<PortfolioIntelligenceResponse>(`/api/v1/portfolios/${portfolioId}/intelligence`);
}

export async function simulateWhatIfRisk(
  portfolioId: string,
  allocations: Record<string, number>
): Promise<WhatIfSimulationResponse> {
  return apiRequest<WhatIfSimulationResponse>(`/api/v1/portfolios/${portfolioId}/simulate`, {
    method: "POST",
    body: JSON.stringify({ simulated_allocations: allocations }),
  });
}

// NexFolio Markets & Watchlists Domain Types & API Methods
export interface MarketIndex {
  symbol: string;
  name: string;
  current_level: number;
  day_change: number;
  day_change_pct: number;
  sparkline: number[];
}

export interface SectorPerformanceItem {
  name: string;
  avg_change_pct: number;
  stocks_count: number;
  top_performer: string;
  top_performer_gain_pct: number;
}

export interface MarketPulse {
  mood: "BULLISH" | "BEARISH" | "NEUTRAL";
  advances_count: number;
  declines_count: number;
  unchanged_count: number;
  strongest_sector: string;
  strongest_sector_gain_pct: number;
  weakest_sector: string;
  weakest_sector_loss_pct: number;
  benchmark_trend: string;
}

export interface MarketStockItem {
  symbol: string;
  base_symbol: string;
  company_name: string;
  sector: string;
  current_price: number;
  day_change: number;
  day_change_pct: number;
  volume: number;
  high_52w: number;
  low_52w: number;
  pct_from_52w_high: number;
  market_cap_category: "Large Cap" | "Mid Cap" | "Small Cap";
  is_in_portfolio: boolean;
  portfolio_weight_pct?: number;
  is_in_watchlist: boolean;
}

export type MarketDataBadge = "LIVE" | "DELAYED" | "REFERENCE" | "FALLBACK_REFERENCE" | "UNAVAILABLE";
export type MarketSession = "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE" | "WEEKEND" | "HOLIDAY";

export interface MarketOverviewResponse {
  data_badge: MarketDataBadge | string;
  provider?: string;
  market_date: string;
  updated_at?: string;
  market_session?: MarketSession | string;
  is_stale?: boolean;
  fallback_reason?: string;
  pulse: MarketPulse;
  indices: MarketIndex[];
  top_gainers: MarketStockItem[];
  top_losers: MarketStockItem[];
  most_active: MarketStockItem[];
  sector_performance: SectorPerformanceItem[];
}

export interface MarketScreenerResponse {
  total_count: number;
  returned_count: number;
  data_badge: MarketDataBadge | string;
  provider?: string;
  updated_at?: string;
  market_session?: MarketSession | string;
  is_stale?: boolean;
  fallback_reason?: string;
  stocks: MarketStockItem[];
}

export interface StockPricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma_20?: number;
  sma_50?: number;
  daily_return?: number;
}

export interface PortfolioStockExposure {
  has_position: boolean;
  portfolio_id?: string;
  portfolio_name?: string;
  quantity: number;
  avg_buy_price: number;
  invested_capital: number;
  current_valuation: number;
  portfolio_weight_pct: number;
  unrealized_pnl: number;
  unrealized_roi_pct: number;
  realized_gain: number;
}

export interface StockDetailResponse {
  symbol: string;
  base_symbol: string;
  company_name: string;
  sector: string;
  asset_type: string;
  data_badge: MarketDataBadge | string;
  provider?: string;
  updated_at?: string;
  market_session?: MarketSession | string;
  is_stale?: boolean;
  fallback_reason?: string;
  current_price: number;
  day_change: number;
  day_change_pct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  high_52w: number;
  low_52w: number;
  position_in_52w_range_pct: number;
  beta: number;
  annualized_volatility: number;
  price_history: StockPricePoint[];
  portfolio_exposure: PortfolioStockExposure;
  is_in_watchlist: boolean;
  ai_risk_context: string;
}

export interface WatchlistResponse {
  id: string;
  user_id: string;
  name: string;
  symbols: string[];
  stocks: MarketStockItem[];
  total_valuation_reference: number;
  avg_day_change_pct: number;
  created_at: string;
  updated_at: string;
}

export async function getMarketOverview(): Promise<MarketOverviewResponse> {
  return apiRequest<MarketOverviewResponse>("/api/v1/markets/overview");
}

export async function getMarketStocks(params?: {
  query?: string;
  sector?: string;
  preset?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketScreenerResponse> {
  const queryParts: string[] = [];
  if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
  if (params?.sector) queryParts.push(`sector=${encodeURIComponent(params.sector)}`);
  if (params?.preset) queryParts.push(`preset=${encodeURIComponent(params.preset)}`);
  if (params?.sort_by) queryParts.push(`sort_by=${encodeURIComponent(params.sort_by)}`);
  if (params?.sort_order) queryParts.push(`sort_order=${encodeURIComponent(params.sort_order)}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.offset) queryParts.push(`offset=${params.offset}`);

  const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  return apiRequest<MarketScreenerResponse>(`/api/v1/markets/stocks${qs}`);
}

export async function getStockDetail(symbol: string, portfolioId?: string): Promise<StockDetailResponse> {
  const qs = portfolioId ? `?portfolio_id=${encodeURIComponent(portfolioId)}` : "";
  return apiRequest<StockDetailResponse>(`/api/v1/markets/stocks/${encodeURIComponent(symbol)}${qs}`);
}

export async function getWatchlists(): Promise<WatchlistResponse[]> {
  return apiRequest<WatchlistResponse[]>("/api/v1/watchlists");
}

export async function createWatchlist(name: string): Promise<WatchlistResponse> {
  return apiRequest<WatchlistResponse>("/api/v1/watchlists", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function toggleWatchlistSymbol(watchlistId: string, symbol: string): Promise<WatchlistResponse> {
  return apiRequest<WatchlistResponse>(`/api/v1/watchlists/${watchlistId}/toggle`, {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

export async function deleteWatchlist(watchlistId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/watchlists/${watchlistId}`, {
    method: "DELETE",
  });
}

// NexFolio Reports, Audit & Notifications Domain Types & API Methods
export interface PortfolioReportSummary {
  portfolio_id: string;
  portfolio_name: string;
  currency: string;
  total_valuation: number;
  invested_capital: number;
  total_unrealized_pnl: number;
  total_roi_pct: number;
  realized_gains: number;
  cash_balance: number;
  asset_count: number;
  top_holding_symbol: string;
  top_holding_weight_pct: number;
}

export interface ReportBenchmarkComparison {
  benchmark_name: string;
  data_badge: string;
  portfolio_roi_pct: number;
  benchmark_roi_pct: number;
  alpha_pct: number;
  portfolio_beta: number;
  annualized_volatility: number;
}

export interface ReportAssetAllocation {
  asset_type: string;
  valuation: number;
  weight_pct: number;
}

export interface ReportSectorAllocation {
  sector: string;
  valuation: number;
  weight_pct: number;
}

export interface ReportHoldingItem {
  symbol: string;
  base_symbol: string;
  company_name: string;
  sector: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  valuation: number;
  weight_pct: number;
  unrealized_pnl: number;
  unrealized_roi_pct: number;
}

export interface InvestorReportResponse {
  id: string;
  report_integrity_hash: string;
  report_version: string;
  portfolio_id: string;
  portfolio_name: string;
  generated_at: string;
  data_pedigree: string;
  provenance: ModelProvenance;
  summary: PortfolioReportSummary;
  benchmark: ReportBenchmarkComparison;
  risk_category: string;
  risk_confidence: number;
  health_scorecard: HealthScorecard;
  asset_allocation: ReportAssetAllocation[];
  sector_allocation: ReportSectorAllocation[];
  holdings: ReportHoldingItem[];
  risk_mitigators: HumanReadableDriver[];
  risk_amplifiers: HumanReadableDriver[];
  recommendations: TraceableRecommendation[];
  disclaimer: string;
}

export interface ReportListItem {
  id: string;
  report_integrity_hash: string;
  report_version: string;
  portfolio_id: string;
  portfolio_name: string;
  generated_at: string;
  total_valuation: number;
  risk_category: string;
  health_score: number;
  grade: string;
}

export interface AuditLogItem {
  id: string;
  user_id: string;
  portfolio_id?: string;
  event_type: string;
  timestamp: string;
  actor: string;
  source: string;
  model_version?: string;
  description: string;
  input_snapshot: Record<string, unknown>;
  result_summary: Record<string, unknown>;
}

export interface AuditLogListResponse {
  total_count: number;
  events: AuditLogItem[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  portfolio_id?: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  is_read: boolean;
  action_link?: string;
  created_at: string;
}

export interface NotificationListResponse {
  unread_count: number;
  total_count: number;
  notifications: NotificationItem[];
}

export async function getPortfolioReport(portfolioId: string): Promise<InvestorReportResponse> {
  return apiRequest<InvestorReportResponse>(`/api/v1/portfolios/${portfolioId}/report`);
}

export async function getHistoricalReports(portfolioId: string): Promise<ReportListItem[]> {
  return apiRequest<ReportListItem[]>(`/api/v1/portfolios/${portfolioId}/reports`);
}

export async function getReportById(reportId: string): Promise<InvestorReportResponse> {
  return apiRequest<InvestorReportResponse>(`/api/v1/reports/${reportId}`);
}

export async function getAuditLogs(portfolioId?: string): Promise<AuditLogListResponse> {
  const qs = portfolioId ? `?portfolio_id=${encodeURIComponent(portfolioId)}` : "";
  return apiRequest<AuditLogListResponse>(`/api/v1/audit-logs${qs}`);
}

export async function getNotifications(): Promise<NotificationListResponse> {
  return apiRequest<NotificationListResponse>("/api/v1/notifications");
}

export async function markNotificationRead(notificationId: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/v1/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(): Promise<{ status: string; marked_read_count: number }> {
  return apiRequest<{ status: string; marked_read_count: number }>("/api/v1/notifications/read-all", {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// 9. Indian Capital Gains & Tax Loss Harvesting Module (Income-tax Act, 2025)
// ---------------------------------------------------------------------------

export interface TaxRuleSet {
  rule_set_id: string;
  law: string;
  tax_year: string;
  effective_from: string;
  effective_to?: string;
  equity_stcg_rate: number;
  equity_ltcg_rate: number;
  section_112a_exemption: number;
  listed_equity_holding_period_months: number;
  unlisted_equity_holding_period_months: number;
  buyback_promoter_domestic_rate: number;
  buyback_promoter_other_rate: number;
  surcharge_ceiling_special_rates: number;
  cess_rate: number;
  loss_carryforward_years: number;
  statutory_notes: string;
}

export interface TaxLossBankItem {
  loss_type: "STCL" | "LTCL";
  available_amount: number;
  usable_against: string;
  oldest_source_tax_year: string;
  expiry_tax_year: string;
  days_to_expiry: number;
}

export interface TaxLossBank {
  total_available_stcl: number;
  total_available_ltcl: number;
  total_banked_loss: number;
  bank_items: TaxLossBankItem[];
}

export interface RealizedTradeLot {
  lot_id: string;
  transaction_id: string;
  buy_tx_id?: string;
  sell_tx_id?: string;
  symbol: string;
  company_name: string;
  buy_date: string;
  sell_date: string;
  holding_period_months: number;
  holding_period_days: number;
  quantity: number;
  buy_price: number;
  sell_price: number;
  cost_basis: number;
  sale_proceeds: number;
  realized_pnl: number;
  realized_pnl_pct: number;
  is_buyback: boolean;
  promoter_category: string;
  classification: string;
  base_tax_rate: number;
  stt_paid: number;
  rule_set_id: string;
}

export interface Section112ATracker {
  annual_threshold: number;
  gross_112a_gains: number;
  ltcl_absorbed: number;
  stcl_absorbed: number;
  net_112a_ltcg_before_exemption: number;
  threshold_consumed: number;
  threshold_remaining: number;
  taxable_112a_ltcg: number;
  estimated_112a_base_tax: number;
}

export interface CapitalGainsSchedule {
  tax_year: string;
  governing_law: string;
  gross_stcg: number;
  gross_stcl: number;
  stcl_setoff_against_stcg: number;
  net_stcg: number;
  taxable_stcg: number;
  estimated_stcg_base_tax: number;
  section_112a: Section112ATracker;
  buyback_proceeds: number;
  buyback_cost_basis: number;
  buyback_net_gain: number;
  buyback_base_tax: number;
  legacy_losses_absorbed: number;
  unabsorbed_stcl_to_bank: number;
  unabsorbed_ltcl_to_bank: number;
  total_base_tax: number;
  applicable_surcharge_rate: number;
  surcharge_amount: number;
  cess_rate: number;
  cess_amount: number;
  total_estimated_tax_liability: number;
}

export interface TaxLossHarvestingCandidate {
  holding_id?: string;
  symbol: string;
  company_name: string;
  sector: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  current_value: number;
  invested_amount: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  holding_period_months: number;
  holding_period_days: number;
  loss_classification: "POTENTIAL_STCL" | "POTENTIAL_LTCL";
  portfolio_weight_pct: number;
  harvestable_loss: number;
  allowable_setoff_amount: number;
  estimated_incremental_tax_saving: number;
  recommendation_rationale: string;
}

export interface TaxLossHarvestingAnalysis {
  total_unrealized_losses: number;
  short_term_harvestable_losses: number;
  long_term_harvestable_losses: number;
  total_estimated_potential_tax_reduction: number;
  post_harvest_estimated_tax_liability: number;
  candidates_count: number;
  candidates: TaxLossHarvestingCandidate[];
}

export interface TaxReportResponse {
  portfolio_id: string;
  portfolio_name: string;
  currency: string;
  generated_at: string;
  rule_set: TaxRuleSet;
  capital_gains: CapitalGainsSchedule;
  tax_loss_bank: TaxLossBank;
  loss_harvesting: TaxLossHarvestingAnalysis;
  realized_lots: RealizedTradeLot[];
  disclaimer: string;
}

export async function getPortfolioTaxReport(
  portfolioId: string,
  taxYear?: string
): Promise<TaxReportResponse> {
  const qs = taxYear ? `?tax_year=${encodeURIComponent(taxYear)}` : "";
  return apiRequest<TaxReportResponse>(`/api/v1/portfolios/${portfolioId}/tax-report${qs}`);
}

export async function getPortfolioTaxReportCSV(
  portfolioId: string,
  taxYear?: string
): Promise<string> {
  const qs = taxYear ? `?tax_year=${encodeURIComponent(taxYear)}` : "";
  const token = typeof window !== "undefined" ? localStorage.getItem("nexfolio_token") : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${baseUrl}/api/v1/portfolios/${portfolioId}/tax-report/export-csv${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error("Failed to export tax CSV");
  return res.text();
}