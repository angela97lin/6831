// Hand it in this way: for simpler testing, always use the same seed.
Math.seedrandom(0);

// constants
const DEFAULT_BOARD_SIZE = 8;
// set size from URL or to default
const size = Math.min(10, Math.max(3, +Util.getURLParam("size") || DEFAULT_BOARD_SIZE));

// Holds DOM elements that don’t change, to avoid repeatedly querying the DOM
var dom = {};

// data model at global scope for easier debugging
// initialize board model
var board = new Board(size);

// load a rule
var rules = new Rules(board);

// constraints that specify what a valid input is
function getConstraint(){
	var constraint;
	var chrUpper = String.fromCharCode(97 + size - 1).toUpperCase();
	var chrLower = String.fromCharCode(97 + size - 1).toLowerCase();
	if (size == 10){
		constraint = new RegExp('^[A-'+`J`+'a-'+`j`+']{1}([1-9]|10){1}$');
	} else {
		constraint = new RegExp('^[A-'+`${chrUpper}`+'a-'+`${chrLower}`+']{1}([1-'+`${size}`+']){1}$');
	}
	return constraint;
}

// valid arrow directions
const directions = ["up", "down", "left", "right"];

var DIR = {
	UP: "Up",
	DOWN: "Down",
	RIGHT: "Right",
	LEFT: "Left"
}

//holds current pulsating cells so we don't have to loop through entire board
//every time we want to update
var pulsating = [];

// Attaching events on document because then we can do it without waiting for
// the DOM to be ready (i.e. before DOMContentLoaded fires)
Util.events(document, {
	// Final initalization entry point: the Javascript code inside this block
	// runs at the end of start-up when the DOM is ready
	"DOMContentLoaded": function() {
		// Element refs
		dom.input = Util.one("#control-input-box");
		dom.crushButton = Util.one("#crush-button");
		dom.controlColumn = Util.one("#controls");
		dom.arrows = Util.all(".arrow-button");
		dom.gameBoard = Util.one("#game-board");
		dom.newGameButton = Util.one("#new-game");
		dom.showHintButton = Util.one("#show-hint");
		dom.score = Util.one("#score");
		dom.score_title = Util.one("#score_title");
		dom.score_number = Util.one("#score_number");
		document.body.style.setProperty('--duration-move', '0.0s');//set

		//create board graphics and back end
		createBoard();
		rules.prepareNewGame();
		var randomMove = rules.getRandomValidMove();
		var randomMoveExists = (randomMove === null);
		dom.showHintButton.disabled = randomMoveExists;
		// Add events
		dom.newGameButton.addEventListener("click", function() {
			rules.prepareNewGame();
			var randomMove = rules.getRandomValidMove();
			var randomMoveExists = (randomMove === null);
			dom.showHintButton.disabled = randomMoveExists;
			directions.forEach(function(dir){
				button = Util.one("#" + dir + "-arrow"); // example
				button.disabled = true;
			})
			dom.input.value = "";
			dom.input.disabled = false;
			dom.input.focus();
			dom.crushButton.disabled = true;
		});
		dom.newGameButton.addEventListener("click", clearPulsatingCells);

		dom.showHintButton.addEventListener("click", function() {
			var randomMove = rules.getRandomValidMove();
			var candiesToCrush = rules.getCandiesToCrushGivenMove(randomMove.candy, randomMove.direction);
			pulsating.forEach(function(cell){
				var cellImage = cell.querySelector('img');
				cellImage.classList.remove("pulsate");
			});
			pulsating = [];
			candiesToCrush.forEach(function(c){
				var row = c.row;
				var col = c.col;
				var candy = board.getCandyAt(row, col);
				var cell = getGridElement(row+1, col+1);
				window.requestAnimationFrame(function(){
					var cellImage = cell.querySelector('img');
					cellImage.classList.add("pulsate");
				});

				pulsating.push(cell);
			});
		});

		dom.arrows.forEach(function(button){
			button.disabled = true;
			button.addEventListener("click", moveCandy);
			button.addEventListener("click", clearPulsatingCells);
		})
		dom.input.addEventListener("input", updateArrowKeys);

		dom.crushButton.disabled = true;
		dom.crushButton.addEventListener("click", crushOnce);
	},

	// Keyboard events arrive here
	"keydown": function(evt) {
	},
	// Click events arrive here
	"click": function(evt) {
	}

});

