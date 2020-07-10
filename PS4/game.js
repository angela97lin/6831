// Hand it in this way: for simpler testing, always use the same seed.
Math.seedrandom(0);

// constants
const DEFAULT_BOARD_SIZE = 8;
// set size from URL or to default
const size = Math.min(10, Math.max(3, +Util.getURLParam("size") || DEFAULT_BOARD_SIZE));

// Holds DOM elements that don’t change, to avoid repeatedly querying the DOM
var dom = {};

// Holds all current promises that must be fulfilled before we can continue crushing
var crushPromises = [];

var DIR = {
	UP: "Up",
	DOWN: "Down",
	RIGHT: "Right",
	LEFT: "Left"
}

// data model at global scope for easier debugging
// initialize board model
var board = new Board(size);

// load rules
var rules = new Rules(board);

//Holds current pulsating cells so we don't have to loop through entire board
//every time we want to update
var pulsating = [];

//Used to handle timing with showing hints
var hintInterval;

//Whether or not we allow users to drag right now
var canDrag;

//Stores information about our current drag
var currentlyDraggingCandy = 0;
var currentlyDragging = 0;
var mouseDownCoordinates;
var sizeOfCandy;
var letGoX;
var letGoY;
var fromTopLeftX;
var fromTopLeftY;
var mouseUpOkay;

var moveDuration = 0.3;
// Attaching events on document because then we can do it without waiting for
// the DOM to be ready (i.e. before DOMContentLoaded fires)
Util.events(document, {
	// Final initalization entry point: the Javascript code inside this block
	// runs at the end of start-up when the DOM is ready
	"DOMContentLoaded": function() {
		// Element refs
		dom.gameBoard = Util.one("#game-board");
		dom.newGameButton = Util.one("#new-game");
		dom.score = Util.one("#score");
		dom.score_title = Util.one("#score_title");
		dom.score_number = Util.one("#score_number");

		//create board graphics and backend
		createBoard();
		rules.prepareNewGame();

		//start countdown before revealing hint
		hintInterval = window.setTimeout(showHint, 5000);

		//set dragging vars
		mouseUpOkay = false;
		canDrag = true;

		// Add event listeners
		dom.newGameButton.addEventListener("click", function() {
			rules.prepareNewGame();
			clearHint();
			resetHintCounter();
			mouseUpOkay = false;
			canDrag = true;
			crushPromises = [];
		});
	},

	"mousedown": function(e){
		e.preventDefault();

		if (canDrag){
			mouseUpOkay = true;
			var x = e.clientX, y = e.clientY;
			var outOfBounds = checkOutOfBounds(x, y);
			if (!outOfBounds){
				canDrag = false;

				//once user has tried to click a candy, stop showing hint
				window.clearTimeout(hintInterval);
				clearHint();

				var coords = getCandyRowColFromCoordinates(x, y);
				var row = coords[0];
				var col = coords[1];
				var candy = board.getCandyAt(row, col);
				var cell = getGridElement(row+1, col+1);
				var img = cell.querySelector('img');
				sizeOfCandy = img.width;
				currentlyDragging = img;
				currentlyDraggingCandy = candy;
				mouseDownCoordinates = Util.offset(img);
				fromTopLeftX = e.pageX - mouseDownCoordinates.left;
				fromTopLeftY = e.pageY - mouseDownCoordinates.top;

				currentlyDragging.style.zIndex = "1000000";
				document.addEventListener("mousemove", moveCandyByDragging, false);
			}
		}
	},

	"mouseup": function(e){
		e.preventDefault();

		//update coordinates that we let go at so that we know where to animate from
		letGoX = e.clientX;
		letGoY = e.clientY;

		//check if dragging
		if (!canDrag && mouseUpOkay && currentlyDragging !== 0){
			mouseUpOkay = false;
			document.removeEventListener("mousemove", moveCandyByDragging, false);

			var x = e.clientX, y = e.clientY;
			var outOfBounds = checkOutOfBounds(x, y);
			if (!outOfBounds){
				var coords = getCandyRowColFromCoordinates(x, y);
				var row = coords[0];
				var col = coords[1];
				var candy = board.getCandyAt(row, col);
				var cell = getGridElement(row+1, col+1);
				var img = cell.querySelector('img');

				var isValid = isValidMove(currentlyDraggingCandy, candy);
				if (isValid){
					canDrag = false;
					board.flipCandies(candy, currentlyDraggingCandy);
					checkIfCrushableExists();
				}
				else { //not a valid move, so move candy back to original position
					bounceBack(e, currentlyDragging);
				}
			}

			else { //out of bounds
				bounceBack(e, currentlyDragging);
			}
		}
	},
});


