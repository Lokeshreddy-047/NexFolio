import os
import pandas as pd
import numpy as np

def engineer_beta_and_risk_scoring(features_dir, portfolio_dir):
    ts_parquet = os.path.join(portfolio_dir, "portfolio_timeseries.parquet")
    adv_metrics_parquet = os.path.join(portfolio_dir, "portfolio_advanced_metrics.parquet")
    div_parquet = os.path.join(portfolio_dir, "diversification_report.parquet")
    feature_parquet = os.path.join(features_dir, "feature_store.parquet")
    final_output = os.path.join(portfolio_dir, "portfolio_risk_summary.parquet")
    
    print("Loading Time-Series, Advanced Metrics, and Diversification Data...")
    port_ts = pd.read_parquet(ts_parquet)
    metrics_df = pd.read_parquet(adv_metrics_parquet)
    div_df = pd.read_parquet(div_parquet)
    
    print("Extracting Market Benchmark from Phase 5 Feature Store...")
    market_df = pd.read_parquet(feature_parquet, columns=['date', 'market_return']).drop_duplicates()
    
    print("Phase 6.9: Executing Portfolio Beta Engine...")
    # Merge market returns onto portfolio time-series
    port_ts = port_ts.merge(market_df, on='date', how='left')
    
    # Calculate Beta = Cov(Rp, Rm) / Var(Rm)
    market_var = port_ts['market_return'].var()
    
    def calculate_beta(group):
        if market_var == 0:
            return np.nan
        covar = group['portfolio_daily_return'].cov(group['market_return'])
        return covar / market_var
        
    beta_df = port_ts.groupby('portfolio_id').apply(calculate_beta, include_groups=False).rename('portfolio_beta').reset_index()
    
    print("Phase 6.10: Executing Risk Scoring Engine...")
    # Consolidate all metrics into the final master dataframe
    final_df = metrics_df.merge(div_df, on='portfolio_id', how='left')
    final_df = final_df.merge(beta_df, on='portfolio_id', how='left')
    
    # Define Risk Categories based on Roadmap Rules
    volatility = final_df['annualized_volatility']
    hhi = final_df['hhi']
    
    conditions = [
        (volatility < 0.15) & (hhi < 0.15),
        (volatility > 0.25) | (hhi > 0.25)
    ]
    choices = ['LOW', 'HIGH']
    final_df['risk_category'] = np.select(conditions, choices, default='MEDIUM')
    
    # Map numerical Risk Score (1 to 10 scale for frontend UI interpolation)
    # Scaled roughly off volatility: higher volatility = higher risk score
    # Capped strictly between 1 and 10
    raw_score = (volatility * 100) / 3.0  # e.g., 15% vol -> Score 5
    final_df['risk_score'] = np.clip(raw_score, 1, 10).round(1)
    
    print("Generating Actionable Warning Flags...")
    final_df['concentration_warning'] = np.where(final_df['hhi'] > 0.25, 1, 0).astype('int8')
    final_df['volatility_warning'] = np.where(final_df['annualized_volatility'] > 0.25, 1, 0).astype('int8')
    final_df['diversification_warning'] = np.where(final_df['asset_count'] < 10, 1, 0).astype('int8')
    
    print(f"Exporting Ultimate Portfolio Risk Summary to {final_output}...")
    final_df.to_parquet(final_output, index=False)
    
    print("\n=========================================================================")
    print(f"Phases 6.9 & 6.10 Complete. Final Intelligence generated for {len(final_df)} portfolios.")
    print("=========================================================================")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("portfolio_analytics"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    PORTFOLIO_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "portfolio")
    
    engineer_beta_and_risk_scoring(FEATURES_DIR, PORTFOLIO_DIR)