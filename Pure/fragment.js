function getFragShader(origin, look, resolution, scale, dims, map){
	"use strict";

	function get_cell(x, y, z){
		x %= dims.x;
		y %= dims.y;
		z %= dims.z;
		if(x < 0){ x += dims.x; }
		if(y < 0){ y += dims.y; }
		if(z < 0){ z += dims.z; }
		return map[z * dims.x * dims.y + y * dims.x + x];
	}
	
	function cast_vec(point, vector, range) {
		"use strict";
		var xc = vector[0],
			yc = vector[1],
			zc = vector[2];

		// Starting from the player, we find the nearest horizontal and vertical gridlines. We move to whichever is closer and check for a wall (inspect). Then we repeat until we've traced the entire length of each ray.

		var mx, my, mz, sx, sy, sz, dx, dy, dz,
			xdelta, ydelta, zdelta,
			xdist, ydist, zdist,
			value, dim,
			x = point[0],
			y = point[1],
			z = point[2],
			distance = 0;
			
		// Inverting the elements of a normalized vector
		// gives the distance you have to move along that
		// vector to hit a cell boundary perpendicular
		// to that dimension.
		xdelta = Math.abs(1/xc);
		ydelta = Math.abs(1/yc);
		zdelta = Math.abs(1/zc);

		if(xc > 0){
			sx = 1;
			mx = Math.floor(x);
			dx = mx + 1 - x;
		}else{
			sx = -1;
			mx = Math.ceil(x - 1);
			dx = mx - x;
		}
		dy = dx * (yc/xc);
		dz = dx * (zc/xc);
		xdist = Math.sqrt(dx*dx + dy*dy + dz*dz);

		if(yc > 0){
			sy = 1;
			my = Math.floor(y);
			dy = my + 1 - y;
		}else{
			sy = -1;
			my = Math.ceil(y - 1);
			dy = my - y;
		}
		dx = dy * (xc/yc);
		dz = dy * (zc/yc);
		ydist = Math.sqrt(dx*dx + dy*dy + dz*dz);
		
		if(zc > 0){
			sz = 1;
			mz = Math.floor(z);
			dz = mz + 1 - z;
		}else{
			sz = -1;
			mz = Math.ceil(z - 1);
			dz = mz - z;
		}
		dx = dz * (xc/zc);
		dy = dz * (yc/zc);
		zdist = Math.sqrt(dx*dx + dy*dy + dz*dz);

		do {
			switch(Math.min(xdist, ydist, zdist)){
			case xdist:
				dim = 0;
				mx += sx;
				distance = xdist;
				xdist += xdelta;
				break;
			case ydist:
				dim = 1;
				my += sy;
				distance = ydist;
				ydist += ydelta;
				break;
			case zdist:
				dim = 2;
				mz += sz;
				distance = zdist;
				zdist += zdelta;
				break;
			}
			value = get_cell(mx, my, mz);
		} while(value === 0 && distance < range);

		return {
			x: x + distance * xc,
			y: y + distance * yc,
			z: z + distance * zc,
			vector: vector,
			dimension: dim,
			value: value,
			distance: distance,
		};
	}

	return function main(x, y){
		var theta = look.theta + Math.atan(scale.h*(x / resolution.h - 0.5));
		var phi = look.phi + Math.atan(scale.v*(y / resolution.v - 0.5));
		var tcos = Math.cos(theta);
		var tsin = Math.sin(theta);
		var pcos = Math.cos(phi);
		var psin = Math.sin(phi);
		return cast_vec(
			[origin.x, origin.y, origin.z],
			[tcos*pcos, tsin*pcos, psin], 10
		);
	};
}