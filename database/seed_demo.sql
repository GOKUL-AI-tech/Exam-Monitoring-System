-- ============================================================
-- DEMO SEED DATA — Run after schema.sql
-- Creates: 1 College, 1 College Admin, 1 Staff, 3 Students,
--          1 Sample Exam with 10 MCQ Questions
--
-- All passwords are: Demo@123
-- (bcrypt hash of "Demo@123" with salt rounds=10)
-- ============================================================

-- Password hashes (generated with bcrypt, 10 rounds)
-- Admin@123 → $2b$10$7J6iz9nidkAtSB9nZBbAuOtyZ9KhruHybk6IZctaYjG/jBYzEipxW
-- Demo@123  → $2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.
DO $$
DECLARE
    demo_college_id UUID;
    demo_exam_id    UUID;
    staff_id        UUID;
    student1_id     UUID;
    student2_id     UUID;
    student3_id     UUID;
BEGIN

-- ── 1. Create Demo College ──────────────────────────────────
INSERT INTO colleges (id, name, code, address, phone, email)
VALUES (
    uuid_generate_v4(),
    'Demo Engineering College',
    'DEC001',
    '123 Tech Street, Chennai, Tamil Nadu 600001',
    '044-12345678',
    'admin@democollege.edu'
) RETURNING id INTO demo_college_id;

RAISE NOTICE 'College created: %', demo_college_id;

-- ── 2. College Admin ────────────────────────────────────────
-- Password: Demo@123
INSERT INTO users (id, college_id, name, email, password_hash, role, department)
VALUES (
    uuid_generate_v4(),
    demo_college_id,
    'College Administrator',
    'collegeadmin@democollege.edu',
    '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
    'college_admin',
    'Administration'
);

-- ── 3. Staff (creates and monitors exams) ───────────────────
-- Password: Demo@123
INSERT INTO users (id, college_id, name, email, password_hash, role, department)
VALUES (
    uuid_generate_v4(),
    demo_college_id,
    'Prof. Rajesh Kumar',
    'staff@democollege.edu',
    '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
    'staff',
    'Computer Science'
) RETURNING id INTO staff_id;

-- ── 4. Students (3 demo students) ───────────────────────────
-- Student 1 — Password: Demo@123
INSERT INTO users (id, college_id, name, email, password_hash, role, roll_number, department, phone)
VALUES (
    uuid_generate_v4(),
    demo_college_id,
    'Gokul S',
    'student@democollege.edu',
    '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
    'student',
    'CS2021001',
    'Computer Science',
    '9876543210'
) RETURNING id INTO student1_id;

-- Student 2
INSERT INTO users (id, college_id, name, email, password_hash, role, roll_number, department)
VALUES (
    uuid_generate_v4(),
    demo_college_id,
    'Priya M',
    'priya@democollege.edu',
    '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
    'student',
    'CS2021002',
    'Computer Science'
) RETURNING id INTO student2_id;

-- Student 3
INSERT INTO users (id, college_id, name, email, password_hash, role, roll_number, department)
VALUES (
    uuid_generate_v4(),
    demo_college_id,
    'Arjun R',
    'arjun@democollege.edu',
    '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
    'student',
    'CS2021003',
    'Computer Science'
) RETURNING id INTO student3_id;

-- ── 5. Sample Exam ───────────────────────────────────────────
INSERT INTO exams (
    id, college_id, created_by, title, description, subject, department,
    duration_minutes, total_marks, pass_marks,
    start_time, end_time, is_published,
    shuffle_questions, shuffle_options, proctoring_enabled
) VALUES (
    uuid_generate_v4(),
    demo_college_id,
    staff_id,
    'Computer Science Fundamentals - Demo Exam',
    'This is a demo exam to test the AI proctoring system. Answer all 10 questions carefully.',
    'Computer Science',
    'Computer Science',
    30,
    10,
    5,
    NOW() - INTERVAL '1 hour',   -- started 1 hour ago (currently active)
    NOW() + INTERVAL '23 hours', -- ends in 23 hours
    TRUE,
    TRUE, TRUE, TRUE
) RETURNING id INTO demo_exam_id;

