let app = {

  element : document.querySelector( '.app' ),

  elements : {

    root        : document.documentElement,

    background  : document.querySelector(    '.background'             ),
    foreground  : document.querySelector(    '.foreground'             ),
    header      : document.querySelector(    '.foreground > header'    ),
    steps       : document.querySelector(    '.steps'                  ),
    canvas      : document.querySelector(    '.canvas'                 ),
    compass     : document.querySelector(    '.needle'                 ),
    area        : document.querySelector(    '.draggable-area'         ),
    handle      : document.querySelector(    '.draggable-handle'       ),
    trackButton : document.querySelector(    '.track'                  ),
    download    : document.querySelector(    'a[download]'             ),
    findButton  : document.querySelectorAll( '.find'                   ),
    nextButton  : document.querySelectorAll( '.next'                   ),
    form        : document.querySelectorAll( 'form'                    ),
    address     : document.querySelectorAll( 'input[name="address"]'   ),

  },

  mobile : () => {

    // Returns true if mobile version is currently being displayed
    return window.innerWidth <= 1024;

  },

  data : {

    antipodes : [
      {
        address   : 'Santiago, Chile',
        latitude  : -33.4377756,
        longitude : -70.6504502,
      },
      {
        address   : 'Madrid, Spain',
        latitude  : 40.4167047,
        longitude : -3.7035825,
      },
      {
        address   : 'Lima, Peru',
        latitude  : -12.0621065,
        longitude : -77.0365256,
      },
      {
        address   : 'Jakarta, Indonesia',
        latitude  : -6.1753942,
        longitude : 106.827183,
      },
      {
        address   : 'Honolulu, Hawaii',
        latitude  : 21.304547,
        longitude : -157.855676,
      },
      {
        address   : 'Shanghai, China',
        latitude  : 31.2322758,
        longitude : 121.4692071,
      },
      {
        address   : 'Taipei, Taiwan',
        latitude  : 25.0375198,
        longitude : 121.5636796,
      },
      {
        address   : 'Suva, Fiji',
        latitude  : -18.1415884,
        longitude : 178.4421662,
      },
      {
        address   : 'Nukuʻalofa, Tonga',
        latitude  : -21.1343401,
        longitude : -175.2018085,
      },
      {
        address   : 'French Polynesia',
        latitude  : -17.5373835,
        longitude : -149.5659964,
      },
      {
        address   : 'Ushuaia, Argentina',
        latitude  : -54.8069332,
        longitude : -68.3073246,
      },
      {
        address   : 'Saigon, Vietnam',
        latitude  : 10.7715512,
        longitude : 106.6983801,
      },
      {
        address   : 'Manila, Philippines',
        latitude  : 14.5907332,
        longitude : 120.9809674,
      },
      {
        address   : 'Singapore',
        latitude  : 1.357107,
        longitude : 103.8194992,
      }
    ],

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
      latitude  : 0,
      longitude : 0,
    },

    smooth : ( current, target, factor = 0.25 ) => {

      // Changes current value gradually (making it closer to the target value at every iteration)

      // Calculates gap from current value to target value
      let difference = target - current;

      // Calculates transition “speed”, as defined by factor (1 is abruptly, values closer to 0 are slower)
      let increment  = difference * factor;

      return current + increment;

    },

    load : () => {

      let path = './assets/';

      // Defines high-resolution file by default
      let file = 'countries-hi';

      // Uses low-resolution file if user is on mobile
      if ( app.mobile() )
        file = 'countries-lo';

      // Loads countries geometries
      fetch( path + file + '.json' )
        .then( response => response.json() )
        .then( json => {

          app.data.countries = json;
          app.initialize();

        } );

    }

  },

  parameters : {

    coordinates : false,

    allow : [

      'step',
      'mode',
      'record',
      'latitude',
      'longitude'

    ],

    initialize : () => {

      // Retrieves all parameters of current URL
      let query = window.location.search;
      let parameters = new URLSearchParams( query );

      // Loops through all allowed parameters
      for ( let key of app.parameters.allow ) {

        // Checks if current URL contains one of the allowed parameters
        if ( parameters.has( key ) ) {

          // Checks if at least one of the coordinates below has been set
          if ( key == 'latitude' || key == 'longitude' ) {

            // Changes flag (to prevent default locations from being used)
            app.parameters.coordinates = true;

            // Assigns coordinates to a specific object
            app.data.user[ key ] = parseFloat( parameters.get( key ) );

          }

          // Handles all other parameters as data attributes
          else
            app.element.dataset[ key ] = parameters.get( key );

        }

      }

    }

  },

  color : ( name ) => {

    // Gets color from CSS variable

    let style = getComputedStyle( app.elements.root );
    let value = style.getPropertyValue( '--' + name ).trim();
    return value;

  },

  style : ( element, property, type = 'float' ) => {

    // Gets CSS style of element by property name

    let style = getComputedStyle( element );
    let value = style.getPropertyValue( property );

    if ( type === 'float' )
      return parseFloat( value );

    return value;

  },

  three : {

    create : {

      cylinder : () => {

        let geometry = new THREE.CylinderGeometry(
          app.data.earth.radius.crust / 100,
          app.data.earth.radius.crust / 100,
          app.data.earth.radius.crust * 2,
          6,
          32,
          false
        );

        // Rotates around end, not center
        geometry.translate( 0, -app.data.earth.radius.crust, 0);

        let material = new THREE.MeshBasicMaterial( {
          color: app.color( 'accent-100' ),
          // wireframe: true,
          opacity: 1,
          // transparent: true
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

        let material = new THREE.LineBasicMaterial();

        app.three.chord = new THREE.Line( geometry, material );

        // Moves the beggining of the cylinder from Earth’s center to the surface, at latitude 0 and longitude 0
        app.three.chord.position.y = app.data.earth.radius.crust;

        // Hides chord
        app.three.chord.visible = false;

      },

      tunnel : () => {

        app.three.tunnel = new THREE.Group();

        app.three.tunnel.add(
          app.three.cylinder,
          app.three.chord
        );

      },

      sphere : () => {

        let geometry = new THREE.SphereGeometry(
          app.data.earth.radius.crust,
          36,
          36
        );

        // Rotates sphere so default location is at latitude 0 and longitude 0
        geometry.rotateX( THREE.Math.degToRad( -90 ) );
        geometry.rotateZ( THREE.Math.degToRad(  90 ) );

        let material = new THREE.MeshBasicMaterial();

        // Allows raycaster to detect collision on both sides of the object
        material.side = THREE.DoubleSide;

        app.three.sphere = new THREE.Mesh( geometry, material );

        // Hides sphere (only use it for collision checks)
        app.three.sphere.visible = false;

      },

      graticule : () => {

        // Creates longitude and latitude lines

        // Decreases radius to prevent overlap with countries
        let radius = app.data.earth.radius.crust * .99;

        // Creates one line at every 10 degrees mark
        let widthSegments  = 36 * 2;
        let heightSegments = 36;

        let subtle = new THREE.LineBasicMaterial( {
          color: app.color( 'neutral-25' ),
          opacity: 0.25,
          transparent: true
        } );

        let strong = new THREE.LineBasicMaterial( {
          color: app.color( 'neutral-25' ),
          opacity: 1,
          transparent: true
        } );

        let createArc = ( radius, segments, full ) => {

          let geometry = new THREE.CircleGeometry(
            radius,
            segments,
            Math.PI / 2,
            full ? Math.PI * 2 : Math.PI
          );

          geometry.vertices.shift();

          if ( full )
            geometry.vertices.push( geometry.vertices[ 0 ].clone() );

          return geometry;

        }

        app.three.graticule = new THREE.Group();

        // Creates width segments
        let arcGeometry = createArc( radius, heightSegments, false );
        let widthSector = Math.PI * 2 / widthSegments;

        for ( let i = 0; i < widthSegments; i++ ) {

          // Draws only half of the segments (so they have twice the resolution with half the visual clutter)

          // Checks if index is even
          if ( i % 2 == 0 ) {

            let arcGeometryClone = arcGeometry.clone();
            arcGeometryClone.rotateY( widthSector * i - ( Math.PI / 2 ) );

            let arcLine = new THREE.Line(
              arcGeometryClone,

              // Increses contrast of main lines
              ( i == 0 || i == widthSegments / 2 ? strong : subtle )

            );

            app.three.graticule.add( arcLine );

          }

        }

        // Creates height segments
        let heightSector = Math.PI / heightSegments;

        for ( let i = 1; i < heightSegments; i++ ) {

          // Draws only half of the segments (so they have twice the resolution with half the visual clutter)

          // Checks if index is even
          if ( i % 2 == 0 ) {

            let heightRadius = Math.sin( i * heightSector ) * radius;
            let height       = Math.cos( i * heightSector ) * radius;

            let arcHeightGeometry = createArc( heightRadius, widthSegments, true );
            arcHeightGeometry.rotateX( Math.PI / 2 );
            arcHeightGeometry.translate( 0, height, 0 );

            let arcHeightLine = new THREE.Line(
              arcHeightGeometry,

              // Increses contrast of main lines
              ( i == heightSegments * .5 ? strong : subtle )

            );

            app.three.graticule.add( arcHeightLine );

          }

        }

        // Rotates sphere so default location is at latitude 0 and longitude 0
        app.three.graticule.rotation.x = THREE.Math.degToRad( -90 );

      },

      land : () => {

        // Creates Land group
        app.three.land = new THREE.Group();

        app.three.land.scale.set(
          app.data.earth.radius.crust,
          app.data.earth.radius.crust,
          app.data.earth.radius.crust,
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
          app.three.graticule,
          app.three.land
        );

      },

      stars : () => {

        let material = new THREE.MeshBasicMaterial({
          color: app.color( 'neutral-25' )
        } );

        let geometry = new THREE.SphereGeometry(
          app.data.earth.radius.crust * 0.015
        );

        let amount = 10000;
        let innerRadius = app.data.earth.radius.crust * 6;
        let outerRadius = app.data.earth.radius.crust * 12;

        // Creates instance
        app.three.stars = new THREE.InstancedMesh( geometry, material, amount );

        // Checks if a given point is inside a sphere
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

        // Positions each star at a randon location
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

      },

      universe : () => {

        app.three.universe = new THREE.Group();

        app.three.universe.add(
          app.three.tunnel,
          app.three.earth,
          app.three.stars,
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

      renderer2D : () => {

        app.three.renderer2D = new THREE.CSS2DRenderer();

        app.elements.background.appendChild(
          app.three.renderer2D.domElement
        );

      },

      camera : () => {

        // Creates camera
        app.three.camera = new THREE.PerspectiveCamera( 96, 1, .1, app.data.earth.radius.crust * 30 );

        // Positions it away from Earth (3x its radius)
        // app.three.camera.position.z = app.data.earth.radius.crust * 3;

        // Tilts it slightly so the Equator does not look like a flat horizontal line
        // app.three.camera.position.y = app.data.earth.radius.crust / 3 ;

      },

      controls : () => {

        // Makes camera move with mouse
        app.three.controls = new THREE.OrbitControls(
          app.three.camera,
          app.elements.canvas
        );

        // Makes camera move automatically
        app.three.controls.autoRotate      = true;

        // Defines duration (in seconds) of a complete orbit (at 60fps)
        let duration = 60;
        let fps = 60;
        app.three.controls.autoRotateSpeed = fps / duration;

        // Moves with inertia
        app.three.controls.enableDamping = true;

        // Disables pan and zoom
        app.three.controls.enablePan     = false;
        app.three.controls.enableZoom    = false;

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
      app.three.create.graticule();
      app.three.create.earth();

      // Creates Stars group (of instances)
      app.three.create.stars();

      // Creates Universe group
      app.three.create.universe();

      // Creates standard objects
      app.three.create.renderer();
      app.three.create.camera();
      app.three.create.controls();
      app.three.create.scene();
      app.three.create.raycaster();

      // Sets camera to initial position
      app.three.update.camera( 'reset' );

      // Debugs axes
      // app.three.scene.add( new THREE.AxesHelper( 1000 ) );

      // Creates 2D renderer (to position HTML elements on top of 3D scene)
      app.three.create.renderer2D();

      // Animates 3D elements
      requestAnimationFrame( app.three.render );

      // Removes loading state after 1.2 seconds
      setTimeout( () => {
        app.element.dataset.loading = false;
      }, 1200 )

    },

    update : {

      dimensions : () => {

        // Centers globe within available space on mobile

        // Sets default increase
        let excess = 0;

        // Calculates increase for mobile version
        if ( app.mobile() && app.element.dataset.mode === 'third-person' ) {

          // Prevents centering on step 5 (keeping same position as on step 4)
          let step = app.steps.current() === 5 ? app.steps.element( 4 ) : app.steps.element();

          let height               = {};
          let target               = {};

          height.window            = window.innerHeight;
          height.padding           = app.style( app.elements.foreground, 'padding-bottom' );
          height.top               = app.elements.header.getBoundingClientRect().bottom;
          height.bottom            = height.window - step.offsetHeight - height.padding;
          height.available         = height.bottom - height.top;

          target.center            = height.available / 2 + height.top;
          target.height            = {};
          target.height.pixels     = ( height.window - target.center ) * 2;
          target.height.percentage = target.height.pixels * 100 / height.window

          excess = target.height.percentage - 100;

          // Prevents big changes (e.g., when mobile keyboard opens and viewport shrinks)
          if ( excess > 25 )
            excess = 25;

        }

        // Updates CSS variable to change canvas height
        app.elements.root.style.setProperty( '--excess-height', excess + '%' );

        // Resize canvas drawing dimensions to match new dimension

        let c = app.elements.canvas;

        // Renders more pixels for HD-DPI displays
        let px = window.devicePixelRatio;

        // If canvas dimensions are different from window dimensios
        if ( c.width !== c.clientWidth * px || c.height !== c.clientHeight * px ) {

          // Resizes 3D canvas
          app.three.renderer.setSize(
            Math.floor( c.clientWidth  * px ),
            Math.floor( c.clientHeight * px ),
            false
          );

          // Resizes 2D canvas
          app.three.renderer2D.setSize(
            c.clientWidth,
            c.clientHeight,
            false
          );

        }

      },

      camera : ( reset = false ) => {

        let c = app.elements.canvas;

        // Defines basis field of view for camera
        let fov = 90;

        // Checks if first-person mode is on
        if ( app.element.dataset.mode === 'first-person' ) {

          // Checks if mobile version is on
          if ( app.mobile() ) {

            // Decreases basis field of view on mobile (makes everything appear a bit bigger)
            fov = 60;

          }

          // Hides globe graticule
          app.three.graticule.visible = false;

        } else {

          // Displays globe graticule
          app.three.graticule.visible = true;

        }

        // Visually “scales” fov to match both width and height (diagonal)
        diagonal = ( fov, aspect ) => {
          let length = Math.sqrt( 1 + aspect * aspect );
          return THREE.MathUtils.radToDeg( 2 * Math.atan( Math.tan( THREE.MathUtils.degToRad( fov ) * .5 ) / length ) );
        }

        // Checks if mobile version is on
        if ( app.mobile() ) {

          // Makes scene smaller when there is less space available

          // Gets float that represents current increase of canvas height, in percentage
          let excess = app.style( app.elements.root, '--excess-height' );

          // Defines percentage from which a balance needs to be performed
          let threshold = 18;

          // Prevents scene from increasing
          if ( excess > threshold ) {

            // Balances fov with available height
            fov = fov + ( excess - threshold ) * 1.25;

          }

        }

        // Calculates new fov
        let target = diagonal( fov, app.three.camera.aspect );

        // Defines a “speed” for the transition (1 is abruptly, values closer to 0 are slower)
        let factor = 0.05;

        // Changes fov gradually, to create a growing/shrinking effect
        app.three.camera.fov = app.data.smooth(
          app.three.camera.fov,
          target,
          factor
        );
        if ( reset ) {

          // Positions it away from Earth (3x its radius)
          app.three.camera.position.z = app.data.earth.radius.crust * 3;

          // Sets x rotation to the default position
          app.three.camera.position.x = 0

          // Tilts it slightly so the Equator does not look like a flat horizontal line
          app.three.camera.position.y = app.data.earth.radius.crust / 3;

          // Resets previous tilt on first-person mode, so camera looks straight down
          if ( app.element.dataset.mode === 'first-person' )
            app.three.camera.position.y = 0;

          // Forces camera to look at the center of the scene
          app.three.camera.lookAt( 0, 0, 0 );

        }

        // Updates camera accordingly
        app.three.camera.aspect = c.clientWidth / c.clientHeight;
        app.three.camera.updateProjectionMatrix();

      },

      tunnel : () => {

        // Hides tunnel if device is pointing to the air (not to the ground)
        if ( app.element.dataset.type == 'air' )
          app.three.tunnel.visible = false;
        else
          app.three.tunnel.visible = true;

        // Enables first-person view (or simulates it if records are being played)
        if ( app.element.dataset.mode == 'first-person' || app.orientation.playing ) {

          // Rotates Earth to always match real-world North
          app.three.earth.rotation.y    = THREE.Math.degToRad( app.data.orientation.alpha * -1 );

          // Rotates stars so they behave just like Earth
          app.three.stars.rotation.y    = THREE.Math.degToRad( app.data.orientation.alpha * -1 );

          // Rotates compass needle
          app.elements.compass.style.transform = 'rotate(' + app.data.orientation.alpha + 'deg)';

          // Rotates tunnel on two axes (based on device motion)

          // Changes values gradually
          app.three.cylinder.rotation.x = app.data.smooth(
            app.three.cylinder.rotation.x,
            THREE.Math.degToRad( app.data.orientation.beta )
          );
          app.three.cylinder.rotation.z = app.data.smooth(
            app.three.cylinder.rotation.z,
            THREE.Math.degToRad( app.data.orientation.gamma )
          );
          app.three.chord.rotation.x = app.data.smooth(
            app.three.chord.rotation.x,
            THREE.Math.degToRad( app.data.orientation.beta )
          );
          app.three.chord.rotation.z = app.data.smooth(
            app.three.chord.rotation.z,
            THREE.Math.degToRad( app.data.orientation.gamma )
          );

          // Makes North be up
          app.three.tunnel.rotation.y = THREE.Math.degToRad( 0 );

          // Resets handle control
          app.drag.reset();

          // Deactivates camera controls
          app.three.controls.enabled = false;

          // Resets camera position
          app.three.update.camera( 'reset' );

          // Stores readings on history, if this option is enabled
          if ( app.element.dataset.record == 'true' )
            app.orientation.record()

        }

        // Enables third-person view
        else {

          // Keeps Earth still
          app.three.earth.rotation.y    = THREE.Math.degToRad( 0 );

          // Rests stars rotation
          app.three.stars.rotation.y    = THREE.Math.degToRad( 0 );

          // Rotates tunnel on two axes (based on drag control)

          // Changes values gradually
          app.three.cylinder.rotation.x = app.data.smooth(
            app.three.cylinder.rotation.x,
            THREE.Math.degToRad( app.drag.value.y )
          );
          app.three.cylinder.rotation.z = app.data.smooth(
            app.three.cylinder.rotation.z,
            THREE.Math.degToRad( app.drag.value.x )
          );
          app.three.chord.rotation.x = app.data.smooth(
            app.three.chord.rotation.x,
            THREE.Math.degToRad( app.drag.value.y )
          );
          app.three.chord.rotation.z = app.data.smooth(
            app.three.chord.rotation.z,
            THREE.Math.degToRad( app.drag.value.x )
          );

          // Makes North be up
          app.three.tunnel.rotation.y = THREE.Math.degToRad( 0 );

          // Activates camera controls
          app.three.controls.enabled = true;

        }

      },

      coordinates : () => {

        // Enables first-person view
        if ( app.element.dataset.mode == 'first-person' ) {

          // Rotates Earth to match origin latitude and longitude

          // Rotates sphere so the user location coincides with the tunnel beginning
          app.three.sphere.rotation.x = THREE.Math.degToRad( app.data.user.latitude );
          app.three.sphere.rotation.z = THREE.Math.degToRad( app.data.user.longitude );

          // Rotates graticule so the user location coincides with the tunnel beginning
          app.three.graticule.rotation.x = THREE.Math.degToRad( -90 + app.data.user.latitude );
          app.three.graticule.rotation.y = THREE.Math.degToRad( app.data.user.longitude * -1 );

          // Rotates countries so the user location coincides with the tunnel beginning
          app.three.land.rotation.x = THREE.Math.degToRad( -90 + app.data.user.latitude );
          app.three.land.rotation.y = THREE.Math.degToRad( 180 + ( app.data.user.longitude * -1 ) );

          // Resets Tunnel rotation
          app.three.tunnel.rotation.x = THREE.Math.degToRad( 0 );

        }

        // Enables third-person view
        else {

          // Rotates Earth to match origin longitude

          // Rotates sphere so the user location coincides with the tunnel beginning
          app.three.sphere.rotation.z = THREE.Math.degToRad( app.data.user.longitude );

          // Rotates graticule so the user location coincides with the tunnel beginning
          app.three.graticule.rotation.y = THREE.Math.degToRad( app.data.user.longitude * -1 );

          // Rotates countries so the user location coincides with the tunnel beginning
          app.three.land.rotation.y = THREE.Math.degToRad( 180 + ( app.data.user.longitude * -1 ) );

          // Rotates Tunnel to match origin latitude
          app.three.tunnel.rotation.x = THREE.Math.degToRad( app.data.user.latitude * -1 );

          // Resets Earth latitude rotation
          app.three.sphere.rotation.x = THREE.Math.degToRad( 0 );
          app.three.land.rotation.x = THREE.Math.degToRad( -90 );

          // Resets graticule
          app.three.graticule.rotation.x = THREE.Math.degToRad( -90 );

        }

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

          // Resets country highlight
          country.material[ 0 ].color.set( app.color( 'neutral-50' ) );
          country.material[ 1 ].color.set( app.color( 'neutral-75' ) );

          // Hides all countries on first-person mode
          if ( app.element.dataset.mode === 'first-person' )
            country.visible = false
          else
            country.visible = true

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

            // Highlights country
            match.object.material[ 0 ].color.set( app.color( 'accent-50'  ) );
            match.object.material[ 1 ].color.set( app.color( 'accent-100' ) );

            // Hides all countries on first-person mode
            if ( app.element.dataset.mode === 'first-person' )
              match.object.visible = true

          }

        }

        // Calculates distance until crust on the other side
        let intersections = app.three.raycaster.intersectObject( app.three.sphere );

        // If ray instersects with anything
        if ( intersections.length > 0 ) {

          // Gets farthest intersection
          intersection = intersections[ intersections.length -1 ]

          // Stores distance
          app.element.dataset.distance = parseInt( intersection.distance );

          // Shortens tunnel length to match distance
          let reduction = intersection.distance / ( app.data.earth.radius.crust * 2 );
          app.three.cylinder.scale.set( 1, reduction, 1 );

        } else {

          // Clears distance from data
          app.element.dataset.distance = '';

        }

        if ( !found.origin ) {

          // Clears country from data
          app.element.dataset.origin = '';

        }

        if ( !found.destination ) {

          // Clears country from data
          app.element.dataset.destination = '';

        }

        // Calculates type of destination (land, water or air)
        let type;

        if ( app.element.dataset.distance == '' )
          type = 'air'

        else if ( app.element.dataset.destination !== '' )
          type = 'land'

        else
          type = 'water'

          app.element.dataset.type = type

      }

    },

    render : ( time ) => {

      // Makes canvas responsive
      app.three.update.dimensions();

      // Updates camera
      app.three.update.camera();

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

      // Renders 3D elements
      app.three.renderer.render(
        app.three.scene,
        app.three.camera
      );

      // Renders 2D elements
      app.three.renderer2D.render(
        app.three.scene,
        app.three.camera
      );

      // Updates destination label
      app.labels.update.destination();
      app.labels.update.distance();

      // Enables recursion (this function calls itself to draw frames of 3D animation)
      requestAnimationFrame( app.three.render );

    },

  },

  orientation : {

    download : () => {

      // Converts list of objects to string
      let content = JSON.stringify( app.data.orientation.history );

      // Creates file
      let file = new Blob( [ content ], { type: 'text/plain' } );

      // Populates download link with content
      app.elements.download.href = URL.createObjectURL( file );

      // Creates unique filename from location coordinates and timestamp
      let name = '';

      name += app.data.user.latitude;
      name += '_';
      name += app.data.user.longitude;
      name += '_';
      name += app.data.orientation.history[ 0 ].t;
      name += '.json';

      // Assigns filename to download link
      app.elements.download.download = name;

      // Simulates click on download link
      app.elements.download.click();

      // Stops recording
      app.element.dataset.record = 'false';

    },

    record : ( timestamp = Date.now() ) => {

      // Creates list to house all readings, if it does not exist
      if ( app.data.orientation.history === undefined )
        app.data.orientation.history = [];

      // Calculates time elapsed since first reading, if it exists
      if ( app.data.orientation.history[ 0 ] )
        timestamp = timestamp - app.data.orientation.history[ 0 ].t;

      let reading = {
        t : timestamp,
        a : app.data.orientation.alpha,
        b : app.data.orientation.beta,
        g : app.data.orientation.gamma,
      }

      // Adds most recent reading to history
      app.data.orientation.history.push( reading );

    },

    play : ( file ) => {

      // Defines path that contains records
      let path = './assets/records/';

      // Uses this filename for demo
      file = file || '-23.50929645679305_-46.876645990569784_1626623241011';

      // Splits filename into parts, separated by an underscore
      let parts = file.split( '_' );

      // Extracts coordinates of user location
      let latitude  = parseFloat( parts[ 0 ] );
      let longitude = parseFloat( parts[ 1 ]  );

      // Extracts timestamp of when the recording started
      let start     = parseInt( parts[ 2 ] );

      // Uses the coordinates in recording as the user location
      app.data.user = {
        latitude  : latitude,
        longitude : longitude,
      };

      // Activates first-person mode
      app.element.dataset.mode = 'first-person';

      // Goes to first-person screen (step number 6)
      app.element.dataset.step = 6;

      // Loads list of all sensor readings
      fetch( path + file + '.json' )
        .then( response => response.json() )
        .then( records => {

          // Signals render function that records are currently being played
          app.orientation.playing = true;

          // Resets first reading to begin at time 0;
          records[ 0 ].t = 0;

          // Loops through every record
          for ( let record of records ) {

            // Schedules a change in orientation data (based on their timestamp)
            setTimeout( () => {

              // Updates data (that will be used to render the scene)
              app.data.orientation = {
                alpha : record.a,
                beta  : record.b,
                gamma : record.g,
              }

            }, record.t );

          }

        } );

    },

    handle : () => {

      // Implements world-based calibration on iOS (alpha is 0 when pointing North)

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

      // Updates values to be used by render method
      app.data.orientation.alpha = north;
      app.data.orientation.beta  = event.beta;
      app.data.orientation.gamma = event.gamma * -1;

    },

    error : ( type ) => {

      if ( type == 'not supported' ) {

        alert( 'This device does not seem to support motion sensors.' );

        // Could provide alternative interation method here

      }

      else if ( type == 'not granted' ) {

        alert( 'Unable to reach the motion sensors of this device.' );

      }

    },

    initialize : () => {

      // Activates first-person mode
      app.element.dataset.mode = 'first-person';

      // Begins reading sensor values
      window.addEventListener( 'deviceorientation', app.orientation.handle );

      // Advances to the next step on mobile
      app.steps.next();

    },

    request : () => {

      // Checks if browsers supports motion events
      if ( DeviceMotionEvent ) {

        // Requests permission for browsers that require it (e.g., iOS 13+ devices)
        if ( typeof DeviceMotionEvent.requestPermission === 'function' ) {

          DeviceMotionEvent.requestPermission()
            .then( response => {

              if ( response == 'granted' )
                app.orientation.initialize();
              else
                app.orientation.error( 'not granted' );

            } );

        }

        // Handles browsers that offer sensor values without permission
        else {

          app.orientation.initialize();

        }

      }

      // Handles browsers in which motion events are not supported
      else {

        app.orientation.error( 'not supported' );

      }

    }

  },

  geolocation : {

    success : ( position ) => {

      clearTimeout( app.geolocation.timeout );

      app.element.dataset.geolocation = 'located';

      app.data.user.latitude  = position.coords.latitude;
      app.data.user.longitude = position.coords.longitude;

      app.labels.update.coordinates();
      app.search.clear();

      app.steps.set( 3 );

    },

    error : () => {

      clearTimeout( app.geolocation.timeout );

      // Displays alert on desktop version
      if ( !app.mobile() )
        alert( 'Unable to find your location. Please type in your address.' );

      app.element.dataset.geolocation = 'unlocated';
      app.steps.set( 2 );

    },

    request : () => {

      app.element.dataset.geolocation = 'locating';

      if ( navigator.geolocation ) {

        navigator.geolocation.getCurrentPosition(
          app.geolocation.success,
          app.geolocation.error
        );

        // Waits 10 seconds before throwing an error
        app.geolocation.timeout = setTimeout( app.geolocation.error, 10 * 1000 );

      } else {

        app.geolocation.error();

      }

    },

    initialize : () => {

      // Makes sure no latitude or longitude were passed as URL parameters
      if ( !app.parameters.coordinates ) {

        // Picks a random antipode (from a selected list)
        let antipodes = app.data.antipodes;
        let random    = Math.floor( Math.random() * antipodes.length );
        let antipode  = antipodes[ random ];

        // Uses the antipode origin as the default user location
        app.data.user.latitude  = antipode.latitude;
        app.data.user.longitude = antipode.longitude;

        // Displays name of location within search input
        app.search.fill( antipode.address );

      }

    }

  },

  search : {

    api : 'https://nominatim.openstreetmap.org/search.php',

    query : {

      q      : '',
      limit  : 1,
      format : 'jsonv2'

    },

    success : () => {

      let lat = app.search.result.lat;
      let lon = app.search.result.lon;

      // Stores coordinates
      app.data.user.latitude  = parseFloat( lat );
      app.data.user.longitude = parseFloat( lon );

      // Resets drag handle position
      app.drag.reset();

      // Updates label with newly received coordinates
      app.labels.update.coordinates();

      // Goes to “found you” step on mobile navigation
      app.steps.set( 3 );

      app.element.dataset.search = 'searched';
      app.element.dataset.geolocation = 'unlocated';

    },

    error : () => {

      alert( 'Unable to find address' );
      app.element.dataset.search = 'unsearched';

    },

    handle : function( response ) {

      // Checks if there was at lease one match
      if ( response.length > 0 ) {

        // Stores first result
        app.search.result = response[ 0 ];
        app.search.success();

      } else {

        app.search.error()

      }

    },

    request : ( address ) => {

      if ( address ) {

        app.element.dataset.search = 'searching';

        app.search.query.q    = address;
        app.search.parameters = new URLSearchParams( app.search.query ).toString();
        app.search.url        = app.search.api + '?' + app.search.parameters;

        // Hides virtual keyboard away on mobile (just after form submission)
        app.elements.address.forEach( address => address.blur() );

        // Requests search results from API
        fetch( app.search.url )
         .then( response => response.json() )
         .then( response => app.search.handle( response ) )

      }

    },

    submit : ( form ) => {

      // Selects input that is a child of the submitted form (not the other one)
      let input = form.querySelector( 'input[type="search"]' );

      // Removes leading and trailing whitespace on input
      input.value = input.value.trim();
      app.search.request( input.value );

      // Fills all search inputs with same value
      app.elements.address.forEach( address =>
        address.value = input.value
      )

    },

    clear : () => {

      app.element.dataset.search = 'unsearched';

      app.elements.address.forEach( address => {
        address.value = '';
      } );

    },

    fill : ( string = '' ) => {

      app.elements.address.forEach( address => {
        address.value = string;
      } );

    },

    validate : () => {

      // Removes success state
      app.element.dataset.search = 'unsearched';

      // Removes class 'default', so value can be replaced by fill function
      app.elements.address.forEach( address =>
        address.classList.remove( 'default' )
      );

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

    coordinates : document.querySelector(    '.label-coordinates' ),
    direction   : document.querySelector(    '.label-direction'   ),
    origin      : document.querySelector(    '.label-origin'      ),
    destination : document.querySelectorAll( '.label-destination' ),
    distance    : document.querySelectorAll( '.label-distance'    ),

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

      },

      origin : () => {

      },

      destination : () => {

        app.labels.destination.forEach( destination => {

          // Updates label if value is different
          if ( app.element.dataset.destination !== destination.textContent )
            destination.textContent = app.element.dataset.destination;

        } );

      },

      distance : () => {

        let value;

        value = app.element.dataset.distance;
        value = parseInt( value );

        if ( isNaN( value ) ) {

          value = '';

        } else {

          // Rounds number up until the hundreds (e.g., 12.345 -> 12.300)
          value = value / 100;
          value = Math.round( value );
          value = value * 100;

          value = value.toLocaleString( 'en-US' );
          value = value + ' km';

        }

        app.labels.distance.forEach( distance => {

          // Updates label if value is different
          if ( value !== distance.textContent )
            distance.textContent = value;

        } )

      }

    },

    attach : {

      origin : () => {

        // Creates 2D object
        let label = new THREE.CSS2DObject( app.labels.origin );

        // Attach object to beginning of cylinder
        label.position.set( 0, 0, 0 );
        app.three.cylinder.add( label );

      },

      destination : () => {

        app.labels.destination.forEach( destination => {

        	// Selects label that is not the fixed one
        	if ( !destination.classList.contains( 'fixed' ) ) {

            // Creates 2D object
            let label = new THREE.CSS2DObject( destination );

            // Attach object to end of cylinder
            label.position.set( 0, app.data.earth.radius.crust * -2, 0 );
            app.three.cylinder.add( label );

        	}

        } );

      },

      distance : () => {

        app.labels.distance.forEach( distance => {

          // Checks if label is a child of of the background element
          if ( distance.closest( '.background' ) ) {

            // Creates 2D object
            let label = new THREE.CSS2DObject( distance );

            // Attach object to middle of cylinder
            label.position.set( 0, app.data.earth.radius.crust * -1, 0 );
            app.three.cylinder.add( label );
          }

        } );

      }

    },

    initialize : () => {

      // Visually attaches 2D labels to 3D elements
      app.labels.attach.origin();
      app.labels.attach.destination();
      app.labels.attach.distance();

      app.labels.update.coordinates();
      app.labels.update.direction();

    }

  },

  steps : {

    element : ( number ) => {

      if ( number === undefined )
        number = app.steps.current();

      let selector = '.step:nth-child( ' + number + ' )';
      let step = app.elements.steps.querySelector( selector );

      return step;

    },

    current : () => {

      return parseInt( app.element.dataset.step );

    },

    set : ( number, delay = 0 ) => {

      setTimeout( () => {
        app.element.dataset.step = number;

        // Automatically advances from “found you” message
        if ( number === 3 )
          app.steps.next( 2400 );

      }, delay )

    },

    next : ( delay = 0 ) => {

      let current = parseInt( app.element.dataset.step );
      app.steps.set( current + 1, delay );

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

    form : () => {

      // Finds user’s location automatically when button is clicked
      app.elements.findButton.forEach( button =>
        button.addEventListener( 'click', app.geolocation.request )
      );

      // Find user’s location by searching for an address
      app.elements.form.forEach( form =>
        form.addEventListener( 'submit', () => {

          event.preventDefault();
          app.search.submit( event.target);

        } )
      );

      // Removes success state of search if it is changed
      app.elements.address.forEach( address => {
        address.addEventListener( 'change', app.search.validate );
        address.addEventListener( 'input',  app.search.validate );
      } );

      // Advances to the next step when a next button is clicked
      app.elements.nextButton.forEach( next =>
        next.addEventListener( 'click', app.steps.next )
      )

    },

    motion : () => {

      // Tries to access motion events when button is clicked
      app.elements.trackButton.addEventListener( 'click', app.orientation.request, true );

    },

    download : () => {

      // Calls download method when download button is clicked
      app.elements.download.addEventListener( 'click', app.orientation.download );

    },

    initialize : () => {

      // Enables drag on handle to control tunnel angles on desktop
      app.events.drag();

      // Handles location form
      app.events.form();

      // Tracks phone’s motion when button is clicked
      app.events.motion();

      // Enables download button (for debugging of orientation data)
      app.events.download();

    }

  },

  initialize : () => {

    app.parameters.initialize();
    app.geolocation.initialize();
    app.three.initialize();
    app.events.initialize();
    app.labels.initialize();

  }

}

app.data.load();
