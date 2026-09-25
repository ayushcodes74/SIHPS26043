const { Pool } = require("pg");
require("dotenv").config();

const pgPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "civicsync",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    connectionTimeoutMillis: 1000,
});

let isPgAvailable = null;

// Verified bcrypt hash for "CivicSync2026!"
const DEMO_HASH = "$2b$10$/oJj4fE6zX.LA4yK.rw9IO5rsASnVRfZAkMrxkYXXFbZvK.WrexFC";

// In-Memory Database Store Fallback (active when PostgreSQL port 5432 is not running)
const memoryDB = {
    problems: [
        {
            id: "prob-200",
            reporter_id: 1,
            title: "Recurring Urban Waterlogging and Storm Drain Congestion",
            description: "Monsoon rains submerge low-lying residential sectors and arterial roads under 3 feet of water for days due to silted natural nullahs and uncoordinated storm culverts",
            category: "Water & Sanitation",
            subcategory: "Groundwater Quality & Potable Supply",
            district: "Chatra",
            city: "Chatra Municipal Area",
            address: "Near Main Chowk, Chatra, Jharkhand",
            affected_people: 1200,
            ai_summary: "Water & Sanitation challenge identified in Chatra: Recurring Urban Waterlogging and Storm Drain Congestion. Immediate engineering and drainage intervention required.",
            ai_keywords: ["Waterlogging", "Storm Drainage", "Culvert Siltation", "Monsoon Flood", "Sanitation"],
            required_expertise: ["Hydrogeology", "Environmental Engineering", "Civil Engineering", "Water Quality Testing"],
            severity: 7,
            urgency: 7,
            ai_confidence: 0.94,
            priority_score: 80,
            status: "REPORTED",
            cluster_id: 2,
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
            id: "prob-042",
            reporter_id: 1,
            title: "Yellow contaminated handpump water in Ward 4 village, Dhanbad",
            description: "The water coming out of handpumps has turned metallic yellow and has a high iron and mineral salinity odor. Residents and children are facing severe gastroenteritis and skin rashes.",
            category: "Water & Sanitation",
            subcategory: "Groundwater Quality & Potable Supply",
            district: "Dhanbad",
            city: "Govindpur Block",
            address: "Ward 4, Near Panchayat Bhawan, Barmasia",
            affected_people: 1250,
            ai_summary: "Critical groundwater iron contamination affecting 1,250 residents. Immediate geochemical testing and localized filtration required.",
            ai_keywords: ["Handpump", "Water Quality", "Iron Contamination", "Sanitation", "Groundwater"],
            required_expertise: ["Water Quality Testing", "Hydrogeology", "Environmental Engineering", "IoT Sensors"],
            severity: 9,
            urgency: 10,
            ai_confidence: 0.96,
            priority_score: 95,
            status: "REPORTED",
            cluster_id: 2,
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 4).toISOString()
        },
        {
            id: "prob-101",
            reporter_id: 1,
            title: "Severe monsoon waterlogging and submerged culvert on Kolar Road, Ranchi",
            description: "Trunk stormwater culverts are blocked with construction silt and plastic debris. Water levels reach 3 feet during 30 minutes of rain, cutting off access for ambulances and commuters.",
            category: "Drainage & Flood Control",
            subcategory: "Stormwater Drainage & Flood Mitigation",
            district: "Ranchi",
            city: "Ranchi Municipal Area",
            address: "Kolar Road, Junction 4 near Chutia Overbridge",
            affected_people: 3800,
            ai_summary: "Severe arterial waterlogging due to culvert siltation chokes. Requires hydraulic modeling, desilting, and storm grate retrofits.",
            ai_keywords: ["Waterlogging", "Culvert Choke", "Storm Drainage", "Monsoon Flood", "Civil Repair"],
            required_expertise: ["Civil Engineering", "Hydrology", "Stormwater Drainage", "Urban Planning"],
            severity: 8,
            urgency: 9,
            ai_confidence: 0.94,
            priority_score: 88,
            status: "UNDER_REVIEW",
            cluster_id: 1,
            created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
        },
        {
            id: "prob-102",
            reporter_id: 9,
            title: "Underground drinking water main pipeline fracture near Albert Ekka Chowk, Ranchi",
            description: "High-pressure municipal potable water pipeline has burst underground, wasting thousands of liters per hour and creating a massive sinkhole hazard in the middle of Main Road.",
            category: "Water & Sanitation",
            subcategory: "Water Distribution Infrastructure",
            district: "Ranchi",
            city: "Ranchi Sadar",
            address: "Main Road, 50m North of Albert Ekka Chowk",
            affected_people: 5200,
            ai_summary: "Major pressurized pipeline rupture causing severe drinking water loss and structural pavement cavity.",
            ai_keywords: ["Pipeline Burst", "Potable Water", "Main Road", "Sinkhole Hazard", "Water Pressure"],
            required_expertise: ["Civil Engineering", "Pipeline Inspection", "Hydrogeology", "Structural Analysis"],
            severity: 9,
            urgency: 10,
            ai_confidence: 0.97,
            priority_score: 96,
            status: "APPROVED",
            cluster_id: null,
            created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
            id: "prob-103",
            reporter_id: 1,
            title: "Dangerous streetlight blackout along 1.5km Harmu Bypass corridor, Ranchi",
            description: "Over 35 continuous LED streetlight poles are non-functional due to damaged underground junction boxes. Multiple two-wheeler accidents and pedestrian safety risks reported.",
            category: "Electricity & Lighting",
            subcategory: "Street Lighting & Energy Optimization",
            district: "Ranchi",
            city: "Harmu Housing Colony",
            address: "Harmu Bypass Road, from Patel Chowk to Sahajanand Chowk",
            affected_people: 4100,
            ai_summary: "1.5km continuous illumination failure creating severe vehicular accident and night-time pedestrian vulnerability.",
            ai_keywords: ["Street Light Outage", "Underground Cable", "Harmu Bypass", "Night Safety", "Smart Grid"],
            required_expertise: ["Electrical Engineering", "Smart Grids", "Embedded Systems", "Energy Audit"],
            severity: 7,
            urgency: 8,
            ai_confidence: 0.93,
            priority_score: 79,
            status: "ASSIGNED",
            cluster_id: null,
            created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
            id: "prob-104",
            reporter_id: 9,
            title: "Massive solid waste accumulation and plastic burning near Harmu Riverbank, Ranchi",
            description: "Uncontrolled dumping of mixed municipal garbage and open burning of toxic plastic waste. Smoke blankets residential wards and leachate infiltrates the riverbank soil.",
            category: "Solid Waste Management",
            subcategory: "Waste Segregation & Disposal",
            district: "Ranchi",
            city: "Doranda Zone",
            address: "Harmu River Bank, Near Muktidham Bridge, Ward 26",
            affected_people: 6500,
            ai_summary: "Open dumping and toxic plastic combustion creating acute respiratory hazards and riverine soil contamination.",
            ai_keywords: ["Solid Waste", "Plastic Burning", "Harmu River", "Toxic Smoke", "Leachate"],
            required_expertise: ["Environmental Science", "Waste Management", "Biotechnology", "Supply Chain Logistics"],
            severity: 8,
            urgency: 8,
            ai_confidence: 0.95,
            priority_score: 84,
            status: "UNDER_REVIEW",
            cluster_id: 3,
            created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 18).toISOString()
        },
        {
            id: "prob-105",
            reporter_id: 1,
            title: "Deep asphalt collapse and hazardous potholes at Ratu Road intersection, Ranchi",
            description: "Bitumen surface has sheared off exposing underlying rubble base. Potholes exceed 15 inches depth causing vehicular axle damage and frequent peak-hour gridlocks.",
            category: "Roads & Infrastructure",
            subcategory: "Pothole & Surface Damage",
            district: "Ranchi",
            city: "Ratu Road",
            address: "Ratu Road Chowk near Durga Mandir",
            affected_people: 8500,
            ai_summary: "Major arterial road failure with deep road craters endangering commuters and slowing commercial transport.",
            ai_keywords: ["Potholes", "Ratu Road", "Bitumen Failure", "Traffic Congestion", "Road Safety"],
            required_expertise: ["Civil Engineering", "Structural Analysis", "Pavement Design", "GIS Mapping"],
            severity: 8,
            urgency: 9,
            ai_confidence: 0.92,
            priority_score: 86,
            status: "REPORTED",
            cluster_id: 4,
            created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 8).toISOString()
        },
        {
            id: "prob-106",
            reporter_id: 9,
            title: "Vector-borne dengue outbreak hazard from stagnant water pools in Ward 14, Ranchi",
            description: "Unfinished civic trenching work has created extensive stagnant breeding grounds for Aedes aegypti mosquitoes. Over 18 confirmed dengue cases recorded in the past fortnight.",
            category: "Public Health & Environment",
            subcategory: "Vector-Borne Disease Control",
            district: "Ranchi",
            city: "Bariatu",
            address: "Ward 14, Housing Board Colony, Near RIMS Road",
            affected_people: 2200,
            ai_summary: "Active dengue vector proliferation site requiring immediate larvicidal treatment, channel drainage, and community fogging.",
            ai_keywords: ["Dengue", "Mosquito Breeding", "Stagnant Water", "Public Health", "Ward 14"],
            required_expertise: ["Epidemiology", "Public Health", "Environmental Engineering", "Data Analysis"],
            severity: 9,
            urgency: 9,
            ai_confidence: 0.95,
            priority_score: 91,
            status: "VERIFIED",
            cluster_id: null,
            created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 14).toISOString()
        },
        {
            id: "prob-107",
            reporter_id: 1,
            title: "Broken stormwater drain grate trapping vehicle tires at Lalpur Chowk, Ranchi",
            description: "Heavy cast-iron drain grate has snapped in two. Cars and auto-rickshaws frequently get stuck in the opening during turning maneuvers.",
            category: "Drainage & Flood Control",
            subcategory: "Stormwater Drainage & Flood Mitigation",
            district: "Ranchi",
            city: "Lalpur",
            address: "Lalpur Chowk, Circular Road Corner",
            affected_people: 4500,
            ai_summary: "Damaged drainage grate causing immediate traffic safety hazards and vehicle tire entrapment at high-density junction.",
            ai_keywords: ["Drain Grate", "Lalpur Chowk", "Cast Iron", "Traffic Hazard", "Road Safety"],
            required_expertise: ["Civil Engineering", "Structural Analysis", "Pavement Design"],
            severity: 7,
            urgency: 8,
            ai_confidence: 0.91,
            priority_score: 77,
            status: "RESOLVED",
            cluster_id: 1,
            created_at: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        },
        {
            id: "prob-108",
            reporter_id: 9,
            title: "Coliform bacterial contamination in municipal community well, Barmasia, Dhanbad",
            description: "Laboratory water samples indicate E. coli and total coliform levels exceeding permissible limits by 400%. Over 30 families rely on this well for non-packaged drinking needs.",
            category: "Water & Sanitation",
            subcategory: "Groundwater Quality & Potable Supply",
            district: "Dhanbad",
            city: "Dhanbad Municipal Corporation",
            address: "Barmasia Purana Bazar, Near Middle School",
            affected_people: 950,
            ai_summary: "High microbiological contamination in community well requiring immediate chlorination, UV sanitation, and pipeline rerouting.",
            ai_keywords: ["Bacterial Contamination", "Coliform", "Well Water", "Potable Supply", "Dhanbad"],
            required_expertise: ["Water Quality Testing", "Biotechnology", "Environmental Engineering", "Hydrogeology"],
            severity: 9,
            urgency: 10,
            ai_confidence: 0.98,
            priority_score: 97,
            status: "ASSIGNED",
            cluster_id: 2,
            created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 6).toISOString()
        },
        {
            id: "prob-109",
            reporter_id: 1,
            title: "Oil leakage and sparking transformer near Kokar Industrial Area, Ranchi",
            description: "Heavy distribution transformer is leaking dielectric oil with visible sparking during peak industrial shift loads. High fire hazard next to wooden packing warehouse.",
            category: "Electricity & Lighting",
            subcategory: "Power Distribution Infrastructure",
            district: "Ranchi",
            city: "Kokar",
            address: "Kokar Industrial Estate, Plot 14-B",
            affected_people: 1800,
            ai_summary: "Severe dielectric oil leak and electrical sparking posing active fire risk to nearby commercial and warehouse facilities.",
            ai_keywords: ["Transformer Oil", "Electrical Spark", "Fire Hazard", "Industrial Grid", "Kokar"],
            required_expertise: ["Electrical Engineering", "Smart Grids", "Energy Audit", "SCADA"],
            severity: 9,
            urgency: 9,
            ai_confidence: 0.96,
            priority_score: 93,
            status: "REPORTED",
            cluster_id: null,
            created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
            id: "prob-110",
            reporter_id: 9,
            title: "Commercial food waste accumulation attracting stray packs at Morabadi, Ranchi",
            description: "Night market food vendors dump unsegregated wet organic waste into open plots. Rotting organic stench and packs of aggressive stray animals endanger joggers.",
            category: "Solid Waste Management",
            subcategory: "Waste Segregation & Disposal",
            district: "Ranchi",
            city: "Morabadi",
            address: "Morabadi Ground North Gate, Near Open Gymnasium",
            affected_people: 3200,
            ai_summary: "Organic waste dumping site causing environmental foul odors and stray animal pack aggression on morning public tracks.",
            ai_keywords: ["Food Waste", "Organic Waste", "Morabadi", "Sanitation", "Stray Dogs"],
            required_expertise: ["Environmental Science", "Waste Management", "Biotechnology"],
            severity: 6,
            urgency: 7,
            ai_confidence: 0.90,
            priority_score: 72,
            status: "UNDER_REVIEW",
            cluster_id: 3,
            created_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 20).toISOString()
        },
        {
            id: "prob-111",
            reporter_id: 1,
            title: "Collapsed culvert slab outside Doranda Girls High School, Ranchi",
            description: "Concrete culvert slab collapsed under a heavy water tanker. A 4-foot deep open ditch is positioned directly in front of the school exit gate.",
            category: "Roads & Infrastructure",
            subcategory: "Culvert & Bridge Maintenance",
            district: "Ranchi",
            city: "Doranda",
            address: "Doranda Girls High School Main Gate, AG Colony Road",
            affected_people: 1600,
            ai_summary: "Open hazardous cavity at school gate following structural slab fracture. Urgent reinforced concrete precast slab replacement needed.",
            ai_keywords: ["School Gate", "Culvert Collapse", "Concrete Slab", "Child Safety", "Doranda"],
            required_expertise: ["Civil Engineering", "Structural Analysis", "Pavement Design"],
            severity: 9,
            urgency: 10,
            ai_confidence: 0.97,
            priority_score: 95,
            status: "VERIFIED",
            cluster_id: 4,
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 3).toISOString()
        },
        {
            id: "prob-112",
            reporter_id: 9,
            title: "Vibrations and bridge expansion joint gap widening at Hinoo Bridge, Ranchi",
            description: "Expansion joint plates on the Hinoo river bridge have loosened. Heavy buses cause severe vertical vibration and loose metal plate rattling.",
            category: "Roads & Infrastructure",
            subcategory: "Culvert & Bridge Maintenance",
            district: "Ranchi",
            city: "Hinoo",
            address: "Hinoo Main Bridge, Airport Road Connector",
            affected_people: 9200,
            ai_summary: "Expansion joint displacement and bridge structural oscillation requiring non-destructive testing and elastomeric joint replacement.",
            ai_keywords: ["Hinoo Bridge", "Expansion Joint", "Structural Vibration", "Bridge Safety", "Airport Road"],
            required_expertise: ["Civil Engineering", "Structural Analysis", "GIS Mapping"],
            severity: 9,
            urgency: 9,
            ai_confidence: 0.95,
            priority_score: 92,
            status: "REPORTED",
            cluster_id: 4,
            created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 10).toISOString()
        }
    ],
    challenges: [],
    challenge_dossiers: [],
    users: [
        { id: 1, name: "Ramesh Citizen", email: "citizen@civicsync.demo", phone: "9876543210", password_hash: DEMO_HASH, role: "CITIZEN", is_active: true, created_at: new Date().toISOString() },
        { id: 2, name: "Arjun Sharma", email: "student@civicsync.demo", phone: "9876543211", password_hash: DEMO_HASH, role: "STUDENT", is_active: true, created_at: new Date().toISOString() },
        { id: 3, name: "Dr. Sunita Rao", email: "researcher@civicsync.demo", phone: "9876543212", password_hash: DEMO_HASH, role: "RESEARCHER", is_active: true, created_at: new Date().toISOString() },
        { id: 4, name: "AquaTech Solutions", email: "startup@civicsync.demo", phone: "9876543213", password_hash: DEMO_HASH, role: "STARTUP", is_active: true, created_at: new Date().toISOString() },
        { id: 5, name: "EcoFilter Works", email: "msme@civicsync.demo", phone: "9876543214", password_hash: DEMO_HASH, role: "MSME", is_active: true, created_at: new Date().toISOString() },
        { id: 6, name: "IIT (ISM) Dhanbad", email: "university@civicsync.demo", phone: "9876543215", password_hash: DEMO_HASH, role: "UNIVERSITY", is_active: true, created_at: new Date().toISOString() },
        { id: 7, name: "Ranchi Municipal Corporation", email: "authority@civicsync.demo", phone: "9876543216", password_hash: DEMO_HASH, role: "AUTHORITY", is_active: true, created_at: new Date().toISOString() },
        { id: 8, name: "Platform Admin", email: "admin@civicsync.demo", phone: "9876543217", password_hash: DEMO_HASH, role: "ADMIN", is_active: true, created_at: new Date().toISOString() },
        { id: 9, name: "Pooja Verma", email: "citizen@example.com", phone: "9876543218", password_hash: DEMO_HASH, role: "CITIZEN", is_active: true, created_at: new Date().toISOString() },
        { id: 10, name: "Priya Patel", email: "priya.patel@civicsync.demo", phone: "9876543219", password_hash: DEMO_HASH, role: "STUDENT", is_active: true, created_at: new Date().toISOString() },
        { id: 11, name: "Rohan Gupta", email: "rohan.gupta@civicsync.demo", phone: "9876543220", password_hash: DEMO_HASH, role: "STUDENT", is_active: true, created_at: new Date().toISOString() },
        { id: 12, name: "Ananya Verma", email: "ananya.verma@civicsync.demo", phone: "9876543221", password_hash: DEMO_HASH, role: "STUDENT", is_active: true, created_at: new Date().toISOString() },
        { id: 13, name: "Vikram Singh", email: "vikram.singh@civicsync.demo", phone: "9876543222", password_hash: DEMO_HASH, role: "STUDENT", is_active: true, created_at: new Date().toISOString() }
    ],
    student_profiles: [
        {
            id: 1,
            user_id: 2,
            institution_id: 1,
            department_id: 1,
            course: "B.Tech Computer Science & IoT Engineering",
            graduation_year: 2027,
            institution_name: "BIT Mesra, Ranchi",
            department_name: "Department of Computer Science & Engineering",
            skills: ["Water Quality Testing", "Hydrogeology", "Environmental Engineering", "IoT Sensors", "Embedded Systems", "Python", "Data Analysis"]
        },
        {
            id: 2,
            user_id: 10,
            institution_id: 2,
            department_id: 2,
            course: "B.Tech Civil Engineering",
            graduation_year: 2026,
            institution_name: "NIT Jamshedpur",
            department_name: "Department of Civil Engineering",
            skills: ["Civil Engineering", "Structural Analysis", "Pavement Design", "GIS Mapping", "AutoCAD", "Culvert Maintenance"]
        },
        {
            id: 3,
            user_id: 11,
            institution_id: 3,
            department_id: 3,
            course: "M.Tech Environmental Engineering",
            graduation_year: 2026,
            institution_name: "IIT (ISM) Dhanbad",
            department_name: "Department of Environmental Science",
            skills: ["Environmental Science", "Waste Management", "Biotechnology", "Supply Chain Logistics", "Water Quality Testing", "Chemical Testing"]
        },
        {
            id: 4,
            user_id: 12,
            institution_id: 1,
            department_id: 4,
            course: "B.Tech Electrical & Electronics Engineering",
            graduation_year: 2027,
            institution_name: "BIT Mesra, Ranchi",
            department_name: "Department of Electrical & Electronics Engineering",
            skills: ["Electrical Engineering", "Smart Grids", "Embedded Systems", "Energy Audit", "SCADA", "Power Distribution"]
        },
        {
            id: 5,
            user_id: 13,
            institution_id: 3,
            department_id: 2,
            course: "B.Tech Water Resources Engineering",
            graduation_year: 2026,
            institution_name: "IIT (ISM) Dhanbad",
            department_name: "Department of Civil & Environmental Engineering",
            skills: ["Civil Engineering", "Hydrology", "Stormwater Drainage", "Urban Planning", "Hydraulic Modeling", "GIS Mapping"]
        }
    ],
    faculty_profiles: [
        {
            id: 1,
            user_id: 6,
            name: "Dr. Rajesh Verma",
            institution_id: 1,
            department_id: 2,
            institution_name: "BIT Mesra, Ranchi",
            department_name: "Department of Civil Engineering",
            expertise: ["Civil Engineering", "Hydrology", "Stormwater Drainage", "Structural Analysis"],
            active_projects: 4
        },
        {
            id: 2,
            user_id: 6,
            name: "Dr. Sneha Kulkarni",
            institution_id: 2,
            department_id: 1,
            institution_name: "NIT Jamshedpur",
            department_name: "Department of Computer Science & Engineering",
            expertise: ["IoT Sensors", "Embedded Systems", "Data Analysis", "Water Quality Testing"],
            active_projects: 6
        },
        {
            id: 3,
            user_id: 6,
            name: "Dr. Alok Kumar",
            institution_id: 3,
            department_id: 3,
            institution_name: "IIT (ISM) Dhanbad",
            department_name: "Department of Environmental Science",
            expertise: ["Water Quality Testing", "Hydrogeology", "Environmental Science", "Waste Management"],
            active_projects: 5
        }
    ],
    researcher_profiles: [
        {
            id: 1,
            user_id: 3,
            name: "Dr. Sunita Rao",
            organization: "Center for Water Resource Analytics, Ranchi",
            skills: ["Water Quality Testing", "Hydrogeology", "Environmental Engineering", "Data Analysis"],
            specialization: "Groundwater Modeling & Aquifer Contamination",
            publications: 14,
            h_index: 8
        },
        {
            id: 2,
            user_id: 3,
            name: "Dr. Manish Jha",
            organization: "Jharkhand State Infrastructure Research Lab",
            skills: ["Civil Engineering", "Hydrology", "Stormwater Drainage", "Urban Planning"],
            specialization: "Urban Stormwater Resilience & Flood Defense",
            publications: 19,
            h_index: 11
        }
    ],
    startup_profiles: [
        {
            id: 1,
            user_id: 4,
            name: "AquaTech Solutions",
            district: "Ranchi",
            capabilities: ["Water Quality Testing", "IoT Sensors", "Hydrogeology", "Environmental Engineering"],
            readiness_level: "TRL 7",
            completed_pilots: 3
        },
        {
            id: 2,
            user_id: 4,
            name: "InfraDrain Dynamics",
            district: "Ranchi",
            capabilities: ["Civil Engineering", "Hydrology", "Stormwater Drainage", "Urban Planning"],
            readiness_level: "TRL 8",
            completed_pilots: 5
        },
        {
            id: 3,
            user_id: 4,
            name: "VoltGrid Smart Lighting",
            district: "Ranchi",
            capabilities: ["Electrical Engineering", "Smart Grids", "Embedded Systems", "Energy Audit"],
            readiness_level: "TRL 8",
            completed_pilots: 4
        }
    ],
    msme_profiles: [
        {
            id: 1,
            user_id: 5,
            name: "EcoFilter Works",
            district: "Dhanbad",
            capabilities: ["Water Quality Testing", "Environmental Engineering", "Waste Management"],
            fabrication_capacity: "High (500 units/mo)"
        },
        {
            id: 2,
            user_id: 5,
            name: "Jharkhand Civic Fabricators",
            district: "Ranchi",
            capabilities: ["Civil Engineering", "Structural Analysis", "Pavement Design"],
            fabrication_capacity: "Heavy Foundry & Grates"
        }
    ],
    clusters: [
        {
            id: 1,
            cluster_name: "Ranchi Monsoon Stormwater & Culvert Siltation Cluster",
            district: "Ranchi",
            category: "Drainage & Flood Control",
            severity: 8,
            report_count: 47,
            confirmed_report_count: 47,
            high_priority_problems: 18
        },
        {
            id: 2,
            cluster_name: "Dhanbad Unconfined Aquifer Mineralization Cluster",
            district: "Dhanbad",
            category: "Water & Sanitation",
            severity: 9,
            report_count: 38,
            confirmed_report_count: 38,
            high_priority_problems: 24
        },
        {
            id: 3,
            cluster_name: "Harmu River Corridor Solid Waste Accumulation Cluster",
            district: "Ranchi",
            category: "Solid Waste Management",
            severity: 7,
            report_count: 29,
            confirmed_report_count: 29,
            high_priority_problems: 11
        },
        {
            id: 4,
            cluster_name: "Ranchi Urban Arterial Pothole & Bitumen Failure Cluster",
            district: "Ranchi",
            category: "Roads & Infrastructure",
            severity: 8,
            report_count: 52,
            confirmed_report_count: 52,
            high_priority_problems: 31
        }
    ],
    solutions: [
        {
            id: 1,
            problem_id: 42,
            submitted_by: 2,
            title: "Multi-Stage Terracotta & Activated Carbon Filtration Pilot",
            description: "Deploy gravity-fed terracotta cartridges with manganese dioxide media to oxidize and precipitate dissolved iron ions prior to community distribution.",
            status: "SUBMITTED",
            cost_estimate: 45000,
            implementation_timeline: "3 weeks",
            created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
            methodology: "3-stage gravity bed filtration with manganese greensand catalytic oxidation.",
            technology: "Terracotta ceramic candle, activated coconut shell biochar, manganese greensand",
            expected_impact: "Removes 98% dissolved iron and reduces coliform to WHO potable limits.",
            estimated_cost: 45000
        },
        {
            id: 2,
            problem_id: 102,
            submitted_by: 3,
            title: "Acoustic Correlation Sensor Leak Detection & Trenchless CIPP Epoxy Sleeve",
            description: "Acoustic correlation sensors pinpoint pipe fracture coordinates with sub-meter accuracy; trenchless internal cured-in-place polymer lining seals rupture without excavating main road.",
            status: "APPROVED",
            cost_estimate: 180000,
            implementation_timeline: "10 days",
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
            methodology: "Acoustic cross-correlation frequency mapping followed by robotic CCTV inspection and CIPP epoxy liner inversion.",
            technology: "Hydrophone Acoustic Sensors, Cured-In-Place Pipe (CIPP) Trenchless Sleeve, IoT Pressure Node",
            expected_impact: "Halts 12,000 L/hr drinking water loss and stabilizes subterranean pavement base.",
            estimated_cost: 180000
        },
        {
            id: 3,
            problem_id: 42,
            submitted_by: 2,
            submitter_name: "Priya Sharma (Student Innovator)",
            title: "IoT Solar-Powered Groundwater Fluoride & Arsenic Filtration Cartridge",
            description: "Low-cost modular biochar and activated alumina gravity filtration cartridge with IoT water quality telemetry for real-time contamination alerts.",
            status: "SUBMITTED",
            cost_estimate: 35000,
            implementation_timeline: "3 weeks",
            created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
            methodology: "Solar-assisted gravity flow filtration utilizing locally fired terracotta infused with colloidal silver and activated alumina.",
            technology: "Solar PV micro-inverter, ESP32 telemetry node, activated alumina cartridge",
            expected_impact: "Provides potable water to 800+ households with continuous turbidity & fluoride tracking.",
            estimated_cost: 35000
        }
    ],
    solution_implementations: [
        {
            id: 1,
            solution_id: 2,
            problem_id: "prob-102",
            lead_authority_id: 7,
            executing_user_id: 4,
            partner_name: "AquaTech Solutions (Startup Partner)",
            title: "Pilot Implementation: Acoustic Leak Detection & Trenchless Pipeline Repair",
            description: "Field deployment of acoustic correlators and robotic trenchless sleeve sealing along Albert Ekka Chowk corridor.",
            status: "PILOT",
            progress_percentage: 45,
            target_start_date: new Date(Date.now() - 3600000 * 24 * 5).toISOString().split('T')[0],
            target_end_date: new Date(Date.now() + 3600000 * 24 * 25).toISOString().split('T')[0],
            budget_allocated: 180000,
            location_details: "Main Road, 50m North of Albert Ekka Chowk, Ranchi",
            outcome_metrics: { water_saved_liters: 85000, traffic_disruption_hours: 0 },
            created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
        }
    ],
    implementation_updates: [
        {
            id: 1,
            implementation_id: 1,
            user_id: 4,
            update_type: "MILESTONE",
            content: "Acoustic frequency survey completed. Rupture isolated at 38.2m north of Ekka Chowk junction.",
            progress_snapshot: 45,
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        }
    ],
    problem_status_history: [
        {
            id: 1,
            problem_id: "prob-102",
            old_status: "VERIFIED",
            new_status: "APPROVED",
            changed_by: 7,
            note: "Solution idea by Dr. Sunita Rao selected by Ranchi Municipal Corporation. Handed over to AquaTech Solutions (Startup) for trenchless pilot execution.",
            created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
        }
    ],
    solution_evaluations: [],
    reputations: [
        {
            user_id: 1,
            current_rank_score: 420,
            verified_impact_score: 310,
            completed_implementations: 3,
            lifetime_score: 550,
            tier: "GOLD",
            rank: 4,
            badges: [
                { name: "Civic Pioneer", badge_key: "pioneer" },
                { name: "Ground Verifier", badge_key: "verifier" },
                { name: "Community Guardian", badge_key: "guardian" }
            ]
        },
        {
            user_id: 2,
            current_rank_score: 680,
            verified_impact_score: 520,
            completed_implementations: 5,
            lifetime_score: 850,
            tier: "PLATINUM",
            rank: 1,
            badges: [
                { name: "Top Solution Architect", badge_key: "architect" },
                { name: "AI Match Master", badge_key: "ai_master" },
                { name: "Civic Impact Innovator", badge_key: "innovator" }
            ]
        }
    ]
};

