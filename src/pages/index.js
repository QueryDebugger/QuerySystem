import React from 'react';
import 'typeface-roboto';
import PropTypes from 'prop-types';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import withRoot from '../withRoot';
import ButtonAppBar from '../ButtonAppBar';
import Graph from '../Graph';
import TextEditor from '../TextEditor';
import TextEditor2 from '../TextEditor2';
import { parse as qs_parse } from 'qs';
import packageJSON from '../../package.json';
import myParser from '../backend/Parser';
import sqlFormatter from 'sql-formatter-plus';
import AnalyzeSql from '../backend/analysis/AnalyzeSql';


const styles = theme => ({
  root: {
    textAlign: 'center',
  },
  paper: {
    // viewport height - app bar - 2 * padding
    height: "calc(100vh - 48px - 2 * 4px)",
  },
  paperWhenUpdatedSnackbarIsOpen: {
    "margin-top": "64px",
    height: "calc(100vh - 48px - 64px - 2 * 4px)",
  }
});

class Index extends React.Component {
  constructor(props) {
    super(props);
    let dotSrc = ""
    let vqfSrc =
`TARGET_QUERY (
  "Example: Retrieve students’ responses to survey questions whose type is RATING SCALE for completed courses."
  rm_summary = RM (
    rm_survey = RM (
      "Get completed surveys of students"
      mq1 = MQ (
        pa_stud_survey
        FILTER survey_status_id = 'COMPLETED'
        stud_id,
        cpnt_survey_id,
        stud_survey_id
      )
    )
    rm_course = RM (
      "Get information of the component of the survey"
      mq2 = MQ (
        pa_cpnt_survey
        cpnt_survey_id AS csi,
        survey_id,
        cpnt_id, 
        cpnt_typ_id,
        rev_dte
      )
      mq3 = MQ (
        pa_cpnt
        cpnt_id AS ci, 
        cpnt_typ_id AS cti, 
        rev_dte AS rd,
        cpnt_title
      )
      mq2 -> (1, cpnt_id = ci, cpnt_typ_id = cti, rev_dte = rd) -> mq3
    )
    rm_response = RM (
        "Get response values of the questions in the survey"
        mq4 = MQ (
          pa_survey_responses
          stud_survey_id as ssi,
          question_id,
          stud_response_value
        )
        mq5 = MQ (
          pa_survey_question
          question_id as qi,
          question_type
        )
        mq4 -> (1, question_id = qi) -> mq5
    )
    rm_survey -> (1, cpnt_survey_id = csi) -> rm_course
    rm_survey -> (n, stud_survey_id = ssi) -> rm_response
  )
  mq_final = MQ (
    rm_summary
    FILTER question_type = 'RATING SCALE'
    stud_id AS "Student ID",
    survey_id AS "Survey ID",
    cpnt_id AS "Course ID",
    cpnt_typ_id AS "Course Type ID",
    rev_dte AS "Revision Date",
    cpnt_title AS "Course Title",
    question_id AS "Question ID",
    stud_response_value AS "Response Value"
    ORDER BY stud_id
    LIMIT 100
  )
)    
`

    let sqlSrc = ""
    this.state = {
      projects: JSON.parse(localStorage.getItem('projects')) || {},
      initialized: false,
      name: localStorage.getItem('name') || '',
      dotSrc: dotSrc,
      vqfSrc: vqfSrc,
      sqlSrc: sqlSrc,
      dotSrcLastChangeTime: +localStorage.getItem('dotSrcLastChangeTime') || Date.now(),
      svg: localStorage.getItem('svg') || '',
      hasUndo: false,
      hasRedo: false,
      mainMenuIsOpen: false,
      helpMenuIsOpen: false,
      settingsDialogIsOpen: false,
      openFromBrowserDialogIsOpen: false,
      saveToBrowserAsDialogIsOpen: false,
      replaceName: '',
      exportAsUrlDialogIsOpen: false,
      exportAsSvgDialogIsOpen: false,
      insertPanelsAreOpen: (localStorage.getItem('insertPanelsAreOpen') || 'false') === 'true',
      nodeFormatDrawerIsOpen: (localStorage.getItem('nodeFormatDrawerIsOpen') || 'false') === 'true',
      edgeFormatDrawerIsOpen: (localStorage.getItem('edgeFormatDrawerIsOpen') || 'false') === 'true',
      keyboardShortcutsDialogIsOpen: false,
      mouseOperationsDialogIsOpen: false,
      aboutDialogIsOpen: false,
      fitGraph: true,
      transitionDuration: localStorage.getItem('transitionDuration') || 1,
      tweenPaths: true,
      tweenShapes: true,
      tweenPrecision: false,
      columnsTextEditor: 6,
      columnsGraph: 6,
      columnsTextEditor2: 0,
      engine: localStorage.getItem('engine') || 'dot',
      defaultNodeAttributes: JSON.parse(localStorage.getItem('defaultNodeAttributes')) || {},
      defaultEdgeAttributes: JSON.parse(localStorage.getItem('defaultEdgeAttributes')) || {},
      error: null,
      holdOff: localStorage.getItem('holdOff') || 0.2,
      fontSize: localStorage.getItem('fontSize') || 14,
      tabSize: +localStorage.getItem('tabSize') || 2,
      selectedGraphComponents: [],
      test: JSON.parse(localStorage.getItem('test')) || {},
      updatedSnackbarIsOpen: packageJSON.version !== localStorage.getItem('version'),
    };
  }

