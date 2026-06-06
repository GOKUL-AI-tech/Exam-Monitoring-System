-- ============================================================
-- COMPLETE DATABASE SETUP — Run this ONE file in pgAdmin or psql
-- This combines schema + demo seed data in the correct order
-- ============================================================

-- Step 0: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SCHEMA — Create all tables
-- ============================================================

DROP TABLE IF EXISTS audit_logs      CASCADE;
DROP TABLE IF EXISTS violations      CASCADE;
DROP TABLE IF EXISTS results         CASCADE;
DROP TABLE IF EXISTS student_answers CASCADE;
DROP TABLE IF EXISTS exam_sessions   CASCADE;
DROP TABLE IF EXISTS exam_enrollments CASCADE;
DROP TABLE IF EXISTS questions       CASCADE;
DROP TABLE IF EXISTS exams           CASCADE;
DROP TABLE IF EXISTS users           CASCADE;
DROP TABLE IF EXISTS colleges        CASCADE;

-- Colleges
CREATE TABLE colleges (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(255) NOT NULL,
    code       VARCHAR(50)  UNIQUE NOT NULL,
    address    TEXT,
    phone      VARCHAR(20),
    email      VARCHAR(255) UNIQUE NOT NULL,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (all roles)
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id       UUID REFERENCES colleges(id) ON DELETE SET NULL,
    name             VARCHAR(255) NOT NULL,
    email            VARCHAR(255) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    role             VARCHAR(20)  NOT NULL CHECK (role IN ('main_admin','college_admin','staff','student')),
    roll_number      VARCHAR(100),
    department       VARCHAR(100),
    phone            VARCHAR(20),
    profile_image_url TEXT,
    is_active        BOOLEAN DEFAULT TRUE,
    last_login       TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

-- Exams
CREATE TABLE exams (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id         UUID REFERENCES colleges(id) ON DELETE CASCADE,
    created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    title              VARCHAR(255) NOT NULL,
    description        TEXT,
    subject            VARCHAR(100),
    department         VARCHAR(100),
    duration_minutes   INTEGER NOT NULL DEFAULT 60,
    total_marks        INTEGER NOT NULL DEFAULT 100,
    pass_marks         INTEGER NOT NULL DEFAULT 40,
    start_time         TIMESTAMP NOT NULL,
    end_time           TIMESTAMP NOT NULL,
    is_published       BOOLEAN DEFAULT FALSE,
    allow_retake       BOOLEAN DEFAULT FALSE,
    shuffle_questions  BOOLEAN DEFAULT TRUE,
    shuffle_options    BOOLEAN DEFAULT TRUE,
    proctoring_enabled BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMP DEFAULT NOW(),
    updated_at         TIMESTAMP DEFAULT NOW()
);

-- Questions
CREATE TABLE questions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id          UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_text    TEXT NOT NULL,
    question_image_url TEXT,
    option_a         TEXT NOT NULL,
    option_b         TEXT NOT NULL,
    option_c         TEXT NOT NULL,
    option_d         TEXT NOT NULL,
    correct_option   CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
    marks            INTEGER NOT NULL DEFAULT 1,
    difficulty       VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
    explanation      TEXT,
    order_index      INTEGER DEFAULT 0,
    created_at       TIMESTAMP DEFAULT NOW()
);

-- Exam Enrollments
CREATE TABLE exam_enrollments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id    UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);

-- Exam Sessions
CREATE TABLE exam_sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id       UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at    TIMESTAMP DEFAULT NOW(),
    submitted_at  TIMESTAMP,
    is_submitted  BOOLEAN DEFAULT FALSE,
    face_verified BOOLEAN DEFAULT FALSE,
    ip_address    VARCHAR(45),
    browser_info  TEXT,
    status        VARCHAR(20) DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress','submitted','terminated','auto_submitted')),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Student Answers
CREATE TABLE student_answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id     UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_option CHAR(1) CHECK (selected_option IN ('A','B','C','D')),
    is_correct      BOOLEAN,
    marks_awarded   INTEGER DEFAULT 0,
    answered_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

-- Results
CREATE TABLE results (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID REFERENCES exam_sessions(id) ON DELETE CASCADE UNIQUE,
    exam_id             UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id          UUID REFERENCES users(id) ON DELETE CASCADE,
    total_questions     INTEGER NOT NULL,
    attempted_questions INTEGER DEFAULT 0,
    correct_answers     INTEGER DEFAULT 0,
    wrong_answers       INTEGER DEFAULT 0,
    marks_obtained      FLOAT DEFAULT 0,
    total_marks         INTEGER NOT NULL,
    percentage          FLOAT DEFAULT 0,
    grade               VARCHAR(5),
    is_passed           BOOLEAN DEFAULT FALSE,
    violation_count     INTEGER DEFAULT 0,
    calculated_at       TIMESTAMP DEFAULT NOW()
);

