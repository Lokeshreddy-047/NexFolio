import os
import pandas as pd
import numpy as np

def engineer_volatility(features_dir):
    input_parquet = os.path.join(features_dir, "return_features.parquet")
    output_parquet = os.path.join(features_dir, "volatility_features.parquet")
    
    print("Loading return features dataset...")
    df = pd.read_parquet(input_parquet)
    
    df = df.sort_values(by=['ticker', 'date']).reset_index(drop=True)
    
    print("Calculating rolling volatility (7d, 14d, 30d, 60d, 90d, 252d)...")
    windows = [7, 14, 30, 60, 90, 252]
    
    for w in windows:
        df[f'volatility_{w}d'] = df.groupby('ticker')['daily_return'].transform(
            lambda x: x.rolling(window=w).std()
        )
        
    print("Calculating annualized volatility...")
    df['annualized_volatility'] = df['volatility_252d'] * np.sqrt(252)
    
    print("Enforcing Phase 5 Data Governance (Masking pre-IPO data)...")
    vol_cols = [f'volatility_{w}d' for w in windows] + ['annualized_volatility']
    
    for col in vol_cols:
        df.loc[df['is_listed'] == 0, col] = np.nan
        df[col] = df[col].astype('float32')
        
    print(f"Exporting progressively enriched dataset to {output_parquet}...")
    df.to_parquet(output_parquet, index=False)
    
    print("\nPhase 5.2 Complete: Volatility Engineering executed successfully.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("feature_engineering"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    
    engineer_volatility(FEATURES_DIR)