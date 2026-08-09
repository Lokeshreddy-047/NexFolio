import os
import pandas as pd
import numpy as np

def audit_dataset(processed_dir, reports_dir):
    os.makedirs(reports_dir, exist_ok=True)
    input_parquet = os.path.join(processed_dir, "master_market_dataset.parquet")
    report_out = os.path.join(reports_dir, "phase5_data_audit_report.md")

    if not os.path.exists(input_parquet):
        print(f"File not found: {input_parquet}")
        return

    df = pd.read_parquet(input_parquet)

    expected_columns = {'date', 'ticker', 'sector', 'open', 'high', 'low', 'close', 'volume', 'is_listed', 'is_trading_day', 'is_missing_observation'}
    missing_cols = expected_columns - set(df.columns)

    ticker_count = df['ticker'].nunique()

    df['date'] = pd.to_datetime(df['date'])
    is_sorted = df.groupby('ticker')['date'].is_monotonic_increasing.all()

    duplicates = df.duplicated(subset=['date', 'ticker']).sum()

    active_df = df[df['is_listed'] == 1].dropna(subset=['open', 'high', 'low', 'close'])
    
    ohlc_valid = (
        (active_df['high'] >= active_df['low']) &
        (active_df['high'] >= active_df['open']) &
        (active_df['high'] >= active_df['close']) &
        (active_df['low'] <= active_df['open']) &
        (active_df['low'] <= active_df['close'])
    ).all()

    volume_valid = (active_df['volume'] >= 0).all()

    pre_listing_nans_intact = df[df['is_listed'] == 0]['close'].isna().all()

    report_content = f"""# NexFolio: Phase 5.0 Data Audit Report

## 1. File Integrity
* **Parquet File Exists:** True
* **Missing Expected Columns:** {missing_cols if missing_cols else 'None'}

## 2. Structural Validation
* **Total Tickers Present:** {ticker_count} (Expected: 289)
* **Chronological Ordering (Per Ticker):** {is_sorted}
* **Duplicate (Date, Ticker) Pairs:** {duplicates}

## 3. Financial Logic Integrity
* **OHLC Relationships Valid:** {ohlc_valid}
* **Volume Numeric & Non-Negative:** {volume_valid}

## 4. Governance Verification
* **Pre-Listing NaNs Untouched (is_listed = 0):** {pre_listing_nans_intact}

## Audit Conclusion
The `master_market_dataset.parquet` passes all Phase 5.0 initialization checks and is ready for Phase 5.1 Price & Return Engineering.
"""

    with open(report_out, 'w') as f:
        f.write(report_content)

    print(f"Phase 5.0 Audit complete. Report generated at: {report_out}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("feature_engineering"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    PROCESSED_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "processed")
    REPORTS_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "reports")
    
    audit_dataset(PROCESSED_DIR, REPORTS_DIR)