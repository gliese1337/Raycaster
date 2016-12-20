function Camera(canvas, map, hfov, textures){
	let gl = canvas.getContext("webgl");

	this.gl = gl;
	this.canvas = canvas;
	this.program = null;
	this.map = map;
	this.fov = hfov;
	
	this.originLoc = null;

	this.rgtLoc = null;
	this.upLoc = null;
	this.fwdLoc = null;

	// Create a buffer and put a single rectangle in it
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1,	1, -1,	-1, 1,
		1, -1,	-1, 1,	1, 1,
	]), gl.STATIC_DRAW);

	// compile the shaders and link into a program
	let promise = GL_Utils.createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"])
	.then((program) => {

		this.program = program;

		// look up where the vertex data needs to go.
		let posAttrLoc = gl.getAttribLocation(program, "a_position");

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
		gl.viewport(0, 0, canvas.width, canvas.height);

		gl.useProgram(program);

		// look up uniform locations
		let mapLoc = gl.getUniformLocation(program, "u_map");
		let textureLoc = gl.getUniformLocation(program, "u_textures");

		this.resLoc = gl.getUniformLocation(program, "u_resolution");
		this.depthLoc = gl.getUniformLocation(program, "u_depth");
		this.originLoc = gl.getUniformLocation(program, "u_origin");
		this.rgtLoc = gl.getUniformLocation(program, "u_rgt");
		this.upLoc = gl.getUniformLocation(program, "u_up");
		this.fwdLoc = gl.getUniformLocation(program, "u_fwd");
		this.anaLoc = gl.getUniformLocation(program, "u_ana");

		// Set Uniforms
		gl.uniform2f(this.resLoc, canvas.width, canvas.height);
		gl.uniform1f(this.depthLoc, canvas.width/(2*Math.tan(hfov/2)));
		gl.uniform1iv(mapLoc, map.flatten());
		gl.uniform1iv(textureLoc, textures.map((_,i) => i));

		//load textures
		return Promise.all(textures.map(function(src,i){
			let image = new Image();
			image.src = src;
			return new Promise(function(resolve){
				image.addEventListener("load",function(){
					let tex = gl.createTexture();
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
	});

	this.onready = promise.then.bind(promise);
}

Camera.prototype.resize = function(w,h){
	this.canvas.width = w;
	this.canvas.height = h;
	this.gl.viewport(0, 0, w, h);
	this.gl.uniform2f(this.resLoc, w, h);
	this.gl.uniform1f(this.depthLoc, w/(2*Math.tan(this.fov/2)));
};

Camera.prototype.setCell = function(x,y,z,w,val){
	let gl = this.gl;
	let idx = this.map.cellIndex(x,y,z,w);
	let mapLoc = gl.getUniformLocation(this.program, "u_map["+idx+"]");
	gl.uniform1i(mapLoc, val);
};

Camera.prototype.render = function(player){
	let gl = this.gl;
	gl.uniform4f(this.originLoc, player.x, player.y, player.z, player.w);
	gl.uniform4f(this.rgtLoc, player.rgt.x, player.rgt.y, player.rgt.z, player.rgt.w);
	gl.uniform4f(this.upLoc, player.up.x, player.up.y, player.up.z, player.up.w);
	gl.uniform4f(this.fwdLoc, player.fwd.x, player.fwd.y, player.fwd.z, player.fwd.w);
	gl.uniform4f(this.anaLoc, player.ana.x, player.ana.y, player.ana.z, player.ana.w);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

function Overlay(canvas, len){
	this.canvas = canvas;
	this.ctx = canvas.getContext('2d');
	this.fpsw = [];
	this.len = len;
}

Overlay.prototype.resize = function(w,h){
	this.canvas.width = w;
	this.canvas.height = h;
};

function get_angle(c){
	return Math.round(180*Math.acos(c)/Math.PI);
}

Overlay.prototype.tick = function(player, covered, seconds){
	let {canvas, ctx, fpsw} = this;

	if(fpsw.length > 20){ fpsw.shift(); }
	fpsw.push(1/seconds);

	let fps = fpsw.reduce(function(a,n){ return a + n; })/fpsw.length;
	fps = Math.round(fps*10)/10;
	
	ctx.clearRect(0,0,canvas.width,canvas.height);
	ctx.font = "10px Calibri";
	ctx.fillStyle = "#FFFFFF";
	ctx.fillText("FPS: "+fps+(fps == Math.floor(fps) ? ".0":""), 5, 10);
	ctx.fillText("Position: x: "+
				Math.floor(player.x)+
				" y: "+Math.round(player.y)+
				" z: "+Math.floor(player.z)+
				" w: "+Math.floor(player.w),
				5, canvas.height - 30);
	ctx.fillText("Orientation: x: "+
				get_angle(player.fwd.x)+
				" y: "+get_angle(player.fwd.y)+
				" z: "+get_angle(player.fwd.z)+
				" w: "+get_angle(player.fwd.w),
				5, canvas.height - 20);
	ctx.fillText("Progress: "+Math.round(100*covered/this.len)+"%", 5, canvas.height - 10);
}

function main(d, o){
	"use strict";

	let map = new Maze(SIZE),
		path = map.getLongestPath(),
		start = path.shift(),
		end = path.pop();

	map.set(start.x,start.y,start.z,start.w,0);
	map.set(end.x,end.y,end.z,end.w,2);
	path.forEach(function(cell){
		map.set(cell.x,cell.y,cell.z,cell.w,1);
	});

	let player = new Player(start.x+.5, start.y+.5, start.z+.5, start.w+.5);
	let controls = new Controls();
	let camera = new Camera(d, map, Math.PI / 1.5,
		["texture1.jpg","texture2.jpg","texture3.jpg","texture4.jpg"]);

	let overlay = new Overlay(o, path.length + 1);

	window.addEventListener('resize',() => {
		let w = window.innerWidth;
		let h = window.innerHeight;
		overlay.resize(w,h);
		camera.resize(w,h);
	},false);
	
	let covered = 0;
	let loop = new GameLoop(function(seconds){
		let change = player.update(controls.states, map, seconds);

		overlay.tick(player, covered, seconds);

		if(change){
			let cx = Math.floor(player.x);
			let cy = Math.floor(player.y);
			let cz = Math.floor(player.z);
			let cw = Math.floor(player.w);
			
			let val = map.get(cx,cy,cz,cw);
			if(val === 1 || val === 2){
				map.set(cx,cy,cz,cw,0);
				camera.setCell(cx,cy,cz,cw,0);
				covered++;
			}

			camera.render(player);
		}
	});

	camera.onready(function(){
		camera.render(player);
		loop.start();
	});
}