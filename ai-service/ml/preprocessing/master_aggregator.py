import os
import json
import pandas as pd

def aggregate_master_dataset(processed_dir, reports_dir, cleaned_dir, inventory_path, mapping_path):
    os.makedirs(cleaned_dir, exist_ok=True)
    
    # Load Sector Mapping
    with open(mapping_path, 'r') as f:
        sector_mapping = json.load(f)

    # Filter strictly for validated datasets
    inventory_df = pd.read_csv(inventory_path)
    valid_tickers = inventory_df[inventory_df['status'] == 'valid']['ticker'].tolist()
    
    df_list = []
    print(f"Initiating aggregation for {len(valid_tickers)} validated tickers...")

    for ticker in valid_tickers:
        file_path = os.path.join(processed_dir, f"{ticker}_normalized.csv")
        
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            
            # Apply optimized numeric dtypes
            df['open'] = df['open'].astype('float32')
            df['high'] = df['high'].astype('float32')
            df['low'] = df['low'].astype('float32')
            df['close'] = df['close'].astype('float32')
            df['volume'] = df['volume'].astype('int64')
            
            # Enrich with Sector Metadata
            df['sector'] = sector_mapping.get(ticker, "Unclassified")
            
            df_list.append(df)

    if not df_list:
        print("[ERROR] No datasets available for aggregation.")
        return

    # Master Aggregation & Matrix Alignment
    print("Concatenating multidimensional dataset...")
    master_df = pd.concat(df_list, ignore_index=True)
    
    print("Enforcing schema consistency and dropping duplicates...")
    master_df = master_df.drop_duplicates(subset=['date', 'ticker'])
    master_df = master_df.sort_values(by=['ticker', 'date'])
    
    # Order columns structurally
    master_df = master_df[['date', 'ticker', 'sector', 'open', 'high', 'low', 'close', 'volume']]

    # Export AI-Ready Master Database
    master_csv_path = os.path.join(cleaned_dir, "master_clean_dataset.csv")
    print(f"Exporting massive dataset to {master_csv_path}...")
    master_df.to_csv(master_csv_path, index=False)

    # Generate Data Quality Report
    generate_markdown_report(master_df, reports_dir, len(valid_tickers), master_csv_path)

def generate_markdown_report(df, reports_dir, valid_count, output_path):
    report_path = os.path.join(reports_dir, "data_quality_report.md")
    
    total_obs = len(df)
    min_date = df['date'].min()
    max_date = df['date'].max()
    unclassified_count = len(df[df['sector'] == 'Unclassified']['ticker'].unique())
    
    report_content = f"""# NexFolio: Phase 4.2 Data Quality Profiling Report

## 1. Aggregation Overview
* **Total Validated Companies Aggregated:** {valid_count}
* **Total Chronological Observations:** {total_obs:,}
* **Global Time Horizon:** {min_date} to {max_date}

## 2. Schema Architecture
* `date`: ISO 8601 (YYYY-MM-DD)
* `ticker`: String ID
* `sector`: String Macro-Economic Classification
* `open`, `high`, `low`, `close`: Optimized `float32`
* `volume`: Optimized `int64`

## 3. Structural Integrity Checks
* **Duplication Status:** Purged (Matrix alignment strictly enforced on `[date, ticker]`).
* **Pre-IPO Interpolation:** Preserved as missing. No artificial `ffill` applied across inactive trading periods.
* **Metadata Mapping:** {unclassified_count} tickers pending manual sector classification.

## 4. Next Phase Readiness
The `master_clean_dataset.csv` pipeline is fully optimized. The dataset is explicitly formatted for standard quantitative finance transformations in **Phase 5 – Feature Engineering**.
"""

    with open(report_path, 'w') as f:
        f.write(report_content)

    print(f"Data Quality Report successfully generated at: {report_path}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("preprocessing"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    PROCESSED_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "processed")
    REPORTS_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "reports")
    CLEANED_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "cleaned")
    
    INVENTORY_PATH = os.path.join(REPORTS_DIR, "dataset_inventory.csv")
    MAPPING_PATH = os.path.join(project_root, "ai-service", "ml", "preprocessing", "sector_mapping.json")
    
    aggregate_master_dataset(PROCESSED_DIR, REPORTS_DIR, CLEANED_DIR, INVENTORY_PATH, MAPPING_PATH)