RAISE NOTICE 'Exam created: %', demo_exam_id;

-- ── 6. Enroll all students in the exam ──────────────────────
INSERT INTO exam_enrollments (exam_id, student_id) VALUES
    (demo_exam_id, student1_id),
    (demo_exam_id, student2_id),
    (demo_exam_id, student3_id);

-- ── 7. Add 10 Sample MCQ Questions ──────────────────────────
INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, difficulty, explanation, order_index)
VALUES
(demo_exam_id,
 'What does CPU stand for?',
 'Central Processing Unit', 'Computer Personal Unit', 'Central Program Unit', 'Core Processing Utility',
 'A', 1, 'easy', 'CPU stands for Central Processing Unit, the brain of a computer.', 1),

(demo_exam_id,
 'Which data structure uses LIFO (Last In, First Out) order?',
 'Queue', 'Stack', 'Linked List', 'Tree',
 'B', 1, 'easy', 'Stack uses LIFO — the last element added is the first one removed.', 2),

(demo_exam_id,
 'What is the time complexity of Binary Search?',
 'O(n)', 'O(n²)', 'O(log n)', 'O(1)',
 'C', 1, 'medium', 'Binary Search divides the search space in half each iteration — O(log n).', 3),

(demo_exam_id,
 'Which of the following is NOT a programming paradigm?',
 'Object-Oriented', 'Functional', 'Sequential', 'Declarative',
 'C', 1, 'medium', '"Sequential" is not a recognized programming paradigm. The others are well-established paradigms.', 4),

(demo_exam_id,
 'In SQL, which command is used to remove all rows from a table without deleting the table?',
 'DROP', 'DELETE', 'REMOVE', 'TRUNCATE',
 'D', 1, 'medium', 'TRUNCATE removes all rows instantly. DELETE can use WHERE clause but is slower.', 5),

(demo_exam_id,
 'What does HTML stand for?',
 'Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Logic', 'Home Tool Markup Language',
 'A', 1, 'easy', 'HTML = HyperText Markup Language — the standard language for web pages.', 6),

(demo_exam_id,
 'Which sorting algorithm has the best average-case time complexity?',
 'Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort',
 'C', 1, 'hard', 'Merge Sort runs in O(n log n) in average and worst case.', 7),

(demo_exam_id,
 'What is the primary purpose of an Operating System?',
 'Run web browsers', 'Manage hardware and software resources', 'Compile code', 'Store data permanently',
 'B', 1, 'easy', 'An OS acts as an interface between user programs and hardware, managing resources.', 8),

(demo_exam_id,
 'Which protocol is used to send emails?',
 'HTTP', 'FTP', 'SMTP', 'SSH',
 'C', 1, 'medium', 'SMTP (Simple Mail Transfer Protocol) is used to send emails.', 9),

(demo_exam_id,
 'In object-oriented programming, what is "encapsulation"?',
 'Inheriting properties from a parent class',
 'Hiding internal state and requiring all interaction through methods',
 'Creating multiple instances of a class',
 'Overriding a parent method in a child class',
 'B', 1, 'medium', 'Encapsulation bundles data and methods together and restricts direct access to internal state.', 10);

RAISE NOTICE '✅ Demo data created successfully!';
RAISE NOTICE '   College: Demo Engineering College';
RAISE NOTICE '   Exam: Computer Science Fundamentals (ACTIVE NOW — 30 mins)';
RAISE NOTICE '';
RAISE NOTICE '=== LOGIN CREDENTIALS (password: Demo@123) ===';
RAISE NOTICE '   Main Admin:     admin@examproctoring.com  / Admin@123';
RAISE NOTICE '   College Admin:  collegeadmin@democollege.edu / Demo@123';
RAISE NOTICE '   Staff:          staff@democollege.edu / Demo@123';
RAISE NOTICE '   Student 1:      student@democollege.edu / Demo@123';
RAISE NOTICE '   Student 2:      priya@democollege.edu / Demo@123';
RAISE NOTICE '   Student 3:      arjun@democollege.edu / Demo@123';

END $$;
