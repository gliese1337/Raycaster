function Texture(img, width, height) {
	"use strict";
	var canvas = document.createElement('canvas'),
		ctx = canvas.getContext('2d');

	this.ctx = ctx;
	this.width = width;
	this.height = height;

	canvas.width = width;
	canvas.height = height;
	ctx.drawImage(img, 0, 0, width, height);
}

Texture.prototype.get = function(x, y){
	return this.ctx.getImageData(
		Math.round(x*this.width),
		Math.round(y*this.height),
		1, 1
	).data;
};

function Camera(canvas, map, width, height, hfov, textures) {
	"use strict";
	var promise;

	this.width = width;
	this.height = height;
	this.hscale = canvas.width / width;
	this.vscale = canvas.height / height;
	this.resolution = {h: width, v: height};
	this.depth = width/(2*Math.tan(hfov/2));
	this.map = map;
	this.textures = [];

	this.ctx = canvas.getContext('2d');

	//load textures
	var promise = Promise.all(textures.map(function(src){
			var image = new Image();
			image.src = src;
			return new Promise(function(resolve){
				image.addEventListener("load",function(){
					resolve(new Texture(image, 1024, 1024));
				});
			});
		})).then(function(arr){
			this.textures = arr;
		}.bind(this));

	this.onready = promise.then.bind(promise);
}

Camera.prototype.render = function(player, map) {
	"use strict";
	var x, y, tex,
		hscale = this.hscale,
		vscale = this.vscale,
		width = this.width,
		height = this.height,
		ctx = this.ctx,
		cast = getFragShader(SIZE,
			this.depth, {h: width, v: height}, player,
			player.rgt, player.up, player.fwd, player.ana,
			this.map.grid, this.textures
		);
	for(x = 0; x < width; x++)
	for(y = 0; y < height; y++){
		ctx.fillStyle = cast(x, y);
		ctx.fillRect(x*hscale, (height - y)*vscale, hscale, vscale);
	}
};

function main(canvas, width, height){
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
	var camera = new Camera(canvas, map, width, height, Math.PI / 1.5,
		["texture1.jpg","texture2.jpg","texture3.jpg","texture4.jpg"]);

	var fps = [];
	var loop = new GameLoop(function(seconds){
		var change = player.update(controls.states, map, seconds);
		if(change){
			camera.render(player, map);
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