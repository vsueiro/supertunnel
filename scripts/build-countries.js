// Builds assets/countries-hi.json and assets/countries-lo.json from Natural Earth
//
// Source: Natural Earth 1:50m Admin 0 – Countries (public domain)
// https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
//
// Usage:
//   npm install --no-save mapshaper cdt2d
//   node scripts/build-countries.js path/to/ne_50m_admin_0_countries.geojson assets
//
// Output format (one entry per country, consumed by app.three.create.map3DGeometry):
//   { "Brazil": { "vertices": [lon, lat, ...], "triangles": [a, b, c, ...] }, ... }
//
// Polygons are simplified with mapshaper, then triangulated with a constrained
// Delaunay triangulation (cdt2d). Extra points are inserted along long edges and
// on a regular grid inside each polygon, so that no triangle spans more than a few
// degrees: this keeps the flat triangles close to the surface of the sphere.

const fs = require("fs");
const path = require("path");
const mapshaper = require("mapshaper");
const cdt2d = require("cdt2d");

const [input, output] = process.argv.slice(2);

const resolutions = {
  hi: { simplify: "12%", spacing: 4 }, // Desktop
  lo: { simplify: "5%", spacing: 8 }, // Mobile
};

// Natural Earth’s English names, with a few shortened for display
const rename = {
  "People's Republic of China": "China",
  "Turkish Republic of Northern Cyprus": "Northern Cyprus",
  "United States of America": "United States",
};

const round = (value) => Math.round(value * 100) / 100;

// Ray-casting test: is [x, y] inside the ring?
const inside = (ring, x, y) => {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      result = !result;
  }
  return result;
};

// Signed area of a ring (positive when counter-clockwise)
const area = (ring) => {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return sum / 2;
};

// Triangulates one polygon (outer ring + holes), appending to vertices/triangles
const triangulate = (name, rings, spacing, vertices, triangles) => {
  const points = [];
  const edges = [];
  const index = new Map();

  const add = (x, y) => {
    const key = x + "," + y;
    if (!index.has(key)) {
      index.set(key, points.length);
      points.push([x, y]);
    }
    return index.get(key);
  };

  // Cleans rings: rounds coordinates, removes duplicates and the closing point
  const clean = rings
    .map((ring) => {
      const result = [];
      for (const [x, y] of ring) {
        const point = [round(x), round(y)];
        const last = result[result.length - 1];
        if (!last || last[0] !== point[0] || last[1] !== point[1])
          result.push(point);
      }
      const first = result[0];
      const last = result[result.length - 1];
      if (result.length > 1 && first[0] === last[0] && first[1] === last[1])
        result.pop();
      return result;
    })
    .filter((ring) => ring.length >= 3);

  if (clean.length === 0) return;

  const [outer, ...holes] = clean;

  // Adds ring points and constraint edges (splitting long edges)
  for (const ring of clean) {
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / spacing);
      let previous = add(x1, y1);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const next = add(round(x1 + (x2 - x1) * t), round(y1 + (y2 - y1) * t));
        if (next !== previous) edges.push([previous, next]);
        previous = next;
      }
    }
  }

  // Adds grid points inside the polygon (but outside its holes)
  const xs = outer.map((p) => p[0]);
  const ys = outer.map((p) => p[1]);
  for (
    let x = Math.ceil(Math.min(...xs) / spacing) * spacing;
    x < Math.max(...xs);
    x += spacing
  )
    for (
      let y = Math.ceil(Math.min(...ys) / spacing) * spacing;
      y < Math.max(...ys);
      y += spacing
    )
      if (inside(outer, x, y) && !holes.some((hole) => inside(hole, x, y)))
        add(x, y);

  // Keeps only the triangles whose center lies inside the polygon
  const result = cdt2d(points, edges).filter(([a, b, c]) => {
    const x = (points[a][0] + points[b][0] + points[c][0]) / 3;
    const y = (points[a][1] + points[b][1] + points[c][1]) / 3;
    return inside(outer, x, y) && !holes.some((hole) => inside(hole, x, y));
  });

  // Sanity check: triangulated area should match polygon area
  const expected =
    Math.abs(area(outer)) -
    holes.reduce((sum, hole) => sum + Math.abs(area(hole)), 0);
  let actual = 0;
  const offset = vertices.length / 2;

  for (const [a, b, c] of result) {
    const signed = area([points[a], points[b], points[c]]);
    actual += Math.abs(signed);
    // Keeps every triangle counter-clockwise (in lon/lat space)
    triangles.push(
      offset + a,
      ...(signed > 0 ? [offset + b, offset + c] : [offset + c, offset + b])
    );
  }

  if (Math.abs(actual - expected) > expected * 0.001 + 0.01)
    console.warn(
      `  ${name}: area mismatch, expected ${expected.toFixed(
        3
      )}, got ${actual.toFixed(3)}`
    );

  for (const [x, y] of points) vertices.push(x, y);
};

(async () => {
  for (const [name, { simplify, spacing }] of Object.entries(resolutions)) {
    console.log(`Building countries-${name}.json`);

    // Simplifies polygons (keeping small islands and avoiding self-intersections)
    const command = `-i input.json -simplify weighted ${simplify} keep-shapes -clean -o output.json format=geojson`;
    const { "output.json": simplified } = await mapshaper.applyCommands(
      command,
      {
        "input.json": fs.readFileSync(input),
      }
    );

    const features = JSON.parse(simplified).features;
    const countries = {};

    for (const feature of features) {
      const countryName =
        rename[feature.properties.NAME_EN] || feature.properties.NAME_EN;
      const { type, coordinates } = feature.geometry;
      const polygons = type === "MultiPolygon" ? coordinates : [coordinates];
      const vertices = [];
      const triangles = [];

      for (const polygon of polygons) {
        try {
          triangulate(countryName, polygon, spacing, vertices, triangles);
        } catch (error) {
          console.warn(`  ${countryName}: ${error.message}`);
        }
      }

      if (triangles.length) countries[countryName] = { vertices, triangles };
    }

    const sorted = Object.fromEntries(
      Object.entries(countries).sort(([a], [b]) => a.localeCompare(b))
    );
    const json = JSON.stringify(sorted);
    const file = path.join(output, `countries-${name}.json`);
    fs.writeFileSync(file, json);

    const totalVertices = Object.values(sorted).reduce(
      (sum, c) => sum + c.vertices.length / 2,
      0
    );
    const totalTriangles = Object.values(sorted).reduce(
      (sum, c) => sum + c.triangles.length / 3,
      0
    );
    console.log(
      `  ${
        Object.keys(sorted).length
      } countries, ${totalVertices} vertices, ${totalTriangles} triangles, ${(
        json.length / 1024
      ).toFixed(0)} KB`
    );
  }
})();
