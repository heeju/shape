(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Shape = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
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

    datas.textures[rects[i].texture].type = rects[i].type;
    // console.log(datas.textures[rects[i].texture].index)
    textureIndex = datas.textures[rects[i].texture].index;

    if (rects[i].type === 'screen') {
      // self.screenRect[index] = self.rects[i];
      self.screenRect = self.rects[i];
    }

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

},{"./shape.js":8,"emitter":5,"setimmediate":7}],3:[function(require,module,exports){
var extend = require('extend');
var vertexShaderSrc = [
  "attribute vec2 a_position;",
  "attribute vec2 a_texCoord;",
  "uniform vec2 u_resolution;",
  "uniform vec2 u_translation;",
  "uniform float u_angle;",
  "uniform float u_scale;",
  "varying vec2 v_texCoord;",
  "void main() {",
  "  float rad = -radians(u_angle); // * 0.01745329251;",
  "  float s = sin(rad);",
  "  float c = cos(rad);",
  "  vec2 position = vec2(",
  "    a_position.x * c + a_position.y * s,",
  "    a_position.y * c - a_position.x * s",
  "  );",
  "  position = ((position * vec2(u_scale, u_scale) + u_translation) / u_resolution) * 2.0 - 1.0;",
  "  gl_Position = vec4(position * vec2(1, -1), 0, 1);",
  "  v_texCoord = a_texCoord;",
  "}"
];
var fragmentShaderSrc = [
  "precision mediump float;",
  "uniform sampler2D u_sampler;",
  "varying vec2 v_texCoord;",
  "void main() {",
  "  gl_FragColor = texture2D(u_sampler, v_texCoord);",
  "}"
];
var BPE = Float32Array.BYTES_PER_ELEMENT;


/**
 * shape객체모름을 webgl 또는 2d로 그리는 모듈
 * @param {object} canvas [description]
 * @param {object} option [description]
 */
function Draw(canvas, option) {
  this.canvas = canvas;

  this.option = extend({
    context: 'webgl',
    contextOption: {
      alpha: true,
      depth: true,
      stencil: false,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    }
  }, option, true);

  this.textures = [];

  // get context
  var self = this
    , useWebgl = false;

  var createWebgl = (function() {
    try {
      self.contextType = 'webgl';
      return !!(window.WebGLRenderingContext && (
        self.gl =
          self.canvas.getContext('webgl', self.option.contextOption) ||
          self.canvas.getContext('experimental-webgl', self.option.contextOption)
      ));
    } catch (e) {
      return false;
    }
  });

  if (this.option.context === 'webgl') {
    useWebgl = createWebgl();
  }
  // 2d
  if (useWebgl === false) {
    this.context = this.canvas.getContext('2d', { alpha: this.option.contextOption.alpha });
    this.contextType = '2d';
  }
  // webgl
  else {
    initWebgl(this);
  }

  if (this.contextType === 'webgl') {
    this.func = {
      'setupTexture': setupWebglTexture,
      'updateCanvasTexture': updateWebglCanvasTexture,
      'deleteTexture': deleteWebglTexture,
      'drawRects': drawWebglRects
    };
  } else {
    this.func = {
      'setupTexture': setup2dTexture,
      'updateCanvasTexture': update2dCanvasTexture,
      'deleteTexture': delete2dTexture,
      'drawRects': draw2dRects
    };
  }
}

Draw.prototype.setupRects = function(rects) {
  if (this.contextType === 'webgl') {
    for (var i = 0; i < rects.length; i++) {
      setupWebglBuffer(this, rects[i]);
    }
  }
}

Draw.prototype.clearRects = function() {
  if (this.contextType === 'webgl') {
    for (var i = 0; i < this.buffers.length; i++) {
      if (this.buffers[i]) {
        deleteWebglBuffer(this, i);
      }
    }
    this.buffers = [];
  }
}

Draw.prototype.loadTextures = function(textures, callback) {
  this.textureSetupCount = textures.length;
  this.loadTextureCallback = callback;
  for (var i = 0; i < textures.length; i++) {
    // textures[i].index = i;
    //image url
    if (typeof textures[i].img === 'string') {
      loadTextureImage(this, textures[i]);
    }

    //native image or canvas object
    else if (textures[i].img instanceof HTMLElement && textures[i].img.tagName && (
      textures[i].img.tagName.toLowerCase() === 'canvas' ||
      textures[i].img.tagName.toLowerCase() === 'img'
    )) {
      textures[i].texture = textures[i].img;
      this.func.setupTexture(this, textures[i]);
    }
    // noting
    else {
      this.textures[i] = null;
    }
  }
}

Draw.prototype.refreshTexture = function(index) {
  this.func.updateCanvasTexture(this, index);
}

Draw.prototype.clearTextures = function() {
  for (var i = 0; i < this.textures.length; i++) {
    if (this.textures[i]) {
      this.func.deleteTexture(this, i);
    }
  }
  this.textures = [];
}

Draw.prototype.drawRects = function(rects, transformValues) {
  this.func.drawRects(this, rects, transformValues);
}

/**
 * [loadTextureImage description]
 * @param  {[type]} self    [description]
 * @param  {[type]} texture [description]
 * @return {[type]}         [description]
 */
function loadTextureImage(self, texture) {
  var image = new Image();

  image.onload = function() {
    texture.texture = image;
    self.func.setupTexture(self, texture);
    image = null;
  }

  image.src = texture.img;
}

/**
 * [completeTextureLoad description]
 * @param  {[type]} self [description]
 * @return {[type]}      [description]
 */
function completeTextureLoad(self) {
  if (self.textureSetupCount !== undefined && --self.textureSetupCount === 0) {
    delete self.textureSetupCount;
    if (self.loadTextureCallback !== undefined) {
      if (typeof self.loadTextureCallback === 'function') {
        self.loadTextureCallback(self.textures);
      }
      delete self.loadTextureCallback;
    }
  }
}

/**
 * [initWebgl description]
 * @param  {[type]} self [description]
 * @return {[type]}      [description]
 */
function initWebgl(self) {
  var gl = self.gl
    , program = loadWebglProgram(gl);

  // var err = gl.getError();
  // if (err !== gl.NO_ERROR) {
  //   var errorMessage = "";
  //   if (err == gl.INVALID_ENUM) {
  //     errorMessage = "Invalid constant";
  //   }
  //   else if (err == gl.INVALID_VALUE) {
  //     errorMessage = "Numeric argument out of range.";
  //   }
  //   else if (err == gl.INVALID_OPERATION) {
  //     errorMessage = "Invalid operation for current state.";
  //   }
  //   else if (err == gl.OUT_OF_MEMORY) {
  //     errorMessage = "Out of memory!!";
  //   }
  //   else {
  //     errorMessage = "Unknown error";
  //   }
  //   return errorMessage;
  // }

  self.buffers = [];
  self.program = program;
  gl.useProgram(program);

  self.positionLocation = gl.getAttribLocation(program, "a_position");
  self.texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
  self.u_resolution = gl.getUniformLocation(program, "u_resolution");
  self.u_translation = gl.getUniformLocation(program, "u_translation");
  self.u_angle = gl.getUniformLocation(program, "u_angle");
  self.u_scale = gl.getUniformLocation(program, "u_scale");
  self.u_sampler = gl.getUniformLocation(program, "u_sampler");

  gl.enableVertexAttribArray(self.texCoordLocation);
  gl.enableVertexAttribArray(self.positionLocation);

  gl.disable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);

  return true;
}

/**
 * [getWebglShader description]
 * @param  {[type]} gl         [description]
 * @param  {[type]} shaderType [description]
 * @return {[type]}            [description]
 */
function getWebglShader(gl, shaderType) {
  var option
    , source;

  if (shaderType === 'vertex') {
    option = gl.VERTEX_SHADER;
    source = vertexShaderSrc;
  }

  else if (shaderType === 'fragment') {
    option = gl.FRAGMENT_SHADER;
    source = fragmentShaderSrc;
  }

  else {
    return null;
  }

  var shader = gl.createShader(option);
  gl.shaderSource(shader, source.join("\n"));
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

/**
 * [loadWebglProgram description]
 * @param  {[type]} gl [description]
 * @return {[type]}    [description]
 */
function loadWebglProgram(gl) {
  var program = gl.createProgram();

  gl.attachShader(program, getWebglShader(gl, "vertex"));
  gl.attachShader(program, getWebglShader(gl, "fragment"));
  gl.linkProgram(program);

  if (gl.getProgramParameter(program, gl.LINK_STATUS) === false) {
    var lastError = gl.getProgramInfoLog(program);
    console.warn("Error in program linking:" + lastError);
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * [setupWebglBuffer description]
 * @param  {[type]} self [description]
 * @param  {[type]} rect [description]
 * @return {[type]}      [description]
 */
function setupWebglBuffer(self, rect) {
  var gl = self.gl
    , index = rect.index;

  var width = rect.getValue('width')
    , height = rect.getValue('height')
    , x1 = -width / 2
    , y1 = -height / 2
    , x2 = width / 2
    , y2 = height / 2

  // vertex buffer
  self.buffers[index] = gl.createBuffer();
  rect.buffer = self.buffers[index];

  var bufferUsage = gl.STATIC_DRAW;
  // if (rect.data.type === 'screen') {
  //   bufferUsage = gl.DYNAMIC_DRAW;
  // }

  gl.bindBuffer(gl.ARRAY_BUFFER, self.buffers[index]);

  // // gl.TRIANGLES
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  //   x1, y1, 0.0, 0.0,
  //   x2, y1, 1.0, 0.0,
  //   x1, y2, 0.0, 1.0,
  //   x1, y2, 0.0, 1.0,
  //   x2, y1, 1.0, 0.0,
  //   x2, y2, 1.0, 1.0
  // ]), bufferUsage);

  // // gl.TRIANGLE_FAN
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  //   x1, y2, 0.0, 1.0,
  //   x1, y1, 0.0, 0.0,
  //   x2, y1, 1.0, 0.0,
  //   x2, y2, 1.0, 1.0
  // ]), bufferUsage);

  // gl.TRIANGLE_STRIP
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x1, y1, 0.0, 0.0,
    x1, y2, 0.0, 1.0,
    x2, y1, 1.0, 0.0,
    x2, y2, 1.0, 1.0
  ]), bufferUsage);
}

/**
 * [deleteWebglBuffer description]
 * @param  {[type]} self  [description]
 * @param  {[type]} index [description]
 * @return {[type]}       [description]
 */
function deleteWebglBuffer(self, index) {
  self.gl.deleteBuffer(self.buffers[index]);
  self.buffers[index] = null;
}

/**
 * [setupWebglTexture description]
 * @param  {[type]} self    [description]
 * @param  {[type]} texture [description]
 * @return {[type]}         [description]
 */
function setupWebglTexture(self, texture) {
  var gl = self.gl
    , index = texture.index;
    // , magFilter = (texture.type === 'screen') ? gl.NEAREST : gl.LINEAR;

  gl.activeTexture(gl.TEXTURE0 + index);

  self.textures[index] = gl.createTexture();
  self.textures[index].source = texture.texture;

  gl.bindTexture(gl.TEXTURE_2D, self.textures[index]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.texture);
  // repeat
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // mag, min
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  completeTextureLoad(self);
}

/**
 * [updateWebglTexture description]
 * @param  {[type]} self  [description]
 * @param  {[type]} index [description]
 * @param  {[type]} image [description]
 * @return {[type]}       [description]
 */
function updateWebglCanvasTexture(self, textureIndex) {
  var gl = self.gl
  var texture = self.textures[textureIndex];
  gl.bindTexture(gl.TEXTURE_2D, texture);

  try{
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);
  }
  catch(e){
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source, null);
  }
  // gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * [deleteWebglTexture description]
 * @param  {[type]} self  [description]
 * @param  {[type]} index [description]
 * @return {[type]}       [description]
 */
