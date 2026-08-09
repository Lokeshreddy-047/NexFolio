import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    input_file = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "portfolio_risk_summary.parquet"
    )

    audit_dir = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "audit"
    )

    os.makedirs(audit_dir, exist_ok=True)

    print("NexFolio – Phase 7 Dataset Audit")
    print("-" * 50)

    df = pd.read_parquet(input_file)

    rows, cols = df.shape

    print(f"Rows    : {rows}")
    print(f"Columns : {cols}")

    duplicate_rows = df.duplicated().sum()
    print(f"Duplicate rows : {duplicate_rows}")

    class_distribution = (
        df["risk_category"]
        .value_counts()
        .reset_index()
    )
    class_distribution.columns = ["risk_category", "count"]
    class_distribution["percentage"] = (
        class_distribution["count"] / rows * 100
    ).round(2)

    class_distribution.to_csv(
        os.path.join(audit_dir, "class_distribution.csv"),
        index=False
    )

    print("\nClass Distribution")
    print(class_distribution)

    missing_values = df.isnull().sum().reset_index()
    missing_values.columns = ["feature", "missing_count"]
    missing_values["missing_percentage"] = (
        missing_values["missing_count"] / rows * 100
    ).round(4)

    missing_values.to_csv(
        os.path.join(audit_dir, "missing_value_report.csv"),
        index=False
    )

    print("\nMissing values saved.")

    numeric_df = df.select_dtypes(include=["number"])

    feature_stats = numeric_df.describe().T
    feature_stats.to_csv(
        os.path.join(audit_dir, "feature_statistics.csv")
    )

    print("Feature statistics saved.")

    correlation_matrix = numeric_df.corr()
    correlation_matrix.to_csv(
        os.path.join(audit_dir, "correlation_matrix.csv")
    )

    plt.figure(figsize=(16, 12))
    sns.heatmap(
        correlation_matrix,
        cmap="coolwarm",
        center=0,
        linewidths=0.3
    )
    plt.title("NexFolio Feature Correlation Heatmap")
    plt.tight_layout()
    plt.savefig(
        os.path.join(audit_dir, "correlation_heatmap.png"),
        dpi=300
    )
    plt.close()

    high_corr_pairs = []
    corr = correlation_matrix.abs()

    for i in range(len(corr.columns)):
        for j in range(i + 1, len(corr.columns)):
            value = corr.iloc[i, j]
            if value > 0.90:
                high_corr_pairs.append({
                    "feature_1": corr.columns[i],
                    "feature_2": corr.columns[j],
                    "correlation": round(value, 4)
                })

    high_corr_df = pd.DataFrame(high_corr_pairs)
    high_corr_df.to_csv(
        os.path.join(audit_dir, "high_correlation_pairs.csv"),
        index=False
    )

    report_path = os.path.join(audit_dir, "phase7_dataset_audit_report.md")

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Phase 7 Dataset Audit Report\n\n")
        f.write(f"- **Rows:** {rows}\n")
        f.write(f"- **Columns:** {cols}\n")
        f.write(f"- **Duplicate Rows:** {duplicate_rows}\n\n")

        f.write("## Class Distribution\n\n")
        f.write(class_distribution.to_markdown(index=False))
        f.write("\n\n")

        f.write("## Missing Values\n\n")
        f.write(missing_values.to_markdown(index=False))
        f.write("\n\n")

        f.write("## Highly Correlated Feature Pairs (|r| > 0.90)\n\n")
        if high_corr_df.empty:
            f.write("No highly correlated feature pairs detected.\n")
        else:
            f.write(high_corr_df.to_markdown(index=False))
            f.write("\n")

    print("\nAudit completed successfully.")
    print(f"Artifacts saved to: {audit_dir}")


if __name__ == "__main__":
    main()