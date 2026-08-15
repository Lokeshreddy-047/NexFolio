import os
import pandas as pd
import numpy as np

def engineer_returns(processed_dir, features_dir):
    os.makedirs(features_dir, exist_ok=True)
    
    input_parquet = os.path.join(processed_dir, "master_market_dataset.parquet")
    output_parquet = os.path.join(features_dir, "return_features.parquet")
    
    print("Loading audited master dataset...")
    df = pd.read_parquet(input_parquet)
    
    # Ensure strict chronological ordering for time-series math
    df = df.sort_values(by=['ticker', 'date']).reset_index(drop=True)
    
    print("Calculating daily and logarithmic returns...")
    df['daily_return'] = df.groupby('ticker')['close'].pct_change()
    df['log_return'] = np.log(df['close'] / df.groupby('ticker')['close'].shift(1))
    
    print("Calculating cumulative returns...")
    # Isolate the very first valid trading price for each ticker
    df['first_valid_price'] = df.groupby('ticker')['close'].transform(
        lambda x: x.bfill().iloc[0] if not x.isna().all() else np.nan
    )
    df['cumulative_return'] = (df['close'] / df['first_valid_price']) - 1
    df = df.drop(columns=['first_valid_price'])
    
    print("Calculating rolling temporal returns (5d, 20d, 60d, 252d)...")
    windows = [5, 20, 60, 252]
    for w in windows:
        df[f'return_{w}d'] = df.groupby('ticker')['close'].pct_change(periods=w)
        
    print("Enforcing Phase 5 Data Governance (Masking pre-IPO data)...")
    return_cols = [
        'daily_return', 'log_return', 'cumulative_return', 
        'return_5d', 'return_20d', 'return_60d', 'return_252d'
    ]
    
    for col in return_cols:
        # Strictly prevent returns calculating across NaN boundaries or pre-listing periods
        df.loc[df['is_listed'] == 0, col] = np.nan
        # Memory optimization
        df[col] = df[col].astype('float32')
        
    print(f"Exporting progressively enriched dataset to {output_parquet}...")
    df.to_parquet(output_parquet, index=False)
    
    print("\nPhase 5.1 Complete: Price & Return Engineering executed successfully.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("feature_engineering"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    PROCESSED_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "processed")
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    
    engineer_returns(PROCESSED_DIR, FEATURES_DIR)