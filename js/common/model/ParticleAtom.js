// Copyright 2002-2013, University of Colorado

/**
 * A model element that represents an atom that is comprised of a set of
 * modeled subatomic particles.  This model element manages the positions and
 * motion of all particles that are a part of the atom.
 */
define( function( require ) {

  // Imports
  var Fort = require( 'FORT/Fort' );
  var SharedConstants = require( 'common/SharedConstants' );
  var Utils = require( 'common/Utils' );
  var Vector2 = require( 'DOT/Vector2' );
  var Particle = require( 'common/model/Particle' );
  var ParticleCollection = Backbone.Collection.extend( { model: Particle } );

  // Constants
  var DEFAULT_INNER_ELECTRON_SHELL_RADIUS = 80;
  var DEFAULT_OUTER_ELECTRON_SHELL_RADIUS = 180;

  var ParticleAtom = Fort.Model.extend(
      {
        defaults: {
          position: Vector2.ZERO,
          protons: new ParticleCollection,
          neutrons: new ParticleCollection,
          electrons: new ParticleCollection,
          innerElectronShellRadius: DEFAULT_INNER_ELECTRON_SHELL_RADIUS,
          outerElectronShellRadius: DEFAULT_OUTER_ELECTRON_SHELL_RADIUS
        },

        constructor: function() {
          Fort.Model.apply( this );
          var thisAtom = this;

          // Initialize the positions where an electron can be placed.
          this.electronPositions = new Array( 10 );
          var angle = 0;
          this.electronPositions[ 0 ] = { electron: null, position: new Vector2( this.innerElectronShellRadius, 0 ) };
          angle += Math.PI;
          this.electronPositions[ 1 ] = { electron: null, position: new Vector2( -this.innerElectronShellRadius, 0 ) };
          var numSlotsInOuterShell = 8;
          angle += Math.PI / numSlotsInOuterShell / 2; // Stagger inner and outer electron shell positions.
          for ( var i = 0; i < numSlotsInOuterShell; i++ ) {
            this.electronPositions[ i + 2 ] = {
              electron: null,
              position: new Vector2( Math.cos( angle ) * this.outerElectronShellRadius,
                                     Math.sin( angle ) * this.outerElectronShellRadius )
            }
            angle += Math.PI / numSlotsInOuterShell * 2;
          }

          // If the electron collection is reset, clear the open positions.
          this.electrons.on( 'reset', function() {
            _.each( thisAtom.electronPositions, function( electronPosition ) {
              electronPosition.electron = null;
            } )
          } );
        }
      }
  );

  ParticleAtom.prototype.addParticle = function( particle ) {

    var thisAtom = this;

    if ( particle.type === 'proton' ) {
      this.protons.add( particle );
      this.reconfigureNucleus( true );
      particle.once( 'change:userControlled', function( userControlledParticle, userControlled ) {
        if ( userControlled && thisAtom.protons.contains( userControlledParticle ) ) {
          thisAtom.protons.remove( userControlledParticle );
          thisAtom.reconfigureNucleus( true );
        }
      } );
    }
    else if ( particle.type === 'neutron' ) {
      this.neutrons.add( particle );
      this.reconfigureNucleus( true );
      particle.once( 'change:userControlled', function( userControlledParticle, userControlled ) {
        if ( userControlled && thisAtom.neutrons.contains( userControlledParticle ) ) {
          thisAtom.neutrons.remove( userControlledParticle );
          thisAtom.reconfigureNucleus( true );
        }
      } );
    }
    else if ( particle.type === 'electron' ) {
      this.electrons.add( particle );
      // Find an open position in the electron shell.
      var openPositions = this.electronPositions.filter( function( electronPosition ) {
        return ( electronPosition.electron === null )
      } );
      var sortedOpenPositions = openPositions.sort( function( p1, p2 ) {
        // Sort first by distance to particle.
        return( Utils.distanceBetweenPoints( particle.position.x, particle.position.y, p1.position.x, p1.position.y ) -
                Utils.distanceBetweenPoints( particle.position.x, particle.position.y, p2.position.x, p2.position.y ));
      } );
      var sortedOpenPositions = sortedOpenPositions.sort( function( p1, p2 ) {
        // Sort second to put the inner shell positions at the front.
        return( Math.round( Utils.distanceBetweenPoints( thisAtom.position.x, thisAtom.position.y, p1.position.x, p1.position.y ) -
                            Utils.distanceBetweenPoints( thisAtom.position.x, thisAtom.position.y, p2.position.x, p2.position.y ) ) );
      } );

      if ( sortedOpenPositions.length === 0 ) {
        console.log( "Error: No open electron positions." );
      }
      sortedOpenPositions[0].electron = particle;
      particle.destination = sortedOpenPositions[ 0 ].position;
      particle.once( 'change:userControlled', function( userControlledElectron, userControlled ) {
        if ( userControlled && thisAtom.neutrons.contains( userControlledElectron ) ) {
          thisAtom.electrons.electrons( userControlledElectron );
          _.each( thisAtom.electronPositions, function( electronPosition ) {
            if ( electronPosition.electron === userControlledElectron ) {
              electronPosition.electron = null;
            }
          } );
        }
      } );
    }
    else {
      console.log( "Error: Ignoring unexpected particle type." );
    }
  };

  ParticleAtom.prototype.removeParticle = function( particleType ) {
    // TODO: Need to figure out how to remove the user controlled listener that was added when the particle was added to the atom.
    var thisAtom = this;

    var particle;
    if ( particleType === 'proton' ) {
      particle = this.protons.pop();
      this.reconfigureNucleus( true );
    }
    else if ( particleType === 'neutron' ) {
      particle = this.neutrons.pop();
      this.reconfigureNucleus( true );
    }
    else if ( particleType === 'electron' ) {
      particle = this.electrons.pop();
    }
    else {
      console.log( "Error: Ignoring request to remove unknown particle type." );
    }
    return particle;
  }

  ParticleAtom.prototype.getWeight = function() {
    return this.protons.length + this.neutrons.length;
  };

  ParticleAtom.prototype.getCharge = function() {
    return this.protons.length - this.electrons.length;
  };

  ParticleAtom.prototype.reconfigureNucleus = function( moveImmediately ) {

    // Convenience variables.
    var centerX = this.position.x;
    var centerY = this.position.y;
    var nucleonRadius = SharedConstants.NUCLEON_RADIUS;
    var angle, distFromCenter;

    var nucleons = [];
    for ( var i = 0; i < this.protons.length; i++ ) {
      nucleons.push( this.protons.at( i ) );
    }
    for ( i = 0; i < this.neutrons.length; i++ ) {
      nucleons.push( this.neutrons.at( i ) );
    }

    if ( nucleons.length === 1 ) {
      // There is only one nucleon present, so place it in the center
      // of the atom.
      nucleons[0].destination = new Vector2( centerX, centerY );
    }
    else if ( nucleons.length === 2 ) {
      // Two nucleons - place them side by side with their meeting point in the center.
      angle = Math.random() * 2 * Math.PI;
      nucleons[0].destination = new Vector2( centerX + nucleonRadius * Math.cos( angle ), centerY + nucleonRadius * Math.sin( angle ) );
      nucleons[1].destination = new Vector2( centerX - nucleonRadius * Math.cos( angle ), centerY - nucleonRadius * Math.sin( angle ) );
    }
    else if ( nucleons.length === 3 ) {
      // Three nucleons - form a triangle where they all touch.
      angle = Math.random() * 2 * Math.PI;
      distFromCenter = nucleonRadius * 1.155;
      nucleons[0].destination = new Vector2( centerX + distFromCenter * Math.cos( angle ),
                                             centerY + distFromCenter * Math.sin( angle ) );
      nucleons[1].destination = new Vector2( centerX + distFromCenter * Math.cos( angle + 2 * Math.PI / 3 ),
                                             centerY + distFromCenter * Math.sin( angle + 2 * Math.PI / 3 ) );
      nucleons[2].destination = new Vector2( centerX + distFromCenter * Math.cos( angle + 4 * Math.PI / 3 ),
                                             centerY + distFromCenter * Math.sin( angle + 4 * Math.PI / 3 ) );
    }
    else if ( nucleons.length === 4 ) {
      // Four nucleons - make a sort of diamond shape with some overlap.
      angle = Math.random() * 2 * Math.PI;
      nucleons[0].destination = new Vector2( centerX + nucleonRadius * Math.cos( angle ), centerY + nucleonRadius * Math.sin( angle ) );
      nucleons[2].destination = new Vector2( centerX - nucleonRadius * Math.cos( angle ), centerY - nucleonRadius * Math.sin( angle ) );
      distFromCenter = nucleonRadius * 2 * Math.cos( Math.PI / 3 );
      nucleons[1].destination = new Vector2( centerX + distFromCenter * Math.cos( angle + Math.PI / 2 ),
                                             centerY + distFromCenter * Math.sin( angle + Math.PI / 2 ) );
      nucleons[3].destination = new Vector2( centerX - distFromCenter * Math.cos( angle + Math.PI / 2 ),
                                             centerY - distFromCenter * Math.sin( angle + Math.PI / 2 ) );
    }
    else if ( nucleons.length >= 5 ) {
      // This is a generalized algorithm that should work for five or
      // more nucleons.
      var placementRadius = 0;
      var numAtThisRadius = 1;
      var level = 0;
      var placementAngle = 0;
      var placementAngleDelta = 0;
      for ( var i = 0; i < nucleons.length; i++ ) {
        nucleons[i].destination = new Vector2( centerX + placementRadius * Math.cos( placementAngle ),
                                               centerY + placementRadius * Math.sin( placementAngle ) );
        numAtThisRadius--;
        if ( numAtThisRadius > 0 ) {
          // Stay at the same radius and update the placement angle.
          placementAngle += placementAngleDelta;
        }
        else {
          // Move out to the next radius.
          level++;
          placementRadius += nucleonRadius * 1.35 / level;
          placementAngle += Math.PI / 8; // Arbitrary value chosen based on looks.
          numAtThisRadius = Math.floor( placementRadius * Math.PI / nucleonRadius );
          placementAngleDelta = 2 * Math.PI / numAtThisRadius;
        }
      }


      //WARNING: THIS IS A SPECIAL CASE FOR HANDLING A CERTAIN ISOTOPE OF LITHIUM
      //Make this isotope of lithium look better, some of the neutrons overlap
      //too much for discerning in the game mode
      // TODO: Integrate this, which was commented out when initially ported from Java.
//            if ( this.nucleons.length == 7 && neutrons.size() == 4 ) {
//                neutron = neutrons.get( neutrons.size() - 1 );
//                neutron.setDestination(
//                        neutron.getDestination().getX(),
//                        neutron.getDestination().getY() - 3 );
//            }
    }
    this.trigger( 'reconfigureNucleus' );

    //If the particles shouldn't be animating, they should immediately move to their destination
//        if ( moveImmediately ) {
//            for ( SphericalParticle nucleon : nucleons
//        )
//            {
//                nucleon.moveToDestination();
//            }
//        }
  };

  return ParticleAtom;
} );