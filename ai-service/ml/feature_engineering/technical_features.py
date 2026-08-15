import os
import pandas as pd
import numpy as np

def calculate_rsi(series, window=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def engineer_technical_features(features_dir):
    input_parquet = os.path.join(features_dir, "market_features.parquet")
    output_parquet = os.path.join(features_dir, "technical_features.parquet")
    
    print("Loading market features dataset...")
    df = pd.read_parquet(input_parquet)
    df = df.sort_values(by=['ticker', 'date']).reset_index(drop=True)
    
    print("Calculating Moving Averages and Relationships (Phase 5.8)...")
    smas = [20, 50, 100, 200]
    for w in smas:
        df[f'sma_{w}'] = df.groupby('ticker')['close'].transform(lambda x: x.rolling(window=w).mean())
        df[f'price_to_sma{w}'] = df['close'] / df[f'sma_{w}']
        
    df['ema_12'] = df.groupby('ticker')['close'].transform(lambda x: x.ewm(span=12, adjust=False).mean())
    df['ema_26'] = df.groupby('ticker')['close'].transform(lambda x: x.ewm(span=26, adjust=False).mean())
    
    print("Calculating RSI (Phase 5.9)...")
    df['rsi_14'] = df.groupby('ticker')['close'].transform(calculate_rsi)
    
    print("Calculating MACD (Phase 5.10)...")
    df['macd'] = df['ema_12'] - df['ema_26']
    df['macd_signal'] = df.groupby('ticker')['macd'].transform(lambda x: x.ewm(span=9, adjust=False).mean())
    df['macd_histogram'] = df['macd'] - df['macd_signal']
    
    print("Calculating Bollinger Bands (Phase 5.11)...")
    price_std_20 = df.groupby('ticker')['close'].transform(lambda x: x.rolling(window=20).std())
    df['bollinger_middle'] = df['sma_20']
    df['bollinger_upper'] = df['bollinger_middle'] + (2 * price_std_20)
    df['bollinger_lower'] = df['bollinger_middle'] - (2 * price_std_20)
    df['bollinger_width'] = (df['bollinger_upper'] - df['bollinger_lower']) / df['bollinger_middle']
    
    df['bollinger_position'] = np.where(
        df['bollinger_upper'] != df['bollinger_lower'],
        (df['close'] - df['bollinger_lower']) / (df['bollinger_upper'] - df['bollinger_lower']),
        np.nan
    )
    
    print("Calculating Average True Range (Phase 5.12)...")
    tr1 = df['high'] - df['low']
    tr2 = (df['high'] - df.groupby('ticker')['close'].shift(1)).abs()
    tr3 = (df['low'] - df.groupby('ticker')['close'].shift(1)).abs()
    
    df['true_range'] = np.maximum(tr1, np.maximum(tr2, tr3))
    df['atr_14'] = df.groupby('ticker')['true_range'].transform(lambda x: x.rolling(window=14).mean())
    
    df = df.drop(columns=['true_range'])
    
    print("Enforcing Phase 5 Data Governance (Masking pre-IPO data)...")
    tech_cols = [f'sma_{w}' for w in smas] + [f'price_to_sma{w}' for w in smas] + \
                ['ema_12', 'ema_26', 'rsi_14', 'macd', 'macd_signal', 'macd_histogram', 
                 'bollinger_middle', 'bollinger_upper', 'bollinger_lower', 'bollinger_width', 
                 'bollinger_position', 'atr_14']
                 
    for col in tech_cols:
        df.loc[df['is_listed'] == 0, col] = np.nan
        df[col] = df[col].astype('float32')
        
    print(f"Exporting progressively enriched dataset to {output_parquet}...")
    df.to_parquet(output_parquet, index=False)
    
    print("\nPhases 5.8 to 5.12 Complete: Technical Indicator Engineering executed successfully.")

if __name__ == "__main__":
    current_dir = os.getcwd()
    if current_dir.endswith("feature_engineering"):
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    else:
        project_root = current_dir
        
    FEATURES_DIR = os.path.join(project_root, "ai-service", "ml", "datasets", "features")
    
    engineer_technical_features(FEATURES_DIR)