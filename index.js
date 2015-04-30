Shape.getBoundingFunc = {
  // 'line': getLineBound,
  'rect': getRectBound,
  'circle': getCircleBound
};

Shape.containsFunc = {
  // 'line': drawLine,
  'rect': containsRect,
  'circle': containsCircle
};

Shape.drawFunc = {
  // 'line': drawLine,
  'rect': drawRect,
  'circle': drawCircle
};

Shape.vars = [
  'x1', 'y1', 'x2', 'y2', 'centerX', 'centerY',
  'scaleX', 'scaleY', 'rotate',
  'fillStyle', 'lineWidth', 'strokeStyle', 'img', 'opacity',
  'pointerX', 'pointerY'
];

Shape.changeableVars = [
  'x1', 'y1', 'x2', 'y2', 'scaleX', 'scaleY', 'rotate'
];

Shape.transitionVars = [
  'x1', 'y1', 'x2', 'y2', 'scaleX', 'scaleY', 'rotate', 'opacity'
];

Shape.time = window.performance || Date;

function Shape(type, values) {
  var enableTypes = ['line', 'rect', 'circle'];

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
    fillStyle: '#aaa',
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

  //style
  variables.opacity = 1;

  //setter vars
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
      }
      return;
    }

    //set values
    if (Shape.vars.indexOf(name) > -1 && variables[name] !== value) {
      variables[name] = value;
      if (Shape.changeableVars.indexOf(name) > -1) {
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
    }

    if (variables.bounding) {
      self.bounding = variables.bounding;
    }

    return changed;
  }

  //getter vars
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

  // console.log('variables', variables);
}


function applyChange(vars, getBounding) {
  vars.shapeCenter = {
    x: (vars.x1 + vars.x2) / 2,
    y: (vars.y1 + vars.y2) / 2
  }

  if (vars.centerX === null || vars.centerX === undefined) {
    vars.centerX = vars.shapeCenter.x;
  }

  if (vars.centerX === null || vars.centerY === undefined) {
    vars.centerY = vars.shapeCenter.y;
  }

  vars.width = Math.abs(vars.x2 - vars.x1);
  vars.height = Math.abs(vars.y2 - vars.y1);
  vars.radian = vars.rotate * Math.PI / 180;

  vars.coordinates = {
    x1: vars.x1,
    y1: vars.y1,
    x2: vars.x2,
    y2: vars.y2,
    centerX: vars.shapeCenter.x,
    centerY: vars.shapeCenter.y
  }

  if (vars.centerX !== vars.shapeCenter.x || vars.centerY !== vars.shapeCenter.y) {

    if (vars.scaleX !== 1) {
      vars.coordinates.centerX = vars.centerX - (vars.centerX - vars.coordinates.centerX) * vars.scaleX;
    }

    if (vars.scaleY !== 1) {
      vars.coordinates.centerY = vars.centerY - (vars.centerY - vars.coordinates.centerY) * vars.scaleY;
    }

    if (vars.rotate % 360 !== 0) {
      var rotated = getRotateCoordinate(
        vars.coordinates.centerX, vars.coordinates.centerY,
        vars.rotate,
        vars.centerX, vars.centerY
      );
      vars.coordinates.centerX = rotated.x;
      vars.coordinates.centerY = rotated.y;
    }

    vars.coordinates.x1 = vars.x1 - vars.shapeCenter.x + vars.coordinates.centerX;
    vars.coordinates.y1 = vars.y1 - vars.shapeCenter.y + vars.coordinates.centerY;
    vars.coordinates.x2 = vars.x2 - vars.shapeCenter.x + vars.coordinates.centerX;
    vars.coordinates.y2 = vars.y2 - vars.shapeCenter.y + vars.coordinates.centerY;
  }


  // bounding area
  if (getBounding === true) {
    vars.bounding = Shape.getBoundingFunc[vars.type](
      vars.coordinates.x1, vars.coordinates.y1, vars.coordinates.x2, vars.coordinates.y2,
      vars.coordinates.centerX, vars.coordinates.centerY,
      vars.scaleX, vars.scaleY, vars.rotate
    );
  }

  return vars;
}


Shape.prototype.update = function(values) {
  if (values !== undefined) {
    this.set(values, false);
  }

  if (this.transition !== undefined) {
    var now = Shape.time.now()
      , transitionResult = transitionLoop(this.transition, now);

    if (transitionResult === false) {
      this.setValue(this.transition.toVars);
      // console.log(this.transition.toVars);
      delete this.transition;
    } else {
      this.setValue(transitionResult);
      // console.log(transitionResult);
    }
  }


  //mouse pointer
}

