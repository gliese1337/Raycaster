var CIRCLE = Math.PI * 2;

function Controls() {
	"use strict";
	this.codes  = { 32: 'forward', 37: 'left', 39: 'right', 38: 'up', 40: 'down' };
	this.states = { 'forward': false, 'left': false, 'right': false, 'up': false, 'down': false };
	document.addEventListener('keydown', this.onKey.bind(this, true), false);
	document.addEventListener('keyup', this.onKey.bind(this, false), false);
}

Controls.prototype.onKey = function(val, e) {
	"use strict";
	var state = this.codes[e.keyCode];
	if (typeof state === 'undefined') return;
	this.states[state] = val;
	e.preventDefault && e.preventDefault();
	e.stopPropagation && e.stopPropagation();
};

function Bitmap(src, width, height) {
	"use strict";
	this.image = new Image();
	this.image.src = src;
	this.width = width;
	this.height = height;
}

function Player(x, y, z, theta, phi) {
	"use strict";
	this.x = x;
	this.y = y;
	this.z = z;
	this.speed = 0;
	this.theta = (theta + CIRCLE) % CIRCLE;
	this.phi = phi % Math.PI/2;
}

Player.prototype.rotate = function(angle) {
	"use strict";
	this.theta = (this.theta + angle + CIRCLE) % CIRCLE;
};

Player.prototype.incline = function(angle) {
	"use strict";
	this.phi = (this.phi + angle) % (Math.PI/2);
};

Player.prototype.walk = function(distance, map) {
	"use strict";
	var dx = Math.cos(this.theta)*Math.cos(this.phi) * distance;
	var dy = Math.sin(this.theta)*Math.cos(this.phi) * distance;
	var dz = Math.sin(this.phi) * distance;
	if (map.get(Math.floor(this.x + dx), Math.floor(this.y), Math.floor(this.z)) === 0) this.x += dx;
	if (map.get(Math.floor(this.x), Math.floor(this.y + dy), Math.floor(this.z)) === 0) this.y += dy;
	if (map.get(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z + dz)) === 0) this.z += dz;
};

Player.prototype.update = function(controls, map, seconds) {
	var moved = false;
	if (controls.right){
		this.rotate(seconds * Math.PI/6);
	} else if (controls.left){
		this.rotate(-seconds * Math.PI/6);
	}
	
	if (controls.up){
		this.incline(seconds * Math.PI/6);
	} else if (controls.down){
		this.incline(-seconds * Math.PI/6);
	}
	
	if (controls.forward){
		if(this.speed < 10){ this.speed += .5*seconds; }
	} else {
		if(this.speed < .01){ this.speed = 0; }
		else{ this.speed /= Math.pow(3,seconds); }
	}

	if(this.speed != 0){ this.walk(this.speed * seconds, map); }		
};

function GameMap(width, height, depth) {
	"use strict";
	this.width = width;
	this.height = height;
	this.depth = depth;
	this.zstride = width * height;
	this.wallGrid = new Uint16Array(width * height * depth);
	this.skybox = new Bitmap('./deathvalley_panorama.jpg', 4000, 1290);
	this.textures = [
		new Bitmap('./texture1.jpg', 1024, 1024),
		new Bitmap('./texture2.jpg', 1024, 1024),
		new Bitmap('./texture3.jpg', 1024, 1024),
		new Bitmap('./texture4.jpg', 1024, 1024)
	];
}

GameMap.prototype.get = function(x, y, z) {
	"use strict";
	x %= this.width;
	y %= this.height;
	z %= this.depth;
	if(x < 0){ x += this.width; }
	if(y < 0){ y += this.height; }
	if(z < 0){ z += this.depth; }
	return this.wallGrid[z * this.zstride + y * this.width + x];
};

GameMap.prototype.randomize = function(fraction) {
	"use strict";
	var i, len = this.zstride * this.depth;
	for (i = 0; i < len; i++) {
		this.wallGrid[i] = Math.random() < fraction ? Math.floor(Math.random()*4096) + 1 : 0;
	}
};

