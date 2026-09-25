-- =============================================================================
-- Migration 020: Institutional Projects & Collaboration
-- SIH26043 Enhancements for HEI Lifecycle, Funding, Industry Mentorship
-- =============================================================================

CREATE TABLE IF NOT EXISTS institutional_challenge_evaluations (
    id SERIAL PRIMARY KEY,
    problem_id INT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    university_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evaluation_status VARCHAR(50) NOT NULL DEFAULT 'NEW' 
        CHECK (evaluation_status IN ('NEW', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'NEEDS_INFORMATION', 'TEAM_FORMATION', 'IN_PROJECT')),
    review_note TEXT,
    reviewer_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (problem_id, university_id)
);

CREATE TABLE IF NOT EXISTS institutional_projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    problem_id INT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    university_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    faculty_mentor_id INT REFERENCES users(id) ON DELETE SET NULL,
    team_id INT REFERENCES collaboration_teams(id) ON DELETE SET NULL,
    project_status VARCHAR(50) NOT NULL DEFAULT 'PROPOSAL'
        CHECK (project_status IN ('CHALLENGE_ACCEPTED', 'TEAM_FORMED', 'PROPOSAL', 'REVIEW', 'APPROVED', 'PROTOTYPE', 'TESTING', 'PILOT', 'DEPLOYMENT', 'COMPLETED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS industry_collaborations (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES institutional_projects(id) ON DELETE CASCADE,
    partner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collaboration_status VARCHAR(50) NOT NULL DEFAULT 'MATCHED'
        CHECK (collaboration_status IN ('MATCHED', 'INVITED', 'ACCEPTED', 'DECLINED', 'ACTIVE', 'COMPLETED')),
    invited_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, partner_id)
);

CREATE TABLE IF NOT EXISTS project_mentors (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES institutional_projects(id) ON DELETE CASCADE,
    mentor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization VARCHAR(255),
    mentorship_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
        CHECK (mentorship_status IN ('INVITED', 'ACTIVE', 'COMPLETED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, mentor_id)
);

CREATE TABLE IF NOT EXISTS project_funding (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES institutional_projects(id) ON DELETE CASCADE,
    funding_requirement TEXT,
    requested_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    funding_source VARCHAR(255),
    funding_status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED'
        CHECK (funding_status IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RECEIVED')),
    approved_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_test_results (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES institutional_projects(id) ON DELETE CASCADE,
    test_description TEXT NOT NULL,
    test_result VARCHAR(50) NOT NULL,
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('PASS', 'FAIL', 'PARTIAL')),
    remarks TEXT,
    evidence_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_outcomes (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES institutional_projects(id) ON DELETE CASCADE,
    outcome_type VARCHAR(100) NOT NULL CHECK (outcome_type IN ('PATENT', 'COPYRIGHT', 'DESIGN', 'PUBLICATION', 'STARTUP_SPINOFF', 'TECH_TRANSFER', 'TECHNICAL_REPORT', 'OTHER')),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    reference_document_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_activity_log (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES institutional_projects(id) ON DELETE CASCADE,
    actor_id INT REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institutional_capabilities (
    id SERIAL PRIMARY KEY,
    university_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    capability_type VARCHAR(100) NOT NULL CHECK (capability_type IN ('DEPARTMENT', 'LAB', 'INNOVATION_CENTRE', 'INCUBATOR', 'OTHER')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (university_id, capability_type, name)
);

ALTER TABLE problems 
    ADD COLUMN IF NOT EXISTS submitter_source VARCHAR(50) DEFAULT 'CITIZEN'
    CHECK (submitter_source IN ('CITIZEN', 'COMMUNITY_ORGANIZATION', 'PRI', 'ULB', 'GOVERNMENT_DEPARTMENT'));

ALTER TABLE IF EXISTS problem_evidence
    ADD COLUMN IF NOT EXISTS project_id INT REFERENCES institutional_projects(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS document_category VARCHAR(50) DEFAULT 'EVIDENCE'
    CHECK (document_category IN ('PROPOSAL', 'RESEARCH_DOCUMENT', 'DESIGN', 'PROTOTYPE', 'TEST_REPORT', 'APPROVAL', 'EVIDENCE', 'DEPLOYMENT', 'OUTCOME'));
