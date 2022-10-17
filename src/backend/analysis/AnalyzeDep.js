import Pair from "../utils/Pair";
import HashMap from "../utils/HashMap";
import VQFlowQuery from "../entity/component/VQFlowQuery";
import RequirementsModuleComp from "../entity/component/RequirementsModuleComp";

export default class AnalyzeDep {
    constructor() {
        this.refDeps = [];
        this.edgeDeps = [];
        this.iden2comp = new HashMap();
        this.iden2level = new HashMap();
    }

    analyzeMiniQuery(mq, level) {
        this.iden2comp.put(mq.identifier, mq);
        this.iden2level.put(mq.identifier, level);
        var pair = new Pair(mq.identifier, mq.tableName)
        this.refDeps.push(pair);
    }

    analyzeRequirementsModule(rm, level) {
        this.iden2comp.put(rm.identifier, rm);
        this.iden2level.put(rm.identifier, level)
        for (let i = 0; i < rm.mqs.length; i++) {
            this.refDeps.push(new Pair(rm.identifier, rm.mqs[i].identifier));
            this.analyzeMiniQuery(rm.mqs[i], level + 1);
        }
        for (let i = 0; i < rm.rms.length; i++) {
            this.refDeps.push(new Pair(rm.identifier, rm.rms[i].identifier));
            this.analyzeRequirementsModule(rm.rms[i], level + 1);
        }
        for (let i = 0; i < rm.expandEdges.length; i++) {
            this.edgeDeps.push(rm.expandEdges[i])
        }
        if (rm.unionEdge != null) {
            var comps = rm.unionEdge.comps;
            for (let i = 0; i < comps.length; i++) {
                this.refDeps.push(new Pair(rm.identifier, comps[i]));
            }
        }
    }

    analyzeVqflowQuery(vqflowQuery) {
        this.analyzeRequirementsModule(vqflowQuery, 0)
    }
    // todo
    checkCircularDependency() {
        for (const iden of this.iden2comp.keySet()) {
            var deps = this.getDeps(iden)
            if (deps["error"] != null) {
                return { "error": deps["error"] }
            }
        }
        return "";
    }

    getDeps(target, containEdgeDeps = true) {
        var res = new Set()
        var curLevel = new Set();
        curLevel.add(target);
        var nodeIns = new HashMap()
        while (curLevel.size > 0) {
            var nextLevel = new Set()
            for (let i = 0; i < this.refDeps.length; i++) {
                var pair = this.refDeps[i];
                if (curLevel.has(pair.first)) {
                    res.add(pair.second)
                    nextLevel.add(pair.second);
                }
            }
            if (containEdgeDeps) {
                for (let i = 0; i < this.edgeDeps.length; i++) {
                    var pair = this.edgeDeps[i];
                    if (curLevel.has(pair.end)) {
                        res.add(pair.start)
                        nextLevel.add(pair.start);
                    }
                }
            }
            for (const node of nextLevel) {
                if (nodeIns.containsKey(node)) {
                    nodeIns.put(node, nodeIns.get(node) + 1)
                } else {
                    nodeIns.put(node, 1)
                }
                if (nodeIns.get(node) > this.refDeps.length + this.edgeDeps.length) {
                    return { "error": node }
                }
            }
            curLevel = nextLevel
        }
        return res
    }

    getExternalDeps(iden, containEdgeDeps = true) {
        var res = new Set()
        var deps = this.getDeps(iden, false)
        
        if (deps["error"] != null) {
            return { "error": deps["error"] }
        }
        if (containEdgeDeps) {
            var temp = this.getExpandTreeOf(iden)["comps"]
            for (const x of temp) {
                deps.add(x)
            }
        }
        var curLevel = this.iden2level.get(iden)
        for (const possibleDep of this.iden2level.keySet()) {
            if (deps.has(possibleDep) && (this.iden2level.get(possibleDep) < curLevel || (
                this.iden2level.get(possibleDep) == curLevel && this.belongToSameRM(iden, possibleDep)
            ))) {
                res.add(possibleDep)
            }
        }
        return res
    }

    belongToSameRM(iden1, iden2) {
        for (const x of this.iden2comp.keySet()) {
            var comp = this.iden2comp.get(x)
            if (comp instanceof RequirementsModuleComp || comp instanceof VQFlowQuery) {
                var tempSet = new Set()
                for (const xx of comp.mqs) { tempSet.add(xx.identifier) }
                for (const xx of comp.rms) { tempSet.add(xx.identifier) }
                if (tempSet.has(iden1) && tempSet.has(iden2)) {
                    return true
                }
            }
        }
        return false
    }

    getExpandTreeOf(iden) {
        var expandEdges = []
        var comps = []
        var newSet = new Set([iden])
        comps.push(iden)
        do {
            var curSet = newSet
            newSet = new Set()
            for (const expandEdge of this.edgeDeps) {
                if (curSet.has(expandEdge.end)) {
                    expandEdges.push(expandEdge)
                    comps.push(expandEdge.start)
                    newSet.add(expandEdge.start)
                }
            }
        } while (newSet.size != 0)
        return { "ees": expandEdges, "comps": comps }
    }
    // block is a set containing identifiers
    getDepsOfBlock(block, containEdgeDeps = true) {
        if (block.size == 1) {
            var deps = this.getDeps(Array.from(block)[0], containEdgeDeps)
            if (deps["error"] != null) {
                return { "error": deps["error"] }
            }
            return deps
        } else {
            var deps = new Set()
            for (const x of block) {
                var temp = this.getDeps(x, containEdgeDeps)
                if (temp["error"] != null) {
                    return { "error": temp["error"] }
                }
                for (const xx of temp) {
                    deps.add(xx)
                }
            }
            return deps
        }
    }
}