//When user makes an invalid move, slide candy back to position and restart counter to show hint
function bounceBack(e, img){
	var x =  e.pageX - mouseDownCoordinates.left - fromTopLeftX;
	var y = e.pageY - mouseDownCoordinates.top - fromTopLeftY;
	var didntMove = (x == 0 && y == 0);
	if (!didntMove){//to avoid buggy flashy behavior
		canDrag = false;
		img.style.setProperty('--start-x', x);
		img.style.setProperty('--start-y', y);
		img.style.top = 0 + 'px';
		img.style.left = 0 + 'px';
		var animationName = "slide-back";
		img.classList.add(animationName);
		var p = Util.afterAnimation(img, animationName);
		p.then(function(){
			img.classList.remove(animationName);
			resetHintCounter();
			canDrag = true;
			currentlyDragging.style = "";
		});
	}
	else {
		canDrag = true;
		resetHintCounter();
	}
}

//Helper function to determine if player's attempted move is valid within the rules of Candy Crush
function isValidMove(fromCandy, toCandy){
	var absRowDiff = Math.abs(fromCandy.row - toCandy.row);
	var absColDiff = Math.abs(fromCandy.col - toCandy.col);
	var rowDiff = fromCandy.row - toCandy.row;
	var colDiff = fromCandy.col - toCandy.col;
	if ((absRowDiff + absColDiff) == 1){//is a neighbor
		if (rowDiff == 1){
			return rules.isMoveTypeValid(fromCandy, "up");
		}
		else if (rowDiff == -1){
			return rules.isMoveTypeValid(fromCandy, "down");
		}
		else if (colDiff == 1){
			return rules.isMoveTypeValid(fromCandy, "left");
		}
		else if (colDiff == -1){
			return rules.isMoveTypeValid(fromCandy, "right");
		}
	}
	return false;
}

//Move candy depending on mouse cursor
function moveCandyByDragging(e){
	var x =  e.pageX - mouseDownCoordinates.left - fromTopLeftX;
	var y = e.pageY - mouseDownCoordinates.top - fromTopLeftY;
	currentlyDragging.style.left = x + 'px';
	currentlyDragging.style.top = y + 'px';
	currentlyDragging.style.height = sizeOfCandy + 'px';
	currentlyDragging.style.width = sizeOfCandy + 'px';
}

//Restart countdown until displaying a hint
function resetHintCounter(){
	window.clearTimeout(hintInterval);
	hintInterval = 0;
	hintInterval = window.setTimeout(showHint, 5000);
}

// Attaching events to the board
Util.events(board, {
	// add a candy to the board
	"add": function(e) {
		var details = e.detail;
		var row = details.toRow, col = details.toCol;
		var fRow = details.fromRow, fCol = details.fromCol;
		var diffRow = row - fRow;
		canDrag = false;
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
				img.style.setProperty('--move-amount', diffRow);
				img.style.setProperty('--duration-move', moveDuration*diffRow + 's');
				img.classList.add("slideDown");
				var p = Util.afterAnimation(img, "slideDown");
				crushPromises.push(p);
				window.clearTimeout(hintInterval);
				Util.delay(0);
				p.then(function(){
					img.classList.remove("slideDown");
					resetHintCounter();
				});
			}

		}
	},

	// move a candy from location 1 to location 2
	"move": function(e) {
		//note: this takes advantage of how after flipCandies is called,
		//the board obj has updated the position of candies,
		//so the GUI simply has to redraw.
		e.preventDefault();
		window.clearTimeout(hintInterval);

		canDrag = false;
		var details = e.detail;
		var row = details.toRow;
		var col = details.toCol;
		var candy = board.getCandyAt(row, col);
		var cell = getGridElement(row+1, col+1);

		if (candy !== currentlyDraggingCandy){
			var color = candy.color;
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
			img.style.zIndex = "1";
			img.style.setProperty('--move-amount', moveAmount);
			img.style.setProperty('--duration-move', moveDuration*moveAmount + 's');
			var animationName = 'slide' + moveDirection;
			img.classList.add(animationName);
			var p = Util.afterAnimation(img, animationName);
			crushPromises.push(p);
			p.then(function(){
				img.classList.remove(animationName);
				img.style.zIndex = "0";
			});
		}
		else {
			var img = cell.firstChild.getBoundingClientRect();

			//check if image already exists; if so, remove all
			while (cell.firstChild) {
				cell.removeChild(cell.firstChild);
			}
			cell.appendChild(currentlyDragging);
			var x = letGoX - fromTopLeftX - (img.left);
			var y = letGoY -fromTopLeftY - (img.top) ;
			currentlyDragging.style = "";
			currentlyDragging.style.setProperty('--start-x', x);
			currentlyDragging.style.setProperty('--start-y', y);
			currentlyDragging.style.zIndex = "100000";

			var animationName = 'slide-back';
			currentlyDragging.classList.add(animationName);
			var p = Util.afterAnimation(currentlyDragging, animationName);
			crushPromises.push(p);
			p.then(function(){
				currentlyDragging.style.zIndex = "0";
				currentlyDragging.classList.remove(animationName);
				currentlyDragging = 0;
				currentlyDraggingCandy = 0;
			});
		}
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
			dom.score.classList.add("starting-text");
			// var gray = bodyStyles.getPropertyValue('--color-light-gray'); //get
			// dom.score.style.backgroundColor = gray;
		}
		//for visiblity purposes, if yellow, make text gray
		if (color === 'yellow'){
			dom.score_title.classList.remove("starting-text");
			dom.score_number.classList.remove("starting-text");
			dom.score_title.classList.add("contrast-color-text");
			dom.score_number.classList.add("contrast-color-text");

			// dom.score_title.style.color = "gray";
			// dom.score_number.style.color = "gray";
		}
		else {

			// dom.score_title.classList.remove("starting-text");
			// dom.score_number.classList.remove("starting-text");
			// dom.score_title.classList.add("contrast-color-text");
			// dom.score_number.classList.add("contrast-color-text");
			//
			dom.score_title.style.color = "white";
			dom.score_number.style.color = "white";
		}
	},
});