Shape.prototype.set = function(toVars, duration) {
  if (Object.keys(toVars).length === 0) {
    return;
  }


  if (duration === false ||
      this.transition === undefined && (duration === undefined || duration <= 0)
  ) {
    return this.setValue(toVars);
  }

  if (toVars.scale !== undefined) {
    toVars.scaleX = toVars.scaleY = toVars.scale;
    delete toVars.scale;
  }

  var now = Shape.time.now();
  duration = duration || 0;

  var keys = Object.keys(toVars)
    , i = keys.length;

  while (i--) {
    if (Shape.transitionVars.indexOf(keys[i]) === -1) {
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
    startTime: now
  };
}

// Shape.prototype.move = function(vx, vy) {
//   return this.set();
// }

// Shape.prototype.scale = function(xScale, yScale) {
//   return this.set({scale:{x:xScale, y:yScale}});
// }

// Shape.prototype.rotate = function(degree) {
//   return this.set({rotate:degree});
// }


Shape.prototype.contains = function(x, y) {
  var vals = this.getValue([
    'type', 'coordinates',
    'scaleX', 'scaleY', 'rotate'
  ]);
  return Shape.containsFunc[vals.type](x, y, vals);
}


function contains(type, vals) {

}

/* ************************
 * draws
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

  // if (img.constructor !== Image) {
  //   // this.setValue('img', drawBounding);
  //   img = undefined;
  // }

  drawToCanvas(context,
    this.getValue('type'),
    this.getValue(['coordinates', 'width', 'height', 'scaleX', 'scaleY', 'radian']),
    this.getValue(['fillStyle', 'lineWidth', 'strokeStyle', 'opacity']),
    img
  );
}


function drawToCanvas(context, type, shape, style, img) {
  var x = Math.min(shape.coordinates.x1, shape.coordinates.x2)
    , y = Math.min(shape.coordinates.y1, shape.coordinates.y2)
    , width = shape.width || Math.abs(shape.coordinates.x2 - shape.coordinates.x1)
    , height = shape.height || Math.abs(shape.coordinates.y2 - shape.coordinates.y1)
    , scaleX = shape.scaleX || 1
    , scaleY = shape.scaleY || 1
    , radian = shape.radian || 0;

  // 2d context
  context.save();

  if (style.opacity < 1) {
    context.globalAlpha = style.opacity;
  }
  context.translate(width / 2 + x, height / 2 + y);
  context.rotate(radian);
  context.scale(scaleX, scaleY);

  context.beginPath();
  Shape.drawFunc[type](context, width, height);
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



/**********************************
 * line
 **********************************/
function containsLine(x, y, get) {

}

function drawLine(context, get) {

}



/**********************************
 * rectangle
 ********************************* */
function containsRect(x, y, vals) {

  var x1 = vals.coordinates.x1
    , y1 = vals.coordinates.y1
    , x2 = vals.coordinates.x2
    , y2 = vals.coordinates.y2
    , cx = vals.coordinates.centerX
    , cy = vals.coordinates.centerY;

  x1 = cx - (cx - x1) * vals.scaleX;
  y1 = cy - (cy - y1) * vals.scaleY;
  x2 = cx - (cx - x2) * vals.scaleX;
  y2 = cy - (cy - y2) * vals.scaleY;

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


function getRectBound(x1, y1, x2, y2, cx, cy, scaleX, scaleY, degs) {

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

function drawRect(context, width, height) {
  context.rect(-width/2, -height/2, width, height);
}

/**********************************
 * circle
 ********************************* */
function containsCircle(x, y, vals) {
  var x1 = vals.coordinates.x1
    , y1 = vals.coordinates.y1
    , x2 = vals.coordinates.x2
    , y2 = vals.coordinates.y2
    , cx = vals.coordinates.centerX
    , cy = vals.coordinates.centerY
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

//get bound
function getCircleBound(x1, y1, x2, y2, cx, cy, scaleX, scaleY, degs) {
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

//draw circle
function drawCircle(context, width, height) {
  var kappa = .5522848
    , rx = width / 2
    , ry = height / 2
    , rt = -ry * kappa
    , rr = rx * kappa
    , rb = ry * kappa
    , rl = -rx * kappa;

  context.moveTo(0, -ry);
  context.bezierCurveTo(rr, -ry, rx, rt, rx, 0);
  context.bezierCurveTo(rx, rb, rr, ry, 0, ry);
  context.bezierCurveTo(rl, ry, -rx, rb, -rx, 0);
  context.bezierCurveTo(-rx, rt, rl, -ry, 0, -ry);
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
  return c * Math.sin(t/d * (Math.PI/2)) + b;
}
