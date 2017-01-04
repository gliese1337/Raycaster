function getFragShader(
	SIZE,
	u_depth,
	u_resolution,
	u_origin,
	u_rgt, u_up, u_fwd,
	u_seed, u_colorscale,
	u_map
){
	"use strict";

	function normalize(v){
		var mag = Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z+v.w*v.w);
		return { x: v.x/mag, y: v.y/mag, z: v.z/mag, w: v.w/mag };
	}

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

	/*
	 * PROCEDURAL TEXTURE CODE
	 */

	/* Simplex Noise Algorithm */
	function permute(x){
		return (((x*34.0)+1.0)*x) % 289.0;
	}

	function fastInvSqrt(r){
		return 1.79284291400159 - 0.85373472095314 * r;
	}

	function snoise(v){
		const C = vec2(1.0/6.0, 1.0/3.0) ;
		const D = vec4(0.0, 0.5, 1.0, 2.0);

		// First corner
		vec3 i = floor(v + dot(v, C.yyy));
		vec3 x0 = v - i + dot(i, C.xxx) ;

		// Other corners
		vec3 g = step(x0.yzx, x0.xyz);
		vec3 l = 1.0 - g;
		vec3 i1 = min(g.xyz, l.zxy);
		vec3 i2 = max(g.xyz, l.zxy);

		vec3 x1 = x0 - i1 + C.x;
		vec3 x2 = x0 - i2 + C.y;
		vec3 x3 = x0 - D.y;

		i = mod(i,289.0);
		vec4 p = permute( permute( permute(
				 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
			   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
			   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

		float n_ = 1.0/7.0;
		vec3  ns = n_ * D.wyz - D.xzx;

		vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

		vec4 x_ = floor(j * ns.z);
		vec4 y_ = floor(j - 7.0 * x_ );

		vec4 x = x_ *ns.x + ns.y;
		vec4 y = y_ *ns.x + ns.y;
		vec4 h = 1.0 - abs(x) - abs(y);

		vec4 b0 = vec4( x.xy, y.xy );
		vec4 b1 = vec4( x.zw, y.zw );

		vec4 s0 = floor(b0)*2.0 + 1.0;
		vec4 s1 = floor(b1)*2.0 + 1.0;
		vec4 sh = -step(h, vec4(0.0));

		vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
		vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

		vec3 p0 = vec3(a0.xy,h.x);
		vec3 p1 = vec3(a0.zw,h.y);
		vec3 p2 = vec3(a1.xy,h.z);
		vec3 p3 = vec3(a1.zw,h.w);

		//Normalise gradients
		vec4 norm = fastInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
		p0 *= norm.x;
		p1 *= norm.y;
		p2 *= norm.z;
		p3 *= norm.w;

		// Mix final noise value
		vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
		m = m*m;
		return 40.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
	}

	function layered_noise(v, base, octaves){
		let acc = 0.0;
		let p = Math.pow(2.0, base);
		v = {x:v.x*p, y:v.y*p, z:v.z*p};
		for(let i = 1; i < 1000; i++){
			acc += snoise(v);
		v = {x:v.x*2, y:v.y*2, z:v.z*2};
		}
		return acc / octaves;
	}

	/* 3D modification of Julia fractal */
	function julia(v, seed) {
		const iter = 10;

		v = {x:v.x*2-1, y:v.y*2-1, z:v.z*2-1};
		for(let i = 0; i < iter; i++){
			let x = (v.x*v.x - v.y*v.y - v.z*v.z) + seed.x;
			let y = (2*v.x*v.y) + seed.y;
			let z = (2*v.x*v.z) + seed.z;

			if((x*x + y*y + z*z) > 4){
				return i / iter;
			}

			v.x = x;
			v.y = y;
			v.z = z;
		}

		return 0;
	}

	/* Main Texture Calculation */
	const vec3 grey = vec3(0.2);
	const vec3 red = vec3(1.0,0.5,0.5);
	const vec3 green = vec3(0.5,1.0,0.5);
	const vec3 blue = vec3(0.5,0.5,1.0);
	const vec3 yellow = vec3(0.71,0.71,0.5);

	vec3 calc_tex(int dim, vec4 ray){
		ray = fract(ray);
		vec3 coords, tint;
		float h;

		if(dim == 1 || dim == -1){
			coords = ray.yzw;
			tint = red;
			h = julia(coords, u_seed);
		}
		else if(dim == 2 || dim == -2){
			coords = ray.xzw;
			tint = green;
			h = julia(coords, u_seed);
		}
		else if(dim == 3 || dim == -3){
			coords = ray.xyw;
			tint = blue;
			h = julia(coords, u_seed);
		}
		else if(dim == 4 || dim == -4){
			coords = ray.xyz;
			tint = yellow;
			h = julia(coords, u_seed);
		}

		if(h == 0.0){
			return mix(tint/16.0, grey, layered_noise(coords, 3, 4));
		}

		vec3 base = texture2D(u_colorscale, vec2(h, 0.5)).rgb;
		return mix(tint/8.0, base, layered_noise(coords, 4, 5));
	}

	/* Flashlight Algorithm */
	const float light_angle = 40.0;
	const float light_mult = 5.0;
	vec3 add_light(vec4 fwd, vec4 v, vec3 color, int dim, float distance){
		float t = degrees(acos(dot(fwd, v)));
		if(t > light_angle){ return color; }

		// Dim based on distance
		float dm = light_mult / pow(2.0, distance);

		// Dim based on incidence angle
		float am;
		if     (dim == 1 || dim == -1){ am = abs(v.x); }
		else if(dim == 2 || dim == -2){ am = abs(v.y); }
		else if(dim == 3 || dim == -3){ am = abs(v.z); }
		else if(dim == 4 || dim == -4){ am = abs(v.w); }

		float mult = 1.0 + dm * am * (1.0 - (t / light_angle));
		return min(color * mult, 1.0);
	}

	/*
	 * RAYCASTING
	 */
	
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
			s: s, m: m,
			d: Math.sqrt(delta*delta + y*y + z*z + w*w)
		};
	}

	// Starting from the player, we find the nearest gridlines
	// in each dimension. We move to whichever is closer and
	// check for a wall (inspect). Then we repeat until we've
	// traced the entire length of the ray.
	function cast_vec(o, v, range) {
		"use strict";

		v = normalize(v);
			
		// Inverting the elements of a normalized vector
		// gives the distance you have to move along that
		// vector to hit a cell boundary perpendicular
		// to that dimension.
		let xdelta = Math.abs(1/v.x);
		let ydelta = Math.abs(1/v.y);
		let zdelta = Math.abs(1/v.z);
		let wdelta = Math.abs(1/v.w);

		// Get the initial distances from the starting
		// point to the next cell boundaries.
		let {d: xdist, s: sx, m: mx} =
			cast_comp(v.x, v.y, v.z, v.w, o.x);
		
		let {d: ydist, s: sy, m: my} =
			cast_comp(v.y, v.x, v.z, v.w, o.y);

		let {d: zdist, s: sz, m: mz} =
			cast_comp(v.z, v.x, v.y, v.w, o.z);

		let {d: wdist, s: sw, m: mw} =
			cast_comp(v.w, v.x, v.y, v.z, o.w);

		// Keep track of total distance,
		// and distance in colored cells.
		float distance = 0.0;
		float bluefrac = 0.0;
		float yellowfrac = 0.0;
		float redfrac = 0.0;
		
		let value, dim;
		for(let i = 0; i < 1000; i++) {
			// Find the next closest cell boundary
			// and increment distances appropriately
			let inc;
			if(xdist < ydist && xdist < zdist && xdist < wdist){		
				dim = 1*sx;
				mx += sx;
				inc = xdist - distance;
				distance = xdist;
				xdist += xdelta;
			}else if(ydist < zdist && ydist < wdist){
				dim = 2*sy;
				my += sy;
				inc = ydist - distance;
				distance = ydist;
				ydist += ydelta;
			}else if(zdist < wdist){
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
				bluefrac += inc;
			}else if(value == 2){
				yellowfrac += inc;
			}else if(value == 3){
				redfrac += inc;
			}

			if(value == 255 || distance >= range){
				break;
			}
		}

		let ray = {
			x: o.x + distance *  v.x,
			y: o.y + distance *  v.y,
			z: o.z + distance *  v.z,
			w: o.w + distance *  v.w
		};
		
		let tex = calc_tex(dim, ray);

		let clear = distance - yellowfrac - bluefrac - redfrac;
		
		clear /= distance;
		yellowfrac /= distance;
		bluefrac /= distance;
		redfrac /= distance;
		
		tex = [
			tex[0]*clear + 255*.71*yellowfrac + 255*redfrac,
			tex[1]*clear + 255*.71*yellowfrac,
			tex[2]*clear + 255*bluefrac
		];

		tex = add_light(u_fwd, v, tex, dim, distance);

		return 'rgba('+[tex[0],tex[1],tex[2],1].join(',')+')';
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