function deleteWebglTexture(self, index) {
  self.gl.deleteTexture(self.textures[index]);
  self.textures[index] = null;
}

/**
 * [drawWebglRects description]
 * @param  {object} self            [description]
 * @param  {array} rects           [description]
 * @param  {[type]} transformValues [description]
 * @return {undefined}                 [description]
 */
function drawWebglRects(self, rects, transformValues) {
  var gl = self.gl;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, self.canvas.width, self.canvas.height);
  gl.uniform2f(self.u_resolution, self.canvas.width, self.canvas.height);
  gl.uniform1f(self.u_angle, transformValues.rotate);
  gl.uniform1f(self.u_scale, transformValues.scaleX);

  var drawGapX = transformValues.drawGapX || 0
    , drawGapY = transformValues.drawGapY || 0;

  var bufferIndex, textureIndex, translate;
  for (var i = 0; i < rects.length; i++) {
    bufferIndex = rects[i].index;
    textureIndex = rects[i].data.texture;
    translate = rects[i].getValue('drawTranslate');
    // translate value
    gl.uniform2f(self.u_translation, translate.x + drawGapX, translate.y + drawGapY);
    // texture
    gl.activeTexture(gl.TEXTURE0 + textureIndex);
    gl.uniform1i(self.u_sampler, textureIndex);
    // buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, self.buffers[bufferIndex]);
    gl.vertexAttribPointer(self.positionLocation, 2, gl.FLOAT, false, 4 * BPE, 0);
    gl.vertexAttribPointer(self.texCoordLocation, 2, gl.FLOAT, false, 4 * BPE, 2 * BPE);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}


