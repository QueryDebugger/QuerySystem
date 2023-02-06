
export default class HashMap {
    constructor() {
        this.size = 0
        this.entry = new Object()
    }

    put(key, value) {
        if (!this.containsKey(key)) {
            this.size++;
        }
        this.entry[key] = value;
    }

    get(key) {
        return this.containsKey(key) ? this.entry[key] : null;
    }
    
    getOrDefault(key, defaultV) {
        return this.containsKey(key) ? this.entry[key] : defaultV;
    }

    remove(key) {
        if (this.containsKey(key) && (delete this.entry[key])) {
            this.size--;
        }
    }

    containsKey(key) {
        return (key in this.entry);
    }

    containsValue(value) {
        for (var prop in this.entry) {
            if (this.entry[prop] == value) {
                return true;
            }
        }
        return false;
    }

    values() {
        var values = new Array();
        for (var prop in this.entry) {
            values.push(this.entry[prop]);
        }
        return values;
    }

    keySet() {
        var keys = new Array();
        for (var prop in this.entry) {
            keys.push(prop);
        }
        return keys;
    }

    size() {
        return this.size;
    }

    clear() {
        this.size = 0;
        this.entry = new Object();
    }
}
