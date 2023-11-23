(() => {
	//gsap.globalTimeline.timeScale(0.2);

	const game = new MazeGame();
	try {
		game.create(document.getElementById("root"));
		game.start();
	} catch(e){
		console.error(e);
	}

	window.addEventListener("unload", () => {
		try {
			game.stop();
			game.destroy();
		} catch(e){
			console.error(e);
		}
	});
})();