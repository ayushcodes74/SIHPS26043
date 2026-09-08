import csv
from datetime import datetime

from dataset_schema import DATASET_DIR, DATASET_SCHEMAS


# ============================================================
# ALLOWED VALUES
# ============================================================

VALID_DATA_STATUS = {
    "verified_real",
    "real_verified",
    "real_unverified",
    "synthetic_demo",
}

VALID_VERIFICATION_STATUS = {
    "verified",
    "unverified",
}


# ============================================================
# DATASET-SPECIFIC VERIFICATION FIELDS
# ============================================================

VERIFICATION_RULES = {

    "institutions.csv": [
        "source_url",
        "source_type",
        "last_verified",
        "verification_status",
        "data_status",
    ],

    "departments.csv": [
        "source_url",
        "source_type",
        "last_verified",
        "verification_status",
        "data_status",
    ],

    "faculty.csv": [
        "source_url",
        "source_type",
        "last_verified",
        "verification_status",
        "data_status",
    ],

    "faculty_expertise.csv": [
        "source_url",
        "verification_status",
    ],

    "institution_expertise.csv": [
        "source_url",
        "verification_status",
        "data_status",
    ],

    "facilities.csv": [
        "source_url",
        "source_type",
        "last_verified",
        "verification_status",
        "data_status",
    ],

    "innovation_entities.csv": [
        "source_url",
        "verification_status",
        "data_status",
    ],

    "industry.csv": [
        "source_url",
        "verification_status",
        "data_status",
    ],

    "government_departments.csv": [
        "source_url",
        "verification_status",
        "data_status",
    ],
}


# ============================================================
# DATE VALIDATION
# ============================================================

def validate_date(value):

    if not value:
        return False

    try:

        datetime.strptime(
            value.strip(),
            "%Y-%m-%d"
        )

        return True

    except ValueError:

        return False


# ============================================================
# VALIDATE ONE DATASET
# ============================================================

def validate_dataset(filename):

    file_path = DATASET_DIR / "raw" / filename

    print()
    print("=" * 60)
    print(
        f"VERIFICATION VALIDATION: {filename}"
    )
    print("=" * 60)

    if not file_path.exists():

        print(
            f"❌ File not found: {file_path}"
        )

        return False

    # --------------------------------------------------------
    # Expertise ontology
    # --------------------------------------------------------

    if filename == "expertise.csv":

        print(
            "✓ Expertise ontology does not "
            "require verification metadata"
        )

        return True

    # --------------------------------------------------------
    # Open CSV
    # --------------------------------------------------------

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        fields = reader.fieldnames or []

        required_verification_fields = (
            VERIFICATION_RULES.get(
                filename,
                []
            )
        )

        # ----------------------------------------------------
        # Check required verification fields
        # ----------------------------------------------------

        missing = [
            field
            for field in required_verification_fields
            if field not in fields
        ]

        if missing:

            print(
                "❌ Missing verification columns:"
            )

            for field in missing:

                print(
                    f"   - {field}"
                )

            return False

        # ----------------------------------------------------
        # Determine ID column
        # ----------------------------------------------------

        schema = DATASET_SCHEMAS.get(
            filename,
            {}
        )

        id_column = schema.get(
            "id_column"
        )

        errors = []

        # ----------------------------------------------------
        # Validate rows
        # ----------------------------------------------------

        for row_number, row in enumerate(
            reader,
            start=2
        ):

            record_id = str(
                row.get(
                    id_column,
                    f"ROW_{row_number}"
                )
            ).strip()

            source_url = str(
                row.get(
                    "source_url",
                    ""
                )
            ).strip()

            source_type = str(
                row.get(
                    "source_type",
                    ""
                )
            ).strip()

            last_verified = str(
                row.get(
                    "last_verified",
                    ""
                )
            ).strip()

            verification_status = str(
                row.get(
                    "verification_status",
                    ""
                )
            ).strip()

            data_status = str(
                row.get(
                    "data_status",
                    ""
                )
            ).strip()

            # =================================================
            # DATA STATUS
            # =================================================

            if "data_status" in fields:

                if data_status not in VALID_DATA_STATUS:

                    errors.append(
                        (
                            row_number,
                            record_id,
                            f"Invalid data_status "
                            f"'{data_status}'"
                        )
                    )

                    continue

            # =================================================
            # VERIFICATION STATUS
            # =================================================

            if "verification_status" in fields:

                if (
                    verification_status
                    not in VALID_VERIFICATION_STATUS
                ):

                    errors.append(
                        (
                            row_number,
                            record_id,
                            f"Invalid verification_status "
                            f"'{verification_status}'"
                        )
                    )

            # =================================================
            # VERIFIED REAL RECORD
            # =================================================

            if data_status in {
                "verified_real",
                "real_verified",
            }:

                if verification_status != "verified":

                    errors.append(
                        (
                            row_number,
                            record_id,
                            "verified_real record must "
                            "have verification_status "
                            "'verified'"
                        )
                    )

                if "source_url" in fields:

                    if source_url == "":

                        errors.append(
                            (
                                row_number,
                                record_id,
                                "verified_real record "
                                "must have source_url"
                            )
                        )

                if "source_type" in fields:

                    if source_type == "":

                        errors.append(
                            (
                                row_number,
                                record_id,
                                "verified_real record "
                                "must have source_type"
                            )
                        )

                if "last_verified" in fields:

                    if last_verified == "":

                        errors.append(
                            (
                                row_number,
                                record_id,
                                "verified_real record "
                                "must have last_verified"
                            )
                        )

                    elif not validate_date(
                        last_verified
                    ):

                        errors.append(
                            (
                                row_number,
                                record_id,
                                "last_verified must "
                                "use YYYY-MM-DD format"
                            )
                        )

            # =================================================
            # SYNTHETIC DEMO
            # =================================================

            if data_status == "synthetic_demo":

                if (
                    verification_status
                    == "verified"
                ):

                    errors.append(
                        (
                            row_number,
                            record_id,
                            "synthetic_demo record "
                            "cannot be marked "
                            "'verified'"
                        )
                    )

    # ========================================================
    # RESULTS
    # ========================================================

    if errors:

        print(
            "❌ Verification metadata errors:"
        )

        for row, record_id, message in errors:

            print(
                f"   Row {row} "
                f"({record_id}): "
                f"{message}"
            )

        return False

    print(
        "✓ Verification metadata valid"
    )

    return True


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("SIH26043 VERIFICATION VALIDATION")
    print("=" * 60)

    overall_valid = True

    for filename in DATASET_SCHEMAS:

        result = validate_dataset(
            filename
        )

        if not result:

            overall_valid = False

    print()
    print("=" * 60)

    if overall_valid:

        print(
            "✓ VERIFICATION VALIDATION PASSED"
        )

    else:

        print(
            "❌ VERIFICATION VALIDATION FAILED"
        )

    print("=" * 60)

    return overall_valid


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    if not main():

        raise SystemExit(1)