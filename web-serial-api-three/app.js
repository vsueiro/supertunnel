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

    incoming : {
      stream : '',
      json : undefined,
    },

    seconds : 0

  },

  three : {

    renderer : undefined,
    camera   : undefined,
    light    : undefined,
    scene    : undefined,

    tunnel   : undefined,

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

      let degrees = 45
      let radians = degrees * ( Math.PI / 180 )

      // app.three.tunnel.rotation.x = radians
      // app.three.tunnel.rotation.z = radians

      app.three.tunnel.rotation.x = app.data.seconds
      app.three.tunnel.rotation.z = app.data.seconds

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

      app.three.camera = new THREE.PerspectiveCamera( 50, 1, .1, 2000 );
      app.three.camera.position.z = 100;

      app.three.light = new THREE.DirectionalLight( 0xFFFFFF, 1 );
      app.three.light.position.set( -1, 2, 4 );

      app.three.scene = new THREE.Scene();

      {

        let material = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
        let geometry = new THREE.CylinderGeometry( 1, 1, 32, 8, 1 );

        // Rotate around end, not center
        geometry.translate( 0, -32/2, 0 );

        app.three.tunnel = new THREE.Mesh( geometry, material );

      }

      app.three.scene.add( app.three.light );
      app.three.scene.add( app.three.tunnel );

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
