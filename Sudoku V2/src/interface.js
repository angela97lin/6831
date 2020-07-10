// A minimal UI for Sudoku, an A/B experiment lab for 6.831.

// This file intentionally exposes its names to global scope to
// simplify testing, so you can directly manipulate the state
// from the console. For example, set the selected number:
//    setcurnumber(3)
// or retrieve, modify, and set the state:
//    state=currentstate(); state.answer[0]=3+1; commitstate(state);

/////////////////////////////////////////////////////////////////////////////
// Constants and global state
/////////////////////////////////////////////////////////////////////////////

// Initialize algorithm.js: we use a 2x2x2x2-sized sudoku game.
// This sets up the constants Sudoku.N = 4, Sudoku.S = 16, Sudoku.B = 2.
const size = 2;
Sudoku.init(size);

var DISABLE_CONTEXTMENU = true; // Enables context menus.
var USE_LOCAL_STORAGE = false;    // Enables saving state to localStorage.
var SYMMETRIC_PUZZLES = false;   // Allows asymmetric puzzles.

// This app uses url-based state to support deep linking.  That means
// almost all the application state is stored in the URL, which allows
// the user to bookmark the page to save and share the screen they see.
// It also allows browser's "back" button to work for undo.
//
// The url, therefore, is the main global state variable:
//
//   state = currentstate(); will read the current state from the URL.
//   commitstate(state); will save state to the URL (and localStorage),
//
// If you remember (e.g., log) the URL string, you will be able to
// recreate most of the game state by linking back to it.
//
// The only UI state which is not saved in the hash are the variables
// below having to do with transient visual effects such as selection,
// focus, and the visible timer.

const DIR = {
  UP: "Up",
  DOWN: "Down",
  RIGHT: "Right",
  LEFT: "Left"
}

var gamesCompleted = new Set();
var selectedCell = 0; //Selected cell element
var selectedCellId = 0; //Keeps track of the number of the selected cell
const isDigitReg = new RegExp('^[1-'+`${Sudoku.N}`+']{1}$');
const isAnyDigitReg = new RegExp(/^\d+$/);
var starttime = (new Date).getTime();  // t=0 for the visible timer.
var runningtime = false;               // true if the timer is running.
var curnumber = null;                  // currently selected number.

/////////////////////////////////////////////////////////////////////////////
// Page and Game Set-up
/////////////////////////////////////////////////////////////////////////////

// The main entry point: runs when the page is finished loading.
Util.events(document, {
  "DOMContentLoaded": function() {
    var sinit;
    // Generate static HTML such as the number palette.
    setup_screen();
    if (window.location.hash && (sinit = currentstate()).seed) {
      // If the URL contains game state, adjust the time and log an event.
      starttime = (new Date).getTime() - sinit.elapsed;
      var detail = {name: 'linkgame', info: {seed: sinit.seed}};
      document.dispatchEvent(new CustomEvent("log", {detail}));
      saveseed(sinit.seed);
    } else {
      // For a bare URL, modify the url to have a game (generated or loaded).
      setupgame(0);
    }
    // Render the current state of the game based on the URL.
    redraw();
    // Re-render whenever the URL hash changes.
    window.addEventListener('hashchange', function() {
      redraw();
    });
    // Set the selected number to the 'eraser'.
    setcurnumber(0);

    //set first selected cell to upper-leftmost cell
    selectedCell = Util.one("#sc0"); //Selected cell element
    selectedCellId = 0; //Keeps track of the number of the selected cell
    updateSelectedCellColor(selectedCell, selectedCellId);
    // Show the instructions to the user
    if (currentstate().seed == 1) {
      showpopup('#intro');
    }
  },

  "keydown": function(event){

    const key = event.key;
    var move;

    //if moving around board via arrow keys
    if (key.includes("Arrow")){
      clearHint();

      if (key.includes(DIR.DOWN)){
        move = getCellInDirection(selectedCellId, DIR.DOWN);
      }
      else if (key.includes(DIR.UP)){
        move = getCellInDirection(selectedCellId, DIR.UP);
      }
      else if (key.includes(DIR.LEFT)){
        move = getCellInDirection(selectedCellId, DIR.LEFT);
      }
      else if (key.includes(DIR.RIGHT)){
        move = getCellInDirection(selectedCellId, DIR.RIGHT);
      }
      var moveToCell = move[0];
      var moveToCellId = move[1];
      moveTo(moveToCell, moveToCellId);
      updateSelectedCellColor(moveToCell, moveToCellId);
    }
    var isDigit = isAnyDigitReg.test(key);
    var isValidDigit = isDigitReg.test(key);

    if (isDigit){
      if (isValidDigit){
        clearHint();
          setcurnumber(key);
          update(selectedCell, event);
          var detail = {name: 'numberEntered', info: {"digit": key}};
          document.dispatchEvent(new CustomEvent('log', {detail}));
      } else {
        var detail = {name: 'invalidNumberEntered', info: {"digit": key}};
        document.dispatchEvent(new CustomEvent('log', {detail}));
        selectedCell.classList.add("invalidInput");
        var p = Util.afterAnimation(selectedCell, "invalidInput");
        p.then(function(){
          selectedCell.classList.remove("invalidInput");
        });

      }
    }

    if (key === "Backspace"){
      clearHint();
      setcurnumber(0);
      update(selectedCell, event);
      var detail = {name: 'eraserUsed', info: {"how": "keyPress"}};
      document.dispatchEvent(new CustomEvent('log', {detail}));
    }
  }
});

