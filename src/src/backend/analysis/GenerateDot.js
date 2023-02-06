import HashMap from "../utils/HashMap";
import RequirementsModuleComp from "../entity/component/RequirementsModuleComp";
import MiniQuery from "../entity/component/MiniQuery";
import escapeHtml from 'escape-html'
import VQFlowQuery from "../entity/component/VQFlowQuery";

export default class GenerateDot {
    constructor(analyzeDep) {
        this.analyzeDep = analyzeDep
        this.iden2Dots = new HashMap();
    }
    getUnionEdgeDot(unionEdge) {
        var stringBuilder = ""
        for (let i = 1; i < unionEdge.comps.length; i++) {
            var start = unionEdge.comps[i - 1];
            var end = unionEdge.comps[i];

            if (this.analyzeDep.iden2comp.get(start) instanceof RequirementsModuleComp) {
                var temp = this.getBottomFor(this.analyzeDep.iden2comp.get(start));
                stringBuilder += temp;
            } else {
                stringBuilder += start;
            }
            stringBuilder += " -> ";

            if (this.analyzeDep.iden2comp.get(end) instanceof RequirementsModuleComp) {
                var temp = this.analyzeDep.iden2comp.get(end).top;
                stringBuilder += temp;
            } else {
                stringBuilder += end;
            }
            stringBuilder += " [label=\"UNION " + unionEdge.unionOption + "\";";
            if (this.analyzeDep.iden2comp.get(start) instanceof RequirementsModuleComp) {
                stringBuilder += "ltail=" + start + ";";
            }
            if (this.analyzeDep.iden2comp.get(end) instanceof RequirementsModuleComp) {
                stringBuilder += "lhead=" + end + ";";
            }
            //            stringBuilder += "dir=none;");
            stringBuilder += "]\n";
        }
        return stringBuilder
    }

    getExpandEdgeDot(expandEdge) {
        var stringBuilder = ""
        if (this.analyzeDep.iden2comp.get(expandEdge.start) instanceof RequirementsModuleComp) {
            var requirementsModuleComp = this.analyzeDep.iden2comp.get(expandEdge.start);
            var temp = this.getBottomFor(requirementsModuleComp);
            stringBuilder += temp;
        } else {
            stringBuilder += expandEdge.start;
        }
        stringBuilder += " -> ";

        if (this.analyzeDep.iden2comp.get(expandEdge.end) instanceof RequirementsModuleComp) {
            var temp = this.analyzeDep.iden2comp.get(expandEdge.end).top;
            stringBuilder += temp;
        } else {
            stringBuilder += expandEdge.end;
        }
        stringBuilder += " [label=<"
        if (expandEdge.cardinality != null) {
            stringBuilder += escapeHtml(expandEdge.cardinality) + "<br/>";
        }
        for (let i = 0; i < expandEdge.pairs.length; i++) {
            var pair = expandEdge.pairs[i];
            if (pair.first === pair.second) {
                stringBuilder += escapeHtml(pair.first);
            } else {
                stringBuilder += escapeHtml(pair.first + "=" + pair.second);
            }
            if (i != expandEdge.pairs.length - 1) {
                stringBuilder += escapeHtml("; ");
            }
        }
        if (expandEdge.filter != null) {
            stringBuilder += "<br/><b>FILTER</b>: " + escapeHtml(expandEdge.filter) + ">;";
        } else {
            stringBuilder += ">;";
        }

        if (this.analyzeDep.iden2comp.get(expandEdge.start) instanceof RequirementsModuleComp) {
            stringBuilder += "ltail=" + expandEdge.start + ";";
        }
        if (this.analyzeDep.iden2comp.get(expandEdge.end) instanceof RequirementsModuleComp) {
            stringBuilder += "lhead=" + expandEdge.end + ";";
        }
        stringBuilder += "]\n";
        return stringBuilder
    }

