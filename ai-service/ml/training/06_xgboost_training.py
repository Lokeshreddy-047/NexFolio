import os
import json
import joblib
import pandas as pd
import xgboost as xgb
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

    data_dir = os.path.join(
        base_dir,
        "datasets",
        "portfolio",
        "xgboost_ready"
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

    print("NexFolio – Phase 7.4.2 XGBoost Training")
    print("-" * 65)

    X_train = pd.read_parquet(os.path.join(data_dir, "X_train.parquet"))
    X_test = pd.read_parquet(os.path.join(data_dir, "X_test.parquet"))

    y_train = pd.read_parquet(os.path.join(data_dir, "y_train.parquet"))["risk_label"]
    y_test = pd.read_parquet(os.path.join(data_dir, "y_test.parquet"))["risk_label"]

    print(f"Training samples : {len(X_train)}")
    print(f"Testing samples  : {len(X_test)}")
    print(f"Feature count    : {X_train.shape[1]}")

    model = xgb.XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        n_estimators=500,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
        early_stopping_rounds=25
    )

    print("\nTraining XGBoost model...")

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )

    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, average="weighted")
    recall = recall_score(y_test, predictions, average="weighted")
    f1 = f1_score(y_test, predictions, average="weighted")

    print("\nXGBoost Evaluation")
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
        "feature": X_train.columns,
        "importance": model.feature_importances_
    }).sort_values(by="importance", ascending=False)

    print("\nTop 10 XGBoost Features")
    print(importance_df.head(10).to_string(index=False))

    importance_df.to_csv(
        os.path.join(report_dir, "xgboost_feature_importance.csv"),
        index=False
    )

    pd.DataFrame(cm).to_csv(
        os.path.join(report_dir, "xgboost_confusion_matrix.csv"),
        index=False
    )

    with open(os.path.join(report_dir, "xgboost_classification_report.txt"), "w") as f:
        f.write(report)

    metrics = {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "best_iteration": int(model.best_iteration),
        "feature_count": int(X_train.shape[1]),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test))
    }

    with open(os.path.join(report_dir, "xgboost_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=4)

    model_path = os.path.join(model_dir, "xgboost_risk_model.pkl")
    joblib.dump(model, model_path)

    print("\nArtifacts Saved")
    print(f"Model              : {model_path}")
    print(f"Feature Importance : {os.path.join(report_dir, 'xgboost_feature_importance.csv')}")
    print(f"Metrics JSON       : {os.path.join(report_dir, 'xgboost_metrics.json')}")

    print("\nPhase 7.4.2 completed successfully.")


if __name__ == "__main__":
    main()