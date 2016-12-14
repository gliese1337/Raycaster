precision mediump float;

const int SIZE = 5;
const int SIZE2 = SIZE*SIZE;
const int SIZE3 = SIZE*SIZE2;
const int SIZE4 = SIZE*SIZE3;

uniform vec2 u_resolution;
uniform vec2 u_scale;
uniform vec4 u_origin;
uniform vec4 u_rgt;
uniform vec4 u_up;
uniform vec4 u_fwd;
uniform vec4 u_ana;

uniform int u_map[SIZE4];
uniform sampler2D u_textures[4];

int get_cell(int x, int y, int z, int w){
	x = int(mod(float(x),float(SIZE)));
	y = int(mod(float(y),float(SIZE)));
	z = int(mod(float(z),float(SIZE)));
	w = int(mod(float(w),float(SIZE)));

	// have to use constant indexing...
	// All of this is just to get x, y, & z
	// into loop indices to satisfy the compiler
	for(int ix = 0; ix < SIZE; ix++){
		if(ix != x){ continue; }
		for(int iy = 0; iy < SIZE; iy++){
			if(iy != y){ continue; }
			for(int iz = 0; iz < SIZE; iz++){
				if(iz != z){ continue; }
				for(int iw = 0; iw < SIZE; iw++){
					if(iw != w){ continue; }
					return u_map[ix*SIZE3+iy*SIZE2+iz*SIZE+iw];
				}
			}
		}
	}
	return 0;
}

// Find the distance to the next cell boundary
// for a particular vector component
float cast_comp(vec4 v, float o, out int sign, out int m){
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
	return length(vec4(delta,delta*v.yzw/v.x));
}

vec4 calc_tex(int dim, vec4 ray){

	ray -= floor(ray);

	if(dim == 1){ return texture2D(u_textures[0], ray.yz); }
	if(dim == 2){ return texture2D(u_textures[1], ray.zx); }
	if(dim == 3){ return texture2D(u_textures[2], ray.xy); }
	if(dim == 4){ return texture2D(u_textures[3], ray.yx); }
	if(dim == -1){ return texture2D(u_textures[0], ray.yz); }
	if(dim == -2){ return texture2D(u_textures[1], ray.zx); }
	if(dim == -3){ return texture2D(u_textures[2], ray.xy); }
	return texture2D(u_textures[3], ray.yx);
}

vec4 cast_vec(vec4 o, vec4 v, float range){
	// Starting from the player, we find the nearest horizontal
	// and vertical gridlines. We move to whichever is closer and
	// check for a wall (inspect). Then we repeat until we've
	// traced the entire length of the ray.

	int sx, sy, sz, sw;
	int mx, my, mz, mw;
	int dim, value;
	float distance = 0.0;

	v = normalize(v);

	// Inverting the elements of a normalized vector
	// gives the distance you have to move along that
	// vector to hit a cell boundary perpendicular
	// to that dimension.
	vec4 deltas = abs(vec4(1.0/v.x, 1.0/v.y, 1.0/v.z, 1.0/v.w));

	float xdist = cast_comp(v.xyzw, o.x, sx, mx);
	float ydist = cast_comp(v.yxzw, o.y, sy, my);
	float zdist = cast_comp(v.zxyw, o.z, sz, mz);
	float wdist = cast_comp(v.wxyz, o.w, sw, mw);

	// while loops are not allowed, so we have to use
	// a for loop with a fixed max number of iterations
	for(int i = 0; i < 1000; i++){
		// Find the next closest cell boundary
		// and increment distances appropriately
		if(xdist <= ydist && xdist <= zdist && xdist <= wdist){
			dim = 1*sx;
			mx += sx;
			distance = xdist;
			xdist += deltas.x;
		}else if(ydist <= xdist && ydist <= zdist && ydist <= wdist){
			dim = 2*sy;
			my += sy;
			distance = ydist;
			ydist += deltas.y;
		}else if(zdist <= xdist && zdist <= ydist && zdist <= wdist){
			dim = 3*sz;
			mz += sz;
			distance = zdist;
			zdist += deltas.z;
		}else{
			dim = 4*sw;
			mw += sw;
			distance = wdist;
			wdist += deltas.w;
		}

		value = get_cell(mx, my, mz, mw);
		if(value > 0 || distance >= range){
			break;
		}
	}

	vec4 ray = o + distance *  v;
	vec4 tex = calc_tex(dim, ray);

	float alpha = 1.0 - distance/range;
	return vec4(tex.rgb, alpha);
}

void main(){
	// convert clipspace to viewing angles
	vec2 coords = gl_FragCoord.xy / u_resolution - 0.5;
	vec2 angles = atan(u_scale * coords);
	vec4 hray = u_fwd*cos(angles.x) + u_rgt*sin(angles.x);
	vec4 vray = u_fwd*cos(angles.y) + u_up*sin(angles.y);

	gl_FragColor = cast_vec(u_origin, hray+vray, 10.0);
}
