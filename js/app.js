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
    findButton  : document.querySelectorAll( '.find'                   ),
    nextButton  : document.querySelectorAll( '.next'                   ),
    form        : document.querySelectorAll( 'form'                    ),
    address     : document.querySelectorAll( 'input[name="address"]'   ),

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
      latitude  : -33.4489,
      longitude : -70.6693,
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
    let style = getComputedStyle( app.elements.root );
    let value = style.getPropertyValue( '--' + name ).trim();
    return value;

  },

  style : ( element, property, type = 'float' ) => {

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

        // Makes 1 orbit in 240 seconds
        app.three.controls.autoRotateSpeed =   2; // 1 orbit in 30 seconds
        app.three.controls.autoRotateSpeed = .25; // 1 orbit in 240 seconds
        app.three.controls.autoRotateSpeed =  .5; // 1 orbit in 120 seconds

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

      // Removes loading state
      setTimeout( () => {
        app.element.dataset.loading = false;
      }, 800 )

    },

    update : {

      dimensions : () => {

        // Centers globe within available space on mobile

        // Sets default increase
        let excess = 0;

        // Calculates increase for mobile version
        if ( window.innerWidth <= 1024 && app.element.dataset.mode === 'third-person' ) {

          let height               = {};
          let target               = {};
          let step                 = app.steps.current.element();

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
        let fov = 90

        // Decreases field of view on mobile (makes everything appear a bit bigger)
        // if ( window.innerWidth <= 1024 )
        //  fov = 80

        // Visually “scales” fov to match both width and height (diagonal)
        diagonal = ( fov, aspect ) => {
          let length = Math.sqrt( 1 + aspect * aspect );
          return THREE.MathUtils.radToDeg( 2 * Math.atan( Math.tan( THREE.MathUtils.degToRad( fov ) * .5 ) / length ) );
        }

        app.three.camera.fov = diagonal( fov, app.three.camera.aspect );

        if ( reset ) {

          // Positions it away from Earth (3x its radius)
          app.three.camera.position.z = app.data.earth.radius.crust * 3;

          // Sets x rotation to the default position
          app.three.camera.position.x = 0

          // Tilts it slightly so the Equator does not look like a flat horizontal line
          app.three.camera.position.y = app.data.earth.radius.crust / 3;

          // Forces camera to look at the center of the scene
          app.three.camera.lookAt( 0, 0, 0 );

        }

        // Updates camera accordingly
        app.three.camera.aspect = c.clientWidth / c.clientHeight;
        app.three.camera.updateProjectionMatrix();

      },

      tunnel : () => {

        // Enables first-person view
        if ( app.element.dataset.mode == 'first-person' ) {

          // Rotates Earth to always match real-world North
          app.three.earth.rotation.y    = THREE.Math.degToRad( app.data.orientation.alpha * -1 );

          // Rotates stars so they behave just like Earth
          app.three.stars.rotation.y    = THREE.Math.degToRad( app.data.orientation.alpha * -1 );

          // Rotates compass needle
          app.elements.compass.style.transform = 'rotate(' + app.data.orientation.alpha + 'deg)';

          // Rotates tunnel on two axes (based on device motion)
          app.three.cylinder.rotation.x = THREE.Math.degToRad( app.data.orientation.beta  );
          app.three.cylinder.rotation.z = THREE.Math.degToRad( app.data.orientation.gamma );
          app.three.chord.rotation.x    = THREE.Math.degToRad( app.data.orientation.beta  );
          app.three.chord.rotation.z    = THREE.Math.degToRad( app.data.orientation.gamma );
          app.three.tunnel.rotation.y   = THREE.Math.degToRad( 0 );

          // Resets handle control
          app.drag.reset();

          // Deactivates camera controls
          app.three.controls.enabled = false;

          // Resets camera position
          app.three.update.camera( 'reset' );

        }

        // Enables third-person view
        else {

          // Keeps Earth still
          app.three.earth.rotation.y    = THREE.Math.degToRad( 0 );

          // Rests stars rotation
          app.three.stars.rotation.y    = THREE.Math.degToRad( 0 );

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

    request : () => {

      // Requests permission for iOS 13+ devices
      if ( DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function' ) {

        DeviceMotionEvent.requestPermission()
          .then( response => {

            if ( response == 'granted' ) {

              // Activates first-person mode
              app.element.dataset.mode = 'first-person';

              window.addEventListener( 'deviceorientation', app.orientation.handle );
              app.steps.next();

            } else {

              app.orientation.error( 'not granted' );

            }

          } );

      }

      // If feature is not supported
      else {

        app.orientation.error( 'not supported' );

      }

    }

  },

  geolocation : {

    success : ( position ) => {

      app.element.dataset.geolocation = 'located';

      app.data.user.latitude  = position.coords.latitude;
      app.data.user.longitude = position.coords.longitude;

      app.labels.update.coordinates();
      app.search.clear();

      app.steps.set( 3 );

    },

    error : () => {

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

      } else {

        app.geolocation.error();

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

      // Removes class 'default', so value can be replaced by fill function
      app.elements.address.forEach( address => {
        address.classList.remove( 'default' );
        address.value = '';
      } )

    },

    validate : () => {

      // Removes success state
      app.element.dataset.search = 'unsearched';

      // Removes class 'default', so value can be replaced by fill function
      app.elements.address.forEach( address =>
        address.classList.remove( 'default' )
      )

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

        	// Checks if label is a child of of the background element
        	if ( destination.closest( '.background' ) ) {

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

    current : {

      element : () => {

        let number = parseInt( app.element.dataset.step );
        let step = app.elements.steps.querySelector( '.step:nth-child( ' + number + ' )' );

        return step;

      }

    },

    set : ( number, delay = 0 ) => {

      setTimeout( () => {
        app.element.dataset.step = number;

        // Automatically advances from “found you” message
        if ( number === 3 )
          app.steps.next( 1600 );

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

      app.elements.trackButton.addEventListener( 'click', app.orientation.request );

    },

    initialize : () => {

      // Enables drag on handle to control tunnel angles on desktop
      app.events.drag();

      // Handles location form
      app.events.form();

      // Tracks phone’s motion when button is clicked
      app.events.motion();

    }

  },

  initialize : () => {

    app.three.initialize();
    app.events.initialize();
    app.labels.initialize();

  }

}

app.data.load();