  componentDidMount() {
    this.handleTextChange(this.state.vqfSrc)
    const urlParams = qs_parse(window.location.search.slice(1));
    if (urlParams.dot) {
      const currentDotSrc = this.state.dotSrc;
      const newDotSrc = urlParams.dot;
      if (newDotSrc !== currentDotSrc) {
        const names = Object.keys(this.state.projects).filter((name) => {
          const project = this.state.projects[name];
          return newDotSrc === project.dotSrc;
        });
        if (names.length > 0) {
          this.handleOpenFromBrowser(names[0]);
        } else {
          const newName = this.createUntitledName(this.state.projects, this.state.name);
          this.handleSaveAsToBrowser(newName, newDotSrc);
        }
      }
      window.history.replaceState(null, null, window.location.pathname);
    }
    document.onblur = () => {
      // Needed when the user clicks outside the document,
      // e.g. the browser address bar
      this.setFocus(null);
    }
    this.setFocus('TextEditor')
  }

  setPersistentState = (updater) => {
    this.setState((state) => {
      if (typeof updater === 'function') {
        var obj = updater(state);
      } else {
        obj = updater;
      }
      if (obj != null) {
        Object.keys(obj).forEach((key) => {
          let value = obj[key];
          if (typeof value === 'boolean') {
            value = value.toString();
          }
          else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          localStorage.setItem(key, value);
        });
      }
      return obj;
    }, () => {
      window.dispatchEvent(new Event('resize'));
    });
  }

  handleTextChange = (text, undoRedoState) => {
    this.setPersistentState(
      {
        vqfSrc: text,
      }
    )
    var res = myParser.parse(text)
    if (res.error != null) {
      this.handleError({ message: res.error.msg, line: res.error.line })
      if (res.targetDotCode == null) {
        return
      }
    } else {
      this.setPersistentState({
        error: null
      })
      if (res.targetDotCode == null) {
        return
      }
    }

    this.setPersistentState((state) => {
      const newState = {
        name: state.name,
        dotSrc: myParser.targetDotCode,
        // vqfSrc: text,
        // sqlSrc: sqlFormatter.format(generateSql.getSql("target"))
      };
      if (!this.disableDotSrcLastChangeTimeUpdate) {
        newState.dotSrcLastChangeTime = Date.now();
      }
      return newState;
    });
    this.disableDotSrcLastChangeTimeUpdate = false;
  }

  handleMainMenuButtonClick = (anchorEl) => {
    this.setState({
      mainMenuIsOpen: true,
      mainMenuAnchorEl: anchorEl,
    });
  }

  createUntitledName = (projects, currentName) => {
    const baseName = 'Untitled Graph';
    let newName = baseName;
    while (projects[newName] || newName === currentName) {
      newName = baseName + ' ' + (+newName.replace(baseName, '') + 1);
    }
    return newName;
  }

  handleTransitionDurationChange = (transitionDuration) => {
    this.setPersistentState({
      transitionDuration: transitionDuration,
    });
  }

