import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


def evaluate_model(name, model, X_test, y_test):
    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, average="weighted")
    recall = recall_score(y_test, predictions, average="weighted")
    f1 = f1_score(y_test, predictions, average="weighted")

    print(f"\n{name}")
    print("-" * 50)
    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")

    print("\nConfusion Matrix")
    print(confusion_matrix(y_test, predictions))

    print("\nClassification Report")
    print(classification_report(y_test, predictions, target_names=["LOW", "MEDIUM", "HIGH"]))

    return {
        "model": name,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4)
    }


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

    os.makedirs(report_dir, exist_ok=True)

    print("NexFolio – Phase 7.2 Baseline Models")
    print("-" * 60)

    df = pd.read_parquet(dataset_path)

    label_map = {
        "LOW": 0,
        "MEDIUM": 1,
        "HIGH": 2
    }

    df["risk_label"] = df["risk_category"].map(label_map)

    drop_columns = [
        "portfolio_id",
        "risk_category",
        "risk_score",
        "risk_label"
    ]

    X = df.drop(columns=[c for c in drop_columns if c in df.columns])
    y = df["risk_label"]

    non_numeric_columns = X.select_dtypes(exclude=["number"]).columns.tolist()

    if non_numeric_columns:
        print("\nRemoving non-numeric columns:")
        for col in non_numeric_columns:
            print(f" - {col}")

    X = X.select_dtypes(include=["number"])

    X = X.fillna(X.median())

    print(f"\nFinal feature count: {X.shape[1]}")
    print(f"Training samples      : {len(X)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    logistic_model = LogisticRegression(
    max_iter=2000,
    solver="lbfgs",
    random_state=42
    )

    logistic_model.fit(X_train_scaled, y_train)

    logistic_results = evaluate_model(
        "Logistic Regression",
        logistic_model,
        X_test_scaled,
        y_test
    )

    tree_model = DecisionTreeClassifier(
        max_depth=8,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42
    )

    tree_model.fit(X_train, y_train)

    tree_results = evaluate_model(
        "Decision Tree",
        tree_model,
        X_test,
        y_test
    )

    comparison_df = pd.DataFrame([logistic_results, tree_results])

    comparison_path = os.path.join(report_dir, "baseline_model_comparison.csv")
    comparison_df.to_csv(comparison_path, index=False)

    print("\nModel comparison saved to:")
    print(comparison_path)

    print("\nBaseline phase completed successfully.")


if __name__ == "__main__":
    main()