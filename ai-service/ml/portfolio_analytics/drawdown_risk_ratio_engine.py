import os
import pandas as pd
import numpy as np

def engineer_drawdowns_and_ratios(portfolio_dir, rf_annual=0.06):
    ts_parquet = os.path.join(portfolio_dir, "portfolio_timeseries.parquet")
    base_metrics_parquet = os.path.join(portfolio_dir, "portfolio_base_metrics.parquet")
    adv_metrics_parquet = os.path.join(portfolio_dir, "portfolio_advanced_metrics.parquet")
    
    print(f"Loading Time-Series and Base Metrics (Risk-Free Rate: {rf_annual*100}%)...")
    port_ts = pd.read_parquet(ts_parquet)
    metrics_df = pd.read_parquet(base_metrics_parquet)
    
    rf_daily = rf_annual / 252
    
    print("Phase 6.7: Executing Portfolio Drawdown Engine...")
    # Convert cumulative return to an absolute portfolio value index (starting at 1.0)
    port_ts['portfolio_value'] = 1 + port_ts['portfolio_cumulative_return']
    
    # Global Drawdown
    port_ts['running_peak'] = port_ts.groupby('portfolio_id')['portfolio_value'].cummax()
    port_ts['portfolio_drawdown'] = (port_ts['portfolio_value'] - port_ts['running_peak']) / port_ts['running_peak']
    
    # Extract Max Drawdowns per portfolio
    max_dd = port_ts.groupby('portfolio_id')['portfolio_drawdown'].min().rename('portfolio_max_drawdown').reset_index()
    
    # Rolling Drawdowns (30d and 252d)
    print("Calculating Rolling Drawdowns...")
    peak_30 = port_ts.groupby('portfolio_id')['portfolio_value'].transform(lambda x: x.rolling(30).max())
    port_ts['rolling_drawdown_30d'] = (port_ts['portfolio_value'] - peak_30) / peak_30
    max_dd_30 = port_ts.groupby('portfolio_id')['rolling_drawdown_30d'].min().rename('rolling_max_drawdown_30d').reset_index()
    
    peak_252 = port_ts.groupby('portfolio_id')['portfolio_value'].transform(lambda x: x.rolling(252).max())
    port_ts['rolling_drawdown_252d'] = (port_ts['portfolio_value'] - peak_252) / peak_252
    max_dd_252 = port_ts.groupby('portfolio_id')['rolling_drawdown_252d'].min().rename('rolling_max_drawdown_252d').reset_index()
    
    print("Phase 6.8: Executing Risk-Adjusted Ratio Engine...")
    # Downside Deviation math (only penalize returns strictly below the daily RF rate)
    port_ts['downside_sq'] = np.where(
        port_ts['portfolio_daily_return'] < rf_daily, 
        (port_ts['portfolio_daily_return'] - rf_daily)**2, 
        0
    )
    downside_var = port_ts.groupby('portfolio_id')['downside_sq'].mean()
    downside_dev = (np.sqrt(downside_var) * np.sqrt(252)).rename('downside_deviation_annualized').reset_index()
    
    # Update time-series to drop temporary columns, then save
    port_ts = port_ts.drop(columns=['portfolio_value', 'running_peak', 'downside_sq'])
    port_ts.to_parquet(ts_parquet, index=False)
    
    print("Merging Risk Metrics into Advanced Analytics Profile...")
    metrics_df = metrics_df.merge(max_dd, on='portfolio_id')
    metrics_df = metrics_df.merge(max_dd_30, on='portfolio_id')
    metrics_df = metrics_df.merge(max_dd_252, on='portfolio_id')
    metrics_df = metrics_df.merge(downside_dev, on='portfolio_id')
    
    # Calculate Institutional Ratios
    metrics_df['portfolio_sharpe_ratio'] = (metrics_df['annualized_return'] - rf_annual) / metrics_df['annualized_volatility']
    
    metrics_df['portfolio_sortino_ratio'] = np.where(
        metrics_df['downside_deviation_annualized'] != 0,
        (metrics_df['annualized_return'] - rf_annual) / metrics_df['downside_deviation_annualized'],
        np.nan
    )
    
    metrics_df['portfolio_calmar_ratio'] = np.where(
        metrics_df['portfolio_max_drawdown'] != 0,
        metrics_df['annualized_return'] / metrics_df['portfolio_max_drawdown'].abs(),
        np.nan
    )
    
    print(f"Exporting Phase 6.7 & 6.8 Advanced Metrics to {adv_metrics_parquet}...")
    metrics_df.to_parquet(adv_metrics_parquet, index=False)
    
    print(f"\nPhases 6.7 & 6.8 Complete. Drawdowns and Risk Ratios successfully mapped for {len(metrics_df)} portfolios.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("portfolio_analytics"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    PORTFOLIO_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "portfolio")
    
    engineer_drawdowns_and_ratios(PORTFOLIO_DIR)