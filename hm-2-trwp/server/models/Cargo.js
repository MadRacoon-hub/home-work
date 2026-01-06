const db = require('../config/db');

class Cargo {
    async getAll() {
        try {
            const [rows] = await db.query(`
        SELECT 
          c.idC as id,
          c.name,
          c.size,
          c.trip_id as tripId,
          t.destination as tripDestination,
          v.name as vehicleName
        FROM cargos c
        LEFT JOIN trips t ON c.trip_id = t.idT
        LEFT JOIN vehicles v ON t.vehicle_id = v.idV
        ORDER BY c.idC DESC
      `);

            return rows;
        } catch (error) {
            console.error('Error getting cargos:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            const [rows] = await db.query(`
        SELECT 
          c.idC as id,
          c.name,
          c.size,
          c.trip_id as tripId
        FROM cargos c
        WHERE c.idC = ?
      `, [id]);

            return rows[0] || null;
        } catch (error) {
            console.error('Error getting cargo by id:', error);
            throw error;
        }
    }

    async getByTripId(tripId) {
        try {
            const [rows] = await db.query(`
        SELECT 
          c.idC as id,
          c.name,
          c.size,
          c.trip_id as tripId
        FROM cargos c
        WHERE c.trip_id = ?
      `, [tripId]);

            return rows;
        } catch (error) {
            console.error('Error getting cargos by trip id:', error);
            throw error;
        }
    }

    async create(cargoData) {
        try {
            const { name, size, tripId } = cargoData;

            const [result] = await db.query(
                'INSERT INTO cargos (name, size, trip_id) VALUES (?, ?, ?)',
                [name, size, tripId]
            );

            return {
                id: result.insertId,
                name,
                size,
                tripId
            };
        } catch (error) {
            console.error('Error creating cargo:', error);
            throw error;
        }
    }

    async update(id, updates) {
        try {
            const { name, size, tripId } = updates;
            const updateFields = [];
            const values = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                values.push(name);
            }

            if (size !== undefined) {
                updateFields.push('size = ?');
                values.push(size);
            }

            if (tripId !== undefined) {
                updateFields.push('trip_id = ?');
                values.push(tripId);
            }

            if (updateFields.length === 0) {
                return await this.getById(id);
            }

            values.push(id);

            await db.query(
                `UPDATE cargos SET ${updateFields.join(', ')} WHERE idC = ?`,
                values
            );

            return await this.getById(id);
        } catch (error) {
            console.error('Error updating cargo:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const [result] = await db.query('DELETE FROM cargos WHERE idC = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting cargo:', error);
            throw error;
        }
    }

    async canAddToTrip(tripId, cargoSize, excludeCargoId = null) {
        try {
            console.log('Проверка canAddToTrip. Рейс:', tripId, 'Размер:', cargoSize, 'Исключаемый груз:', excludeCargoId);

            // Преобразуем tripId в число
            const tripIdNum = typeof tripId === 'string' ? parseInt(tripId) : tripId;
            const cargoSizeNum = typeof cargoSize === 'string' ? parseInt(cargoSize) : cargoSize;

            // Базовый запрос для получения вместимости
            let query = `
                SELECT
                    v.capacity,
                    COALESCE(SUM(c.size), 0) as usedSpace
                FROM trips t
                         JOIN vehicles v ON t.vehicle_id = v.idV
                         LEFT JOIN cargos c ON t.idT = c.trip_id
                WHERE t.idT = ?
            `;

            const params = [tripIdNum];

            // Если нужно исключить определенный груз (например, при переносе)
            if (excludeCargoId) {
                const excludeIdNum = typeof excludeCargoId === 'string' ? parseInt(excludeCargoId) : excludeCargoId;
                query += ` AND (c.idC != ? OR c.idC IS NULL)`;
                params.push(excludeIdNum);
            }

            query += ` GROUP BY t.idT, v.idV, v.capacity`;

            console.log('SQL запрос:', query, 'Параметры:', params);

            const [rows] = await db.query(query, params);

            if (!rows[0]) {
                console.log('Рейс не найден или нет автомобиля');
                return false;
            }

            // Явно преобразуем usedSpace в число
            const capacity = parseInt(rows[0].capacity);
            const usedSpace = parseInt(rows[0].usedSpace) || 0;
            const result = (usedSpace + cargoSizeNum) <= capacity;

            console.log('Результат проверки:', {
                capacity,
                usedSpace,
                newCargoSize: cargoSizeNum,
                total: usedSpace + cargoSizeNum,
                canAdd: result,
                availableSpace: capacity - usedSpace
            });

            return result;
        } catch (error) {
            console.error('Error checking cargo capacity:', error);
            throw error;
        }
    }

    async getTotalSizeInTrip(tripId) {
        try {
            const tripIdNum = typeof tripId === 'string' ? parseInt(tripId) : tripId;

            const [rows] = await db.query(`
            SELECT COALESCE(SUM(size), 0) as totalSize
            FROM cargos
            WHERE trip_id = ?
        `, [tripIdNum]);

            return parseInt(rows[0].totalSize) || 0;
        } catch (error) {
            console.error('Error getting total cargo size in trip:', error);
            throw error;
        }
    }

    async getAvailableSpace(tripId, excludeCargoId = null) {
        try {
            const tripIdNum = typeof tripId === 'string' ? parseInt(tripId) : tripId;

            let query = `
                SELECT
                    v.capacity,
                    COALESCE(SUM(c.size), 0) as usedSpace
                FROM trips t
                         JOIN vehicles v ON t.vehicle_id = v.idV
                         LEFT JOIN cargos c ON t.idT = c.trip_id
                WHERE t.idT = ?
            `;

            const params = [tripIdNum];

            if (excludeCargoId) {
                const excludeIdNum = typeof excludeCargoId === 'string' ? parseInt(excludeCargoId) : excludeCargoId;
                query += ` AND (c.idC != ? OR c.idC IS NULL)`;
                params.push(excludeIdNum);
            }

            query += ` GROUP BY t.idT, v.idV, v.capacity`;

            const [rows] = await db.query(query, params);

            if (!rows[0]) return 0;

            const capacity = parseInt(rows[0].capacity);
            const usedSpace = parseInt(rows[0].usedSpace) || 0;
            return capacity - usedSpace;
        } catch (error) {
            console.error('Error getting available space:', error);
            throw error;
        }
    }
}

module.exports = new Cargo();