// Attaching events to the board
Util.events(board, {
	// add a candy to the board
	"add": function(e) {
		var details = e.detail;
		var row = details.toRow;
		var col = details.toCol;
		var fRow = details.fromRow;
		var fCol = details.fromCol;
		var diffRow = row - fRow;
		if (board.isValidLocation(row, col)){
			var candy = board.getCandyAt(row, col);
			var color = candy.color;
			var cell = getGridElement(row+1, col+1);
			var img = document.createElement("img");
			img.setAttribute('src', 'graphics/'+color+'-candy.png');

			//check if any images already exists; if so, remove all
			//so that only one image per cell
			while (cell.firstChild) {
				cell.removeChild(cell.firstChild);
			}
			cell.appendChild(img);
			if (fRow !== undefined && fCol !== undefined){
				Util.delay();
				img.style.setProperty('--move-amount', diffRow);
				img.style.setProperty('--duration-move', .1*diffRow + 's');

				img.classList.add("slideDown");
				var p = Util.afterAnimation(img, "slideDown");
				p.then(function(){
					img.classList.remove("slideDown");
				});
			}

			var randomMove = rules.getRandomValidMove();
			dom.showHintButton.disabled = (randomMove === null);

		}
	},

	// move a candy from location 1 to location 2
	"move": function(e) {
		//note: this takes advantage of how after flipCandies is called,
		//the board obj has updated the position of candies,
		//so the GUI simply has to redraw.
		var details = e.detail;
		var row = details.toRow;
		var col = details.toCol;
		var candy = board.getCandyAt(row, col);
		var color = candy.color;
		var cell = getGridElement(row+1, col+1);
		var img = document.createElement("img");
		img.setAttribute('src', 'graphics/'+color+'-candy.png');

		var move = getMoveDetails(e);
		var moveDirection = move[0];
		var moveAmount = move[1];
		//check if image already exists; if so, remove all
		while (cell.firstChild) {
			cell.removeChild(cell.firstChild);
		}
		cell.appendChild(img);

		document.body.style.setProperty('--duration-move', '');
		img.style.setProperty('--move-amount', moveAmount);
		img.style.setProperty('--duration-move', .1*moveAmount + 's');

		directions.forEach(function(dir){
			button = Util.one("#" + dir + "-arrow"); // example
			button.disabled = true;
		});
		dom.input.disabled = true;
		dom.crushButton.disabled = true;
		console.log(moveDirection);
		if (moveDirection == DIR.LEFT){
			img.classList.add("slideLeft");
			var p = Util.afterAnimation(img, "slideLeft");
			p.then(function(){
				img.classList.remove("slideLeft");
				checkIfCrushableExists();
			});
		}

		else if (moveDirection == DIR.RIGHT){
			img.classList.add("slideRight");
			var p = Util.afterAnimation(img, "slideRight");
			p.then(function(){
				img.classList.remove("slideRight");
				checkIfCrushableExists();

			});
		}

		else if (moveDirection == DIR.UP){
			img.classList.add("slideUp");
			var p = Util.afterAnimation(img, "slideUp");
			p.then(function(){
				img.classList.remove("slideUp");
				checkIfCrushableExists();

			});
		}

		else if (moveDirection == DIR.DOWN){
			img.classList.add("slideDown");
			var p = Util.afterAnimation(img, "slideDown");
			p.then(function(){
				img.classList.remove("slideDown");
				checkIfCrushableExists();

			});
		}

	},

	// remove a candy from the board
	"remove": function(e) {

		;
	},

	// update the score
	"scoreUpdate": function(e) {
		var bodyStyles = window.getComputedStyle(document.body);
		var details = e.detail;
		var score = details.score;
		dom.score_number.textContent = score;
		if (score > 0){
			var color = details.candy.color;

			var definedColor = bodyStyles.getPropertyValue('--color-'+color); //get
			dom.score.style.backgroundColor = definedColor;
		}
		else {
			var gray = bodyStyles.getPropertyValue('--color-light-gray'); //get
			dom.score.style.backgroundColor = gray;
		}
		//for visiblity purposes, if yellow, make text gray
		if (color === 'yellow'){
			dom.score_title.style.color = "gray";
			dom.score_number.style.color = "gray";
		}
		else {
			dom.score_title.style.color = "white";
			dom.score_number.style.color = "white";
		}

	},
});

//implements crushing once
//when crushing, we want to disable the input field, as well as
//all other controls (buttons and crush button)
function crushOnce(){
	//document.body.style.setProperty('--duration-move', '3s');//set
	var crushables = rules.getCandyCrushes();
	var candies = []

	crushables.forEach(function(crushable){
		crushable.forEach(function(c){
			var row = c.row;
			var col = c.col;
			var cell = getGridElement(row+1, col+1);
			var cellImage = cell.querySelector('img');
			cellImage.classList.add("fade");
			var p = Util.afterAnimation(cellImage, "fade");
			p.then(function(){
				cellImage.classList.remove("fade");
				cell.removeChild(cellImage);
			});
		});
	});


	rules.removeCrushes(crushables);


	//after delay, we want to move candies down and update our interface
	setTimeout(function () {
		rules.moveCandiesDown();
		dom.input.disabled = false;
		updateArrowKeys();
		checkIfCrushableExists();
	}, 500);

	dom.input.disabled = true;
	dom.crushButton.disabled = true;
	directions.forEach(function(dir){
		var button = Util.one("#" + dir + "-arrow"); // example
		button.disabled = true;
	});


}

