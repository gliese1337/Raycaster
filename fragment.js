function getFragShader(
	SIZE,
	u_depth,
	u_resolution,
	u_origin,
	u_rgt, u_up, u_fwd, u_ana,
	u_map, u_textures
){
	"use strict";

	function get_cell(x, y, z, w){
		x %= SIZE;
		y %= SIZE;
		z %= SIZE;
		w %= SIZE;
		if(x < 0){ x += SIZE; }
		if(y < 0){ y += SIZE; }
		if(z < 0){ z += SIZE; }
		if(w < 0){ z += SIZE; }
		return u_map[w][z][y][x];
	}

	// Find the distance to the next cell boundary
	// for a particular vector component
	function cast_comp(x, y, z, w, o){
		var scale, delta,
			sign, m;
		if(x > 0){
			sign = 1;
			m = Math.floor(o);
			delta = m + 1.0 - o;
		}else{
			sign = -1;
			m = Math.ceil(o - 1.0);
			delta = m - o;
		}

		scale = delta/x;
		y = y*scale||0;
		z = z*scale||0;
		w = w*scale||0;

		return {
			sign: sign, m: m,
			dist: Math.sqrt(delta*delta + y*y + z*z + w*w)
		};
	}

	function calc_tex(dim, ray){
		var x = ray.x - Math.floor(ray.x),
			y = ray.y - Math.floor(ray.y),
			z = ray.z - Math.floor(ray.z),
			w = ray.w - Math.floor(ray.w);

		if(dim == 1){ return u_textures[0].get(y,z); }
		if(dim == 2){ return u_textures[1].get(z,x); }
		if(dim == 3){ return u_textures[2].get(x,y); }
		if(dim == 4){ return u_textures[3].get(y,x); }
		if(dim == -1){ return u_textures[0].get(y,z); }
		if(dim == -2){ return u_textures[1].get(z,x); }
		if(dim == -3){ return u_textures[2].get(x,y); }
		return u_textures[3].get(y,x);
	}

	function normalize(v){
		var mag = Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z+v.w*v.w);
		return { x: v.x/mag, y: v.y/mag, z: v.z/mag, w: v.w/mag };
	};

	function cast_vec(o, v, range) {
		"use strict";

		// Starting from the player, we find the nearest gridlines
		// in each dimension. We move to whichever is closer and
		// check for a wall (inspect). Then we repeat until we've
		// traced the entire length of the ray.

		var sx, sy, sz, sw,
			mx, my, mz, mw,
			xdelta, ydelta, zdelta, wdelta,
			xdist, ydist, zdist, wdist,
			value, dim, tmp, i, inc,
			blue = 0,
			yellow = 0,
			distance = 0;

		v = normalize(v);
			
		// Inverting the elements of a normalized vector
		// gives the distance you have to move along that
		// vector to hit a cell boundary perpendicular
		// to that dimension.
		xdelta = Math.abs(1/v.x);
		ydelta = Math.abs(1/v.y);
		zdelta = Math.abs(1/v.z);
		wdelta = Math.abs(1/v.w);

		tmp = cast_comp(v.x, v.y, v.z, v.w, o.x);
		xdist = tmp.dist;
		sx = tmp.sign;
		mx = tmp.m;

		tmp = cast_comp(v.y, v.x, v.z, v.w, o.y);
		ydist = tmp.dist;
		sy = tmp.sign;
		my = tmp.m;

		tmp = cast_comp(v.z, v.x, v.y, v.w, o.z);
		zdist = tmp.dist;
		sz = tmp.sign;
		mz = tmp.m;

		tmp = cast_comp(v.w, v.x, v.y, v.z, o.w);
		wdist = tmp.dist;
		sw = tmp.sign;
		mw = tmp.m;

		for(i = 0; i < 1000; i++) {
			// Find the next closest cell boundary
			// and increment distances appropriately
			if(xdist <= ydist && xdist <= zdist && xdist <= wdist){		
				dim = 1*sx;
				mx += sx;
				inc = xdist - distance;
				distance = xdist;
				xdist += xdelta;
			}else if(ydist <= xdist && ydist <= zdist && ydist <= wdist){
				dim = 2*sy;
				my += sy;
				inc = ydist - distance;
				distance = ydist;
				ydist += ydelta;
			}else if(zdist <= xdist && zdist <= ydist && zdist <= wdist){
				dim = 3*sz;
				mz += sz;
				inc = zdist - distance;
				distance = zdist;
				zdist += zdelta;
			}else{
				dim = 4*sw;
				mw += sw;
				inc = wdist - distance;
				distance = wdist;
				wdist += wdelta;
			}

			value = get_cell(mx, my, mz, mw);
			if(value == 1){
				blue += inc;
			}else if(value == 2){
				yellow += inc;
			}

			if(value == 3 || distance >= range){
				break;
			}
		}

		var tex;
		if(value == 0){
			tex = [255,255,255,255];
		}else{
			tex = calc_tex(dim, {
				x: o.x + distance *  v.x,
				y: o.y + distance *  v.y,
				z: o.z + distance *  v.z,
				w: o.w + distance *  v.w
			});
		}

		var clear = distance - yellow - blue;
		
		clear /= distance;
		yellow /= distance;
		blue /= distance;
		
		tex = [
			tex[0]*clear + 255*.71*yellow,
			tex[1]*clear + 255*.71*yellow,
			tex[2]*clear + 255*blue
		];

		var dr = distance/range;
		var alpha = Math.floor(255*(1.0 - dr*dr*dr*dr));;
		return 'rgba('+[tex[0],tex[1],tex[2],alpha].join(',')+')';
	}

	return function main(x, y){
		if(get_cell(
			Math.floor(u_origin.x),
			Math.floor(u_origin.y),
			Math.floor(u_origin.z),
			Math.floor(u_origin.w)
		) == 3){
			return [0,0,0,255];
		}
		
		x -= u_resolution.h/2;
		y -= u_resolution.v/2;
		return cast_vec(u_origin, {
			x: u_depth*u_fwd.x+x*u_rgt.x+y*u_up.x,
			y: u_depth*u_fwd.y+x*u_rgt.y+y*u_up.y,
			z: u_depth*u_fwd.z+x*u_rgt.z+y*u_up.z,
			w: u_depth*u_fwd.w+x*u_rgt.w+y*u_up.w
		}, 10);
	};
}