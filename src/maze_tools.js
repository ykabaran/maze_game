const MazeTools = (() => {

	class MazeToolsClass {

		constructor(){
			this.NUM_DIRS = 2;
			this.DIR_HORIZONTAL = 0;
			this.DIR_VERTICAL = 1;
		}

		newMaze(rows, cols){
			return new Maze(rows, cols);
		}

		isWallVertical(wall){
			return wall.dir === this.DIR_VERTICAL;
		}

	}

	const MazeTools = new MazeToolsClass();

	class Maze {

		constructor(rows, cols){
			this.rows = rows;
			this.cols = cols;

			this.cells = Array(this.rows);
			for(let i=0; i<this.rows; i++){
				this.cells[i] = Array(this.cols);
				for(let j=0; j<this.cols; j++){
					this.cells[i][j] = { x: j, y: i, walls: [] };
				}
			}

			this.walls = Array(this.rows + 1);
			for(let i=0; i<=this.rows; i++){
				this.walls[i] = Array(this.cols + 1);
				for(let j=0; j<=this.cols; j++){
					this.walls[i][j] = Array(2);

					const wallDirs = [];
					if(i<this.rows){ wallDirs.push(MazeTools.DIR_VERTICAL); }
					if(j<this.cols){ wallDirs.push(MazeTools.DIR_HORIZONTAL); }

					wallDirs.forEach(dir => {
						const newWall = { x: j, y: i, dir, cells: [] };
						if(i<this.rows && j < this.cols){ newWall.cells.push(this.cells[i][j]); }
						if(dir === MazeTools.DIR_VERTICAL && j > 0){ newWall.cells.push(this.cells[i][j - 1]); }
						if(dir === MazeTools.DIR_HORIZONTAL && i > 0){ newWall.cells.push(this.cells[i - 1][j]); }
						this.walls[i][j][dir] = newWall;
					});
				}
			}
			for(let i=0; i<=this.rows; i++){
				for(let j=0; j<=this.cols; j++){
					for(let k=0; k<MazeTools.NUM_DIRS; k++){
						const wall = this.walls[i][j][k];
						if(!wall){ continue; }
						wall.cells.forEach(cell => { cell.walls.push(wall); })
					}
				}
			}
		}

		getWallBetween(cell1, cell2){
			const distance = VectorTools.manhattanDistance(cell2, cell1);
			if(distance !== 1){ return null; }
			const isVertical = (cell2.x - cell1.x) !== 0;
			const wall = isVertical 
				? this.walls[cell1.y]?.[Math.max(cell1.x, cell2.x)]?.[MazeTools.DIR_VERTICAL]
				: this.walls[Math.max(cell1.y, cell2.y)]?.[cell1.x]?.[MazeTools.DIR_HORIZONTAL];
			return wall || null;
		}

		canPassBetween(cell1, cell2){
			const wall = this.getWallBetween(cell1, cell2);
			if(!wall || !wall.hidden){ return false; }
			return true;
		}

		forEachWall(fn, filter){
			for(let i=0; i<=this.rows; i++){
				for(let j=0; j<=this.cols; j++){
					for(let k=0; k<MazeTools.NUM_DIRS; k++){
						const wall = this.walls[i][j][k];
						if(!wall){ continue; }
						if(filter && !filter(wall)){ continue; }
						fn(wall);
					}
				}
			}
		}

		randomize(){
			this.forEachWall(wall => {
				wall.hidden = false; 
			});

			const visited = Array(this.rows);
			for(let i=0; i<this.rows; i++){
				visited[i] = Array(this.cols).fill(false);
			}

			const wallsToProcess = [];
			const visitCell = cell => {
				visited[cell.y][cell.x] = true;
				wallsToProcess.push(...cell.walls);
			};

			visitCell(this.cells[Math.floor(Math.random() * this.rows)][Math.floor(Math.random() * this.cols)]);
			while(wallsToProcess.length){
				const numWallsToProcess = wallsToProcess.length;

				const randomIndex = Math.floor(Math.random() * numWallsToProcess);
				const wall = wallsToProcess[randomIndex];
				wallsToProcess[randomIndex] = wallsToProcess[numWallsToProcess - 1];
				wallsToProcess.pop();

				const nonVisitedCells = wall.cells.filter(cell => !visited[cell.y][cell.x]);
				const numVisited = wall.cells.length - nonVisitedCells.length;
				if(wall.cells.length < 2 || numVisited !== 1){ continue; }

				wall.hidden = true;
				nonVisitedCells.forEach(visitCell);
			}
		}
	}

	return MazeTools;

})();