let problemCounter = 301;
let challengeCounter = 301;
let dossierCounter = 301;
let userCounter = 20;
let solutionCounter = 20;

function getNextProblemId() {
    let maxNum = 300;
    for (const p of (memoryDB.problems || [])) {
        const digits = String(p.id).replace(/\D/g, "");
        const n = parseInt(digits, 10);
        if (!isNaN(n) && n >= maxNum) {
            maxNum = n;
        }
    }
    const nextNum = Math.max(maxNum + 1, problemCounter++);
    return `prob-${nextNum}`;
}

function findProblemById(rawId) {
    if (rawId === undefined || rawId === null) return null;
    const str = String(rawId).toLowerCase().trim();
    const digits = str.replace(/\D/g, "");
    const targetNum = digits ? parseInt(digits, 10) : NaN;

    const found = memoryDB.problems.find(p => {
        const pid = String(p.id).toLowerCase();
        const pDigits = pid.replace(/\D/g, "");
        const pNum = pDigits ? parseInt(pDigits, 10) : NaN;

        if (pid === str) return true;
        if (!isNaN(targetNum) && !isNaN(pNum) && targetNum === pNum) return true;
        return false;
    });

    if (found) {
        if (typeof found.status !== "string") {
            found.status = "REPORTED";
        }
        if (!found.ai_description) {
            found.ai_description = found.ai_summary || found.description || "";
        }
    }

    return found || null;
}

