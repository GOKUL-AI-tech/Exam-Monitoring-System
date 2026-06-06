-- ============================================================
-- RESET & RESEED — Paste this directly in pgAdmin Query Tool
-- Clears all existing data and reinserts fresh demo data
-- ============================================================

-- Step 1: Clear all data in correct order (respect foreign keys)
TRUNCATE TABLE
    audit_logs,
    violations,
    results,
    student_answers,
    exam_sessions,
    exam_enrollments,
    questions,
    exams,
    users,
    colleges
CASCADE;

-- Step 2: Ensure UUID extension is active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 3: Main Admin (password: Admin@123)
INSERT INTO users (name, email, password_hash, role)
VALUES (
    'Main Administrator',
    'admin@examproctoring.com',
    '$2b$10$7J6iz9nidkAtSB9nZBbAuOtyZ9KhruHybk6IZctaYjG/jBYzEipxW',
    'main_admin'
);

-- Step 4: Demo college + users + exam (all in one block)
DO $$
DECLARE
    col_id  UUID;
    exam_id UUID;
    staff_id UUID;
    s1 UUID; s2 UUID; s3 UUID;
BEGIN

    -- College
    INSERT INTO colleges (name, code, address, phone, email)
    VALUES ('Demo Engineering College','DEC001',
            '123 Tech Street, Chennai, Tamil Nadu 600001',
            '044-12345678','admin@democollege.edu')
    RETURNING id INTO col_id;

    -- College Admin  (Demo@123)
    INSERT INTO users (college_id,name,email,password_hash,role,department)
    VALUES (col_id,'College Administrator','collegeadmin@democollege.edu',
            '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
            'college_admin','Administration');

    -- Staff  (Demo@123)
    INSERT INTO users (college_id,name,email,password_hash,role,department)
    VALUES (col_id,'Prof. Rajesh Kumar','staff@democollege.edu',
            '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
            'staff','Computer Science')
    RETURNING id INTO staff_id;

    -- Student 1 — Gokul  (Demo@123)
    INSERT INTO users (college_id,name,email,password_hash,role,roll_number,department,phone)
    VALUES (col_id,'Gokul S','student@democollege.edu',
            '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
            'student','CS2021001','Computer Science','9876543210')
    RETURNING id INTO s1;

    -- Student 2  (Demo@123)
    INSERT INTO users (college_id,name,email,password_hash,role,roll_number,department)
    VALUES (col_id,'Priya M','priya@democollege.edu',
            '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
            'student','CS2021002','Computer Science')
    RETURNING id INTO s2;

    -- Student 3  (Demo@123)
    INSERT INTO users (college_id,name,email,password_hash,role,roll_number,department)
    VALUES (col_id,'Arjun R','arjun@democollege.edu',
            '$2b$10$5d9CSFyLTSN2ENH7/FljsuhNJdqiwiyjgDrm9pIveKuGN.cwP8es.',
            'student','CS2021003','Computer Science')
    RETURNING id INTO s3;

    -- Exam (active now: started 1 hour ago, ends in 23 hours)
    INSERT INTO exams (
        college_id, created_by, title, description, subject, department,
        duration_minutes, total_marks, pass_marks,
        start_time, end_time, is_published,
        shuffle_questions, shuffle_options, proctoring_enabled
    ) VALUES (
        col_id, staff_id,
        'Computer Science Fundamentals - Demo Exam',
        'Demo exam to test the AI proctoring system. Answer all 10 questions.',
        'Computer Science','Computer Science',
        30, 10, 5,
        NOW() - INTERVAL '1 hour',
        NOW() + INTERVAL '23 hours',
        TRUE, TRUE, TRUE, TRUE
    ) RETURNING id INTO exam_id;

    -- Enroll all 3 students
    INSERT INTO exam_enrollments (exam_id, student_id) VALUES
        (exam_id, s1), (exam_id, s2), (exam_id, s3);

    -- 10 MCQ Questions
    INSERT INTO questions (exam_id,question_text,option_a,option_b,option_c,option_d,correct_option,marks,difficulty,explanation,order_index) VALUES
    (exam_id,'What does CPU stand for?',
     'Central Processing Unit','Computer Personal Unit','Central Program Unit','Core Processing Utility',
     'A',1,'easy','CPU = Central Processing Unit.',1),

    (exam_id,'Which data structure follows LIFO order?',
     'Queue','Stack','Linked List','Tree',
     'B',1,'easy','Stack uses Last In First Out.',2),

    (exam_id,'Time complexity of Binary Search?',
     'O(n)','O(n²)','O(log n)','O(1)',
     'C',1,'medium','Binary Search halves the space each step.',3),

    (exam_id,'Which is NOT a programming paradigm?',
     'Object-Oriented','Functional','Sequential','Declarative',
     'C',1,'medium','Sequential is not a programming paradigm.',4),

    (exam_id,'Which SQL command removes all rows instantly without deleting the table?',
     'DROP','DELETE','REMOVE','TRUNCATE',
     'D',1,'medium','TRUNCATE removes all rows instantly.',5),

    (exam_id,'What does HTML stand for?',
     'Hyper Text Markup Language','High Tech Modern Language','Hyper Transfer Markup Logic','Home Tool Markup Language',
     'A',1,'easy','HTML = HyperText Markup Language.',6),

    (exam_id,'Best average-case sorting algorithm?',
     'Bubble Sort','Insertion Sort','Merge Sort','Selection Sort',
     'C',1,'hard','Merge Sort is O(n log n) average and worst case.',7),

    (exam_id,'Primary purpose of an Operating System?',
     'Run web browsers','Manage hardware and software resources','Compile code','Store data permanently',
     'B',1,'easy','OS manages hardware/software resources.',8),

    (exam_id,'Which protocol sends emails?',
     'HTTP','FTP','SMTP','SSH',
     'C',1,'medium','SMTP = Simple Mail Transfer Protocol.',9),

    (exam_id,'In OOP, what is encapsulation?',
     'Inheriting from a parent class',
     'Hiding internal state and exposing only through methods',
     'Creating multiple instances of a class',
     'Overriding a parent method in a child class',
     'B',1,'medium','Encapsulation hides state and exposes it via methods.',10);

    RAISE NOTICE '============================================';
    RAISE NOTICE 'SUCCESS — Demo data loaded!';
    RAISE NOTICE '--------------------------------------------';
    RAISE NOTICE 'Main Admin   : admin@examproctoring.com / Admin@123';
    RAISE NOTICE 'College Admin: collegeadmin@democollege.edu / Demo@123';
    RAISE NOTICE 'Staff        : staff@democollege.edu / Demo@123';
    RAISE NOTICE 'Student      : student@democollege.edu / Demo@123';
    RAISE NOTICE 'Student 2    : priya@democollege.edu / Demo@123';
    RAISE NOTICE 'Student 3    : arjun@democollege.edu / Demo@123';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Exam is ACTIVE NOW — log in as student to test!';

END $$;
