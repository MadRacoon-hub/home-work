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
            console.log('Добавление груза в рейс:', tripId, 'Размер:', size);

            // Проверяем существование рейса
            const trip = await Trip.getById(tripId);
            if (!trip) {
                return res.status(400).json({ message: 'Рейс не найден' });
            }

            // Проверяем вместимость (не исключаем никакой груз)
            const canAdd = await Cargo.canAddToTrip(tripId, size);
            console.log('Можно добавить?', canAdd);

            if (!canAdd) {
                const availableSpace = await Cargo.getAvailableSpace(tripId);
                return res.status(400).json({
                    message: `Недостаточно места в автомобиле. Доступно: ${availableSpace} ячеек`
                });
            }

            const cargo = await Cargo.create(req.body);
            res.status(201).json(cargo);
        } catch (err) {
            console.error('Error in POST /cargos:', err);
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
            console.log('Перенос груса. ID:', req.params.id, 'Данные:', req.body);

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
                console.log('Меняем рейс. С:', currentTripId, 'На:', newTripId);

                // 1. Проверяем существование нового рейса
                const newTrip = await Trip.getById(newTripId);
                if (!newTrip) {
                    console.log('Новый рейс не найден:', newTripId);
                    return res.status(400).json({ message: 'Новый рейс не найден' });
                }

                // 2. Проверяем совпадение пунктов назначения
                const currentTrip = await Trip.getById(currentTripId);
                if (!currentTrip) {
                    console.log('Текущий рейс не найден:', currentTripId);
                    return res.status(400).json({ message: 'Текущий рейс не найден' });
                }

                console.log('Пункты назначения. Текущий:', currentTrip.destination, 'Новый:', newTrip.destination);

                if (newTrip.destination !== currentTrip.destination) {
                    return res.status(400).json({
                        message: `Нельзя перенести груз в рейс с другим пунктом назначения. Текущий: ${currentTrip.destination}, Новый: ${newTrip.destination}`
                    });
                }

                // 3. Проверяем вместимость в новом рейсе (исключаем текущий груз)
                const cargoSize = newSize || currentCargo.size;
                const canAdd = await Cargo.canAddToTrip(newTripId, cargoSize);
                console.log('Проверка вместимости в новом рейсе. Размер:', cargoSize, 'Можно добавить:', canAdd);

                if (!canAdd) {
                    const availableSpace = await Cargo.getAvailableSpace(newTripId);
                    return res.status(400).json({
                        message: `Недостаточно места в новом автомобиле. Доступно: ${availableSpace} ячеек`
                    });
                }
            }

            // Если меняется размер груза - проверяем вместимость в текущем рейсе
            // При этом исключаем текущий груз из расчета
            if (newSize && newSize !== currentCargo.size) {
                console.log('Меняем размер груза с', currentCargo.size, 'на', newSize);
                const cargoSize = newSize;

                // Проверяем с учетом исключения текущего груза
                const canAdd = await Cargo.canAddToTrip(currentTripId, cargoSize, cargoId);
                console.log('Проверка изменения размера. Можно изменить?', canAdd);

                if (!canAdd) {
                    const availableSpace = await Cargo.getAvailableSpace(currentTripId, cargoId);
                    return res.status(400).json({
                        message: `Новый размер превышает доступное место. Доступно: ${availableSpace} ячеек`
                    });
                }
            }

            const updatedCargo = await Cargo.update(cargoId, req.body);
            console.log('Груз обновлен:', updatedCargo);
            res.status(200).json(updatedCargo);
        } catch (err) {
            console.error('Ошибка в PUT /cargos/:id:', err);
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