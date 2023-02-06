import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import CardMedia from '@material-ui/core/CardMedia';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import Divider from '@material-ui/core/Divider';

const styles = {
  root: {
    flexGrow: 1,
  },
  flex: {
    flexGrow: 1,
    "text-align": "left",
    marginLeft: 12,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
  gitHubLink: {
    color: 'inherit',
    '&:visited': {
      color: 'inherit',
    },
  },
};

function ButtonAppBar(props) {
  const { classes } = props;

  var handleZoomInButtonClick = (event) => {
    props.onZoomInButtonClick && props.onZoomInButtonClick();
  };

  var handleDownloadButtonClick = (event) => {
    props.onDownloadButtonClick && props.onDownloadButtonClick();
  };

  var handleZoomOutButtonClick = (event) => {
    props.onZoomOutButtonClick && props.onZoomOutButtonClick();
  };

  var handleZoomOutMapButtonClick = (event) => {
    props.onZoomOutMapButtonClick && props.onZoomOutMapButtonClick();
  };

  var handleTweenPathsSwitchChange = (event) => {
    props.onTweenPathsSwitchChange(event.target.checked);
  };
  var handleTweenShapesSwitchChange = (event) => {
    props.onTweenShapesSwitchChange(event.target.checked);
  };
  var handleTweenPrecisionChange = (event) => {
    props.onTweenPrecisionSwitchChange(event.target.checked);
  };

  return (
    <div className={classes.root}>
      <AppBar
        position="static"
      >
        <Toolbar id="toolbar"
          style={{ minHeight: 30 }}
        >
          <img
          height="35"
          src="/favicon.ico"
        />
          <Typography
            variant="title"
            color="inherit"
            className={classes.flex}
          >
           SQL#: A Language for Maintainable and Debuggable Database Queries
          </Typography>
          <IconButton
            id="download"
            className={classes.zoomInButton}
            color="inherit"
            aria-label="ZoomIn"
            onClick={handleDownloadButtonClick}
          >
            <CloudDownloadIcon />
          </IconButton>
          <IconButton
            id="zoom-in"
            className={classes.zoomInButton}
            color="inherit"
            aria-label="ZoomIn"
            onClick={handleZoomInButtonClick}
          >
            <ZoomInIcon />
          </IconButton>
          <IconButton
            id="zoom-out"
            className={classes.zoomOutButton}
            color="inherit"
            aria-label="ZoomOut"
            onClick={handleZoomOutButtonClick}
          >
            <ZoomOutIcon />
          </IconButton>
          <IconButton
            id="zoom-out-map"
            className={classes.zoomOutMapButton}
            color="inherit"
            aria-label="ZoomOutMap"
            onClick={handleZoomOutMapButtonClick}
          >
            <ZoomOutMapIcon />
          </IconButton>
          <Divider orientation="vertical" variant="middle" />

          <FormGroup row>
            <FormControlLabel
              className={classes.formControlLabel}
              control={
                <Switch color="secondary" defaultChecked
                  id="path-tween-switch"
                  checked={props.tweenPaths}
                  onChange={handleTweenPathsSwitchChange}
                />
              }
              label="SQL#"
            />
          </FormGroup>
          <FormGroup row>
            <FormControlLabel
              className={classes.formControlLabel}
              control={
                <Switch color="secondary" defaultChecked
                  id="path-tween-switch"
                  checked={props.tweenShapes}
                  onChange={handleTweenShapesSwitchChange}
                />
              }
              label="Graph"
            />
          </FormGroup>
          <FormGroup row>
            <FormControlLabel
              className={classes.formControlLabel}
              control={
                <Switch color="secondary" 
                  id="path-tween-switch"
                  checked={props.tweenPrecision}
                  onChange={handleTweenPrecisionChange}
                />
              }
              label="SQL"
            />
          </FormGroup>
        </Toolbar>
      </AppBar>
    </div>
  );
}

ButtonAppBar.propTypes = {
};

export default withStyles(styles)(ButtonAppBar);