//helper fxn
function moveTo(moveToCell, moveToCellId){
  var detail = {name: 'moveCells', info: {"from": selectedCellId, "to":moveToCellId}};
  document.dispatchEvent(new CustomEvent('log', {detail}));

  var newCellElement = Util.one("#sn"+moveToCellId);
  var cellContent = newCellElement.textContent;
  selectedCell = moveToCell;
  selectedCellId = moveToCellId;
  updateSelectedCellColor(selectedCell, selectedCellId);
  updatePalette(selectedCellId);
}

function updatePalette(cellId){
  var cellElement = Util.one("#sn"+cellId);
  var cellContent = cellElement.textContent;
  if (cellElement.classList.contains("sudoku-given")){
    setcurnumber(0);

  } else if (cellElement.classList.contains("sudoku-number")){
    if (cellContent !== ""){
      if (cellContent === "I"){
        setcurnumber(1);
      } else {
        setcurnumber(cellContent);
      }
    }
    else {
      setcurnumber(0);
    }
  }
}

function getIdInDirection(cellId, direction){
  var newCellId;
  if (direction === DIR.LEFT){
    newCellId = parseInt(cellId)-1;
  } else if (direction === DIR.RIGHT){
    newCellId = parseInt(cellId)+1;
  } else if (direction === DIR.UP){
    newCellId = parseInt(cellId)-Sudoku.N;
  } else if (direction === DIR.DOWN){
    newCellId = parseInt(cellId)+Sudoku.N;
  }
  return newCellId;
}

function getCellInDirection(cellId, direction){
  var newCellId = getIdInDirection(cellId, direction);
  var newCell = Util.one("#sc"+newCellId);
  var newNumber = Util.one("#sn"+newCellId);
  if (!outOfBounds(newCellId)){
    return [newCell, newCellId];
  }
  return [selectedCell, selectedCellId];
}

function updateSelectedCellColor(cell, cellId){
  var bodyStyles = window.getComputedStyle(document.body);
  var cells = Util.all('td.sudoku-cell');
  cells.forEach(function(element) {
    var newNumber = Util.one("#sn"+cellId);
    if (element !== cell){
      element.style.setProperty('--cell-color', '');
      element.classList.remove("blink");
    } else {
      if (newNumber.classList.contains("sudoku-given")){
        var gray = bodyStyles.getPropertyValue('--color-gray'); //get
        element.classList.remove("blink");

        cell.style.setProperty('--cell-color', gray);
      } else {
        var lightYellow = bodyStyles.getPropertyValue('--color-light-yellow'); //get
        cell.style.setProperty('--cell-color', lightYellow);
      }
    }
  });
}

function outOfBounds(cellId){
  return (cellId > Sudoku.S - 1) || (cellId < 0);
}

// This function generates or loads (from localStorage) puzzle #X,
// and makes it the current puzzle.
function setupgame(seed) {
  // If no seed is given, remember the last seed or take the default 1.
  if (!seed) { seed = loadseed(); }
  // Log an event for the new game.
  var detail = {name: 'setupgame', info: {seed: seed}};
  document.dispatchEvent(new CustomEvent("log", {detail}));
  // Remember this is the last seed played.
  saveseed(seed);
  // If there is already a saved game for this seed, load it.
  if (loadgame(storagename(seed))) { return; }
  // Otherwise generate one: make it quickly, and make it symmetric.
  var quick = false;
  var puzzle = Sudoku.makepuzzle(seed, quick, SYMMETRIC_PUZZLES);
  // Remember the moment this game was created as gentime.
  var gentime = (new Date).getTime();
  // Commit the game state to the URL.
  commitstate({
    puzzle: puzzle,
    seed: seed,
    answer: [],
    work: [],
    elapsed: 0,
    gentime: gentime,
  });
}