/**
 * [setup2dTexture description]
 * @param  {[type]} self    [description]
 * @param  {[type]} texture [description]
 * @return {[type]}         [description]
 */
function setup2dTexture(self, texture) {
  self.textures[texture.index] = texture.texture;
  completeTextureLoad(self);
}

/**
 * [update2dTexture description]
 * @param  {[type]} self  [description]
 * @param  {[type]} index [description]
 * @param  {[type]} image [description]
 * @return {[type]}       [description]
 */
function update2dCanvasTexture(self, rect) {
  // self.textures[index] = texture;
}

/**
 * [delete2dTexture description]
 * @param  {[type]} self  [description]
 * @param  {[type]} index [description]
 * @return {[type]}       [description]
 */
function delete2dTexture(self, index) {
  self.textures[index] = null;
}

/**
 * [draw2dRects description]
 * @param  {object} self  draw 객체
 * @param  {array} rects  draw할 rect 모음 배열
 * @return {undefined}
 */
function draw2dRects(self, rects) {
  self.context.clearRect(0, 0, self.canvas.width, self.canvas.height);
  // self.context.save();
  // self.context.fillStyle = 'rgba(0,0,0,0)';
  // self.context.fillRect(0, 0, self.canvas.width, self.canvas.height);
  // self.context.restore();

  for (var i = 0; i < rects.length; i++) {
    rects[i].draw(self.context, self.textures[rects[i].data.texture]);
  }
}

