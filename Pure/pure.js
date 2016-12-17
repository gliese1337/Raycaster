var SIZE = 5;

function Controls() {
	"use strict";
	this.codes  = { 32: 'spc', 37: 'lft', 39: 'rgt', 38: 'up', 40: 'dwn', 16: 'sft', 83: 's', 88: 'x', 89: 'y', 90: 'z', 87: 'w' };
	this.keys = { spc: 0, lft: 0, rgt: 0, up: 0, dwn: 0, sft: 0, s: 0, x: 0, y: 0, z: 0, w: 0 };
	this.states = {
		rgt: false, lft: false, up: false, dwn: false,
		fwd: false, bak: false, ana: false, kta: false,
		rotu: false, rotd: false, vv: 'z', kv: 'y',
		rotl: false, rotr: false, vh: 'x', kh: 'z'
	};
	document.addEventListener('keydown', this.onKey.bind(this, 1), false);
	document.addEventListener('keyup', this.onKey.bind(this, 0), false);
}

Controls.prototype.onKey = function(val, e) {
	"use strict";
	var states, keys, count,
		key = this.codes[e.keyCode];
	if (typeof key === 'undefined') return;
	e.preventDefault && e.preventDefault();
	e.stopPropagation && e.stopPropagation();

	keys = this.keys;
	keys[key] = val;

	states = this.states;

	if(keys.s){
		if(keys.sft){
			states.fwd = keys.spc || (keys.up && !keys.dwn);
			states.bak = !states.fwd && keys.dwn;
			states.ana = keys.rgt && !keys.lft;
			states.kta = !keys.rgt && keys.lft;

			states.rgt = false;
			states.lft = false;
			states.up = false;
			states.dwn = false;
		}else{
			states.rgt = keys.rgt && !keys.lft;
			states.lft = !keys.rgt && keys.lft;
			states.up = keys.up && !keys.dwn;
			states.dwn = !keys.up && keys.dwn;

			states.fwd = !!keys.spc;
			states.bak = false;
			states.ana = false;
			states.kta = false;
		}
	}else{
		states.rgt = false;
		states.lft = false;
		states.up = false;
		states.dwn = false;
		states.fwd = !!keys.spc;
		states.bak = false;
		states.ana = false;
		states.kta = false;

		states.rotu = keys.up && !keys.dwn;
		states.rotd = !keys.up && keys.dwn;
		states.rotl = keys.lft && !keys.rgt;
		states.rotr = !keys.lft && keys.rgt;

		//Defaults: x, or no keys
		states.vv = 'z';
		states.kv = 'y';
		states.vh = 'z';
		states.kh = 'x';

		count = keys.x + keys.y + keys.z + keys.w;
		if(count == 1){
			if(keys.y){
				states.vv = 'y';
				states.kv = 'w';
			}else if(keys.z){
				states.vh = 'x';
				states.kh = 'y';
			}
		}else if(count == 2){
			if(keys.x){
				states.vv = 'x';
				if(keys.y){
					states.kv = 'y';
					states.vh = 'z';
					states.kh = 'w';
				}else if(keys.z){
					states.kv = 'z';
					states.vh = 'y';
					states.kh = 'w';
				}else if(keys.w){
					states.kv = 'w';
					states.vh = 'y';
					states.kh = 'z';
				}
			}else if(keys.y){
				states.vv = 'y';
				if(keys.z){
					states.kv = 'z';
					states.vh = 'x';
					states.kh = 'w';
				}else if(keys.w){
					states.kv = 'w';
					states.vh = 'x';
					states.kh = 'z';
				}
			}else{
				states.vv = 'z'
				states.kv = 'w';
				states.vh = 'x';
				states.kh = 'y';
			}
		}
	}
};

function Player(x, y, z, w){
	"use strict";
	this.x = x;
	this.y = y;
	this.z = z;
	this.w = w;

	this.speed = {x: 0, y: 0, z: 0, w: 0};

	this.rgt = {x:1,y:0,z:0,w:0};
	this.up = {x:0,y:1,z:0,w:0};
	this.fwd = {x:0,y:0,z:1,w:0};
	this.ana = {x:0,y:0,z:0,w:1};
}

//Rotate a vector in the plane defined by itself and another vector
function vec_rot(v, k, t){
	var cos = Math.cos(t),
		sin = Math.sin(t);

	return {
		x: v.x*cos + k.x*sin,
		y: v.y*cos + k.y*sin,
		z: v.z*cos + k.z*sin,
		w: v.w*cos + k.w*sin
	};
}

var planes = {x:'rgt',y:'up',z:'fwd',w:'ana'};
Player.prototype.rotate = function(v,k,angle){
	"use strict";
	v = planes[v];
	k = planes[k];
	this[v] = vec_rot(this[v], this[k], angle);
	this[k] = vec_rot(this[k], this[v], -angle);
	//console.log("Rotate",v,k);
};

Player.prototype.translate = function(seconds, map) {
	"use strict";
	var speed = this.speed;
	var dx = (this.rgt.x * speed.x + this.up.x * speed.y + this.fwd.x * speed.z + this.ana.x * speed.w) * seconds;
	var dy = (this.rgt.y * speed.x + this.up.y * speed.y + this.fwd.y * speed.z + this.ana.y * speed.w) * seconds;
	var dz = (this.rgt.z * speed.x + this.up.z * speed.y + this.fwd.z * speed.z + this.ana.z * speed.w) * seconds;
	var dw = (this.rgt.w * speed.x + this.up.w * speed.y + this.fwd.w * speed.z + this.ana.w * speed.w) * seconds;
	this.x = (this.x + dx + SIZE) % SIZE;
	this.y = (this.y + dy + SIZE) % SIZE;
	this.z = (this.z + dz + SIZE) % SIZE;
	this.w = (this.w + dw + SIZE) % SIZE;
};

