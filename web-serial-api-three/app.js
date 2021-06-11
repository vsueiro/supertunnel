let app = {

  elements : {

    canvas        : document.querySelector( '.canvas'  ),
    connectButton : document.querySelector( '.connect' ),
    findButton    : document.querySelector( '.find'    ),

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

      tilt : 23.4365, // In decimal degrees

      radius : { // In km
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

    user : { // In decimal degrees
      latitude : -23.5505, // south is negative
      longitude : -46.6333, // west is negative
    },

    seconds : 0

  },

  three : {

    renderer : undefined,
    camera   : undefined,
    light    : undefined,
    scene    : undefined,
    controls : undefined,

    earth    : undefined,

    crust    : undefined,
    tunnel   : undefined,
    core     : {
      inner  : undefined,
      outer  : undefined
    },

    resize : function() {

      let c = app.elements.canvas;

      // If canvas dimensions are different from window dimensios
      if ( c.width !== c.clientWidth || c.height !== c.clientHeight ) {

        // Resize
        app.three.renderer.setSize(
          c.clientWidth,
          c.clientHeight,
          false
        );

        // Updates camera accordingly
        app.three.camera.aspect = c.clientWidth / c.clientHeight;
        app.three.camera.updateProjectionMatrix();

      }

    },

    render : function( time ) {

      // Makes canvas responsive
      app.three.resize();

      // Just a counter since the animation started
      app.data.seconds = time * .001;

      // Values to be updated based on the inclination sensor
      let northsouth = 0; // +90 to -90
      let eastwest   = 0; // +90 to -90
      app.three.tunnel.rotation.x = THREE.Math.degToRad( 90 + northsouth );
      app.three.tunnel.rotation.z = THREE.Math.degToRad( eastwest );


      app.three.renderer.render(
        app.three.scene,
        app.three.camera
      );

      // Rotates crust so default location is at latitude and longitude 0
      app.three.crust.rotation.y = THREE.Math.degToRad( -90 )

      // Rotates crust so it looks like the pivot point is the user location
      if ( app.data.user.latitude && app.data.user.longitude ) {
        app.three.crust.rotation.x = THREE.Math.degToRad( app.data.user.latitude )
        app.three.crust.rotation.y = THREE.Math.degToRad( -90 - app.data.user.longitude )
      }

      // Rotates Earth (group) to counter-act previous rotation so OrbitControls work better
      app.three.earth.rotation.x = THREE.Math.degToRad( - app.data.user.latitude )

      // Makes camera orbit
      app.three.controls.update();

      // Recursion: this function calls itself to draw frames of 3D animation
      requestAnimationFrame( app.three.render );

    },

    update : function() {

      // Placeholder for handling data coming from inclination sensor
      console.log( app.data.incoming.json )

    },

    initialize : function() {

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

        // Rotates around end, not center
        geometry.translate( 0, -app.data.earth.radius.crust, 0);

        app.three.tunnel = new THREE.Mesh( geometry, material );
        app.three.tunnel.position.z = app.data.earth.radius.crust;

      }

      { // Earth (group)

        app.three.earth = new THREE.Group();
        app.three.earth.add(
          app.three.crust,
          app.three.tunnel
        );

      }

      // Begins renderer with transparent background
      app.three.renderer = new THREE.WebGLRenderer({
        canvas : app.elements.canvas,
        alpha : true
      });

      // Let there be light
      app.three.light = new THREE.DirectionalLight( 0xFFFFFF, 1 );
      app.three.light.position.set( -1, 2, 4 );

      // Creates camera
      app.three.camera = new THREE.PerspectiveCamera( 50, 1, .1, app.data.earth.radius.crust * 30 );
      app.three.camera.position.z = app.data.earth.radius.crust * 3;

      // Makes camera move with mouse
      app.three.controls = new THREE.OrbitControls(
        app.three.camera,
        app.elements.canvas
      );

      // Makes camera move automatically and with inertia
      app.three.controls.autoRotate = true;
      app.three.controls.enableDamping = true;


      // Creates scene
      app.three.scene = new THREE.Scene();
      app.three.scene.add( app.three.light );
      // app.three.scene.add( app.three.crust );
      // app.three.scene.add( app.three.tunnel );
      app.three.scene.add( app.three.earth );

      // Plot axis for debugging
      // X = red
      // Y = green
      // Z = blue
      app.three.scene.add( new THREE.AxesHelper( 1000 ) );

      // Animate 3D elements
      requestAnimationFrame( app.three.render );

    }

  },

  geolocation : {

    found : function() {


      app.data.user.latitude && app.data.user.longitude
      alert( position.coords.latitude, position.coords.longitude );
    },

    error : function() {

      let prompt = window.prompt(

        'Sorry, there was an error. ' +
        'Please type in your latitude and longitude as decimal degrees ' +
        '(West and South are negative):',

        '-23.5505,-46.6333');

      let coordinates = prompt.split(',')

      app.data.user.latitude  = parseFloat( coordinates[ 0 ] );
      app.data.user.longitude = parseFloat( coordinates[ 1 ] );

    },

    find : function() {

      if ( navigator.geolocation ) {

        navigator.geolocation.getCurrentPosition(
          app.geolocation.found,
          app.geolocation.error
        );

      } else {

        app.geolocation.error();

      }

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

      // Connect to serial port when button is clicked
      app.elements.connectButton.addEventListener( 'click', app.serial.connect );

      // Find user’s location when button is clicked
      app.elements.findButton.addEventListener( 'click', app.geolocation.find );

    }

  },

  initialize : function() {

    app.events.initialize()
    app.three.initialize()


  }

}

// Start everything
app.initialize()
