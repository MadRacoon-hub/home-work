const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const router = Router();
const Cargo = require('../models/Cargo');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');

// Получить все грузы
router.get('/cargos', async (req, res) => {
    try {
        const cargos = await Cargo.getAll();
        res.status(200).json(cargos);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Создать новый груз
router.post('/cargos',
    body('name').notEmpty().withMessage('Название обязательно'),
    body('size').isInt({ min: 1 }).withMessage('Размер должен быть положительным числом'),
    body('tripId').isInt().withMessage('ID рейса должен быть числом'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { tripId, size } = req.body;

            // Проверяем существование рейса
            const trip = await Trip.getById(tripId);
            if (!trip) {
                return res.status(400).json({ message: 'Рейс не найден' });
            }

            // Проверяем вместимость
            const canAdd = await Cargo.canAddToTrip(tripId, size);
            if (!canAdd) {
                const availableSpace = await Cargo.getAvailableSpace(tripId);
                return res.status(400).json({
                    message: `Недостаточно места в автомобиле. Доступно: ${availableSpace} ячеек`
                });
            }

            const cargo = await Cargo.create(req.body);
            res.status(201).json(cargo);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Обновить груз (включая перенос в другой рейс)
router.put('/cargos/:id',
    body('name').optional().notEmpty().withMessage('Название не может быть пустым'),
    body('size').optional().isInt({ min: 1 }).withMessage('Размер должен быть положительным числом'),
    body('tripId').optional().isInt().withMessage('ID рейса должен быть числом'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const cargoId = req.params.id;
            const currentCargo = await Cargo.getById(cargoId);
            if (!currentCargo) {
                return res.status(404).json({ message: 'Груз не найден' });
            }

            const { tripId: newTripId, size: newSize } = req.body;
            const currentTripId = currentCargo.tripId;

            // Если меняется рейс - проверяем логику переноса
            if (newTripId && newTripId !== currentTripId) {
                // 1. Проверяем существование нового рейса
                const newTrip = await Trip.getById(newTripId);
                if (!newTrip) {
                    return res.status(400).json({ message: 'Новый рейс не найден' });
                }

                // 2. Проверяем совпадение пунктов назначения
                const currentTrip = await Trip.getById(currentTripId);
                if (!currentTrip) {
                    return res.status(400).json({ message: 'Текущий рейс не найден' });
                }

                if (newTrip.destination !== currentTrip.destination) {
                    return res.status(400).json({
                        message: `Нельзя перенести груз в рейс с другим пунктом назначения. Текущий: ${currentTrip.destination}, Новый: ${newTrip.destination}`
                    });
                }

                // 3. Проверяем вместимость в новом рейсе
                const cargoSize = newSize || currentCargo.size;
                const canAdd = await Cargo.canAddToTrip(newTripId, cargoSize);
                if (!canAdd) {
                    const availableSpace = await Cargo.getAvailableSpace(newTripId);
                    return res.status(400).json({
                        message: `Недостаточно места в новом автомобиле. Доступно: ${availableSpace} ячеек`
                    });
                }
            }

            // Если меняется размер груза - проверяем вместимость в текущем рейсе
            if (newSize && newSize !== currentCargo.size) {
                const cargoSize = newSize;
                const canAdd = await Cargo.canAddToTrip(currentTripId, cargoSize - currentCargo.size);
                if (!canAdd) {
                    const availableSpace = await Cargo.getAvailableSpace(currentTripId);
                    return res.status(400).json({
                        message: `Новый размер превышает доступное место. Доступно: ${availableSpace} ячеек`
                    });
                }
            }

            const updatedCargo = await Cargo.update(cargoId, req.body);
            res.status(200).json(updatedCargo);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Удалить груз
router.delete('/cargos/:id', async (req, res) => {
    try {
        const deleted = await Cargo.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Груз не найден' });
        }
        res.status(200).json({ message: 'Груз удален' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;