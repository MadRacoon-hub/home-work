const db = require('../config/db');

class Vehicle {
    async getAll() {
        try {
            const [rows] = await db.query(`
                SELECT idV as id, name, type, capacity
                FROM vehicles
                ORDER BY idV
            `);

            // Преобразуем ID в строки для единообразия
            return rows.map(vehicle => ({
                ...vehicle,
                id: vehicle.id.toString()
            }));
        } catch (error) {
            console.error('Error getting vehicles:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            // Преобразуем id в число, если пришла строка
            const vehicleId = typeof id === 'string' ? parseInt(id) : id;

            const [rows] = await db.query(`
        SELECT idV as id, name, type, capacity 
        FROM vehicles 
        WHERE idV = ?
      `, [vehicleId]);

            if (!rows[0]) return null;

            const vehicle = rows[0];
            return {
                ...vehicle,
                id: vehicle.id.toString() // Преобразуем в строку
            };
        } catch (error) {
            console.error('Error getting vehicle by id:', error);
            throw error;
        }
    }

    async getByTripId(tripId) {
        try {
            // Преобразуем tripId в число
            const tripIdNum = typeof tripId === 'string' ? parseInt(tripId) : tripId;

            const [rows] = await db.query(`
        SELECT v.idV as id, v.name, v.type, v.capacity
        FROM vehicles v
        JOIN trips t ON v.idV = t.vehicle_id
        WHERE t.idT = ?
      `, [tripIdNum]);

            if (!rows[0]) return null;

            const vehicle = rows[0];
            return {
                ...vehicle,
                id: vehicle.id.toString() // Преобразуем в строку
            };
        } catch (error) {
            console.error('Error getting vehicle by trip id:', error);
            throw error;
        }
    }
}

module.exports = new Vehicle();