  handleTweenPathsSwitchChange = (tweenPaths) => {
    this.setPersistentState({
      tweenPaths: tweenPaths, tweenShapes: this.state.tweenShapes, tweenPrecision: this.state.tweenPrecision
    });
    if (tweenPaths && this.state.tweenShapes && this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 4, columnsGraph: 4, columnsTextEditor2: 4 });
    }
    if (tweenPaths && this.state.tweenShapes && !this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 6, columnsGraph: 6, columnsTextEditor2: 0 });
    }
    if (tweenPaths && !this.state.tweenShapes && this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 6, columnsGraph: 0, columnsTextEditor2: 6 });
    }
    if (tweenPaths && !this.state.tweenShapes && !this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 12, columnsGraph: 0, columnsTextEditor2: 0 });
    }
    if (!tweenPaths && this.state.tweenShapes && this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 6, columnsTextEditor2: 6 });
    }
    if (!tweenPaths && this.state.tweenShapes && !this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 12, columnsTextEditor2: 0 });
    }
    if (!tweenPaths && !this.state.tweenShapes && this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 0, columnsTextEditor2: 12 });
    }
    if (!tweenPaths && !this.state.tweenShapes && !this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 0, columnsTextEditor2: 0 });
    }
  }

  handleTweenShapesSwitchChange = (tweenShapes) => {
    this.setPersistentState({
      tweenPaths: this.state.tweenPaths, tweenShapes: tweenShapes, tweenPrecision: this.state.tweenPrecision
    });
    if (this.state.tweenPaths && tweenShapes && this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 4, columnsGraph: 4, columnsTextEditor2: 4 });
    }
    if (this.state.tweenPaths && tweenShapes && !this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 6, columnsGraph: 6, columnsTextEditor2: 0 });
    }
    if (this.state.tweenPaths && !tweenShapes && this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 6, columnsGraph: 0, columnsTextEditor2: 6 });
    }
    if (this.state.tweenPaths && !tweenShapes && !this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 12, columnsGraph: 0, columnsTextEditor2: 0 });
    }
    if (!this.state.tweenPaths && tweenShapes && this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 6, columnsTextEditor2: 6 });
    }
    if (!this.state.tweenPaths && tweenShapes && !this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 12, columnsTextEditor2: 0 });
    }
    if (!this.state.tweenPaths && !tweenShapes && this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 0, columnsTextEditor2: 12 });
    }
    if (!this.state.tweenPaths && !tweenShapes && !this.state.tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 0, columnsTextEditor2: 0 });
    }
  }

  handleTweenPrecisionChange = (tweenPrecision) => {
    this.setPersistentState({
      tweenPaths: this.state.tweenPaths, tweenShapes: this.state.tweenShapes, tweenPrecision: tweenPrecision
    });
    if (this.state.tweenPaths && this.state.tweenShapes && tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 4, columnsGraph: 4, columnsTextEditor2: 4 });
    }
    if (this.state.tweenPaths && this.state.tweenShapes && !tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 6, columnsGraph: 6, columnsTextEditor2: 0 });
    }
    if (this.state.tweenPaths && !this.state.tweenShapes && tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 6, columnsGraph: 0, columnsTextEditor2: 6 });
    }
    if (this.state.tweenPaths && !this.state.tweenShapes && !tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 12, columnsGraph: 0, columnsTextEditor2: 0 });
    }
    if (!this.state.tweenPaths && this.state.tweenShapes && tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 6, columnsTextEditor2: 6 });
    }
    if (!this.state.tweenPaths && this.state.tweenShapes && !tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 12, columnsTextEditor2: 0 });
    }
    if (!this.state.tweenPaths && !this.state.tweenShapes && tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 0, columnsTextEditor2: 12 });
    }
    if (!this.state.tweenPaths && !this.state.tweenShapes && !tweenPrecision) {
      this.setPersistentState({ columnsTextEditor: 0, columnsGraph: 0, columnsTextEditor2: 0 });
    }
  }

  handleHoldOffChange = (holdOff) => {
    this.setPersistentState({
      holdOff: holdOff,
    });
  }

  handleFontSizeChange = (fontSize) => {
    this.setPersistentState({
      fontSize: fontSize,
    });
  }

  handleTabSizeChange = (tabSize) => {
    this.setPersistentState({
      tabSize: tabSize,
    });
  }

  handleDownloadButtonClick = () => {
    function downloadFile(fileData, fileName, mimeType) {
      const fileBlob = new Blob([fileData], { type: mimeType })
      const fileObjectURL = window.URL.createObjectURL(fileBlob)
      const tempLink = document.createElement('a')
      tempLink.href = fileObjectURL
      tempLink.download = fileName
      document.body.appendChild(tempLink)
      tempLink.click()
      document.body.removeChild(tempLink)
    }
    const fileData = this.getSvgString()
    const fileName = "AutoGraph"
    const mimeType = 'image/svg+xml'
    downloadFile(fileData, fileName, mimeType)
  }

  handleZoomInButtonClick = () => { }
  handleZoomOutButtonClick = () => { }
  handleZoomOutMapButtonClick = () => { }

  registerZoomInButtonClick = (handleZoomInButtonClick) => {
    this.handleZoomInButtonClick = handleZoomInButtonClick;
  }

  registerZoomOutButtonClick = (handleZoomOutButtonClick) => {
    this.handleZoomOutButtonClick = handleZoomOutButtonClick;
  }

  registerZoomOutMapButtonClick = (handleZoomOutMapButtonClick) => {
    this.handleZoomOutMapButtonClick = handleZoomOutMapButtonClick;
  }

  registerGetSvg = (getSvg) => {
    this.getSvg = getSvg;
  }

  getSvgString() {
    const svg = this.getSvg();
    const serializer = new XMLSerializer();
    return svg ? serializer.serializeToString(svg) : this.state.svg;
  }

  handleGraphComponentSelect = (components) => {
    this.setState({
      selectedGraphComponents: components,
    });
  }

  handleGraphInitialized = () => {
    this.setState({
      graphInitialized: true,
    });
    this.setPersistentState({
      svg: this.getSvgString(),
    });
  }

  handleError = (error) => {
    if (error) {
      error.numLines = this.state.vqfSrc.split('\n').length;
    }
    if (JSON.stringify(error) !== JSON.stringify(this.state.error)) {
      this.setPersistentState({
        error: error,
      });
    }
  }

  registerUndoReset = (resetUndoStack) => {
    this.resetUndoStack = resetUndoStack;
  }

  handleTextEditorFocus = () => {
    this.setFocus('TextEditor');
  }

  handleTextEditorBlur = () => {
    // Needed when the user clicks outside of a pane,
    // e.g. the app bar or the background
    this.setFocusIfFocusIs('TextEditor', null);
  }

  handleGraphFocus = () => {
    this.setFocus('Graph');
  }
  handleClickNodes = (title) => {
    if (title == null) {
      return
    }

    if (myParser.targetDotCode != null) {
    var temp = (new AnalyzeSql(myParser.analyzeDep)).getSql(title)

    var temp1 = sqlFormatter.format(temp["noExpandSql"])
    var temp2 = sqlFormatter.format(temp["expandSql"])
    if (temp2 !== null && temp2.trim().length > 0) {
      temp1 += "\n\n" + temp2
    }
      this.setPersistentState({
        sqlSrc: temp1
      })
    }
  }
  handleInsertPanelsClick = () => {
    this.setFocus('InsertPanels');
  }

  handleNodeFormatDrawerClick = () => {
    this.setFocusIf('nodeFormatDrawerIsOpen', 'NodeFormatDrawer', null)
  }

  handleEdgeFormatDrawerClick = () => {
    this.setFocus('EdgeFormatDrawer');
    this.setFocusIf('edgeFormatDrawerIsOpen', 'EdgeFormatDrawer', null)
  }

  handleUpdatedSnackbarClose = () => {
    this.setState({ "updatedSnackbarIsOpen": false });
    this.setPersistentState({
      "version": packageJSON.version,
    })
  }

  setFocus = (focusedPane) => {
    this.setState((state) => (state.focusedPane !== focusedPane && {
      focusedPane: focusedPane,
    }) || null);
  }

  setFocusIfFocusIs = (currentlyFocusedPane, newFocusedPane) => {
    this.setState((state) => (state.focusedPane === currentlyFocusedPane && {
      focusedPane: newFocusedPane,
    }) || null);
  }

  setFocusIf = (stateProperty, focusedPaneIf, focusedPaneElse) => {
    this.setState((state) => {
      const focusedPane = state[stateProperty] ? focusedPaneIf : focusedPaneElse;
      return (state.focusedPane !== focusedPane && {
        focusedPane: focusedPane,
      }) || null;
    });
  }

  render() {
    const { classes } = this.props;
    const editorIsOpen = !this.state.nodeFormatDrawerIsOpen && !this.state.edgeFormatDrawerIsOpen;
    const graphHasFocus = this.state.focusedPane === 'Graph';
    const leftPaneElevation = 3;
    const rightPaneElevation = 3;

    const paperClass = classes.paper;
    return (
      <div className={classes.root}>
        <script src={process.env.PUBLIC_URL.replace(/\.$/, '') + "@hpcc-js/wasm/dist/index.min.js"} type="javascript/worker"></script>
        <ButtonAppBar
          hasUndo={this.state.hasUndo}
          hasRedo={this.state.hasRedo}
          onZoomInButtonClick={this.handleZoomInButtonClick}
          onZoomOutButtonClick={this.handleZoomOutButtonClick}
          onZoomOutMapButtonClick={this.handleZoomOutMapButtonClick}
          onDownloadButtonClick={this.handleDownloadButtonClick}
          onTweenPathsSwitchChange={this.handleTweenPathsSwitchChange}
          onTweenShapesSwitchChange={this.handleTweenShapesSwitchChange}
          onTweenPrecisionSwitchChange={this.handleTweenPrecisionChange}
        >
        </ButtonAppBar>

        <Grid container
          spacing={8}
          style={{
            margin: 0,
            width: '100%',
          }}
        >
          {this.state.tweenPaths &&
            <Grid item xs={this.state.columnsTextEditor}>
              <Paper elevation={leftPaneElevation} className={paperClass}>
                <div style={{ display: editorIsOpen ? 'block' : 'none' }}>
                  <TextEditor
                    // allocated viewport width - 2 * padding
                    width={`calc(${this.columnsTextEditor * 100 / 12}vw - 2 * 4px)`}
                    height={`calc(100vh - 48px - 2 * 4px - ${this.updatedSnackbarIsOpen ? "64px" : "0px"})`}
                    vqfSrc={this.state.vqfSrc}
                    onTextChange={this.handleTextChange}
                    onFocus={this.handleTextEditorFocus}
                    onBlur={this.handleTextEditorBlur}
                    error={this.state.error}
                    selectedGraphComponents={this.state.selectedGraphComponents}
                    holdOff={this.state.holdOff}
                    fontSize={this.state.fontSize}
                    tabSize={this.state.tabSize}
                  />
                </div>
              </Paper>
            </Grid>
          }
          {this.state.tweenShapes &&
            <Grid item xs={this.state.columnsGraph}>
              <Paper elevation={rightPaneElevation} className={paperClass}>
                <Graph
                  hasFocus={graphHasFocus}
                  dotSrc={this.state.dotSrc}
                  engine={this.state.engine}
                  fit={this.state.fitGraph}
                  transitionDuration={this.state.transitionDuration}
                  tweenPaths={true}
                  tweenShapes={true}
                  tweenPrecision={"1%"}
                  defaultNodeAttributes={this.state.defaultNodeAttributes}
                  defaultEdgeAttributes={this.state.defaultEdgeAttributes}
                  onFocus={this.handleGraphFocus}
                  clickNodes={this.handleClickNodes}
                  onSelect={this.handleGraphComponentSelect}
                  registerZoomInButtonClick={this.registerZoomInButtonClick}
                  registerZoomOutButtonClick={this.registerZoomOutButtonClick}
                  registerZoomOutMapButtonClick={this.registerZoomOutMapButtonClick}
                  registerZoomResetButtonClick={this.registerZoomResetButtonClick}
                  registerGetSvg={this.registerGetSvg}
                  onInitialized={this.handleGraphInitialized}
                  onError={this.handleError}
                />
              </Paper>
            </Grid>
          }
          {this.state.tweenPrecision &&
            <Grid item xs={this.state.columnsTextEditor2}>
              <Paper elevation={leftPaneElevation} className={paperClass}>
                <div style={{ display: editorIsOpen ? 'block' : 'none' }}>
                  <TextEditor2
                    // allocated viewport width - 2 * padding
                    width={`calc(${this.state.columnsTextEditor2 * 100 / 12}vw - 2 * 4px)`}
                    height={`calc(100vh - 48px - 2 * 4px - ${this.updatedSnackbarIsOpen ? "64px" : "0px"})`}
                    sqlSrc={this.state.sqlSrc}
                    holdOff={this.state.holdOff}
                    fontSize={this.state.fontSize}
                    tabSize={this.state.tabSize}
                  />
                </div>
              </Paper>
            </Grid>
          }
        </Grid>
      </div>
    );
  }
}

Index.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withRoot(withStyles(styles)(Index));

