## file list
* shape.js - shape module include 2d draw and animation
* batch.js - generate shapes
* draw.js - draw shape batch in 2d/webgl

## How to bulid to UMD Module
browserify ./src/index.js -s Shape | derequire > ./dist/shape.js


## How to use

#### Single Shape

```javascript
var rect = new Shape.Shape('rect', {
  x1: 100,
  y1: 100,
  x2: 400,
  y2: 300,
  fillStyle: "#448",
  strokeStyle: "#333"
});
```

#### Single Shape Animation

```javascript
rect.set({
  rotate: 360,
  scale: .5
}, 400);
```

#### Shape batch (now can rect only)

```javascript
var canvas = document.getElementById('canvas')
var draw = new Shape.Draw(canvas, {
  context: 'webgl' // webgl or 2d
});

var shapes = {
  rects: [
    {
      x1: 0, y1: 0, x2: 100, y2: 100,
      texture: 0
    },
    {
      x1: 100, y1: 0, x2: 400, y2: 100,
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
```
#### Shape Batch Animation

```javascript
batch.set({
  'rotate': 180,
  'scale': 2,
}, 400, function() {
  alert('complete!!');
});
```
