precision mediump float;

const int SIZE = 8;
const int SIZE2 = SIZE*SIZE;
const int SIZE3 = SIZE*SIZE2;

uniform float u_depth;
uniform vec2 u_resolution;
uniform vec3 u_origin;
uniform vec3 u_rgt;
uniform vec3 u_up;
uniform vec3 u_fwd;

uniform int u_map[SIZE3];
uniform sampler2D u_textures[3];

int get_cell(int x, int y, int z){
	x = int(mod(float(x),float(SIZE)));
	y = int(mod(float(y),float(SIZE)));
	z = int(mod(float(z),float(SIZE)));

	// have to use constant indexing...
	// All of this is just to get x, y, & z
	// into loop indices to satisfy the compiler
	for(int ix = 0; ix < 8; ix++){
		if(ix != x){ continue; }
		for(int iy = 0; iy < 8; iy++){
			if(iy != y){ continue; }
			for(int iz = 0; iz < 8; iz++){
				if(iz != z){ continue; }
				return u_map[ix*SIZE2+iy*SIZE+iz];
			}
		}
	}
	return 0;
}

// Find the distance to the next cell boundary
// for a particular vector component
float cast_comp(vec3 v, float o, out int sign, out int m){
	float delta, fm;
	if(v.x > 0.0){
		sign = 1;
		fm = floor(o);
		delta = fm + 1.0 - o;
	}else{
		sign = -1;
		fm = ceil(o - 1.0);
		delta = fm - o;
	}

	m = int(fm);
	return length(vec3(delta,delta*v.yz/v.x));
}

vec4 calc_tex(int dim, vec3 ray){

	ray -= floor(ray);
	
	if(dim == 1){ return texture2D(u_textures[0], ray.yz); }
	if(dim == 2){ return texture2D(u_textures[1], ray.xz); }
	if(dim == 3){ return texture2D(u_textures[2], ray.xy); }
	if(dim == -1){ return texture2D(u_textures[0], ray.yz); } 
	if(dim == -2){ return texture2D(u_textures[1], ray.xz); }
	return texture2D(u_textures[2], ray.xy);
}

vec4 cast_vec(vec3 o, vec3 v, float range){
	// Starting from the player, we find the nearest horizontal
	// and vertical gridlines. We move to whichever is closer and
	// check for a wall (inspect). Then we repeat until we've
	// traced the entire length of the ray.

	int sx, sy, sz;
	int mx, my, mz;
	int dim, value;
	float distance = 0.0;

	v = normalize(v);

	// Inverting the elements of a normalized vector
	// gives the distance you have to move along that
	// vector to hit a cell boundary perpendicular
	// to that dimension.
	vec3 deltas = abs(vec3(1.0/v.x, 1.0/v.y, 1.0/v.z));

	float xdist = cast_comp(v.xyz, o.x, sx, mx);
	float ydist = cast_comp(v.yxz, o.y, sy, my);
	float zdist = cast_comp(v.zxy, o.z, sz, mz);
	
	// while loops are not allowed, so we have to use
	// a for loop with a fixed max number of iterations
	for(int i = 0; i < 1000; i++){
		// Find the next closest cell boundary
		// and increment distances appropriately
		if(xdist <= ydist && xdist <= zdist){
			dim = 1*sx;
			mx += sx;
			distance = xdist;
			xdist += deltas.x;
		}else if(ydist <= xdist && ydist <= zdist){
			dim = 2*sy;
			my += sy;
			distance = ydist;
			ydist += deltas.y;
		}else{
			dim = 3*sz;
			mz += sz;
			distance = zdist;
			zdist += deltas.z;
		}

		value = get_cell(mx, my, mz);
		if(value > 0 || distance >= range){
			break;
		}
	}

	if(value == 0){
		return vec4(1,1,1,1);
	}

	vec3 ray = o + distance *  v;
	vec4 tex = calc_tex(dim, ray);
	
	float dr = distance/range;
	float alpha = 1.0 - dr*dr*dr*dr;
	return vec4(tex.rgb, alpha);
}

void main(){vec2 coords = gl_FragCoord.xy - (u_resolution / 2.0);
	vec3 zoffset = u_fwd*u_depth;
	vec3 ray = zoffset + u_rgt*coords.x + u_up*coords.y;
	gl_FragColor = cast_vec(u_origin, ray, 10.0);
}
