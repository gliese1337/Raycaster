var Maze = (function(){

	function rand(n){
		return Math.floor(Math.random() * n);
	}

	function pick(list){
		return list[rand(list.length)];
	};
		
	function generate(xsize, ysize, zsize, wsize) {
		var i, x, y, z, w, nx, ny, nz, nw,
			grid, zlevel, ylevel, xlevel,
			cell, cells, index, dirs, safe;

		
		function isSafe(x, y, z, w){
			return 8 == (
				(grid[w][z][y][x] == 3 ? 1 : 0) +
				(grid[w][z][y][(x+1)%xsize] == 3 ? 1 : 0) +
				(grid[w][z][y][(x+xsize-1)%xsize] == 3 ? 1 : 0) +
				(grid[w][z][(y+1)%ysize][x] == 3 ? 1 : 0) +
				(grid[w][z][(y+ysize-1)%ysize][x] == 3 ? 1 : 0) +
				(grid[w][(z+1)%zsize][y][x] == 3 ? 1 : 0) +
				(grid[w][(z+zsize-1)%zsize][y][x] == 3 ? 1 : 0) +
				(grid[(w+1)%wsize][z][y][x] == 3 ? 1 : 0) +
				(grid[(w+wsize-1)%wsize][z][y][x] == 3 ? 1 : 0)
			);				
		}

		console.log("Generating Grid");
		grid = [];
		for(w = 0; w < wsize; w++){
			zlevel = []
			for (z = 0; z < zsize; z++){
				ylevel = [];
				for (y = 0; y < ysize; y++) {
					xlevel = [];
					for (x = 0; x < xsize; x++) { xlevel.push(3); }
					ylevel.push(xlevel);
				}
				zlevel.push(ylevel)
			}
			grid.push(zlevel);
		}
		
		console.log("Generating Maze");
		nx = rand(xsize);
		ny = rand(ysize);
		nz = rand(zsize);
		nw = rand(wsize);
		grid[nw][nz][ny][nx] = 0;
		cells = [{x:nx,y:ny,z:nz,w:nw}];

		while (cells.length > 0) {
			//Grab a random empty cell
			index = Math.random() < .5 ? rand(cells.length) : cells.length - 1;
			cell = cells[index];
			
			nx = cell.x;
			ny = cell.y;
			nz = cell.z;
			nw = cell.w;
			
			//Check if there are any directions in which we can carve out a space
			//without running into another empty cell, which would create a cycle
			safe = [];

			if(isSafe((nx+1)%xsize, ny, nz, nw)){ safe.push("R"); }
			if(isSafe((nx+xsize-1)%xsize, ny, nz, nw)){ safe.push("L"); }
			
			if(isSafe(nx, (ny+1)%ysize, nz, nw)){ safe.push("U"); }
			if(isSafe(nx, (ny+ysize-1)%ysize, nz, nw)){ safe.push("D"); }
			
			if(isSafe(nx, ny, (nz+1)%zsize, nw)){ safe.push("F"); }
			if(isSafe(nx, ny, (nz+zsize-1)%zsize, nw)){ safe.push("B"); }
			
			if(isSafe(nx, ny, nz, (nw+1)%wsize)){ safe.push("A"); }
			if(isSafe(nx, ny, nz, (nw+wsize-1)%wsize)){ safe.push("K"); }
			
			if(safe.length == 0){
				cells.splice(index, 1);
			}else{
				//Pick a random direction & carve it out
				switch(pick(safe)){
				case 'R': nx = (nx + 1) % xsize;
					break;
				case 'L': nx = (nx - 1 + xsize) % xsize;
					break;
				case 'U': ny = (ny + 1) % ysize;
					break;
				case 'D': ny = (ny - 1 + ysize) % ysize;
					break;
				case 'F': nz = (nz + 1) % zsize;
					break;
				case 'B': nz = (nz - 1 + zsize) % zsize;
					break;
				case 'A': nw = (nw + 1) % wsize;
					break;
				case 'K': nw = (nw - 1 + wsize) % wsize;
					break;
				}

				grid[nw][nz][ny][nx] = rand(3);
				cells.push({ x: nx, y: ny, z: nz, w: nw });
			}
		}
		
		console.log("Completed Maze");
		return grid;
	}
	
	function Maze(size){
		this.size = size;
		this.grid = generate(size,size,size,size);
	}
	
	Maze.prototype.get = function(x,y,z,w){
		return this.grid[w][z][y][x];
	}
	
	Maze.prototype.flatten = function(){
		var i = 0,
			x, y, z, w,
			size = this.size,
			wallgrid = [];

		for(x = 0; x < size; x++)
		for(y = 0; y < size; y++)
		for(z = 0; z < size; z++)
		for(w = 0; w < size; w++)
			wallgrid[i++] = this.grid[w][z][y][x];
		
		return wallgrid;
	}
	
	return Maze;
})();