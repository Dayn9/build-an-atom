// Copyright 2002-2013, University of Colorado Boulder

/**
 * Base class for problem views.  This type adds the titles, buttons, and such
 * and controls the visibility based on the state of the problem.
 *
 * @author John Blanco
 */
define( function( require ) {
  'use strict';

  // Imports
  var assert = require( 'ASSERT/assert' )( 'build-an-atom' );
  var BAAFont = require( 'common/view/BAAFont' );
  var TextButton = require( 'SUN/TextButton' );
  var FaceNode = require( 'SCENERY_PHET/FaceNode' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Node = require( 'SCENERY/nodes/Node' );
  var NumberAtom = require( 'common/model/NumberAtom' );
  var PeriodicTableNode = require( 'common/view/PeriodicTableNode' );
  var Property = require( 'AXON/Property' );
  var AquaRadioButton = require( 'SUN/AquaRadioButton' );
  var Rectangle = require( 'SCENERY/nodes/Rectangle' );
  var Text = require( 'SCENERY/nodes/Text' );

  // Constants
  var BUTTON_FONT = new BAAFont( 20 );
  var BUTTON_FILL = 'rgb( 0, 255, 153 )';

  /**
   * Main constructor function.
   *
   * @constructor
   */
  function ProblemView( problem, layoutBounds ) {
    Node.call( this ); // Call super constructor.
    var thisNode = this;
    this.problem = problem;

    // Layout assumes that bounds start at (0,0), so verify that this is true.
    assert && assert( layoutBounds.minX === 0 && layoutBounds.minY === 0 );

    // Add the parent nodes where subclasses will add the problem presentation
    // and the interactive controls.
    this.problemPresentationNode = new Node();
    this.addChild( this.problemPresentationNode );
    this.interactiveAnswerNode = new Node();
    this.addChild( this.interactiveAnswerNode );

    // Face node used to signal correct/incorrect answers.
    var faceNode = new FaceNode( layoutBounds.width * 0.4, { visible: false, opacity: 0.75 } );
    this.addChild( faceNode );

    // Buttons. TODO: i18n of all buttons.
    this.buttons = [];
    this.checkAnswerButton = new TextButton( 'Check',
                                             function() { thisNode.checkAnswer(); },
                                             { font: BUTTON_FONT, rectangleFill: BUTTON_FILL } );
    this.addChild( this.checkAnswerButton );
    this.buttons.push( this.checkAnswerButton );

    this.nextButton = new TextButton( 'Next',
                                      function() { problem.next(); },
                                      { font: BUTTON_FONT, rectangleFill: BUTTON_FILL } );
    this.addChild( this.nextButton );
    this.buttons.push( this.nextButton );

    this.tryAgainButton = new TextButton( 'Try Again',
                                          function() { problem.tryAgain(); },
                                          { font: BUTTON_FONT, rectangleFill: BUTTON_FILL } );
    this.addChild( this.tryAgainButton );
    this.buttons.push( this.tryAgainButton );

    this.displayCorrectAnswerButton = new TextButton( 'Display Correct Answer',
                                                      function() { problem.displayCorrectAnswer(); },
                                                      { font: BUTTON_FONT, rectangleFill: BUTTON_FILL } );
    this.addChild( this.displayCorrectAnswerButton );
    this.buttons.push( this.displayCorrectAnswerButton );

    // Utility function to hide all buttons and the feedback face.
    var hideButtonsAndFace = function hideButtonsAndFace() {
      thisNode.buttons.forEach( function( button ) {
        button.visible = false;
      } );
      faceNode.visible = false;
    };
    hideButtonsAndFace();

    // Utility function to enable/disable interaction with answer portion of
    // the displayed problem.
    var setAnswerNodeInteractive = function( interactive ) {
      // TODO: This doesn't seem to work, figure out why and fix.
      thisNode.interactiveAnswerNode.pickable = interactive;
    };

    // Updated the visibility of the various buttons and other nodes based on
    // the problem state.
    var stateChangeHandlers = {
      presentingProblem: function() {
        thisNode.clearAnswer();
        setAnswerNodeInteractive( true );
        thisNode.checkAnswerButton.visible = true;
      },
      problemSolvedCorrectly: function() {
        setAnswerNodeInteractive( true );
        faceNode.smile();
        faceNode.visible = true;
        thisNode.nextButton.visible = true;
      },
      presentingTryAgain: function() {
        setAnswerNodeInteractive( false );
        faceNode.frown();
        faceNode.visible = true;
        thisNode.tryAgainButton.visible = true;
      },
      attemptsExhausted: function() {
        setAnswerNodeInteractive( false );
        thisNode.displayCorrectAnswerButton.visible = true;
        faceNode.frown();
        faceNode.visible = true;
      },
      displayingCorrectAnswer: function() {
        setAnswerNodeInteractive( false );
        thisNode.nextButton.visible = true;
        thisNode.displayCorrectAnswer();
      }
    };

    // Update the appearance of the problem as the state changes.
    problem.problemStateProperty.link( function( problemState ) {
      console.log( 'Problem state changed, new state = ' + problemState );
      hideButtonsAndFace();
      if ( stateChangeHandlers[ problemState ] !== undefined ) {
        stateChangeHandlers[ problemState ]();
      }
    } );

    // Do an initial layout, but the subclasses can and should move the
    // buttons as needed.
    this.setButtonCenter( layoutBounds.width * 0.75, layoutBounds.height * 0.8 );
    faceNode.centerX = layoutBounds.width / 2;
    faceNode.centerY = layoutBounds.height / 2;
  }

  // Inherit from Node.
  inherit( Node,
           ProblemView,
           {
             // Function to clear the user's answer, generally used when
             // giving the user another chance to answer.  Must be implemented
             // in subclasses.
             clearAnswer: function() {},

             // Function to display the correct answer.  Must be implemented
             // in subclasses.
             displayCorrectAnswer: function() {},

             // Function to check the user's submitted answer.  Must be
             // implemented in subclasses.
             checkAnswer: function() {},

             // Function to set the location of all buttons.
             setButtonCenter: function( x, y ) {
               this.buttons.forEach( function( button ) {
                 button.centerX = x;
                 button.centerY = y;
               } );
             }
           }
  );

  return ProblemView;
} );
