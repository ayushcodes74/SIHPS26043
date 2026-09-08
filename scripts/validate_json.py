import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
JSON_DIR = ROOT_DIR / "dataset" / "json"


def load_json(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return None
    except Exception as e:
        print(f"❌ Could not read file: {e}")
        return None


def validate_test_ids(data, file_name):
    errors = 0
    ids = set()

    for index, item in enumerate(data, start=1):
        test_id = item.get("test_id")

        if not test_id:
            print(f"❌ Item {index} missing test_id")
            errors += 1
            continue

        if test_id in ids:
            print(f"❌ Item {index} duplicate test_id: {test_id}")
            errors += 1
        else:
            ids.add(test_id)

        if file_name == "ai_test_cases.json":
            if not re.fullmatch(r"AITC\d{3,}", test_id):
                print(f"❌ Item {index} invalid test_id format: {test_id}")
                errors += 1

        elif file_name == "matching_test_cases.json":
            if not re.fullmatch(r"MTC\d{3,}", test_id):
                print(f"❌ Item {index} invalid test_id format: {test_id}")
                errors += 1

    if errors == 0:
        print("✓ Test case IDs are valid and unique")

    return errors


def validate_ai_test_cases(data):
    errors = 0

    required_fields = [
        "test_id",
        "input_text",
        "expected_domain",
        "expected_subdomain",
        "expected_problem_type",
        "expected_summary",
        "expected_expertise",
        "expected_severity",
        "expected_urgency",
    ]

    allowed_severity = {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    allowed_urgency = {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    for index, item in enumerate(data, start=1):

        # Required fields
        missing = [
            field
            for field in required_fields
            if field not in item
        ]

        if missing:
            print(f"❌ Item {index} missing fields:")
            for field in missing:
                print(f"   - {field}")
            errors += 1
            continue

        # Required text fields
        text_fields = [
            "test_id",
            "input_text",
            "expected_domain",
            "expected_subdomain",
            "expected_problem_type",
            "expected_summary",
            "expected_severity",
            "expected_urgency",
        ]

        for field in text_fields:
            value = item.get(field)

            if not isinstance(value, str) or not value.strip():
                print(
                    f"❌ Item {index} invalid/empty {field}"
                )
                errors += 1

        # Expertise list
        expertise = item.get("expected_expertise")

        if not isinstance(expertise, list):
            print(
                f"❌ Item {index} expected_expertise must be a list"
            )
            errors += 1
        else:
            for exp_id in expertise:
                if not isinstance(exp_id, str):
                    print(
                        f"❌ Item {index} invalid expertise ID: {exp_id}"
                    )
                    errors += 1

                elif not re.fullmatch(r"EXP\d{3,}", exp_id):
                    print(
                        f"❌ Item {index} invalid expertise ID format: {exp_id}"
                    )
                    errors += 1

        # Severity
        severity = item.get("expected_severity")

        if severity not in allowed_severity:
            print(
                f"❌ Item {index} invalid severity: {severity}"
            )
            errors += 1

        # Urgency
        urgency = item.get("expected_urgency")

        if urgency not in allowed_urgency:
            print(
                f"❌ Item {index} invalid urgency: {urgency}"
            )
            errors += 1

    if errors == 0:
        print("✓ AI test case structure and values valid")

    return errors


def validate_matching_test_cases(data):
    errors = 0

    required_fields = [
        "test_id",
        "challenge_id",
        "challenge_title",
        "required_expertise",
        "expected_top_institutions",
    ]

    for index, item in enumerate(data, start=1):

        # Required fields
        missing = [
            field
            for field in required_fields
            if field not in item
        ]

        if missing:
            print(f"❌ Item {index} missing fields:")
            for field in missing:
                print(f"   - {field}")
            errors += 1
            continue

        # Basic text fields
        text_fields = [
            "test_id",
            "challenge_id",
            "challenge_title",
        ]

        for field in text_fields:
            value = item.get(field)

            if not isinstance(value, str) or not value.strip():
                print(
                    f"❌ Item {index} invalid/empty {field}"
                )
                errors += 1

        # Challenge ID
        challenge_id = item.get("challenge_id")

        if not re.fullmatch(r"CH\d{3,}", challenge_id):
            print(
                f"❌ Item {index} invalid challenge_id: "
                f"{challenge_id}"
            )
            errors += 1

        # Required expertise
        expertise = item.get("required_expertise")

        if not isinstance(expertise, list):
            print(
                f"❌ Item {index} required_expertise "
                f"must be a list"
            )
            errors += 1
        else:
            for exp_id in expertise:
                if not isinstance(exp_id, str):
                    print(
                        f"❌ Item {index} invalid expertise ID: "
                        f"{exp_id}"
                    )
                    errors += 1

                elif not re.fullmatch(r"EXP\d{3,}", exp_id):
                    print(
                        f"❌ Item {index} invalid expertise ID format: "
                        f"{exp_id}"
                    )
                    errors += 1

        # Expected institutions
        institutions = item.get("expected_top_institutions")

        if not isinstance(institutions, list):
            print(
                f"❌ Item {index} expected_top_institutions "
                f"must be a list"
            )
            errors += 1
            continue

        if len(institutions) == 0:
            print(
                f"❌ Item {index} has no expected institutions"
            )
            errors += 1
            continue

        for inst_index, institution in enumerate(
            institutions, start=1
        ):

            if not isinstance(institution, dict):
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"must be an object"
                )
                errors += 1
                continue

            institution_required = [
                "institution_id",
                "institution_name",
                "match_score_expected",
                "evidence_references",
                "candidate_faculty",
                "reason",
            ]

            missing_inst = [
                field
                for field in institution_required
                if field not in institution
            ]

            if missing_inst:
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"missing fields:"
                )

                for field in missing_inst:
                    print(f"   - {field}")

                errors += 1
                continue

            # Institution ID
            institution_id = institution.get("institution_id")

            if not isinstance(institution_id, str):
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"invalid institution_id"
                )
                errors += 1

            elif not re.fullmatch(
                r"INST\d{3,}",
                institution_id
            ):
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"invalid institution_id format: "
                    f"{institution_id}"
                )
                errors += 1

            # Institution name
            institution_name = institution.get(
                "institution_name"
            )

            if (
                not isinstance(institution_name, str)
                or not institution_name.strip()
            ):
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"invalid institution_name"
                )
                errors += 1

            # Match score
            score = institution.get(
                "match_score_expected"
            )

            if not isinstance(score, (int, float)):
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"match_score_expected must be numeric"
                )
                errors += 1

            elif not 0 <= score <= 1:
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"match_score_expected must be between 0 and 1"
                )
                errors += 1

            # Evidence references
            evidence = institution.get(
                "evidence_references"
            )

            if not isinstance(evidence, list):
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"evidence_references must be a list"
                )
                errors += 1
            else:
                for evidence_id in evidence:
                    if not isinstance(evidence_id, str):
                        print(
                            f"❌ Item {index}, institution "
                            f"{inst_index} invalid evidence ID"
                        )
                        errors += 1

            # Candidate faculty
            faculty = institution.get(
                "candidate_faculty"
            )

            if not isinstance(faculty, list):
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"candidate_faculty must be a list"
                )
                errors += 1
            else:
                for faculty_id in faculty:
                    if not isinstance(faculty_id, str):
                        print(
                            f"❌ Item {index}, institution "
                            f"{inst_index} invalid faculty ID"
                        )
                        errors += 1

                    elif not re.fullmatch(
                        r"FAC\d{3,}",
                        faculty_id
                    ):
                        print(
                            f"❌ Item {index}, institution "
                            f"{inst_index} invalid faculty ID: "
                            f"{faculty_id}"
                        )
                        errors += 1

            # Reason
            reason = institution.get("reason")

            if not isinstance(reason, str) or not reason.strip():
                print(
                    f"❌ Item {index}, institution {inst_index} "
                    f"reason is empty"
                )
                errors += 1

    if errors == 0:
        print(
            "✓ Matching test case structure and values valid"
        )

    return errors


