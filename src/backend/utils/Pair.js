export default class Pair {
    constructor(first, second) {
        if (arguments.length == 2) {
            this.first = first;
            this.second = second;
        } else {
            this.first = undefined;
            this.second = undefined;
        }
    }
}