Player.prototype.update_speed = function(controls, seconds){
	var speed = this.speed;

	if(controls.rgt){
		speed.x += .5*seconds;
		if(speed.x > 10){ speed.x = 10; }
	}else if(controls.lft){
		speed.x -= .5*seconds;
		if(speed.x < -10){ this.speed.x = -10; }
	}else{
		if(speed.x < .01 && speed.x > -.01){ speed.x = 0; }
		else{ speed.x /= Math.pow(3,seconds); }
	}

	if(controls.up){
		speed.y += .5*seconds;
		if(speed.y > 10){ speed.y = 10; }
	}else if(controls.dwn){
		speed.y -= .5*seconds;
		if(speed.y < -10){ this.speed.y = -10; }
	}else{
		if(speed.y < .01 && speed.y > -.01){ speed.y = 0; }
		else{ speed.y /= Math.pow(3,seconds); }
	}

	if(controls.fwd){
		speed.z += .5*seconds;
		if(speed.z > 10){ speed.z = 10; }
	}else if(controls.bak){
		speed.z -= .5*seconds;
		if(speed.z < -10){ this.speed.z = -10; }
	}else{
		if(speed.z < .01 && speed.z > -.01){ speed.z = 0; }
		else{ speed.z /= Math.pow(3,seconds); }
	}

	if(controls.ana){
		speed.w += .5*seconds;
		if(speed.w > 10){ speed.w = 10; }
	}else if(controls.kta){
		speed.w -= .5*seconds;
		if(speed.w < -10){ this.speed.w = -10; }
	}else{
		if(speed.w < .01 && speed.w > -.01){ speed.w = 0; }
		else{ speed.w /= Math.pow(3,seconds); }
	}

};

Player.prototype.update = function(controls, map, seconds) {
	var moved = false;

	if(controls.rotu){
		this.rotate(controls.vv, controls.kv, seconds * Math.PI/6);
		moved = true;
	}else if(controls.rotd){
		this.rotate(controls.kv, controls.vv, seconds * Math.PI/6);
		moved = true;
	}

	if(controls.rotr){
		this.rotate(controls.vh, controls.kh, seconds * Math.PI/6);
		moved = true;
	}else if(controls.rotl){
		this.rotate(controls.kh, controls.vh, seconds * Math.PI/6);
		moved = true;
	}

	this.update_speed(controls, seconds);

	if(this.speed.x != 0 || this.speed.y != 0 || this.speed.z != 0 || this.speed.w != 0){
		this.translate(seconds, map);
		moved = true;
	}

	return moved;
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

function Texture(img, width, height) {
	"use strict";
	var canvas = document.createElement('canvas'),
		ctx = canvas.getContext('2d');

	this.ctx = ctx;
	this.width = width;
	this.height = height;

	canvas.width = width;
	canvas.height = height;
	ctx.drawImage(img, 0, 0, width, height);
}

Texture.prototype.get = function(x, y){
	return this.ctx.getImageData(
		Math.round(x*this.width),
		Math.round(y*this.height),
		1, 1
	).data;
};

function Camera(canvas, map, width, height, hfov, textures) {
	"use strict";
	var promise;

	this.width = width;
	this.height = height;
	this.hscale = canvas.width / width;
	this.vscale = canvas.height / height;
	this.resolution = {h: width, v: height};
	this.depth = width/(2*Math.tan(hfov/2));
	this.map = map;
	this.textures = [];

	this.ctx = canvas.getContext('2d');

	//load textures
	var promise = Promise.all(textures.map(function(src){
			var image = new Image();
			image.src = src;
			return new Promise(function(resolve){
				image.addEventListener("load",function(){
					resolve(new Texture(image, 1024, 1024));
				});
			});
		})).then(function(arr){
			this.textures = arr;
		}.bind(this));

	this.onready = promise.then.bind(promise);
}

Camera.prototype.render = function(player, map) {
	"use strict";
	var x, y, tex,
		hscale = this.hscale,
		vscale = this.vscale,
		width = this.width,
		height = this.height,
		ctx = this.ctx,
		cast = getFragShader(SIZE,
			this.depth, {h: width, v: height}, player,
			player.rgt, player.up, player.fwd, player.ana,
			this.map.grid, this.textures
		);
	for(x = 0; x < width; x++)
	for(y = 0; y < height; y++){
		ctx.fillStyle = cast(x, y);
		ctx.fillRect(x*hscale, (height - y)*vscale, hscale, vscale);
	}
};

function main(canvas, width, height){
	"use strict";

	var px, py, pz, pw,
		map = new Maze(SIZE);

	start_loop:
	for(px = 0; px < SIZE; px++)
	for(py = 0; py < SIZE; py++)
	for(pz = 0; pz < SIZE; pz++)
	for(pw = 0; pw < SIZE; pw++)
		if(map.get(px,py,pz,pw) === 0){ break start_loop; }

	var player = new Player(px+.5, py+.5, pz+.5, pw+.5);
	var controls = new Controls();
	var camera = new Camera(canvas, map, width, height, Math.PI / 1.5,
		["texture1.jpg","texture2.jpg","texture3.jpg","texture4.jpg"]);

	var fps = [];
	var loop = new GameLoop(function(seconds){
		var change = player.update(controls.states, map, seconds);
		if(change){
			camera.render(player, map);
			console.log(fps.reduce(function(a,n){ return a + n; })/fps.length,"FPS");
			console.log("x",player.x,"y",player.y,"z",player.z,"w",player.w);
		}
		if(fps.length > 20){ fps.shift(); }
		fps.push(1/seconds);
	});

	camera.onready(function(){
		camera.render(player);
		loop.start();
	});
}