def validate_json_file(file_name):
    print("=" * 60)
    print(f"JSON VALIDATION: {file_name}")
    print("=" * 60)

    file_path = JSON_DIR / file_name

    if not file_path.exists():
        print("❌ File does not exist")
        return 1

    print("✓ File exists")

    data = load_json(file_path)

    if data is None:
        return 1

    print("✓ Valid JSON")

    if not isinstance(data, list):
        print("❌ Root JSON structure must be a list")
        return 1

    print(f"✓ Root structure is a list ({len(data)} items)")

    errors = 0

    errors += validate_test_ids(data, file_name)

    if file_name == "ai_test_cases.json":
        errors += validate_ai_test_cases(data)

    elif file_name == "matching_test_cases.json":
        errors += validate_matching_test_cases(data)

    return errors


def main():
    print()
    print("=" * 60)
    print("SIH26043 JSON VALIDATION")
    print("=" * 60)
    print()

    files = [
        "ai_test_cases.json",
        "matching_test_cases.json",
    ]

    total_errors = 0

    for file_name in files:
        total_errors += validate_json_file(file_name)
        print()

    print("=" * 60)

    if total_errors == 0:
        print("✓ ALL JSON VALIDATION PASSED")
    else:
        print("❌ JSON VALIDATION FAILED")
        print(f"Total errors: {total_errors}")

    print("=" * 60)

    return 1 if total_errors > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())