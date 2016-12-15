var Maze = (function(){

	function rand(n){
		return Math.floor(Math.random() * n);
	}

	function pick(list){
		return list[rand(list.length)];
	};
		
	function generate(xsize, ysize, zsize){
		var i, x, y, z, nx, ny, nz,
			grid, ylevel, xlevel,
			cell, cells, index, dirs, safe;

		
		function isSafe(x, y, z){
			return 6 == (grid[z][y][x] +
					grid[z][y][(x+1)%xsize] +
					grid[z][y][(x+xsize-1)%xsize] +
					grid[z][(y+1)%ysize][x] +
					grid[z][(y+ysize-1)%ysize][x] +
					grid[(z+1)%zsize][y][x] +
					grid[(z+zsize-1)%zsize][y][x]);				
		}

		console.log("Generating Grid");
		grid = [];
		for (z = 0; z < zsize; z++){
			ylevel = [];
			for (y = 0; y < ysize; y++) {
				xlevel = [];
				for (x = 0; x < xsize; x++) { xlevel.push(1); }
				ylevel.push(xlevel);
			}
			grid.push(ylevel);
		}
		
		console.log("Generating Maze");
		nx = rand(xsize);
		ny = rand(ysize);
		nz = rand(zsize);
		grid[nz][ny][nx] = 0;
		cells = [{x:nx,y:ny,z:nz}];

		while (cells.length > 0) {
			//Grab a random empty cell
			index = Math.random() < .5 ? rand(cells.length) : cells.length - 1;
			cell = cells[index];
			
			nx = cell.x;
			ny = cell.y;
			nz = cell.z;
			
			//Check if there are any directions in which we can carve out a space
			//without running into another empty cell, which would create a cycle
			safe = [];

			if(isSafe((nx+1)%xsize, ny, nz)){ safe.push("R"); }
			if(isSafe((nx+xsize-1)%xsize, ny, nz)){ safe.push("L"); }
			
			if(isSafe(nx, (ny+1)%ysize, nz)){ safe.push("U"); }
			if(isSafe(nx, (ny+ysize-1)%ysize, nz)){ safe.push("D"); }
			
			if(isSafe(nx, ny, (nz+1)%zsize)){ safe.push("F"); }
			if(isSafe(nx, ny, (nz+zsize-1)%zsize)){ safe.push("B"); }

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
				}

				grid[nz][ny][nx] = 0;
				cells.push({ x: nx, y: ny, z: nz });
			}
		}
		
		console.log("Completed Maze");
		return grid;
	}
	
	function Maze(size){
		this.size = size;
		this.grid = generate(size,size,size);
	}
	
	Maze.prototype.get = function(x,y,z){
		return this.grid[z][y][x];
	}
	
	Maze.prototype.flatten = function(){
		var i = 0,
			x, y, z,
			size = this.size,
			wallgrid = [];

		for(x = 0; x < size; x++)
		for(y = 0; y < size; y++)
		for(z = 0; z < size; z++)
			wallgrid[i++] = this.grid[z][y][x];
		
		return wallgrid;
	}
	
	return Maze;
})();