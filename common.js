var SIZE = 5;

function Controls() {
	"use strict";
	this.codes  = {
		// space, shift, & alt
		32: 'spc', 16: 'sft', 18: 'alt',
		// left & right arrow, a & d, 4 & 6
		37: 'lft', 39: 'rgt',
		65: 'lft', 68: 'rgt',
		// q & e, 7 & 9
		81: 'rlt', 69: 'rrt',
		36: 'rlt', 33: 'rrt',
		// up & down arrow, w & s, 8 & 5
		38: 'up', 40: 'dwn',
		87: 'up', 12: 'dwn',
		12: 'dwn',
		// z x c & , . /
		44: 'z', 46: 'x', 47: 'y',
		90: 'z', 88: 'x', 67: 'y',
		188: 'z', 190: 'x', 191: 'y'
	};
	this.keys = {
		spc: 0, sft: 0, alt: 0,
		lft: 0, rgt: 0,
		rlt: 0, rrt: 0,
		up: 0, dwn: 0,
		x: 0, y: 0, z: 0
	};
	this.states = {
		rgt: false, lft: false, up: false, dwn: false,
		fwd: false, bak: false, ana: false, kta: false,
		pup: false, pdn: false, vp: 'z', kp: 'y',
		ylt: false, yrt: false, vy: 'z', ky: 'x',
		rlt: false, rrt: false, vr: 'x', kr: 'y',
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

	// Defaults
	states.pup = false;
	states.pdn = false;
	states.ylt = false;
	states.yrt = false;
	states.rlt = false;
	states.rrt = false;

	states.rgt = false;
	states.lft = false;
	states.up = false;
	states.dwn = false;
	states.fwd = !!keys.spc;
	states.bak = false;
	states.ana = false;
	states.kta = false;
	
	// Strafing
	if(keys.sft && !keys.alt){
		states.fwd = false;
		states.bak = !!keys.spc;
		states.rgt = keys.rgt && !keys.lft;
		states.lft = !keys.rgt && keys.lft;
		states.up = keys.up && !keys.dwn;
		states.dwn = !keys.up && keys.dwn;
	}else if(!keys.sft && keys.alt){
		states.fwd = keys.spc || (keys.up && !keys.dwn);
		states.bak = !states.fwd && keys.dwn;
		states.ana = keys.rgt && !keys.lft;
		states.kta = !keys.rgt && keys.lft;
	}else{
		// Rotation

		states.pup = keys.up && !keys.dwn;
		states.pdn = !keys.up && keys.dwn;
		states.ylt = keys.lft && !keys.rgt;
		states.yrt = !keys.lft && keys.rgt;
		states.rlt = keys.rlt && !keys.rrt;
		states.rrt = !keys.rlt && keys.rrt;

		// Default pitch, yaw, and roll planes
		states.vp = 'z';
		states.kp = 'y';
		states.vy = 'z';
		states.ky = 'x';
		states.vr = 'x';
		states.kr = 'y';

		if(keys.x + keys.y + keys.z == 1){
			if(keys.x){
				states.vp = 'x';
				states.kp = 'w';
				states.vy = 'y';
				states.ky = 'w';
				states.vr = 'z';
				states.kr = 'w';
			}else if(keys.y){
				states.vp = 'y';
				states.kp = 'w';
				states.vy = 'x';
				states.ky = 'w';
				states.vr = 'z';
				states.kr = 'w';
			}else{
				states.vp = 'z';
				states.kp = 'w';
				states.vy = 'y';
				states.ky = 'w';
				states.vr = 'x';
				states.kr = 'w';
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
	var dx, dy, dz, dw, tmp,
		xmax, ymax, zmax, wmax,
		speed = this.speed,
		geospeed = {
			x: this.rgt.x * speed.x + this.up.x * speed.y + this.fwd.x * speed.z + this.ana.x * speed.w,
			y: this.rgt.y * speed.x + this.up.y * speed.y + this.fwd.y * speed.z + this.ana.y * speed.w,
			z: this.rgt.z * speed.x + this.up.z * speed.y + this.fwd.z * speed.z + this.ana.z * speed.w,
			w: this.rgt.w * speed.x + this.up.w * speed.y + this.fwd.w * speed.z + this.ana.w * speed.w
		};

	/*tmp = Raycast(this, geospeed, SIZE*2, SIZE, map.grid);
	xmax = tmp.xmax;
	ymax = tmp.ymax;
	zmax = tmp.zmax;
	wmax = tmp.wmax;

	console.log(xmax, ymax, zmax, wmax);
	*/
	dx = geospeed.x * seconds;
	dy = geospeed.y * seconds;
	dz = geospeed.z * seconds;
	dw = geospeed.w * seconds;
/*
	dx = dx > 0 ? Math.min(dx, xmax-.1) : Math.max(dx, -xmax+.1);
	dy = dy > 0 ? Math.min(dy, ymax-.1) : Math.max(dy, -ymax+.1);
	dz = dz > 0 ? Math.min(dz, zmax-.1) : Math.max(dz, -zmax+.1);
	dw = dw > 0 ? Math.min(dw, wmax-.1) : Math.max(dw, -wmax+.1);
*/
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
		else{ speed.x /= Math.pow(25,seconds); }
	}

	if(controls.up){
		speed.y += .5*seconds;
		if(speed.y > 10){ speed.y = 10; }
	}else if(controls.dwn){
		speed.y -= .5*seconds;
		if(speed.y < -10){ this.speed.y = -10; }
	}else{
		if(speed.y < .01 && speed.y > -.01){ speed.y = 0; }
		else{ speed.y /= Math.pow(25,seconds); }
	}

	if(controls.fwd){
		speed.z += .5*seconds;
		if(speed.z > 10){ speed.z = 10; }
	}else if(controls.bak){
		speed.z -= .5*seconds;
		if(speed.z < -10){ this.speed.z = -10; }
	}else{
		if(speed.z < .01 && speed.z > -.01){ speed.z = 0; }
		else{ speed.z /= Math.pow(25,seconds); }
	}

	if(controls.ana){
		speed.w += .5*seconds;
		if(speed.w > 10){ speed.w = 10; }
	}else if(controls.kta){
		speed.w -= .5*seconds;
		if(speed.w < -10){ this.speed.w = -10; }
	}else{
		if(speed.w < .01 && speed.w > -.01){ speed.w = 0; }
		else{ speed.w /= Math.pow(25,seconds); }
	}

};

Player.prototype.update = function(controls, map, seconds) {
	var moved = false;

	if(controls.pup){
		this.rotate(controls.vp, controls.kp, seconds * Math.PI/4);
		moved = true;
	}else if(controls.pdn){
		this.rotate(controls.kp, controls.vp, seconds * Math.PI/4);
		moved = true;
	}

	if(controls.yrt){
		this.rotate(controls.vy, controls.ky, seconds * Math.PI/4);
		moved = true;
	}else if(controls.ylt){
		this.rotate(controls.ky, controls.vy, seconds * Math.PI/4);
		moved = true;
	}

	if(controls.rrt){
		this.rotate(controls.vr, controls.kr, seconds * Math.PI/4);
		moved = true;
	}else if(controls.rlt){
		this.rotate(controls.kr, controls.vr, seconds * Math.PI/4);
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