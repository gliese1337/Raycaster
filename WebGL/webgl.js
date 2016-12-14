var SIZE = 5,
	SIZE2 = SIZE*SIZE,
	SIZE3 = SIZE*SIZE2,
	SIZE4 = SIZE*SIZE3;

function Controls() {
	"use strict";
	this.codes  = { 32: 'fwd', 37: 'lft', 39: 'rgt', 38: 'up', 40: 'dwn', 88: 'x', 89: 'y', 90: 'z', 87: 'w' };
	this.keys = { fwd: 0, lft: 0, rgt: 0, up: 0, dwn: 0, x: 0, y: 0, z: 0, w: 0 };
	this.states = { 'fwd': false,
		'rotu': false, 'rotd': false, 'vv': 'z', 'kv': 'y',
		'rotl': false, 'rotr': false, 'vh': 'x', 'kh': 'z'
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
	states.fwd = keys.fwd;
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
};

function Player(x, y, z, w){
	"use strict";
	this.x = x;
	this.y = y;
	this.z = z;
	this.w = w;

	this.speed = 0;

	this.rgt = {x:1,y:0,z:1,w:0};
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
	console.log("Rotate",v,k);
};

Player.prototype.walk = function(distance, map) {
	"use strict";
	var dx = this.fwd.x * distance;
	var dy = this.fwd.y * distance;
	var dz = this.fwd.z * distance;
	var dw = this.fwd.w * distance;
	this.x = (((this.x + dx) % SIZE) + SIZE) % SIZE;
	this.y = (((this.y + dy) % SIZE) + SIZE) % SIZE;
	this.z = (((this.z + dz) % SIZE) + SIZE) % SIZE;
	this.w = (((this.w + dw) % SIZE) + SIZE) % SIZE;
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
	
	if (controls.fwd){
		if(this.speed < 10){ this.speed += .5*seconds; }
	} else {
		if(this.speed < .01){ this.speed = 0; }
		else{ this.speed /= Math.pow(3,seconds); }
	}

	if(this.speed != 0){
		this.walk(this.speed * seconds, map);
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

function Camera(canvas, map, hfov, vfov, textures){
	// Get A WebGL context
	var gl = canvas.getContext("webgl");
	if (!gl){ throw new Error("No WebGL Support"); }
	
	this.gl = gl;
	this.lookLoc = null;
	this.originLoc = null;
	
	// Create a buffer and put a single rectangle in it
	// (2 triangles)
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1,	1, -1,	-1, 1,
		1, -1,	-1, 1,	1, 1,
	]), gl.STATIC_DRAW);
	
	// compile the shaders and link into a program
	var promise = GL_Utils.createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"])
	.then(function(program){

		// look up where the vertex data needs to go.
		var posAttrLoc = gl.getAttribLocation(program, "a_position");

		// Turn on the attribute
		gl.enableVertexAttribArray(posAttrLoc);

		// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
		var size = 2;        // 2 components per iteration
		var type = gl.FLOAT; // the data is 32bit floats
		var norm = false;    // don't normalize the data
		var stride = 0;      // Don't skip any data
		var offset = 0;      // start at the beginning of the buffer
		gl.vertexAttribPointer(posAttrLoc, size, type, norm, stride, offset)

		// Tell WebGL how to convert from clip space to pixels
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		gl.useProgram(program);

		// look up uniform locations
		var resLoc = gl.getUniformLocation(program, "u_resolution");
		var scaleLoc = gl.getUniformLocation(program, "u_scale");
		var mapLoc = gl.getUniformLocation(program, "u_map");
		var textureLoc = gl.getUniformLocation(program, "u_textures");
		
		this.originLoc = gl.getUniformLocation(program, "u_origin");
		this.rgtLoc = gl.getUniformLocation(program, "u_rgt");
		this.upLoc = gl.getUniformLocation(program, "u_up");
		this.fwdLoc = gl.getUniformLocation(program, "u_fwd");
		this.anaLoc = gl.getUniformLocation(program, "u_ana");

		// Set Uniforms
		gl.uniform2f(resLoc, canvas.width, canvas.height);
		gl.uniform2f(scaleLoc, hfov, vfov);
		gl.uniform1iv(mapLoc, map);
		gl.uniform1iv(textureLoc, textures.map(function(_,i){ return i; }));
		
		//load textures
		return Promise.all(textures.map(function(src,i){
			var image = new Image();
			image.src = src;
			return new Promise(function(resolve){
				image.addEventListener("load",function(){
					var tex = gl.createTexture();
					gl.activeTexture(gl.TEXTURE0 + i);
					gl.bindTexture(gl.TEXTURE_2D, tex);
					gl.texImage2D(
						gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
						gl.UNSIGNED_BYTE, image
					);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					resolve();
				});
			});
		}));
	}.bind(this));
	
	this.onready = promise.then.bind(promise);
}

Camera.prototype.render = function(player){
	var gl = this.gl;
	gl.uniform4f(this.originLoc, player.x, player.y, player.z, player.w);
	gl.uniform4f(this.rgtLoc, player.rgt.x, player.rgt.y, player.rgt.z, player.rgt.w);
	gl.uniform4f(this.upLoc, player.up.x, player.up.y, player.up.z, player.up.w);
	gl.uniform4f(this.fwdLoc, player.fwd.x, player.fwd.y, player.fwd.z, player.fwd.w);
	gl.uniform4f(this.anaLoc, player.ana.x, player.ana.y, player.ana.z, player.ana.w);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

function main(canvas){
	"use strict";

	var map = [];

	for(var i = 0; i < SIZE4; i++){
		map[i] = Math.random() < 0.05 ? 1 : 0;
	}

	var px = 0, py = 0, pz = 0, pw = 0;
	start_loop: for(;px < SIZE4; px+=SIZE3){
		for(;py < SIZE3; py+=SIZE2){
			for(;pz < SIZE2; pz+=SIZE){
				for(;pw < SIZE; pw++){
					if(map[px + py + pz + pw] === 0){ break start_loop; }
				}
			}
		}
	}

	var player = new Player(px/SIZE3+.5, py/SIZE2+.5, pz/SIZE+.5, pw+.5);
	var controls = new Controls();
	var camera = new Camera(canvas, map, Math.PI / 2, Math.PI / 2.5,
		["texture1.jpg","texture2.jpg","texture3.jpg","texture4.jpg"]);
	
	var fps = [];
	var loop = new GameLoop(function(seconds){
		var change = player.update(controls.states, map, seconds);
		if(change){
			camera.render(player);
			console.log(fps.reduce(function(a,n){ return a + n; })/fps.length,"FPS");
		}
		if(fps.length > 20){ fps.shift(); }
		fps.push(1/seconds);
	});
	
	camera.onready(function(){
		camera.render(player);
		loop.start();		
	});
}