//Get candy row and column based on mouse cursor
function getCandyRowColFromCoordinates(x, y){
	var rect = dom.gameBoard.getBoundingClientRect();
	var splits = size + 1;
	var range = rect.width;
	var eachCell = range/splits;
	x = x - rect.left;
	y = y - rect.top;
	var column = Math.floor(x / eachCell) - 1;
	var row = Math.floor(y / eachCell) - 1;
	return [row, column];
}

//check if mouse coordinates are within the game board
function checkOutOfBounds(x, y){
	var rect = dom.gameBoard.getBoundingClientRect();
	var header = Util.one("#header");
	var headerRect = header.getBoundingClientRect();
	xOutOfBounds = (x >= rect.left + headerRect.width && x <= rect.right);
	yOutOfBounds = (y >= rect.top + headerRect.height && y <= rect.bottom);
	return !(xOutOfBounds && yOutOfBounds)
}

//handles automatically crushing candies when possible
function automaticCrush(){
	var crushables = rules.getCandyCrushes();
	if (crushables.length > 0){
		canDrag = false;
		clearHint();
		crushables.forEach(function(crushable){
			crushable.forEach(function(c){
				var row = c.row;
				var col = c.col;
				var cell = getGridElement(row+1, col+1);
				var cellImage = cell.querySelector('img');
				cellImage.classList.add("fade");
				var p = Util.afterAnimation(cellImage, "fade");
				crushPromises.push(p);
				p.then(function(){
					cellImage.classList.remove("fade");
					cell.removeChild(cellImage);
				});
			});
		});
		rules.removeCrushes(crushables);

		Promise.all(crushPromises).then(function(){
			//after delay, we want to move candies down and update our interface
			setTimeout(function () {
				rules.moveCandiesDown();
				checkIfCrushableExists();
			}, 200);
		});
	}
}

//If currently no hint is displayed, show hint via pulsating candy
function showHint() {
	if (pulsating.length == 0){
		var randomMove = rules.getRandomValidMove();
		if (randomMove !== null){
			var candiesToCrush = rules.getCandiesToCrushGivenMove(randomMove.candy, randomMove.direction);
			candiesToCrush.forEach(function(c){
				var row = c.row, col = c.col;
				var candy = board.getCandyAt(row, col);
				var cell = getGridElement(row+1, col+1);
				window.requestAnimationFrame(function(){
					var cellImage = cell.querySelector('img');
					cellImage.classList.add("pulsate");
					pulsating.push(cellImage);
				});
			});
		}
	}
}

//Checks if crushable candies on board. If so, crush candies.
function checkIfCrushableExists(){
	canDrag = false;
	Promise.all(crushPromises).then(function(){
		var crushables = rules.getCandyCrushes();
		if (crushables.length > 0){
			automaticCrush();
		}
		else {
			crushPromises = [];
			resetHintCounter();
			canDrag = true;
		}
	});
}

//helper function to get direction and amount of movement for animations
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
	else if (diffRow < 0){//up
		return [DIR.UP, absDiffRow];
	}
	else if (diffCol > 0){//right
		return [DIR.RIGHT, absDiffCol];
	}
	else if (diffCol < 0){//left
		return [DIR.LEFT, absDiffCol];
	}
}

//stop any cells that are currently pulsating
function clearHint(){
	pulsating.forEach(function(cell){
		cell.classList.remove("pulsate");
	});
	pulsating = [];
}

//helper fxn to get element associated with particular cell in board
function getGridElement(row, col){
	var cellNum = parseInt(row-1)*size + parseInt(col);
	var cell = dom.gameBoard.querySelector("#cell"+cellNum);
	return cell;
}

//dynamically create our game board graphics with appropriate borders
function createBoard(){
	document.body.style.setProperty('--size', size);
	document.body.style.setProperty('--grid-size', size+1);

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

			//logic for borders
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
