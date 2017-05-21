import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as firebase from 'firebase';
import * as PIXI from 'pixi.js';
import { Button } from 'reactstrap';
import { createKeyboardListeners } from './inputHandling';

let database = null;
let thisPlayer = null;

class Game extends Component {
  constructor() {
    super();
    this.initializePixiCanvas = this.initializePixiCanvas.bind(this);
    this.animate = this.animate.bind(this);
    this.loadUsersAndListenForChanges = this.loadUsersAndListenForChanges.bind(this);
  }

  initializePixiCanvas() {
    if (this.props.renderer && this.refs.gameCanvas) {
      this.refs.gameCanvas.appendChild(this.props.renderer.view);
    }
  }

  loadUsersAndListenForChanges() {
    if (! firebase.auth().currentUser || !this.props.stage || !this.props.renderer) {
      return;
    }
    database = firebase.database();
    const updateUsers = (data) => {
      for (const playerKey in this.players) {
        if (this.players.hasOwnProperty(playerKey)) {
          if (!data.hasOwnProperty(playerKey)) {
            this.props.stage.removeChild(this.players[playerKey]);
            delete this.players[playerKey];
          }
        }
      }
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          if (!this.players.hasOwnProperty(key)) {
            this.players[key] = new PIXI.Sprite(
              PIXI.loader.resources["cat.png"].texture
            );
            this.props.stage.addChild(this.players[key]);
            if (key === this.props.userId) {
              thisPlayer = this.players[key];
              thisPlayer.x = 0;
              thisPlayer.y = 0;
              thisPlayer.vx = 0;
              thisPlayer.vy = 0;
              this.props.stage.addChild(thisPlayer);

              createKeyboardListeners(thisPlayer, window, this.props.renderer);
            }
          }
          this.players[key].x = data[key].xCoordinate;
          this.players[key].y = data[key].yCoordinate;
        }
      }
    }
    if(!this.props.signedOut) {
      database.ref('users/').on('value', (snapshot) => {
        updateUsers(snapshot.val());
      });
    };
  }

  componentDidMount() {
    if (this.props.userId) {
      this.players = {};
      this.loadUsersAndListenForChanges();
      this.initializePixiCanvas();
      const fitToScreen = () => {
        let w, h = null;
        if (window.innerWidth / window.innerHeight >= this.props.aspectRatio) {
           w = window.innerHeight * this.props.aspectRatio;
           h = window.innerHeight;
        } else {
           w = window.innerWidth;
           h = window.innerWidth / this.props.aspectRatio;
        }
        this.props.renderer.view.style.width = w + 'px';
        this.props.renderer.view.style.height = h + 'px';
      }
      window.onresize = fitToScreen;
      fitToScreen();
      this.animate();
    }
  }

  componentWillUnmount() {
    window.cancelAnimationFrame(this.frame);
  }

  animate() {
      if (!this.props.renderer) {
        return;
      }

      // Update
      if (thisPlayer) {
        thisPlayer.x += thisPlayer.vx;
        thisPlayer.y += thisPlayer.vy;
        // Update user's location on DB.
        if(database && !this.props.signedOut) {
          database.ref('users/' + this.props.userId).set({ xCoordinate: thisPlayer.x, yCoordinate: thisPlayer.y });
        }
      }
      this.props.renderer.render(this.props.stage);
      // render the stage container'
      this.frame = requestAnimationFrame(this.animate);
  }

  render() {
    const element = this.props.signedOut ?
      <Button onClick={() => window.location.reload(false)}>You have been signed out due to inactivity, click here to log back in </Button> :
      <div className='game-canvas-container' ref='gameCanvas' />;
    return element;
  }
}

Game.propTypes = {
  stage: PropTypes.object,
  userId: PropTypes.string,
  renderer: PropTypes.object,
  aspectRatio: PropTypes.number,
  signedOut: PropTypes.bool,
}

export default Game