async function executeQuery(text, params = []) {
    if (isPgAvailable !== false) {
        try {
            const res = await pgPool.query(text, params);
            isPgAvailable = true;
            return res;
        } catch (err) {
            if (isPgAvailable === null) {
                console.warn(`⚠️ PostgreSQL connection not usable (${err.code || err.message}). Activating resilient in-memory database store.`);
            }
            isPgAvailable = false;
        }
    }

    // In-memory SQL engine simulation
    const trimmed = (text || "").trim();
    const upperText = trimmed.toUpperCase();

    if (upperText.includes("SELECT NOW()")) {
        return { rows: [{ now: new Date().toISOString() }], rowCount: 1 };
    }

    // 0. USER QUERY HANDLERS
    if (upperText.startsWith("INSERT INTO USERS")) {
        const id = userCounter++;
        const newUser = {
            id,
            name: params[0],
            email: (params[1] || "").toLowerCase().trim(),
            phone: params[2] || null,
            password_hash: params[3],
            role: params[4] || "CITIZEN",
            is_active: true,
            is_email_verified: true,
            is_phone_verified: false,
            created_at: new Date().toISOString()
        };
        memoryDB.users.push(newUser);

        // Auto-seed student profile if role is STUDENT
        if (newUser.role === "STUDENT") {
            memoryDB.student_profiles.push({
                id: memoryDB.student_profiles.length + 1,
                user_id: id,
                institution_id: 1,
                department_id: 1,
                course: "B.Tech Engineering & Applied Technology",
                graduation_year: 2027,
                institution_name: "BIT Mesra, Ranchi",
                department_name: "Department of Computer Science & Engineering",
                skills: ["Water Quality Testing", "Hydrogeology", "Environmental Engineering", "IoT Sensors", "Civil Engineering", "Data Analysis"]
            });
        }

        // Auto-seed reputation entry
        memoryDB.reputations.push({
            user_id: id,
            current_rank_score: 50,
            verified_impact_score: 25,
            completed_implementations: 0,
            lifetime_score: 50,
            tier: "BRONZE",
            rank: memoryDB.users.length,
            badges: [{ name: "Civic Pioneer", badge_key: "pioneer" }]
        });

        return { rows: [newUser], rowCount: 1 };
    }

    // User + Student Profile join query
    if (upperText.includes("FROM USERS U") && upperText.includes("LEFT JOIN STUDENT_PROFILES")) {
        const searchId = Number(params[0]);
        const user = memoryDB.users.find(u => u.id === searchId);
        if (!user) return { rows: [], rowCount: 0 };

        const sp = memoryDB.student_profiles.find(p => p.user_id === searchId) || {
            id: 1,
            course: "B.Tech Computer Science & IoT Engineering",
            graduation_year: 2027,
            institution_id: 1,
            department_id: 1,
            institution_name: "BIT Mesra, Ranchi",
            department_name: "Department of Computer Science & Engineering",
            skills: ["Water Quality Testing", "Hydrogeology", "Environmental Engineering", "IoT Sensors", "Civil Engineering", "Data Analysis"]
        };

        const row = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile_id: sp.id,
            course: sp.course,
            graduation_year: sp.graduation_year,
            skills: sp.skills,
            institution_id: sp.institution_id,
            institution_name: sp.institution_name,
            department_id: sp.department_id,
            department_name: sp.department_name
        };
        return { rows: [row], rowCount: 1 };
    }

    if (upperText.includes("FROM USERS")) {
        let list = [...memoryDB.users];

        if (upperText.includes("WHERE EMAIL = $1") || upperText.includes("WHERE EMAIL = $1 AND IS_ACTIVE = TRUE")) {
            const searchEmail = (params[0] || "").toLowerCase().trim();
            const found = list.find(u => u.email.toLowerCase() === searchEmail);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        if (upperText.includes("WHERE ID = $1") || upperText.includes("WHERE U.ID = $1")) {
            const searchId = Number(params[0]);
            const found = list.find(u => u.id === searchId);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        return { rows: list, rowCount: list.length };
    }

    // 1. INSERT INTO problems
    if (upperText.startsWith("INSERT INTO PROBLEMS")) {
        const id = getNextProblemId();
        const now = new Date().toISOString();

        let reporter_id = 1;
        let title = "Untitled Problem";
        let description = "";
        let category = "General";
        let subcategory = "General";
        let district = "Ranchi";
        let city = "Ranchi";
        let address = null;
        let affected_people = 100;
        let ai_summary = "";
        let ai_description = "";
        let ai_keywords = [];
        let required_expertise = [];
        let severity = 6;
        let urgency = 6;
        let ai_confidence = 0.92;
        let priority_score = 75;

        if (params.length >= 20) {
            reporter_id = params[0];
            title = params[1] || title;
            description = params[2] || description;
            category = params[3] || category;
            subcategory = params[4] || subcategory;
            district = params[5] || district;
            city = params[6] || city;
            address = params[7] || address;
            affected_people = params[12] || affected_people;
            ai_summary = params[13] || ai_summary;
            ai_description = params[13] || ai_summary;
            ai_keywords = params[14] || ai_keywords;
            required_expertise = params[15] || required_expertise;
            severity = params[16] || severity;
            urgency = params[17] || urgency;
            ai_confidence = params[18] || ai_confidence;
            priority_score = params[19] || priority_score;
        } else if (params.length === 14) {
            reporter_id = params[0];
            title = params[1] || title;
            description = params[2] || description;
            category = params[3] || category;
            subcategory = params[4] || subcategory;
            district = params[5] || district;
            affected_people = params[6] || affected_people;
            ai_summary = params[7] || ai_summary;
            ai_description = params[7] || ai_summary;
            ai_keywords = params[8] || ai_keywords;
            required_expertise = params[9] || required_expertise;
            severity = params[10] || severity;
            urgency = params[11] || urgency;
            ai_confidence = params[12] || ai_confidence;
            priority_score = params[13] || priority_score;
        } else {
            title = params[0] || title;
            description = params[1] || description;
        }

        const newProblem = {
            id,
            reporter_id,
            title,
            description,
            category,
            subcategory,
            district,
            city,
            address,
            affected_people: Number(affected_people) || 0,
            ai_summary: ai_summary || `${category} challenge reported: ${title}`,
            ai_description: ai_description || ai_summary || `${category} challenge reported: ${title}`,
            ai_keywords: Array.isArray(ai_keywords) && ai_keywords.length ? ai_keywords : ["Civic", category],
            required_expertise: Array.isArray(required_expertise) && required_expertise.length ? required_expertise : ["Civil Engineering", "Data Analysis"],
            severity: Number(severity) || 6,
            urgency: Number(urgency) || 6,
            ai_confidence: Number(ai_confidence) || 0.92,
            priority_score: Number(priority_score) || 75,
            status: "REPORTED",
            cluster_id: null,
            created_at: now,
            updated_at: now
        };

        memoryDB.problems.unshift(newProblem);
        return { rows: [newProblem], rowCount: 1 };
    }

    // 2. INSERT INTO challenges
    if (upperText.startsWith("INSERT INTO CHALLENGES")) {
        const id = `chal-${challengeCounter++}`;
        const newChal = {
            id,
            title: params[0],
            description: params[1],
            district: params[2],
            affected_people: params[3],
            domain: params[4],
            subdomain: params[5],
            problem_type: params[6],
            summary: params[7],
            severity: params[8],
            urgency: params[9],
            ai_confidence: params[10],
            created_at: new Date().toISOString()
        };
        memoryDB.challenges.unshift(newChal);
        return { rows: [newChal], rowCount: 1 };
    }

    // 3. INSERT INTO challenge_dossiers
    if (upperText.startsWith("INSERT INTO CHALLENGE_DOSSIERS")) {
        const id = `dos-${dossierCounter++}`;
        const newDossier = {
            id,
            problem_id: params[0],
            domain: params[1],
            subdomain: params[2],
            problem_type: params[3],
            summary: params[4],
            severity: params[5],
            urgency_label: params[6],
            urgency_score: params[7],
            dossier_data: typeof params[8] === "string" ? JSON.parse(params[8]) : params[8],
            overall_confidence: params[9],
            requires_human_review: params[10],
            created_at: new Date().toISOString()
        };
        memoryDB.challenge_dossiers.unshift(newDossier);

        const targetProb = findProblemById(params[0]);
        if (targetProb) {
            targetProb.dossier = newDossier.dossier_data;
        }

        return { rows: [newDossier], rowCount: 1 };
    }

    // SOLUTION QUERY HANDLERS (MODULE 7)
    if (upperText.startsWith("INSERT INTO SOLUTIONS")) {
        const id = solutionCounter++;
        const rawProbId = params[0];
        const targetProb = findProblemById(rawProbId);
        const resolvedProbId = targetProb ? targetProb.id : rawProbId;
        const subBy = Number(params[1]) || 1;
        const submitter = memoryDB.users.find(u => u.id === subBy) || { name: "Civic Contributor", role: "STUDENT" };

        let solImages = [];
        let solVideos = [];
        if (typeof params[12] === "string" && params[12].startsWith("{")) {
            try {
                const parsed = JSON.parse(params[12]);
                if (Array.isArray(parsed.images)) solImages = parsed.images.slice(0, 5);
                if (Array.isArray(parsed.videos)) solVideos = parsed.videos.slice(0, 2);
            } catch {
                // fallback
            }
        }

        const newSol = {
            id,
            problem_id: resolvedProbId,
            submitted_by: subBy,
            title: params[2] || "Civic Solution Proposal",
            description: params[3] || "",
            methodology: params[4] || null,
            technology: params[5] || null,
            expected_impact: params[6] || null,
            estimated_cost: params[7] !== null && params[7] !== undefined ? Number(params[7]) : null,
            implementation_time: params[8] || null,
            scalability: params[9] || null,
            required_resources: params[10] || null,
            risks: params[11] || null,
            evidence: params[12] || null,
            images: solImages,
            videos: solVideos,
            status: "SUBMITTED",
            team_id: params[13] || null,
            submitter_name: submitter.name,
            submitter_role: submitter.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        memoryDB.solutions.unshift(newSol);

        // Award reputation points for solution proposal (+50 points)
        const userRep = memoryDB.reputations.find(r => r.user_id === subBy);
        if (userRep) {
            userRep.current_rank_score = (userRep.current_rank_score || 0) + 50;
            userRep.lifetime_score = (userRep.lifetime_score || 0) + 50;
        }

        return { rows: [newSol], rowCount: 1 };
    }

    if (upperText.includes("FROM SOLUTIONS")) {
        let list = [...memoryDB.solutions];

        if (upperText.includes("WHERE S.ID = $1") || upperText.includes("WHERE ID = $1")) {
            const solId = Number(params[0]);
            const found = list.find(s => s.id === solId);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        if (upperText.includes("COUNT(*)::INT AS TOTAL FROM SOLUTIONS WHERE PROBLEM_ID = $1")) {
            const targetProb = findProblemById(params[0]);
            const targetId = targetProb ? targetProb.id : params[0];
            const pNum = parseInt(String(params[0]).replace(/\D/g, ""), 10);
            const count = list.filter(s => {
                const sNum = parseInt(String(s.problem_id).replace(/\D/g, ""), 10);
                if (String(s.problem_id).toLowerCase() === String(targetId).toLowerCase()) return true;
                if (!isNaN(pNum) && !isNaN(sNum) && pNum === sNum) return true;
                return false;
            }).length;
            return { rows: [{ total: count }], rowCount: 1 };
        }

        if (upperText.includes("WHERE S.PROBLEM_ID = $1") || upperText.includes("WHERE PROBLEM_ID = $1")) {
            const targetProb = findProblemById(params[0]);
            const targetId = targetProb ? targetProb.id : params[0];
            const pNum = parseInt(String(params[0]).replace(/\D/g, ""), 10);
            const filtered = list.filter(s => {
                const sNum = parseInt(String(s.problem_id).replace(/\D/g, ""), 10);
                if (String(s.problem_id).toLowerCase() === String(targetId).toLowerCase()) return true;
                if (!isNaN(pNum) && !isNaN(sNum) && pNum === sNum) return true;
                return false;
            });
            const limit = Number(params[1]) || 20;
            const sliced = filtered.slice(0, limit);
            return { rows: sliced, rowCount: sliced.length };
        }

        return { rows: list, rowCount: list.length };
    }

    // UPDATE SOLUTIONS
    if (upperText.startsWith("UPDATE SOLUTIONS")) {
        const newStatus = params[0];
        const solId = Number(params[1]);
        const sol = memoryDB.solutions.find(s => s.id === solId);
        if (sol) {
            sol.status = newStatus;
            sol.updated_at = new Date().toISOString();
            return {
                rows: [{
                    id: sol.id,
                    problem_id: sol.problem_id,
                    submitted_by: sol.submitted_by,
                    title: sol.title,
                    status: sol.status,
                    updated_at: sol.updated_at
                }],
                rowCount: 1
            };
        }
        return { rows: [], rowCount: 0 };
    }

    // UPDATE PROBLEMS
    if (upperText.startsWith("UPDATE PROBLEMS")) {
        if (upperText.includes("CLUSTER_ID")) {
            const clusterId = Number(params[0]) || null;
            const rawId = params[1];
            if (Array.isArray(rawId)) {
                rawId.forEach(id => {
                    const prob = findProblemById(id);
                    if (prob) prob.cluster_id = clusterId;
                });
                return { rows: [], rowCount: rawId.length };
            }
            const targetProb = findProblemById(rawId);
            if (targetProb) {
                targetProb.cluster_id = clusterId;
                targetProb.updated_at = new Date().toISOString();
                return { rows: [targetProb], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }

        let newStatus = "REPORTED";
        let rawId = null;

        if (params.length === 1) {
            rawId = params[0];
            const matchStatus = upperText.match(/STATUS\s*=\s*'([^']+)'/i);
            newStatus = matchStatus ? matchStatus[1] : "APPROVED";
        } else {
            newStatus = typeof params[0] === "string" ? params[0] : "REPORTED";
            rawId = params[1];
        }

        const targetProb = findProblemById(rawId);
        if (targetProb) {
            targetProb.status = newStatus;
            targetProb.updated_at = new Date().toISOString();
            return { rows: [targetProb], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
    }

    // PROBLEM STATUS HISTORY
    if (upperText.startsWith("INSERT INTO PROBLEM_STATUS_HISTORY")) {
        const histItem = {
            id: ((memoryDB.problem_status_history && memoryDB.problem_status_history.length) || 0) + 1,
            problem_id: params[0],
            old_status: params[1],
            new_status: params[2],
            changed_by: params[3],
            note: params[4] || null,
            created_at: new Date().toISOString()
        };
        if (!memoryDB.problem_status_history) memoryDB.problem_status_history = [];
        memoryDB.problem_status_history.unshift(histItem);
        return { rows: [histItem], rowCount: 1 };
    }

    if (upperText.includes("FROM PROBLEM_STATUS_HISTORY")) {
        const rawId = params[0];
        const targetProb = findProblemById(rawId);
        const pid = targetProb ? targetProb.id : rawId;
        const pDigits = String(rawId).replace(/\D/g, "");
        const list = (memoryDB.problem_status_history || []).filter(h => {
            const hDigits = String(h.problem_id).replace(/\D/g, "");
            return String(h.problem_id).toLowerCase() === String(pid).toLowerCase() ||
                (pDigits && hDigits && pDigits === hDigits);
        });
        return { rows: list, rowCount: list.length };
    }

    // SOLUTION EVALUATIONS
    if (upperText.startsWith("INSERT INTO SOLUTION_EVALUATIONS")) {
        const solId = Number(params[0]);
        const evalId = Number(params[1]);
        const newEval = {
            id: ((memoryDB.solution_evaluations && memoryDB.solution_evaluations.length) || 0) + 1,
            solution_id: solId,
            evaluator_id: evalId,
            impact_score: Number(params[2]) || 0,
            feasibility_score: Number(params[3]) || 0,
            cost_efficiency_score: Number(params[4]) || 0,
            scalability_score: Number(params[5]) || 0,
            evidence_score: Number(params[6]) || 0,
            risk_score: Number(params[7]) || 0,
            composite_score: Number(params[8]) || 0,
            comments: params[9] || "",
            recommendation: params[10] || "RECOMMENDED",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        if (!memoryDB.solution_evaluations) memoryDB.solution_evaluations = [];
        const existingIdx = memoryDB.solution_evaluations.findIndex(e => e.solution_id === solId && e.evaluator_id === evalId);
        if (existingIdx >= 0) {
            newEval.id = memoryDB.solution_evaluations[existingIdx].id;
            memoryDB.solution_evaluations[existingIdx] = newEval;
        } else {
            memoryDB.solution_evaluations.push(newEval);
        }

        // Attach evaluations and computed scores to the solution object in memoryDB
        const sol = memoryDB.solutions.find(s => s.id === solId);
        if (sol) {
            if (sol.status === "SUBMITTED") sol.status = "UNDER_EVALUATION";
            sol.evaluations = [newEval];
            sol.evaluations_count = 1;
            sol.average_score = newEval.composite_score;
            sol.dimension_averages = {
                impact: newEval.impact_score,
                feasibility: newEval.feasibility_score,
                cost_efficiency: newEval.cost_efficiency_score,
                scalability: newEval.scalability_score,
                evidence: newEval.evidence_score,
                risk: newEval.risk_score,
            };
        }

        return { rows: [newEval], rowCount: 1 };
    }

    if (upperText.includes("FROM SOLUTION_EVALUATIONS")) {
        const solId = params[0] ? Number(params[0]) : null;
        const evals = (memoryDB.solution_evaluations || []).filter(e => !solId || Number(e.solution_id) === solId);

        // Check if this is an aggregation / summary query
        if (upperText.includes("AVG(") || upperText.includes("COUNT(")) {
            const count = evals.length;
            const avgOf = (key) => count ? Number((evals.reduce((acc, e) => acc + (Number(e[key]) || 0), 0) / count).toFixed(2)) : null;
            const recCount = (rec) => evals.filter(e => e.recommendation === rec).length;
            const summaryRow = {
                count,
                avg_composite: avgOf("composite_score"),
                avg_impact: avgOf("impact_score"),
                avg_feasibility: avgOf("feasibility_score"),
                avg_cost_efficiency: avgOf("cost_efficiency_score"),
                avg_scalability: avgOf("scalability_score"),
                avg_evidence: avgOf("evidence_score"),
                avg_risk: avgOf("risk_score"),
                recommended_count: recCount("RECOMMENDED"),
                consider_count: recCount("CONSIDER"),
                not_recommended_count: recCount("NOT_RECOMMENDED"),
            };
            return { rows: [summaryRow], rowCount: 1 };
        }

        const enriched = evals.map(e => {
            const evaluatorUser = (memoryDB.users || []).find(u => u.id === Number(e.evaluator_id)) || { name: "Municipal Authority Evaluator", role: "AUTHORITY" };
            return {
                ...e,
                evaluator_name: evaluatorUser.name,
                evaluator_role: evaluatorUser.role,
            };
        });
        return { rows: enriched, rowCount: enriched.length };
    }

    // SOLUTION IMPLEMENTATIONS (MODULE 9)
    if (upperText.startsWith("INSERT INTO SOLUTION_IMPLEMENTATIONS")) {
        const solId = Number(params[0]);
        const sol = memoryDB.solutions.find(s => s.id === solId);
        const probId = params[1] || (sol ? sol.problem_id : "prob-102");
        const leadAuth = Number(params[2]) || 7;
        const execUser = Number(params[3]) || (sol ? sol.submitted_by : 4);
        const execUserObj = memoryDB.users.find(u => u.id === execUser) || { name: "Executing Partner", role: "STARTUP" };

        const newImpl = {
            id: ((memoryDB.solution_implementations && memoryDB.solution_implementations.length) || 0) + 1,
            solution_id: solId,
            problem_id: probId,
            lead_authority_id: leadAuth,
            executing_user_id: execUser,
            partner_name: execUserObj.name,
            title: params[4] || `Pilot Implementation: ${sol ? sol.title : "Civic Solution"}`,
            description: params[5] || null,
            status: "PILOT",
            progress_percentage: 0,
            target_start_date: params[6] || new Date().toISOString().split("T")[0],
            target_end_date: params[7] || new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split("T")[0],
            budget_allocated: Number(params[8]) || 0,
            location_details: params[9] || null,
            outcome_metrics: params[10] || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            lead_authority_name: "Ranchi Municipal Corporation",
            lead_authority_role: "AUTHORITY",
            executing_user_name: execUserObj.name,
            executing_user_role: execUserObj.role
        };

        if (!memoryDB.solution_implementations) memoryDB.solution_implementations = [];
        memoryDB.solution_implementations.unshift(newImpl);
        return { rows: [newImpl], rowCount: 1 };
    }

    if (upperText.includes("FROM SOLUTION_IMPLEMENTATIONS")) {
        let list = (memoryDB.solution_implementations || []).map(impl => {
            const lead = memoryDB.users.find(u => u.id === impl.lead_authority_id) || { name: "Ranchi Municipal Corporation", role: "AUTHORITY" };
            const exec = memoryDB.users.find(u => u.id === impl.executing_user_id) || { name: impl.partner_name || "AquaTech Solutions", role: "STARTUP" };
            return {
                ...impl,
                lead_authority_name: lead.name,
                lead_authority_role: lead.role,
                executing_user_name: exec.name,
                executing_user_role: exec.role
            };
        });

        if (upperText.includes("WHERE SI.ID = $1") || upperText.includes("WHERE ID = $1")) {
            const id = Number(params[0]);
            const found = list.find(i => i.id === id);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        if (upperText.includes("WHERE SI.SOLUTION_ID = $1") || upperText.includes("WHERE SOLUTION_ID = $1")) {
            const solId = Number(params[0]);
            const found = list.find(i => Number(i.solution_id) === solId);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        if (upperText.includes("WHERE SI.PROBLEM_ID = $1") || upperText.includes("WHERE PROBLEM_ID = $1")) {
            const rawId = params[0];
            const targetProb = findProblemById(rawId);
            const pid = targetProb ? targetProb.id : rawId;
            const pDigits = String(rawId).replace(/\D/g, "");
            const filtered = list.filter(i => {
                const iDigits = String(i.problem_id).replace(/\D/g, "");
                return String(i.problem_id).toLowerCase() === String(pid).toLowerCase() ||
                    (pDigits && iDigits && pDigits === iDigits);
            });
            return { rows: filtered, rowCount: filtered.length };
        }

        return { rows: list, rowCount: list.length };
    }

    // IMPLEMENTATION UPDATES
    if (upperText.startsWith("INSERT INTO IMPLEMENTATION_UPDATES")) {
        const newUpdate = {
            id: ((memoryDB.implementation_updates && memoryDB.implementation_updates.length) || 0) + 1,
            implementation_id: Number(params[0]),
            user_id: Number(params[1]),
            update_type: params[2] || "STATUS_CHANGE",
            content: params[3] || "",
            progress_snapshot: Number(params[4]) || 0,
            created_at: new Date().toISOString()
        };
        if (!memoryDB.implementation_updates) memoryDB.implementation_updates = [];
        memoryDB.implementation_updates.unshift(newUpdate);
        return { rows: [newUpdate], rowCount: 1 };
    }

    if (upperText.includes("FROM IMPLEMENTATION_UPDATES")) {
        const implId = Number(params[0]);
        const list = (memoryDB.implementation_updates || []).filter(u => Number(u.implementation_id) === implId);
        return { rows: list, rowCount: list.length };
    }
    if (upperText.includes("FROM REPUTATION") || upperText.includes("JOIN USERS U ON U.ID = R.USER_ID")) {
        const userId = Number(params[0]);
        const userRep = memoryDB.reputations.find(r => r.user_id === userId) || {
            user_id: userId || 1,
            current_rank_score: 420,
            verified_impact_score: 310,
            completed_implementations: 3,
            lifetime_score: 550,
            tier: "GOLD",
            rank: 1,
            badges: [{ name: "Civic Contributor", badge_key: "contributor" }]
        };

        if (upperText.includes("COUNT(*) + 1 AS RANK")) {
            return { rows: [{ rank: userRep.rank || 1 }], rowCount: 1 };
        }

        return { rows: [userRep], rowCount: 1 };
    }

    if (upperText.includes("FROM REPUTATION_EVENTS")) {
        return {
            rows: [
                { contribution_type: "REPORT_VERIFIED", count: 3, total_points: 150 },
                { contribution_type: "SOLUTION_PROPOSED", count: 2, total_points: 180 },
                { contribution_type: "IMPLEMENTATION_COMPLETED", count: 1, total_points: 200 }
            ],
            rowCount: 3
        };
    }

    // 5. PROBLEM CLUSTERS QUERY HANDLERS
    if (upperText.includes("COUNT(*) AS CLUSTERS FROM PROBLEM_CLUSTERS")) {
        return { rows: [{ clusters: memoryDB.clusters.length }], rowCount: 1 };
    }

    if (upperText.includes("FROM PROBLEM_CLUSTERS")) {
        return { rows: memoryDB.clusters, rowCount: memoryDB.clusters.length };
    }

    // 6. AUTHORITY DASHBOARD AGGREGATIONS
    // 6a. Summary query with COUNT(*) FILTER
    if (upperText.includes("AS TOTAL_PROBLEMS") && upperText.includes("FROM PROBLEMS")) {
        const problems = memoryDB.problems;
        const total = problems.length;
        const reported = problems.filter(p => p.status === "REPORTED").length;
        const under_review = problems.filter(p => p.status === "UNDER_REVIEW").length;
        const verified = problems.filter(p => p.status === "VERIFIED").length;
        const assigned = problems.filter(p => p.status === "ASSIGNED").length;
        const in_progress = problems.filter(p => ["ASSIGNED", "ROOT_CAUSE_ANALYSIS", "SOLUTION_SEARCH", "SOLUTION_EVALUATION", "APPROVED", "PILOT", "IMPLEMENTING"].includes(p.status)).length;
        const resolved = problems.filter(p => p.status === "RESOLVED").length;
        const high_priority = problems.filter(p => (p.priority_score || 0) >= 60).length;
        const critical_priority = problems.filter(p => (p.priority_score || 0) >= 80).length;
        const clustered = problems.filter(p => p.cluster_id !== null).length;

        return {
            rows: [{
                total_problems: total,
                reported,
                under_review,
                verified,
                assigned,
                in_progress,
                resolved,
                high_priority,
                critical_priority,
                clustered_problems: clustered
            }],
            rowCount: 1
        };
    }

    // 6b. Category distribution
    if (upperText.includes("COALESCE(CATEGORY, 'UNKNOWN') AS CATEGORY") && upperText.includes("GROUP BY CATEGORY")) {
        const catMap = {};
        memoryDB.problems.forEach(p => {
            const c = p.category || "General";
            catMap[c] = (catMap[c] || 0) + 1;
        });
        const rows = Object.entries(catMap).map(([category, count]) => ({ category, count }));
        return { rows, rowCount: rows.length };
    }

    // 6c. District distribution
    if (upperText.includes("GROUP BY DISTRICT")) {
        const distMap = {};
        memoryDB.problems.forEach(p => {
            const d = p.district || "Ranchi";
            if (!distMap[d]) {
                distMap[d] = { district: d, total_problems: 0, high_priority: 0, resolved: 0, sum_priority: 0 };
            }
            distMap[d].total_problems++;
            if ((p.priority_score || 0) >= 60) distMap[d].high_priority++;
            if (p.status === "RESOLVED") distMap[d].resolved++;
            distMap[d].sum_priority += (p.priority_score || 70);
        });

        const rows = Object.values(distMap).map(d => ({
            district: d.district,
            total_problems: d.total_problems,
            high_priority: d.high_priority,
            resolved: d.resolved,
            average_priority: Math.round(d.sum_priority / d.total_problems)
        }));
        return { rows, rowCount: rows.length };
    }

    // 6d. Status distribution
    if (upperText.includes("GROUP BY STATUS")) {
        const statMap = {};
        memoryDB.problems.forEach(p => {
            const s = p.status || "REPORTED";
            statMap[s] = (statMap[s] || 0) + 1;
        });
        const rows = Object.entries(statMap).map(([status, count]) => ({ status, count }));
        return { rows, rowCount: rows.length };
    }

    // 7. EXPERTISE MATCHING QUERIES (Students, Faculty, Researchers, Startups, MSMEs)
    // 7a. Student matching query: WITH required AS (SELECT unnest($1::text[])...
    if (upperText.includes("WITH REQUIRED AS") || (upperText.includes("FROM STUDENT_SKILLS") && upperText.includes("JOIN REQUIRED"))) {
        const reqArray = Array.isArray(params[0]) ? params[0].map(s => String(s).toLowerCase().trim()) : [];
        const limit = Number(params[1]) || 10;

        const results = memoryDB.student_profiles.map(sp => {
            const user = memoryDB.users.find(u => u.id === sp.user_id) || { name: "Student Contributor" };
            const studentSkills = sp.skills || [];
            const matchedSkills = studentSkills.filter(s => reqArray.some(req => s.toLowerCase().includes(req) || req.includes(s.toLowerCase())));
            const matchedCount = matchedSkills.length;
            return {
                profile_id: sp.id,
                user_id: sp.user_id,
                institution_id: sp.institution_id,
                department_id: sp.department_id,
                course: sp.course,
                graduation_year: sp.graduation_year,
                name: user.name,
                matched_count: matchedCount,
                matched_skills: matchedSkills
            };
        }).filter(r => r.matched_count > 0 || reqArray.length === 0);

        results.sort((a, b) => b.matched_count - a.matched_count);
        const sliced = results.slice(0, limit);
        return { rows: sliced, rowCount: sliced.length };
    }

    // 7b. Faculty matching query
    if (upperText.includes("FROM FACULTY_PROFILES")) {
        const rows = memoryDB.faculty_profiles.map(f => ({
            ...f,
            score: 85,
            matched_expertise: f.expertise
        }));
        return { rows, rowCount: rows.length };
    }

    // 7c. Researcher matching query
    if (upperText.includes("FROM RESEARCHER_PROFILES")) {
        const rows = memoryDB.researcher_profiles.map(r => ({
            ...r,
            score: 90,
            matched_skills: r.skills
        }));
        return { rows, rowCount: rows.length };
    }

    // 7d. Startup / MSME matching query
    if (upperText.includes("FROM STARTUP_PROFILES") || upperText.includes("ORGANIZATIONTYPE = 'STARTUP'")) {
        const rows = memoryDB.startup_profiles.map(s => ({
            ...s,
            score: 88,
            matched_capabilities: s.capabilities
        }));
        return { rows, rowCount: rows.length };
    }

    if (upperText.includes("FROM MSME_PROFILES") || upperText.includes("ORGANIZATIONTYPE = 'MSME'")) {
        const rows = memoryDB.msme_profiles.map(m => ({
            ...m,
            score: 82,
            matched_capabilities: m.capabilities
        }));
        return { rows, rowCount: rows.length };
    }

    // 8. SELECT FROM problems
    if (upperText.includes("FROM PROBLEMS")) {
        let list = [...memoryDB.problems];

        // Specific problem lookup by ID
        if (upperText.includes("WHERE ID = $1") || upperText.includes("WHERE P.ID = $1")) {
            const found = findProblemById(params[0]);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }

        // Reporter filtering
        if (upperText.includes("REPORTER_ID = $1") || upperText.includes("P.REPORTER_ID = $1") || upperText.includes("REPORTER_ID = $")) {
            const userId = Number(params[0]);
            if (!isNaN(userId) && userId > 0) {
                list = list.filter(p => Number(p.reporter_id) === userId);
            }
        }

        // Priority queue query for authority: WHERE status NOT IN ('RESOLVED', 'MONITORING', 'SUSTAINED')
        if (upperText.includes("WHERE STATUS NOT IN ('RESOLVED'")) {
            list = list.filter(p => !["RESOLVED", "MONITORING", "SUSTAINED"].includes(String(p.status)));
            list.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0) || (b.severity || 0) - (a.severity || 0));
            const limit = Number(params[0]) || 10;
            return { rows: list.slice(0, limit), rowCount: Math.min(list.length, limit) };
        }

        // Search query and filter checking across params
        for (const p of params) {
            if (typeof p === "string" && p.startsWith("%") && p.endsWith("%")) {
                const term = p.replace(/%/g, "").toLowerCase().trim();
                if (term) {
                    list = list.filter(prob => {
                        const titleMatch = (prob.title || "").toLowerCase().includes(term);
                        const descMatch = (prob.description || "").toLowerCase().includes(term);
                        const catMatch = (prob.category || "").toLowerCase().includes(term);
                        const distMatch = (prob.district || "").toLowerCase().includes(term);
                        const cityMatch = (prob.city || "").toLowerCase().includes(term);
                        const kwMatch = (prob.ai_keywords || []).some(k => k.toLowerCase().includes(term));
                        const expMatch = (prob.required_expertise || []).some(k => k.toLowerCase().includes(term));
                        return titleMatch || descMatch || catMatch || distMatch || cityMatch || kwMatch || expMatch;
                    });
                }
            } else if (typeof p === "string" && ["Water & Sanitation", "Roads & Infrastructure", "Electricity & Lighting", "Solid Waste Management", "Drainage & Flood Control", "Public Health & Environment"].includes(p)) {
                list = list.filter(prob => prob.category === p);
            } else if (typeof p === "string" && ["Ranchi", "Dhanbad", "Chatra", "Bokaro", "Hazaribagh", "Jamshedpur"].includes(p)) {
                list = list.filter(prob => prob.district === p);
            } else if (typeof p === "string" && ["REPORTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "APPROVED", "EXECUTION_SUBMITTED", "CLOSED", "RESOLVED", "PILOT", "IMPLEMENTING"].includes(p)) {
                list = list.filter(prob => String(prob.status) === p);
            }
        }

        // Count only query
        if (upperText.startsWith("SELECT COUNT(*) AS TOTAL FROM PROBLEMS")) {
            return { rows: [{ total: list.length }], rowCount: 1 };
        }

        // Default sort by created_at DESC
        list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        // Limit checking: only if query includes LIMIT
        if (upperText.includes("LIMIT")) {
            const lastParam = params[params.length - 1];
            if (typeof lastParam === "number" && lastParam > 0 && lastParam <= 200) {
                list = list.slice(0, lastParam);
            }
        }

        list = list.map(p => ({
            ...p,
            ai_description: p.ai_description || p.ai_summary || p.description || "",
            status: typeof p.status === "string" ? p.status : "REPORTED",
            reporter_name: memoryDB.users.find(u => u.id === p.reporter_id)?.name || "Citizen Contributor"
        }));

        return { rows: list, rowCount: list.length };
    }

    return { rows: [], rowCount: 0 };
}

const dbWrapper = {
    query: (text, params) => executeQuery(text, params),
    on: (event, handler) => {
        pgPool.on(event, handler);
    },
    end: () => pgPool.end()
};

module.exports = dbWrapper;