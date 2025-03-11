-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL,
  explanation TEXT,
  subject_id INT,
  year INT,
  degree VARCHAR(20),
  points INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Create test_results table
CREATE TABLE IF NOT EXISTS test_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  subject_id INT,
  total_questions INT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  time_taken INT NOT NULL,
  status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Create test_answers table
CREATE TABLE IF NOT EXISTS test_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_result_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_answer CHAR(1) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_result_id) REFERENCES test_results(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Insert sample subjects if they don't exist
INSERT IGNORE INTO subjects (name, description) VALUES
('Pharmacology', 'Study of drugs and their effects on the body'),
('Anatomy', 'Study of the structure of the human body'),
('Physiology', 'Study of the functions of the human body'),
('Biochemistry', 'Study of chemical processes in living organisms'),
('Pathology', 'Study of diseases and their causes');

-- Insert sample questions if they don't exist
INSERT IGNORE INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject_id, year, degree) VALUES
('What is the mechanism of action of aspirin?', 'Inhibition of COX-1 and COX-2', 'Inhibition of H2 receptors', 'Inhibition of ACE', 'Inhibition of Na+/K+ pump', 'A', 'Aspirin inhibits cyclooxygenase enzymes, reducing prostaglandin synthesis', 1, 2024, 'medium'),
('Which of the following is a beta-blocker?', 'Propranolol', 'Amlodipine', 'Lisinopril', 'Furosemide', 'A', 'Propranolol is a non-selective beta-blocker', 1, 2024, 'easy'),
('What is the main function of the liver?', 'Detoxification', 'Pumping blood', 'Producing insulin', 'Digesting food', 'A', 'The liver is the main organ for detoxification', 2, 2024, 'easy'); 