GameMap.prototype.maze = function(fraction){
	"use strict";
	var i, j, k,
		len = this.zstride * this.depth,
		texture = Math.floor(Math.random()*4096) + 1,
		maze = Maze(this.width/2,this.height/2,this.depth/2);
	for(i = 0; i < this.depth; i++){
		for(j = 0; j < this.height; j++){
			for(k = 0; k < this.width; k++){
				this.wallGrid[i * this.zstride + j * this.width + k] = maze[i][j][k]*texture;
			}
		}
	}
	this.wallGrid[0] = 0;
	for (i = 0; i < len; i++) {
		if(Math.random() < fraction){ this.wallGrid[i] = 0; }
	}
};

GameMap.prototype.cast = function(point, vector, range) {
	"use strict";
	var xc = vector[0],
		yc = vector[1],
		zc = vector[2];

	// Starting from the player, we find the nearest horizontal and vertical gridlines. We move to whichever is closer and check for a wall (inspect). Then we repeat until we've traced the entire length of each ray.

	var mx, my, mz, sx, sy, sz, dx, dy, dz,
		xdelta, ydelta, zdelta,
		xdist, ydist, zdist,
		value, dim,
		x = point[0],
		y = point[1],
		z = point[2],
		distance = 0;
	
	xdelta = Math.abs(1/xc);
	ydelta = Math.abs(1/yc);
	zdelta = Math.abs(1/zc);

	if(xc > 0){
		sx = 1;
		mx = Math.floor(x);
		dx = mx + 1 - x;
	}else{
		sx = -1;
		mx = Math.ceil(x - 1);
		dx = mx - x;
	}
	dy = dx * (yc/xc||0); //||0 protects against NaN
	dz = dx * (zc/xc||0);
	xdist = Math.sqrt(dx*dx + dy*dy + dz*dz);

	if(yc > 0){
		sy = 1;
		my = Math.floor(y);
		dy = my + 1 - y;
	}else{
		sy = -1;
		my = Math.ceil(y - 1);
		dy = my - y;
	}
	dx = dy * (xc/yc||0);
	dz = dy * (zc/yc||0);
	ydist = Math.sqrt(dx*dx + dy*dy + dz*dz);
	
	if(zc > 0){
		sz = 1;
		mz = Math.floor(z);
		dz = mz + 1 - z;
	}else{
		sz = -1;
		mz = Math.ceil(z - 1);
		dz = mz - z;
	}
	dx = dz * (xc/zc||0);
	dy = dz * (yc/zc||0);
	zdist = Math.sqrt(dx*dx + dy*dy + dz*dz);

	do {
		switch(Math.min(xdist, ydist, zdist)){
		case xdist:
			dim = 0;
			mx += sx;
			distance = xdist;
			xdist += xdelta;
			break;
		case ydist:
			dim = 1;
			my += sy;
			distance = ydist;
			ydist += ydelta;
			break;
		case zdist:
			dim = 2;
			mz += sz;
			distance = zdist;
			zdist += zdelta;
			break;
		default:
			debugger;
			throw "NaN snuck through";
		}
		value = this.get(mx, my, mz);
	} while(value === 0 && distance < range);

	return {
		x: x + distance * xc,
		y: y + distance * yc,
		z: z + distance * zc,
		vector: vector,
		dimension: dim,
		value: value,
		distance: distance,
	};
};

function Camera(canvas, hres, vres, fov) {
	"use strict";
	var i, angle,
		width = 4*hres,//window.innerWidth * 0.5,
		height = 4*vres,//window.innerHeight * 0.5,
		scale = Math.tan(fov/2);

	this.ctx = canvas.getContext('2d');
	this.width = canvas.width = width;
	this.height = canvas.height = height;
	this.hres = hres;
	this.vres = vres;
	this.hspacing = width / hres;
	this.vspacing = height / vres;
	this.fov = fov;
	this.lightRange = 40;
	this.fps = [];
	this.scale = scale;
}

Camera.prototype.render = function(player, map, seconds) {
	"use strict";
	var fps;
	this.drawSky(player.theta, map.skybox, map.light);
	this.drawForeground(player, map);
	if(this.fps.length > 20){ this.fps.shift(); }
	this.fps.push(1/seconds);
	fps = this.fps.reduce(function(a,n){ return a + n; })/this.fps.length;
	this.ctx.fillStyle = "#ffffff";
	this.ctx.font = "12px Arial";
	this.ctx.fillText(Math.round(fps).toString()+" FPS", 25, 25);
};

