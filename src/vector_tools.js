const VectorTools = (() => {
	
	class VectorToolsClass {

		zero(){
			return { x: 0, y: 0 };
		}

		add(vec1, vec2){
			return { x: vec1.x + vec2.x, y: vec1.y + vec2.y };
		}

		subtract(vec1, vec2){
			return { x: vec1.x - vec2.x, y: vec1.y - vec2.y };
		}

		multiply(vec, coef){
			return { x: vec.x * coef, y: vec.y * coef };
		}

		magnitude(vec){
			return Math.sqrt(vec.x*vec.x + vec.y*vec.y);
		}

		normalize(vec){
			const magnitude = Math.sqrt(vec.x*vec.x + vec.y*vec.y);
			if(magnitude <= 0){ return vec; }
			return { x: vec.x/magnitude, y: vec.y/magnitude };
		}

		randomUnitVector(){
			const theta = Math.random() * 2 * Math.PI;
			return { x: Math.cos(theta), y: Math.sin(theta) };
		}

		manhattanDistance(v1, v2){
			return Math.abs(v2.x - v1.x) + Math.abs(v2.y - v1.y);
		}

		distance(v1, v2){
			return this.magnitude(this.subtract(v2, v1));
		}

		positiveModulo(value, modulo, reflected){
			let modulus = value % modulo;
			let divisor = Math.floor(value / modulo);
			if(modulus < 0){ modulus = modulo + modulus; }
			if(!reflected || divisor % 2 === 0){
				return modulus;
			}
			return modulo - modulus;
		}
	}

	return new VectorToolsClass();
})();