    generateMqDot(mq) {
        var dot = mq.identifier + " [label = <\n" +
            "            <table border=\"1\"";
        if (this.analyzeDep.iden2comp.containsKey(mq.tableName)) {
            dot += " style=\"dashed\"";
        }
        dot += " cellborder=\"0\" cellspacing=\"1\">\n" +
            "            <tr><td align=\"left\"><i>" + escapeHtml(mq.identifier) + "</i></td></tr>\n" +
            "            <tr><td align=\"center\"><b><u>" + escapeHtml(mq.tableName);
        dot += "</u></b></td></tr>\n";
        if (mq.filter != null) dot += "            <tr><td align=\"center\">" + escapeHtml(mq.filter) + "</td></tr>\n";
        if (mq.grouping != null) dot += "<tr><td align=\"center\"><font color=\"indigo\"><b>GROUP BY </b></font>" + escapeHtml(mq.grouping) + "</td></tr>\n";
        if (mq.having != null) dot += "<tr><td align=\"center\"><font color=\"indigo\"><b>HAVING </b></font>" + escapeHtml(mq.having) + "</td></tr>\n";
        if (mq.columns != null) {
            var tempColumns = mq.columns.split("\n")
            for (const x of tempColumns) {
                dot += "<tr><td align=\"center\"><font color=\"#f94b2d\">" + escapeHtml(x.trim()) + "</font></td></tr>\n";
            }
        }
        if (mq.order != null) dot += "<tr><td align=\"center\"><font color=\"indigo\"><b>ORDER BY </b></font>" + escapeHtml(mq.order) + "</td></tr>\n";
        if (mq.limit != null) dot += "<tr><td align=\"center\"><font color=\"indigo\"><b>LIMIT </b></font>" + escapeHtml(mq.limit) + "</td></tr>\n";
        dot += "            </table>>;];";
        this.iden2Dots.put(mq.identifier, dot);
    }

    generateRmDot(rm) {
        var dot = "    subgraph " + rm.identifier + " {\n" +
            "        center=true;\n" +
            "        cluster=true;\n" +
            "        style =rounded;\n" +
            "        color = gray;\n" +
            "        margin = 12.0;\n" +
            "        bgcolor = \"#eeeeee\";\n" +
            "        label = <<I>" + escapeHtml(rm.identifier) + "</I>"
        if (rm.description != null) {
            dot += ": " + escapeHtml(rm.description.substring(1, rm.description.length - 1)) + ">;\n";
        } else {
            dot += ">;\n";
        }

        for (let i = 0; i < rm.mqs.length; i++) {
            dot += this.iden2Dots.get(rm.mqs[i].identifier);
        }
        for (let i = 0; i < rm.rms.length; i++) {
            dot += this.iden2Dots.get(rm.rms[i].identifier);
        }
        for (let i = 0; i < rm.expandEdges.length; i++) {
            var expandEdge = rm.expandEdges[i];
            var component = this.analyzeDep.iden2comp.get(expandEdge.start);
            if (component instanceof RequirementsModuleComp) {
                var rmTemp = component;
                rmTemp.eeSize++;
            }
        }
        for (let i = 0; i < rm.rms.length; i++) {
            this.initBottoms(rm.rms[i]);
        }
        for (let i = 0; i < rm.expandEdges.length; i++) {
            dot += this.getExpandEdgeDot(rm.expandEdges[i]);
        }
        if (rm.unionEdge != null) {
            dot += this.getUnionEdgeDot(rm.unionEdge);
        }

        dot += "        \n" +
            "    }\n" +
            "\n";
        this.iden2Dots.put(rm.identifier, dot);
    }

    generateVqfDot(vqf) {
        var head = "digraph D {\n" +
            "    fontsize=16;\n" +
            "    node [shape = plaintext; fontname = \"Arial\"; fontsize = \"16\";];\n" +
            "    edge [fontsize=\"16\"];\n" +
            "    compound=true;\n" +
            "    bgcolor=aliceblue;\n" +
            "\n" +
            "subgraph target {\n" +
            "    center = true;\n" +
            "        cluster = true;\n" +
            // "        style = rounded;\n" +
            "        color = gray;\n" +
            "        margin = 26.0;\n" +
            "        bgcolor = \"#eeeeee\";\n" +
            "        label = <<I>target</I>"
        if (vqf.description != null) {
            head += ": " + escapeHtml(vqf.description.substring(1, vqf.description.length - 1) + " ");
        }
        head += ">;\n";
        var tail = "}\n" +
            "}\n";

        var stringBuilder = ""
        stringBuilder += head;

        for (let i = 0; i < vqf.mqs.length; i++) {
            stringBuilder += this.iden2Dots.get(vqf.mqs[i].identifier);
        }
        for (let i = 0; i < vqf.rms.length; i++) {
            stringBuilder += this.iden2Dots.get(vqf.rms[i].identifier);
        }
        for (let i = 0; i < vqf.expandEdges.length; i++) {
            var expandEdge = vqf.expandEdges[i];
            var component = this.analyzeDep.iden2comp.get(expandEdge.start);
            if (component instanceof RequirementsModuleComp) {
                var rmTemp = component;
                rmTemp.eeSize++;
            }
        }
        for (let i = 0; i < vqf.rms.length; i++) {
            this.initBottoms(vqf.rms[i]);
        }
        for (let i = 0; i < vqf.expandEdges.length; i++) {
            stringBuilder += this.getExpandEdgeDot(vqf.expandEdges[i]);
        }

        if (vqf.unionEdge != null) {
            stringBuilder += this.getUnionEdgeDot(vqf.unionEdge);
        }
        stringBuilder += tail;
        this.iden2Dots.put("target", stringBuilder);
    }

