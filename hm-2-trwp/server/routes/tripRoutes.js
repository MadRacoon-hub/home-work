const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const router = Router();
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Cargo = require('../models/Cargo');

// Получить все рейсы с деталями
router.get('/trips', async (req, res) => {
    try {
        const trips = await Trip.getAll();

        // Добавляем информацию о грузах для каждого рейса
        const tripsWithCargos = await Promise.all(trips.map(async (trip) => {
            const cargos = await Cargo.getByTripId(trip.id);
            const totalCargoSize = await Cargo.getTotalSizeInTrip(trip.id);

            // Если у рейса есть автомобиль, получаем его данные
            if (trip.vehicleId && !trip.vehicle) {
                const vehicle = await Vehicle.getById(trip.vehicleId);
                trip.vehicle = vehicle;
            }

            return {
                ...trip,
                cargos,
                totalCargoSize,
                availableSpace: trip.vehicle ? trip.vehicle.capacity - totalCargoSize : 0
            };
        }));

        res.status(200).json(tripsWithCargos);
    } catch (err) {
        console.error('Error in /trips route:', err);
        res.status(500).json({ message: err.message });
    }
});

// Получить пункты назначения
router.get('/trips/destinations', (req, res) => {
    try {
        const destinations = Trip.getDestinations();
        res.status(200).json(destinations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Создать новый рейс
router.post('/trips',
    body('destination').notEmpty().withMessage('Пункт назначения обязателен'),
    body('vehicleId').isInt().withMessage('ID автомобиля должен быть числом'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Проверяем существование автомобиля
            const vehicle = await Vehicle.getById(req.body.vehicleId);
            if (!vehicle) {
                return res.status(400).json({ message: 'Автомобиль не найден' });
            }

            const trip = await Trip.create(req.body);
            res.status(201).json(trip);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Обновить рейс
router.put('/trips/:id',
    body('destination').optional().notEmpty().withMessage('Пункт назначения не может быть пустым'),
    body('vehicleId').optional().isInt().withMessage('ID автомобиля должен быть числом'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const tripId = req.params.id;

            // Если меняется автомобиль, проверяем его существование
            if (req.body.vehicleId) {
                const vehicle = await Vehicle.getById(req.body.vehicleId);
                if (!vehicle) {
                    return res.status(400).json({ message: 'Автомобиль не найден' });
                }
            }

            const trip = await Trip.update(tripId, req.body);
            if (!trip) {
                return res.status(404).json({ message: 'Рейс не найден' });
            }

            res.status(200).json(trip);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Удалить рейс
router.delete('/trips/:id', async (req, res) => {
    try {
        const tripId = req.params.id;

        // Удаляем все грузы этого рейса
        await Cargo.deleteByTripId?.(tripId);

        const deleted = await Trip.delete(tripId);
        if (!deleted) {
            return res.status(404).json({ message: 'Рейс не найден' });
        }

        res.status(200).json({ message: 'Рейс удален' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;