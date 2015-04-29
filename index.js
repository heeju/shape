Shape.getBoundingFunc = {
  // 'line': getLineBound,
  'rect': getRectBound,
  'circle': getCircleBound
};

Shape.drawFunc = {
  // 'line': drawLine,
  'rect': drawRect,
  'circle': drawCircle
};

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
    fillStyle: '#bbb'
  };

  var variables = {}
    , changeable = ['x1', 'y1', 'x2', 'y2', 'scaleX', 'scaleY', 'rotate']
    , styles = ['fillStyle', 'lineWidth', 'strokeStyle', 'img', 'opacity'];

  variables.type = type;

  // inputed coordinate
  variables.x1 = 0;
  variables.y1 = 0;
  variables.x2 = 0;
  variables.y2 = 0;

  variables.scaleX = 1;
  variables.scaleY = 1;
  variables.rotate = 0;
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
        variables = applyChange(variables, this);
      }
      return;
    }

    //set coordinate
    if (changeable.indexOf(name) > -1 && variables[name] !== value) {
      variables[name] = value;
      changed = true;
    }

    if (name === 'scale') {
      variables.scaleX = value;
      variables.scaleY = value;
      changed = true;
    }

    //set styles
    if (styles.indexOf(name) > -1 && variables[name] !== value) {
      variables[name] = value;
    }

    if (changed === true && doApply !== false) {
      variables = applyChange(variables, this);
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


function applyChange(vars, self) {
  vars.center = {
    x: (vars.x1 + vars.x2) / 2,
    y: (vars.y1 + vars.y2) / 2
  };

  vars.width = Math.abs(vars.x2 - vars.x1);
  vars.height = Math.abs(vars.y2 - vars.y1);
  vars.radian = vars.rotate * Math.PI / 180;

  // bounding area
  self.bounding = Shape.getBoundingFunc[vars.type](
    vars.x1, vars.y1, vars.x2, vars.y2, vars.scaleX, vars.scaleY, vars.rotate
  );

  return vars;
}


Shape.prototype.update = function(dt, dx) {
  var now = (window.performance || Date).now();

  if (this.transition !== undefined) {
    var transitionResult = transitionLoop(this.transition, now, dt, dx);
    if (transitionResult === false) {
      // console.log(this.transition.toVars);
      this.setValue(this.transition.toVars);
      delete this.transition;
    } else {
      // console.log(transitionResult);
      this.setValue(transitionResult);
    }
  }
}

Shape.prototype.set = function(toVars, duration) {
  if (Object.keys(toVars).length === 0) {
    return;
  }

  if (this.transition === undefined && duration === undefined || duration <= 0) {
    return this.setValue(toVars);
  }

  if (toVars.scale !== undefined) {
    toVars.scaleX = toVars.scaleY = toVars.scale;
    delete toVars.scale;
  }

  var now = (window.performance || Date).now();
  duration = duration || 0;

  if (this.transition !== undefined) {
    var keys = Object.keys(this.transition.toVars)
      , i = keys.length;

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

}


Shape.prototype.draw = function(context, drawBounding) {
  if (context === undefined || context.drawImage === undefined) {
    return;
  }

  if (drawBounding === true) {
    drawToCanvas(context, 'rect', this.bounding, this.boundingStyle);
  }

  else if (drawBounding.constructor === Image) {
    this.setValue('img', drawBounding);
  }

  var type = this.getValue('type')
    , shape = this.getValue(['x1', 'y1', 'x2', 'y2', 'width', 'height', 'scaleX', 'scaleY', 'rotate'])
    , style = this.getValue(['fillStyle', 'lineWidth', 'strokeStyle', 'img', 'opacity']);

  drawToCanvas(context, type, shape, style);
}


function drawToCanvas(context, type, shape, style) {
  var x = Math.min(shape.x1, shape.x2)
    , y = Math.min(shape.y1, shape.y2)
    , width = shape.width || Math.abs(shape.x2 - shape.x1)
    , height = shape.height || Math.abs(shape.y2 - shape.y1)
    , scaleX = shape.scaleX || 1
    , scaleY = shape.scaleY || 1
    , rotate = shape.rotate || 0;

  context.save();

  context.beginPath();
  context.translate(width / 2 + x, height / 2 + y);
  context.rotate(rotate * Math.PI / 180);
  context.scale(scaleX, scaleY);
  Shape.drawFunc[type](context, width, height);
  context.closePath();

  if (style.opacity < 1) {
    context.globalAlpha = style.opacity;
  }

  if (style.strokeStyle && style.lineWidth > 0) {
    context.lineWidth = style.lineWidth;
    context.strokeStyle = style.strokeStyle;
    context.stroke();
  }

  if (style.fillStyle) {
    context.fillStyle = style.fillStyle;
    context.fill();
  }

  // if (style.img !== undefined) {

  // }

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



/**
 * line
 */
function containsLine(x, y, get) {

}

function drawLine(context, get) {

}



/**********************************
 * rectangle
 ********************************* */
function containsRect(x, y, get) {
  var x1
    , y1
    , x2
    , y2
    , scaleX
    , scaleY
    , degs;

  var cx = (x1 + x2) / 2
    , cy = (y1 + y2) / 2;

  x1 = cx - (cx - x1) * scaleX;
  y1 = cy - (cy - y1) * scaleY;
  x2 = cx - (cx - x2) * scaleX;
  y2 = cy - (cy - y2) * scaleY;

  var minX = Math.min(x1, x2)
    , maxX = Math.max(x1, x2)
    , minY = Math.min(y1, y2)
    , maxY = Math.max(y1, y2)
    , point = {x: x, y: y};

  if (degs % 360 !== 0) {
    point = getRotateCoordinate(x, y, -degs, cx, cy);
  }

  if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
    return false;
  }

  return point;
}


function getRectBound(x1, y1, x2, y2, scaleX, scaleY, degs) {

  var cx = (x1 + x2) / 2
    , cy = (y1 + y2) / 2
    , w = Math.abs(x2 - x1) * scaleX
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
    x1 = cx - dx/2;
    y1 = cy - dy/2;
    x2 = cx + dx/2;
    y2 = cy + dy/2;
  } else {
    x1 = cx + dx/2;
    y1 = cy + dy/2;
    x2 = cx - dx/2;
    y2 = cy - dy/2;
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
function containsCircle(x, y, get) {
  var x1
    , y1
    , x2
    , y2
    , scaleX
    , scaleY
    , degs;

  var cx = (x1 + x2) / 2
    , cy = (y1 + y2) / 2;

  var rx = (x2 - x1) / 2
    , ry = (y2 - y1) / 2
    , dim = {x: x - rx - x1, y: y - ry - y1};

  if (degs % 360 !== 0) {
    dim = getRotateCoordinate(dim.x, dim.y, degs);
  }

  var dx = (dim.x / scaleX)
    , dy = (dim.y / scaleY);

  if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1) {
    return false;
  }

  if (deg % 360 !== 0) {
    return getRotateCoordinate(x, y, -deg, cx, cy);
  } else {
    return {x:x, y: y};
  }
}

//get bound
function getCircleBound(x1, y1, x2, y2, scaleX, scaleY, degs) {
  var rx = (x2 - x1) / 2 * scaleX
    , ry = (y2 - y1) / 2 * scaleY
    , cx = (x1 + x2) / 2
    , cy = (y1 + y2) / 2;

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
    , rx      = width / 2
    , ry      = height / 2
    , rt    = -ry * kappa
    , rr  = rx * kappa
    , rb = ry * kappa
    , rl   = -rx * kappa;

  context.moveTo(0, -ry);
  context.bezierCurveTo(rr,  -ry, rx,  rt,  rx,  0);
  context.bezierCurveTo(rx,  rb,  rr,  ry,  0,   ry);
  context.bezierCurveTo(rl,  ry,  -rx, rb,  -rx, 0);
  context.bezierCurveTo(-rx, rt,  rl,  -ry, 0,   -ry);
}


/* *********************************************
 * transition
 ********************************************* */
function transitionLoop(transition, now, dt, dx) {
  var pass = now - transition.startTime;

  if (pass > transition.duration) {
    return false;
  }

  var currentVars = {}
    , dist
    , keys = Object.keys(transition.fromVars)
    , i = keys.length;

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
