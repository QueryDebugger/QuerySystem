import HashMap from "../utils/HashMap";
import Queue from "../utils/Queue";
import MiniQuery from "../entity/component/MiniQuery";
import RequirementsModuleComp from "../entity/component/RequirementsModuleComp";
import Pair from "../utils/Pair";
import VQFlowQuery from "../entity/component/VQFlowQuery";

export default class AnalyzeSql {
    constructor(analyzeDep) {
        this.analyzeDep = analyzeDep
    }

    getSql(title) {
        console.log("Get SQL for " + title)
        var comp = this.analyzeDep.iden2comp.get(title)
        // not expand tree
        var internalSql = null
        if (comp == null) {
            return ""
        }
        var description = "-- " + comp.identifier
        if (comp instanceof VQFlowQuery) {
            if (comp.description != null) description += ": " + comp.description
            internalSql = this.getSqlForVqflowQuery(comp)
        } else if (comp instanceof MiniQuery) {
            var description = "-- " + comp.identifier
            internalSql = this.getSqlForMQ(comp)
        } else {
            if (comp.description != null) description += ": " + comp.description
            internalSql = this.getSqlForRM(comp)
        }
        var externalSql = this.getExternalSql(comp.identifier, true)
        var notExpandSql = this.connectExternalInternalSql(description, externalSql, internalSql)

        // expand tree
        var externalSql = this.getExternalSql(comp.identifier)
        var expandSql = null
        if (externalSql != "") {
            var temp = this.analyzeDep.getExpandTreeOf(title)
            var internalSql = this.generateSql(temp['comps'], temp['ees'], null)
            expandSql = this.connectExternalInternalSql("-- As tree leaf\n" + description, externalSql, internalSql)
        }

        return { "noExpandSql": notExpandSql, "expandSql": expandSql }
    }

    connectExternalInternalSql(description, externalSql, internalSql) {
        var temp = externalSql.split("\n")
        if ((externalSql.length > 0 && temp[1].startsWith("WITH")) && internalSql.startsWith("WITH")) {
            // externalSql = externalSql.substring(0, externalSql.length - 1)
            internalSql = internalSql.substring(5, internalSql.length)
        } else if ((externalSql.length > 0 && temp[1].startsWith("WITH")) && !internalSql.startsWith("WITH")) {
            externalSql = externalSql.substring(0, externalSql.length - 1)
        }
        return description + "\n" + externalSql + "\n" + internalSql
    }

    getExternalSql(iden, onlyRef = false) {
        if (onlyRef) {
            var externalDeps = this.analyzeDep.getExternalDeps(iden, false)
            var blocks = new Set()
            for (const externalDep of externalDeps) {
                blocks.add(new Set([externalDep]))
            }
            var blocksOrder = this.analyzeOrder(blocks, false)
        } else {
            var externalRefDeps = this.analyzeDep.getExternalDeps(iden)
            var externalEdgeDeps = new Set(this.analyzeDep.getExpandTreeOf(iden)["comps"])
            if (externalEdgeDeps.size == 1) {
                return ""
            }
            var externalDeps = new Set()
            for (const x of externalRefDeps) { externalDeps.add(x) }
            for (const x of externalEdgeDeps) { externalDeps.add(x) }
            var blocks = new Set()
            for (const externalDep of externalDeps) {
                blocks.add(new Set([externalDep]))
            }
            var blocksOrder = this.analyzeOrder(blocks)
        }
        var stringBuilder = ""
        for (let i = 0; i < blocksOrder.length; i++) {
            const block = blocksOrder[i];
            var blockName = Array.from(block)[0]
            var temp = this.getSQLWOEdge(this.analyzeDep.iden2comp.get(blockName))
            stringBuilder += "-- Level: " + this.analyzeDep.iden2level.get(blockName) + "\n"
            if (i == 0) {
                stringBuilder += "WITH " + blockName + " AS (\n"
            } else {
                stringBuilder += blockName + " AS (\n"
            }
            stringBuilder += temp;
            stringBuilder += "),"
        }
        return stringBuilder
    }

    getSqlForVqflowQuery(vqflowQuery) {
        var sql = this.getSqlForRM(vqflowQuery)
        return sql
    }

    getSqlForMQ(miniQuery) {
        var stringBuilder = ""
        stringBuilder += "SELECT ";
        stringBuilder += miniQuery.columns + "\n";
        stringBuilder += "FROM ";
        stringBuilder += miniQuery.tableName + "\n";
        if (miniQuery.filter != null) {
            stringBuilder += "WHERE ";
            stringBuilder += miniQuery.filter + "\n";
        }
        if (miniQuery.grouping != null) {
            stringBuilder += "GROUP BY " + miniQuery.grouping + "\n";
        }
        if (miniQuery.having != null) {
            stringBuilder += "HAVING " + miniQuery.having + "\n";
        }
        if (miniQuery.order != null) {
            stringBuilder += " ORDER BY " + miniQuery.order + "\n";
        }
        if (miniQuery.limit != null) {
            stringBuilder += " LIMIT " + miniQuery.limit + "\n";
        }
        return stringBuilder.trim()
    }

