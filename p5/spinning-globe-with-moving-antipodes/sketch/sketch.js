let width = 1280;
let height = 720;

function setup() {
  createCanvas(width, height, WEBGL);
  angleMode(DEGREES);
}

function draw() {
  
  background(255);
  translate(0, 0, 0);
  
  blendMode(MULTIPLY);
  
  // axis
  push();
  normalMaterial();
  fill(191, 191, 191, 128);
  rotateZ(-23.5);
  rotateX(0);
  rotateY(0);
  cylinder(1, height/1.25);
  pop();

  //tunnel
  push();
  normalMaterial();
  fill(255, 0, 128, 223);
  rotateZ(frameCount * -0.8);
  rotateX(90-frameCount * -0.4);
  rotateY(0);
  cylinder(height/200, height/1.25);
  pop();
  
  // globe
  push();
  stroke(255, 255, 255);
  fill(0, 255, 255, 128);
  rotateZ(-23.5);
  rotateX(0);
  rotateY(frameCount * 0.1);
  sphere(height/3);
  pop();
  
}