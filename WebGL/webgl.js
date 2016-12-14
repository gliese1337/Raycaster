function Controls() {
	"use strict";
	this.codes  = { 32: 'fwd', 37: 'lft', 39: 'rgt', 38: 'up', 40: 'dwn' };
	this.states = { 'fwd': false, 'lft': false, 'rgt': false, 'up': false, 'dwn': false };
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
	this.x = (((this.x + dx) % 5) + 5) % 5;
	this.y = (((this.y + dy) % 5) + 5) % 5;
	this.z = (((this.z + dz) % 5) + 5) % 5;
	this.w = (((this.w + dw) % 5) + 5) % 5;
};

Player.prototype.update = function(controls, map, seconds) {
	var moved = false;
	if (controls.rgt){
		this.rotate('z', 'x', seconds * Math.PI/6);
		moved = true;
	} else if (controls.lft){
		this.rotate('x', 'z', seconds * Math.PI/6);
		moved = true;
	}
	
	if (controls.up){
		this.rotate('z', 'y', seconds * Math.PI/6);
		moved = true;
	} else if (controls.dwn){
		this.rotate('y', 'z', seconds * Math.PI/6);
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

	for(var i = 0; i < 625; i++){
		map[i] = Math.random() < 0.05 ? 1 : 0;
	}

	var px = 0, py = 0, pz = 0, pw = 0;
	start_loop: for(;px < 4096; px+=625){
		for(;py < 125; py+=25){
			for(;pz < 25; pz+=5){
				for(;pw < 5; pw++){
					if(map[px + py + pz + pw] === 0){ break start_loop; }
				}
			}
		}
	}

	var player = new Player(px/625+.5, py/25+.5, pz/5+.5, pw+.5);
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