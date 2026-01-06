-- Создание базы данных (если не существует)
CREATE DATABASE IF NOT EXISTS transport_company
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

USE transport_company;

-- Таблица автомобилей
CREATE TABLE IF NOT EXISTS vehicles (
                                        idV INT AUTO_INCREMENT PRIMARY KEY,
                                        name VARCHAR(45) NOT NULL,
    type ENUM('фургон', 'грузовик', 'фура') NOT NULL,
    capacity INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Таблица рейсов
CREATE TABLE IF NOT EXISTS trips (
                                     idT INT AUTO_INCREMENT PRIMARY KEY,
                                     destination VARCHAR(45) NOT NULL,
    vehicle_id INT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(idV) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Таблица грузов
CREATE TABLE IF NOT EXISTS cargos (
                                      idC INT AUTO_INCREMENT PRIMARY KEY,
                                      name VARCHAR(45) NOT NULL,
    size INT NOT NULL,
    trip_id INT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(idT) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Вставка тестовых данных автомобилей
INSERT INTO vehicles (name, type, capacity) VALUES
                                                ('Газель-1', 'фургон', 5),
                                                ('Газель-2', 'фургон', 5),
                                                ('КАМАЗ-1', 'грузовик', 10),
                                                ('MAN TGS', 'фура', 20),
                                                ('Scania R500', 'фура', 20)
    ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Создание индексов для улучшения производительности
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_cargos_trip_id ON cargos(trip_id);