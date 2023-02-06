import antlr4 from 'antlr4';


export default class ErrHandler extends antlr4.error.ErrorListener {
    constructor() {
        super()
        this.error = null
    }

    syntaxError(recognizer, offendingSymbol, line, column, msg, e) {
        this.error = {"line": line, "msg": msg}
    }
}

