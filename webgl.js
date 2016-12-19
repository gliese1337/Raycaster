function Camera(canvas, map, hfov, textures){
	// Get A WebGL context
	var gl = canvas.getContext("webgl");
	if (!gl){ throw new Error("No WebGL Support"); }

	this.gl = gl;
	this.program = null;
	this.map = map;
	
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

		this.program = program;

		// look up where the vertex data needs to go.
		var posAttrLoc = gl.getAttribLocation(program, "a_position");

		// Turn on the attribute
		gl.enableVertexAttribArray(posAttrLoc);

		// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
		gl.vertexAttribPointer(
			posAttrLoc,
			2,			// size, 2 components per iteration
			gl.FLOAT,	// type, 32bit floats
			false,		// norm, don't normalize data
			0,			// stride, don't skip anything
			0			// offset
		);

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
		this.anaLoc = gl.getUniformLocation(program, "u_ana");

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

Camera.prototype.setCell = function(x,y,z,w,val){
	var gl = this.gl,
		idx = this.map.cellIndex(x,y,z,w),
		mapLoc = gl.getUniformLocation(this.program, "u_map["+idx+"]");
	gl.uniform1i(mapLoc, val);
};

Camera.prototype.render = function(player){
	var gl = this.gl;
	gl.uniform4f(this.originLoc, player.x, player.y, player.z, player.w);
	gl.uniform4f(this.rgtLoc, player.rgt.x, player.rgt.y, player.rgt.z, player.rgt.w);
	gl.uniform4f(this.upLoc, player.up.x, player.up.y, player.up.z, player.up.w);
	gl.uniform4f(this.fwdLoc, player.fwd.x, player.fwd.y, player.fwd.z, player.fwd.w);
	gl.uniform4f(this.anaLoc, player.ana.x, player.ana.y, player.ana.z, player.ana.w);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

function Overlay(canvas){
	this.ctx = canvas.getContext('2d');
	this.fps = [];
}

Overlay.prototype.tick = function(player, seconds){
	var fps, fpsWin = this.fps,
		ctx = this.ctx;
	if(fpsWin.length > 20){ fpsWin.shift(); }
	fpsWin.push(1/seconds);
	fps = fpsWin.reduce(function(a,n){ return a + n; })/fpsWin.length;
	fps = Math.round(fps*10)/10;
	
	ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
	ctx.font = "10px Calibri";
	ctx.fillStyle = "#FFFFFF";
	ctx.fillText("FPS: "+fps+(fps == Math.floor(fps) ? ".0":""), 5, 10);
}

function main(display, overlay){
	"use strict";

	var map = new Maze(SIZE),
		path = map.getLongestPath(),
		start = path.shift(),
		end = path.pop();

	map.set(start.x,start.y,start.z,start.w,0);
	map.set(end.x,end.y,end.z,end.w,2);
	path.forEach(function(cell){
		map.set(cell.x,cell.y,cell.z,cell.w,1);
	});

	var player = new Player(start.x+.5, start.y+.5, start.z+.5, start.w+.5);
	var controls = new Controls();
	var camera = new Camera(display, map, Math.PI / 1.5,
		["texture1.jpg","texture2.jpg","texture3.jpg","texture4.jpg"]);
	var overlay = new Overlay(overlay);

	var fps = [];
	var loop = new GameLoop(function(seconds){
		var cx,cy,cz,cw,
			change = player.update(controls.states, map, seconds);
		overlay.tick(player, seconds);
		if(change){
			cx = Math.floor(player.x);
			cy = Math.floor(player.y);
			cz = Math.floor(player.z);
			cw = Math.floor(player.w);
			
			if(map.get(cx,cy,cz,cw) != 0){
				map.set(cx,cy,cz,cw,0);
				camera.setCell(cx,cy,cz,cw,0);
			}

			camera.render(player);
		}
	});

	camera.onready(function(){
		camera.render(player);
		loop.start();
	});
}