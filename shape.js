
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
