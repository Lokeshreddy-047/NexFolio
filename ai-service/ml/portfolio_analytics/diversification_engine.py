import os
import pandas as pd
import numpy as np

def engineer_diversification(portfolio_dir):
    input_parquet = os.path.join(portfolio_dir, "allocation_report.parquet")
    output_parquet = os.path.join(portfolio_dir, "diversification_report.parquet")
    
    print("Loading Phase 6.2 Allocation Report...")
    df = pd.read_parquet(input_parquet)
    
    print("Phase 6.3: Executing Allocation Analytics Engine...")
    # 1. Sector Allocation Pivot
    sector_group = df.groupby(['portfolio_id', 'sector'])['weight'].sum().reset_index()
    sector_pivot = sector_group.pivot(index='portfolio_id', columns='sector', values='weight').fillna(0)
    
    # Format sector column names for database storage (e.g., 'Financial Services' -> 'sector_financial_services_pct')
    sector_pivot.columns = [f"sector_{str(col).lower().replace(' ', '_').replace('-', '_')}_pct" for col in sector_pivot.columns]
    
    # Identify the maximum sector exposure per portfolio
    largest_sector_pct = sector_group.groupby('portfolio_id')['weight'].max().rename('largest_sector_pct')
    sector_count = df.groupby('portfolio_id')['sector'].nunique().rename('sector_count')
    
    print("Phase 6.4: Executing Diversification Intelligence Engine (HHI)...")
    # Asset counts
    asset_count = df.groupby('portfolio_id')['ticker'].nunique().rename('asset_count')
    
    # Herfindahl-Hirschman Index (Sum of squared weights)
    df['weight_sq'] = df['weight'] ** 2
    hhi = df.groupby('portfolio_id')['weight_sq'].sum().rename('hhi')
    
    # Top Holdings Exposure
    df_sorted = df.sort_values(by=['portfolio_id', 'weight'], ascending=[True, False])
    top_3 = df_sorted.groupby('portfolio_id').head(3).groupby('portfolio_id')['weight'].sum().rename('top_3_holdings_pct')
    top_5 = df_sorted.groupby('portfolio_id').head(5).groupby('portfolio_id')['weight'].sum().rename('top_5_holdings_pct')
    
    print("Fusing portfolio metrics and computing Diversification Score...")
    metrics_df = pd.DataFrame({
        'asset_count': asset_count,
        'sector_count': sector_count,
        'largest_sector_pct': largest_sector_pct,
        'top_3_holdings_pct': top_3,
        'top_5_holdings_pct': top_5,
        'hhi': hhi
    }).join(sector_pivot).reset_index()
    
    # HHI Interpretation Logic
    conditions = [
        (metrics_df['hhi'] < 0.15),
        (metrics_df['hhi'] >= 0.15) & (metrics_df['hhi'] <= 0.25),
        (metrics_df['hhi'] > 0.25)
    ]
    choices = ['Well diversified', 'Moderate concentration', 'Highly concentrated']
    metrics_df['diversification_category'] = np.select(conditions, choices, default='Unknown')
    
    # Diversification Score (0-100 scale, inversely proportional to HHI)
    # A perfectly diversified portfolio (HHI near 0) approaches 100
    metrics_df['diversification_score'] = np.clip((1.0 - metrics_df['hhi']) * 100, 0, 100).round(2)
    
    print(f"Exporting Phase 6.3 & 6.4 Diversification Report to {output_parquet}...")
    metrics_df.to_parquet(output_parquet, index=False)
    
    print(f"\nPhases 6.3 & 6.4 Complete. Generated intelligence for {len(metrics_df)} portfolios.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("portfolio_analytics"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    PORTFOLIO_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "portfolio")
    
    engineer_diversification(PORTFOLIO_DIR)