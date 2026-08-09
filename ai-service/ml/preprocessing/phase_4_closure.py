import os
import pandas as pd
import json

def close_phase_4(processed_dir, reports_dir):
    os.makedirs(reports_dir, exist_ok=True)
    
    input_parquet = os.path.join(processed_dir, "aligned_master_dataset.parquet")
    final_parquet = os.path.join(processed_dir, "master_market_dataset.parquet")
    
    print("Loading aligned temporal matrix...")
    df = pd.read_parquet(input_parquet)
    
    # 1. Resolve the 52 Suspicious Gaps (Localized Forward Fill)
    print("Applying localized interpolation to intra-period gaps...")
    # Group by ticker and ffill only the OHLC prices
    for col in ['open', 'high', 'low', 'close']:
        df[col] = df.groupby('ticker')[col].ffill()
    
    # Recalculate missing observations after fill
    remaining_missing = df[df['is_listed'] == 1]['close'].isna().sum()
    print(f"Post-interpolation remaining anomalies: {remaining_missing}")
    
    # 2. Generate Phase 4.4 Audit Reports
    print("Generating Data Quality & Integrity Reports...")
    
    # Sector Distribution
    sector_dist = df.groupby('sector')['ticker'].nunique().reset_index()
    sector_dist.columns = ['Sector', 'Company_Count']
    sector_dist.to_csv(os.path.join(reports_dir, "sector_distribution.csv"), index=False)
    
    # Company-Level Row Statistics (Active days only)
    company_stats = df[df['is_listed'] == 1].groupby('ticker').agg(
        Active_Trading_Days=('date', 'count'),
        First_Active_Date=('date', 'min'),
        Last_Active_Date=('date', 'max')
    ).reset_index()
    company_stats.to_csv(os.path.join(reports_dir, "company_level_statistics.csv"), index=False)
    
    # Memory Footprint
    mem_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)
    
    # 3. Generate Phase 4.5 Schema Definition
    print("Packaging AI-Ready Schema Definitions...")
    schema_def = {
        "dataset_name": "NexFolio AI-Ready Historical Market Database",
        "matrix_dimensions": {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "total_companies": int(df['ticker'].nunique()),
            "total_trading_days": int(df['date'].nunique())
        },
        "memory_footprint_mb": round(mem_mb, 2),
        "features": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "governance": {
            "pre_ipo_handling": "Preserved as NaN (is_listed = 0)",
            "intra_period_anomalies": "Localized grouped forward-fill applied"
        }
    }
    
    with open(os.path.join(reports_dir, "schema_definition.json"), 'w') as f:
        json.dump(schema_def, f, indent=4)
        
    # 4. Final Export
    print(f"Exporting final ML dataset to {final_parquet}...")
    df.to_parquet(final_parquet, index=False)
    
    print("\nPhase 4 successfully closed. Dataset is ready for Phase 5 (Feature Engineering).")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("preprocessing"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    PROCESSED_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "processed")
    REPORTS_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "reports")
    
    close_phase_4(PROCESSED_DIR, REPORTS_DIR)