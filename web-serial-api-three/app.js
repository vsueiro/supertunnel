let app = {

  elements : {

    connectButton : document.querySelector( '.connect' ),
    canvas        : document.querySelector( '.canvas' )

  },

  validates : {

    json : function ( string ) {

      try {
        JSON.parse( string );
      } catch ( e ) {
        return false;
      }

      // TODO: Check if it contains all desired properties before returning true

      return true;

    }

  },

  // options : {},

  data : {

    earth : {

      tilt : 23.4365, // degrees

      radius : { // km
        crust : 6371,
        core : {
          inner : 1216,
          outer : 3486,
        }
      }

    },

    incoming : {
      stream : '',
      json : undefined,
    },

    seconds : 0

  },

  get : {

    radians : function( degrees) {
      return degrees * ( Math.PI / 180 )
    }

  },

  three : {

    renderer : undefined,
    camera   : undefined,
    light    : undefined,
    scene    : undefined,

    earth    : undefined, // group

    crust    : undefined,
    tunnel   : undefined,
    core     : {
      inner  : undefined,
      outer  : undefined
    },

    radians : function( degrees ) {

      return degrees * ( Math.PI / 180 )

    },

    resize : function() {

      let c = app.elements.canvas;

      if ( c.width !== c.clientWidth || c.height !== c.clientHeight ) {

        app.three.renderer.setSize(
          c.clientWidth,
          c.clientHeight,
          false
        );

        app.three.camera.aspect = c.clientWidth / c.clientHeight;
        app.three.camera.updateProjectionMatrix();

      }

    },

    render : function( time ) {

      app.data.seconds = time * .001;

      app.three.resize()

      // app.three.tunnel.rotation.x = app.get.radians(189)
      // app.three.tunnel.rotation.z = app.get.radians(90)

      // app.three.tunnel.rotation.x = app.data.seconds
      // app.three.tunnel.rotation.z = app.data.seconds

      let rotation = app.data.seconds / 10
      let tilt = app.get.radians( app.data.earth.tilt )

      app.three.earth.rotation.y = rotation
      app.three.earth.rotation.z = tilt


      // app.three.crust.rotation.y = rotation
      // app.three.core.outer.rotation.y = rotation
      // app.three.core.inner.rotation.y = rotation

      // app.three.crust.rotation.z = tilt
      // app.three.core.outer.rotation.z = tilt
      // app.three.core.inner.rotation.z = tilt

      app.three.renderer.render(
        app.three.scene,
        app.three.camera
      );

      requestAnimationFrame( app.three.render );

    },

    update : function() {
      console.log( app.data.incoming.json )
    },

    initialize : function() {

      app.three.renderer = new THREE.WebGLRenderer({
        canvas : app.elements.canvas,
        alpha : true
      });

      app.three.camera = new THREE.PerspectiveCamera( 50, 1, .1, app.data.earth.radius.crust * 6 );
      app.three.camera.position.z = app.data.earth.radius.crust * 3;

      // app.three.light = new THREE.DirectionalLight( 0xFFFFFF, 1 );
      // app.three.light.position.set( -1, 2, 4 );

      app.three.scene = new THREE.Scene();

      { // Crust

        let material = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          wireframe: true,
          opacity: 0.25,
          transparent: true
        });

        let geometry = new THREE.SphereGeometry( app.data.earth.radius.crust, 16, 16 );

        app.three.crust = new THREE.Mesh( geometry, material );

      }

      { // Tunnel

        let material = new THREE.MeshBasicMaterial({
          color: 0xFF0000,
          wireframe: true,
          opacity: .8,
          transparent: true
        });
        let geometry = new THREE.CylinderGeometry(
          app.data.earth.radius.crust / 50,
          app.data.earth.radius.crust / 50,
          app.data.earth.radius.crust * 2,
          6,
          32,
          true
        );

        // Rotate around end, not center
        // geometry.translate( 0, app.data.earth.radius.crust, 0 );

        app.three.tunnel = new THREE.Mesh( geometry, material );

        // object.translateZ( 10 );

      }

      app.three.earth = new THREE.Group

      app.three.earth.add(
        app.three.crust,
        app.three.tunnel
      )

      /*

      { // Outer core

        let material = new THREE.MeshBasicMaterial({
          color: 0xFFFF00,
          wireframe: true,
          opacity: 0.25,
          transparent: true
        });

        let geometry = new THREE.SphereGeometry( app.data.earth.radius.core.outer, 12, 12 );

        app.three.core.outer = new THREE.Mesh( geometry, material );

      }

      { // Inner core

        let material = new THREE.MeshBasicMaterial({
          color: 0xFF0000,
          wireframe: true,
          opacity: 0.25,
          transparent: true
        });

        let geometry = new THREE.SphereGeometry( app.data.earth.radius.core.inner, 8, 8 );

        app.three.core.inner = new THREE.Mesh( geometry, material );

      }

      */


      // X = red
      // Y = green
      // Z = blue
      app.three.scene.add( new THREE.AxesHelper( 1000 ) );

      app.three.scene.add( app.three.light );
      app.three.scene.add( app.three.earth );
      // app.three.scene.add( app.three.crust );
      // app.three.scene.add( app.three.core.outer );
      // app.three.scene.add( app.three.core.inner );
      // app.three.scene.add( app.three.tunnel );

      requestAnimationFrame( app.three.render );

    }

  },

  serial : {

    split : function() {

      // Split concatenated string by newline character
      let parts = app.data.incoming.stream.split( "\n" );

      // If there is at least one newline character
      if ( parts.length > 1 ) {

        // Stores JSON string in variable
        let string = parts[ 0 ];

        // Checks if it is a valid JSON
        if ( app.validates.json( string ) ) {

          // Parses and store most recent JSON received
          app.data.incoming.json = JSON.parse( string );

          // Call function to handle the newly received data
          app.globe.update();

        }

        // Resets incoming stream (concatenated strings) for next JSON package
        app.data.incoming.stream = parts[ 1 ];

        // Recursion to account for multiple newline characters in string
        app.serial.split();

      }

    },

    connect : function() {

      if ( 'serial' in navigator ) {

        // Begins asynchronous call
        (async() => {

          // Request serial ports using Web Serial API
          const port = await navigator.serial.requestPort();

          // Sets rate to 9600 bits per second (must match Arduino’s)
          await port.open({
            baudRate: 9600
          });

          // Converts messages to strings
          const textDecoder = new TextDecoderStream();
          const readableStreamClosed = port.readable.pipeTo( textDecoder.writable );
          const reader = textDecoder.readable.getReader();

          // Listen to data coming from the serial device
          while ( true ) {

            const { value, done } = await reader.read();

            if ( done ) {

              // Allow the serial port to be closed later
              reader.releaseLock();
              break;

            }

            // Put incoming strings together until it finds a new line
            app.data.incoming.stream += value;
            app.serial.split();

          }


        })();

      }

    }

  },

  events : {

    initialize : function() {

      app.elements.connectButton.addEventListener( 'click', app.serial.connect );

    }

  },

  initialize : function() {

    app.events.initialize()
    app.three.initialize()

  }

}

app.initialize()
