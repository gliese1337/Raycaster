precision mediump float;

const int SIZE = 5;
const int SIZE2 = SIZE*SIZE;
const int SIZE3 = SIZE*SIZE2;
const int SIZE4 = SIZE*SIZE3;

uniform float u_depth;
uniform vec2 u_resolution;
uniform vec4 u_origin;
uniform vec4 u_rgt;
uniform vec4 u_up;
uniform vec4 u_fwd;
uniform vec4 u_ana;

uniform vec3 u_seed;

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

const vec4 black = vec4(0.0,0.0,0.0,1.0);
const vec4 grey = vec4(0.1,0.1,0.1,1.0);
const vec4 red = vec4(0.06,0.02,0.02,1.0);
const vec4 green = vec4(0.02,0.06,0.02,1.0);
const vec4 blue = vec4(0.02,0.02,0.06,1.0);
const vec4 yellow = vec4(0.0416,0.0416,0.02,1.0);

vec4 permute(vec4 x){
     return mod(((x*34.0)+1.0)*x, 289.0);
}

vec4 taylorInvSqrt(vec4 r){
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v){
	const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
	const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

	// First corner
	vec3 i  = floor(v + dot(v, C.yyy) );
	vec3 x0 =   v - i + dot(i, C.xxx) ;

	// Other corners
	vec3 g = step(x0.yzx, x0.xyz);
	vec3 l = 1.0 - g;
	vec3 i1 = min( g.xyz, l.zxy );
	vec3 i2 = max( g.xyz, l.zxy );

	vec3 x1 = x0 - i1 + C.xxx;
	vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
	vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

	// Permutations
	i = mod(i,289.0);
	vec4 p = permute( permute( permute(
			 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
		   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
		   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

	// Gradients: 7x7 points over a square, mapped onto an octahedron.
	// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
	float n_ = 0.142857142857; // 1.0/7.0
	vec3  ns = n_ * D.wyz - D.xzx;

	vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

	vec4 x_ = floor(j * ns.z);
	vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

	vec4 x = x_ *ns.x + ns.yyyy;
	vec4 y = y_ *ns.x + ns.yyyy;
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
	vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
	p0 *= norm.x;
	p1 *= norm.y;
	p2 *= norm.z;
	p3 *= norm.w;

	// Mix final noise value
	vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
	m = m * m;
	return 40.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

float layered_noise(vec3 v, int base, int octaves){
	float acc = 0.0;
	v *= pow(2.0, float(base));
	for(int i = 1; i <= 16; i++){
		if(i > octaves) break; //loops can't use non-constant expressions
		acc += snoise(v);
		v *= 2.0;
	}
	return acc / float(octaves);
}

float julia(vec3 v) {
	const int iter = 10;

	v = v*2.0 - 1.0;
	for(int i = 0; i < iter; i++){
		float x = (v.x*v.x - v.y*v.y - v.z*v.z) + u_seed.x;
		float y = (2.0*v.x*v.y) + u_seed.y;
		float z = (2.0*v.x*v.z) + u_seed.z;

		if((x * x + y * y + z * z) > 4.0){
			return float(i) / float(iter);
		}

		v.x = x;
		v.y = y;
		v.z = z;
	}

	return 0.0;
}

vec4 hsv2rgba(float h, float s, float v){
	if(s == 0.0){
		return vec4(v,v,v,1.0);
	}

	h = mod(h * 6.0, 6.0);
	float region = floor(h);
	float rem = fract(h);
	float p = v * (1.0 - s);
	float t = v * (1.0 - s*rem);
	float q = v * (1.0 - s*(1.0 - rem));

	float r, g, b;
	if     (region == 0.0) { r = v; g = q; b = p; }
	else if(region == 1.0) { r = t; g = v; b = p; }
	else if(region == 2.0) { r = p; g = v; b = q; }
	else if(region == 3.0) { r = p; g = t; b = v; }
	else if(region == 4.0) { r = q; g = p; b = v; }
	else                   { r = v; g = p; b = t; }

	return vec4(r,g,b,1.0);
}

vec4 calc_tex(int dim, vec4 ray){
	ray = fract(ray);
	vec3 coords;
	vec4 tint;

	if(dim == 1 || dim == -1){
		coords = ray.yzw;
		tint = red;
	}
	else if(dim == 2 || dim == -2){
		coords = ray.xzw;
		tint = green;
	}
	else if(dim == 3 || dim == -3){
		coords = ray.xyw;
		tint = blue;
	}
	else if(dim == 4 || dim == -4){
		coords = ray.xyz;
		tint = yellow;
	}

	float h = julia(coords);
	vec4 base = h == 0.0 ? grey : hsv2rgba(h, 1.0, 1.0);
	return mix(tint, base, layered_noise(coords, 2, 5));
}

vec4 cast_vec(vec4 o, vec4 v, float range){
	// Starting from the player, we find the nearest gridlines
	// in each dimension. We move to whichever is closer and
	// check for a wall (inspect). Then we repeat until we've
	// traced the entire length of the ray.

	v = normalize(v);

	// Inverting the elements of a normalized vector
	// gives the distance you have to move along that
	// vector to hit a cell boundary perpendicular
	// to that dimension.
	vec4 deltas = abs(vec4(1.0/v.x, 1.0/v.y, 1.0/v.z, 1.0/v.w));

	int sx, sy, sz, sw;
	int mx, my, mz, mw;
	float xdist = cast_comp(v.xyzw, o.x, sx, mx);
	float ydist = cast_comp(v.yxzw, o.y, sy, my);
	float zdist = cast_comp(v.zxyw, o.z, sz, mz);
	float wdist = cast_comp(v.wxyz, o.w, sw, mw);

	// while loops are not allowed, so we have to use
	// a for loop with a fixed max number of iterations

	int dim, value;
	float inc, distance;

	float blue = 0.0;
	float yellow = 0.0;

	for(int i = 0; i < 1000; i++){
		// Find the next closest cell boundary
		// and increment distances appropriately
		if(xdist <= ydist && xdist <= zdist && xdist <= wdist){
			dim = 1*sx;
			mx += sx;
			inc = xdist - distance;
			distance = xdist;
			xdist += deltas.x;
		}else if(ydist <= xdist && ydist <= zdist && ydist <= wdist){
			dim = 2*sy;
			my += sy;
			inc = ydist - distance;
			distance = ydist;
			ydist += deltas.y;
		}else if(zdist <= xdist && zdist <= ydist && zdist <= wdist){
			dim = 3*sz;
			mz += sz;
			inc = zdist - distance;
			distance = zdist;
			zdist += deltas.z;
		}else{
			dim = 4*sw;
			mw += sw;
			inc = wdist - distance;
			distance = wdist;
			wdist += deltas.w;
		}

		value = get_cell(mx, my, mz, mw);
		if(value == 1){
			blue += inc;
		}else if(value == 2){
			yellow += inc;
		}

		if(value == 255 || distance >= range){
			break;
		}
	}

	vec4 tex;
	if(value == 0){
		tex = vec4(1,1,1,1);
	}else{
		vec4 ray = o + distance *  v;
		tex = calc_tex(dim, ray);
	}

	float clear = distance - yellow - blue;

	clear /= distance;
	yellow /= distance;
	blue /= distance;

	tex = tex*clear
		+ vec4(0.71,0.71,0.0,0.0)*yellow
		+ vec4(0.0,0.0,1.0,0.0)*blue;

	float dr = distance/range;
	float alpha = 1.0 - dr*dr*dr*dr;
	return vec4(tex.rgb, alpha);
}

void main(){
	vec4 cell = floor(u_origin);
	if(get_cell(int(cell.x), int(cell.y), int(cell.z), int(cell.w)) == 255){
		gl_FragColor = vec4(0,0,0,1);
		return;
	}
	vec2 coords = gl_FragCoord.xy - (u_resolution / 2.0);
	vec4 zoffset = u_fwd*u_depth;
	vec4 ray = zoffset + u_rgt*coords.x + u_up*coords.y;
	gl_FragColor = cast_vec(u_origin, ray, 10.0);
}