-- Violations
CREATE TABLE violations (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id       UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    exam_id          UUID REFERENCES exams(id) ON DELETE CASCADE,
    violation_type   VARCHAR(50) NOT NULL CHECK (violation_type IN (
                       'face_not_detected','multiple_faces',
                       'eye_movement_suspicious','head_pose_suspicious',
                       'tab_switch','fullscreen_exit','copy_paste',
        'copy_paste_attempt',
        'screenshot_attempt',
        'window_focus_loss',
        'devtools_attempt',
        'devtools_open',
        'audio_disturbance',
                       'keyboard_shortcut','audio_suspicious',
                       'phone_detected','object_detected')),
    severity         VARCHAR(10) DEFAULT 'medium'
                     CHECK (severity IN ('low','medium','high','critical')),
    description      TEXT,
    screenshot_url   TEXT,
    confidence_score FLOAT,
    timestamp        TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    details     JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_users_college    ON users(college_id);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_exams_college    ON exams(college_id);
CREATE INDEX idx_questions_exam   ON questions(exam_id);
CREATE INDEX idx_enroll_exam      ON exam_enrollments(exam_id);
CREATE INDEX idx_enroll_student   ON exam_enrollments(student_id);
CREATE INDEX idx_sessions_exam    ON exam_sessions(exam_id);
CREATE INDEX idx_sessions_student ON exam_sessions(student_id);
CREATE INDEX idx_answers_session  ON student_answers(session_id);
CREATE INDEX idx_results_student  ON results(student_id);
CREATE INDEX idx_violations_session ON violations(session_id);

-- ── Auto-update updated_at trigger ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_colleges_updated BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_exams_updated    BEFORE UPDATE ON exams    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED — Main Admin account
-- Password: Admin@123
-- ============================================================
INSERT INTO users (name, email, password_hash, role)
VALUES (
    'Main Administrator',
    'admin@examproctoring.com',
    '$2b$10$7J6iz9nidkAtSB9nZBbAuOtyZ9KhruHybk6IZctaYjG/jBYzEipxW',
    'main_admin'
);

-- ============================================================
-- SEED — Demo College, Staff, Students, Exam (all in one block)
-- Password for all demo users: Demo@123
-- ============================================================
DO $$
DECLARE
    demo_college_id UUID;
    demo_exam_id    UUID;
    staff_id        UUID;
    student1_id     UUID;
    student2_id     UUID;
    student3_id     UUID;
BEGIN

    -- 1. College
    INSERT INTO colleges (name, code, address, phone, email)
    VALUES (
        'Demo Engineering College',
        'DEC001',
        '123 Tech Street, Chennai, Tamil Nadu 600001',
        '044-12345678',
        'admin@democollege.edu'
    ) RETURNING id INTO demo_college_id;

    -- 2. College Admin  (password: Demo@123)
    INSERT INTO users (college_id, name, email, password_hash, role, department)
    VALUES (
        demo_college_id,
        'College Administrator',
        'collegeadmin@democollege.edu',
        '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
        'college_admin',
        'Administration'
    );

    -- 3. Staff  (password: Demo@123)
    INSERT INTO users (college_id, name, email, password_hash, role, department)
    VALUES (
        demo_college_id,
        'Prof. Rajesh Kumar',
        'staff@democollege.edu',
        '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
        'staff',
        'Computer Science'
    ) RETURNING id INTO staff_id;

    -- 4a. Student 1 — Gokul  (password: Demo@123)
    INSERT INTO users (college_id, name, email, password_hash, role, roll_number, department, phone)
    VALUES (
        demo_college_id,
        'Gokul S',
        'student@democollege.edu',
        '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
        'student',
        'CS2021001',
        'Computer Science',
        '9876543210'
    ) RETURNING id INTO student1_id;

    -- 4b. Student 2  (password: Demo@123)
    INSERT INTO users (college_id, name, email, password_hash, role, roll_number, department)
    VALUES (
        demo_college_id,
        'Priya M',
        'priya@democollege.edu',
        '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
        'student',
        'CS2021002',
        'Computer Science'
    ) RETURNING id INTO student2_id;

    -- 4c. Student 3  (password: Demo@123)
    INSERT INTO users (college_id, name, email, password_hash, role, roll_number, department)
    VALUES (
        demo_college_id,
        'Arjun R',
        'arjun@democollege.edu',
        '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
        'student',
        'CS2021003',
        'Computer Science'
    ) RETURNING id INTO student3_id;

    -- 5. Exam (active right now — started 1 hour ago, ends in 23 hours)
    INSERT INTO exams (
        college_id, created_by, title, description, subject, department,
        duration_minutes, total_marks, pass_marks,
        start_time, end_time, is_published,
        shuffle_questions, shuffle_options, proctoring_enabled
    ) VALUES (
        demo_college_id, staff_id,
        'Computer Science Fundamentals - Demo Exam',
        'Demo exam to test the AI proctoring system. Answer all 10 questions.',
        'Computer Science', 'Computer Science',
        30, 10, 5,
        NOW() - INTERVAL '1 hour',
        NOW() + INTERVAL '23 hours',
        TRUE, TRUE, TRUE, TRUE
    ) RETURNING id INTO demo_exam_id;

    -- 6. Enroll all students
    INSERT INTO exam_enrollments (exam_id, student_id) VALUES
        (demo_exam_id, student1_id),
        (demo_exam_id, student2_id),
        (demo_exam_id, student3_id);

    -- 7. Ten MCQ questions
    INSERT INTO questions
        (exam_id, question_text, option_a, option_b, option_c, option_d,
         correct_option, marks, difficulty, explanation, order_index)
    VALUES
    (demo_exam_id,
     'What does CPU stand for?',
     'Central Processing Unit','Computer Personal Unit','Central Program Unit','Core Processing Utility',
     'A',1,'easy','CPU = Central Processing Unit, the brain of a computer.',1),

    (demo_exam_id,
     'Which data structure follows LIFO order?',
     'Queue','Stack','Linked List','Tree',
     'B',1,'easy','Stack uses Last In, First Out order.',2),

    (demo_exam_id,
     'What is the time complexity of Binary Search?',
     'O(n)','O(n²)','O(log n)','O(1)',
     'C',1,'medium','Binary Search halves the search space each step — O(log n).',3),

    (demo_exam_id,
     'Which of the following is NOT a programming paradigm?',
     'Object-Oriented','Functional','Sequential','Declarative',
     'C',1,'medium','Sequential is not a recognised programming paradigm.',4),

    (demo_exam_id,
     'Which SQL command removes all rows from a table instantly without deleting the table?',
     'DROP','DELETE','REMOVE','TRUNCATE',
     'D',1,'medium','TRUNCATE removes all rows instantly; DELETE can use WHERE.',5),

    (demo_exam_id,
     'What does HTML stand for?',
     'Hyper Text Markup Language','High Tech Modern Language','Hyper Transfer Markup Logic','Home Tool Markup Language',
     'A',1,'easy','HTML = HyperText Markup Language.',6),

    (demo_exam_id,
     'Which sorting algorithm has the best average-case time complexity?',
     'Bubble Sort','Insertion Sort','Merge Sort','Selection Sort',
     'C',1,'hard','Merge Sort runs in O(n log n) on average and worst case.',7),

    (demo_exam_id,
     'What is the primary purpose of an Operating System?',
     'Run web browsers','Manage hardware and software resources','Compile code','Store data permanently',
     'B',1,'easy','An OS manages hardware/software resources and acts as intermediary.',8),

    (demo_exam_id,
     'Which protocol is used to send emails?',
     'HTTP','FTP','SMTP','SSH',
     'C',1,'medium','SMTP = Simple Mail Transfer Protocol, used to send emails.',9),

    (demo_exam_id,
     'In OOP, what is encapsulation?',
     'Inheriting from a parent class',
     'Hiding internal state and exposing only through methods',
     'Creating multiple instances of a class',
     'Overriding a parent method in a child class',
     'B',1,'medium','Encapsulation bundles data and methods, restricting direct access.',10);

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '  Database setup complete!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '  LOGIN CREDENTIALS';
    RAISE NOTICE '  Main Admin   : admin@examproctoring.com  / Admin@123';
    RAISE NOTICE '  College Admin: collegeadmin@democollege.edu / Demo@123';
    RAISE NOTICE '  Staff        : staff@democollege.edu / Demo@123';
    RAISE NOTICE '  Student      : student@democollege.edu / Demo@123';
    RAISE NOTICE '  Student 2    : priya@democollege.edu / Demo@123';
    RAISE NOTICE '  Student 3    : arjun@democollege.edu / Demo@123';
    RAISE NOTICE '==============================================';

END $$;
