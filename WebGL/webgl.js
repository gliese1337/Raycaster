var SIZE = 8;

function Controls() {
	"use strict";
	this.codes  = { 32: 'fwd', 37: 'left', 39: 'rgt', 38: 'up', 40: 'down' };
	this.states = { 'fwd': false, 'left': false, 'rgt': false, 'up': false, 'down': false };
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

function Player(x, y, z) {
	"use strict";
	this.x = x;
	this.y = y;
	this.z = z;
	this.speed = 0;
	this.rgt = {x:1,y:0,z:0};
	this.up = {x:0,y:1,z:0};
	this.fwd = {x:0,y:0,z:1};
}

function vec_rot(v, k, t){
	var cos = Math.cos(t),
		sin = Math.sin(t);
	
	//v' = v*cos(t) + (k x v)sin(t) + k(k . v)(1 - cos(t))
	//When the vectors are orthgonal, the dot product is always 0,
	//so we can drop the last term
	return {
		x: v.x*cos + (v.y*k.z-v.z*k.y)*sin,
		y: v.y*cos + (v.z*k.x-v.x*k.z)*sin,
		z: v.z*cos + (v.x*k.y-v.y*k.x)*sin
	};
}

Player.prototype.pitch = function(angle){
	//rotate up and fwd around rgt
	"use strict";
	this.up = vec_rot(this.up, this.rgt, angle);
	this.fwd = vec_rot(this.fwd, this.rgt, angle);
};

Player.prototype.roll = function(angle){
	//rotate up and rgt around fwd
	"use strict";
	this.rgt = vec_rot(this.rgt, this.fwd, angle);
	this.up = vec_rot(this.up, this.fwd, angle);
};

Player.prototype.yaw = function(angle){
	//rotate rgt and fwd around up
	"use strict";
	this.rgt = vec_rot(this.rgt, this.up, angle);
	this.fwd = vec_rot(this.fwd, this.up, angle); 
};

Player.prototype.walk = function(distance, map) {
	"use strict";
	var dx = this.fwd.x * distance;
	var dy = this.fwd.y * distance;
	var dz = this.fwd.z * distance;
	var nx = (((this.x + dx) % SIZE) + SIZE) % SIZE;
	var ny = (((this.y + dy) % SIZE) + SIZE) % SIZE;
	var nz = (((this.z + dz) % SIZE) + SIZE) % SIZE;
	/*if (map[Math.floor(nx)*64 + Math.floor(this.y)*SIZE + Math.floor(this.z)] === 0) this.x = nx;
	if (map[Math.floor(this.x)*64 + Math.floor(ny)*SIZE + Math.floor(this.z)] === 0) this.y = ny;
	if (map[Math.floor(this.x)*64 + Math.floor(this.y)*SIZE + Math.floor(nz)] === 0) this.z = nz;
	*/
	this.x = nx;
	this.y = ny;
	this.z = nz;
};

Player.prototype.update = function(controls, map, seconds) {
	var moved = false;
	if (controls.rgt){
		this.yaw(-seconds * Math.PI/6);
		moved = true;
	} else if (controls.left){
		this.yaw(seconds * Math.PI/6);
		moved = true;
	}
	
	if (controls.up){
		this.pitch(seconds * Math.PI/6);
		moved = true;
	} else if (controls.down){
		this.pitch(-seconds * Math.PI/6);
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

function Camera(canvas, map, hfov, textures){
	// Get A WebGL context
	var gl = canvas.getContext("webgl");
	if (!gl){ throw new Error("No WebGL Support"); }
	
	this.gl = gl;
	this.originLoc = null;
	this.rgtLoc = null;
	this.upLoc = null;
	this.fwdLoc = null;
	
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
		var depthLoc = gl.getUniformLocation(program, "u_depth");
		var mapLoc = gl.getUniformLocation(program, "u_map");
		var textureLoc = gl.getUniformLocation(program, "u_textures");
		
		this.originLoc = gl.getUniformLocation(program, "u_origin");
		this.rgtLoc = gl.getUniformLocation(program, "u_rgt");
		this.upLoc = gl.getUniformLocation(program, "u_up");
		this.fwdLoc = gl.getUniformLocation(program, "u_fwd");

		// Set Uniforms
		gl.uniform2f(resLoc, canvas.width, canvas.height);
		gl.uniform1f(depthLoc, canvas.width/(2*Math.tan(hfov/2)));
		gl.uniform1iv(mapLoc, map.flatten());
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
	gl.uniform3f(this.originLoc, player.x, player.y, player.z);
	gl.uniform3f(this.rgtLoc, player.rgt.x, player.rgt.y, player.rgt.z);
	gl.uniform3f(this.upLoc, player.up.x, player.up.y, player.up.z);
	gl.uniform3f(this.fwdLoc, player.fwd.x, player.fwd.y, player.fwd.z);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

function main(canvas){
	"use strict";

	var px, py, pz,
		map = new Maze(SIZE);

	start_loop:
	for(px = 0; px < SIZE; px++)
	for(py = 0; py < SIZE; py++)
	for(pz = 0; pz < SIZE; pz++)
		if(map.get(px,py,pz) === 0){ break start_loop; }

	var player = new Player(px+.5, py+.5, pz+.5);
	var controls = new Controls();
	var camera = new Camera(canvas, map, Math.PI / 1.5,
		["texture1.jpg","texture2.jpg","texture4.jpg"]);
	
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