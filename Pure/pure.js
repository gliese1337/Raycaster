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
	var nx = (((this.x + dx) % 8) + 8) % 8;
	var ny = (((this.y + dy) % 8) + 8) % 8;
	var nz = (((this.z + dz) % 8) + 8) % 8;
	/*if (map[Math.floor(nx)*64 + Math.floor(this.y)*8 + Math.floor(this.z)] === 0) this.x = nx;
	if (map[Math.floor(this.x)*64 + Math.floor(ny)*8 + Math.floor(this.z)] === 0) this.y = ny;
	if (map[Math.floor(this.x)*64 + Math.floor(this.y)*8 + Math.floor(nz)] === 0) this.z = nz;
	*/
	this.x = nx;
	this.y = ny;
	this.z = nz;
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

function Camera(canvas, hres, vres, fov, _, map) {
	"use strict";
	var scale,
		width = 4*hres,  //window.innerWidth * 0.5,
		height = 4*vres; //window.innerHeight * 0.5,

	this.ctx = canvas.getContext('2d');
	this.width = canvas.width = width;
	this.height = canvas.height = height;
	this.hres = hres;
	this.vres = vres;
	this.hspacing = width / hres;
	this.vspacing = height / vres;
	this.fov = fov;
	this.fps = [];
	
	scale = Math.tan(fov/2);
	this.cast = getFragShader({x: hres, y: vres}, {h:scale, v:scale}, map);
}

Camera.prototype.render = function(player, map, seconds) {
	"use strict";
	var fps;
	this.clear();
	this.draw(player, map);
	if(this.fps.length > 20){ this.fps.shift(); }
	this.fps.push(1/seconds);
	fps = this.fps.reduce(function(a,n){ return a + n; })/this.fps.length;
	this.ctx.fillStyle = "#ffffff";
	this.ctx.font = "12px Arial";
	this.ctx.fillText(Math.round(fps).toString()+" FPS", 25, 25);
};

Camera.prototype.clear = function() {
	"use strict";
	this.ctx.save();
	this.ctx.fillStyle = '#ffffff';
	this.ctx.globalAlpha = 1;
	this.ctx.fillRect(0, 0, this.width, this.height);
	this.ctx.restore();
};

Camera.prototype.draw = function(player){
	"use strict";
	var hres = this.hres,
		vres = this.vres,
		col, row, color;

	this.ctx.save();
	for (col = 0; col < hres; col++) {
		for (row = 0; row < vres; row++) {
			color = this.cast(player, player, col, row);
			this.drawPixel(col, row, color);
		}
	}
	this.ctx.restore();
};

Camera.prototype.drawPixel = function(col, row, color) {
	"use strict";
	var ctx = this.ctx;
	var left = Math.floor(col * this.hspacing);
	var top = Math.floor(row * this.vspacing);
	var width = Math.ceil(this.hspacing);
	var height = Math.ceil(this.vspacing);

	ctx.fillStyle = '#'+
		color.r.toString(16)+
		color.g.toString(16)+
		color.b.toString(16);
	ctx.globalAlpha = color.a;
	ctx.fillRect(left, top, width, height);
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
	var map = [];

	for(var i = 0; i < 512; i++){
		map[i] = Math.random() < 0.05 ? 1 : 0;
	}

	var px = 0, py = 0, pz = 0;
	start_loop: for(;px < 512; px+=64){
		for(;py < 64; py+=8){
			for(;pz < 8; pz++){
				if(map[px + py + pz] === 0){ break start_loop; }
			}
		}
	}

	var player = new Player(px/64+.5, py/8+.5, pz+.5, 0, 0);
	var controls = new Controls();
	var camera = new Camera(display, 120, 120, Math.PI * 0.4, Math.PI * 0.4, map);
	var loop = new GameLoop(function(seconds){
		player.update(controls.states, map, seconds);
		camera.render(player, map, seconds);
	});

	loop.start();
}