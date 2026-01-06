const { Router } = require('express');
const router = Router();
const Vehicle = require('../models/Vehicle');

// Получить все автомобили
router.get('/vehicles', async (req, res) => {
    try {
        const vehicles = await Vehicle.getAll();
        res.status(200).json(vehicles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Получить автомобиль по ID
router.get('/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.getById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Автомобиль не найден' });
        }
        res.status(200).json(vehicle);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;