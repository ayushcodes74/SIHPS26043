import csv
import json
from pathlib import Path
from collections import Counter


ROOT_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = ROOT_DIR / "dataset"
RAW_DIR = DATASET_DIR / "raw"
JSON_DIR = DATASET_DIR / "json"
REPORT_DIR = DATASET_DIR / "reports"

REPORT_DIR.mkdir(parents=True, exist_ok=True)


CSV_FILES = sorted(RAW_DIR.glob("*.csv"))
JSON_FILES = sorted(JSON_DIR.glob("*.json"))


def analyze_csv(file_path):
    with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        columns = reader.fieldnames or []

    missing_values = 0
    duplicate_ids = 0
    data_status_counter = Counter()
    verification_counter = Counter()

    id_column = None

    for column in columns:
        if column.endswith("_id"):
            if column in {
                "institution_id",
                "department_id",
                "faculty_id",
                "expertise_id",
                "faculty_expertise_id",
                "mapping_id",
                "facility_id",
                "innovation_id",
                "industry_id",
                "government_department_id",
                "challenge_id",
                "solution_id",
                "project_id",
                "partner_id",
                "impact_id",
                "evidence_id",
                "user_id",
                "notification_id",
                "reputation_id",
                "cluster_id",
            }:
                id_column = column
                break

    id_values = []

    for row in rows:
        for column in columns:
            value = row.get(column, "")
            if value is None or str(value).strip() == "":
                missing_values += 1

        if id_column:
            value = row.get(id_column, "").strip()
            if value:
                id_values.append(value)

        data_status = row.get("data_status", "").strip()
        if data_status:
            data_status_counter[data_status] += 1

        verification_status = row.get("verification_status", "").strip()
        if verification_status:
            verification_counter[verification_status] += 1

    duplicate_ids = len(id_values) - len(set(id_values))

    return {
        "file": file_path.name,
        "rows": len(rows),
        "columns": len(columns),
        "missing_values": missing_values,
        "duplicate_ids": duplicate_ids,
        "data_status": dict(data_status_counter),
        "verification_status": dict(verification_counter),
    }


def analyze_json(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        item_count = len(data)
        root_type = "list"
    elif isinstance(data, dict):
        item_count = len(data)
        root_type = "object"
    else:
        item_count = 1
        root_type = type(data).__name__

    return {
        "file": file_path.name,
        "items": item_count,
        "root_type": root_type,
    }


def main():
    print()
    print("=" * 70)
    print("SIH26043 DATASET SUMMARY REPORT")
    print("=" * 70)
    print()

    csv_reports = []
    json_reports = []

    print("CSV DATASETS")
    print("-" * 70)

    for file_path in CSV_FILES:
        report = analyze_csv(file_path)
        csv_reports.append(report)

        print(
            f"{report['file']:<35} "
            f"Rows: {report['rows']:<5} "
            f"Columns: {report['columns']:<3} "
            f"Missing: {report['missing_values']:<4} "
            f"Duplicate IDs: {report['duplicate_ids']}"
        )

    print()
    print("JSON DATASETS")
    print("-" * 70)

    for file_path in JSON_FILES:
        report = analyze_json(file_path)
        json_reports.append(report)

        print(
            f"{report['file']:<35} "
            f"Items: {report['items']:<5} "
            f"Root: {report['root_type']}"
        )

    total_csv_rows = sum(report["rows"] for report in csv_reports)
    total_missing = sum(report["missing_values"] for report in csv_reports)
    total_duplicate_ids = sum(report["duplicate_ids"] for report in csv_reports)

    total_json_items = sum(report["items"] for report in json_reports)

    final_report = {
        "project": "SIH26043",
        "csv_datasets": csv_reports,
        "json_datasets": json_reports,
        "totals": {
            "csv_files": len(csv_reports),
            "csv_rows": total_csv_rows,
            "missing_values": total_missing,
            "duplicate_ids": total_duplicate_ids,
            "json_files": len(json_reports),
            "json_items": total_json_items,
        },
    }

    report_file = REPORT_DIR / "dataset_summary.json"

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(final_report, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"CSV files        : {len(csv_reports)}")
    print(f"CSV rows         : {total_csv_rows}")
    print(f"Missing values   : {total_missing}")
    print(f"Duplicate IDs    : {total_duplicate_ids}")
    print(f"JSON files       : {len(json_reports)}")
    print(f"JSON items       : {total_json_items}")

    print()
    print(f"Report saved to:")
    print(report_file)

    print()
    if total_missing == 0 and total_duplicate_ids == 0:
        print("✓ DATA QUALITY LOOKS GOOD")
    else:
        print("⚠ DATA QUALITY ISSUES FOUND")
        print("Review missing values and duplicate IDs before continuing.")

    print()


if __name__ == "__main__":
    main()