// Copyright 2013-2020, University of Colorado Boulder

/**
 * View for game challenges where the user is presented with a set of particle
 * counts for an atom and must determine the total charge and enter it in an
 * interactive element symbol.
 *
 * @author John Blanco
 */

import inherit from '../../../../phet-core/js/inherit.js';
import NumberAtom from '../../../../shred/js/model/NumberAtom.js';
import buildAnAtom from '../../buildAnAtom.js';
import ChallengeView from './ChallengeView.js';
import InteractiveSymbolNode from './InteractiveSymbolNode.js';
import ParticleCountsNode from './ParticleCountsNode.js';

/**
 * @param {CountsToSymbolChallenge} toSymbolChallenge
 * @param {Bounds2} layoutBounds
 * @param {Tandem} tandem
 * @constructor
 */
function CountsToSymbolChallengeView( toSymbolChallenge, layoutBounds, tandem ) {

  // Interactive Symbol (must be defined before the super constructor is invoked).
  this.interactiveSymbolNode = new InteractiveSymbolNode(
    toSymbolChallenge.answerAtom,
    tandem.createTandem( 'interactiveSymbolNode' ), {
      interactiveProtonCount: toSymbolChallenge.configurableProtonCount,
      interactiveMassNumber: toSymbolChallenge.configurableMassNumber,
      interactiveCharge: toSymbolChallenge.configurableCharge
    }
  );

  ChallengeView.call( this, toSymbolChallenge, layoutBounds, tandem );

  // Add the interactive symbol.
  this.interactiveSymbolNode.scale( 0.75 );
  this.interactiveAnswerNode.addChild( this.interactiveSymbolNode );

  // Particle counts
  const particleCountsNode = new ParticleCountsNode( toSymbolChallenge.answerAtom );
  this.challengePresentationNode.addChild( particleCountsNode );

  // Layout
  particleCountsNode.centerX = layoutBounds.width * 0.3;
  particleCountsNode.centerY = layoutBounds.height * 0.48;
  this.interactiveSymbolNode.centerX = layoutBounds.width * 0.745;
  this.interactiveSymbolNode.centerY = layoutBounds.height * 0.54;

  // @private called by dispose
  this.disposeCountsToSymbolChallengeView = function() {
    this.interactiveSymbolNode.dispose();
  };
}

buildAnAtom.register( 'CountsToSymbolChallengeView', CountsToSymbolChallengeView );

inherit( ChallengeView, CountsToSymbolChallengeView, {

  // @public
  checkAnswer: function() {
    const userSubmittedAtom = new NumberAtom( {
      protonCount: this.interactiveSymbolNode.protonCountProperty.value,
      neutronCount: this.interactiveSymbolNode.massNumberProperty.value - this.interactiveSymbolNode.protonCountProperty.value,
      electronCount: this.interactiveSymbolNode.protonCountProperty.value - this.interactiveSymbolNode.chargeProperty.value
    } );
    this.challenge.checkAnswer( userSubmittedAtom );
  },

  // @public
  displayCorrectAnswer: function() {
    this.interactiveSymbolNode.protonCountProperty.value = this.challenge.answerAtom.protonCountProperty.get();
    this.interactiveSymbolNode.massNumberProperty.value = this.challenge.answerAtom.massNumberProperty.get();
    this.interactiveSymbolNode.chargeProperty.value = this.challenge.answerAtom.chargeProperty.get();
  },

  dispose: function() {
    this.disposeCountsToSymbolChallengeView();
    ChallengeView.prototype.dispose.call( this );
  }
} );

export default CountsToSymbolChallengeView;