function updatePagination(){
  var numPagesShown = 3; //on each side
  var state = currentstate();
  var seed = state.seed; //current puzzle
  var minPage = Math.max(1, seed - numPagesShown);

  var pagination = Util.one('.pagination');

  //clear all pages
  while (pagination.firstChild) {
    pagination.removeChild(pagination.firstChild);
  }
  var a = document.createElement('a');
  a.addEventListener('click', (evt) => flippage(-seed+1));
  a.innerHTML = "Jump to 1";
  pagination.appendChild(a);

  a = document.createElement('a');
  a.addEventListener('click', (evt) => flippage(-1));
  a.innerHTML = "&laquo; Prev";
  pagination.appendChild(a);

  for (var i = minPage; i <= minPage + 2 * numPagesShown; i++){
    a = document.createElement('a');
    a.innerHTML = i;
    if (i == seed){
      a.classList.add("active");
    } else {
      if (gamesCompleted.has((i.toString()))){
        a.classList.add("completed");
      }
    }
    a.addEventListener('click', function(e){
      var pageNumber = parseInt(e.target.innerHTML);
      flippage(pageNumber - seed);
    });
    pagination.appendChild(a);
  }

  a = document.createElement('a');
  a.addEventListener('click', (evt) => flippage(1));
  a.innerHTML = " Next &raquo;";
  pagination.appendChild(a);

}
/////////////////////////////////////////////////////////////////////////////
// URL hash state management
/////////////////////////////////////////////////////////////////////////////

// Retrieve current state from URL.

function currentstate() {
  return decodeboardstate(gethashdata());
}

// Save state in URL and localstorage.
function commitstate(state) {
  // Automatically update elapsed time unless already solved.
  var now = (new Date).getTime();
  if (state.gentime > starttime) {
    starttime = state.gentime;
  }
  if (!victorious(state) || !victorious(currentstate())) {
    state.elapsed = (now - starttime);
  }
  // Update the url (may trigger a redraw).
  sethashdata(encodeboardstate(state));
  // Save the state in localStorage also.
  savestate(storagename(state.seed), state);
}

// Parses a url-parameter-style string after the current URL hash parts.

