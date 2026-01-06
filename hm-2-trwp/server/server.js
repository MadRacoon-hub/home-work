const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 5555;

// Определяем абсолютный путь к корневой папке проекта
const projectRoot = path.join(__dirname, '..');

// Раздача статических файлов
app.use(express.static(path.join(projectRoot, 'public')));
app.use('/src', express.static(path.join(projectRoot, 'src')));

// CORS middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Парсинг JSON
app.use(express.json());

// Логирование
app.use(function(req, res, next) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
});

// Подключаем роуты
app.use('/api/v1', require('./routes/vehicleRoutes'));
app.use('/api/v1', require('./routes/tripRoutes'));
app.use('/api/v1', require('./routes/cargoRoutes'));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'public', 'index.html'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ message: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(port, async () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});