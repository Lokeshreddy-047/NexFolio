import os
import pandas as pd
import numpy as np

def engineer_momentum_and_volume(features_dir):
    input_parquet = os.path.join(features_dir, "technical_features.parquet")
    output_parquet = os.path.join(features_dir, "momentum_volume_features.parquet")
    
    print("Loading technical features dataset...")
    df = pd.read_parquet(input_parquet)
    df = df.sort_values(by=['ticker', 'date']).reset_index(drop=True)
    
    print("Calculating Volume Features (Phase 5.13)...")
    df['volume_change'] = df.groupby('ticker')['volume'].pct_change()
    df['volume_sma_20'] = df.groupby('ticker')['volume'].transform(lambda x: x.rolling(window=20).mean())
    df['volume_ratio_20'] = np.where(df['volume_sma_20'] > 0, df['volume'] / df['volume_sma_20'], np.nan)
    df['volume_volatility'] = df.groupby('ticker')['volume_change'].transform(lambda x: x.rolling(window=20).std())
    
    print("Calculating Price-Action Features (Phase 5.14)...")
    # Prevent division by zero if close is 0 (rare, but mathematically safe)
    safe_close = np.where(df['close'] == 0, np.nan, df['close'])
    safe_open = np.where(df['open'] == 0, np.nan, df['open'])
    safe_low = np.where(df['low'] == 0, np.nan, df['low'])
    
    df['daily_range'] = (df['high'] - df['low']) / safe_close
    df['high_low_ratio'] = df['high'] / safe_low
    df['open_close_change'] = (df['close'] - df['open']) / safe_open
    df['close_open_ratio'] = df['close'] / safe_open
    
    # Shadows and Body (absolute values)
    df['upper_shadow'] = df['high'] - df[['open', 'close']].max(axis=1)
    df['lower_shadow'] = df[['open', 'close']].min(axis=1) - df['low']
    df['body_size'] = (df['close'] - df['open']).abs()
    
    print("Calculating Momentum Features (Phase 5.15)...")
    momentum_windows = [5, 10, 20, 60]
    for w in momentum_windows:
        # Momentum calculated as percentage difference from historical price
        df[f'momentum_{w}d'] = (df['close'] - df.groupby('ticker')['close'].shift(w)) / df.groupby('ticker')['close'].shift(w)
        
    print("Enforcing Phase 5 Data Governance (Masking pre-IPO data)...")
    vol_cols = ['volume_change', 'volume_sma_20', 'volume_ratio_20', 'volume_volatility']
    price_cols = ['daily_range', 'high_low_ratio', 'open_close_change', 'close_open_ratio', 'upper_shadow', 'lower_shadow', 'body_size']
    mom_cols = [f'momentum_{w}d' for w in momentum_windows]
    
    for col in vol_cols + price_cols + mom_cols:
        df.loc[df['is_listed'] == 0, col] = np.nan
        df[col] = df[col].astype('float32')
        
    print(f"Exporting progressively enriched dataset to {output_parquet}...")
    df.to_parquet(output_parquet, index=False)
    
    print("\nPhases 5.13 to 5.15 Complete: Momentum, Volume & Price-Action Engineering executed successfully.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("feature_engineering"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    
    engineer_momentum_and_volume(FEATURES_DIR)