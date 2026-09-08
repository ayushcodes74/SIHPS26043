import csv

from dataset_schema import DATASET_DIR, DATASET_SCHEMAS


# ============================================================
# VALIDATE ENUM VALUES FOR ONE COLUMN
# ============================================================

def validate_enum_column(
    file_path,
    column,
    allowed_values
):
    """
    Validate that every non-empty value in a column
    belongs to the allowed values.
    """

    errors = []

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row_number, row in enumerate(
            reader,
            start=2
        ):

            value = row.get(column)

            # Empty values are handled by required-field
            # validation if the field is required.
            if value is None or str(value).strip() == "":
                continue

            value = str(value).strip()

            if value not in allowed_values:

                errors.append({
                    "row": row_number,
                    "value": value
                })

    if errors:

        print(f"❌ Invalid values in '{column}':")

        print(
            f"   Allowed values: "
            f"{', '.join(map(str, allowed_values))}"
        )

        for error in errors:

            print(
                f"   Row {error['row']}: "
                f"{column} = '{error['value']}'"
            )

        return False

    print(f"✓ {column} values valid")

    return True


# ============================================================
# VALIDATE ONE DATASET
# ============================================================

def validate_dataset_enums(
    filename,
    schema
):
    """
    Validate all enum fields defined
    in the dataset schema.
    """

    file_path = DATASET_DIR / "raw" / filename

    print()
    print("=" * 60)
    print(f"ENUM VALIDATION: {filename}")
    print("=" * 60)

    if not file_path.exists():

        print(
            f"❌ File not found: "
            f"{file_path}"
        )

        return False

    allowed_values = schema.get(
        "allowed_values",
        {}
    )

    # Dataset has no enum fields
    if not allowed_values:

        print("✓ No enum fields defined")

        return True

    overall_valid = True

    for column, values in allowed_values.items():

        result = validate_enum_column(
            file_path,
            column,
            values
        )

        if not result:

            overall_valid = False

    return overall_valid


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("SIH26043 ENUM VALIDATION")
    print("=" * 60)

    overall_valid = True

    for filename, schema in DATASET_SCHEMAS.items():

        result = validate_dataset_enums(
            filename,
            schema
        )

        if not result:

            overall_valid = False

    print()
    print("=" * 60)

    if overall_valid:

        print("✓ ENUM VALIDATION PASSED")

    else:

        print("❌ ENUM VALIDATION FAILED")

    print("=" * 60)

    return overall_valid


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    success = main()

    if not success:

        raise SystemExit(1)