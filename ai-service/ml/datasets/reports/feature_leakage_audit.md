# NexFolio: Phase 5 Feature Leakage & Integrity Audit

## 1. Feature Leakage Verification
* **Strict Temporal Compliance:** PASSED. 
* **Validation:** No predictive features utilize `.shift(-x)` where `x > 0`. Historical rolling windows (`.rolling()`) were strictly closed on the current day `t`.
* **Target Isolation:** The target variables (`target_1d_return`, `target_trend`) exclusively utilize `t+1` data and must be dropped from the feature space `X` during ML train/test splitting.

## 2. Missing-Value Strategy (Indicator Warm-Up)
* **Pre-IPO Gaps:** Preserved as `NaN` (`is_listed = 0`).
* **Technical Warm-up:** The maximum lookback window is 252 days. The first 251 active trading days for any asset will legitimately contain `NaN` for features like `volatility_252d` or `return_252d`. 
* **Strategy:** Downstream XGBoost and LSTM pipelines must natively handle these `NaNs` or strictly slice the dataset to `date > (listing_date + 252 days)` during training.

## 3. Feature Cleaning
* Infinite values (`inf`, `-inf`) mathematically induced by extreme zero-volume or zero-volatility days have been successfully scrubbed and cast to `NaN`.
