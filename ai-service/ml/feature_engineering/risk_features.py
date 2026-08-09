import os
import pandas as pd
import numpy as np

def engineer_risk_metrics(features_dir, rf_annual=0.06):
    input_parquet = os.path.join(features_dir, "volatility_features.parquet")
    output_parquet = os.path.join(features_dir, "risk_features.parquet")
    
    print(f"Loading volatility features dataset... (Risk-Free Rate: {rf_annual*100}%)")
    df = pd.read_parquet(input_parquet)
    df = df.sort_values(by=['ticker', 'date']).reset_index(drop=True)
    
    rf_daily = rf_annual / 252
    windows = [30, 60, 252]
    
    print("Calculating Downside Deviation (Phase 5.3)...")
    df['temp_downside_sq'] = np.where((df['daily_return'] - rf_daily) < 0, (df['daily_return'] - rf_daily)**2, 0)
    for w in windows:
        df[f'downside_deviation_{w}d'] = df.groupby('ticker')['temp_downside_sq'].transform(
            lambda x: np.sqrt(x.rolling(window=w).mean())
        )
        
    print("Calculating Maximum Drawdowns (Phase 5.4)...")
    df['cumulative_max'] = df.groupby('ticker')['close'].cummax()
    df['drawdown'] = (df['close'] - df['cumulative_max']) / df['cumulative_max']
    
    for w in windows:
        rolling_peak = df.groupby('ticker')['close'].transform(lambda x: x.rolling(window=w).max())
        current_dd = (df['close'] - rolling_peak) / rolling_peak
        df[f'rolling_max_drawdown_{w}d'] = df.groupby('ticker')[current_dd.name].transform(
            lambda x: x.rolling(window=w).min()
        )
        
    print("Calculating Sharpe & Sortino Ratios (Phase 5.5 & 5.6)...")
    df['temp_excess_return'] = df['daily_return'] - rf_daily
    for w in windows:
        rolling_mean_excess = df.groupby('ticker')['temp_excess_return'].transform(
            lambda x: x.rolling(window=w).mean()
        )
        
        # Sharpe = (Mean Excess Return / Volatility) * sqrt(252)
        df[f'sharpe_{w}d'] = (rolling_mean_excess / df[f'volatility_{w}d']) * np.sqrt(252)
        
        # Sortino = (Mean Excess Return / Downside Deviation) * sqrt(252)
        # We use np.where to prevent division by zero if downside deviation is exactly 0
        df[f'sortino_{w}d'] = np.where(
            df[f'downside_deviation_{w}d'] != 0,
            (rolling_mean_excess / df[f'downside_deviation_{w}d']) * np.sqrt(252),
            np.nan
        )

    print("Cleaning temporary engineering columns...")
    df = df.drop(columns=['temp_downside_sq', 'cumulative_max', 'temp_excess_return'])
    
    print("Enforcing Phase 5 Data Governance (Masking pre-IPO data)...")
    new_risk_cols = ['drawdown']
    for w in windows:
        new_risk_cols.extend([f'downside_deviation_{w}d', f'rolling_max_drawdown_{w}d', f'sharpe_{w}d', f'sortino_{w}d'])
        
    for col in new_risk_cols:
        df.loc[df['is_listed'] == 0, col] = np.nan
        df[col] = df[col].astype('float32')
        
    print(f"Exporting progressively enriched dataset to {output_parquet}...")
    df.to_parquet(output_parquet, index=False)
    
    print("\nPhases 5.3 to 5.6 Complete: Downside Risk & Ratio Engineering executed successfully.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("feature_engineering"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    
    engineer_risk_metrics(FEATURES_DIR)