let app = {

  element : document.querySelector( '.app' ),

  elements : {

    background    : document.querySelector( '.background'             ),
    canvas        : document.querySelector( '.canvas'                 ),
    connectButton : document.querySelector( '.connect'                ),
    findButton    : document.querySelector( '.find'                   ),
    form          : document.querySelector( 'form'                    ),
    latitude      : document.querySelector( 'input[name="latitude"]'  ),
    longitude     : document.querySelector( 'input[name="longitude"]' ),
    deviceFront   : document.querySelector( '.device-front'           ),
    deviceSide    : document.querySelector( '.device-side'            )

  },

  color : function( name ) {

    // Gets color from CSS variable
    let style = getComputedStyle( document.documentElement );
    let value = style.getPropertyValue( '--' + name ).trim();
    return value

  },

  options : {

    mouseControl : false,
    rotateDrawings : false,

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

    outgoing : {
      origin          : undefined, // country name
      destination     : undefined, // country name
      destinationType : undefined, // (land|water|air)
      distance        : undefined, // in km
    },

    user : {                // In decimal degrees
      latitude  : -33.4489, // south is negative
      longitude : -70.6693  // west is negative
    },

    seconds : 0

  },

  three : {

    renderer       : undefined,
    camera         : undefined,
    scene          : undefined,
    controls       : undefined,
    raycaster      : undefined,
    mouse          : undefined,

    renderer2D     : undefined,
    labels         : {
      distance     : {
        element    : undefined,
        object     : undefined
      },
      destination  : {
        element    : undefined,
        object     : undefined
      },
      origin       : {
        element    : undefined,
        object     : undefined
      }
    },
    markers        : {
      origin       : {
        element    : undefined,
        object     : undefined
      }
    },

    earth          : undefined, // group
    land           : undefined, // group

    stars          : undefined,
    crust          : undefined,
    tunnel         : undefined,
    tunnelGeometry : undefined,
    chord          : undefined,
    core           : {
      inner        : undefined,
      outer        : undefined
    },

    resize : function() {

      let c = app.elements.canvas;

      // If canvas dimensions are different from window dimensios
      if ( c.width !== c.clientWidth || c.height !== c.clientHeight ) {

        // Resizes
        app.three.renderer.setSize(
          c.clientWidth,
          c.clientHeight,
          false
        );

        app.three.renderer2D.setSize(
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

      // Creates a simple time counter (since the animation started)
      app.data.seconds = time * .001;

      // Initializes values to be updated according to inclination sensor
      let northsouth = 0; // +90 to -90
      let eastwest   = 0; // +90 to -90

      if ( app.options.mouseControl ) {

        // Enables mouse control over tunnel direction
        northsouth = app.three.mouse.y * 90;
        eastwest   = app.three.mouse.x * 90;

      }

      if ( app.options.rotateDrawings ) {

        // Animates shovel drawings to rotate accordingly
        app.elements.deviceFront.style.transform = 'rotate(' + eastwest * -1 + 'deg)';
        app.elements.deviceSide.style.transform  = 'rotate(' + northsouth + 'deg)';

      }

      // If there is data coming from the Arduino sensor
      if ( app.data.incoming.json ) {

        // Updates variables
        northsouth = app.data.incoming.json.x;
        eastwest   = - app.data.incoming.json.z;
      }

      // Moves tunnel according to shovel inclination
      app.three.tunnel.rotation.x = THREE.Math.degToRad( 90 + northsouth );
      app.three.chord.rotation.x = THREE.Math.degToRad( 90 + northsouth );

      app.three.tunnel.rotation.z = THREE.Math.degToRad( eastwest );
      app.three.chord.rotation.z = THREE.Math.degToRad( eastwest );

      // Rotates crust so default location is at latitude and longitude 0
      app.three.crust.rotation.y = THREE.Math.degToRad( -90 )

      // Rotates countries so default location is at latitude and longitude 0
      if ( app.three.land ) {
        app.three.land.rotation.y = THREE.Math.degToRad( -180)
      }

      // Rotates crust & countries so it looks like the pivot point is the user location
      if ( app.data.user.latitude && app.data.user.longitude ) {

        // Crust
        app.three.crust.rotation.x = THREE.Math.degToRad( app.data.user.latitude )
        app.three.crust.rotation.y = THREE.Math.degToRad( -90 - app.data.user.longitude )

        // Countries
        if ( app.three.land ) {
          app.three.land.rotation.y = THREE.Math.degToRad( -180 - app.data.user.longitude )
        }

      }

      // Rotates Earth (group) to counter-act previous rotation so OrbitControls work better
      app.three.earth.rotation.x = THREE.Math.degToRad( - app.data.user.latitude )

      // Gets position & direction of chord (center of tunnel)
      let chordPosition = app.three.chord.geometry.getAttribute( 'position' );

      let vertexOrigin = new THREE.Vector3();
      vertexOrigin.fromBufferAttribute( chordPosition, 0 );

      let vertexDestination = new THREE.Vector3();
      vertexDestination.fromBufferAttribute( chordPosition, 1 );

      let worldOrigin = app.three.chord.localToWorld( vertexOrigin );
      let worldDestination = app.three.chord.localToWorld( vertexDestination );
      let chordDirection = worldDestination.sub(worldOrigin).normalize();

      // Makes raycaster match the position and angle of the tunnel
      app.three.raycaster.set( worldOrigin, chordDirection );


      // Checks collision of chord (tunnel center) with every country
      if ( app.three.land ) {

        // Creates flag variable
        let found = false;
        let foundOrigin = false;

        // Calculates objects intersecting the picking ray
        for ( let country of app.three.land.children ) {

          // Reset country highlight
          country.material[0].color.set( app.color( 'neutral-50' ) );
          country.material[1].color.set( app.color( 'neutral-75' ) );

          let intersections = app.three.raycaster.intersectObject( country );

          // If ray instersects with anything
          if ( intersections.length > 0 ) {

            // Get farthest intersections (ignore intersection at user location)
            let intersection = intersections[ intersections.length - 1 ];

            let country = intersection.object.name;
            let distance = intersection.distance;
            let exit = intersection.point;

            // Checks intersection close to user location
            if ( distance < 10 ) {

              foundOrigin = true;

              app.data.outgoing.origin = country;
              app.three.labels.origin.element.textContent = app.data.outgoing.origin;

            }

            // Requires tunnel to be at least 1000 km long
            if ( distance > 1000 ) {

              // Sets flag to true
              found = true;

              // Sets country label
              app.three.labels.destination.element.textContent = country;

              // Sets distance label
              app.three.labels.distance.element.textContent = (parseInt( distance / 100 ) * 100).toLocaleString('en-US') + ' km'

              // Stores data to be sent to device
              app.data.outgoing.destination = country;
              app.data.outgoing.destinationType = 'land';
              app.data.outgoing.distance = parseInt( distance );

              // Shortens tunnel length to match distance until country
              let reduction = distance / ( app.data.earth.radius.crust * 2 );
              app.three.tunnel.scale.set( 1, reduction, 1 );

              // Highlights country
              intersection.object.material[0].color.set( app.color( 'accent-50' ) );
              intersection.object.material[1].color.set( app.color( 'accent-100' ) );

            }

          }

        }

        if ( !found ) {

          // Clears country label
          app.three.labels.destination.element.textContent = '';

          // Removes country from data to be sent to device
          app.data.outgoing.destination = '';

          // Shortens tunnel length to match distance until other side of Earth
          let intersections = app.three.raycaster.intersectObject( app.three.crust );

          // Gets farthest intersections (ignore intersection at user location)
          if ( intersections.length > 0 ) {

            let intersection = intersections[ intersections.length - 1 ];
            let distance = intersection.distance;

            // Requires tunnel to be at least 1000 km long
            if ( distance > 1000 ) {

              let reduction = distance / ( app.data.earth.radius.crust * 2 );
              app.three.tunnel.scale.set( 1, reduction, 1 );

              // Sets distance label
              app.three.labels.distance.element.textContent = (parseInt( distance / 100 ) * 100).toLocaleString('en-US') + ' km'

            } else {

              // Clears distance label
              app.three.labels.distance.element.textContent = ''

            }

            app.data.outgoing.destinationType = 'water';
            app.data.outgoing.distance = -1;

          } else {

            // Means tunnel is not inside Earth

            // Shrinks tunnel completely (so it disappears)
            app.three.tunnel.scale.set( 0, 0, 0 );

            // Clears distance label
            app.three.labels.distance.element.textContent = ''

            app.data.outgoing.destinationType = 'air';
            app.data.outgoing.distance = -1;

          }

        }

        if ( !foundOrigin ) {

          app.data.outgoing.origin = '';
          app.three.labels.origin.element.textContent = app.data.outgoing.origin;

        }

      }

      // Makes camera orbit
      app.three.controls.update();

      app.three.renderer.render(
        app.three.scene,
        app.three.camera
      );
      app.three.renderer2D.render(
        app.three.scene,
        app.three.camera
      );

      // Enables recursion (this function calls itself to draw frames of 3D animation)
      requestAnimationFrame( app.three.render );

    },

    update : function() {

      // Handles data coming from inclination sensor
      console.log( app.data.incoming.json )

    },

    normalizeMouse : function( event ) {

      app.three.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	    app.three.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    },

    create : {

      map3DGeometry : function( data ) {

        THREE.Geometry.call (this);

        // data.vertices = [lat, lon, ...]
        // data.polygons = [[poly indices, hole i-s, ...], ...]
        // data.triangles = [tri i-s, ...]

        let i, uvs = [];
        for (i = 0; i < data.vertices.length; i += 2) {
          let lon = data.vertices[i];
          let lat = data.vertices[i + 1];

          // Colatitude
          let phi = +(90 - lat) * 0.01745329252;

          // Azimuthal angle
          let the = +(180 - lon) * 0.01745329252;

          // Translates into XYZ coordinates
          let wx = Math.sin (the) * Math.sin (phi) * -1;
          let wz = Math.cos (the) * Math.sin (phi);
          let wy = Math.cos (phi);

          // Equirectangular projection
          let wu = 0.25 + lon / 360.0;
          let wv = 0.5 + lat / 180.0;

          this.vertices.push (new THREE.Vector3 (wx, wy, wz));

          uvs.push (new THREE.Vector2 (wu, wv));
        }

        let n = this.vertices.length;

        for (i = 0; i < n; i++) {
          let v = this.vertices[i];
          this.vertices.push (v.clone ().multiplyScalar (0));
        }

        for (i = 0; i < data.triangles.length; i += 3) {
          let a = data.triangles[i];
          let b = data.triangles[i + 1];
          let c = data.triangles[i + 2];

          this.faces.push( new THREE.Face3( a, b, c, [ this.vertices[a], this.vertices[b], this.vertices[c] ] ) );
          this.faceVertexUvs[ 0 ].push( [ uvs[ a ], uvs[ b ], uvs[ c ] ]);
        }

        this.computeFaceNormals ();

        this.boundingSphere = new THREE.Sphere( new THREE.Vector3 (), 1 );

      },

      countries : function( json ) {

        app.data.countries = json

        app.three.create.map3DGeometry.prototype = Object.create( THREE.Geometry.prototype );

        app.three.land = new THREE.Group();
        app.three.land.scale.set(
          app.data.earth.radius.crust,
          app.data.earth.radius.crust,
          app.data.earth.radius.crust
        );

        let countries = app.data.countries

        for ( let name in countries ) {

          let geometry = new app.three.create.map3DGeometry( countries[ name ] );

          // Duplicates every face of the geometry
          let faces = []

          for ( let face of geometry.faces ) {

            let newFace = face.clone();
            newFace.materialIndex = 1;
            faces.push( newFace );

          }

          // Adds the newly cloned face to array of original faces
          for ( let face of faces ) {

            geometry.faces.push( face );

          }

          // Creates list of two materials
          let materials = [

            // Internal-facing color
            new THREE.MeshBasicMaterial( { color: app.color( 'accent-50' ) } ),

            // External-facing color
            new THREE.MeshBasicMaterial( { color: app.color( 'neutral-75' ) } ),

          ];

          materials[0].side = THREE.BackSide;
          materials[1].side = THREE.FrontSide;

          // Groups all countries within the `land` group
          app.three.land.add( countries[ name ].mesh = new THREE.Mesh( geometry, materials ) );

          // Assigns country name to mesh (to be retrieved by raycaster collision)
          countries[name].mesh.name = name;
        }

        app.three.scene.add( app.three.land );

      }

    },

    initialize : function() {

      // Initializes raycaster (a line used to test collisions)
      app.three.raycaster = new THREE.Raycaster();

      // Initializes variable to house mouse position
      app.three.mouse     = new THREE.Vector2();

      { // Countries

        // Gets countries geometries
        fetch( './assets/countries.json' )
         .then( response => response.json() )
         .then( json => app.three.create.countries( json ) )

      }

      { // Crust

        let material = new THREE.MeshBasicMaterial({
          color: app.color( 'neutral-25' ),
          wireframe: true,
          opacity: 0.1,
          transparent: true
        });
        material.side = THREE.DoubleSide;

        // Show satellite texture for debugging
        // material.map = THREE.ImageUtils.loadTexture('../assets/texture.jpg')

        let geometry = new THREE.SphereGeometry(
          app.data.earth.radius.crust * 0.99,
          16,
          16
        );

        app.three.crust = new THREE.Mesh( geometry, material );

      }

      { // Tunnel

        let material = new THREE.MeshBasicMaterial({
          color: app.color( 'accent-100' ),
          wireframe: true,
          opacity: 1,
          transparent: true
        });

        app.three.tunnelGeometry = new THREE.CylinderGeometry(
          app.data.earth.radius.crust / 40,
          app.data.earth.radius.crust / 40,
          app.data.earth.radius.crust * 2,
          6,
          32,
          true
        );

        // Rotates around end, not center
        app.three.tunnelGeometry.translate( 0, -app.data.earth.radius.crust, 0);

        app.three.tunnel = new THREE.Mesh( app.three.tunnelGeometry, material );
        app.three.tunnel.position.z = app.data.earth.radius.crust;

      }

      { // Chord

        let material = new THREE.LineBasicMaterial( { color: 0x0000ff } );

        let points = [
          new THREE.Vector3( 0,  app.data.earth.radius.crust, 0 ),
          new THREE.Vector3( 0, -app.data.earth.radius.crust, 0 )
        ];

        let geometry = new THREE.BufferGeometry().setFromPoints( points );
        geometry.translate( 0, -app.data.earth.radius.crust, 0);

        app.three.chord = new THREE.Line( geometry, material );
        app.three.chord.position.z = app.data.earth.radius.crust;
        app.three.chord.visible = false;

      }

      { // Earth (group)

        app.three.earth = new THREE.Group();
        app.three.earth.add(
          app.three.crust,
          app.three.tunnel,
          app.three.chord
        );

      }

      { // Stars (instances)

        let material = new THREE.MeshBasicMaterial({
          color: app.color( 'neutral-25' )
        });

        let geometry = new THREE.SphereGeometry(
          app.data.earth.radius.crust * 0.01
        );

        let amount = 10000;
        let innerRadius = app.data.earth.radius.crust * 6;
        let outerRadius = app.data.earth.radius.crust * 12;

        // Creates instance
        app.three.stars = new THREE.InstancedMesh( geometry, material, amount );

        let insideCircle = function( coordinates, radius ) {

          let sum = 0;

          sum += Math.pow( coordinates.x, 2 );
          sum += Math.pow( coordinates.y, 2 );
          sum += Math.pow( coordinates.z, 2 );

          let boolean = sum < Math.pow( radius, 2 );

          return boolean;

        }

        let randomPosition = function( max ) {

          let value = ( Math.random() * max * 2 ) - max;

          return parseInt( value );

        }

        let getCoordinates = function() {

          let coordinates = {
            x : randomPosition( outerRadius ),
            y : randomPosition( outerRadius ),
            z : randomPosition( outerRadius ),
          }

          if ( insideCircle( coordinates, outerRadius ) && !insideCircle( coordinates, innerRadius ) ) {

            return coordinates

          } else {

            return getCoordinates()

          }

        }

        for ( let i = 0; i < amount; i++ ) {

          let matrix = new THREE.Matrix4();

          let coordinates = getCoordinates();

          matrix.makeTranslation(
            coordinates.x,
            coordinates.y,
            coordinates.z,
          )

          app.three.stars.setMatrixAt( i, matrix );

        }

      }

      // Begins renderer with transparent background
      app.three.renderer = new THREE.WebGLRenderer({
        canvas : app.elements.canvas,
        alpha : true,
        logarithmicDepthBuffer: true // prevents z fighting
      });

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
      app.three.controls.autoRotateSpeed =   2; // 1 orbit in 30 seconds
      app.three.controls.autoRotateSpeed = .25; // 1 orbit in 240 seconds
      app.three.controls.enableDamping = true;
      app.three.controls.enableZoom = false;

      // Creates labels

      { // Distance label

        app.three.labels.distance.element = document.createElement( 'div' );
        app.three.labels.distance.element.classList.add( 'label', 'label-distance' );

        app.three.labels.distance.object = new THREE.CSS2DObject( app.three.labels.distance.element );
        app.three.labels.distance.object.position.set( 0, app.data.earth.radius.crust * -1, 0 );
        app.three.tunnel.add( app.three.labels.distance.object );

      }

      { // Destination label

        app.three.labels.destination.element = document.createElement( 'div' );
  			app.three.labels.destination.element.classList.add( 'label', 'label-destination' );

  			app.three.labels.destination.object = new THREE.CSS2DObject( app.three.labels.destination.element );
  			app.three.labels.destination.object.position.set( 0, app.data.earth.radius.crust * -2, 0 );
  			app.three.tunnel.add( app.three.labels.destination.object );

      }

      { // Origin label

        app.three.labels.origin.element = document.querySelector( '.label.label-origin' );

        // Marker
        app.three.markers.origin.element = document.createElement( 'div' );
        app.three.markers.origin.element.classList.add( 'marker', 'marker-origin' );

        app.three.markers.origin.object = new THREE.CSS2DObject( app.three.markers.origin.element );
        app.three.markers.origin.object.position.set( 0, 0, 0 );
        app.three.tunnel.add( app.three.markers.origin.object );

      }

      // Creates 2D renderer (to position HTML elements on top of 3D scene)
      app.three.renderer2D = new THREE.CSS2DRenderer();
			app.three.renderer2D.setSize( window.innerWidth, window.innerHeight );

			app.elements.background.appendChild( app.three.renderer2D.domElement );

      // Creates scene
      app.three.scene = new THREE.Scene();
      app.three.scene.add( app.three.stars );
      app.three.scene.add( app.three.earth );


      // Animate 3D elements
      requestAnimationFrame( app.three.render );

    }

  },

  geolocation : {

    found : function( position ) {

      app.data.user.latitude = position.coords.latitude;
      app.data.user.longitude = position.coords.longitude;

      // Updates manual input values to match the retrieved coordinates
      app.elements.latitude.value = app.data.user.latitude;
      app.elements.longitude.value = app.data.user.longitude;

      app.element.dataset.statusGeolocation = 'located';

    },

    error : function() {

      app.element.dataset.statusGeolocation = 'unlocated';

      window.alert(

        'Sorry, there was an error. ' +
        'Please type in your latitude and longitude as decimal degrees ' +
        '(West and South are negative).'

      );

    },

    find : function() {

      app.element.dataset.statusGeolocation = 'locating';

      if ( navigator.geolocation ) {

        navigator.geolocation.getCurrentPosition(
          app.geolocation.found,
          app.geolocation.error
        );

      } else {

        app.geolocation.error();

      }

    },

    submit : () => {

      // Validades coordinates

      let lat = app.elements.latitude.value;
      let lng = app.elements.longitude.value;

      lat = lat.replace( /[^0-9.\-]/g, '');
      lng = lng.replace( /[^0-9.\-]/g, '');

      if ( parseFloat( lat ) > 90 )
        lat = 90

      if ( parseFloat( lat ) < -90 )
        lat = -90

      if ( parseFloat( lng ) > 180 )
        lng = 180

      if ( parseFloat( lng ) < -180 )
        lng = -180

      app.elements.latitude.value = lat;
      app.elements.longitude.value = lng;

      app.data.user.latitude  = lat;
      app.data.user.longitude = lng;

      app.element.dataset.statusGeolocation = 'unlocated';

    }

  },

  serial : {

    split : function() {

      // Splits concatenated string by newline character
      let parts = app.data.incoming.stream.split( "\n" );

      // If there is at least one newline character
      if ( parts.length > 1 ) {

        // Stores JSON string in variable
        let string = parts[ 0 ];

        // Checks if it is a valid JSON
        if ( app.validates.json( string ) ) {

          // Parses and store most recent JSON received
          app.data.incoming.json = JSON.parse( string );

          // Calls function to handle the newly received data
          app.three.update();

        }

        // Resets incoming stream (concatenated strings) for next JSON package
        app.data.incoming.stream = parts[ 1 ];

        // Enabels recursion to account for multiple newline characters in string
        app.serial.split();

      }

    },

    connect : function() {

      if ( 'serial' in navigator ) {

        // Begins asynchronous call
        (async() => {

          // Requests serial ports using Web Serial API
          const port = await navigator.serial.requestPort();

          // Sets rate to 9600 bits per second (must match Arduino’s)
          await port.open({
            baudRate: 9600
          });

          // Converts messages to strings
          const textDecoder = new TextDecoderStream();
          const readableStreamClosed = port.readable.pipeTo( textDecoder.writable );
          const reader = textDecoder.readable.getReader();

          // Listens to data coming from the serial device
          while ( true ) {

            const { value, done } = await reader.read();

            if ( done ) {

              // Allows the serial port to be closed later
              reader.releaseLock();
              break;

            }

            // Puts incoming strings together until it finds a new line
            app.data.incoming.stream += value;
            app.serial.split();

          }


        })();

      }

    }

  },

  events : {

    initialize : function() {

      // Connects to serial port when button is clicked
      app.elements.connectButton.addEventListener( 'click', app.serial.connect );

      // Finds user’s location when button is clicked
      app.elements.findButton.addEventListener( 'click', app.geolocation.find );

      // Handles location form
      app.elements.form.addEventListener( 'submit', function() {

        event.preventDefault();
        app.geolocation.submit();

      }, false );

      // Updates coordinates every time input is changed
      app.elements.latitude.addEventListener(  'change', app.geolocation.submit );
      app.elements.latitude.addEventListener(  'input',  app.geolocation.submit );

      app.elements.longitude.addEventListener( 'change', app.geolocation.submit );
      app.elements.longitude.addEventListener( 'input',  app.geolocation.submit );

      // Calculates mouse position in normalized device coordinates (-1 to +1)
      window.addEventListener( 'mousemove', app.three.normalizeMouse, false );

      // Calculates clicked country
      window.addEventListener( 'click', function() {

        app.three.raycaster.setFromCamera( app.three.mouse, app.three.camera );

        let matches = [];
        let closest;

        if ( app.three.land ) {

          // Calculates countries intersecting the mouse click
          for ( let country of app.three.land.children ) {

            let intersects = app.three.raycaster.intersectObject( country );

            for ( let i = 0; i < intersects.length; i ++ )
              matches.push( intersects[i] );

          }

          // Gets country with shortest distance to camera
          for ( let match of matches ) {

            if ( closest ) {

              if ( match.distance < closest.distance )
                closest = match;

            } else {

              closest = match;

            }

          }

          // Checks if any country was actually clicked
          if ( closest ) {

            // Handles clicked country
            // console.log( closest );

          }

        }

      } );

    }

  },

  initialize : function() {

    app.three.initialize();
    app.events.initialize();

  }

}

// Starts everything
app.initialize();
