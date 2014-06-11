var Maze = (function() {

	function rand(n) {
		return Math.floor(Math.random() * n);
	}

	function randomDirections() {
		var i, j, list, tmp;
		list = ['N', 'S', 'E', 'W', 'U', 'D'];
		for (i = 0; i < 6; i++) {
		  j = i + rand(6 - i);
		  tmp = list[j]
		  list[j] = list[i]
		  list[i] = tmp;
		}
		return list;
	};
	
	function Maze(width, height, depth) {
		var i, x, y, z, nx, ny, nz,
			grid, level, row,
			cell, cells,
			index, dirs;

		grid = [];
		for (z = 0; z < depth * 2; z++){
			level = [];
			for (y = 0; y < height * 2; y++) {
				row = [];
				for (x = 0; x < width * 2; x++) { row.push(1); }
				level.push(row);
			}
			grid.push(level);
		}

		nx = rand(width - 1) * 2 + 1;
		ny = rand(height - 1) * 2 + 1;
		nz = rand(depth - 1) * 2 + 1;
		grid[nz][ny][nx] = 0;
		cells = [{x:nx,y:ny,z:nz}];

		while (cells.length > 0) {
			index = Math.random() < .5 ? rand(cells.length) : cells.length - 1;
			cell = cells[index];
			dirs = randomDirections();
			loop: for (i = 0; i < 6; i++) {
				switch(dirs[i]){
				case 'N':
					nx = cell.x;
					ny = (cell.y - 2 + height*2)%(height*2);
					nz = cell.z;
					if (grid[nz][ny][nx] === 1) {
						grid[nz][(ny + 1)%(height*2)][nx] = 0;
						break loop;
					}
					break;
				case 'S':
					nx = cell.x;
					ny = (cell.y + 2)%(height*2);
					nz = cell.z;
					if (grid[nz][ny][nx] === 1) {
						grid[nz][(ny - 1 + height*2)%(height*2)][nx] = 0;
						break loop;
					}
					break;
				case 'E':
					nx = (cell.x + 2)%(width*2);
					ny = cell.y;
					nz = cell.z;
					if (grid[nz][ny][nx] === 1) {
						grid[nz][ny][(nx - 1 + width*2)%(width*2)] = 0;
						break loop;
					}
					break;
				case 'W':
					nx = (cell.x - 2 + width*2)%(width*2);
					ny = cell.y;
					nz = cell.z;
					if (grid[nz][ny][nx] === 1) {
						grid[nz][ny][(nx + 1)%(width*2)] = 0;
						break loop;
					}
					break;
				case 'U':
					nx = cell.x;
					ny = cell.y;
					nz = (cell.z + 2)%(depth*2);
					if (grid[nz][ny][nx] === 1) {
						grid[(nz - 1 + depth*2)%(depth*2)][ny][nx] = 0;
						break loop;
					}
					break;
				case 'D':
					nx = cell.x
					ny = cell.y;
					nz = (cell.z - 2 + depth*2)%(depth*2);;
					if (grid[nz][ny][nx] === 1) {
						grid[(nz + 1)%(depth*2)][ny][nx] = 0;
						break loop;
					}
					break;
				}
			}
			if(i === 6){ cells.splice(index, 1); }
			else{
				grid[nz][ny][nx] = 0;
				cells.push({ x: nx, y: ny, z: nz });
			}
		}
		grid[rand(depth - 1)*2 + 1][rand(height - 1)*2 + 1][0] = 0;
		return grid;
	}
	
	return Maze;
})();