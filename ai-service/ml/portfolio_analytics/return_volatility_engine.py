import os
import pandas as pd
import numpy as np

def engineer_return_and_volatility(features_dir, portfolio_dir):
    alloc_parquet = os.path.join(portfolio_dir, "allocation_report.parquet")
    feature_parquet = os.path.join(features_dir, "feature_store.parquet")
    
    ts_output = os.path.join(portfolio_dir, "portfolio_timeseries.parquet")
    metrics_output = os.path.join(portfolio_dir, "portfolio_base_metrics.parquet")
    
    print("Loading Allocation Report and Feature Store...")
    alloc_df = pd.read_parquet(alloc_parquet)
    
    # We only need dates, tickers, and returns from the massive feature store
    feature_df = pd.read_parquet(feature_parquet, columns=['date', 'ticker', 'daily_return'])
    
    print("Phase 6.5: Reconstructing Portfolio Time-Series...")
    # Filter features to only include active tickers in our synthetic portfolios
    active_tickers = alloc_df['ticker'].unique()
    feature_df = feature_df[feature_df['ticker'].isin(active_tickers)]
    
    # Fill missing historical returns with 0 to simulate cash drag before an asset IPO
    feature_df['daily_return'] = feature_df['daily_return'].fillna(0)
    
    # Merge weights with daily returns
    merged_df = pd.merge(alloc_df[['portfolio_id', 'ticker', 'weight']], feature_df, on='ticker', how='inner')
    merged_df['weighted_return'] = merged_df['weight'] * merged_df['daily_return']
    
    # Sum weighted returns grouped by Portfolio and Date
    port_ts = merged_df.groupby(['portfolio_id', 'date'])['weighted_return'].sum().reset_index()
    port_ts = port_ts.rename(columns={'weighted_return': 'portfolio_daily_return'})
    port_ts = port_ts.sort_values(by=['portfolio_id', 'date']).reset_index(drop=True)
    
    # Calculate Cumulative Return
    port_ts['portfolio_cumulative_return'] = port_ts.groupby('portfolio_id')['portfolio_daily_return'].transform(
        lambda x: (1 + x).cumprod() - 1
    )
    
    print("Phase 6.6: Executing Portfolio Volatility Engine...")
    # Calculate rolling volatility metrics mathematically equivalent to rolling covariance
    port_ts['rolling_volatility_30d'] = port_ts.groupby('portfolio_id')['portfolio_daily_return'].transform(
        lambda x: x.rolling(30).std() * np.sqrt(252)
    )
    port_ts['rolling_volatility_60d'] = port_ts.groupby('portfolio_id')['portfolio_daily_return'].transform(
        lambda x: x.rolling(60).std() * np.sqrt(252)
    )
    port_ts['rolling_volatility_252d'] = port_ts.groupby('portfolio_id')['portfolio_daily_return'].transform(
        lambda x: x.rolling(252).std() * np.sqrt(252)
    )
    
    print(f"Exporting Phase 6.5 Time-Series to {ts_output}...")
    port_ts.to_parquet(ts_output, index=False)
    
    print("Aggregating Global Return & Volatility Horizons...")
    # Base portfolio metrics aggregation
    port_metrics = port_ts.groupby('portfolio_id').agg(
        trading_days=('date', 'count'),
        mean_daily_return=('portfolio_daily_return', 'mean'),
        portfolio_volatility_daily=('portfolio_daily_return', 'std'),
        total_return=('portfolio_cumulative_return', 'last')
    ).reset_index()
    
    port_metrics['annualized_return'] = port_metrics['mean_daily_return'] * 252
    port_metrics['annualized_volatility'] = port_metrics['portfolio_volatility_daily'] * np.sqrt(252)
    
    # Calculate specific time horizons (21d = 1M, 63d = 3M, 126d = 6M, 252d = 1Y)
    def calc_horizon(group, days):
        if len(group) < days:
            return np.nan
        return np.prod(1 + group.tail(days)) - 1
        
    horizons = {
        'return_1M': 21,
        'return_3M': 63,
        'return_6M': 126,
        'return_1Y': 252
    }
    
    for h_name, h_days in horizons.items():
        horizon_returns = port_ts.groupby('portfolio_id')['portfolio_daily_return'].apply(
            lambda x: calc_horizon(x, h_days)
        ).rename(h_name).reset_index()
        port_metrics = port_metrics.merge(horizon_returns, on='portfolio_id')
        
    # Drop temp columns
    port_metrics = port_metrics.drop(columns=['mean_daily_return', 'portfolio_volatility_daily'])
    
    print(f"Exporting Phase 6.6 Base Metrics to {metrics_output}...")
    port_metrics.to_parquet(metrics_output, index=False)
    
    print(f"\nPhases 6.5 & 6.6 Complete. Successfully mapped time-series and volatility constraints for {len(port_metrics)} portfolios.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("portfolio_analytics"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    PORTFOLIO_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "portfolio")
    
    engineer_return_and_volatility(FEATURES_DIR, PORTFOLIO_DIR)