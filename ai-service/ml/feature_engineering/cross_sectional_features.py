import os
import pandas as pd
import numpy as np

def engineer_cross_sectional_features(features_dir):
    input_parquet = os.path.join(features_dir, "momentum_volume_features.parquet")
    output_parquet = os.path.join(features_dir, "cross_sectional_features.parquet")
    
    print("Loading momentum & volume features dataset...")
    df = pd.read_parquet(input_parquet)
    df = df.sort_values(by=['ticker', 'date']).reset_index(drop=True)
    
    # Filter only active listed days for cross-sectional math to prevent NaN skewing
    active_mask = df['is_listed'] == 1
    
    print("Calculating Sector-Level Features (Phase 5.16)...")
    # Calculate daily sector means
    sector_daily = df[active_mask].groupby(['date', 'sector']).agg(
        sector_return=('daily_return', 'mean'),
        sector_volatility_30d=('volatility_30d', 'mean')
    ).reset_index()
    
    df = df.merge(sector_daily, on=['date', 'sector'], how='left')
    
    # Calculate relative performance
    df['sector_relative_return'] = df['daily_return'] - df['sector_return']
    
    print("Calculating Cross-Sectional Ranks & Percentiles (Phase 5.18)...")
    # Calculate cross-sectional percentiles per day (0.0 to 1.0)
    def calculate_percentiles(group):
        group['daily_return_percentile'] = group['daily_return'].rank(pct=True)
        group['volatility_percentile'] = group['volatility_30d'].rank(pct=True)
        group['momentum_percentile'] = group['momentum_20d'].rank(pct=True)
        group['volume_rank'] = group['volume'].rank(pct=True)
        return group
        
    # Apply percentile calculation only to active rows, then merge back
    active_df = df[active_mask].copy()
    active_df = active_df.groupby('date', group_keys=False).apply(calculate_percentiles)
    
    rank_cols = ['daily_return_percentile', 'volatility_percentile', 'momentum_percentile', 'volume_rank']
    df = df.merge(active_df[['date', 'ticker'] + rank_cols], on=['date', 'ticker'], how='left')
    
    print("Enforcing Phase 5 Data Governance (Masking pre-IPO data)...")
    sector_cols = ['sector_return', 'sector_volatility_30d', 'sector_relative_return']
    
    for col in sector_cols + rank_cols:
        df.loc[~active_mask, col] = np.nan
        df[col] = df[col].astype('float32')
        
    print(f"Exporting progressively enriched dataset to {output_parquet}...")
    df.to_parquet(output_parquet, index=False)
    
    print("\nPhases 5.16 & 5.18 Complete: Sector & Cross-Sectional Engineering executed successfully.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("feature_engineering"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    
    engineer_cross_sectional_features(FEATURES_DIR)