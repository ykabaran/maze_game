class DynamicColorMap {

	constructor(game){
		this.game = game;

		this.startPosition = { x: Math.random(), y: Math.random() };
		this.movementVector = VectorTools.randomUnitVector();
		this.movementSpeed = 100;
		this.centerColor = { r: 255, g: 20, b: 255 };
		this.edgeColor = { r: 30, g: 40, b: 255 };
	}

	getColor(x, y){
		const width = this.game.baseResolutionWidth;
		const height = this.game.baseResolutionHeight;
		const time = this.game.gameTime;
		const radius = Math.max(width, height);

		const centerX = VectorTools.positiveModulo((this.startPosition.x * width) + (time * this.movementSpeed * this.movementVector.x / 1000.), width, true);
		const centerY = VectorTools.positiveModulo((this.startPosition.y * height) + (time * this.movementSpeed * this.movementVector.y / 1000.), height, true);

		const dist = Math.min(1, VectorTools.distance({ x: centerX, y: centerY }, { x, y })/ radius);
		const color = {
			r: Math.round(this.centerColor.r + (this.edgeColor.r - this.centerColor.r) * dist),
			g: Math.round(this.centerColor.g + (this.edgeColor.g - this.centerColor.g) * dist),
			b: Math.round(this.centerColor.b + (this.edgeColor.b - this.centerColor.b) * dist)
		};
		return `rgb(${color.r},${color.g},${color.b})`;
	}

}