Camera.prototype.drawSky = function(theta, sky, ambient) {
	"use strict";
	var width = this.width * (CIRCLE / this.fov);
	var left = -width * theta / CIRCLE;

	this.ctx.save();
	this.ctx.drawImage(sky.image, left, 0, width, this.height);
	if (left < width - this.width) {
		this.ctx.drawImage(sky.image, left + width, 0, width, this.height);
	}
	if (ambient > 0) {
		this.ctx.fillStyle = '#ffffff';
		this.ctx.globalAlpha = ambient * 0.1;
		this.ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5);
	}
	this.ctx.restore();
};

Camera.prototype.drawForeground = function(player, map) {
	"use strict";
	var hres = this.hres,
		vres = this.vres,
		col, row, ray;

	this.ctx.save();
	for (col = 0; col < hres; col++) {
		for (row = 0; row < vres; row++) {
			ray = this.cast(player, player, col, row, map);
			if(ray.value > 0){ this.drawPixel(col, row, ray, map); }
		}
	}
	this.ctx.restore();
};

Camera.prototype.cast = function(origin, look, x, y, map){
	var theta = look.theta + Math.atan(this.scale*(x / this.hres - 0.5));
	var phi = look.phi + Math.atan(this.scale*(y / this.vres - 0.5));
	var tcos = Math.cos(theta);
	var tsin = Math.sin(theta);
	var pcos = Math.cos(phi);
	var psin = Math.sin(phi);
	return map.cast(
		[origin.x, origin.y, origin.z],
		[tcos*pcos, tsin*pcos, psin], 10
	);
};

var shades = [.125,.125,.33,.5,.5,.5];
Camera.prototype.drawPixel = function(col, row, ray, map) {
	"use strict";
	var ctx = this.ctx;
	var left = Math.floor(col * this.hspacing);
	var top = Math.floor(row * this.vspacing);
	var width = Math.ceil(this.hspacing);
	var height = Math.ceil(this.vspacing);
	var value = ray.value - 1; //so we can use the 0 index
	var dim = ray.dimension;
	var side = dim + (ray.vector[dim] < 0 ? 0 : 3);
	var texture = map.textures[(value >> (side * 2)) & 3];
	var x, y;
	
	switch(dim){
	case 0:
		x = ray.z;
		y = ray.y;
		break;
	case 1:
		x = ray.z;
		y = ray.x;
		break;
	case 2:
		x = ray.x;
		y = ray.y;
		break;
	}

	ctx.globalAlpha = 1;
	ctx.drawImage(
		texture.image,
		texture.width * (x - Math.floor(x)),
		texture.height * (y - Math.floor(y)), 1, 1,
		left, top, width, height
	);

	ctx.fillStyle = '#000000';
	ctx.globalAlpha = shades[side];
	ctx.fillRect(left, top, 1, 1);
};

function GameLoop(body) {
	"use strict";
	this.lastTime = 0;
	this.body = body;
	this.stop = false;
}

GameLoop.prototype.start = function() {
	"use strict";
	var that = this;
	requestAnimationFrame(function frame(time) {
		var seconds = (time - that.lastTime) / 1000;
		that.lastTime = time;
		that.body(seconds);
		if(!that.stop){ requestAnimationFrame(frame); }
	});
};

function main(display){
	var map = new GameMap(8,8,8);
	map.randomize(.01);
	//map.maze(.05);
	
	var px = 0, py = 0, pz = 2;
	start_loop: for(;px < 8; px++){
		for(;py < 8; py++){
			for(;pz < 8; pz++){
				if(map.get(px,py,pz) === 0){ break start_loop; }
			}
		}
	}
	var player = new Player(px+.5, py+.5, pz+.5, Math.PI * 0.5, 0);
	var controls = new Controls();
	var camera = new Camera(display, 80, 80, Math.PI * 0.4);
	var loop = new GameLoop(function(seconds){
		player.update(controls.states, map, seconds);
		camera.render(player, map, seconds);
	});

	loop.start();
}