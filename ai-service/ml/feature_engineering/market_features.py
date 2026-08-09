import os
import pandas as pd
import numpy as np

def engineer_market_features(features_dir):
    input_parquet = os.path.join(features_dir, "risk_features.parquet")
    output_parquet = os.path.join(features_dir, "market_features.parquet")
    
    print("Loading risk features dataset...")
    df = pd.read_parquet(input_parquet)
    df = df.sort_values(by=['ticker', 'date']).reset_index(drop=True)
    
    print("Calculating Equal-Weighted Market Returns (Phase 5.7 / 5.17)...")
    # Define the market proxy as the equal-weighted return of all listed NexFolio stocks
    market_returns = df[df['is_listed'] == 1].groupby('date')['daily_return'].mean().rename('market_return')
    df = df.merge(market_returns, on='date', how='left')
    
    # Calculate market variance and regime metrics on unique dates
    market_df = pd.DataFrame({'date': df['date'].unique()}).sort_values('date')
    market_df = market_df.merge(market_returns, on='date', how='left')
    
    windows = [30, 60, 252]
    print("Calculating Market Variance and Regime Volatility...")
    for w in windows:
        market_df[f'market_var_{w}d'] = market_df['market_return'].rolling(window=w).var()
        market_df[f'market_volatility_{w}d'] = np.sqrt(market_df[f'market_var_{w}d'])
        
    # Merge market metrics back into the main dataframe
    market_cols = ['date'] + [f'market_var_{w}d' for w in windows] + [f'market_volatility_{w}d' for w in windows]
    df = df.merge(market_df[market_cols], on='date', how='left')
    
    print("Calculating Stock Covariance and Beta (Phase 5.7)...")
    for w in windows:
        # Vectorized rolling covariance using groupby
        df[f'covar_{w}d'] = df.groupby('ticker').apply(
            lambda x: x['daily_return'].rolling(window=w).cov(x['market_return'])
        ).reset_index(level=0, drop=True)
        
        # Beta = Cov(Ri, Rm) / Var(Rm)
        df[f'beta_{w}d'] = df[f'covar_{w}d'] / df[f'market_var_{w}d']
        
    print("Cleaning temporary engineering columns...")
    drop_cols = [f'market_var_{w}d' for w in windows] + [f'covar_{w}d' for w in windows]
    df = df.drop(columns=drop_cols)
    
    print("Enforcing Phase 5 Data Governance (Masking pre-IPO data)...")
    beta_cols = [f'beta_{w}d' for w in windows]
    regime_cols = ['market_return'] + [f'market_volatility_{w}d' for w in windows]
    
    for col in beta_cols + regime_cols:
        df.loc[df['is_listed'] == 0, col] = np.nan
        df[col] = df[col].astype('float32')
        
    print(f"Exporting progressively enriched dataset to {output_parquet}...")
    df.to_parquet(output_parquet, index=False)
    
    print("\nPhases 5.7 & 5.17 Complete: Beta, Market Sensitivity & Regime Engineering executed successfully.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("feature_engineering"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    
    engineer_market_features(FEATURES_DIR)