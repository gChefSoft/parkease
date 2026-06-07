-- ParkEase MySQL Schema
-- Run this once to set up your database

CREATE DATABASE IF NOT EXISTS parkease_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parkease_db;

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20),
  vehicle_type ENUM('2-wheel','4-wheel','6-wheel') DEFAULT '4-wheel',
  plate_number VARCHAR(20),
  role        ENUM('user','admin') DEFAULT 'user',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── PARKING SLOTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_slots (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slot_number VARCHAR(10) NOT NULL UNIQUE,
  type        ENUM('2-wheel','4-wheel','6-wheel') NOT NULL,
  status      ENUM('available','occupied','reserved','maintenance') DEFAULT 'available',
  price_per_hour DECIMAL(8,2) NOT NULL,
  row_pos     INT DEFAULT 0,
  col_pos     INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── BOOKINGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  slot_id     INT NOT NULL,
  slot_number VARCHAR(10) NOT NULL,
  start_time  DATETIME NOT NULL,
  end_time    DATETIME,
  duration    DECIMAL(5,2),
  total_price DECIMAL(10,2),
  status      ENUM('pending','active','completed','cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  vehicle_plate VARCHAR(20),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
);

-- ── CONTACT MESSAGES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  subject     VARCHAR(200),
  message     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── SEED: Admin user (password: Admin@1234) ─────────────────
INSERT IGNORE INTO users (name, email, password, role, vehicle_type, plate_number, contact_number)
VALUES (
  'Admin',
  'admin@parkease.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Admin@1234
  'admin',
  '4-wheel',
  'ADMIN-001',
  '+63 912 000 0000'
);

-- ── SEED: Parking Slots ─────────────────────────────────────
-- 2-wheel slots (P001–P020)
INSERT IGNORE INTO parking_slots (slot_number, type, price_per_hour, row_pos, col_pos) VALUES
('P001','2-wheel',20,0,0),('P002','2-wheel',20,0,1),('P003','2-wheel',20,0,2),('P004','2-wheel',20,0,3),
('P005','2-wheel',20,0,4),('P006','2-wheel',20,0,5),('P007','2-wheel',20,0,6),('P008','2-wheel',20,0,7),
('P009','2-wheel',20,1,0),('P010','2-wheel',20,1,1),('P011','2-wheel',20,1,2),('P012','2-wheel',20,1,3),
('P013','2-wheel',20,1,4),('P014','2-wheel',20,1,5),('P015','2-wheel',20,1,6),('P016','2-wheel',20,1,7),
('P017','2-wheel',20,2,0),('P018','2-wheel',20,2,1),('P019','2-wheel',20,2,2),('P020','2-wheel',20,2,3);

-- 4-wheel slots (C001–C040)
INSERT IGNORE INTO parking_slots (slot_number, type, price_per_hour, row_pos, col_pos) VALUES
('C001','4-wheel',50,3,0),('C002','4-wheel',50,3,1),('C003','4-wheel',50,3,2),('C004','4-wheel',50,3,3),
('C005','4-wheel',50,3,4),('C006','4-wheel',50,3,5),('C007','4-wheel',50,3,6),('C008','4-wheel',50,3,7),
('C009','4-wheel',50,4,0),('C010','4-wheel',50,4,1),('C011','4-wheel',50,4,2),('C012','4-wheel',50,4,3),
('C013','4-wheel',50,4,4),('C014','4-wheel',50,4,5),('C015','4-wheel',50,4,6),('C016','4-wheel',50,4,7),
('C017','4-wheel',50,5,0),('C018','4-wheel',50,5,1),('C019','4-wheel',50,5,2),('C020','4-wheel',50,5,3),
('C021','4-wheel',50,5,4),('C022','4-wheel',50,5,5),('C023','4-wheel',50,5,6),('C024','4-wheel',50,5,7),
('C025','4-wheel',50,6,0),('C026','4-wheel',50,6,1),('C027','4-wheel',50,6,2),('C028','4-wheel',50,6,3),
('C029','4-wheel',50,6,4),('C030','4-wheel',50,6,5),('C031','4-wheel',50,6,6),('C032','4-wheel',50,6,7),
('C033','4-wheel',50,7,0),('C034','4-wheel',50,7,1),('C035','4-wheel',50,7,2),('C036','4-wheel',50,7,3),
('C037','4-wheel',50,7,4),('C038','4-wheel',50,7,5),('C039','4-wheel',50,7,6),('C040','4-wheel',50,7,7);

-- 6-wheel slots (T001–T010)
INSERT IGNORE INTO parking_slots (slot_number, type, price_per_hour, row_pos, col_pos) VALUES
('T001','6-wheel',80,8,0),('T002','6-wheel',80,8,1),('T003','6-wheel',80,8,2),('T004','6-wheel',80,8,3),
('T005','6-wheel',80,8,4),('T006','6-wheel',80,8,5),('T007','6-wheel',80,8,6),('T008','6-wheel',80,8,7),
('T009','6-wheel',80,9,0),('T010','6-wheel',80,9,1);

USE parkease_db;

UPDATE users 
SET password = '$2b$10$uGbkggMMrdPGTK7x.Qd7sumZSVaMe0TvbjRUNpLA7k2DjUQNv1rqS'
WHERE email = 'admin@parkease.com';

SELECT email, role FROM users WHERE email = 'admin@parkease.com';

USE parkease_db;
SELECT status, COUNT(*), SUM(total_price) FROM bookings GROUP BY status;

USE parkease_db;
SELECT * FROM contact_messages ORDER BY created_at DESC;

USE parkease_db;
SELECT * FROM contact_messages WHERE subject LIKE 'Report:%' ORDER BY created_at DESC;