//disables / enables arrow key based on input field
function updateArrowKeys(){
	var val = dom.input.value;
	var button;
	if (val.length == 0){
		dom.input.style.color = "black";

	}
	if (val.length > 1){
		dom.input.style.color = "black";
		var constraint = getConstraint();
		if (constraint.test(val)){
			var candy = parseCandyFromInput();
			directions.forEach(function(dir){
				button = Util.one("#" + dir + "-arrow"); // example
				var isMoveValid = rules.isMoveTypeValid(candy, dir);
				button.disabled = !isMoveValid;
			})
		}
		else {
			dom.input.style.color = "red";
			directions.forEach(function(dir){
				var button = Util.one("#" + dir + "-arrow"); // example
				button.disabled = true;
			});
		}
	}
	else {
		dom.input.style.color = "red";
		directions.forEach(function(dir){
			button = Util.one("#" + dir + "-arrow"); // example
			button.disabled = true;
		});
	}
}

//updates the controls based on whether or not we have candies to crush
function checkIfCrushableExists(){
	//if we can, then disable all buttons and input field;

	var crushables = rules.getCandyCrushes();
	if (crushables.length > 0){
		dom.crushButton.disabled = false;
		dom.input.disabled = true;

		directions.forEach(function(dir){
			var button = Util.one("#" + dir + "-arrow"); // example
			button.disabled = true;
		});
	}

	//otherwise, put focus back on input
	else {
		dom.crushButton.disabled = true;
		dom.input.focus();
	}
}


//helper fxn to help get direction and amount of movement for animations
function getMoveDetails(e){
	var detail = e.detail;
	var toRow = detail.toRow;
	var toCol = detail.toCol;
	var fromRow = detail.fromRow;
	var fromCol = detail.fromCol;
	var diffRow = toRow - fromRow;
	var diffCol = toCol - fromCol;
	var absDiffRow = Math.abs(diffRow);
	var absDiffCol = Math.abs(diffCol);
	if (fromRow === undefined || fromCol === undefined){
		return [0,0]
	}
	else if (diffRow > 0){//down
		return [DIR.DOWN, absDiffRow];
	}
	else if (diffRow < 0){//
		return [DIR.UP, absDiffRow];
	}
	else if (diffCol > 0){//right
		return [DIR.RIGHT, absDiffCol];
	}
	else if (diffCol < 0){//left
		return [DIR.LEFT, absDiffCol];
	}
}

//parses user input to get the corresponding candy
function parseCandyFromInput(){
	var val = dom.input.value;
	if (val.length < 2){
		var row = parseInt(val.charAt(1))-1;
	}
	else { //10
		var row = parseInt(val.substring(1,3))-1;
	}
	var alphaCol = val.charAt(0);
	var col = alphaCol.toLowerCase().charCodeAt(0) - 97; //convert letter to number
	var candy = board.getCandyAt(row, col);
	return candy;

}

//moves candy based on which arrow was clicked (known via e, which is usually click event)
function moveCandy(e){

	var fromCandy = parseCandyFromInput();
	var id = e.target.id;

	var dir;
	if (id == "up-arrow"){
		dir = "up";
	}
	else if (id == "down-arrow") {
		dir = "down";
	}
	else if (id == "right-arrow") {
		dir = "right";
	}
	else if (id == "left-arrow") {
		dir = "left";
	}

	var toCandy = board.getCandyInDirection(fromCandy, dir);
	if (rules.isMoveTypeValid(fromCandy, dir)){
		board.flipCandies(fromCandy, toCandy);
	}

	directions.forEach(function(dir){
		var button = Util.one("#" + dir + "-arrow"); // example
		button.disabled = true;
	});
	dom.input.value = "";
	dom.input.focus();
}

//stop any cells that are currently pulsating
function clearPulsatingCells(){
	pulsating.forEach(function(cell){
		cell.classList.remove("pulsate");
	});
	pulsating = [];
}

function getGridElement(row, col){
	var cellNum = parseInt(row-1)*size + parseInt(col);
	var cell = dom.gameBoard.querySelector("#cell"+cellNum);
	return cell;
}

//dynamically create our game board graphics
function createBoard(){
	document.body.style.setProperty('--size', size);//set
	document.body.style.setProperty('--grid-size', size+1);//set

	var th = document.createElement('div');
	th.className = "content head";
	th.innerHTML = "";
	th.id = "header"
	dom.gameBoard.appendChild(th);
	//initialize alphabetical headers
	for (var row = 0; row < size; row++) {
		var letter = (row+10).toString(36);
		var th = document.createElement('div');
		th.className = "content head";
		th.innerHTML = letter;
		th.id = "header"
		dom.gameBoard.appendChild(th);
	}

	for(var i = 0; i < size; i++){
		var th = document.createElement('div');
		th.className = "content head";
		th.innerHTML = i+1;
		th.id = "header"
		dom.gameBoard.appendChild(th);

		for(var x = 1; x <= size; x++){
			var cell = document.createElement("div");
			cell.classList.add("content");
			//logic for borderes
			if (x == size){
				cell.classList.add("child-with-border");
			}
			else {
				cell.classList.add("child");
			}
			if (i == size-1){
				cell.classList.add("child-edge");
			}
			var num = (i * (size) + x).toString();
			cell.id = "cell"+num;
			dom.gameBoard.appendChild(cell);
		}
	}
}
