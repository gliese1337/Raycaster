var Maze = (function() {

	function rand(n) {
		return Math.floor(Math.random() * n);
	}

	function randomDirections() {
		var i, j, list, tmp;
		list = ['N', 'S', 'E', 'W'];
		for (i = 0; i < 4; i++) {
		  j = i + rand(4 - i);
		  tmp = list[j]
		  list[j] = list[i]
		  list[i] = tmp;
		}
		return list;
	};
	
	function Maze(width, height) {
		var i, x, y, nx, ny,
			grid, row,
			cell, cells,
			index, dirs;

		grid = [];
		for (y = 0; y < height * 2; y++) {
			row = [];
			for (x = 0; x < width * 2; x++) { row.push(1); }
			grid.push(row);
		}

		nx = rand(width - 1) * 2 + 1;
		ny = rand(height - 1) * 2 + 1;
		grid[ny][nx] = 0;
		cells = [{x:nx,y:ny}];

		while (cells.length > 0) {
			index = Math.random() < .5 ? rand(cells.length) : cells.length - 1;
			cell = cells[index];
			dirs = randomDirections();
			loop: for (i = 0; i < 4; i++) {
				switch(dirs[i]){
				case 'N':
					nx = cell.x;
					ny = (cell.y - 2 + height*2)%(height*2);
					if (grid[ny][nx] === 1) {
						grid[(ny + 1)%(height*2)][nx] = 0;
						break loop;
					}
					break;
				case 'S':
					nx = cell.x;
					ny = (cell.y + 2)%(height*2);
					if (grid[ny][nx] === 1) {
						grid[(ny - 1 + height*2)%(height*2)][nx] = 0;
						break loop;
					}
					break;
				case 'E':
					nx = (cell.x + 2)%(width*2);
					ny = cell.y;
					if (grid[ny][nx] === 1) {
						grid[ny][(nx - 1 + width*2)%(width*2)] = 0;
						break loop;
					}
					break;
				case 'W':
					nx = (cell.x - 2 + width*2)%(width*2);
					ny = cell.y;
					if (grid[ny][nx] === 1) {
						grid[cell.y][(nx + 1)%(width*2)] = 0;
						break loop;
					}
					break;
				}
			}
			if(i === 4){ cells.splice(index, 1); }
			else{
				grid[ny][nx] = 0;
				cells.push({ x: nx, y: ny });
			}
		}
		grid[rand(height - 1)*2 + 1][0] = 0;
		return grid;
	}
	
	Maze.print = function(grid, height, width){
		var str = "\n";
		for(y = 0; y < height * 2; y++){
			for(x = 0; x < width * 2; x++){
				str += grid[y][x] ? '#' : '+';
			}
			str += '\n';
		}
		return str;
	};
	
	return Maze;
})();