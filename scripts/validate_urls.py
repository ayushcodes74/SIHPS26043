import csv
import re

from dataset_schema import DATASET_DIR, DATASET_SCHEMAS


# ============================================================
# URL PATTERN
# ============================================================

URL_PATTERN = re.compile(
    r"^https?://"
    r"(?:www\.)?"
    r"[A-Za-z0-9]"
    r"[A-Za-z0-9.-]*"
    r"\.[A-Za-z]{2,}"
    r"(?::\d+)?"
    r"(?:/[^\s]*)?$",
    re.IGNORECASE
)


# ============================================================
# URL COLUMNS
# ============================================================

URL_COLUMNS = {

    "institutions.csv": [
        "official_website",
        "source_url",
    ],

    "departments.csv": [
        "official_url",
        "source_url",
    ],

    "faculty.csv": [
        "profile_url",
        "source_url",
    ],

    "faculty_expertise.csv": [
        "source_url",
    ],

    "institution_expertise.csv": [
        "source_url",
    ],
}


# ============================================================
# BASIC URL VALIDATION
# ============================================================

def is_valid_url(value):
    """
    Check whether a value looks like a valid HTTP/HTTPS URL.
    """

    if value is None:
        return False

    value = str(value).strip()

    if value == "":
        return False

    return bool(URL_PATTERN.match(value))


# ============================================================
# VALIDATE ONE URL COLUMN
# ============================================================

def validate_url_column(
    file_path,
    column
):
    """
    Validate URLs in one column.

    Empty values are allowed here because whether
    a field is required is handled by validate_csv.py.
    """

    errors = []

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        # ----------------------------------------------------
        # Check column exists
        # ----------------------------------------------------

        if column not in (reader.fieldnames or []):

            print(
                f"⚠ Column '{column}' "
                f"not found in CSV"
            )

            return True

        # ----------------------------------------------------
        # Validate every non-empty URL
        # ----------------------------------------------------

        for row_number, row in enumerate(
            reader,
            start=2
        ):

            value = row.get(column)

            # Empty URL is allowed.
            # Required-field validation handles required fields.
            if value is None or str(value).strip() == "":
                continue

            value = str(value).strip()

            if not is_valid_url(value):

                errors.append({
                    "row": row_number,
                    "value": value
                })

    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    if errors:

        print(
            f"❌ Invalid URLs in '{column}':"
        )

        for error in errors:

            print(
                f"   Row {error['row']}: "
                f"{error['value']}"
            )

        return False

    print(
        f"✓ {column} URLs valid"
    )

    return True


# ============================================================
# VALIDATE SYNTHETIC / REAL URL RULES
# ============================================================

def validate_verification_url_rule(
    file_path,
    filename
):
    """
    Check URL requirements based on data_status.

    Rule:

    real_verified
        → source_url should exist

    real_unverified
        → source_url may be blank

    synthetic_demo
        → source_url may be blank
    """

    # Only datasets containing data_status
    # need this validation.
    if filename not in DATASET_SCHEMAS:
        return True

    schema = DATASET_SCHEMAS[filename]

    if "data_status" not in schema.get(
        "types",
        {}
    ):

        return True

    # --------------------------------------------------------
    # Check source_url column
    # --------------------------------------------------------

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        if "data_status" not in (
            reader.fieldnames or []
        ):

            return True

        if "source_url" not in (
            reader.fieldnames or []
        ):

            return True

        errors = []

        for row_number, row in enumerate(
            reader,
            start=2
        ):

            data_status = (
                str(row.get("data_status", ""))
                .strip()
                .lower()
            )

            source_url = (
                str(row.get("source_url", ""))
                .strip()
            )

            # ------------------------------------------------
            # REAL VERIFIED DATA
            # ------------------------------------------------

            if data_status == "real_verified":

                if source_url == "":

                    errors.append({
                        "row": row_number,
                        "reason": (
                            "real_verified record "
                            "must have source_url"
                        )
                    })

    if errors:

        print(
            "❌ Source URL verification errors:"
        )

        for error in errors:

            print(
                f"   Row {error['row']}: "
                f"{error['reason']}"
            )

        return False

    print(
        "✓ Verification URL rules valid"
    )

    return True


# ============================================================
# VALIDATE ONE DATASET
# ============================================================

def validate_dataset_urls(
    filename
):
    """
    Validate all URL fields in one dataset.
    """

    file_path = DATASET_DIR / "raw" / filename

    print()
    print("=" * 60)
    print(f"URL VALIDATION: {filename}")
    print("=" * 60)

    # --------------------------------------------------------
    # File check
    # --------------------------------------------------------

    if not file_path.exists():

        print(
            f"❌ File not found: "
            f"{file_path}"
        )

        return False

    overall_valid = True

    # --------------------------------------------------------
    # URL columns
    # --------------------------------------------------------

    columns = URL_COLUMNS.get(
        filename,
        []
    )

    for column in columns:

        result = validate_url_column(
            file_path,
            column
        )

        if not result:

            overall_valid = False

    # --------------------------------------------------------
    # Verification URL rule
    # --------------------------------------------------------

    result = validate_verification_url_rule(
        file_path,
        filename
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
    print("SIH26043 URL VALIDATION")
    print("=" * 60)

    overall_valid = True

    for filename in DATASET_SCHEMAS:

        result = validate_dataset_urls(
            filename
        )

        if not result:

            overall_valid = False

    print()
    print("=" * 60)

    if overall_valid:

        print("✓ URL VALIDATION PASSED")

    else:

        print("❌ URL VALIDATION FAILED")

    print("=" * 60)

    return overall_valid


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    success = main()

    if not success:

        raise SystemExit(1)