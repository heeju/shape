var Shape = require('./shape.js');

require("setimmediate");
require('emitter')(Batch.prototype);

module.exports = Batch;

function Batch(datas, drawObj) {
  this.drawObj = drawObj;
  this.canvas = drawObj.canvas;
  this.contextType = drawObj.contextType;
  this.started = false;

  init(this, datas);
}

Batch.prototype.getValue = function(vals) {
  return this.integratedRect.getValue(vals);
}

Batch.prototype.set = function(toVars, duration, callback) {
  this.integratedRect.set(toVars, duration, callback);
  for (i = 0; i < this.rects.length; i++) {
    this.rects[i].set(toVars, duration, callback);
  }
}

Batch.prototype.update = function(values) {
  this.integratedRect.update(values);
  for (i = 0; i < this.rects.length; i++) {
    this.rects[i].update(values);
  }
}

Batch.prototype.draw = function() {
  // var transformValues = this.integratedRect.getValue(['scaleX', 'rotate', 'drawGapX', 'drawGapY']);
  this.drawObj.drawRects(
    this.rects,
    this.integratedRect.getValue(['scaleX', 'rotate', 'drawGapX', 'drawGapY'])
  );
}

Batch.prototype.contains = function(rectIndex, x, y) {
  return this.rects[rectIndex].contains(x, y);
}

Batch.prototype.changeRects = function(datas) {
  this.drawObj.clearRects();
  this.drawObj.clearTextures();
  init(this, datas);
}

Batch.prototype.updateTexture = function(index) {
  this.drawObj.refreshTexture(this.rects[index].data.texture);
}

function init(self, datas) {
  self.rects = [];
  // self.screenRect = [];

  var rects = datas.rects
    , values = {}
    , x = []
    , y = []
    , textureIndex;

  for (var i = 0; i < rects.length; i++) {
    self.rects[i] = new Shape('rect', {
      x1: rects[i].x1,
      x2: rects[i].x2,
      y1: rects[i].y1,
      y2: rects[i].y2
    });

    self.rects[i].index = i;
    self.rects[i].data = rects[i];

    // datas.textures[rects[i].texture].type = rects[i].type;
    // console.log(datas.textures[rects[i].texture].index)
    textureIndex = datas.textures[rects[i].texture].index;

    // if (rects[i].type === 'screen') {
    //   // self.screenRect[index] = self.rects[i];
    //   self.screenRect = self.rects[i];
    // }

    x.push(rects[i].x1, rects[i].x2);
    y.push(rects[i].y1, rects[i].y2);
  }


  values.x1 = Math.min.apply(null, x);
  values.y1 = Math.min.apply(null, y);
  values.x2 = Math.max.apply(null, x);
  values.y2 = Math.max.apply(null, y);

  self.centerX = values.centerX =
    (datas.centerX === undefined) ? (values.x2 - values.x1) / 2 : datas.centerX;

  self.centerY = values.centerY =
    (datas.centerY === undefined) ? (values.y2 - values.y1) / 2 : datas.centerY;

  setValue(self, {
    centerX: self.centerX,
    centerY: self.centerY
  });

  self.drawObj.setupRects(self.rects);
  self.drawObj.loadTextures(datas.textures, function(result) {
    setImmediate(function() {
      self.emit('textureLoadEnd');
      if (self.started === false) {
        self.emit('start');
        self.started = true;
      }
    });
  });

  self.integratedRect = new Shape('rect', values);
}

function setValue(self, vals) {
  for (i = 0; i < self.rects.length; i++) {
    self.rects[i].setValue(vals);
  }
}
