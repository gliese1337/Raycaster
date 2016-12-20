let Raycast = (function(){
	"use strict";

	function normalize(v){
		let mag = Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z+v.w*v.w);
		return { x: v.x/mag, y: v.y/mag, z: v.z/mag, w: v.w/mag };
	}

	// Find the distance to the next cell boundary
	// for a particular vector component
	function cast_comp(x, y, z, w, o){
		let delta, s, m;
		if(x > 0){
			s = 1;
			m = Math.floor(o);
			delta = m + 1.0 - o;
		}else{
			s = -1;
			m = Math.ceil(o - 1.0);
			delta = m - o;
		}

		let scale = delta/x;
		y = y*scale||0;
		z = z*scale||0;
		w = w*scale||0;

		return {
			s: sign, m: m,
			d: Math.sqrt(delta*delta + y*y + z*z + w*w)
		};
	}

	function get_cell(SIZE, map, x, y, z, w){
		x %= SIZE;
		y %= SIZE;
		z %= SIZE;
		w %= SIZE;
		if(x < 0){ x += SIZE; }
		if(y < 0){ y += SIZE; }
		if(z < 0){ z += SIZE; }
		if(w < 0){ w += SIZE; }
		return map[w][z][y][x];
	}

	return function cast(o, v, range, SIZE, map) {
		"use strict";

		// Starting from the player, we find the nearest gridlines
		// in each dimension. We move to whichever is closer and
		// check for a wall (inspect). Then we repeat until we've
		// traced the entire length of the ray.

		v = normalize(v);
		
		let count = 0;
		
		// Inverting the elements of a normalized vector
		// gives the distance you have to move along that
		// vector to hit a cell boundary perpendicular
		// to that dimension.

		let xmax = 1/0;
		let xdelta = Math.abs(1/v.x);
		if(!isFinite(xdelta)){ count++; }
		
		let ymax = 1/0;
		let ydelta = Math.abs(1/v.y);
		if(!isFinite(ydelta)){ count++; }

		let zmax = 1/0;
		let zdelta = Math.abs(1/v.z);
		if(!isFinite(zdelta)){ count++; }

		let wmax = 1/0;
		let wdelta = Math.abs(1/v.w);
		if(!isFinite(wdelta)){ count++; }

		let {d: xdist, s: sx, m: mx} =
			cast_comp(v.x, v.y, v.z, v.w, o.x);
		
		let {d: ydist, s: sy, m: my} =
			cast_comp(v.y, v.x, v.z, v.w, o.y);

		let {d: zdist, s: sz, m: mz} =
			cast_comp(v.z, v.x, v.y, v.w, o.z);

		let {d: wdist, s: sw, m: mw} =
			cast_comp(v.w, v.x, v.y, v.z, o.w);

		let value, dim, distance;
		for(let i = 0; i < 1000; i++) {
			// Find the next closest cell boundary
			// and increment distances appropriately
			if(xdist <= ydist && xdist <= zdist && xdist <= wdist){		
				dim = 1*sx;
				mx += sx;
				distance = xdist;
				xdist += xdelta;
				if(!isFinite(xmax) && get_cell(SIZE, map, mx, my, mz, mw) == 3){
					xmax = distance * v.x;
					count++;
				}
			}else if(ydist <= xdist && ydist <= zdist && ydist <= wdist){
				dim = 2*sy;
				my += sy;
				distance = ydist;
				ydist += ydelta;
				if(!isFinite(xmax) && get_cell(SIZE, map, mx, my, mz, mw) == 3){
					ymax = distance * v.y;
					count++;
				}
			}else if(zdist <= xdist && zdist <= ydist && zdist <= wdist){
				dim = 3*sz;
				mz += sz;
				distance = zdist;
				zdist += zdelta;
				if(!isFinite(xmax) && get_cell(SIZE, map, mx, my, mz, mw) == 3){
					zmax = distance * v.z;
					count++;
				}
			}else{
				dim = 4*sw;
				mw += sw;
				distance = wdist;
				wdist += wdelta;
				if(!isFinite(xmax) && get_cell(SIZE, map, mx, my, mz, mw) == 3){
					wmax = distance * v.w;
					count++;
				}
			}

			if(count == 4 || distance >= range){
				break;
			}
		}

		return {
			xmax: xmax,
			ymax: ymax,
			zmax: zmax,
			wmax: wmax
		};
	};
}());