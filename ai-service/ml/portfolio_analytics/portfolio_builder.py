import os
import pandas as pd
import numpy as np

def build_portfolios(features_dir, portfolio_dir, num_portfolios=1000):
    os.makedirs(portfolio_dir, exist_ok=True)
    
    feature_path = os.path.join(features_dir, "feature_store.parquet")
    print("Loading Phase 5 Feature Store for universe extraction...")
    
    # We only need the latest date to determine current market values
    df = pd.read_parquet(feature_path, columns=['date', 'ticker', 'sector', 'close'])
    latest_date = df['date'].max()
    latest_df = df[df['date'] == latest_date].copy()
    
    universe = latest_df['ticker'].unique()
    sector_map = dict(zip(latest_df['ticker'], latest_df['sector']))
    price_map = dict(zip(latest_df['ticker'], latest_df['close']))
    
    print(f"Phase 6.1: Generating {num_portfolios} synthetic portfolios...")
    # Lock seed for academic reproducibility
    np.random.seed(42) 
    
    holdings = []
    for i in range(1, num_portfolios + 1):
        port_id = f"PORT_{i:04d}"
        # Portfolios will have between 5 and 20 holdings
        num_assets = np.random.randint(5, 21) 
        selected_tickers = np.random.choice(universe, size=num_assets, replace=False)
        
        for ticker in selected_tickers:
            quantity = np.random.randint(10, 1000)
            latest_price = price_map[ticker]
            # Simulate historical purchase price between -20% and +20% of current price
            purchase_price = latest_price * np.random.uniform(0.8, 1.2) 
            
            holdings.append({
                'portfolio_id': port_id,
                'ticker': ticker,
                'quantity': quantity,
                'purchase_price': round(purchase_price, 2),
                'purchase_date': '2025-01-01', # Mock schema compliance
                'sector': sector_map[ticker],
                'latest_price': latest_price
            })
            
    holdings_df = pd.DataFrame(holdings)
    
    raw_schema_path = os.path.join(portfolio_dir, "sample_portfolios.csv")
    print(f"Exporting Phase 6.1 Raw Schema to {raw_schema_path}...")
    schema_cols = ['portfolio_id', 'ticker', 'quantity', 'purchase_price', 'purchase_date', 'sector']
    holdings_df[schema_cols].to_csv(raw_schema_path, index=False)
    
    print("Phase 6.2: Executing Portfolio Construction Engine...")
    # Step 1: Current Market Value
    holdings_df['market_value'] = holdings_df['quantity'] * holdings_df['latest_price']
    
    # Step 2: Total Portfolio Value
    port_totals = holdings_df.groupby('portfolio_id')['market_value'].sum().rename('total_portfolio_value')
    holdings_df = holdings_df.merge(port_totals, on='portfolio_id')
    
    # Step 3: Compute normalized weights
    holdings_df['weight'] = holdings_df['market_value'] / holdings_df['total_portfolio_value']
    
    # Validation Check: Ensure weights sum perfectly to 1.0
    weight_check = holdings_df.groupby('portfolio_id')['weight'].sum()
    assert np.allclose(weight_check, 1.0), "CRITICAL MATH ERROR: Weights do not sum to 1.0!"
    print("Validation Passed: All portfolio weights successfully normalized to sum to 1.0000.")
    
    allocation_path = os.path.join(portfolio_dir, "allocation_report.parquet")
    print(f"Exporting Phase 6.2 Construction Report to {allocation_path}...")
    holdings_df.to_parquet(allocation_path, index=False)
    
    print(f"\nPhases 6.1 & 6.2 Complete. Generated {num_portfolios} portfolios encompassing {len(holdings_df)} individual holding records.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("portfolio_analytics"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    PORTFOLIO_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "portfolio")
    
    build_portfolios(FEATURES_DIR, PORTFOLIO_DIR)