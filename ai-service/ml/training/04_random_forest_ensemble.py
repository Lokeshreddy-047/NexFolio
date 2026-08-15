import os
import json
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    dataset_path = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "portfolio_risk_summary.parquet"
    )

    report_dir = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "phase7_reports"
    )

    model_dir = os.path.join(base_dir, "models")

    os.makedirs(report_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)

    print("NexFolio – Phase 7.3 Random Forest Ensemble")
    print("-" * 65)

    df = pd.read_parquet(dataset_path)

    label_map = {
        "LOW": 0,
        "MEDIUM": 1,
        "HIGH": 2
    }

    df["risk_label"] = df["risk_category"].map(label_map)

    drop_base = [
        "portfolio_id",
        "risk_category",
        "risk_score",
        "risk_label",
        "diversification_category"
    ]

    X = df.drop(columns=[c for c in drop_base if c in df.columns])
    X = X.select_dtypes(include=["number"])

    leakage_columns = [
        "hhi",
        "diversification_score",
        "largest_sector_pct",
        "top_3_holdings_pct",
        "top_5_holdings_pct",
        "concentration_warning",
        "volatility_warning",
        "diversification_warning"
    ]

    X = X.drop(columns=[c for c in leakage_columns if c in X.columns])
    X = X.fillna(X.median())

    y = df["risk_label"]

    print(f"Samples : {len(X)}")
    print(f"Features: {X.shape[1]}")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=42
    )

    rf_model = RandomForestClassifier(
        n_estimators=500,
        max_depth=12,
        min_samples_split=8,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )

    print("\nRunning 5-fold Stratified Cross-Validation...")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    cv_scores = cross_val_score(
        rf_model,
        X_train,
        y_train,
        cv=cv,
        scoring="accuracy",
        n_jobs=-1
    )

    print(f"CV Accuracy Scores: {cv_scores}")
    print(f"Mean CV Accuracy : {cv_scores.mean():.4f}")
    print(f"Std Deviation    : {cv_scores.std():.4f}")

    print("\nTraining final Random Forest model...")

    rf_model.fit(X_train, y_train)

    predictions = rf_model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, average="weighted")
    recall = recall_score(y_test, predictions, average="weighted")
    f1 = f1_score(y_test, predictions, average="weighted")

    print("\nRandom Forest Evaluation")
    print("-" * 50)
    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")

    cm = confusion_matrix(y_test, predictions)

    print("\nConfusion Matrix")
    print(cm)

    report = classification_report(
        y_test,
        predictions,
        target_names=["LOW", "MEDIUM", "HIGH"]
    )

    print("\nClassification Report")
    print(report)

    importance_df = pd.DataFrame({
        "feature": X.columns,
        "importance": rf_model.feature_importances_
    }).sort_values(by="importance", ascending=False)

    top10 = importance_df.head(10)

    print("\nTop 10 Important Features")
    print(top10.to_string(index=False))

    importance_df.to_csv(
        os.path.join(report_dir, "random_forest_feature_importance.csv"),
        index=False
    )

    pd.DataFrame(cm).to_csv(
        os.path.join(report_dir, "random_forest_confusion_matrix.csv"),
        index=False
    )

    with open(os.path.join(report_dir, "random_forest_classification_report.txt"), "w") as f:
        f.write(report)

    metrics = {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "cv_mean_accuracy": round(float(cv_scores.mean()), 4),
        "cv_std_accuracy": round(float(cv_scores.std()), 4),
        "feature_count": int(X.shape[1]),
        "sample_count": int(len(X))
    }

    with open(os.path.join(report_dir, "random_forest_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=4)

    model_path = os.path.join(model_dir, "random_forest_risk_model.pkl")
    joblib.dump(rf_model, model_path)

    print("\nArtifacts Saved")
    print(f"Model               : {model_path}")
    print(f"Feature Importance  : {os.path.join(report_dir, 'random_forest_feature_importance.csv')}")
    print(f"Metrics JSON        : {os.path.join(report_dir, 'random_forest_metrics.json')}")

    print("\nPhase 7.3 completed successfully.")


if __name__ == "__main__":
    main()