## file list
shape.js - shape module include 2d draw and animation
batch.js - generate shapes
draw.js - draw shape batch in 2d/webgl

## How to bulid to UMD Module
browserify ./src/index.js -s Shape | derequire > ./dist/shape.js


## How to use

Single Shape

``js
var rect = new Shape.Shape('rect', {
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 100
});
``

Shape batch

``js
var canvas = document.getElementById('canvas')
var draw = new Shape.Draw(canvas, {
  context: 'webgl' // webgl or 2d
});

var shapes = {
  rects: [
    {
      x1: 0, y1: 0, x2: 95, y2: 95,
      texture: 0
    },
    {
      x1: 94, y1: 0, x2: 506, y2: 95,
      texture: 1
    }
  ],
  textures: [
    {
      index: 0,
      img: '1.png'
    },
    {
      index: 1,
      img: '2.png',
    }
  ]
}

var batch = new Shape.Batch(shapes, draw);
``