    getDot(target) {
        var levels = []
        var curLevel = new Set();
        curLevel.add(target);
        levels.push(curLevel);
        while (curLevel.size > 0) {
            var nextLevel = this.getNextLevel(curLevel);
            levels.push(nextLevel);
            curLevel = nextLevel;
        }

        for (let i = levels.length - 1; i >= 0; i--) {
            var cur = levels[i];
            for (const key of cur) {
                if (this.analyzeDep.iden2comp.containsKey(key)) {
                    var component = this.analyzeDep.iden2comp.get(key);
                    if (component instanceof MiniQuery) {
                        this.generateMqDot(component);
                    }
                }
            }
            for (const key of cur) {
                if (this.analyzeDep.iden2comp.containsKey(key)) {
                    var component = this.analyzeDep.iden2comp.get(key);
                    if (component instanceof RequirementsModuleComp) {
                        var curRm = component;
                        var temp = this.calcTopBottom(curRm);
                        if (temp == null) {
                            return null;
                        }
                        this.generateRmDot(curRm);
                    }
                }
            }
            for (const key of cur) {
                if (this.analyzeDep.iden2comp.containsKey(key)) {
                    var component = this.analyzeDep.iden2comp.get(key);
                    if (component instanceof VQFlowQuery) {
                        this.generateVqfDot(component);
                    }
                }
            }
        }
        return this.iden2Dots.get("target");
    }


    getTop(start) {
        var startComp = this.analyzeDep.iden2comp.get(start);
        if (startComp instanceof MiniQuery) {
            return start;
        } else {
            return startComp.top;
        }
    }

    getBottom(end) {
        var endComp = this.analyzeDep.iden2comp.get(end);
        if (endComp instanceof MiniQuery) {
            var arrayList = []
            arrayList.push(end);
            return arrayList;
        } else {
            return endComp.bottoms;
        }
    }

    getLevels(comp) {
        var component = this.analyzeDep.iden2comp.get(comp);
        if (component instanceof MiniQuery) {
            return 1;
        } else {
            return component.level;
        }
    }

    calcTopBottom(curRm) {
        if (curRm.unionEdge != null) {
            for (const comp of curRm.unionEdge.comps) {
                if (this.analyzeDep.iden2comp.get(comp) == null) {
                    return null;
                }
            }
            var start = curRm.unionEdge.comps[0];
            curRm.top = this.getTop(start);
            var end = curRm.unionEdge.comps[curRm.unionEdge.comps.length - 1]
            curRm.bottoms = this.getBottom(end);
            var temp = 0;
            for (const comp of curRm.unionEdge.comps) {
                temp += this.getLevels(comp);
            }
            curRm.level = temp;
        } else {
            var expandEdges = curRm.expandEdges;
            var iden2levels = new HashMap();
            var root = this.getRoot(curRm);
            if (this.analyzeDep.iden2comp.get(root) == null) return null;
            curRm.top = this.getTop(root);
            iden2levels.put(root, this.getLevels(root));
            var curLevel = new Set();
            curLevel.add(root);
            while (curLevel.size > 0) {
                var nextLevel = new Set();
                for (const curIden of curLevel) {
                    for (let i = 0; i < expandEdges.length; i++) {
                        var expandEdge = expandEdges[i]
                        if (expandEdge.start === curIden) {
                            if (this.analyzeDep.iden2comp.get(expandEdge.end) == null) return null;
                            nextLevel.add(expandEdge.end);
                            iden2levels.put(expandEdge.end, this.getLevels(expandEdge.end) + iden2levels.get(expandEdge.start));
                        }
                    }
                }
                curLevel = nextLevel;
            }

            var maxV = -99999999
            var bottoms = new Set();
            for (const key of iden2levels.keySet()) {
                if (iden2levels.get(key) > maxV) {
                    maxV = iden2levels.get(key);
                    bottoms = new Set();
                    bottoms.add(key);
                }
                if (iden2levels.get(key) == maxV) {
                    bottoms.add(key);
                }
            }
            var curRmBottoms = []
            for (const x of bottoms) {
                for (const y of this.getBottom(x)) {
                    curRmBottoms.push(y);
                }
            }
            curRm.bottoms = curRmBottoms;
            curRm.level = maxV;
        }
        return "success"
    }

