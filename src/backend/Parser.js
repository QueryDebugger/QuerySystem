import antlr4 from 'antlr4';
import VQFlowLexer from './parser/VQFlowLexer';
import VQFlowParser from './parser/VQFlowParser';
import MyVisitor from './MyVisitor'
import ErrHandler from './ErrHandler';
import AnalyzeDep from './analysis/AnalyzeDep';
import GenerateDot from './analysis/GenerateDot';

class MyParser {
    constructor() {
        this.targetDotCode = null;
        this.vqFlowQuery = null;
        this.analyzeDep = null;
    }
    parse(vqfCode) {
        this.targetDotCode = null;
        this.vqFlowQuery = null;
        this.analyzeDep = null;

        let inputStream = new antlr4.InputStream(vqfCode);
        let lexer = new VQFlowLexer(inputStream);
        let tokenStream = new antlr4.CommonTokenStream(lexer);
        let parser = new VQFlowParser(tokenStream);
        parser.removeErrorListeners()

        var myErrorHandler = new ErrHandler()
        parser.addErrorListener(myErrorHandler)
        let tree = parser.target()
        tree.accept(new MyVisitor());

        if (myParser.vqFlowQuery != null) { // parse success
            var analyzeDep = new AnalyzeDep()
            analyzeDep.analyzeVqflowQuery(myParser.vqFlowQuery)
            var temp = analyzeDep.checkCircularDependency()
            if (temp.length != 0) {
                return { "targetDotCode": null, "error": {"line": this.getLine(vqfCode, temp["error"]), "msg": "There are cyclic dependencies around " + temp["error"] + "."}}
            }

            this.analyzeDep = analyzeDep;
            var generateDot = new GenerateDot(analyzeDep)
            this.targetDotCode = generateDot.getDot("target")
            return { "targetDotCode": this.targetDotCode, "error": myErrorHandler.error }
        } else {
            return { "targetDotCode": null, "error": myErrorHandler.error }
        }
    }
    getLine(code, searchValue) {
        var lines = code.split("\n")
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.indexOf(searchValue) != -1) {
                return i + 1
            }
        }
        return 1
    }
}

var myParser = new MyParser()
export default myParser