const SIZE = 5;
const Camera = require("./GLCamera.js");
const Overlay = require("./Overlay.js");
const Player = require("./Player.js");
const Controls = require("./Controls.js");
const GameLoop = require("./GameLoop.js");
const Maze = require("./Maze.js");
const GL_Utils = require("./webgl-utils.js");

function plan_route(map){
	let path = map.getLongestPath(),
		start = path.shift(),
		end = path.pop();

	map.set(start.x,start.y,start.z,start.w,0);
	map.set(end.x,end.y,end.z,end.w,2);
	path.forEach((cell) => {
		map.set(cell.x,cell.y,cell.z,cell.w,1);
	});

	return {start: start, length: path.length+1};
}

function reset(camera, overlay, player){
	let map = new Maze(SIZE);
	let {start: {x, y, z, w}, length} = plan_route(map);

	camera.map = map;
	overlay.len = length;
	
	player.x += x - Math.floor(player.x);
	player.y += y - Math.floor(player.y);
	player.z += z - Math.floor(player.z);
	player.w += w - Math.floor(player.w);

	return map;
}

function main(d, o){
	"use strict";

	let map = new Maze(SIZE);
	let {start: {x, y, z, w}, length} = plan_route(map);
	let player = new Player(x+.5, y+.5, z+.5, w+.5);
	let controls = new Controls(d.width, d.height);
	let camera = new Camera(d, map, Math.PI / 1.5,
		["texture1.jpg","texture2.jpg","texture3.jpg","texture4.jpg"]);

	let overlay = new Overlay(o, length);

	window.addEventListener('resize',() => {
		let w = window.innerWidth;
		let h = window.innerHeight;
		overlay.resize(w,h);
		camera.resize(w,h);
		controls.width = w;
		controls.height = h;
	},false);
	
	let covered = 0;
	let rx = 0, ry = 0;
	let states = controls.states;
	let loop = new GameLoop((seconds) => {
		let change = player.update(states, map, seconds);

		if(states.zoomin && camera.fov < Math.PI){
			camera.fov = Math.min(camera.fov + Math.PI*seconds/2, Math.PI);
			change = true;
		}else if(states.zoomout && camera.fov > .01){
			camera.fov = Math.max(camera.fov - Math.PI*seconds/2, 0);
			change = true;
		}

		if(states.mouse){
			({mouseX: rx, mouseY: ry} = states);
		}else{
			if(rx !== 0){ rx /= 2;}
			if(Math.abs(rx) < .01){ rx = 0; }
			if(ry !== 0){ ry /= 2;}
			if(Math.abs(ry) < .01){ ry = 0; }
		}

		let {dist} = camera.castRay(player);
		overlay.tick(player, covered, seconds);
		overlay.reticle({x: rx, y: ry, dist: dist});
			
		if(change){
			let cx = Math.floor(player.x);
			let cy = Math.floor(player.y);
			let cz = Math.floor(player.z);
			let cw = Math.floor(player.w);
			
			let val = map.get(cx,cy,cz,cw);
			if(val === 1){
				map.set(cx,cy,cz,cw,0);
				camera.setCell(cx,cy,cz,cw,0);
				covered++;
			}

			if(val === 2){
				covered = 0;
				map = reset(camera, overlay, player);
			}

			camera.render(player);
		}
	});

	camera.onready(() => {
		camera.render(player);
		loop.start();
	});
}