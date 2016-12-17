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

	var px, py, pz, pw,
		map = new Maze(SIZE);

	start_loop:
	for(px = 0; px < SIZE; px++)
	for(py = 0; py < SIZE; py++)
	for(pz = 0; pz < SIZE; pz++)
	for(pw = 0; pw < SIZE; pw++)
		if(map.get(px,py,pz,pw) === 0){ break start_loop; }

	var player = new Player(px+.5, py+.5, pz+.5, pw+.5);
	var controls = new Controls();
	var camera = new Camera(canvas, map, Math.PI / 1.5,
		["texture1.jpg","texture2.jpg","texture3.jpg","texture4.jpg"]);

	var fps = [];
	var loop = new GameLoop(function(seconds){
		var change = player.update(controls.states, map, seconds);
		if(change){
			camera.render(player);
			console.log(fps.reduce(function(a,n){ return a + n; })/fps.length,"FPS");
			console.log("x",player.x,"y",player.y,"z",player.z,"w",player.w);
		}
		if(fps.length > 20){ fps.shift(); }
		fps.push(1/seconds);
	});

	camera.onready(function(){
		camera.render(player);
		loop.start();
	});
}