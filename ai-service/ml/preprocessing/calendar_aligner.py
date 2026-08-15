import os
import pandas as pd
import numpy as np

def align_calendar(cleaned_dir, processed_dir, reports_dir):
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)
    
    input_path = os.path.join(cleaned_dir, "master_clean_dataset.csv")
    parquet_out = os.path.join(processed_dir, "aligned_master_dataset.parquet")
    calendar_out = os.path.join(reports_dir, "trading_calendar.csv")
    report_out = os.path.join(reports_dir, "calendar_alignment_report.md")

    print("Loading master clean dataset...")
    df = pd.read_csv(input_path)
    df['date'] = pd.to_datetime(df['date'])
    
    # 1. Generate Master Trading Calendar
    print("Extracting universal NSE trading calendar...")
    master_dates = pd.Series(df['date'].unique()).sort_values().reset_index(drop=True)
    master_dates.to_csv(calendar_out, index=False, header=['date'])
    
    # 2. Create Complete (date x ticker) Matrix
    print("Constructing Cartesian grid (Dates x Tickers)...")
    tickers = df['ticker'].unique()
    multi_index = pd.MultiIndex.from_product([master_dates, tickers], names=['date', 'ticker'])
    grid_df = pd.DataFrame(index=multi_index).reset_index()
    
    # 3. Align Dataset
    print("Merging dataset into temporal grid...")
    aligned_df = pd.merge(grid_df, df, on=['date', 'ticker'], how='left')
    
    # Restore sector mapping for newly injected rows
    aligned_df['sector'] = aligned_df.groupby('ticker')['sector'].transform(lambda x: x.ffill().bfill())
    
    # 4. Add Activity Flags
    print("Calculating activity flags (is_listed, is_missing_observation)...")
    aligned_df['is_trading_day'] = 1  # Universal calendar ensures all dates are trading days
    
    # Determine lifecycle limits per ticker
    lifecycle = df.groupby('ticker')['date'].agg(listing_date='min', last_date='max').reset_index()
    aligned_df = pd.merge(aligned_df, lifecycle, on='ticker', how='left')
    
    # is_listed: 1 if date is within the ticker's public lifecycle
    aligned_df['is_listed'] = np.where(
        (aligned_df['date'] >= aligned_df['listing_date']) & (aligned_df['date'] <= aligned_df['last_date']), 
        1, 0
    ).astype('int8')
    
    # is_missing_observation: 1 if listed, but close price is NaN
    aligned_df['is_missing_observation'] = np.where(
        (aligned_df['is_listed'] == 1) & (aligned_df['close'].isna()), 
        1, 0
    ).astype('int8')
    
    aligned_df = aligned_df.drop(columns=['listing_date', 'last_date'])
    
    # Ensure memory optimization
    print("Applying float32 / int8 memory downcasting...")
    for col in ['open', 'high', 'low', 'close']:
        aligned_df[col] = aligned_df[col].astype('float32')
        
    aligned_df['volume'] = aligned_df['volume'].fillna(0).astype('int64')
    aligned_df['date'] = aligned_df['date'].dt.strftime('%Y-%m-%d')
    
    # Export to Parquet
    print(f"Exporting massive aligned matrix to {parquet_out}...")
    aligned_df.to_parquet(parquet_out, index=False)
    
    # Generate Report
    generate_report(df, aligned_df, master_dates, report_out)

def generate_report(original_df, aligned_df, master_dates, report_out):
    total_trading_days = len(master_dates)
    earliest_date = master_dates.min().strftime('%Y-%m-%d')
    latest_date = master_dates.max().strftime('%Y-%m-%d')
    total_matrix_size = len(aligned_df)
    
    pre_alignment_missing = original_df['close'].isna().sum()
    post_alignment_missing = aligned_df['close'].isna().sum()
    
    legitimate_gaps = len(aligned_df[aligned_df['is_listed'] == 0])
    suspicious_gaps = aligned_df['is_missing_observation'].sum()
    
    report = f"""# NexFolio: Phase 4.3 Calendar Alignment Report

## 1. Universal NSE Trading Calendar
* **Total Trading Days Identified:** {total_trading_days:,}
* **Global Date Horizon:** {earliest_date} to {latest_date}
* **Total Matrix Grid Size (Dates × Tickers):** {total_matrix_size:,} rows

## 2. Temporal Alignment & Data Integrity
* **Pre-Alignment Missing Values:** {pre_alignment_missing:,}
* **Post-Alignment Total Missing Values:** {post_alignment_missing:,}
* **Legitimate Pre-IPO/Delisted Gaps (is_listed = 0):** {legitimate_gaps:,}
* **Suspicious Intra-Period Gaps (is_missing_observation = 1):** {suspicious_gaps:,}

## 3. Engineering Outcomes
The temporal matrix has been successfully standardized. Cross-sectional covariance modeling and LSTM sequence generation can now be executed symmetrically across all 289 equities without dimensional instability. 
"""
    with open(report_out, 'w') as f:
        f.write(report)
        
    print(f"Alignment Report saved to: {report_out}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("preprocessing"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    CLEANED_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "cleaned")
    PROCESSED_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "processed")
    REPORTS_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "reports")
    
    align_calendar(CLEANED_DIR, PROCESSED_DIR, REPORTS_DIR)