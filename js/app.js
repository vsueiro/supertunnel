let app = {

  options : {

    firstPerson : false,

  },

  element : document.querySelector( '.app' ),

  elements : {

    findButton      : document.querySelectorAll( '.find'                   ),
    nextButton      : document.querySelectorAll( '.next'                   ),
    trackButton     : document.querySelector(    '.track'                  ),
    background      : document.querySelector(    '.background'             ),
    canvas          : document.querySelector(    '.canvas'                 ),
    form            : document.querySelector(    'form'                    ),
    address         : document.querySelector(    'input[name="address"]'   ),
    compassNeedle   : document.querySelector(    '.needle'                 ),
    area            : document.querySelector(    '.draggable-area'         ),
    handle          : document.querySelector(    '.draggable-handle'       ),

  },

  data : {

    orientation : {
      alpha : 0,
      beta  : 0,
      gamma : 0,
    },

    earth : {
      radius : {
        crust : 6371
      }
    },

    user : {
      latitude : 0,
      longitude : 0
    },

    load : () => {

      // Gets countries geometries
      fetch( './assets/countries-lo.json' )
        .then( response => response.json() )
        .then( json => {

          app.data.countries = json;
          app.initialize();

        } );

    }

  },

  color : ( name ) => {

    // Gets color from CSS variable
    let style = getComputedStyle( document.documentElement );
    let value = style.getPropertyValue( '--' + name ).trim();
    return value

  },

  three : {

    renderer       : undefined,
    camera         : undefined,
    scene          : undefined,
    controls       : undefined,
    raycaster      : undefined,

    tunnel         : undefined, // Group
    cylinder       : undefined,
    chord          : undefined,

    land           : undefined, // Group
    countries      : undefined,

    earth          : undefined, // Group
    sphere         : undefined,

    create : {

      cylinder : () => {

        let geometry = new THREE.CylinderGeometry(
          app.data.earth.radius.crust / 40,
          app.data.earth.radius.crust / 40,
          app.data.earth.radius.crust * 2,
          6,
          32
        );

        // Rotates around end, not center
        geometry.translate( 0, -app.data.earth.radius.crust, 0);

        let material = new THREE.MeshBasicMaterial( {
            color: app.color( 'accent-100' ),
            wireframe: true,
            opacity: 1,
            transparent: true
        } );

        app.three.cylinder = new THREE.Mesh( geometry, material );

        // Moves the beggining of the cylinder from Earth’s center to the surface, at latitude 0 and longitude 0
        app.three.cylinder.position.y = app.data.earth.radius.crust;

      },

      chord : () => {

        // Creates line from one side of Earth to the other
        let points = [
          new THREE.Vector3( 0,  app.data.earth.radius.crust, 0 ),
          new THREE.Vector3( 0, -app.data.earth.radius.crust, 0 )
        ];

        let geometry = new THREE.BufferGeometry().setFromPoints( points );

        // Rotates around end, not center
        geometry.translate( 0, -app.data.earth.radius.crust, 0);

        let material = new THREE.LineBasicMaterial( { color: 0x00ffff } );

        app.three.chord = new THREE.Line( geometry, material );

        // Moves the beggining of the cylinder from Earth’s center to the surface, at latitude 0 and longitude 0
        app.three.chord.position.y = app.data.earth.radius.crust;

        // Hides chord
        // app.three.chord.visible = false;

      },

      tunnel : () => {

        app.three.tunnel = new THREE.Group();

        app.three.tunnel.add(
          app.three.cylinder,
          app.three.chord,
        );

      },

      sphere : () => {

        // Could be replaced by this for asthethic reasons:
        // https://unpkg.com/three-geojson-geometry@1.1.4/example/graticules/index.html

        // Applies satellite texture for debugging
        // let texture = new THREE.TextureLoader().load( 'https://vsueiro.com/tunnel-simulator/assets/texture.jpg' );

        let geometry = new THREE.SphereGeometry(
          app.data.earth.radius.crust * 0.99,
          16,
          16
        );

        // Rotates sphere so default location is at latitude 0 and longitude 0
        geometry.rotateX( THREE.Math.degToRad( -90 ) );
        geometry.rotateZ( THREE.Math.degToRad(  90 ) );

        let material = new THREE.MeshBasicMaterial( {
          color : app.color( 'neutral-25' ),
          wireframe: true,
          opacity : .25,
          transparent : true
        } );

        // Allows raycaster to detect collision on both sides of the object
        material.side = THREE.DoubleSide;

        app.three.sphere = new THREE.Mesh( geometry, material );

      },

      land : () => {

        // Creates Land group
        app.three.land = new THREE.Group();

        // Increases country scale
        app.three.land.scale.set(
          app.data.earth.radius.crust,
          app.data.earth.radius.crust,
          app.data.earth.radius.crust
        );

        // Rotates sphere so default location is at latitude 0 and longitude 0
        app.three.land.rotation.x = THREE.Math.degToRad( -90 );
        app.three.land.rotation.y = THREE.Math.degToRad( 180 );

      },

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

      countries : ( json ) => {

        // Uses data and logic based on this repository:
        // https://github.com/makc/makc.github.io/tree/master/three.js/map2globe

        app.three.create.map3DGeometry.prototype = Object.create( THREE.Geometry.prototype );

        let countries = app.data.countries;

        for ( let name in countries ) {

          let geometry = new app.three.create.map3DGeometry( countries[ name ] );

          // Duplicates every face of the geometry
          let faces = [];

          for ( let face of geometry.faces ) {

            let newFace = face.clone();
            newFace.materialIndex = 1;
            faces.push( newFace );

          }

          // Adds the newly cloned face to array of original faces
          for ( let face of faces )
            geometry.faces.push( face );

          // Creates list of two materials
          let materials = [

            // Internal-facing color
            new THREE.MeshBasicMaterial( { color: app.color( 'neutral-50' ) } ),

            // External-facing color
            new THREE.MeshBasicMaterial( { color: app.color( 'neutral-75' ) } ),

          ];

          // Applies each material on one side of the surface
          materials[ 0 ].side = THREE.BackSide;
          materials[ 1 ].side = THREE.FrontSide;

          // Groups all countries within the `land` group
          app.three.land.add( countries[ name ].mesh = new THREE.Mesh( geometry, materials ) );

          // Assigns country name to mesh (to be retrieved by raycaster collision)
          countries[ name ].mesh.name = name;

        }

      },

      earth : () => {

        app.three.earth = new THREE.Group();

        app.three.earth.add(
          app.three.sphere,
          app.three.land
        );

      },

      universe : () => {

        app.three.universe = new THREE.Group();

        app.three.universe.add(
          app.three.tunnel,
          app.three.earth,
        );

        // Rotates all elements so Earth poles are on the Y axis
        app.three.universe.rotation.x = THREE.Math.degToRad( 90 );

      },

      renderer : () => {

        // Creates renderer with transparent background
        app.three.renderer = new THREE.WebGLRenderer( {
          canvas : app.elements.canvas,
          alpha : true,
          logarithmicDepthBuffer: true // prevents z fighting
        } );

      },

      camera : () => {

        // Creates camera
        app.three.camera = new THREE.PerspectiveCamera( 50, 1, .1, app.data.earth.radius.crust * 30 );
        app.three.camera.position.z = app.data.earth.radius.crust * 3;

      },

      controls : () => {

        // Makes camera move with mouse
        app.three.controls = new THREE.OrbitControls(
          app.three.camera,
          app.elements.canvas
        );

        // Makes camera move automatically and with inertia
        app.three.controls.enableDamping = true;
        app.three.controls.enableZoom    = false;
        app.three.controls.enablePan     = false;

      },

      scene : () => {

        // Creates scene
        app.three.scene = new THREE.Scene();

        app.three.scene.add(
          app.three.universe
        );

      },

      raycaster : () => {

        // Creates line to be used for collision check with countries
        app.three.raycaster = new THREE.Raycaster();

      }

    },

    initialize : () => {

      // Creates Tunnel group
      app.three.create.cylinder();
      app.three.create.chord();
      app.three.create.tunnel();

      // Creates Land group
      app.three.create.land();
      app.three.create.countries();

      // Creates Earth group
      app.three.create.sphere();
      app.three.create.earth();

      // Creates Universe group
      app.three.create.universe();

      // Creates standard objects
      app.three.create.renderer();
      app.three.create.camera();
      app.three.create.controls();
      app.three.create.scene();
      app.three.create.raycaster();

      // Debugs axes
      app.three.scene.add( new THREE.AxesHelper( 1000 ) );

      // Animates 3D elements
      requestAnimationFrame( app.three.render );

    },

    update : {

      dimensions : () => {

        let c = app.elements.canvas;

        // If canvas dimensions are different from window dimensios
        if ( c.width !== c.clientWidth || c.height !== c.clientHeight ) {

          // Resizes canvas
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

      tunnel : () => {

        // Enables first-person view
        if ( app.options.firstPerson ) {

          // Rotates Earth to always match real-world North
          app.three.earth.rotation.y    = THREE.Math.degToRad( app.data.orientation.alpha * -1 );

          // Rotates tunnel on two axes (based on device motion)
          app.three.cylinder.rotation.x = THREE.Math.degToRad( app.data.orientation.beta  );
          app.three.cylinder.rotation.z = THREE.Math.degToRad( app.data.orientation.gamma );
          app.three.chord.rotation.x    = THREE.Math.degToRad( app.data.orientation.beta  );
          app.three.chord.rotation.z    = THREE.Math.degToRad( app.data.orientation.gamma );
          app.three.tunnel.rotation.y   = THREE.Math.degToRad( 0 );

          // // Deactivates camera controls
          app.three.controls.enabled = false;

          // Resets camera position
          app.three.camera.position.set( 0, 0, app.data.earth.radius.crust * 3 );
          app.three.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

          // Resets handle control
          app.drag.reset();

        } else { // Enables third-person view

          // Keeps Earth still
          app.three.earth.rotation.y    = THREE.Math.degToRad( 0 );

          // Rotates tunnel on two axes (based on drag control)
          app.three.cylinder.rotation.x = THREE.Math.degToRad( app.drag.value.y );
          app.three.cylinder.rotation.z = THREE.Math.degToRad( app.drag.value.x );
          app.three.chord.rotation.x    = THREE.Math.degToRad( app.drag.value.y );
          app.three.chord.rotation.z    = THREE.Math.degToRad( app.drag.value.x );
          app.three.tunnel.rotation.y   = THREE.Math.degToRad( 0 );

          // Rotates tunnel on all axes (based on device motion)
          // app.three.cylinder.rotation.x = THREE.Math.degToRad( app.data.orientation.beta  );
          // app.three.tunnel.rotation.y   = THREE.Math.degToRad( app.data.orientation.alpha );
          // app.three.cylinder.rotation.z = THREE.Math.degToRad( app.data.orientation.gamma );

          // Activates camera controls
          app.three.controls.enabled = true;

        }

      },

      coordinates : () => {

        // Rotates sphere so the user location coincides with the tunnel beginning
        app.three.sphere.rotation.x = THREE.Math.degToRad( app.data.user.latitude );
        app.three.sphere.rotation.z = THREE.Math.degToRad( app.data.user.longitude );

        // Rotates countries so the user location coincides with the tunnel beginning
        app.three.land.rotation.x = THREE.Math.degToRad( -90 + app.data.user.latitude );
        app.three.land.rotation.y = THREE.Math.degToRad( 180 + ( app.data.user.longitude * -1 ) );

      },

      raycaster : () => {

        // Gets position & direction of chord (center of tunnel)
        let chordPosition = app.three.chord.geometry.getAttribute( 'position' );

        // Converts local position to world position
        let vertexOrigin = new THREE.Vector3();
        vertexOrigin.fromBufferAttribute( chordPosition, 0 );

        let vertexDestination = new THREE.Vector3();
        vertexDestination.fromBufferAttribute( chordPosition, 1 );

        let worldOrigin      = app.three.chord.localToWorld( vertexOrigin );
        let worldDestination = app.three.chord.localToWorld( vertexDestination );
        let chordDirection   = worldDestination.sub(worldOrigin).normalize();

        // Makes raycaster match the position and angle of the tunnel
        app.three.raycaster.set( worldOrigin, chordDirection );

      },

      collision : () => {

        let matches = [];
        let found = {};

        // Checks collision of chord (tunnel center) with every country
        for ( let country of app.three.land.children ) {

          let intersections = app.three.raycaster.intersectObject( country );

          // If ray instersects with anything
          if ( intersections.length > 0 ) {

            for ( let intersection of intersections )
              matches.push( intersection )

          }

        }

        // Identifies origin and destination countries

        for ( let match of matches ) {

          if ( match.distance < 100 ) {

            // Found origin
            found.origin = true;

            // Sets this country as origin
            app.element.dataset.origin = match.object.name;

          }

          if ( match.distance > 1000 ) {

            // Found destination
            found.destination = true;

            // Sets this country as destination
            app.element.dataset.destination = match.object.name;
            app.element.dataset.distance    = match.distance;

          }

        }

        if ( !found.origin ) {

          // Calculates distance until crust on the other side
          let intersections = app.three.raycaster.intersectObject( app.three.sphere );

          // If ray instersects with anything
          if ( intersections.length > 0 ) {

            // Gets farthest intersection
            intersection = intersections[ intersections.length -1 ]

            // Stores distance
            app.element.dataset.distance = intersection.distance;

          }

        }

      }

    },

    render : ( time ) => {

      // Makes canvas responsive
      app.three.update.dimensions();

      // Controls tunnel using motion sensor
      app.three.update.tunnel();

      // Rotates Earth or Tunnel to match origin latitude and longitude
      app.three.update.coordinates();

      // Updates raycaster position to match chord’s
      app.three.update.raycaster();

      // Identifies origin country and destination country
      app.three.update.collision();

      // Makes camera orbit
      app.three.controls.update();

      // Updates text labels on screen
      // app.labels.update();

      app.three.renderer.render(
        app.three.scene,
        app.three.camera
      );

      // Enables recursion (this function calls itself to draw frames of 3D animation)
      requestAnimationFrame( app.three.render );

    },

  },

  orientation : {

    handle : () => {

      // Implements world-based calibration on iOS (alpha is 0 when pointing North), based on:
      // https://www.w3.org/2008/geolocation/wiki/images/e/e0/Device_Orientation_%27alpha%27_Calibration-_Implementation_Status_and_Challenges.pdf

      let north, offset;

      // If alpha is absolute (0 points North)
      if ( event.absolute === true ) {

        // Uses incoming value
        north = event.alpha;

      } else { // If alpha is relative

        // Calibrates alpha to make it North-based
        offset = event.webkitCompassHeading || 0;
        north  = 360 - offset;

        if ( north < 0 )
          north += 360;

      }



      // Prints values for debugging
      let pre = document.querySelector( 'pre' )

      pre.textContent = ''

      pre.textContent += 'origin:      ' + ( app.element.dataset.origin      || '' ) + '\n';
      pre.textContent += 'destination: ' + ( app.element.dataset.destination || '' ) + '\n';
      pre.textContent += 'distance:    ' + ( app.element.dataset.distance    || '' ) + '\n';
      pre.textContent += '\n';
      pre.textContent += 'north:       ' + north.toFixed(2) + '\n';
      pre.textContent += 'alpha:       ' + event.alpha.toFixed(2) + '\n';
      pre.textContent += 'beta:        ' + event.beta.toFixed(2)  + '\n';
      pre.textContent += 'gamma:       ' + event.gamma.toFixed(2) + '\n';
      pre.textContent += '\n';
      pre.textContent += 'absolute:    ' + event.absolute;
      pre.textContent += '\n';
      pre.textContent += 'compass:     ' + event.webkitCompassHeading + '\n';

      // Updates values to be used by render method
      app.data.orientation.alpha = north;
      app.data.orientation.beta  = event.beta;
      app.data.orientation.gamma = event.gamma * -1;

    },

    request : () => {

      // Requests permission for iOS 13+ devices
      if ( DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function' ) {

        DeviceMotionEvent.requestPermission()
        .then( response => {

          if ( response == 'granted' ) {

            // Enables orientationControl
            // app.options.orientationControl = true;
            // app.steps.next()

            window.addEventListener( 'deviceorientation', app.orientation.handle );

          }

        } );

      }

    }

  },

  geolocation : {

    success : ( position ) => {

      app.element.dataset.geolocation = 'located';

      app.data.user.latitude  = position.coords.latitude;
      app.data.user.longitude = position.coords.longitude;

      app.labels.update.coordinates();

    },

    error : () => {

      app.element.dataset.geolocation = 'unlocated';

      window.alert( 'Unable to find your location.' );

    },

    request : () => {

      app.element.dataset.geolocation = 'locating';

      if ( navigator.geolocation ) {

        navigator.geolocation.getCurrentPosition(
          app.geolocation.success,
          app.geolocation.error
        );

      } else {

        app.geolocation.error();

      }

    }

  },

  drag : {

    grabbing  : false, // Flag is true while grabbing handle
    range     : 60,    // In unsigned decimal degress
    tolerance : .05,   // 5% tolerance until handle snaps to the center of the chart

    value : {

      x : 0, // Float from -90 to 90
      y : 0, // Float from -90 to 90

    },

    position : {

      initial : {

        x    : undefined, // Cursor position (in pixels) relative to viewport
        y    : undefined, // Cursor position (in pixels) relative to viewport
        left : undefined, // Distance (in pixels) relative to parent
        top  : undefined, // Distance (in pixels) relative to parent

      },

      offset : {

        x    : undefined, // Distance (in pixels) relative to initial position
        y    : undefined, // Distance (in pixels) relative to initial position

      },

      current : {

        x    : undefined, // Cursor position (in pixels) relative to viewport
        y    : undefined, // Cursor position (in pixels) relative to viewport
        left : undefined, // Distance (in pixels) relative to parent
        top  : undefined, // Distance (in pixels) relative to parent

        percentage : {
          left : undefined, // Distance (in percentage) relative to parent
          top  : undefined, // Distance (in percentage) relative to parent
        }

      },

    },

    start : () => {

      if ( event.target === app.elements.handle ) {

        app.drag.grabbing = true;
        app.element.dataset.grabbing = true;

        // Gets initial position of mouse pointer or finger
        if ( event.type === 'touchstart' ) {

          app.drag.position.initial.x = event.touches[ 0 ].clientX;
          app.drag.position.initial.y = event.touches[ 0 ].clientY;

        } else {

          app.drag.position.initial.x = event.clientX;
          app.drag.position.initial.y = event.clientY;

        }

        app.drag.position.initial.left = app.elements.handle.offsetLeft;
        app.drag.position.initial.top  = app.elements.handle.offsetTop;

      }

    },

    move : () => {

      if ( app.drag.grabbing ) {

        // Gets current position of mouse pointer or finger
        if ( event.type === 'touchmove' ) {

          app.drag.position.current.x = event.touches[ 0 ].clientX;
          app.drag.position.current.y = event.touches[ 0 ].clientY;

        } else {

          app.drag.position.current.x = event.clientX;
          app.drag.position.current.y = event.clientY;

        }

        // Calculates offset (in pixels)
        app.drag.position.offset.x = app.drag.position.current.x - app.drag.position.initial.x;
        app.drag.position.offset.y = app.drag.position.current.y - app.drag.position.initial.y;

        // Calculates left and top distances (in pixels) related to parent
        app.drag.position.current.left = app.drag.position.initial.left + app.drag.position.offset.x;
        app.drag.position.current.top  = app.drag.position.initial.top  + app.drag.position.offset.y;

        // Constrains values
        if ( app.drag.position.current.left < 0 ) {
          app.drag.position.current.left = 0
        }

        if ( app.drag.position.current.left > app.elements.area.offsetWidth ) {
          app.drag.position.current.left = app.elements.area.offsetWidth
        }

        if ( app.drag.position.current.top < 0 ) {
          app.drag.position.current.top = 0
        }

        if ( app.drag.position.current.top > app.elements.area.offsetHeight ) {
          app.drag.position.current.top = app.elements.area.offsetHeight
        }

        // Snaps to the center if it’s within a close range (-5% to 5%)
        if (
          app.drag.position.current.left > app.elements.area.offsetWidth * ( .5 - app.drag.tolerance ) &&
          app.drag.position.current.left < app.elements.area.offsetWidth * ( .5 + app.drag.tolerance ) &&
          app.drag.position.current.top > app.elements.area.offsetHeight * ( .5 - app.drag.tolerance ) &&
          app.drag.position.current.top < app.elements.area.offsetHeight * ( .5 + app.drag.tolerance )
        ) {
          app.drag.position.current.left = app.elements.area.offsetWidth * .5
          app.drag.position.current.top = app.elements.area.offsetHeight * .5
        }

        // Calculates left and top distances (in percentage) related to parent
        app.drag.position.current.percentage.left = 100 * app.drag.position.current.left / app.elements.area.offsetWidth;
        app.drag.position.current.percentage.top  = 100 * app.drag.position.current.top  / app.elements.area.offsetHeight;

        // Sets top and left distances (in percentage)
        app.elements.handle.style.left = app.drag.position.current.percentage.left + '%';
        app.elements.handle.style.top  = app.drag.position.current.percentage.top  + '%';

        // Calculates values as if each axis was a divergent range input (from -N to +N)
        app.drag.value.x = ( app.drag.position.current.percentage.left - 50 ) / 50 * app.drag.range;
        app.drag.value.y = ( app.drag.position.current.percentage.top - 50 ) / 50 * -app.drag.range;

        // Updates angle label with new values
        app.labels.update.direction();

      }

    },

    end : () => {

      app.drag.grabbing = false;
      app.element.dataset.grabbing = false;

    },

    reset : () => {

      // Sets top and left distances (in percentage)
      app.elements.handle.style.left = '50%';
      app.elements.handle.style.top  = '50%';

      // Calculates values as if each axis was a divergent range input (from -N to +N)
      app.drag.value.x = 0;
      app.drag.value.y = 0;

      // Updates angle label with original values
      app.labels.update.direction();

    }

  },

  labels : {

    coordinates : document.querySelector( '.label-coordinates' ),
    direction   : document.querySelector( '.label-direction'   ),

    update : {

      coordinates : () => {

        let lat = app.data.user.latitude;
        let lon = app.data.user.longitude;

        // Creates human-readable string from coordinates
        let label = '';

        if ( lat >= 0 )
          label += Math.round( lat ) + '°N, ';
        else
          label += Math.round( lat * -1 ) + '°S, ';

        if ( lon >= 0 )
          label += Math.round( lon ) + '°E';
        else
          label += Math.round( lon * -1 ) + '°W';

        // Updates coordinates label with new values
        app.labels.coordinates.textContent = label;

      },

      direction : () => {

        // Creates human-readable string from angles
        let label = '';

        if ( app.drag.value.y >= 0 )
          label += Math.round( app.drag.value.y ) + '°N, ';
        else
          label += Math.round( app.drag.value.y * -1 ) + '°S, ';

        if ( app.drag.value.x >= 0 )
          label += Math.round( app.drag.value.x ) + '°E';
        else
          label += Math.round( app.drag.value.x * -1 ) + '°W';

        // Updates angle label with new values
        app.labels.direction.textContent = label;

      }

    },

    initialize : () => {

      app.labels.update.coordinates();
      app.labels.update.direction();

    }

  },

  events : {

    drag : () => {

      window.addEventListener( 'touchstart', app.drag.start, false);
      window.addEventListener( 'touchmove',  app.drag.move,  false);
      window.addEventListener( 'touchend',   app.drag.end,   false);

      window.addEventListener( 'mousedown',  app.drag.start, false);
      window.addEventListener( 'mousemove',  app.drag.move,  false);
      window.addEventListener( 'mouseup',    app.drag.end,   false);
      window.addEventListener( 'mouseleave', app.drag.end,   false);

    },

    initialize : () => {

      // Enables drag on handle to control tunnel angles on desktop
      app.events.drag();

      // Tracks phone’s motion when clicked
      app.elements.trackButton.addEventListener( 'click', app.orientation.request );

      // Finds user’s location when button is clicked
      app.elements.findButton.forEach( button => button.addEventListener( 'click', app.geolocation.request ) );

    }

  },

  initialize : () => {

    app.three.initialize();
    app.events.initialize();
    app.events.initialize();

  }

}

app.data.load();
