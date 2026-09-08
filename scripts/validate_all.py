import subprocess
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"


VALIDATORS = [
    ("CSV Schema Validation", "validate_csv.py"),
    ("ID Validation", "validate_ids.py"),
    ("Foreign Key Validation", "validate_foreign_keys.py"),
    ("Enum Validation", "validate_enums.py"),
    ("URL Validation", "validate_urls.py"),
    ("Verification Metadata Validation", "validate_verification.py"),
    ("JSON Validation", "validate_json.py"),
]


def run_validator(name, script_name):
    print()
    print("=" * 70)
    print(f"RUNNING: {name}")
    print("=" * 70)

    script_path = SCRIPTS_DIR / script_name

    if not script_path.exists():
        print(f"❌ Validator not found: {script_name}")
        return False

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=ROOT_DIR,
            capture_output=False
        )

        if result.returncode == 0:
            print(f"✓ {name} PASSED")
            return True

        print(f"❌ {name} FAILED")
        return False

    except Exception as e:
        print(f"❌ Error running {script_name}: {e}")
        return False


def main():
    print()
    print("=" * 70)
    print("SIH26043 MASTER DATASET VALIDATOR")
    print("=" * 70)
    print()
    print("Running all dataset validation checks...")
    print()

    results = []

    for name, script_name in VALIDATORS:
        passed = run_validator(name, script_name)
        results.append((name, passed))

    print()
    print("=" * 70)
    print("MASTER VALIDATION SUMMARY")
    print("=" * 70)

    passed_count = 0
    failed_count = 0

    for name, passed in results:
        if passed:
            print(f"✓ PASS  | {name}")
            passed_count += 1
        else:
            print(f"❌ FAIL  | {name}")
            failed_count += 1

    print()
    print("-" * 70)
    print(f"Passed: {passed_count}")
    print(f"Failed: {failed_count}")
    print("-" * 70)

    if failed_count == 0:
        print()
        print("🎉 ALL DATASET VALIDATIONS PASSED")
        print("Dataset package is structurally ready for the next stage.")
        print()
        return 0

    print()
    print("❌ MASTER VALIDATION FAILED")
    print("Fix the failed validation stages before proceeding.")
    print()

    return 1


if __name__ == "__main__":
    raise SystemExit(main())