// For simplicity this calendar has no backend.
// An event is displayed as a sentence below the event creation dialogue
// with the details of the event in readable English.


/////////////////////////////////////////////////////////////////////////////
// New Event Creation
/////////////////////////////////////////////////////////////////////////////
Util.events(document, {
	// Final initalization entry point: the Javascript code inside this block
	// runs at the end of start-up when the DOM is ready
	"DOMContentLoaded": function() {
        Util.one("#create-event-button").addEventListener("click", onCreateClick, false);
    }
});

function onCreateClick(){
	if (checkInputs()) {
		writeEventToScreen(getEventText());
	}
}

// End time must come after start time
function isValidEndTime() {
	var startTime = Util.one('#event-start-date').value;
	var endTime = Util.one('#event-end-date').value;
	var allDayEvent = Util.one('#all-day-event-checkbox').checked;
	if (!allDayEvent) {
		return !(endTime < startTime);
	}
    return true;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function checkInputs() {
	if (!isValidEndTime()) {
		writeEventToScreen('End date must come after start date.');
		return false;
	}

	var repeatOption = Util.one('#recurrent-event-type-selector').value;
	if (repeatOption == "custom") {
		var frequency = Util.one('#' + Util.one('#recurrent-event-time-selector').value + 'ly-recurrent-freq').value;
			if (!isNumeric(frequency)) {
				writeEventToScreen('Frequency must be a numeric value.');
				return false;
			}
	}

	var eventName = Util.one('#event-name').value;
	var allDayEvent = Util.one('#all-day-event-checkbox').checked;
	var allDayEventDate = Util.one('#all-day-event-date').value;
	var startTime = Util.one('#event-start-date').value;
	var endTime = Util.one('#event-end-date').value;
	if (!eventName) {
		writeEventToScreen('Please add event name')
		return false;
	}
	if (allDayEvent) {
		if (!allDayEventDate) {
			writeEventToScreen('Please add event date details');
			return false;
		}
	} else if (!startTime || !endTime) {
		writeEventToScreen('Please add event date details');
		return false;
	}



	return true;
}

// Functions for building the event string
function getWeeklyRepeatingDays() {
	var days = [];

	var weekdayIds = ['#weekday-sun', '#weekday-mon', '#weekday-tue', '#weekday-wed', '#weekday-thu', '#weekday-fri', 
		'#weekday-sat'];
	var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	for (i = 0; i < weekdayIds.length; i++) {
		if ((weekdayIds[i]).checked) {
			days.push(weekdays[i]);
		}
	}

	return days;
}
function getMonthlyRepeatingDays() {
	var days = [];

	var monthdayIds = ['#month-1', '#month-2', '#month-3', '#month-4', '#month-5', '#month-6', '#month-7', '#month-8',
		'#month-9', '#month-10', '#month-11', '#month-12', '#month-13', '#month-14', '#month-15', '#month-16',
		'#month-17', '#month-18', '#month-19', '#month-20', '#month-21', '#month-22', '#month-23', '#month-24',
		'#month-25', '#month-26', '#month-27', '#month-28', '#month-29', '#month-30', '#month-31'];
	for (i = 0; i < monthdayIds.length; i++) {
		if ((monthdayIds[i]).checked) {
			days.push(i+1);
		}
	}

	return days;
}
function getYearlyRepeatingMonths() {
	var months = [];

	var monthIds = ['#year-jan', '#year-feb', '#year-mar', '#year-apr', '#year-may', '#year-jun', '#year-jul', 
		'#year-aug', '#year-sept', '#year-oct', '#year-nov', '#year-dec'];
	var monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
	for (i = 0; i < monthIds.length; i++) {
		if ((monthIds[i]).checked) {
			months.push(monthsNames[i]);
		}
	}

	return months;
}

function getWeeklyRepeatingString(arr) {
	var eventString = 'on every ';
	for (i = 0; i < arr.length-1; i++) {
		eventString += arr[i] + ', ';
	}
	if (arr.length > 1) {
		eventString += 'and ';
	}
	eventString += arr[arr.length-1] + ' of the week ';
	return eventString;
}
function getMonthlyRepeatingString(arr) {
	var eventString = 'on the ';
	for (i = 0; i < arr.length-1; i++) {
		eventString += arr[i] + ', ';
	}
	if (arr.length > 1) {
		eventString += 'and ';
	}
	eventString += arr[arr.length-1] + ' of the month ';
	return eventString;
}
function getYearlyRepeatingString(arr) {
	var eventString = 'in ';
	for (i = 0; i < arr.length-1; i++) {
		eventString += arr[i] + ', ';
	}
	if (arr.length > 1) {
		eventString += 'and ';
	}
	eventString += arr[arr.length-1] + ' on the corresponding day of the month(s) ';
	return eventString;
}



function getEventText() {
	var eventName = Util.one('#event-name').value;
	var eventLocation = Util.one('#event-location').value;

	var eventString = 'Event created: ' + eventName + ' at ' + eventLocation + ', ';

	var allDayEvent = Util.one('#all-day-event-checkbox').checked;
	if (allDayEvent) {
		var eventDate = Util.one('#all-day-event-date').value;
		eventString += 'an all day event on ' + eventDate;
	} else {
		var startTime = Util.one('#event-start-date').value;
		var endTime = Util.one('#event-end-date').value;
		eventString += 'starting at ' + startTime + ' and ending at ' + endTime;
	}

	var repeatOption = Util.one('#recurrent-event-type-selector').value;
	if (repeatOption == 'none') {
		eventString += '.';
		return eventString;
	} else if (repeatOption == 'day') {
		eventString += ', repeating every day ';
	} else if (repeatOption == 'week') {
		eventString += ', repeating every week ';
	} else if (repeatOption == 'month') {
		eventString += ', repeating every month ';
	} else if (repeatOption == 'year') {
		eventString += ', repeating every year ';
	} else { // custom
		var frequencyOption = Util.one('#recurrent-event-time-selector').value;
		var frequency = 1;
		var repeatingUnits = [];
		if (frequencyOption == 'day') {
			frequency = Util.one('#dayly-recurrent-freq').value;
			eventString += ', ' + 'repeating every ' + frequency + ' day(s) ';
		} else if (frequencyOption == 'week') {
			frequency = Util.one('#weekly-recurrent-freq').value;
			repeatingUnits = getWeeklyRepeatingDays();
			eventString += ', ' + 'repeating every ' + frequency + ' week(s) ' + getWeeklyRepeatingString(repeatingUnits);
		} else if (frequencyOption == 'month') {
			frequency = Util.one('#monthly-recurrent-freq').value;
			repeatingUnits = getMonthlyRepeatingDays();
			eventString += ', ' + 'repeating every ' + frequency + ' month(s) ' + getMonthlyRepeatingString(repeatingUnits);
		} else { // year
			frequency = Util.one('#yearly-recurrent-freq').value;
			repeatingUnits = getYearlyRepeatingMonths();
			eventString += ', ' + 'repeating every ' + frequency + ' year(s) ' + getYearlyRepeatingString(repeatingUnits);
		}
	}

	var endDate = Util.one('#recurrent-event-end-date').value;
	eventString += 'until ' + endDate + '.';
	return eventString;
}

function writeEventToScreen(eventString) {
	Util.one('#new-event-text').innerHTML= eventString;
}