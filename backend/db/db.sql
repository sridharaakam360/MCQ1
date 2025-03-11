-- Create the database
CREATE DATABASE IF NOT EXISTS gpat_pyq_db;
USE gpat_pyq_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    bio TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    subject_id INT NOT NULL,
    question TEXT NOT NULL,
    answer VARCHAR(255) NOT NULL,
    option1 VARCHAR(255) NOT NULL,
    option2 VARCHAR(255) NOT NULL,
    option3 VARCHAR(255) NOT NULL,
    option4 VARCHAR(255) NOT NULL,
    degree ENUM('Bpharm', 'Dpharm', 'Both') NOT NULL DEFAULT 'Bpharm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- User Responses Table
CREATE TABLE IF NOT EXISTS user_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    user_answer VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- User Performance Table
CREATE TABLE IF NOT EXISTS user_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    duration INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- Insert Sample Data
-- Subjects
INSERT INTO subjects (name, description) VALUES
('Pharmaceutics', 'Study of the process of turning a new chemical entity into a medication.'),
('Pharmacology', 'Study of drug action and interactions with living organisms.'),
('Pharmacognosy', 'Study of medicinal drugs derived from plants or other natural sources.');

-- Questions
INSERT INTO questions (year, subject_id, question, answer, option1, option2, option3, option4, degree) VALUES
(2020, 1, 'What is the primary mechanism of drug release from a matrix tablet?', 'Diffusion', 'Diffusion', 'Erosion', 'Osmosis', 'Dissolution', 'Bpharm'),
(2020, 2, 'Which of the following is a beta-blocker?', 'Propranolol', 'Propranolol', 'Amlodipine', 'Losartan', 'Omeprazole', 'Bpharm'),
(2020, 3, 'What is the active constituent of Turmeric?', 'Curcumin', 'Curcumin', 'Capsaicin', 'Quercetin', 'Resveratrol', 'Bpharm'),
(2021, 1, 'What is the purpose of a disintegrant in tablet formulation?', 'To promote tablet breakup', 'To promote tablet breakup', 'To enhance drug stability', 'To control drug release', 'To improve drug solubility', 'Bpharm'),
(2021, 2, 'Which drug is used to treat hypertension by blocking angiotensin II receptors?', 'Losartan', 'Losartan', 'Propranolol', 'Amlodipine', 'Warfarin', 'Bpharm'),
(2021, 3, 'Which plant is the source of the alkaloid quinine?', 'Cinchona bark', 'Cinchona bark', 'Digitalis lanata', 'Aloe vera', 'Turmeric', 'Bpharm'),
(2022, 1, 'What is the role of a plasticizer in film coating?', 'To improve flexibility', 'To improve flexibility', 'To enhance drug release', 'To increase tablet hardness', 'To reduce tablet weight', 'Dpharm'),
(2022, 2, 'Which drug is a proton pump inhibitor?', 'Omeprazole', 'Omeprazole', 'Propranolol', 'Losartan', 'Warfarin', 'Dpharm'),
(2022, 3, 'What is the main active component of Aloe vera?', 'Aloin', 'Aloin', 'Curcumin', 'Quercetin', 'Resveratrol', 'Dpharm'),
(2023, 1, 'What is the significance of the Noyes-Whitney equation?', 'Describes drug dissolution rate', 'Describes drug dissolution rate', 'Describes drug absorption rate', 'Describes drug excretion rate', 'Describes drug metabolism rate', 'Both'),
(2023, 2, 'Which drug is used as an anticoagulant?', 'Warfarin', 'Warfarin', 'Propranolol', 'Losartan', 'Omeprazole', 'Both'),
(2023, 3, 'Which plant is the source of the cardiac glycoside digoxin?', 'Digitalis lanata', 'Digitalis lanata', 'Cinchona bark', 'Aloe vera', 'Turmeric', 'Both');

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, email, is_admin) 
VALUES ('admin', '$2b$10$5dwsS5snIRlKu8ka5r5UxOB0ABjr5MQHGkd4cRE/nJBLU5CsXqk5m', 'admin@example.com', TRUE);