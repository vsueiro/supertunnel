// obj - your object (THREE.Object3D or derived)
// point - the point of rotation (THREE.Vector3)
// axis - the axis of rotation (normalized THREE.Vector3)
// theta - radian value of rotation
// pointIsWorld - boolean indicating the point is in world coordinates (default = false)
function rotateAboutPoint(obj, point, axis, theta, pointIsWorld){
    pointIsWorld = (pointIsWorld === undefined)? false : pointIsWorld;

    if(pointIsWorld){
        obj.parent.localToWorld(obj.position); // compensate for world coordinate
    }

    obj.position.sub(point); // remove the offset
    obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
    obj.position.add(point); // re-add the offset

    if(pointIsWorld){
        obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
    }

    obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

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
      latitude : -23.5505, // south
      longitude : -46.6333 // west
    },

    seconds : 0

  },

  get : {

    radians : function( degrees ) {
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

      app.three.resize();

      app.three.tunnel.rotation.x = app.data.seconds
      app.three.tunnel.rotation.z = app.data.seconds


      // console.log( app.three.tunnel )
      /*
      rotateAboutPoint(
        app.three.tunnel, // obj - your object (THREE.Object3D or derived)
        new THREE.Vector3( 0, 0, 0 ), // point - the point of rotation (THREE.Vector3)
        new THREE.Vector3( 0, 0, 1 ), // axis - the axis of rotation (normalized THREE.Vector3)
        THREE.Math.degToRad( 1 ), // theta - radian value of rotation
        false // pointIsWorld - boolean indicating the point is in world coordinates (default = false)
      )
      */




      let rotation = app.data.seconds / 10;
      let tilt = app.get.radians( app.data.earth.tilt );

      // app.three.earth.rotation.y = rotation
      // app.three.earth.rotation.z = tilt


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

        // object.translateZ( 10 );

      }

      app.three.earth = new THREE.Group();

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

      app.three.earth.add(
        app.three.crust,
        app.three.tunnel
      )

      // X = red
      // Y = green
      // Z = blue
      app.three.scene.add( new THREE.AxesHelper( 1000 ) );

      app.three.scene.add( app.three.light );
      app.three.scene.add( app.three.earth );




      let world = {
        x : new THREE.Vector3(1, 0, 0),
        y : new THREE.Vector3(0, 1, 0),
        z : new THREE.Vector3(0, 0, 1)
      }

      app.three.tunnel.translateY( app.data.earth.radius.crust )

      /*
      // Make a tunnel from user location
      app.three.tunnel.rotateOnWorldAxis(
        world.x,
        THREE.Math.degToRad( 90 - app.data.user.latitude )
      );
      app.three.tunnel.rotateOnWorldAxis(
        world.y,
        THREE.Math.degToRad( app.data.user.longitude )
      );

      */

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
