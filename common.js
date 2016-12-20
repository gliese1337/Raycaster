const SIZE = 5;

function Controls(){
	"use strict";
	this.codes  = {
		// space, shift, & alt
		32: 'spc', 16: 'sft',
		// left & right arrow, a & d, 4 & 6
		37: 'lft', 39: 'rgt',
		65: 'lft', 68: 'rgt',
		100: 'lft', 102: 'rgt',
		// q & e, 7 & 9
		81: 'rlt', 69: 'rrt',
		36: 'rlt', 33: 'rrt',
		103: 'rlt', 105: 'rrt',
		// up & down arrow, w & s, 8 & 5
		38: 'up', 40: 'dwn',
		87: 'up', 83: 'dwn',
		104: 'up', 101: 'dwn',
		12: 'dwn',
		// z x c & , . /
		44: 'z', 46: 'x', 47: 'y',
		90: 'z', 88: 'x', 67: 'y',
		188: 'z', 190: 'x', 191: 'y'
	};
	this.keys = {
		spc: 0, sft: 0,
		lft: 0, rgt: 0,
		rlt: 0, rrt: 0,
		up: 0, dwn: 0,
		x: 0, y: 0, z: 0
	};
	this.states = {
		fwd: false, bak: false,
		pup: false, pdn: false, vp: 'z', kp: 'y',
		ylt: false, yrt: false, vy: 'z', ky: 'x',
		rlt: false, rrt: false, vr: 'x', kr: 'y',
	};
	document.addEventListener('keydown', this.onKey.bind(this, 1), false);
	document.addEventListener('keyup', this.onKey.bind(this, 0), false);
}

Controls.prototype.onKey = function(val, e){
	"use strict";
	let key = this.codes[e.keyCode];
	if(typeof key === 'undefined'){ return; }

	e.preventDefault && e.preventDefault();
	e.stopPropagation && e.stopPropagation();

	let states = this.states;
	let keys = this.keys;
	keys[key] = val;

	if(keys.sft){
		states.fwd = false;
		states.bak = !!keys.spc;
	}else if(!keys.sft){
		states.fwd = !!keys.spc;
		states.bak = false;
	}
	
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
	states.vr = 'y';
	states.kr = 'x';

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
			states.vy = 'z';
			states.ky = 'w';
			states.vr = 'x';
			states.kr = 'w';
		}else{
			states.vp = 'z';
			states.kp = 'w';
			states.vy = 'x';
			states.ky = 'w';
			states.vr = 'y';
			states.kr = 'w';
		}
	}
};

function Player(x, y, z, w){
	"use strict";
	this.x = x;
	this.y = y;
	this.z = z;
	this.w = w;

	this.speed = 0;

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

Player.prototype.translate = function(seconds, map){
	"use strict";
	let	fwd = this.fwd;
	let inc = this.speed * seconds;

	let dx = fwd.x * inc;
	let dy = fwd.y * inc;
	let dz = fwd.z * inc;
	let dw = fwd.w * inc;

	/*
	tmp = Raycast(this, fwd, SIZE*2, SIZE, map.grid);
	xmax = Math.max(tmp.xmax-.01,0);
	ymax = Math.max(tmp.ymax-.01,0);
	zmax = Math.max(tmp.zmax-.01,0);
	wmax = Math.max(tmp.wmax-.01,0);
	
	if(Math.abs(dx) > xmax){
		dx = (dx > 0 ? xmax : -xmax) - dx;
		speed.x *= -1;
	}
	if(Math.abs(dy) > ymax){
		dy = (dy > 0 ? ymax : -ymax) - dy;
		speed.y *= -1;
	}
	if(Math.abs(dz) > zmax){
		dz = (dz > 0 ? zmax : -zmax) - dz;
		speed.z *= -1;
	}
	if(Math.abs(dw) > wmax){
		dw = (dw > 0 ? wmax : -wmax) - dw;
		speed.w *= -1;
	}
	*/
	
	this.x = (this.x + dx + SIZE) % SIZE;
	this.y = (this.y + dy + SIZE) % SIZE;
	this.z = (this.z + dz + SIZE) % SIZE;
	this.w = (this.w + dw + SIZE) % SIZE;
};

Player.prototype.update_speed = function(controls, seconds){
	if(controls.fwd){
		this.speed += 0.5*seconds;
		if(this.speed > 6){ this.speed = 6; }
	}else if(controls.bak){
		this.speed -= 0.5*seconds;
		if(this.speed < -6){ this.speed = -6; }
	}else{
		this.speed /= Math.pow(40,seconds);
		if(Math.abs(this.speed) < .001){ this.speed = 0; }
	}
};

Player.prototype.update = function(controls, map, seconds){
	let moved = false;

	if(controls.pup){
		this.rotate(controls.vp, controls.kp, seconds * Math.PI/3);
		moved = true;
	}else if(controls.pdn){
		this.rotate(controls.kp, controls.vp, seconds * Math.PI/3);
		moved = true;
	}

	if(controls.yrt){
		this.rotate(controls.vy, controls.ky, seconds * Math.PI/3);
		moved = true;
	}else if(controls.ylt){
		this.rotate(controls.ky, controls.vy, seconds * Math.PI/3);
		moved = true;
	}

	if(controls.rrt){
		this.rotate(controls.vr, controls.kr, seconds * Math.PI/3);
		moved = true;
	}else if(controls.rlt){
		this.rotate(controls.kr, controls.vr, seconds * Math.PI/3);
		moved = true;
	}

	this.update_speed(controls, seconds);

	if(this.speed.mag != 0){
		this.translate(seconds, map);
		moved = true;
	}

	return moved;
};

function GameLoop(body){
	"use strict";
	this.lastTime = 0;
	this.body = body;
	this.stop = false;
}

GameLoop.prototype.start = function(){
	"use strict";
	let that = this;
	requestAnimationFrame(function frame(time){
		var seconds = (time - that.lastTime) / 1000;
		that.lastTime = time;
		that.body(seconds);
		if(!that.stop){ requestAnimationFrame(frame); }
	});
};