const cast = require("./Raycast.js");

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
	"use strict";
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
	let SIZE = map.size;
	let	fwd = this.fwd;
	let inc = this.speed * seconds;

	let dx = fwd.x * inc;
	let dy = fwd.y * inc;
	let dz = fwd.z * inc;
	let dw = fwd.w * inc;

	let {dist} = cast(this, fwd, map.size*2, map);
	let xmax = Math.max(Math.abs(fwd.x*dist)-.01,0);
	let ymax = Math.max(Math.abs(fwd.y*dist)-.01,0);
	let zmax = Math.max(Math.abs(fwd.z*dist)-.01,0);
	let wmax = Math.max(Math.abs(fwd.w*dist)-.01,0);
	
	if(Math.abs(dx) > xmax){
		dx = (dx > 0 ? xmax : -xmax);
	}
	if(Math.abs(dy) > ymax){
		dy = (dy > 0 ? ymax : -ymax);
	}
	if(Math.abs(dz) > zmax){
		dz = (dz > 0 ? zmax : -zmax);
	}
	if(Math.abs(dw) > wmax){
		dw = (dw > 0 ? wmax : -wmax);
	}
	
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
		this.speed /= Math.pow(100,seconds);
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

module.exports = Player;