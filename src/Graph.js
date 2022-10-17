import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Fade from '@material-ui/core/Fade';
import CircularProgress from '@material-ui/core/CircularProgress';
import { select as d3_select } from 'd3-selection';
import { selectAll as d3_selectAll } from 'd3-selection';
import { transition as d3_transition } from 'd3-transition';
import { zoomIdentity as d3_zoomIdentity } from 'd3-zoom';
import { zoomTransform as d3_zoomTransform } from 'd3-zoom';
import { pointer as d3_pointer } from 'd3-selection';
import 'd3-graphviz';
import { wasmFolder } from "@hpcc-js/wasm";

const styles = {
  root: {
    flexGrow: 1,
  },
  flex: {
    flexGrow: 1,
  },
  progress: {
    position: 'absolute',
    top: 'calc(64px + 2 * 12px + 2px)',
    left: 'calc(100vw - 2 * 12px - 2 * 12px)',
  },
};

class Graph extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      busy: false,
    };
    this.svg = d3_select(null);
    this.createGraph = this.createGraph.bind(this)
    this.renderGraph = this.renderGraph.bind(this)
    this.isDrawingEdge = false;
    this.isDrawingNode = false;
    this.startNode = null;
    this.selectedComponents = d3_selectAll(null);
    this.selectArea = null;
    this.selectRects = d3_select(null);
    this.latestNodeAttributes = {
    }
    this.latestEdgeAttributes = {
    }
    this.latestInsertedNodeShape = null;
    this.drawnNodeName = null;
    this.nodeIndex = null;
    this.edgeIndex = null;
    this.pendingUpdate = false;
    this.rendering = false;
    this.prevFit = null;
    this.prevEngine = null;
    this.prevDotSrc = '';
  }

  componentDidMount() {
    this.createGraph()
  }

  componentDidUpdate() {
    this.renderGraph()
  }

  handleError(errorMessage) {
    let line = errorMessage.replace(/.*error in line ([0-9]*) .*\n/, '$1');
    this.props.onError({ message: errorMessage, line: line });
    this.rendering = false;
    this.setState({ busy: false });
    if (this.pendingUpdate) {
      this.pendingUpdate = false;
      this.render();
    }
  }

  getSvg = () => {
    return this.svg.node();
  }

  createGraph() {
    wasmFolder(process.env.PUBLIC_URL.replace(/\.$/, '') + '@hpcc-js/wasm/dist');
    this.graphviz = this.div.graphviz()
      .onerror(this.handleError.bind(this))
      .on('initEnd', () => this.renderGraph.call(this));
    this.props.registerZoomInButtonClick(this.handleZoomInButtonClick);
    this.props.registerZoomOutButtonClick(this.handleZoomOutButtonClick);
    this.props.registerZoomOutMapButtonClick(this.handleZoomOutMapButtonClick);
    this.props.registerGetSvg(this.getSvg);
  }

  renderGraph() {
    let width = this.div.node().parentElement.clientWidth;
    let height = this.div.node().parentElement.clientHeight;
    let fit = this.props.fit;
    let engine = this.props.engine;
    if (this.props.dotSrc.length === 0) {
      this.svg.remove();
      this.svg = d3_select(null);
      this.props.onError(null);
      this.renderGraphReady = false;
      return;
    }
    if (this.props.dotSrc === this.prevDotSrc && this.props.engine === this.prevEngine && this.props.fit === this.prevFit) {
      return;
    }
    if (this.rendering) {
      this.pendingUpdate = true;
      return;
    }
    if (this.props.fit !== this.prevFit) {
      if (this.renderGraphReady) {
        if (this.prevFit) {
          this.unFitGraph();
          this.setZoomScale(1, true);
        } else {
          this.setZoomScale(1, false, true);
          this.fitGraph();
        }
      }
      this.prevFit = this.props.fit;
    }
    this.prevDotSrc = this.props.dotSrc;
    this.prevEngine = this.props.engine;
    this.rendering = true;
    this.setState({ busy: true });
    this.graphviz
      .width(width)
      .height(height - 4)
      .engine(engine)
      .fit(fit)
      .tweenPaths(this.props.tweenPaths)
      .tweenShapes(this.props.tweenShapes)
      .tweenPrecision(this.props.tweenPrecision)
      .dot(this.props.dotSrc, this.handleDotLayoutReady.bind(this))
      .on('renderEnd', this.handleRenderStaged.bind(this))
      .render(this.handleRenderGraphReady.bind(this));
  }

  handleDotLayoutReady() {
    let [, , width, height] = this.graphviz.data().attributes.viewBox.split(' ');
    this.originalViewBox = { width, height };
  }

  handleRenderStaged() {
    if (this.renderGraphReady) {
      this.markSelectedComponents(this.selectedComponents);
    }
  }

  handleRenderGraphReady() {
    this.svg = this.div.selectWithoutDataPropagation("svg");
    this.graph0 = this.svg.selectWithoutDataPropagation("g");
    this.dotGraph = this.prelDotGraph;
    this.addEventHandlers();
    this.rendering = false;
    if (!this.renderGraphReady) {
      this.renderGraphReady = true;
      this.setZoomScale(1, true);
      this.graphviz
        .transition(() => d3_transition().duration(this.props.transitionDuration * 1000));
      this.props.onInitialized();
    }
    this.setState({ busy: false });
    if (this.pendingUpdate) {
      this.pendingUpdate = false;
      this.renderGraph();
    }
  }

  handleZoomInButtonClick = () => {
    let scale = d3_zoomTransform(this.graphviz.zoomSelection().node()).k;
    scale = scale * 1.2;
    this.setZoomScale(scale);
  }

  handleZoomOutButtonClick = () => {
    let scale = d3_zoomTransform(this.graphviz.zoomSelection().node()).k;
    scale = scale / 1.2;
    this.setZoomScale(scale);
  }

  handleZoomOutMapButtonClick = () => {
    let viewBox = this.svg.attr("viewBox").split(' ');
    let bbox = this.graph0.node().getBBox();
    let xRatio = viewBox[2] / bbox.width;
    let yRatio = viewBox[3] / bbox.height;
    let scale = Math.min(xRatio, yRatio);
    this.setZoomScale(scale, true);
  }

  handleZoomResetButtonClick = () => {
    this.setZoomScale(1, true);
  }

  setZoomScale = (scale, center = false, reset = false) => {
    let viewBox = this.svg.attr("viewBox").split(' ');
    let bbox = this.graph0.node().getBBox();
    let { x, y, k } = d3_zoomTransform(this.graphviz.zoomSelection().node());
    let [x0, y0, scale0] = [x, y, k];
    let xOffset0 = x0 + bbox.x * scale0;
    let yOffset0 = y0 + bbox.y * scale0;
    let xCenter = viewBox[2] / 2;
    let yCenter = viewBox[3] / 2;
    let xOffset;
    let yOffset;
    if (center) {
      xOffset = (viewBox[2] - bbox.width * scale) / 2;
      yOffset = (viewBox[3] - bbox.height * scale) / 2;
    } else if (reset) {
      xOffset = 0;
      yOffset = 0;
    } else {
      xOffset = xCenter - (xCenter - xOffset0) * scale / scale0;
      yOffset = yCenter - (yCenter - yOffset0) * scale / scale0;
    }
    x = -bbox.x * scale + xOffset;
    y = -bbox.y * scale + yOffset;
    let transform = d3_zoomIdentity.translate(x, y).scale(scale);
    this.graphviz.zoomSelection().call(this.graphviz.zoomBehavior().transform, transform);
  }

  addEventHandlers() {
    let self = this;
    this.graphviz.zoomBehavior().filter(function (event) {
      if (event.type === 'mousedown' && !event.ctrlKey) {
        if (self.isDrawingEdge) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    });

    var nodes = this.svg.selectAll(".node");
    var edges = this.svg.selectAll(".edge");
    var clusters = this.svg.selectAll(".cluster");

    d3_select(window).on("resize", this.resizeSVG.bind(this));
    this.div.on("click", this.handleClickDiv.bind(this));
    this.svg.on("click", this.handleClickSvg.bind(this));
    nodes.on("click", this.handleClickNode.bind(this));
    clusters.on("click", this.handleClickCluster.bind(this));
  }

  handleClickDiv(event) {
    this.props.onFocus();
    document.activeElement.blur();
    event.preventDefault();
    event.stopPropagation();
    if (!(event.which === 1 && (event.ctrlKey || event.shiftKey))) {
      this.unSelectComponents();
    }
    this.props.clickNodes("target");
  }

  handleClickNode(event) {
    this.props.onFocus();
    document.activeElement.blur();
    event.preventDefault();
    event.stopPropagation();
    if (!this.isDrawingEdge && event.which === 1) {
      let extendSelection = event.ctrlKey || event.shiftKey;
      this.selectComponents(d3_select(event.currentTarget), extendSelection);
    }
  }
  handleClickCluster(event) {
    this.props.onFocus();
    document.activeElement.blur();
    event.preventDefault();
    event.stopPropagation();
    if (!this.isDrawingEdge && event.which === 1) {
      let extendSelection = event.ctrlKey || event.shiftKey;
      this.selectComponents(d3_select(event.currentTarget), extendSelection);
    }
  }

  handleClickSvg(event) {
    this.props.onFocus();

    document.activeElement.blur();
    if (event.which === 1 && this.selectArea) {
      event.preventDefault();
      event.stopPropagation();
      this.selectArea.selection.remove();
      let { x0, y0 } = this.selectArea;
      var [x1, y1] = d3_pointer(event, this.graph0.node());
      let x = Math.min(x0, x1);
      let y = Math.min(y0, y1);
      let width = Math.abs(x1 - x0);
      let height = Math.abs(y1 - y0);
      if (width === 0 && height === 0) {
        this.selectArea = null;
        if (!(event.ctrlKey || event.shiftKey)) {
          this.unSelectComponents();
        }
        return;
      }
      let components = this.graph0.selectAll('.node,.edge,.cluster');
      components = components.filter(function (d, i) {
        let bbox = this.getBBox();
        if (bbox.x < x || bbox.x + bbox.width > x + width)
          return false
        if (bbox.y < y || bbox.y + bbox.height > y + height)
          return false
        return true
      });
      let extendSelection = event.ctrlKey || event.shiftKey;
      this.selectComponents(components, extendSelection);
      this.selectArea = null;
    }
  }


  selectAllComponents() {
    let components = this.graph0.selectAll('.node,.edge,.cluster');
    this.selectComponents(components);
  }

  selectComponents(components, extendSelection = false) {
    if (extendSelection) {
      this.selectedComponents = d3_selectAll(this.selectedComponents.nodes().concat(components.nodes()));
    } else {
      this.unSelectComponents();
      this.selectedComponents = components;
    }
    this.markSelectedComponents(components, extendSelection);
  }

  markSelectedComponents(components, extendSelection = false) {
    let scale = this.graph0.node().getCTM().a * 3 / 4;
    let dashLength = 5;
    let dashWidth = 6;
    let rectNodes = [];
    let titles = [];
    const self = this;
    components.each(function (d, i) {
      let component = d3_select(this);
      let color = 'blue';
      const title = component.select('title').text();
      if (component.classed('edge')) {
        return
      } else {
        titles.push(title);
      }
      let bbox = component.node().getBBox();
      let rect = component.append("rect")
        .attr("x", bbox.x)
        .attr("y", bbox.y)
        .attr("width", bbox.width)
        .attr("height", bbox.height)
        .attr("stroke", color)
        .attr("fill", "orange")
        .attr("opacity", 0.4)
        .attr("stroke-dasharray", dashLength)
        .attr("stroke-width", dashWidth);
      rectNodes.push(rect.node());
    });
    this.props.clickNodes(titles[0]);
    if (extendSelection) {
      this.selectRects = d3_selectAll(this.selectRects.nodes().concat(rectNodes));
      this.selectNames = this.selectNames.concat(titles);
    } else {
      this.selectRects = d3_selectAll(rectNodes);
      this.selectNames = titles;
    }
  }

  unSelectComponents() {
    this.selectRects.remove();
    this.selectRects = d3_select(null);
    if (this.selectedComponents.size() > 0) {
      this.selectedComponents = d3_selectAll(null);
      this.props.onSelect([]);
    }
  }


  resizeSVG() {
    if (this.div.node() != null) {
      let width = this.div.node().parentElement.clientWidth;
      let height = this.div.node().parentElement.clientHeight;
      let fit = this.props.fit;

      this.svg
        .attr("width", width)
        .attr("height", height);
      if (!fit) {
        this.unFitGraph();
      }

    }
  };

  unFitGraph() {
    let width = this.div.node().parentElement.clientWidth;
    let height = this.div.node().parentElement.clientHeight;
    this.svg
      .attr("viewBox", `0 0 ${width * 3 / 4} ${height * 3 / 4}`);
  }

  fitGraph() {
    this.svg
      .attr("viewBox", `0 0 ${this.originalViewBox.width} ${this.originalViewBox.height}`);
  }

  render() {
    const { classes } = this.props;
    return (
      <React.Fragment>
        <div
          id="canvas"
          style={{
            backgroundColor: "aliceblue",
          }}
          ref={div => this.div = d3_select(div)}
        >
        </div>
        {this.state.busy && (
          <Fade
            in={true}
            style={{
              transitionDelay: '800ms',
            }}
            unmountOnExit
          >
            <CircularProgress
              id="busy-indicator"
              className={classes.progress}
              color="secondary"
              size={20}
              thickness={4.5}
            />
          </Fade>
        )}
      </React.Fragment>
    );
  }
}

Graph.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Graph);
