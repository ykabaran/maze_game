class MazeGame {

	constructor(){
		this.updateLooping = false;

		this.playerColors = ['rgb(255,30,120)','rgb(120,255,30)','rgb(255,120,20)','rgb(120,255,255)'];
		this.detailResolution = 10;
		this.maxRenderResolution = 1000;
		this.wallWidth = 0.1;
		this.gridPadding = 0.4;
		this.playerFloorOpacity = 0.25;

		this.gridCols = 20;
		this.gridRows = 14;
		this.playerSize = 0.65;
		this.numPlayers = 1;
		this.numTargets = 10;

		this.wallColorMap = new DynamicColorMap(this);

		this.players = [];
		this.targets = [];

		this.gameTime = 0;
		this.frameLimit = 30;
		this.lastFrameTime = 0;

		this.maze = MazeTools.newMaze(this.gridRows, this.gridCols);
		this.maze.randomize();

		this.windowResizeListener = () => {
			this.onWindowResized();
		};

		this.templateCache = {};
		this.controllers = [];
	}

	renderTemplate(name, data){
		let templateString = this.templateCache[name];
		if(!templateString){
			templateString = document.getElementById(`template_${name}`)?.innerHTML || `missing_template_${name}`;
			this.templateCache[name] = templateString;
		}
		if(!data){ return templateString; }
		for(const key in data){
			templateString = templateString.replaceAll(`{{${key}}}`, data[key]);
		}
		return templateString;
	}

	create(parentElem){
		const dummyElem = document.createElement("div");
		dummyElem.innerHTML = this.renderTemplate("game");

		this.rootElem = dummyElem.children[0];
		this.canvasElem = this.rootElem.children[0];
		this.canvasElem.classList.add("game");
		this.canvasContext = this.canvasElem.getContext("2d");

		this.hudElem = this.rootElem.querySelector(".hud");
		for(let i=0; i<this.numPlayers; i++){
			this.players.push(this.makePlayer(i));
			this.controllers.push(this.makeController(i));
			this.hudElem.innerHTML += this.renderTemplate("player_score_container", { playerNum: i });
		}
		this.playerScoreElems = this.rootElem.querySelectorAll(".hud .player_score");

		for(let i=0; i<this.numTargets; i++){
			this.targets.push(this.makeTarget());
		}
		
		parentElem.appendChild(this.rootElem);

		requestAnimationFrame(this.windowResizeListener);
		window.addEventListener("resize", this.windowResizeListener);

		console.log("created");
		return this.rootElem;
	}

	makePlayer(num){
		let position = (() => {
			switch(num){
				case 0: return { x: 0, y: 0 };
				case 1: return { x: this.gridCols - 1, y: 0 };
				case 2: return { x: 0, y: this.gridRows - 1 };
				case 3: return { x: this.gridCols - 1, y: this.gridRows - 1 };
			}
		})();

		return {
			num,
			position,
			offset: { x: 0, y: 0 },
			size: 0.65,
			rotation: 0,
			color: this.playerColors[num],
			score: 0
		};
	}

	makeController(num){
		let keyMap = (() => {
			switch(num){
				case 0: return { up: "w", left: "a", down: "s", right: "d" };
				case 1: return { up: "ArrowUp", left: "ArrowLeft", down: "ArrowDown", right: "ArrowRight" };
				case 2: return { up: "t", left: "f", down: "g", right: "h" };
				case 3: return { up: "i", left: "j", down: "k", right: "l" };
			}
		})();

		const player = this.players[num];
		const controller = new SmoothPlayerController(this, player, keyMap);
		player.controller = controller;

		return controller;
	}

	makeTarget(){
		let position = {
			x: Math.floor(Math.random() * (this.gridCols - 1)),
			y: Math.floor(Math.random() * (this.gridRows - 1))
		};
		return {
			position,
			color: 'rgba(0,255,0,0.5)'
		};
	}

	onWindowResized(){
		this.baseResolutionWidth = Math.round((this.gridCols + 2) * this.detailResolution);
		this.baseResolutionHeight = Math.round((this.gridRows + 2) * this.detailResolution);
		const maxRenderResolutionMultiplier = Math.max(this.baseResolutionWidth/this.maxRenderResolution, this.baseResolutionHeight/this.maxRenderResolution);
		if(maxRenderResolutionMultiplier > 1){
			this.baseResolutionWidth /= Math.floor(maxRenderResolutionMultiplier);
			this.baseResolutionHeight /= Math.floor(maxRenderResolutionMultiplier);
		}

		const screenBoundingRect = this.rootElem.getBoundingClientRect();
		this.screenWidth = Math.floor(screenBoundingRect.width);
		this.screenHeight = Math.floor(screenBoundingRect.height);

		this.displayScale = Math.min(this.screenWidth / this.baseResolutionWidth, this.screenHeight / this.baseResolutionHeight);
		this.gridDisplayWidth = Math.floor(this.displayScale * this.baseResolutionWidth);
		this.gridDisplayHeight = Math.floor(this.displayScale * this.baseResolutionHeight);

		this.gridSize = Math.min(this.baseResolutionWidth/(this.gridCols + 2 * this.gridPadding), this.baseResolutionHeight/(this.gridRows + 2 * this.gridPadding));
		this.gridOffset = { x: Math.floor((this.baseResolutionWidth - (this.gridCols * this.gridSize))/2), y: Math.floor((this.baseResolutionHeight - (this.gridRows * this.gridSize))/2) };

		this.canvasElem.width = this.gridDisplayWidth;
		this.canvasElem.height = this.gridDisplayHeight;
		this.canvasElem.style.marginLeft = Math.floor((this.screenWidth - this.gridDisplayWidth) / 2) + "px";
		this.canvasElem.style.marginTop = Math.floor((this.screenHeight - this.gridDisplayHeight) / 2) + "px";

		this.lastFrameTime = 0;
		this.recalculateWallMap();
	}

	start(){
		this.startUpdateLoop();
		this.checkTargetCollisions();
		this.updateHud();

		this.controllers.forEach(controller => {
			controller.attach();
		});
		console.log("started");
	}

	startUpdateLoop(){
		if(this.updateLooping){ return; }
		this.updateLooping = true;
		
		const requestNextUpdate = () => {
			requestAnimationFrame(() => {
				if(!this.updateLooping){ return; }
				this.update();
				requestNextUpdate();
			});
		};
		requestNextUpdate();
	}

	stopUpdateLoop(){
		this.updateLooping = false;
	}

	getWallBounds(wall){
		const isVertical = MazeTools.isWallVertical(wall);
		return {
			x: this.gridOffset.x + (wall.x - this.wallWidth / 2) * this.gridSize,
			y: this.gridOffset.y + (wall.y - this.wallWidth / 2) * this.gridSize,
			w: this.wallWidth * this.gridSize + (isVertical ? 0 : this.gridSize),
			h: this.wallWidth * this.gridSize + (isVertical ? this.gridSize : 0)
		};
	}

	getCellBounds(cell){
		return {
			x: this.gridOffset.x + cell.x * this.gridSize,
			y: this.gridOffset.y + cell.y * this.gridSize,
			w: this.gridSize,
			h: this.gridSize
		};
	}

	getPlayerBounds(player){
		const playerPos = VectorTools.add(this.gridOffset, VectorTools.multiply(VectorTools.add(VectorTools.add(player.position, player.offset), { x: 0.5, y: 0.5 }), this.gridSize));
		return {
			x: playerPos.x,
			y: playerPos.y,
			r: player.size * this.gridSize / 2
		};
	}

	recalculateWallMap(){
		const canvas = document.createElement("canvas");
		canvas.width = this.baseResolutionWidth;
		canvas.height = this.baseResolutionHeight;

		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "rgb(255,255,255)";
		ctx.fillRect(0, 0, this.baseResolutionWidth, this.baseResolutionHeight);

		ctx.fillStyle = "#000000";
		this.maze.forEachWall(wall => {
			if(wall.hidden){ return; }

			const wallBounds = this.getWallBounds(wall);
			ctx.fillRect(wallBounds.x, wallBounds.y, wallBounds.w, wallBounds.h);
		});

		const canvasColors = ctx.getImageData(0, 0, this.baseResolutionWidth, this.baseResolutionHeight).data;
		const wallMap = Array(this.baseResolutionHeight);
		for(let i=0; i<this.baseResolutionHeight; i++){
			wallMap[i] = Array(this.baseResolutionWidth);
			for(let j=0; j<this.baseResolutionWidth; j++){
				const ind = ((i * this.baseResolutionWidth) + j) * 4;
				wallMap[i][j] = canvasColors[ind] < 128 || canvasColors[ind + 1] < 128 || canvasColors[ind + 2] < 128;
			}
		}
		this.wallCanvas = canvas;
		this.wallMap = wallMap;
	}

	isWall(pos){
		pos = {
			x: Math.round(this.gridOffset.x + (pos.x * this.gridSize)),
			y: Math.round(this.gridOffset.y + (pos.y * this.gridSize))
		};
		return pos.x < 0 || pos.x >= this.baseResolutionWidth || pos.y < 0 || pos.y >= this.baseResolutionHeight || this.wallMap[pos.y][pos.x];
	}

	drawWall(wall){
		if(wall.hidden){ return; }

		const wallBounds = this.getWallBounds(wall);
		const wallColor = this.wallColorMap.getColor(wallBounds.x + wallBounds.w/2, wallBounds.y + wallBounds.h/2);

		this.canvasContext.fillStyle = wallColor;
		this.canvasContext.fillRect(wallBounds.x, wallBounds.y, wallBounds.w, wallBounds.h);
	}

	onPlayerMoved(player){
		this.checkTargetCollisions();
	}

	drawPlayer(player){
		const offsetSize = Math.min(1, VectorTools.magnitude(player.offset));
		const offsetOpacity = 2*(offsetSize-0.5);
		const floor2Pos = { x: Math.round(player.position.x + player.offset.x), y: Math.round(player.position.y + player.offset.y) };

		this.canvasContext.fillStyle = player.color;

		this.canvasContext.save();
		this.canvasContext.globalAlpha = this.playerFloorOpacity * (1 - (offsetSize > 0.5 ? offsetOpacity : 0));
		const floor1Bounds = this.getCellBounds(player.position);
		this.canvasContext.fillRect(floor1Bounds.x, floor1Bounds.y, floor1Bounds.w, floor1Bounds.h);

		if(offsetSize > 0.5 && (floor2Pos.x !== player.position.x || floor2Pos.y !== player.position.y)){
			const floor2Bounds = this.getCellBounds(floor2Pos);
			this.canvasContext.globalAlpha = this.playerFloorOpacity * offsetOpacity;
			this.canvasContext.fillRect(floor2Bounds.x, floor2Bounds.y, floor2Bounds.w, floor2Bounds.h);
		}
		this.canvasContext.restore();

		const playerBounds = this.getPlayerBounds(player);

		this.canvasContext.beginPath();
    this.canvasContext.arc(playerBounds.x, playerBounds.y, playerBounds.r, 0, 2 * Math.PI);
    this.canvasContext.fill();
	}

	drawTarget(target){
		const cellBounds = this.getCellBounds(target.position);

		this.canvasContext.fillStyle = target.color;
		this.canvasContext.fillRect(cellBounds.x, cellBounds.y, cellBounds.w, cellBounds.h);
	}

	update(){
		const now = Date.now();
		const timeDiff = now - this.lastFrameTime;
		if(timeDiff < Math.round(1000.0 / this.frameLimit)){ return; }
		this.lastFrameTime = now;

		this.draw();
		
		if(timeDiff > 1000){ return; }
		this.gameTime += timeDiff;
		this.controllers.forEach(controller => {
			controller.update?.(timeDiff);
		});
	}

	checkTargetCollisions(){
		let hitCount = 0;
		for(const target of this.targets){
			for(const player of this.players){
				if(player.position.x === target.position.x && player.position.y === target.position.y){
					player.score++;
					target.done = true;
					hitCount++;
					break;
				}
			}
		}

		if(hitCount){
			this.updateHud();
			this.targets = this.targets.filter(target => !target.done);
			for(let i=this.targets.length; i<this.numTargets; i++){
				this.targets.push(this.makeTarget());
			}
		}
	}

	draw(){
		console.log("draw");
		const ctx = this.canvasContext;
		ctx.clearRect(0, 0, this.gridDisplayWidth, this.gridDisplayHeight);
		ctx.save();
		ctx.scale(this.displayScale, this.displayScale);

		this.targets.forEach(target => {
			this.drawTarget(target);
		})

		this.maze.forEachWall(wall => {
			this.drawWall(wall);
		});

		this.players.forEach(player => {
			this.drawPlayer(player);
		});

		ctx.globalAlpha = 0.5;
		ctx.drawImage(this.wallCanvas, 0, 0);

		ctx.restore();
	}

	updateHud(){
		this.players.forEach(player => {
			this.playerScoreElems[player.num].innerHTML = this.renderTemplate("player_score", { playerNum: player.num, score: player.score });
		});
	}

	stop(){
		this.controllers.forEach(controller => {
			controller.detach();
		});
		this.stopUpdateLoop();
		console.log("stopped");
	}

	destroy(){
		this.windowResizeListener && window.removeEventListener("resize", this.windowResizeListener);
		this.canvasElem?.remove();

		this.windowResizeListener = null;
		this.canvasElem = null;

		console.log("destroyed");
	}

}