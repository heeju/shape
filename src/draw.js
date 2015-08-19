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
