class SnappyPlayerController {

	constructor(game, player, controlMap){
		this.game = game;
		this.maze = this.game.maze;
		this.player = player;
		this.controlMap = controlMap;
		this.moveDuration = 120;
		this.moveExpireDuration = 600;

		this.keyMap = {};
		Object.keys(this.controlMap).forEach(key => {
			this.keyMap[this.controlMap[key]] = key;
		});

		this.directions = {
			up: { x: 0, y: -1 },
			left: { x: -1, y: 0 },
			down: { x: 0, y: 1 },
			right: { x: 1, y: 0 }
		};

		this.keyDownListener = (event) => {
			const key = event.key;
			const dir = this.keyMap[key];
			if(!dir){ return; }
			this.moveToDirection(dir);
			event.preventDefault();
			event.stopPropagation();
		};


		this.movementAnimation = null;
		this.queue = [];
	}

	moveToDirection(dir){
		if(this.movementAnimation){
			console.log(`player ${this.player.num} buffer input ${dir}`);
			this.queue.push({ dir, date: Date.now() });
			return;
		}

		const dirVec = this.directions[dir];
		const fromPos = { x: this.player.position.x, y: this.player.position.y };

		const toPos = { ...fromPos };
		toPos.x = Math.min(this.maze.cols - 1, Math.max(0, toPos.x + dirVec.x));
		toPos.y = Math.min(this.maze.rows - 1, Math.max(0, toPos.y + dirVec.y));

		if(!this.maze.canPassBetween(fromPos, toPos)){
			return;
		}

		this.movementAnimation = gsap.to(this.player.offset, { 
			x: dirVec.x,
			y: dirVec.y,
			duration: this.moveDuration/1000.
		});
		this.movementAnimation.eventCallback("onComplete", () => {
			this.player.position = toPos;
			this.player.offset = VectorTools.zero();
			this.game.onPlayerMoved(this.player);

			this.movementAnimation = null;
			this.onMoveEnd();
		});
	}

	onMoveEnd(){
		while(this.queue.length){
			const move = this.queue.shift();
			if(Date.now() - move.date > this.moveExpireDuration){ 
				console.log(`player ${this.player.num} expired input ${move.dir}`);
				continue;
			}

			console.log(`player ${this.player.num} reload input ${move.dir}`);
			this.moveToDirection(move.dir);
			return;
		}
	}

	attach(){
		window.addEventListener("keydown", this.keyDownListener);
	}

	detach(){
		window.removeEventListener("keydown", this.keyDownListener);
	}

}

class SmoothPlayerController {

	constructor(game, player, controlMap){
		this.game = game;
		this.maze = this.game.maze;
		this.player = player;
		this.controlMap = controlMap;
		this.movementSpeed = 500./120.;

		this.keyMap = {};
		Object.keys(this.controlMap).forEach(key => {
			this.keyMap[this.controlMap[key]] = key;
		});

		this.directions = {
			up: { x: 0, y: -1 },
			left: { x: -1, y: 0 },
			down: { x: 0, y: 1 },
			right: { x: 1, y: 0 }
		};
		this.pressedKeys = {};

		this.keyDownListener = (event) => {
			this.keyActionListener("down", event);
		};
		this.keyUpListener = (event) => {
			this.keyActionListener("up", event);
		};
	}

	keyActionListener(action, event){
		const key = event.key;
		const dir = this.keyMap[key];
		if(!dir){ return; }
		this.pressedKeys[dir] = (action === "down");
		event.preventDefault();
		event.stopPropagation();
	}

	update(dt){
		const moveDir = VectorTools.zero();
		for(const key in this.pressedKeys){
			if(!this.pressedKeys[key]){ continue; }
			const dirVec = this.directions[key];
			moveDir.x += dirVec.x;
			moveDir.y += dirVec.y;
		}
		if(moveDir.x === 0 && moveDir.y === 0){ return; }

		const normMoveDir = VectorTools.normalize(moveDir);
		const dPos = VectorTools.multiply(normMoveDir, this.movementSpeed * dt / 1000.);
		const fromPos = VectorTools.add(this.player.position, this.player.offset);
		const toPos = VectorTools.add(fromPos, dPos);
		if(this.game.isWall(toPos)){
			if(!this.game.isWall({ x: fromPos.x, y: toPos.y })){
				dPos.x = 0;
			} else if(!this.game.isWall({ x: toPos.x, y: fromPos.y })){
				dPos.y = 0;
			} else {
				return;
			}
		}

		this.player.offset = VectorTools.add(this.player.offset, dPos);
		if(VectorTools.magnitude(this.player.offset) < 1.2*(Math.sqrt(2.)/2.)){
			return;
		}

		const newPos = VectorTools.add(this.player.position, this.player.offset);
		this.player.position = {
			x: Math.round(newPos.x),
			y: Math.round(newPos.y)
		};
		this.player.offset = VectorTools.subtract(newPos, this.player.position);
		this.game.onPlayerMoved();
	}

	attach(){
		window.addEventListener("keydown", this.keyDownListener);
		window.addEventListener("keyup", this.keyUpListener);
	}

	detach(){
		window.removeEventListener("keydown", this.keyDownListener);
		window.removeEventListener("keyup", this.keyUpListener);
	}

}