    getSqlForRM(requirementsModule) {
        var stringBuilder = ""
        // partition to blocks: set of set
        var blocks = this.partitionToBlocks(requirementsModule)
        var blocksOrder = this.analyzeOrder(blocks)
        for (let i = 0; i < blocksOrder.length; i++) {
            const block = blocksOrder[i]
            if (block.size == 1) { // "without Edge"
                var blockName = Array.from(block)[0]
            }
            if (block.size > 1) { // "with edge"
                var temp = this.getSQLWEdge(requirementsModule, block)
            } else if (block.size == 1) { // "without Edge"
                var temp = this.getSQLWOEdge(this.analyzeDep.iden2comp.get(blockName))
            }

            if (i == blocksOrder.length - 1) {
                if (block.size != 1) {
                    blockName = requirementsModule.identifier + "_tree"
                }
                if (stringBuilder.length == 0) {
                    stringBuilder += "WITH " + blockName + " AS (\n"
                } else {
                    stringBuilder += blockName + " AS (\n"
                }
                stringBuilder += temp;
                stringBuilder += ")\n"
                stringBuilder += "SELECT * FROM " + blockName
                return stringBuilder
            }
            if (i == 0) {
                stringBuilder += "WITH " + blockName + " AS (\n"
            } else {
                stringBuilder += blockName + " AS (\n"
            }
            stringBuilder += temp;
            stringBuilder += "),\n"
        }
    }

    getSQLWOEdge(comp) {
        var res = ""
        if (comp instanceof MiniQuery) {
            res = this.getSqlForMQ(comp)
        } else {
            res = this.getSqlForRM(comp)
        }
        return res
    }


    getSQLWEdge(rm, block) {
        var blocks = this.toBlocks(rm, block)
        var block2deps = this.analyzeOrder(blocks)

        var comps = []
        var stringBuilder = ""
        if (block2deps.length > 0) {
            var stringBuilder = "WITH "
        } else {
            var stringBuilder = ""
        }
        for (let i = 0; i < block2deps.length; i++) {
            var block2dep = block2deps[i];
            var compIden = Array.from(block2dep)[0]
            var comp = this.analyzeDep.iden2comp.get(compIden)
            stringBuilder += comp.identifier + " AS (\n"
            if (comp instanceof MiniQuery) {
                comps.push(comp)
                stringBuilder += this.getSqlForMQ(comp);
            } else {
                comps.push(comp)
                stringBuilder += this.getSqlForRM(comp);
            }
            if (i == block2deps.length - 1) {
                stringBuilder += ")\n"
            } else {
                stringBuilder += "),\n"
            }
        }
        stringBuilder += this.generateSql(comps, rm.expandEdges, rm.unionEdge);
        return stringBuilder
    }

    toBlocks(requirementsModule, block) {
        var allSet = new Set()
        for (let i = 0; i < requirementsModule.mqs.length; i++) {
            var comp = requirementsModule.mqs[i]
            if (block.has(comp.identifier)) {
                allSet.add(new Set([comp.identifier]))
            }
        }
        for (let i = 0; i < requirementsModule.rms.length; i++) {
            var comp = requirementsModule.rms[i]
            if (block.has(comp.identifier)) {
                allSet.add(new Set([comp.identifier]))
            }
        }
        return allSet
    }

    analyzeOrder(blocks, containEdgeDeps = true) {
        var block2deps = []
        for (const block of blocks) {
            block2deps.push(new Pair(block, this.analyzeDep.getDepsOfBlock(block, containEdgeDeps)))
        }

        var res = []
        while (block2deps.length != 0) {
            for (let i = 0; i < block2deps.length; i++) {
                const block2dep = block2deps[i];
                var noDep = true
                for (let j = 0; j < block2deps.length; j++) {
                    const otherBlock2dep = block2deps[j];
                    if (i != j && block2dep.second.has(Array.from(otherBlock2dep.first)[0])) {
                        noDep = false
                    }
                }
                if (noDep) {
                    res.push(block2dep.first)
                    block2deps.splice(i, 1)
                    break
                }
            }
        }
        return res
    }

    partitionToBlocks(rm) {
        var allSet = new Set()
        for (let i = 0; i < rm.expandEdges.length; i++) {
            var expandEdge = rm.expandEdges[i];
            this.merge(allSet, expandEdge.start, expandEdge.end)
        }
        if (rm.unionEdge != null) {
            var comps = rm.unionEdge.comps;
            var temp = new Set()
            for (let i = 0; i < comps.length; i++) {
                temp.add(comps[i])
            }
            allSet.add(temp)
        }
        for (const mq of rm.mqs) {
            if (!this.inTree(allSet, mq.identifier)) {
                allSet.add(new Set([mq.identifier]))
            }
        }
        for (const x of rm.rms) {
            if (!this.inTree(allSet, x.identifier)) {
                allSet.add(new Set([x.identifier]))
            }
        }
        return allSet
    }

