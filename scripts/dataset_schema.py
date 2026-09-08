from pathlib import Path

DATASET_DIR = Path(__file__).resolve().parent.parent / "dataset"


DATASET_SCHEMAS = {

    # ============================================================
    # 1. DEPARTMENTS
    # ============================================================

    "departments.csv": {

        "id_column": "department_id",

        "required_columns": [
            "department_id",
            "institution_id",
            "department_name",
            "department_type",
            "description",
            "major_domains",
            "official_url",
            "source_url",
            "source_type",
            "last_verified",
            "verification_status",
            "data_status",
        ],

        "optional_columns": [],

        "types": {
            "department_id": "string",
            "institution_id": "string",
            "department_name": "string",
            "department_type": "string",
            "description": "string",
            "major_domains": "string",
            "official_url": "url",
            "source_url": "url",
            "source_type": "string",
            "last_verified": "date",
            "verification_status": "string",
            "data_status": "string",
        },

        "allowed_values": {

            "verification_status": [
                "verified",
                "unverified"
            ],

            "data_status": [
                "verified_real",
                "real_verified",
                "real_unverified",
                "synthetic_demo"
            ],

            "department_type": [
                "Academic Department",
                "School",
                "Centre",
                "Institute",
                "Faculty",
                "Research Department",
                "Academic & Research",
                "Clinical & Public Health",
                "Other"
            ]
        }
    },


    # ============================================================
    # 2. FACULTY
    # ============================================================

    "faculty.csv": {

        "id_column": "faculty_id",

        "required_columns": [
            "faculty_id",
            "institution_id",
            "department_id",
            "name",
            "designation",
            "profile_url",
            "official_email_if_public",
            "research_interests",
            "research_keywords",
            "source_url",
            "source_type",
            "last_verified",
            "verification_status",
            "data_status",
        ],

        "optional_columns": [],

        "types": {
            "faculty_id": "string",
            "institution_id": "string",
            "department_id": "string",
            "name": "string",
            "designation": "string",
            "profile_url": "url",
            "official_email_if_public": "email",
            "research_interests": "string",
            "research_keywords": "string",
            "source_url": "url",
            "source_type": "string",
            "last_verified": "date",
            "verification_status": "string",
            "data_status": "string",
        },

        "allowed_values": {

            "verification_status": [
                "verified",
                "unverified"
            ],

            "data_status": [
                "verified_real",
                "real_verified",
                "real_unverified",
                "synthetic_demo"
            ]
        }
    },


    # ============================================================
    # 3. EXPERTISE / CAPABILITY
    # ============================================================

    "expertise.csv": {

        "id_column": "expertise_id",

        "required_columns": [
            "expertise_id",
            "name",
            "category",
            "subcategory",
            "description",
            "keywords",
            "related_expertise",
        ],

        "optional_columns": [],

        "types": {
            "expertise_id": "string",
            "name": "string",
            "category": "string",
            "subcategory": "string",
            "description": "string",
            "keywords": "string",
            "related_expertise": "string",
        },

        "allowed_values": {

            "category": [
                "Water",
                "Agriculture",
                "Healthcare",
                "Education",
                "Environment",
                "Energy",
                "Sanitation",
                "Urban Infrastructure",
                "Rural Livelihood",
                "Accessibility",
                "AI/ML",
                "IoT",
                "Robotics",
                "Remote Sensing",
                "GIS",
                "Software",
                "Biotechnology",
                "Public Health",
                "Manufacturing",
                "Materials",
                "Social Sciences",
                "Economics",
                "Management",
                "Electronics",
                "Mechanical Engineering",
                "Civil Engineering",
                "Chemical Engineering",
                "Food Technology",
                "Other"
            ]
        }
    },


    # ============================================================
    # 4. FACULTY - EXPERTISE MAPPING
    # ============================================================

    "faculty_expertise.csv": {

        "id_column": "faculty_expertise_id",

        "required_columns": [
            "faculty_expertise_id",
            "faculty_id",
            "expertise_id",
            "confidence_score",
            "evidence",
            "source_url",
            "verification_status",
        ],

        "optional_columns": [],

        "types": {
            "faculty_expertise_id": "string",
            "faculty_id": "string",
            "expertise_id": "string",
            "confidence_score": "float",
            "evidence": "string",
            "source_url": "url",
            "verification_status": "string",
        },

        "allowed_values": {

            "verification_status": [
                "verified",
                "unverified"
            ]
        },

        "numeric_constraints": {

            "confidence_score": {
                "min": 0.0,
                "max": 1.0
            }
        }
    },


    # ============================================================
    # 5. INSTITUTION - EXPERTISE MAPPING
    # ============================================================

    "institution_expertise.csv": {

        "id_column": "mapping_id",

        "required_columns": [
            "mapping_id",
            "institution_id",
            "expertise_id",
            "strength_score",
            "evidence",
            "source_url",
            "verification_status",
            "data_status",
        ],

        "optional_columns": [],

        "types": {
            "mapping_id": "string",
            "institution_id": "string",
            "expertise_id": "string",
            "strength_score": "float",
            "evidence": "string",
            "source_url": "url",
            "verification_status": "string",
            "data_status": "string",
        },

        "allowed_values": {

            "verification_status": [
                "verified",
                "unverified"
            ],

            "data_status": [
                "verified_real",
                "real_verified",
                "real_unverified",
                "synthetic_demo"
            ]
        },

        "numeric_constraints": {

            "strength_score": {
                "min": 0.0,
                "max": 1.0
            }
        }
    },
}