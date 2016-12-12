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
		moved = true;
	} else if (controls.left){
		this.rotate(-seconds * Math.PI/6);
		moved = true;
	}
	
	if (controls.up){
		this.incline(seconds * Math.PI/6);
		moved = true;
	} else if (controls.down){
		this.incline(-seconds * Math.PI/6);
		moved = true;
	}
	
	if (controls.forward){
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

function Camera(canvas, map, hfov, vfov){
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
		this.originLoc = gl.getUniformLocation(program, "u_origin");
		this.lookLoc = gl.getUniformLocation(program, "u_look");

		// Set Uniforms
		gl.uniform2f(resLoc, canvas.width, canvas.height);
		gl.uniform2f(scaleLoc, hfov, vfov);
		gl.uniform1iv(mapLoc, map);
	}.bind(this));
	
	this.onready = promise.then.bind(promise);
}

Camera.prototype.render = function(player){
	var gl = this.gl;
	gl.uniform2f(this.lookLoc, player.theta, player.phi);
	gl.uniform3f(this.originLoc, player.x, player.y, player.z);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

function main(canvas){
	"use strict";

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
	var camera = new Camera(canvas, map, Math.PI / 2, Math.PI / 2.5);
	
	var fps = [];
	var loop = new GameLoop(function(seconds){
		var change = player.update(controls.states, map, seconds);
		if(change){
			camera.render(player);
			console.log(player.x,player.y,player.z);
		}
		//if(fps.length > 20){ fps.shift(); }
		//fps.push(1/seconds);
		//console.log(fps.reduce(function(a,n){ return a + n; })/fps.length,"FPS");
	});
	
	camera.onready(function(){
		camera.render(player);
		loop.start();		
	});
}