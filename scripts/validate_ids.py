import csv
import re

from dataset_schema import DATASET_DIR, DATASET_SCHEMAS


# ============================================================
# ID PREFIX RULES
# ============================================================

ID_PATTERNS = {
    "institutions.csv": r"^INST\d{3,}$",
    "departments.csv": r"^DEPT\d{3,}$",
    "faculty.csv": r"^FAC\d{3,}$",
    "expertise.csv": r"^EXP\d{3,}$",
    "faculty_expertise.csv": r"^FEXP\d{3,}$",
    "institution_expertise.csv": r"^IEXP\d{3,}$",
}


# ============================================================
# VALIDATE EMPTY IDS
# ============================================================

def validate_empty_ids(file_path, id_column):
    """
    Check whether any ID is empty.
    """

    errors = []

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row_number, row in enumerate(reader, start=2):

            value = row.get(id_column)

            if value is None or str(value).strip() == "":
                errors.append(row_number)

    if errors:

        print("❌ Empty IDs found:")

        for row in errors:
            print(f"   Row {row}: {id_column} is empty")

        return False

    print("✓ No empty IDs")

    return True


# ============================================================
# VALIDATE DUPLICATE IDS
# ============================================================

def validate_duplicate_ids(file_path, id_column):
    """
    Check whether IDs are duplicated.
    """

    seen_ids = {}
    duplicates = []

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row_number, row in enumerate(reader, start=2):

            value = row.get(id_column)

            if value is None:
                continue

            value = str(value).strip()

            if value == "":
                continue

            if value in seen_ids:

                duplicates.append({
                    "id": value,
                    "first_row": seen_ids[value],
                    "duplicate_row": row_number
                })

            else:

                seen_ids[value] = row_number

    if duplicates:

        print("❌ Duplicate IDs found:")

        for duplicate in duplicates:

            print(
                f"   ID {duplicate['id']} "
                f"appears in rows "
                f"{duplicate['first_row']} and "
                f"{duplicate['duplicate_row']}"
            )

        return False

    print("✓ No duplicate IDs")

    return True


# ============================================================
# VALIDATE ID FORMAT
# ============================================================

def validate_id_format(file_path, id_column, pattern):
    """
    Check whether every ID follows the required pattern.
    """

    errors = []

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row_number, row in enumerate(reader, start=2):

            value = row.get(id_column)

            if value is None:
                continue

            value = str(value).strip()

            if value == "":
                continue

            if not re.match(pattern, value):

                errors.append({
                    "row": row_number,
                    "id": value
                })

    if errors:

        print("❌ Invalid ID format:")

        for error in errors:

            print(
                f"   Row {error['row']}: "
                f"{error['id']}"
            )

        print(f"   Expected pattern: {pattern}")

        return False

    print("✓ ID format valid")

    return True


# ============================================================
# VALIDATE ONE DATASET
# ============================================================

def validate_ids(filename, schema):
    """
    Run all ID validations for one dataset.
    """

    file_path = DATASET_DIR / "raw" / filename

    print()
    print("=" * 60)
    print(f"ID VALIDATION: {filename}")
    print("=" * 60)

    if not file_path.exists():

        print(f"❌ File not found: {file_path}")

        return False

    id_column = schema["id_column"]

    pattern = ID_PATTERNS.get(filename)

    if pattern is None:

        print("⚠ No ID pattern defined")

        return True

    empty_valid = validate_empty_ids(
        file_path,
        id_column
    )

    duplicate_valid = validate_duplicate_ids(
        file_path,
        id_column
    )

    format_valid = validate_id_format(
        file_path,
        id_column,
        pattern
    )

    return (
        empty_valid
        and duplicate_valid
        and format_valid
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("SIH26043 ID VALIDATION")
    print("=" * 60)

    overall_valid = True

    for filename, schema in DATASET_SCHEMAS.items():

        result = validate_ids(
            filename,
            schema
        )

        if not result:
            overall_valid = False

    print()
    print("=" * 60)

    if overall_valid:

        print("✓ ID VALIDATION PASSED")

    else:

        print("❌ ID VALIDATION FAILED")

    print("=" * 60)

    return overall_valid


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    success = main()

    if not success:
        raise SystemExit(1)