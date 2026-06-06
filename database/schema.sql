-- ============================================================
-- AI-Based Online Exam Proctoring System - PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COLLEGES TABLE
-- ============================================================
CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- USERS TABLE (All roles: main_admin, college_admin, staff, student)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('main_admin', 'college_admin', 'staff', 'student')),
    roll_number VARCHAR(100),           -- For students
    department VARCHAR(100),
    phone VARCHAR(20),
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- EXAMS TABLE
-- ============================================================
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,  -- Staff user
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    department VARCHAR(100),
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_marks INTEGER NOT NULL DEFAULT 100,
    pass_marks INTEGER NOT NULL DEFAULT 40,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    allow_retake BOOLEAN DEFAULT FALSE,
    shuffle_questions BOOLEAN DEFAULT TRUE,
    shuffle_options BOOLEAN DEFAULT TRUE,
    proctoring_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- QUESTIONS TABLE
-- ============================================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_image_url TEXT,            -- Optional image for question
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
    marks INTEGER NOT NULL DEFAULT 1,
    difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
    explanation TEXT,                   -- Shown after exam
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- EXAM ENROLLMENTS TABLE
-- ============================================================
CREATE TABLE exam_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);

-- ============================================================
-- EXAM SESSIONS TABLE (tracks each attempt)
-- ============================================================
CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP,
    is_submitted BOOLEAN DEFAULT FALSE,
    face_verified BOOLEAN DEFAULT FALSE,  -- AI face verification at start
    ip_address VARCHAR(45),
    browser_info TEXT,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','terminated','auto_submitted')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- STUDENT ANSWERS TABLE
-- ============================================================
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_option CHAR(1) CHECK (selected_option IN ('A','B','C','D')),
    is_correct BOOLEAN,
    marks_awarded INTEGER DEFAULT 0,
    answered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

-- ============================================================
-- RESULTS TABLE
-- ============================================================
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE UNIQUE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_questions INTEGER NOT NULL,
    attempted_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers INTEGER DEFAULT 0,
    marks_obtained FLOAT DEFAULT 0,
    total_marks INTEGER NOT NULL,
    percentage FLOAT DEFAULT 0,
    grade VARCHAR(5),
    is_passed BOOLEAN DEFAULT FALSE,
    violation_count INTEGER DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- VIOLATIONS TABLE (AI proctoring logs)
-- ============================================================
CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN (
        'face_not_detected',
        'multiple_faces',
        'eye_movement_suspicious',
        'head_pose_suspicious',
        'tab_switch',
        'fullscreen_exit',
        'copy_paste',
        'copy_paste_attempt',
        'keyboard_shortcut',
        'audio_suspicious',
        'phone_detected',
        'object_detected',
        'screenshot_attempt',
        'window_focus_loss',
        'devtools_attempt',
        'devtools_open',
        'audio_disturbance'
    )),
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    description TEXT,
    screenshot_url TEXT,               -- Path to violation screenshot
    confidence_score FLOAT,            -- AI confidence (0-1)
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_users_college ON users(college_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_exams_college ON exams(college_id);
CREATE INDEX idx_exams_created_by ON exams(created_by);
CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_enrollments_exam ON exam_enrollments(exam_id);
CREATE INDEX idx_enrollments_student ON exam_enrollments(student_id);
CREATE INDEX idx_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX idx_sessions_student ON exam_sessions(student_id);
CREATE INDEX idx_answers_session ON student_answers(session_id);
CREATE INDEX idx_results_student ON results(student_id);
CREATE INDEX idx_results_exam ON results(exam_id);
CREATE INDEX idx_violations_session ON violations(session_id);
CREATE INDEX idx_violations_type ON violations(violation_type);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

-- ============================================================
-- TRIGGERS - Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_colleges_updated BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: Default Main Admin
-- Password: Admin@123 (bcrypt hash)
-- ============================================================
INSERT INTO users (name, email, password_hash, role)
VALUES (
    'Main Administrator',
    'admin@examproctoring.com',
    '$2b$10$7J6iz9nidkAtSB9nZBbAuOtyZ9KhruHybk6IZctaYjG/jBYzEipxW',
    'main_admin'
);
