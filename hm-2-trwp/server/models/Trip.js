const db = require('../config/db');

class Trip {
    constructor() {
        this.destinations = ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск'];
    }

    async getAll() {
        try {
            const [rows] = await db.query(`
                SELECT
                    t.idT as id,
                    t.destination,
                    t.vehicle_id as vehicleId,
                    v.idV as vehicleId,
                    v.name as vehicleName,
                    v.type as vehicleType,
                    v.capacity as vehicleCapacity
                FROM trips t
                         LEFT JOIN vehicles v ON t.vehicle_id = v.idV
                ORDER BY t.idT DESC
            `);

            // Исправляем маппинг данных
            return rows.map(row => ({
                id: row.id.toString(), // Преобразуем в строку
                destination: row.destination,
                vehicleId: row.vehicleId ? row.vehicleId.toString() : null, // Преобразуем в строку
                vehicle: row.vehicleId ? {
                    id: row.vehicleId.toString(), // Преобразуем в строку
                    name: row.vehicleName,
                    type: row.vehicleType,
                    capacity: row.vehicleCapacity
                } : null
            }));
        } catch (error) {
            console.error('Error getting trips:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            const [rows] = await db.query(`
                SELECT
                    t.idT as id,
                    t.destination,
                    t.vehicle_id as vehicleId,
                    v.idV as vehicleId,
                    v.name as vehicleName,
                    v.type as vehicleType,
                    v.capacity as vehicleCapacity
                FROM trips t
                         LEFT JOIN vehicles v ON t.vehicle_id = v.idV
                WHERE t.idT = ?
            `, [id]);

            if (!rows[0]) return null;

            const row = rows[0];
            return {
                id: row.id.toString(), // Преобразуем в строку
                destination: row.destination,
                vehicleId: row.vehicleId ? row.vehicleId.toString() : null, // Преобразуем в строку
                vehicle: row.vehicleId ? {
                    id: row.vehicleId.toString(), // Преобразуем в строку
                    name: row.vehicleName,
                    type: row.vehicleType,
                    capacity: row.vehicleCapacity
                } : null
            };
        } catch (error) {
            console.error('Error getting trip by id:', error);
            throw error;
        }
    }

    async create(tripData) {
        try {
            const { destination, vehicleId } = tripData;

            const [result] = await db.query(
                'INSERT INTO trips (destination, vehicle_id) VALUES (?, ?)',
                [destination, parseInt(vehicleId)] // Преобразуем в число
            );

            // Получаем созданный рейс с полной информацией
            return await this.getById(result.insertId);
        } catch (error) {
            console.error('Error creating trip:', error);
            throw error;
        }
    }

    async update(id, updates) {
        try {
            const { destination, vehicleId } = updates;
            const updateFields = [];
            const values = [];

            if (destination !== undefined) {
                updateFields.push('destination = ?');
                values.push(destination);
            }

            if (vehicleId !== undefined) {
                updateFields.push('vehicle_id = ?');
                values.push(parseInt(vehicleId)); // Преобразуем в число
            }

            if (updateFields.length === 0) {
                return await this.getById(id);
            }

            values.push(parseInt(id)); // Преобразуем id в число

            await db.query(
                `UPDATE trips SET ${updateFields.join(', ')} WHERE idT = ?`,
                values
            );

            return await this.getById(id);
        } catch (error) {
            console.error('Error updating trip:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const [result] = await db.query('DELETE FROM trips WHERE idT = ?', [parseInt(id)]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting trip:', error);
            throw error;
        }
    }

    getDestinations() {
        return this.destinations;
    }
}

module.exports = new Trip();