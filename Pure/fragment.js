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
	
	function cast_vec(o, v, range) {
		"use strict";

		// Starting from the player, we find the nearest horizontal and vertical gridlines. We move to whichever is closer and check for a wall (inspect). Then we repeat until we've traced the entire length of each ray.

		var mx, my, mz, sx, sy, sz, dx, dy, dz,
			xdelta, ydelta, zdelta,
			xdist, ydist, zdist,
			value, dim, i,
			distance = 0;
			
		// Inverting the elements of a normalized vector
		// gives the distance you have to move along that
		// vector to hit a cell boundary perpendicular
		// to that dimension.
		xdelta = Math.abs(1/v.x);
		ydelta = Math.abs(1/v.y);
		zdelta = Math.abs(1/v.z);

		if(v.x > 0){
			sx = 1;
			mx = Math.floor(o.x);
			dx = mx + 1 - o.x;
		}else{
			sx = -1;
			mx = Math.ceil(o.x - 1);
			dx = mx - o.x;
		}
		dy = dx * (v.y/v.x);
		dz = dx * (v.z/v.x);
		xdist = Math.sqrt(dx*dx + dy*dy + dz*dz);

		if(v.y > 0){
			sy = 1;
			my = Math.floor(o.y);
			dy = my + 1 - o.y;
		}else{
			sy = -1;
			my = Math.ceil(o.y - 1);
			dy = my - o.y;
		}
		dx = dy * (v.x/v.y);
		dz = dy * (v.z/v.y);
		ydist = Math.sqrt(dx*dx + dy*dy + dz*dz);
		
		if(v.z > 0){
			sz = 1;
			mz = Math.floor(o.z);
			dz = mz + 1 - o.z;
		}else{
			sz = -1;
			mz = Math.ceil(o.z - 1);
			dz = mz - o.z;
		}
		dx = dz * (v.x/v.z);
		dy = dz * (v.y/v.z);
		zdist = Math.sqrt(dx*dx + dy*dy + dz*dz);

		for(i = 0; i < 100000; i++) {
			if(xdist <= ydist && xdist <= zdist){		
				dim = 0;
				mx += sx;
				distance = xdist;
				xdist += xdelta;
			}else if(ydist <= xdist && ydist <= zdist){
				dim = 1;
				my += sy;
				distance = ydist;
				ydist += ydelta;
			}else{
				dim = 2;
				mz += sz;
				distance = zdist;
				zdist += zdelta;
			}

			value = get_cell(mx, my, mz);
			if(value != 0 || distance >= range){
				break;
			}
		}

		return {
			x: o.x + distance * v.x,
			y: o.y + distance * v.y,
			z: o.z + distance * v.z,
			vector: [v.x,v.y,v.z],
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
		return cast_vec(origin,
			{x:tcos*pcos, y:tsin*pcos, z:psin}, 10
		);
	};
}