function gethashdata() {
  var result = {};
  window.location.hash.replace(/^\W*/, '').split('&').forEach(function (pair) {
    if (pair === '') return;
    var parts = pair.split('=');
    result[parts[0]] = parts[1] && decodeURIComponent(
      parts[1].replace(/\+/g, ' '));
    });
    return result;
  }

  // Sets a url-parameter-style string as the hash part of a url.
  function sethashdata(data) {
    var urlData = Object.keys(data).map(function(key) {
      return key + '=' + data[key];
    }).join('&');
    if (!window.location.hash && window.history.replaceState) {
      // Overwrite a hashless history entry.
      window.history.replaceState(null, null, '#' + urlData);
    } else {
      // If there is already a hash, create a history entry as usual.
      window.location.hash = urlData;
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // State serialization
  /////////////////////////////////////////////////////////////////////////////

  // Encodes the game state as a set of scalars, suitable for storing in a URL.
  function encodeboardstate(state) {
    // puzzle: a list of N^2 nulls and numbers from 0-(N-1) for given numbers.
    var result = {
      puzzle: encodepuzzle(state.puzzle)
    }
    // answer: a list of N^2 nulls and numbers from 0-(N-1) for written numbers.
    if ('answer' in state) { result.answer = encodepuzzle(state.answer); }
    // work: a list of N^2 bitmasks from 0-(2^N-1) for small numbers.
    if ('work' in state) { result.work = arraytobase64(state.work); }
    // seed: the puzzle number; 1 is the first page puzzle.
    if ('seed' in state) { result.seed = state.seed; }
    // gentime: when the puzzle was created, unix time milliseconds.
    if ('gentime' in state) { result.gentime = state.gentime; }
    // elapsed: number of milliseconds the user has actively spent on the puzzle.
    if ('elapsed' in state) { result.elapsed = state.elapsed; }
    // size: 2 for 4x4 boards, 3 for 9x9 boards.
    result.size = Sudoku.B;
    return result;
  }

  // Decodes game state from a set of scalars, e.g., from a URL.
  function decodeboardstate(data) {
    if ('size' in data) {
      // Do not load state from an incompatible size.
      if (Sudoku.B != data.size) {
        data = {}
      }
    }
    var puzzle = decodepuzzle('puzzle' in data ? data.puzzle : '');
    var answer = decodepuzzle('answer' in data ? data.answer : '');
    var work = base64toarray('work' in data ? data.work : '');
    var result = {
      puzzle: puzzle,
      answer: answer,
      work: work
    };
    if ('seed' in data) { result.seed = data.seed; }
    if ('gentime' in data) { result.gentime = data.gentime; }
    if ('elapsed' in data) { result.elapsed = data.elapsed; }
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // Render game state
  /////////////////////////////////////////////////////////////////////////////

  // Redraws the sudoku board.  If 'pos' is passed, only that square is drawn.

  function redraw(givenstate, pos) {
    var state = givenstate ? givenstate : currentstate();
    var startpos = 0;
    var endpos = Sudoku.S;
    if (typeof pos != 'undefined') { startpos = pos; endpos = pos + 1; }
    var puzzle = state.puzzle;
    var answer = state.answer;
    var work = state.work;
    var victory = victorious(state);
    var seed = state.seed;

    updatePagination();
    updateSelectedCellColor(selectedCell, selectedCellId);
    // Set the title of the puzzle.
    var title = seed ? ('Puzzle #' + seed) : 'Custom Puzzle';
    Util.one('#grade').textContent = title;
    // Show appropriate victory UI.
    if (victory) {
      runningtime = false;
      Util.one('.timer').textContent = formatelapsed(state.elapsed);
      if (!gamesCompleted.has(seed)){
        gamesCompleted.add(seed);
      }
    } else {
      Util.css(Util.one('#victory'), {display: 'none'});
    }
    // Render timer UI
    Util.css(Util.one('.progress'), {display: victory ? 'none' : 'inline'});
    Util.css(Util.one('.finished'), {display: victory ? 'inline' : 'none'});
    if (!victory) {
      Util.one('.timer').textContent = formatelapsed((new Date).getTime() - starttime);
    }
    // Hide the timer for puzzle #1.
    Util.css(Util.one('.timescore'), {visibility: state.seed == 1 && !victory ? 'hidden' : 'visible'});
    // If the timer should be running but it is not, get it going.
    if (!victory && !runningtime) {
      runningtime = true;
      updatetime();
    }
    // Run through the sudoku board and render each square.
    for (var j = startpos; j < endpos; j++) {
      if (puzzle[j] !== null) {
        // Render a given-number in bold from the "puzzle" state.
        var square = Util.one('#sn' + j);
        square.className = 'sudoku-given';
        square.textContent = puzzle[j] + 1;
      } else {
        if (answer[j] !== null || work[j] == 0) {
          // Render an answered-number in pencil from the "answer" state.
          var square = Util.one('#sn' + j);
          square.className = 'sudoku-answer';
          if (answer[j] === null){
            square.textContent = '';
          } else {
            square.textContent = handglyph(answer[j] + 1);
          }
        } else {
          // Render a grid of mini-numbers from the "work" state.
          var text = '<table class="sudoku-work-table">';
          for (var n = 0; n < Sudoku.N; n++) {
            if (n % Sudoku.B == 0) { text += '<tr>'; }
            text += '<td><div>' +
            ((work[j] & (1 << n)) ? handglyph(n + 1) : '&nbsp;') +
            '</div></td>';
            if (n % Sudoku.B == Sudoku.B - 1) { text += '</tr>'; }
          }
          text += '</table>'
          var square = Util.one('#sn' + j);
          square.className = 'sudoku-work';
          square.innerHTML = text;
        }
      }
    }
  }


  // Makes a handwritten number, handling a glyph substitution.
  function handglyph(text) {
    // The "1" doesn't look as one-like as the capital-I in Handlee.
    if ('' + text === '1') { return 'I'; }
    return text;
  }


  /////////////////////////////////////////////////////////////////////////////
  // Number palette interactions
  /////////////////////////////////////////////////////////////////////////////

  Util.events(document, {
    "click": function(evt) {
      var select = evt.target.closest("td.numberkey-cell");
      if (select) {
        // Clicks in the number palette.
        var num = parseInt(select.id.substr(2));
        setcurnumber(num);
        evt.stopPropagation();
      } else {
        // Clicks outside other regions set the number palette to 'eraser'.
        // setcurnumber(0);
        evt.stopPropagation();
      }
      hidepopups();
    }
  });


  /////////////////////////////////////////////////////////////////////////////
  // Sudoku board interactions
  /////////////////////////////////////////////////////////////////////////////

  Util.events(document, {
    // Defeats right-click context menu.
    "contextmenu": function(evt) {
      if (DISABLE_CONTEXTMENU) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    },

    // Handle sudoku cell clicks on mousedown.
    "mousedown": function(evt) {
      clearHint();
      var square = evt.target.closest('td.sudoku-cell');
      evt.preventDefault();
      hidepopups();
      if (square) {
        selectedCell = square;
        selectedCellId = square.id.match(/\d+$/)[0];
        updateSelectedCellColor(selectedCell, selectedCellId);
        updatePalette(selectedCellId);
        var pos = parseInt(square.id.substr(2));
        var state = currentstate();
        // Ignore the click if the square is given in the puzzle.
        if (state.puzzle[pos] !== null) return;
        // Internally we store "1" as "0".
        var num = curnumber - 1;
        if (num == -1) {
          // Erase this square.
          state.answer[pos] = null;
          state.work[pos] = 0;
          var detail = {name: 'eraserUsed', info: {"how": "mouse"}};
          document.dispatchEvent(new CustomEvent('log', {detail}));

        } else if (isalt(evt)) {
          // Undiscoverable: write small numbers if ctrl is pressed.
          state.answer[pos] = null;
          state.work[pos] ^= (1 << num);
        } else if (isalt(evt)) {
          // Undiscoverable: write small numbers if ctrl is pressed.
          state.answer[pos] = null;
          state.work[pos] ^= (1 << num);
        } else {
          // Set the number
          state.answer[pos] = num;
          state.work[pos] = 0;
          // Update elapsed time immediately, to avoid flicker upon victory.
          if (victorious(state)) {
            var now = (new Date).getTime();
            if (state.gentime > starttime) {
              starttime = state.gentime;
            }
            state.elapsed = (now - starttime);
            // Log the exact moment, along with the elapsed time in ms.
            var detail = {name: 'victory', info: {
              elapsed: state.elapsed,
              seed: currentstate().seed
            }};
            document.dispatchEvent(new CustomEvent("log", {detail}));
          }
        }
        // Immediate redraw of just the keyed cell.
        redraw(state, pos);

        // Commit state after a timeout
        setTimeout(function() {
          commitstate(state);
        }, 0);
      }
    },

    // Defeats normal sudoku-cell click-handling on mouseup.
    "click": function(evt) {
      var square = evt.target.closest('td.sudoku-cell');
      if (square) {
        evt.stopPropagation();
      }
    }
  });

  function update(square, evt){
    if (square) {
      selectedCell = square;
      selectedCellId = square.id.match(/\d+$/)[0];
      updateSelectedCellColor(selectedCell, selectedCellId);
      updatePalette(selectedCellId);
      var pos = parseInt(square.id.substr(2));
      var state = currentstate();
      // Ignore the click if the square is given in the puzzle.
      if (state.puzzle[pos] !== null) return;
      // Internally we store "1" as "0".
      var num = curnumber - 1;
      if (num == -1) {
        // Erase this square.
        state.answer[pos] = null;
        state.work[pos] = 0;
      } else if (isalt(evt)) {
        // Undiscoverable: write small numbers if ctrl is pressed.
        state.answer[pos] = null;
        state.work[pos] ^= (1 << num);
      } else if (isalt(evt)) {
        // Undiscoverable: write small numbers if ctrl is pressed.
        state.answer[pos] = null;
        state.work[pos] ^= (1 << num);
      } else {

        // Set the number
        state.answer[pos] = num;
        state.work[pos] = 0;
        // Update elapsed time immediately, to avoid flicker upon victory.
        if (victorious(state)) {
          var now = (new Date).getTime();
          if (state.gentime > starttime) {
            starttime = state.gentime;
          }
          state.elapsed = (now - starttime);
          // Log the exact moment, along with the elapsed time in ms.
          var detail = {name: 'victory', info: {
            elapsed: state.elapsed,
            seed: currentstate().seed
          }};
          document.dispatchEvent(new CustomEvent("log", {detail}));
        }
      }
      // Immediate redraw of just the keyed cell.
      redraw(state, pos);

      // Commit state after a timeout
      setTimeout(function() {
        commitstate(state);
      }, 0);
    }
  }
  // Detects if a modifier key is pressed.
  function isalt(evt) {
    return (evt.which == 3) || (evt.ctrlKey) || (evt.shiftKey);
  }

  // Detects if a modifier key is pressed.
  function istab(evt) {
    return (evt.which == 3) || (evt.ctrlKey) || (evt.shiftKey);
  }

  /////////////////////////////////////////////////////////////////////////////
  // Button handling
  /////////////////////////////////////////////////////////////////////////////
  function clearHint(){
    var cells = Util.all('td.sudoku-cell');
    cells.forEach(function(element) {
      element.classList.remove("showHint");
      element.classList.remove("showMistake");
    });
  }

  function showHint(){
    hidepopups();
    var state = currentstate();
    var sofar = boardsofar(state);
    var hint = SudokuHint.hint(state.puzzle, state.answer, state.work)
    if (hint !== null){
    if (hint.hint === "singlenumdirect"){
      var reduced = hint.reduced[0];
      var reducedCell = Util.one("#sc"+reduced); //Selected cell element
      reducedCell.classList.add("showHint");
    }
    if (hint.hint === "mistakes"){
      var error = hint.errors[0];
      var errorCell = Util.one("#sc"+error); //Selected cell element
      errorCell.classList.add("showMistake");
    }
    if (hint.hint === "mistakes"){
      var error = hint.errors[0];
      var errorCell = Util.one("#sc"+error); //Selected cell element
      errorCell.classList.add("showMistake");
    }
    if (hint.hint === "conflicts"){
      hint.errors.forEach(function(e) {
        var errorCell = Util.one("#sc"+e); //Selected cell element
        errorCell.classList.add("showMistake");
      });
    }
  }
  }

  Util.events(document, {
    "DOMContentLoaded": function(evt) {
      // Handles the next button.
      // Util.one('#nextbutton').addEventListener('click', (evt) => flippage(1));
      //
      // // Handles the previous button.
      // Util.one('#prevbutton').addEventListener('click', (evt) => flippage(-1));

      // Handles the show hint button.
      Util.one('#hintbutton').addEventListener('click', showHint);
      Util.one('#clearbutton').addEventListener('click', clearHint);
      Util.one('#checkbutton').addEventListener('click', clearHint);

      // Handles the clear button.
      Util.one('#clearbutton').addEventListener('click', (evt) => {
        hidepopups();
        var state = currentstate();
        var cleared = {puzzle: state.puzzle, seed: state.seed,
          answer:[], work:[], gentime: (new Date).getTime()};
          commitstate(cleared);
        });

        Util.events(Util.one('#checkbutton'), {
          // Depressing the "check" button.
          "mousedown touchstart": function(evt) {
            hidepopups();
            var state = currentstate();
            var sofar = boardsofar(state);
            // Check for conflicts.
            var conflicts = SudokuHint.conflicts(sofar);
            if (conflicts.length == 0) {
              // We are all good so far - and maybe have a win.
              showpopup(countfilled(sofar) == Sudoku.S ? '#victory' : '#ok');
            } else {
              // Oops - there is some mistake.
              showpopup('#errors');
            }
            evt.stopPropagation();
          },

          // Releasing the "check" button.
          "mouseup mouseleave touchend": function(evt) {
            if (Util.one('#victory').style.display != 'none') {
              return;
            }
            hidepopups();
            var state = currentstate();
            redraw(state);
          },

          // Defeat normal click handliing for the "check" button.
          "click": function(evt) {
            if (Util.one('#victory').style.display != 'none') {
              evt.stopPropagation();
            }
          }
        });
      },
    });



    // Increments or decrements the seed, then sets up that game.
    function flippage(skip) {
      var state = currentstate();
      var seed = parseInt(state.seed);
      if (seed >= 1 && seed <= 1e9) {
        savestate(storagename(seed), state);
      }
      seed += skip;
      if (!(seed >= 1 && seed <= 1e9)) {
        seed = 1;
      }
      setupgame(seed);
      //set first selected cell to upper-leftmost cell
      selectedCell = Util.one("#sc0"); //Selected cell element
      selectedCellId = 0; //Keeps track of the number of the selected cell
      redraw();
      updateSelectedCellColor(selectedCell, selectedCellId);

    }


    /////////////////////////////////////////////////////////////////////////////
    // Transient UI: popups, focus, selection, timer
    /////////////////////////////////////////////////////////////////////////////

    // Set the currently-selected number.  Zero is the eraser.

    function setcurnumber(num) {
      Util.all('td.numberkey-cell').forEach(div => div.classList.remove('selected'));
      Util.one('#nk' + num).classList.add('selected');
      curnumber = num;
    }

    // Dismiss popup messages.

    function hidepopups() {
      Util.css(Util.all('.sudoku-popup'), {display: 'none'});
    }

    // Unhide the popup with a given id.

    function showpopup(id) {
      var velt = Util.one(id);
      Util.css(velt, {
        display: 'block',
        left: '50%',
        top: '50%'
      })
    }

    // Format timer text.

    function formatelapsed(elapsed) {
      if (!(elapsed >= 0)) { return '-'; }
      var seconds = Math.floor(elapsed / 1000);
      var minutes = Math.floor(seconds / 60);
      var hours = Math.floor(minutes / 60);
      seconds -= minutes * 60;
      minutes -= hours * 60;
      var formatted = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
      if (hours > 0) {
        formattted = hours + ':' + (minutes < 10 ? '0' : '') + formatted;
      }
      return formatted;
    }

    // The countdown timer redraws itself using this function.

    function updatetime() {
      if (runningtime && Util.one('.timescore').style.visibility !== 'hidden') {
        Util.one('.timer').textContent = formatelapsed((new Date).getTime() - starttime);
        setTimeout(updatetime,
          1001 - (((new Date).getTime() - starttime) % 1000));
        } else {
          runningtime = false;
        }
      }


      /////////////////////////////////////////////////////////////////////////////
      // Win conditions
      /////////////////////////////////////////////////////////////////////////////

      // Returns an array with one entry per puzzle square, containing
      // null for any unfilled square, and a number from 0-(N-1) for any
      // square that was filled by the user or given as part of the puzzle.

      function boardsofar(state) {
        var sofar = state.puzzle.slice();
        for (var j = 0; j < Sudoku.S; j++) {
          if (state.answer[j] !== null) sofar[j] = state.answer[j];
        }
        return sofar;
      }

      // Counts the number of squares that have been filled in, total.

      function countfilled(board) {
        var count = 0;
        for (var j = 0; j < Sudoku.S; j++) {
          if (board[j] !== null) count += 1;
        }
        return count;
      }

      // Checks for victory.

      function victorious(state) {
        var sofar = boardsofar(state);
        if (countfilled(sofar) != Sudoku.S) return false;
        if (SudokuHint.conflicts(sofar).length != 0) return false;
        return true;
      }


      /////////////////////////////////////////////////////////////////////////////
      // localStorage handling
      /////////////////////////////////////////////////////////////////////////////

      // The localStorage key used for this game.

      function storagename(seed) {
        return 'sudoku' + location.pathname.replace(/[\W]+/g, '-') + '-' + seed;
      }

      // Tries to load a saved game from a localStorage key, then commits
      // the state to the URL (triggering a re-render). False if not found.

      function loadgame(name) {
        var state = loadstate(name);
        if (!state) return false;
        if (!state.puzzle || !state.puzzle.length) return false;
        if ('elapsed' in state) {
          starttime = (new Date).getTime() - state.elapsed;
        }
        commitstate(state);
        return true;
      }

      // Loads JSON data from localStorage, or null if not found.

      function loadstate(name) {
        if (!USE_LOCAL_STORAGE ||
          !('localStorage' in window) || !('JSON' in window) ||
          !(name in window.localStorage)) {
            return null;
          }
          var data = localStorage[name];
          var state = JSON.parse(data);
          return state;
        }

        // Saves the passed data to a localStorage key as JSON.

        function savestate(name, state) {
          if (!USE_LOCAL_STORAGE ||
            !('localStorage' in window) || !('JSON' in window)) {
              return;
            }
            localStorage[name] = JSON.stringify(state);
          }

          // Remembers the last saved seed.

          function loadseed() {
            return loadstate(storagename('seed')) || 1;
          }

          // Saves the seed being played.

          function saveseed(seed) {
            savestate(storagename('seed'), seed);
          }



          /////////////////////////////////////////////////////////////////////////////
          // Simple string serialization for number arrays
          /////////////////////////////////////////////////////////////////////////////

          // Encodes an sparse array of small integers as a short string.

          function encodepuzzle(puzzle) {
            if (!puzzle) return '';
            var result = [];
            for (var j = 0; j < puzzle.length; j++) {
              result.push(puzzle[j] === null ? 0 : puzzle[j] + 1);
            }
            return result.join('');
          }

          // Decodes an array that was encoded by encodepuzzle.

          function decodepuzzle(str) {
            var puzzle = [];
            var c = 0;
            for (var j = 0; j < str.length; j++) {
              var num = str.charCodeAt(j) - '0'.charCodeAt(0);
              puzzle.push(num == 0 ? null : (num - 1));
            }
            for (; j < Sudoku.S; j++) {
              puzzle.push(null);
            }
            return puzzle;
          }

          // Encodes a nubmer less that 4096 in base64.

          function shorttobase64(int18) {
            return base64chars[(int18 >> 6) & 63] +
            base64chars[int18 & 63];
          }

          // Decodes a nubmer less that 4096 in base64.

          function base64toshort(base64, index) {
            return (base64chars.indexOf(base64.charAt(index)) << 6) +
            base64chars.indexOf(base64.charAt(index + 1));
          }

          // Encodes an array of numbers less than 4096 in base64, skipping end zeros.

          function arraytobase64(numbers) {
            var result = [];
            for (var end = numbers.length; end > 0; end--) {
              if (numbers[end - 1]) break;
            }
            for (var j = 0; j < end; j++) {
              result.push(shorttobase64(numbers[j]));
            }
            return result.join('');
          }

          // Decodes an array of numbers less than 4096 in base64, padding end zeros.

          function base64toarray(base64) {
            var result = [];
            for (var j = 0; j + 1 < base64.length; j += 2) {
              result.push(base64toshort(base64, j));
            }
            for (j /= 2; j < Sudoku.S; j++) {
              result.push(0);
            }
            return result;
          }

          // Constant to set up for use by encoders above.
          var base64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
          "abcdefghijklmnopqrstuvwxyz" +
          "0123456789" +
          "-_";


          /////////////////////////////////////////////////////////////////////////////
          // Static HTML construction.
          /////////////////////////////////////////////////////////////////////////////

          // Generates HTML for a not-filled-in NxN Sudoku table.
          // The function redraw() will fill this in based on the current state.

          function boardhtml() {
            var text = "<table class=sudoku id=grid cellpadding=1px>\n";
            text += "<tr><td colspan=13 class=sudoku-border>" +
            "<img class=sudoku-border></td></tr>\n";
            for (var y = 0; y < Sudoku.N; y++) {
              text += "<tr>"
              text += "<td class=sudoku-border></td>"
              for (var x = 0; x < Sudoku.N; x++) {
                var c = y * Sudoku.N + x;
                text += "<td class=sudoku-cell id=sc" + c + ">" +
                "<div class=sudoku-border>" +
                "<div class=sudoku-number id=sn" + c + ">" +
                "&nbsp;</div></div>";

                if (x % Sudoku.B == Sudoku.B - 1) text += "<td class=sudoku-border></td>";
              }
              text += "</tr>\n";
              if (y % Sudoku.B == Sudoku.B - 1) {
                text += "<tr><td colspan=13 class=sudoku-border>" +
                "<img class=sudoku-border></td></tr>\n";
              }
            }
            text += "<tr><td colspan=" + Sudoku.N + " id=caption></td></tr>\n";
            text += "</table>\n";
            return text;
          }

          // Generates HTML for the number palette from 1 to N, plus an eraser.

          function numberkeyhtml() {
            var result = '<table class=numberkey>';
            for (var j = 1; j <= Sudoku.N; ++j) {
              result += '<tr><td class=numberkey-cell id=nk' + j + '>' +
              '<div class="sudoku-answer nk' + j + '">' +
              handglyph(j) + '</div></td></tr>';
            }
            result += '<tr><td class=numberkey-cell id=nk0>' +
            '<div class="eraser nk0">' +
            '&#xf12d;</div></td></tr>';
            result += '</table>';
            return result;
          }

          // Pours generated HTML into the HTML page.

          function setup_screen() {
            var center = Util.one('#centerlayout');
            center.innerHTML = boardhtml() + center.innerHTML;
            Util.one('#leftlayout').innerHTML = numberkeyhtml();
          }