/**
 * [exports description]
 * @type {[type]}
 */
module.exports = Draw;

},{"extend":6}],4:[function(require,module,exports){
/**
 * shape utility exports
 * @type {Object}
 */
module.exports = {
  Shape: require('./shape'),
  Batch: require('./batch'),
  Draw: require('./draw')
}

},{"./batch":2,"./draw":3,"./shape":8}],5:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],6:[function(require,module,exports){
'use strict';

module.exports = extend;

function extend(origin, add, deep) {
  if (!add || origin.constructor !== Object) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    if (
      deep === true &&
      origin[keys[i]] &&
      origin[keys[i]].constructor === Object &&
      add[keys[i]].constructor === Object
    ) {
      origin[keys[i]] = extend(origin[keys[i]], add[keys[i]], deep);
    } else {
      origin[keys[i]] = add[keys[i]];
    }
  }
  return origin;
}

//   convertColorCode: convertColorCode
// function convertColorCode(code, outputType) {
//   //output:
//   // hex: #808080
//   // rgba: rgba(128,128,128,1)
//   // matrix: [0.5, 0.5, 0.5, 1.0]
//   var codeArray = [];

//   if (typeof code === 'string') {
//     // hex
//     if (code.match(/^#((?:[\da-f]{3}){1,2})$/i) !== null) {
//       // parseInt('', 16);
//     }

//     //rgb
//     else if (code.match(/rgb\(([\d]{1,3}){3,4}\)/) === 0) {

//     }

//     //rgba
//     // else if () {

//     // }
//   }

//   var outputCode;

//   return outputCode;
// }

},{}],7:[function(require,module,exports){
(function (process){
(function (global, undefined) {
  "use strict";

  if (global.setImmediate) {
    return;
  }

  var nextHandle = 1; // Spec says greater than zero
  var tasksByHandle = {};
  var currentlyRunningATask = false;
  var doc = global.document;
  var setImmediate;

  function addFromSetImmediateArguments(args) {
    tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
    return nextHandle++;
  }

  // This function accepts the same arguments as setImmediate, but
  // returns a function that requires no arguments.
  function partiallyApplied(handler) {
    var args = [].slice.call(arguments, 1);
    return function() {
      if (typeof handler === "function") {
        handler.apply(undefined, args);
      } else {
        (new Function("" + handler))();
      }
    };
  }

  function runIfPresent(handle) {
    // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
    // So if we're currently running a task, we'll need to delay this invocation.
    if (currentlyRunningATask) {
      // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
      // "too much recursion" error.
      setTimeout(partiallyApplied(runIfPresent, handle), 0);
    } else {
      var task = tasksByHandle[handle];
      if (task) {
        currentlyRunningATask = true;
        try {
          task();
        } finally {
          clearImmediate(handle);
          currentlyRunningATask = false;
        }
      }
    }
  }

  function clearImmediate(handle) {
    delete tasksByHandle[handle];
  }




  /****************************
   * install
   **************************** */
  function installNextTickImplementation() {
    setImmediate = function() {
      var handle = addFromSetImmediateArguments(arguments);
      process.nextTick(partiallyApplied(runIfPresent, handle));
      return handle;
    };
  }

  function canUsePostMessage() {
    // The test against `importScripts` prevents this implementation from being installed inside a web worker,
    // where `global.postMessage` means something completely different and can't be used for this purpose.
    if (global.postMessage && !global.importScripts) {
      var postMessageIsAsynchronous = true;
      var oldOnMessage = global.onmessage;
      global.onmessage = function() {
        postMessageIsAsynchronous = false;
      };
      global.postMessage("", "*");
      global.onmessage = oldOnMessage;
      return postMessageIsAsynchronous;
    }
  }

  function installPostMessageImplementation() {
    // Installs an event handler on `global` for the `message` event: see
    // * https://developer.mozilla.org/en/DOM/window.postMessage
    // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

    var messagePrefix = "setImmediate$" + Math.random() + "$";
    var onGlobalMessage = function(event) {
      if (event.source === global &&
        typeof event.data === "string" &&
        event.data.indexOf(messagePrefix) === 0) {
        runIfPresent(+event.data.slice(messagePrefix.length));
      }
    };

    if (global.addEventListener) {
      global.addEventListener("message", onGlobalMessage, false);
    } else {
      global.attachEvent("onmessage", onGlobalMessage);
    }

    setImmediate = function() {
      var handle = addFromSetImmediateArguments(arguments);
      global.postMessage(messagePrefix + handle, "*");
      return handle;
    };
  }

  function installMessageChannelImplementation() {
    var channel = new MessageChannel();
    channel.port1.onmessage = function(event) {
      var handle = event.data;
      runIfPresent(handle);
    };

    setImmediate = function() {
      var handle = addFromSetImmediateArguments(arguments);
      channel.port2.postMessage(handle);
      return handle;
    };
  }

  function installReadyStateChangeImplementation() {
    var html = doc.documentElement;
    setImmediate = function() {
      var handle = addFromSetImmediateArguments(arguments);
      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var script = doc.createElement("script");
      script.onreadystatechange = function () {
        runIfPresent(handle);
        script.onreadystatechange = null;
        html.removeChild(script);
        script = null;
      };
      html.appendChild(script);
      return handle;
    };
  }

  function installSetTimeoutImplementation() {
    setImmediate = function() {
      var handle = addFromSetImmediateArguments(arguments);
      setTimeout(partiallyApplied(runIfPresent, handle), 0);
      return handle;
    };
  }

  // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
  var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
  attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

  // Don't get fooled by e.g. browserify environments.
  if ({}.toString.call(global.process) === "[object process]") {
    // For Node.js before 0.9
    installNextTickImplementation();

  } else if (canUsePostMessage()) {
    // For non-IE10 modern browsers
    installPostMessageImplementation();

  } else if (global.MessageChannel) {
    // For web workers, where supported
    installMessageChannelImplementation();

  } else if (doc && "onreadystatechange" in doc.createElement("script")) {
    // For IE 6–8
    installReadyStateChangeImplementation();

  } else {
    // For older browsers
    installSetTimeoutImplementation();
  }

  attachTo.setImmediate = setImmediate;
  attachTo.clearImmediate = clearImmediate;
}(new Function("return this")()));

}).call(this,require('_process'))
},{"_process":1}],8:[function(require,module,exports){

'use strict';
/**
 * [exports description]
 * @type {[type]}
 */
module.exports = Shape;

var enableTypes = [
  'line',
  'rect',
  'circle'
],

getBoundingFunc = {
  'line': getLineBounding,
  'rect': getRectBounding,
  'circle': getCircleBounding
},

containsFunc = {
  'line': containsLine,
  'rect': containsRect,
  'circle': containsCircle
},

drawFunc = {
  'line': drawLine,
  'rect': drawRect,
  'circle': drawCircle
},

shapeVars = [
  'x1', 'y1', 'x2', 'y2', 'centerX', 'centerY',
  'scaleX', 'scaleY', 'rotate', 'translateX', 'translateY',
  'fillStyle', 'lineWidth', 'strokeStyle', 'img', 'opacity',
  'drawGapX', 'drawGapY'
],

changeableShapeVars = [
  'x1', 'y1', 'x2', 'y2', 'centerX', 'centerY',
  'scaleX', 'scaleY', 'rotate', 'translateX', 'translateY'
],

transitionShapeVars = [
  'x1', 'y1', 'x2', 'y2', 'centerX', 'centerY',
  'scaleX', 'scaleY', 'rotate', 'translateX', 'translateY', 'opacity'
],

timing = window.performance || Date;


/**
 * [Shape description]
 * @param {string} type   shape 타입 (line,rect,circle)
 * @param {object} values 생성시 좌표(x1,y1,x2,y2) 및 transition 값
 */
function Shape(type, values) {
  if (type instanceof Object) {
    values = type;
    if (values.type === undefined) {
      return;
    }
    type = values.type;
  }

  if (enableTypes.indexOf(type) === -1) {
    return;
  }

  this.boundingStyle = {
    fillStyle: '#bbb',
    opacity: .6
  };

  var self = this
    , variables = {};

  variables.type = type;
  // coordinates
  variables.x1 = 0;
  variables.y1 = 0;
  variables.x2 = 0;
  variables.y2 = 0;
  //transform
  variables.scaleX = 1;
  variables.scaleY = 1;
  variables.rotate = 0;
  variables.translateX = 0;
  variables.translateY = 0;
  //style
  variables.opacity = 1;
  //draw gap
  variables.drawGapX = 0;
  variables.drawGapY = 0;

  /**
   * shape값 설정, 변경
   * @param {string} name    [description]
   * @param {string,number} value   [description]
   * @param {boolean} doApply [description]
   */
  this.setValue = function setValue(name, value, doApply) {
    var changed = false;

    if (name instanceof Object) {
      var keys = Object.keys(name)
        , i = keys.length;

      while (i--) {
        changed = setValue(keys[i], name[keys[i]], false) || changed;
      }

      if (changed === true) {
        variables = applyChange(variables, true);
        self.bounding = variables.bounding;
      }
      return;
    }

    //set values
    if (shapeVars.indexOf(name) > -1 && variables[name] !== value) {
      variables[name] = value;
      if (changeableShapeVars.indexOf(name) > -1) {
        changed = true;
      }
    }

    //setScale
    if (name === 'scale') {
      variables.scaleX = value;
      variables.scaleY = value;
      changed = true;
    }

    if (changed === true && doApply !== false) {
      variables = applyChange(variables, true);
      self.bounding = variables.bounding;
    }

    return changed;
  }

  /**
   * [getValue description]
   * @param  {[type]} name [description]
   * @return {[type]}      [description]
   */
  this.getValue = function getValue(name) {
    if (typeof name === 'string') {
      return variables[name];
    }

    if (Array.isArray(name)) {
      var result = {};

      for (var i = 0; i < name.length; i++) {
        result[name[i]] = variables[name[i]];
      }
      return result;
    }
  }

  this.setValue(values);
}

function applyChange(vars, getBounding) {
  vars.coordinates = {
    x1: vars.x1 + vars.translateX,
    y1: vars.y1 + vars.translateY,
    x2: vars.x2 + vars.translateX,
    y2: vars.y2 + vars.translateY,
  }

  var shapeCenter = {
    x: (vars.coordinates.x1 + vars.coordinates.x2) / 2,
    y: (vars.coordinates.y1 + vars.coordinates.y2) / 2
  }

  vars.coordinates.centerX = shapeCenter.x;
  vars.coordinates.centerY = shapeCenter.y;

  if (vars.centerX === null || vars.centerX === undefined) {
    vars.centerX = shapeCenter.x;
  }

  if (vars.centerY === null || vars.centerY === undefined) {
    vars.centerY = shapeCenter.y;
  }

  var tCenterX = vars.centerX + vars.translateX
    , tCenterY = vars.centerY + vars.translateY;

  vars.width = Math.abs(vars.x2 - vars.x1);
  vars.height = Math.abs(vars.y2 - vars.y1);
  vars.radian = vars.rotate * Math.PI / 180;

  if (tCenterX !== vars.coordinates.centerX || tCenterY !== vars.coordinates.centerY) {

    if (vars.scaleX !== 1) {
      vars.coordinates.centerX = tCenterX - (tCenterX - vars.coordinates.centerX) * vars.scaleX;
    }

    if (vars.scaleY !== 1) {
      vars.coordinates.centerY = tCenterY - (tCenterY - vars.coordinates.centerY) * vars.scaleY;
    }

    if (vars.rotate % 360 !== 0) {
      var rotated = getRotateCoordinate(
        vars.coordinates.centerX, vars.coordinates.centerY,
        vars.rotate, tCenterX, tCenterY
      );
      vars.coordinates.centerX = rotated.x;
      vars.coordinates.centerY = rotated.y;
    }

    vars.coordinates.x1 = vars.x1 - shapeCenter.x + vars.coordinates.centerX + vars.translateX;
    vars.coordinates.y1 = vars.y1 - shapeCenter.y + vars.coordinates.centerY + vars.translateY;
    vars.coordinates.x2 = vars.x2 - shapeCenter.x + vars.coordinates.centerX + vars.translateX;
    vars.coordinates.y2 = vars.y2 - shapeCenter.y + vars.coordinates.centerY + vars.translateY;
  }

  //transition to draw
  vars.drawTranslate = {
    x: Math.min(vars.coordinates.x1, vars.coordinates.x2) + vars.width/2,
    y: Math.min(vars.coordinates.y1, vars.coordinates.y2) + vars.height/2
  };

  // bounding area
  // if (getBounding === true) {
  vars.bounding = getBoundingFunc[vars.type](
    vars.coordinates.x1, vars.coordinates.y1, vars.coordinates.x2, vars.coordinates.y2,
    vars.coordinates.centerX, vars.coordinates.centerY,
    vars.scaleX, vars.scaleY, vars.rotate
  );
  // }

  return vars;
}

Shape.prototype.set = function(toVars, duration, callback) {
  if (Object.keys(toVars).length === 0) {
    return;
  }

  if (duration === false || duration === undefined ||
      this.transition === undefined && (duration === undefined || duration <= 0)
  ) {
    return this.setValue(toVars);
  }

  if (toVars.scale !== undefined) {
    toVars.scaleX = toVars.scaleY = toVars.scale;
    delete toVars.scale;
  }

  var now = timing.now();
  duration = duration || 0;

  var keys = Object.keys(toVars)
    , i = keys.length;

  while (i--) {
    if (transitionShapeVars.indexOf(keys[i]) === -1) {
      delete toVars[keys[i]];
    }
  }

  if (this.transition !== undefined) {
    keys = Object.keys(this.transition.toVars);
    i = keys.length;

    while (i--) {
      if (toVars[keys[i]] === undefined) {
        toVars[keys[i]] = this.transition.toVars[keys[i]];
      }
    }
    duration = Math.max(duration, now - this.transition.startTime)
  }

  this.transition = {
    fromVars: this.getValue(Object.keys(toVars)),
    toVars: toVars,
    duration: duration,
    startTime: now,
    callback: callback
  };
}


Shape.prototype.update = function(values) {
  if (values !== undefined) {
    this.setValue(values);
  }

  if (this.transition !== undefined) {
    var now = timing.now()
      , transitionResult = transitionLoop(this.transition, now);

    if (transitionResult === false) {
      if (this.transition.toVars.rotate !== undefined) {
        this.transition.toVars.rotate = this.transition.toVars.rotate % 360;
      }
      this.setValue(this.transition.toVars);
      // console.log(this.transition.toVars);
      if (this.transition.callback !== undefined && typeof this.transition.callback === 'function') {
        this.transition.callback();
      }
      this.transitionEnd = true;
      delete this.transition;
    } else {
      this.setValue(transitionResult);
      this.transitionEnd = false;
    }
  } else if (this.transitionEnd !== undefined) {
    delete this.transitionEnd;
  }
  // if (this.transitionEnd === true) {
  //   console.log('end');
  // }
}

Shape.prototype.contains = function(x, y) {
  var vals = this.getValue([
    'type', 'coordinates',
    'scaleX', 'scaleY', 'rotate',
    'drawGapX', 'drawGapY'
  ]);

  return containsFunc[vals.type](x, y, {
    x1: vals.coordinates.x1 + vals.drawGapX,
    y1: vals.coordinates.y1 + vals.drawGapY,
    x2: vals.coordinates.x2 + vals.drawGapX,
    y2: vals.coordinates.y2 + vals.drawGapY,
    centerX: vals.coordinates.centerX + vals.drawGapX,
    centerY: vals.coordinates.centerY + vals.drawGapY,
    scaleX: vals.scaleX,
    scaleY: vals.scaleY,
    rotate: vals.rotate
  });
}

function getRotateCoordinate(x, y, degs, cx, cy) {
  var radian = degs * Math.PI / 180
    , sin = Math.sin(radian)
    , cos = Math.cos(radian)
    , cx = cx || 0
    , cy = cy || 0;

  return {
    x: (cos * (x-cx)) - (sin * (y-cy)) + cx,
    y: (sin * (x-cx)) + (cos * (y-cy)) + cy
  }
}

/* ************************
 * 2d draws
 ************************** */
Shape.prototype.draw = function(context, img, drawBounding) {
  if (context === undefined || context.drawImage === undefined) {
    return;
  }

  if (img === true && drawBounding === undefined) {
    drawBounding = true;
    img = undefined;
  }

  //draw bounding for debug
  if (drawBounding === true && this.bounding !== undefined) {
    drawToCanvas(context, 'rect', {coordinates: this.bounding}, this.boundingStyle);
  }

  drawToCanvas(context,
    this.getValue('type'),
    this.getValue(['width', 'height', 'coordinates', 'scaleX', 'scaleY',
                   'radian', 'drawTranslate', 'drawGapX', 'drawGapY']),
    this.getValue(['fillStyle', 'lineWidth', 'strokeStyle', 'opacity']),
    img
  );
}

function drawToCanvas(context, type, shape, style, img) {
  var scaleX = shape.scaleX || 1
    , scaleY = shape.scaleY || 1
    , radian = shape.radian || 0
    , width  = shape.width  ||
        Math.abs(shape.coordinates.x2 - shape.coordinates.x1)
    , height = shape.height ||
        Math.abs(shape.coordinates.y2 - shape.coordinates.y1)
    , tx = shape.drawTranslate && shape.drawTranslate.x ||
        Math.min(shape.coordinates.x1, shape.coordinates.x2) + width/2
    , ty = shape.drawTranslate && shape.drawTranslate.y ||
        Math.min(shape.coordinates.y1, shape.coordinates.y2) + height/2;

  if (shape.drawGapX !== undefined) {
    tx += shape.drawGapX;
  }

  if (shape.drawGapY !== undefined) {
    ty += shape.drawGapY;
  }

  // 2d context
  context.save();

  if (style.opacity < 1) {
    context.globalAlpha = style.opacity;
  }
  context.translate(tx, ty);
  context.rotate(radian);
  context.scale(scaleX, scaleY);

  context.beginPath();
  drawFunc[type](context, width, height, shape.coordinates);
  context.closePath();

  if (img !== undefined) {
    context.clip();
    context.drawImage(img, -width/2, -height/2, width, height)
  }

  else if (style.fillStyle !== undefined) {
    context.fillStyle = style.fillStyle;
    context.fill();
  }

  if (style.strokeStyle !== undefined && style.lineWidth > 0) {
    context.lineWidth = style.lineWidth;
    context.strokeStyle = style.strokeStyle;
    context.stroke();
  }

  context.restore();
}

function drawLine(context, width, height, coordinates) {
  width = (coordinates.x2 - coordinates.x1) / 2
  height = (coordinates.y2 - coordinates.y1) / 2;
  context.moveTo(-width, -height);
  context.lineTo(width, height);
}

function drawRect(context, width, height) {
  context.rect(-width/2, -height/2, width, height);
}

function drawCircle(context, width, height) {
  var kappa = .5522848
    , rx = width / 2
    , ry = height / 2
    , t = -ry * kappa
    , r = rx * kappa
    , b = ry * kappa
    , l = -rx * kappa;

  context.moveTo(0, -ry);
  context.bezierCurveTo(r, -ry, rx, t, rx, 0);
  context.bezierCurveTo(rx, b, r, ry, 0, ry);
  context.bezierCurveTo(l, ry, -rx, b, -rx, 0);
  context.bezierCurveTo(-rx, t, l, -ry, 0, -ry);
}

/* ********************************
 * contains, get boundings
 ******************************** */
/* line */
function containsLine(x, y, vals) {
  return false;
}

function getLineBounding(x1, y1, x2, y2, cx, cy, scaleX, scaleY, degs) {
  return getRectBounding(x1, y1, x2, y2, cx, cy, scaleX, scaleY, degs);
}

/* rectangle */
function containsRect(x, y, vals) {
  var cx = vals.centerX
    , cy = vals.centerY
    , x1 = cx - (cx - vals.x1) * vals.scaleX
    , y1 = cy - (cy - vals.y1) * vals.scaleY
    , x2 = cx - (cx - vals.x2) * vals.scaleX
    , y2 = cy - (cy - vals.y2) * vals.scaleY;

  var minX = Math.min(x1, x2)
    , maxX = Math.max(x1, x2)
    , minY = Math.min(y1, y2)
    , maxY = Math.max(y1, y2)
    , point = {x: x, y: y};

  if (vals.rotate % 360 !== 0) {
    point = getRotateCoordinate(x, y, -vals.rotate, cx, cy);
  }

  if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
    return false;
  }

  return {
    x: Math.round((point.x - minX) / vals.scaleX),
    y: Math.round((point.y - minY) / vals.scaleY)
  };
}

function getRectBounding(x1, y1, x2, y2, cx, cy, scaleX, scaleY, degs) {
  var w = Math.abs(x2 - x1) * scaleX
    , h = Math.abs(y2 - y1) * scaleY
    , degs = Math.abs(degs % 360)

  if ((degs > 90 && degs < 180) || (degs > 270 && degs < 360)) {
    degs = 180 - degs;
  }

  var radian = degs * Math.PI / 180
    , sin = Math.sin(radian)
    , cos = Math.cos(radian)
    , dx = sin * h + cos * w
    , dy = sin * w + cos * h;

  if (degs >= 0 && degs <= 90) {
    x1 = cx - dx / 2;
    y1 = cy - dy / 2;
    x2 = cx + dx / 2;
    y2 = cy + dy / 2;
  } else {
    x1 = cx + dx / 2;
    y1 = cy + dy / 2;
    x2 = cx - dx / 2;
    y2 = cy - dy / 2;
  }

  return {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2
  };
}

/* circle */
function containsCircle(x, y, vals) {
  var x1 = vals.x1
    , y1 = vals.y1
    , x2 = vals.x2
    , y2 = vals.y2
    , cx = vals.centerX
    , cy = vals.centerY
    , rx = (x2 - x1) / 2
    , ry = (y2 - y1) / 2
    , dim = {x: x - rx - x1, y: y - ry - y1};

  if (vals.rotate % 360 !== 0) {
    dim = getRotateCoordinate(dim.x, dim.y, -vals.rotate);
  }

  var dx = (dim.x / vals.scaleX)
    , dy = (dim.y / vals.scaleY);

  if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1) {
    return false;
  }

  var point = {x: x, y: y}
    , minX = Math.min(cx - (cx - x1) * vals.scaleX, cx - (cx - x2) * vals.scaleX)
    , minY = Math.min(cy - (cy - y1) * vals.scaleY, cy - (cy - y2) * vals.scaleY);

  if (vals.rotate % 360 !== 0) {
    point = getRotateCoordinate(x, y, -vals.rotate, cx, cy);
  }

  return {
    x: Math.round((point.x - minX) / vals.scaleX),
    y: Math.round((point.y - minY) / vals.scaleY)
  };
}

