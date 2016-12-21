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

module.exports = Controls;