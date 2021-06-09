
let app = {

  elements : {

    connectButton : document.querySelector( '.connect' )

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

  },

  globe : {

    update : function() {
      console.log( app.data.incoming.json )
    },

    initialize : function() {}

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

  }

}

app.initialize()








function main() {
  const canvas = document.querySelector('.canvas');
  const renderer = new THREE.WebGLRenderer({canvas});

  const fov = 75;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  const scene = new THREE.Scene();

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  function makeInstance(geometry, color, x) {
    const material = new THREE.MeshPhongMaterial({color});

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
  }

  const cubes = [
    makeInstance(geometry, 0x44aa88,  0),
    makeInstance(geometry, 0x8844aa, -2),
    makeInstance(geometry, 0xaa8844,  2),
  ];

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render(time) {
    time *= 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cubes.forEach((cube, ndx) => {
      const speed = 1 + ndx * .1;
      const rot = time * speed;
      cube.rotation.x = rot;
      cube.rotation.y = rot;
    });

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
