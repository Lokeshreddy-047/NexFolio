# Phase 7 Dataset Audit Report

- **Rows:** 1000
- **Columns:** 48
- **Duplicate Rows:** 0

## Class Distribution

| risk_category   |   count |   percentage |
|:----------------|--------:|-------------:|
| MEDIUM          |     503 |         50.3 |
| HIGH            |     334 |         33.4 |
| LOW             |     163 |         16.3 |

## Missing Values

| feature                                   |   missing_count |   missing_percentage |
|:------------------------------------------|----------------:|---------------------:|
| portfolio_id                              |               0 |                    0 |
| trading_days                              |               0 |                    0 |
| total_return                              |               0 |                    0 |
| annualized_return                         |               0 |                    0 |
| annualized_volatility                     |               0 |                    0 |
| return_1M                                 |               0 |                    0 |
| return_3M                                 |               0 |                    0 |
| return_6M                                 |               0 |                    0 |
| return_1Y                                 |               0 |                    0 |
| portfolio_max_drawdown                    |               0 |                    0 |
| rolling_max_drawdown_30d                  |               0 |                    0 |
| rolling_max_drawdown_252d                 |               0 |                    0 |
| downside_deviation_annualized             |               0 |                    0 |
| portfolio_sharpe_ratio                    |               0 |                    0 |
| portfolio_sortino_ratio                   |               0 |                    0 |
| portfolio_calmar_ratio                    |               0 |                    0 |
| asset_count                               |               0 |                    0 |
| sector_count                              |               0 |                    0 |
| largest_sector_pct                        |               0 |                    0 |
| top_3_holdings_pct                        |               0 |                    0 |
| top_5_holdings_pct                        |               0 |                    0 |
| hhi                                       |               0 |                    0 |
| sector_automobile_and_auto_components_pct |               0 |                    0 |
| sector_capital_goods_pct                  |               0 |                    0 |
| sector_chemicals_pct                      |               0 |                    0 |
| sector_construction_pct                   |               0 |                    0 |
| sector_construction_materials_pct         |               0 |                    0 |
| sector_consumer_durables_pct              |               0 |                    0 |
| sector_consumer_services_pct              |               0 |                    0 |
| sector_fmcg_pct                           |               0 |                    0 |
| sector_financial_services_pct             |               0 |                    0 |
| sector_healthcare_pct                     |               0 |                    0 |
| sector_information_technology_pct         |               0 |                    0 |
| sector_metals_&_mining_pct                |               0 |                    0 |
| sector_oil_gas_&_consumable_fuels_pct     |               0 |                    0 |
| sector_power_pct                          |               0 |                    0 |
| sector_realty_pct                         |               0 |                    0 |
| sector_services_pct                       |               0 |                    0 |
| sector_telecommunication_pct              |               0 |                    0 |
| sector_textiles_pct                       |               0 |                    0 |
| diversification_category                  |               0 |                    0 |
| diversification_score                     |               0 |                    0 |
| portfolio_beta                            |               0 |                    0 |
| risk_category                             |               0 |                    0 |
| risk_score                                |               0 |                    0 |
| concentration_warning                     |               0 |                    0 |
| volatility_warning                        |               0 |                    0 |
| diversification_warning                   |               0 |                    0 |

## Highly Correlated Feature Pairs (|r| > 0.90)

| feature_1              | feature_2                     |   correlation |
|:-----------------------|:------------------------------|--------------:|
| total_return           | annualized_return             |        0.9094 |
| annualized_volatility  | downside_deviation_annualized |        0.9784 |
| portfolio_max_drawdown | rolling_max_drawdown_252d     |        0.9324 |
| portfolio_sharpe_ratio | portfolio_sortino_ratio       |        0.9918 |
| top_3_holdings_pct     | top_5_holdings_pct            |        0.9348 |
| hhi                    | diversification_score         |        1      |
