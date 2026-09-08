import csv

from dataset_schema import DATASET_DIR


# ============================================================
# FOREIGN KEY RELATIONSHIPS
# ============================================================

FOREIGN_KEYS = {

    # departments.institution_id
    "departments.csv": [
        {
            "column": "institution_id",
            "reference_file": "institutions.csv",
            "reference_column": "institution_id",
        }
    ],

    # faculty.institution_id
    # faculty.department_id
    "faculty.csv": [
        {
            "column": "institution_id",
            "reference_file": "institutions.csv",
            "reference_column": "institution_id",
        },
        {
            "column": "department_id",
            "reference_file": "departments.csv",
            "reference_column": "department_id",
        }
    ],

    # faculty_expertise.faculty_id
    # faculty_expertise.expertise_id
    "faculty_expertise.csv": [
        {
            "column": "faculty_id",
            "reference_file": "faculty.csv",
            "reference_column": "faculty_id",
        },
        {
            "column": "expertise_id",
            "reference_file": "expertise.csv",
            "reference_column": "expertise_id",
        }
    ],

    # institution_expertise.institution_id
    # institution_expertise.expertise_id
    "institution_expertise.csv": [
        {
            "column": "institution_id",
            "reference_file": "institutions.csv",
            "reference_column": "institution_id",
        },
        {
            "column": "expertise_id",
            "reference_file": "expertise.csv",
            "reference_column": "expertise_id",
        }
    ],
}


# ============================================================
# LOAD REFERENCE IDS
# ============================================================

def load_reference_ids(file_path, column):
    """
    Load all IDs from a reference CSV column.
    """

    ids = set()

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            value = row.get(column)

            if value is not None:

                value = str(value).strip()

                if value:
                    ids.add(value)

    return ids


# ============================================================
# VALIDATE ONE FOREIGN KEY
# ============================================================

def validate_foreign_key(
    source_file,
    source_column,
    reference_file,
    reference_column
):
    """
    Check that every value in source_column
    exists in reference_column.
    """

    source_path = DATASET_DIR / "raw" / source_file
    reference_path = DATASET_DIR / "raw" / reference_file

    print()
    print(
        f"Checking: "
        f"{source_file}.{source_column}"
    )

    # --------------------------------------------------------
    # Check reference file
    # --------------------------------------------------------

    if not reference_path.exists():

        print(
            f"❌ Reference file not found: "
            f"{reference_file}"
        )

        return False

    # --------------------------------------------------------
    # Load valid reference IDs
    # --------------------------------------------------------

    valid_ids = load_reference_ids(
        reference_path,
        reference_column
    )

    # --------------------------------------------------------
    # Check source values
    # --------------------------------------------------------

    errors = []

    with open(
        source_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row_number, row in enumerate(
            reader,
            start=2
        ):

            value = row.get(source_column)

            if value is None:
                continue

            value = str(value).strip()

            if value == "":
                continue

            if value not in valid_ids:

                errors.append({
                    "row": row_number,
                    "value": value
                })

    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    if errors:

        print("❌ Invalid foreign keys:")

        for error in errors:

            print(
                f"   Row {error['row']}: "
                f"{source_column} = "
                f"{error['value']} "
                f"does not exist in "
                f"{reference_file}.{reference_column}"
            )

        return False

    print("✓ Foreign key valid")

    return True


# ============================================================
# VALIDATE ALL FOREIGN KEYS
# ============================================================

def main():

    print()
    print("=" * 60)
    print("SIH26043 FOREIGN KEY VALIDATION")
    print("=" * 60)

    overall_valid = True

    for source_file, relationships in FOREIGN_KEYS.items():

        source_path = DATASET_DIR / "raw" / source_file

        # ----------------------------------------------------
        # Source file check
        # ----------------------------------------------------

        if not source_path.exists():

            print()
            print(
                f"❌ Source file not found: "
                f"{source_file}"
            )

            overall_valid = False

            continue

        # ----------------------------------------------------
        # Validate relationships
        # ----------------------------------------------------

        for relationship in relationships:

            result = validate_foreign_key(
                source_file=source_file,
                source_column=relationship["column"],
                reference_file=relationship["reference_file"],
                reference_column=relationship["reference_column"],
            )

            if not result:
                overall_valid = False

    # ========================================================
    # FINAL RESULT
    # ========================================================

    print()
    print("=" * 60)

    if overall_valid:

        print("✓ FOREIGN KEY VALIDATION PASSED")

    else:

        print("❌ FOREIGN KEY VALIDATION FAILED")

    print("=" * 60)

    return overall_valid


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    success = main()

    if not success:
        raise SystemExit(1)