    getRoot(rm) {
        if (rm.mqs.length + rm.rms.length == 1) {
            if (rm.mqs.length == 1) return rm.mqs[0].identifier;
            if (rm.rms.length == 1) return rm.rms[0].identifier;
        }
        var expandEdges = rm.expandEdges;

        var froms = new Set();
        for (let i = 0; i < expandEdges.length; i++) {
            var expandEdge = expandEdges[i]
            froms.add(expandEdge.end);
        }
        for (let i = 0; i < expandEdges.length; i++) {
            var expandEdge = expandEdges[i]
            if (!froms.has(expandEdge.start)) {
                return expandEdge.start;
            }
        }
        if (rm.mqs.length > 0) {
            return rm.mqs[0].identifier
        }
        if (rm.rms.length > 0) {
            return rm.rms[0].identifier
        }
        return null;
    }

    getNextLevel(curLevel) {
        var nextLevel = new Set()
        for (let i = 0; i < this.analyzeDep.refDeps.length; i++) {
            var pair = this.analyzeDep.refDeps[i];
            if (curLevel.has(pair.first)) {
                nextLevel.add(pair.second);
            }
        }
        for (let i = 0; i < this.analyzeDep.edgeDeps.length; i++) {
            var pair = this.analyzeDep.edgeDeps[i];
            if (curLevel.has(pair.first)) {
                nextLevel.add(pair.second);
            }
        }
        return nextLevel;
    }

    getBottomFor(requirementsModule) {
        var res = requirementsModule.bottoms[requirementsModule.indexes[0]];
        requirementsModule.indexes.splice(0, 1)
        return res;
    }
    initBottoms(requirementsModule) {
        this.indexes = []
        if (requirementsModule.eeSize > 0) {
            var bSize = requirementsModule.bottoms.length;
            var left, right;
            if (requirementsModule.eeSize > bSize) {
                var shang = parseInt(requirementsModule.eeSize / bSize);
                while (shang > 0) {
                    for (let i = 0; i < bSize; i++) {
                        requirementsModule.indexes.push(i);
                    }
                    shang--;
                }
                requirementsModule.eeSize = requirementsModule.eeSize % bSize;
            }
            if (requirementsModule.eeSize % 2 == 0 && bSize % 2 == 0) {
                left = parseInt(bSize / 2) - 1;
                right = parseInt(bSize / 2);

            } else if (requirementsModule.eeSize % 2 == 0 && bSize % 2 == 1) {
                requirementsModule.indexes.push(parseInt(bSize / 2));
                left = parseInt(bSize / 2) - 1;
                right = parseInt(bSize / 2) + 1;
            } else if (requirementsModule.eeSize % 2 == 1 && bSize % 2 == 0) {
                left = parseInt(bSize / 2) - 1;
                right = parseInt(bSize / 2);
            } else { // if (eeSize % 2 == 1 && bSize % 2 == 1) {
                requirementsModule.indexes.push(parseInt(bSize / 2));
                left = parseInt(bSize / 2) - 1;
                right = parseInt(bSize / 2) + 1;
            }
            for (; right - left - 1 < requirementsModule.eeSize;) {
                requirementsModule.indexes.push(left);
                left--;
                if (right - left - 1 < requirementsModule.eeSize) {
                    requirementsModule.indexes.push(right);
                    right++;
                }
            }
            requirementsModule.indexes.sort()
        } else {
            requirementsModule.indexes.push(parseInt((requirementsModule.bottoms.length - 1) / 2));
        }
    }
}

// var generateDot = new GenerateDot()
// export default generateDot