-- ===================================================
-- FitLife — Data tier (MySQL)
-- ===================================================

CREATE TABLE IF NOT EXISTS members (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  daily_goal  INT          NOT NULL DEFAULT 500,   -- kcal to burn per day
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workouts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  member_id   INT          NOT NULL,
  type        VARCHAR(40)  NOT NULL,
  duration    INT          NOT NULL CHECK (duration > 0),      -- minutes
  calories    INT          NOT NULL DEFAULT 0 CHECK (calories >= 0),
  intensity   ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  logged_on   DATE         NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Sample data
INSERT INTO members (name, email, daily_goal) VALUES
  ('Charan', 'charan@example.com', 500),
  ('Srinidhi', 'srinidhi@example.com', 450),
  ('Lasya', 'lasya@example.com', 400);

INSERT INTO workouts (member_id, type, duration, calories, intensity, logged_on) VALUES
  (1, 'Running',         35, 380, 'High',   '2026-10-22'),
  (2, 'Yoga',            40, 160, 'Low',    '2026-10-22'),
  (3, 'Cycling',         45, 410, 'High',   '2026-10-21'),
  (1, 'Weight Training', 50, 300, 'Medium', '2026-10-21'),
  (2, 'Swimming',        30, 290, 'Medium', '2026-10-20');
