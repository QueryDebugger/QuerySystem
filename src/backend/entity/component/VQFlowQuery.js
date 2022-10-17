import UnionEdge from "../edge/UnionEdge";

export default class VQFlowQuery {
    constructor() {
        this.identifier = "target"
        this.description = null;
        this.rms = [];
        this.expandEdges = [];
        this.mqs = [];
        this.unionEdge = null
    }
}