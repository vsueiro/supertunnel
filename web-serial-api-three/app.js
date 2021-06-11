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

  data : {

    earth : {

      tilt : 23.4365, // decimal degrees

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

    user : { // decimal degrees
      latitude : -23.5505, // south is negative
      longitude : -46.6333 // west is negative
    },

    seconds : 0

  },

  three : {

    renderer : undefined,
    camera   : undefined,
    light    : undefined,
    scene    : undefined,
    controls : undefined,

    crust    : undefined,
    tunnel   : undefined,
    core     : {
      inner  : undefined,
      outer  : undefined
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

      app.three.resize();

      app.data.seconds = time * .001;

      // Values to be updated based on the inclination sensor

      let northsouth = 0; // +90 to -90
      let eastwest = 0; // +90 to -90
      app.three.tunnel.rotation.x = THREE.Math.degToRad( 90 + northsouth );
      app.three.tunnel.rotation.z = THREE.Math.degToRad( eastwest )

      let rotation = app.data.seconds / 10;
      let tilt = THREE.Math.degToRad( app.data.earth.tilt );

      app.three.renderer.render(
        app.three.scene,
        app.three.camera
      );

      app.three.controls.update()
      requestAnimationFrame( app.three.render );

      // Rotate Earth so default location is at latitude and longitude 0
      app.three.crust.rotation.y = THREE.Math.degToRad( -90 )

    },

    update : function() {

      console.log( app.data.incoming.json )

    },

    initialize : function() {

      app.three.renderer = new THREE.WebGLRenderer({
        canvas : app.elements.canvas,
        alpha : true
      });

      app.three.camera = new THREE.PerspectiveCamera( 50, 1, .1, app.data.earth.radius.crust * 30 );
      app.three.camera.position.z = app.data.earth.radius.crust * 3;

      app.three.light = new THREE.DirectionalLight( 0xFFFFFF, 1 );
      app.three.light.position.set( -1, 2, 4 );

      app.three.scene = new THREE.Scene();

      app.three.controls = new THREE.OrbitControls(
        app.three.camera,
        app.elements.canvas
      );

      app.three.controls.autoRotate = true;
      app.three.controls.enableDamping = true;

      { // Crust

        let material = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          wireframe: false,
          opacity: 0.5,
          transparent: true
        });

        material.map = THREE.ImageUtils.loadTexture('texture.jpg')

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
          app.data.earth.radius.crust / 20,
          app.data.earth.radius.crust / 200,
          app.data.earth.radius.crust * 2,
          6,
          32,
          true
        );

        // Rotate around end, not center
        geometry.translate(
          0,
          -app.data.earth.radius.crust,
          0,
        );

        app.three.tunnel = new THREE.Mesh( geometry, material );
        app.three.tunnel.position.z = app.data.earth.radius.crust;

      }

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
      app.three.scene.add( app.three.crust );
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
