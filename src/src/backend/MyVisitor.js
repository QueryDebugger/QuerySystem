import VQFlowParserVisitor from './parser/VQFlowParserVisitor';
import VQFlowQuery from './entity/component/VQFlowQuery';
import MiniQuery from './entity/component/MiniQuery';
import UnionEdge from './entity/edge/UnionEdge';
import ExpandEdge from './entity/edge/ExpandEdge';
import Pair from './utils/Pair';
import RequirementModuleComp from './entity/component/RequirementsModuleComp';
import myParser from './Parser';

export default class Visitor extends VQFlowParserVisitor {
    visitTarget(ctx) {
        try {
            var vqfQueryContext = ctx.query();
            if (vqfQueryContext == null) return;
            var vqFlowQuery = this.visitMyQuery(vqfQueryContext);
            myParser.vqFlowQuery = vqFlowQuery;
        } catch (err) {
            console.log("Parse error: " + err)
        }
    }

    visitMyQuery(ctx) {
        var vqFlowQuery = new VQFlowQuery();
        vqFlowQuery.identifier = "target"
        if (ctx.description() != null) {
            vqFlowQuery.description = ctx.description().DOUBLE_QUOTED_TEXT().getText()
        }
        var queryBody = ctx.queryBody();
        var tables = queryBody.table();
        if (tables != null) {
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                var rmContext = table.requirementsModule()
                var mqContext = table.miniQuery()
                if (rmContext != null) {
                    var rm = this.visitMyRequirementModule(rmContext)
                    vqFlowQuery.rms.push(rm)
                }
                if (mqContext != null) {
                    var miniQuery = this.visitMyMiniQuery(mqContext)
                    vqFlowQuery.mqs.push(miniQuery)
                }
            }
        }
        var expandQuery = queryBody.expandQuery();
        if (expandQuery != null) {
            var tables = expandQuery.table()
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                var rmContext = table.requirementsModule()
                var mqContext = table.miniQuery()
                if (rmContext != null) {
                    var rm = this.visitMyRequirementModule(rmContext)
                    vqFlowQuery.rms.push(rm)
                }
                if (mqContext != null) {
                    var miniQuery = this.visitMyMiniQuery(mqContext)
                    vqFlowQuery.mqs.push(miniQuery)
                }
            }
            var expandEdges = expandQuery.expandEdge()
            for (let i = 0; i < expandEdges.length; i++) {
                var eeContext = expandEdges[i];
                var expandEdge = this.visitMyExpandEdge(eeContext);
                vqFlowQuery.expandEdges.push(expandEdge);
            }

        }
        var unionQuery = queryBody.unionQuery();
        if (unionQuery != null) {
            var tables = expandQuery.table()
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                var rmContext = table.requirementsModule()
                var mqContext = table.miniQuery()
                if (rmContext != null) {
                    var rm = this.visitMyRequirementModule(rmContext)
                    vqFlowQuery.rms.push(rm)
                }
                if (mqContext != null) {
                    var miniQuery = this.visitMyMiniQuery(mqContext)
                    vqFlowQuery.mqs.push(miniQuery)
                }
            }
            var unionEdgeContext = unionQuery.unionEdge()
            vqFlowQuery.unionEdge = this.visitMyUnionEdge(unionEdgeContext)
        }
        return vqFlowQuery;
    }

    visitMyRequirementModule(ctx) {
        var vqFlowQuery = new RequirementModuleComp()
        vqFlowQuery.identifier = this.getOriginalText(ctx.identifier()) 
        if (ctx.description() != null) {
            vqFlowQuery.description = ctx.description().DOUBLE_QUOTED_TEXT().getText()
        }
        var queryBody = ctx.queryBody();
        var tables = queryBody.table();
        if (tables != null) {
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                var rmContext = table.requirementsModule()
                var mqContext = table.miniQuery()
                if (rmContext != null) {
                    var rm = this.visitMyRequirementModule(rmContext)
                    vqFlowQuery.rms.push(rm)
                }
                if (mqContext != null) {
                    var miniQuery = this.visitMyMiniQuery(mqContext)
                    vqFlowQuery.mqs.push(miniQuery)
                }
            }
        }
        var expandQuery = queryBody.expandQuery();
        if (expandQuery != null) {
            var tables = expandQuery.table()
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                var rmContext = table.requirementsModule()
                var mqContext = table.miniQuery()
                if (rmContext != null) {
                    var rm = this.visitMyRequirementModule(rmContext)
                    vqFlowQuery.rms.push(rm)
                }
                if (mqContext != null) {
                    var miniQuery = this.visitMyMiniQuery(mqContext)
                    vqFlowQuery.mqs.push(miniQuery)
                }
            }
            var expandEdges = expandQuery.expandEdge()
            for (let i = 0; i < expandEdges.length; i++) {
                var eeContext = expandEdges[i];
                var expandEdge = this.visitMyExpandEdge(eeContext);
                vqFlowQuery.expandEdges.push(expandEdge);
            }

        }
        var unionQuery = queryBody.unionQuery();
        if (unionQuery != null) {
            var tables = unionQuery.table()
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                var rmContext = table.requirementsModule()
                var mqContext = table.miniQuery()
                if (rmContext != null) {
                    var rm = this.visitMyRequirementModule(rmContext)
                    vqFlowQuery.rms.push(rm)
                }
                if (mqContext != null) {
                    var miniQuery = this.visitMyMiniQuery(mqContext)
                    vqFlowQuery.mqs.push(miniQuery)
                }
            }
            var unionEdgeContext = unionQuery.unionEdge()
            vqFlowQuery.unionEdge = this.visitMyUnionEdge(unionEdgeContext)
        } 
        return vqFlowQuery;
    }

    visitMyMiniQuery(ctx) {
        var miniQuery = new MiniQuery();
        miniQuery.identifier = this.getOriginalText(ctx.identifier());
        var tableReferenceContext = ctx.singleTableRef().tableRef();
        miniQuery.tableName = this.getOriginalText(tableReferenceContext);
        var expr = ctx.filterExpr();
        if (expr != null) {
            miniQuery.filter = this.getOriginalText(expr.expr());
        }

        var groupByClauseContext = ctx.groupByClause();
        if (groupByClauseContext != null) {
            var orderList = this.getOriginalText(groupByClauseContext.orderList());
            var olapOptionContext = groupByClauseContext.olapOption();
            if (olapOptionContext != null) {
                orderList += this.getOriginalText(olapOptionContext);
            }
            miniQuery.grouping = orderList
        }

        var havingClauseContext = ctx.havingClause();
        if (havingClauseContext != null) {
            miniQuery.having = this.getOriginalText(havingClauseContext.expr());
        }

        var selectItemListContexts = ctx.selectClause().selectItemList();
        if (selectItemListContexts != null) {
            miniQuery.columns = this.getOriginalText(selectItemListContexts)
        }

        var orderClauseContext = ctx.orderClause();
        if (orderClauseContext != null) {
            miniQuery.order = this.getOriginalText(ctx.orderClause().orderList())
        }
        var limitClauseContext = ctx.limitClause();
        if (limitClauseContext != null) {
            miniQuery.limit = this.getOriginalText(ctx.limitClause().limitOptions());
        }
        return miniQuery;
    }

    visitMyExpandEdge(ctx) {
        var expandEdge = new ExpandEdge();
        var identifiers = ctx.identifier();
        expandEdge.start = this.getOriginalText(identifiers[0]);
        expandEdge.end = this.getOriginalText(identifiers[1]);

        var eeBodyContext = ctx.expandEdgeBody();
        var columnToMatchContexts = eeBodyContext.columnsToMatch()
        if (columnToMatchContexts != null) {
            var ctms = columnToMatchContexts.columnToMatch()
            for (let j = 0; j < ctms.length; j++) {
                var columnsPairOrSingle = ctms[j].identifier();
                var pair = new Pair()
                pair.first = this.getOriginalText(columnsPairOrSingle[0])
                pair.second = this.getOriginalText(columnsPairOrSingle[1]);
                expandEdge.pairs.push(pair);
            }
        }

        if (eeBodyContext.cardinality() != null) {
            expandEdge.cardinality = this.getOriginalText(eeBodyContext.cardinality());
        }
        return expandEdge;
    }

    visitMyUnionEdge(ctx) {
        if (ctx != null) {
            var unionEdge = new UnionEdge();
            unionEdge.unionOption = this.getOriginalText(ctx.unionOption())
            var identifiers = ctx.identifier();
            for (let i = 0; i < identifiers.length; i++) {
                var identifierContext = identifiers[i];
                unionEdge.comps.push(this.getOriginalText(identifierContext));
            }
            return unionEdge
        }
        return null
    }

    getOriginalText(ctx) {
        return ctx.start.getInputStream().getText(ctx.start.start, ctx.stop.stop)
    }
}