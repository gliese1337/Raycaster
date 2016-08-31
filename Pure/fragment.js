function getFragShader(u_resolution, u_scale, u_map){

	function get_cell(x, y, z){
		return u_map[(x%8)*64+(y%8)*8+(z%8)];
	}

	// Find the distance to the next cell boundary
	// for a particular vector component
	function cast_comp(v, origin){
		var delta, y, z,
			x = v.x;
		if(x > 0.0){
			sign = 1.0;
			m = Math.floor(origin);
			delta = m + 1.0 - origin;
		}else{
			sign = -1.0;
			m = Math.ceil(origin - 1.0);
			delta = m - origin;
		}

		y = delta * v.y / x;
		z = delta * v.z / x;

		return {
			length: Math.sqrt(x*x + y*y + z*z),
			sign: sign,
			m: m
		};
	}

	function cast_vec(o, v, range){
		// Starting from the player, we find the nearest horizontal
		// and vertical gridlines. We move to whichever is closer and
		// check for a wall (inspect). Then we repeat until we've
		// traced the entire length of the ray.

		var sx, sy, sz;
		var mx, my, mz;
		var dim;
		var distance = 0.0;
		var value, tmp;

		//v = normalize(v);

		// Inverting the elements of a normalized vector
		// gives the distance you have to move along that
		// vector to hit a cell boundary perpendicular
		// to that dimension.
		var deltas = {
			x: Math.abs(1.0/v.x),
			y: Math.abs(1.0/v.y),
			z: Math.abs(1.0/v.z)
		};

		tmp = cast_comp({x:v.x,y:v.y,z:v.z}, o.x);
		var xdist = tmp.length;
		sx = tmp.sign;
		mx = tmp.m;

		tmp = cast_comp({x:v.y,y:v.x,z:v.z}, o.y);
		var ydist = tmp.length;
		sy = tmp.sign;
		my = tmp.m;

		tmp = cast_comp({x:v.y,y:v.x,z:v.z}, o.y);
		var zdist = tmp.length;
		sz = tmp.sign;
		mz = tmp.m;

		// while loops are not allowed, so we have to use
		// a for loop with a fixed max number of iterations
		for(var i = 0; i < 1000; i++){
			// Find the next closest cell boundary
			// and increment distances appropriately
			if(xdist < ydist && xdist < zdist){
				dim = 1.0*sx;
				mx += sx;
				distance = xdist;
				xdist += deltas.x;
			}else if(ydist < xdist && ydist < zdist){
				dim = 2.0*sy;
				my += sy;
				distance = ydist;
				ydist += deltas.y;
			}else{
				dim = 3.0*sz;
				mz += sz;
				distance = zdist;
				zdist += deltas.z;
			}

			value = get_cell(mx, my, mz);
			if(value > 0 || distance >= range){
				break;
			}
		}

		//TODO: Use textures
		var alpha = 1.0 - distance/range;
		if(dim == 1.0){ return {r:1,g:0,b:0,a:alpha}; }
		if(dim == 2.0){ return {r:0,g:1,b:0,a:alpha}; }
		if(dim == 3.0){ return {r:0,g:0,b:1,a:alpha}; }
		if(dim == -1.0){ return {r:0,g:1,b:1,a:alpha}; } 
		if(dim == -2.0){ return {r:1,g:0,b:1,a:alpha}; }
		return {r:1,g:1,b:0,a:alpha};
	}

	return function main(u_origin, u_look, x, y){
		// convert clipspace to viewing angles
		var theta = Math.atan(u_scale.h * (x / u_resolution.x - 0.5));
		var phi = Math.atan(u_scale.v * (y / u_resolution.y - 0.5));
		var sinx = Math.sin(theta + u_look.theta);
		var siny = Math.sin(phi + u_look.phi);
		var cosx = Math.cos(theta + u_look.theta);
		var cosy = Math.cos(phi + u_look.phi);
		var comps = {x:cosx*cosy, y:sinx*cosy, z:siny};
		return cast_vec(u_origin, comps, 10.0);
	};
}