import os
import pandas as pd
import traceback

def normalize_and_validate(raw_dir, processed_dir, reports_dir):
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)
    
    inventory_data = []
    stats = {
        "total_files": 0,
        "valid_files": 0,
        "empty_files": 0,
        "corrupted_files": 0,
        "short_history": 0
    }

    for filename in os.listdir(raw_dir):
        if not filename.endswith(".csv"):
            continue

        stats["total_files"] += 1
        file_path = os.path.join(raw_dir, filename)
        
        try:
            if os.path.getsize(file_path) == 0:
                stats["empty_files"] += 1
                inventory_data.append({"ticker": filename, "status": "empty", "start_date": None, "end_date": None, "rows": 0})
                continue

            raw_meta = pd.read_csv(file_path, header=None, nrows=2)
            ticker = str(raw_meta.iloc[1, 1]).strip()

            df = pd.read_csv(file_path, skiprows=3, header=None)
            
            if df.shape[1] >= 7:
                df = df.iloc[:, 1:7]
            else:
                df = df.iloc[:, 0:6]
                
            df.columns = ['date', 'close', 'high', 'low', 'open', 'volume']
            df['ticker'] = ticker
            df = df[['date', 'open', 'high', 'low', 'close', 'volume', 'ticker']]

            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            df = df.dropna(subset=['date'])

            if df.empty:
                raise ValueError("Dataframe became empty after date parsing. Format mismatch.")

            if df['date'].dt.tz is not None:
                df['date'] = df['date'].dt.tz_convert(None)

            df['date'] = df['date'].dt.strftime('%Y-%m-%d')
            
            row_count = len(df)
            start_date = df['date'].min()
            end_date = df['date'].max()

            if stats["total_files"] == 1:
                print(f"\n[DIAGNOSTIC] File: {filename}")
                print(df.head())
                print(f"[DIAGNOSTIC] First parsed date: {start_date}")
                print(f"[DIAGNOSTIC] Total rows loaded: {row_count}\n")

            processed_path = os.path.join(processed_dir, f"{ticker}_normalized.csv")
            df.to_csv(processed_path, index=False)

            if row_count < 500:
                stats["short_history"] += 1
                status = "valid_short_history"
            else:
                stats["valid_files"] += 1
                status = "valid"

            inventory_data.append({
                "ticker": ticker,
                "status": status,
                "start_date": start_date,
                "end_date": end_date,
                "rows": row_count
            })

        except Exception as e:
            if stats["corrupted_files"] == 0:
                print(f"\n[CRITICAL FAILURE] on file: {filename}")
                print(f"[ERROR]: {str(e)}")
                print("\n--- TRACEBACK ---")
                print(traceback.format_exc())
                
            stats["corrupted_files"] += 1
            inventory_data.append({"ticker": filename, "status": "corrupted", "start_date": None, "end_date": None, "rows": 0})

    inventory_df = pd.DataFrame(inventory_data)
    inventory_path = os.path.join(reports_dir, "dataset_inventory.csv")
    inventory_df.to_csv(inventory_path, index=False)

    print("Normalization & Validation Complete. Summary Statistics:")
    for key, value in stats.items():
        print(f"{key}: {value}")
    print(f"Inventory report saved to: {inventory_path}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("preprocessing"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    RAW_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "raw")
    PROCESSED_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "processed")
    REPORTS_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "reports")
    
    normalize_and_validate(RAW_DIR, PROCESSED_DIR, REPORTS_DIR)