    inTree(allSet, identifier) {
        for (const set of allSet) {
            for (const element of set) {
                if (element === identifier) {
                    return true
                }
            }
        }
        return false
    }

    merge(allSet, ele1, ele2) {
        var setHasEle1 = null
        for (const set of allSet) {
            for (const element of set) {
                if (element === ele1) {
                    setHasEle1 = set
                }
            }
        }
        var setHasEle2 = null
        for (const set of allSet) {
            for (const element of set) {
                if (element === ele2) {
                    setHasEle2 = set
                }
            }
        }
        if (setHasEle1 == null && setHasEle2 == null) {
            var temp = new Set()
            temp.add(ele1)
            temp.add(ele2)
            allSet.add(temp)
        } else if (setHasEle1 == null && setHasEle2 != null) {
            setHasEle2.add(ele1)
        } else if (setHasEle1 != null && setHasEle2 == null) {
            setHasEle1.add(ele2)
        } else {
            for (const x of setHasEle2) {
                setHasEle1.add(x)
            }
            allSet.delete(setHasEle2)
        }
    }


    bfs(expandEdges) {
        var node2num = new HashMap();
        var node2edge = new HashMap();
        for (let i = 0; i < expandEdges.length; i++) {
            var expandEdge = expandEdges[i]
            node2num.put(expandEdge.start, node2num.getOrDefault(expandEdge.start, 0));
            node2num.put(expandEdge.end, node2num.getOrDefault(expandEdge.end, 0) + 1);
            if (node2edge.containsKey(expandEdge.start)) {
                node2edge.get(expandEdge.start).add(expandEdge);
            } else {
                var temp = new Set();
                temp.add(expandEdge);
                node2edge.put(expandEdge.start, temp);
            }
        }
        var head = null;

        // assume only one head
        for (const key of node2num.keySet()) {
            if (node2num.get(key) == 0) {
                head = key;
                break;
            }
        }

        var bfsRes = []
        var arrayDeque = new Queue()
        arrayDeque.add(head);
        while (!arrayDeque.isEmpty()) {
            var qSize = arrayDeque.size();
            for (let i = 0; i < qSize; i++) {
                var cur = arrayDeque.removeFirst();
                var targetEdges = node2edge.get(cur);
                if (targetEdges != null) {
                    for (const x of targetEdges) {
                        arrayDeque.add(x.end);
                        bfsRes.push(x);
                    }
                }
            }
        }
        return bfsRes;
    }

    constructFrom(bfsRes) {
        var stringBuilder = ""
        var head = bfsRes[0].start;
        stringBuilder += " " + head;
        for (let i = 0; i < bfsRes.length; i++) {
            let expandEdge = bfsRes[i];
            if (expandEdge.pairs.length == 0) {
                stringBuilder += " CROSS JOIN " + expandEdge.end;
                continue
            }

            stringBuilder += " LEFT JOIN " + expandEdge.end;
            for (let j = 0; j < expandEdge.pairs.length; j++) {
                var pair = expandEdge.pairs[j];
                if (j > 0) {
                    stringBuilder += " AND " + expandEdge.start + "." + pair.first + " = " + expandEdge.end + "." + pair.second;
                } else {
                    stringBuilder += " ON " + expandEdge.start + "." + pair.first + " = " + expandEdge.end + "." + pair.second;
                }
            }
        }
        return stringBuilder
    }

    constructWhere(bfsRes) {
        var stringBuilder = ""
        var isFirst = true
        for (let i = 0; i < bfsRes.length; i++) {
            var expandEdge = bfsRes[i]
            if (expandEdge.filter != null) {
                if (isFirst) {
                    stringBuilder += " " + expandEdge.filter;
                    isFirst = false
                } else {
                    stringBuilder += " AND " + expandEdge.filter;
                }
            }
        }
        return stringBuilder
    }


    generateSql(comps, expandEdges, unionEdge) {
        var stringBuilder = "";
        if (comps.length == 1) {
            return "SELECT * FROM " + comps[0].identifier
        }
        if (expandEdges.length != 0) {
            stringBuilder += "SELECT * FROM";
            var bfsRes = this.bfs(expandEdges);
            var from = this.constructFrom(bfsRes);
            stringBuilder += from;
            // var where = this.constructWhere(bfsRes);
            // if (where.length > 0) {
            //     stringBuilder += " WHERE";
            //     stringBuilder += where;
            // }
        } else if (unionEdge != null) { // union
            var comps = unionEdge.comps;
            stringBuilder += "TABLE " + comps[0];
            for (let i = 1; i < comps.length; i++) {
                stringBuilder += " UNION " + unionEdge.unionOption + " TABLE " + comps[i]
            }
        }
        return stringBuilder
    }
}