function getCircleBounding(x1, y1, x2, y2, cx, cy, scaleX, scaleY, degs) {
  var rx = (x2 - x1) / 2 * scaleX
    , ry = (y2 - y1) / 2 * scaleY;

  var radian = Math.PI / 180 * degs
    , sin = Math.sin(radian)
    , cos = Math.cos(radian)
    , x = Math.sqrt(rx * rx * cos * cos + ry * ry * sin * sin)
    , y = Math.sqrt(rx * rx * sin * sin + ry * ry * cos * cos);

  return {
    x1: Math.min(cx + x, cx - x),
    y1: Math.min(cy + y, cy - y),
    x2: Math.max(cx + x, cx - x),
    y2: Math.max(cy + y, cy - y)
  };
}

/* *********************************************
 * transition
 ********************************************* */
function transitionLoop(transition, now) {
  var pass = now - transition.startTime;

  if (pass > transition.duration) {
    return false;
  }

  var keys = Object.keys(transition.fromVars)
    , i = keys.length
    , dist
    , currentVars = {};

  while (i--) {
    dist = transition.toVars[keys[i]] - transition.fromVars[keys[i]];
    currentVars[keys[i]] = easingFunc(pass, transition.fromVars[keys[i]], dist, transition.duration);
  }

  return currentVars;
}

function easingFunc(t, b, c, d) {
  // easeOutSine
  // return c * Math.sin(t/d * (Math.PI/2)) + b;
  // easeOutCubic
  return c*((t=t/d-1)*t*t + 1) + b;
}

},{}]},{},[4])(4)
});