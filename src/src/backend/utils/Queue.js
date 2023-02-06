export default class Queue{
    constructor() {
        this.items = []
    }

    add(element) {
        this.items.push(element)
    }

    removeFirst() {
        return this.items.shift()
    }

    front() {
        return this.items[0]
    }

    isEmpty() {
        return this.items.length == 0;
    }

    size() {
        return this.items.length
    }

    toString() {
        let resultString = ''
        for (let i of this.items) {
            resultString += i + ' '
        }
        return resultString
    }
}