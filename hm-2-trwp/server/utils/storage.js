const fs = require('fs');
const path = require('path');

class Storage {
    constructor(filename) {
        this.filename = path.join(__dirname, '..', 'data', filename);
        this.ensureDirectoryExists();
        this.data = this.load();
    }

    ensureDirectoryExists() {
        const dir = path.dirname(this.filename);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    load() {
        try {
            if (fs.existsSync(this.filename)) {
                const content = fs.readFileSync(this.filename, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.error(`Error loading ${this.filename}:`, error.message);
        }
        return [];
    }

    save() {
        try {
            fs.writeFileSync(this.filename, JSON.stringify(this.data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error saving ${this.filename}:`, error.message);
            return false;
        }
    }

    getAll() {
        return [...this.data];
    }

    getById(id) {
        return this.data.find(item => item.id === id);
    }

    create(item) {
        this.data.push(item);
        this.save();
        return item;
    }

    update(id, updates) {
        const index = this.data.findIndex(item => item.id === id);
        if (index === -1) return null;

        this.data[index] = { ...this.data[index], ...updates };
        this.save();
        return this.data[index];
    }

    delete(id) {
        const index = this.data.findIndex(item => item.id === id);
        if (index === -1) return false;

        this.data.splice(index, 1);
        this.save();
        return true;
    }

    clear() {
        this.data = [];
        this.save();
    }
}

module.exports = Storage;