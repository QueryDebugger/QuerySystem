import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import AceEditor from 'react-ace';
import 'brace/mode/mysql';
import 'brace/theme/tomorrow';

const styles = {
  errorButton: {
    position: 'absolute',
    top: 'calc(64px + 12px)',
  },
  aceSelectedWord: {
    position: 'absolute',
    background: 'rgb(250, 250, 255)',
    border: '1px solid rgb(200, 200, 250)',
  },
};

class TextEditor2 extends React.Component {
  constructor(props) {
    super(props);
    this.pendingChanges = 0;
  }

  render() {
    const { classes } = this.props;
    var annotations = null;
    if (this.props.error) {
      annotations = [{
        row: this.props.error.line - 1,
        column: 0,
        text: this.props.error.message,
        type: "error",
        dummy: Date.now(), // Workaround for issue #33
      }];
      if (this.editor && !this.editor.isRowFullyVisible(this.props.error.line)) {
        if (!this.prevError ||
            this.props.error.message !== this.prevError.message ||
            (this.props.error.line !== this.prevError.line &&
             this.props.error.numLines - this.props.error.line !== this.prevNumLines - this.prevError.line)
           ) {
          this.editor.scrollToLine(this.props.error.line - 1, true);
        }
      }
      this.prevNumLines = this.props.error.numLines;
    }
    let scrollbarWidth = 0;
    if (this.div) {
      const scrollbarDiv = this.div.querySelector('div.ace_scrollbar-v');
      const hasScrollbar = scrollbarDiv && scrollbarDiv.style['display'] !== 'none';
      if (hasScrollbar) {
        const scrollbarInnerDiv = scrollbarDiv.querySelector('div.ace_scrollbar-inner');
        scrollbarWidth = scrollbarInnerDiv.clientWidth - 5;
      }
    }
    return (
      <div id="text-editor-wrapper" ref={div => this.div = div}>
        <AceEditor
          // FIXME: Remove workaround when https://github.com/securingsincity/react-ace/issues/767 is fixed
          key={this.props.holdOff}
          mode="mysql"
          theme="tomorrow"
          highlightActiveLine={false}
          fontSize={this.props.fontSize + 'px'}
          tabSize={this.props.tabSize}
          onFocus={this.props.onFocus}
          name="text-editor"
          value={this.props.sqlSrc}
          height={this.props.height}
          readOnly={true}
          width={this.props.width}
          wrapEnabled
          showPrintMargin={false}
          // debounceChangePeriod={this.props.holdOff * 1000}
          editorProps={{
            $blockScrolling: true
          }}
          setOptions={{
            showLineNumbers: true
          }}
        />
      </div>
    );
  }
}

export default withStyles(styles)(TextEditor2);
