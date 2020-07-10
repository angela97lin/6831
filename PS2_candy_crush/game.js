// Hand it in this way: for simpler testing, always use the same seed.
Math.seedrandom(0);

// constants
const DEFAULT_BOARD_SIZE = 8;
// set size from URL or to default
const size = Math.min(10, Math.max(3, Util.getURLParam("size") || DEFAULT_BOARD_SIZE));

// Holds DOM elements that don’t change, to avoid repeatedly querying the DOM
var dom = {};

// data model at global scope for easier debugging
// initialize board model
var board = new Board(size);

// load a rule
var rules = new Rules(board);

// constraints that specify what a valid input is
const constraint = new RegExp('^[A-Ha-h]{1}[1-8]{1}$');

// valid arrow directions
const directions = ["up", "down", "left", "right"];

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
		dom.gameBoard = Util.one("#game-board-body");
		dom.newGameButton = Util.one("#new-game");

		//create board graphics and back end
		createBoard();
		rules.prepareNewGame();

		// Add events
		dom.newGameButton.addEventListener("click", function() { rules.prepareNewGame(); });
		dom.arrows.forEach(function(button){
			button.disabled = true;
			button.addEventListener("click", moveCandy);
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
		if (board.isValidLocation(row, col)){
			var candy = board.getCandyAt(row, col);
			var color = candy.color;
			var cell = dom.gameBoard.rows[row+1].cells[col+1];
			var img = document.createElement("img");
			img.setAttribute('src', 'graphics/'+color+'-candy.png');

			//check if any images already exists; if so, remove all
			//so that only one image per cell
			while (cell.firstChild) {
				cell.removeChild(cell.firstChild);
			}
			cell.appendChild(img);
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
		var cell = dom.gameBoard.rows[row+1].cells[col+1];
		var img = document.createElement("img");
		img.setAttribute('src', 'graphics/'+color+'-candy.png');

		//check if image already exists; if so, remove all
		while (cell.firstChild) {
			cell.removeChild(cell.firstChild);
		}
		cell.appendChild(img);
		checkIfCrushableExists();

	},

	// remove a candy from the board
	"remove": function(e) {
		var details = e.detail;
		var row = details.fromRow;
		var col = details.fromCol;
		var cell = dom.gameBoard.rows[row+1].cells[col+1];
		while (cell.firstChild) {
			cell.removeChild(cell.firstChild);
		}
	},


	// update the score
	"scoreUpdate": function(e) {
		// Your code here. To be implemented in PS3.
	},
});

//implements crushing once
//when crushing, we want to disable the input field, as well as 
//all other controls (buttons and crush button)
function crushOnce(){
	var crushables = rules.getCandyCrushes();
	rules.removeCrushes(crushables);

	dom.input.disabled = true;
	dom.crushButton.disabled = true;
	directions.forEach(function(dir){
		var button = Util.one("#" + dir + "-arrow"); // example
		button.disabled = true;
	});

	//after delay, we want to move candies down and update our interface
	//
	setTimeout(function () {
		rules.moveCandiesDown();
		dom.input.disabled = false;
		updateArrowKeys();
		checkIfCrushableExists();
	}, 500);
}

//disables / enables arrow key based on input field
function updateArrowKeys(){
	var val = dom.input.value;
	var button;

	if (val.length > 1){
		if (constraint.test(val)){
			var candy = parseCandyFromInput();
			directions.forEach(function(dir){
				button = Util.one("#" + dir + "-arrow"); // example
				var isMoveValid = rules.isMoveTypeValid(candy, dir);
				button.disabled = !isMoveValid;
			})
		}
		else {
			directions.forEach(function(dir){
				var button = Util.one("#" + dir + "-arrow"); // example
				button.disabled = true;
			});
		}
	}
	else {
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

//parses user input to get the corresponding candy
function parseCandyFromInput(){
	var val = dom.input.value;
	var alphaCol = val.charAt(0);
	var row = val.charAt(1)-1;
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

//dynamically create our game board graphics
function createBoard() {
	var trHeader = document.createElement('tr');
	trHeader.appendChild(document.createElement('th'));

	//initialize alphabetical headers
	for (var row = 0; row < DEFAULT_BOARD_SIZE; row++) {
		var letter = (row+10).toString(36);
		var th = document.createElement('th');
		th.className = "arial-font";
		th.innerHTML = letter;
		trHeader.appendChild(th);
	}
	dom.gameBoard.appendChild(trHeader);

	for (var row = 0; row < DEFAULT_BOARD_SIZE; row++) {
		var tr = document.createElement('tr');

		//create numerical header for each row
		var th = document.createElement('th');
		th.innerHTML = row+1;
		th.className = "arial-font";
		tr.appendChild(th);

		//create each cell
		for (var column = 0; column < DEFAULT_BOARD_SIZE; column++) {
			var td = document.createElement('td');
			tr.appendChild(td);
		}

		dom.gameBoard.appendChild(tr);
	}
}
