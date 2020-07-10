// For simplicity this calendar has no backend.
// An event is created as an Event object with customizable parameters.

/////////////////////////////////////////////////////////////////////////////
// New Event Creation
/////////////////////////////////////////////////////////////////////////////
Util.events(document, {
	// Final initalization entry point: the Javascript code inside this block
	// runs at the end of start-up when the DOM is ready
	"DOMContentLoaded": function() {
        Util.one("#create-event-button").addEventListener("click", onAllDayChange, false);
    }
});

function onCreateRecurringClick(){
	if (checkInputs()) {
		var evt = createEvent();
		console.log("Event created:\n" + evt);
	}
}

function getWeeklyRepeatingDays() {
	var days = [];

	var weekdayIds = ['#weekday-sun', '#weekday-mon', '#weekday-tue', '#weekday-wed', '#weekday-thu', '#weekday-fri', 
		'#weekday-sat'];
	var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	for (i = 0; i < weekdayIds.length; i++) {
		if (Util.one(weekdayIds[i]).checked) {
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
		if (Util.one(monthdayIds[i]).checked) {
			days.push(i+1);
		}
	}

	return days;
}
function getYearlyRepeatingMonths() {
	var months = [];

	var monthIds = ['#year-jan', '#year-feb', '#year-mar', '#year-apr', '#year-may', '#year-jun', '#year-jul', 
		'#year-aug', '#year-sept', '#year-oct', '#year-nov', '#year-dec'];
	var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
	for (i = 0; i < monthIds.length; i++) {
		if (Util.one(monthIds[i]).checked) {
			months.push(monthNames[i]);
		}
	}

	return months;
}



function createEvent() {
	var eventName = Util.one('#event-name').value;
	var eventLocation = Util.one('#event-location').value;

	var startTime;
	var endTime;

	var allDayEvent = Util.one('#all-day-event-checkbox').checked;
	if (allDayEvent) {
		startTime = Util.one('#all-day-event-date').value;
		var year = startTime.getFullYear();
		var month = startTime.getMonth();
		var day = startTime.getDate();
		endTime = new Date(year, month, day, 23, 59, 59, 999);
	} else {
		startTime = Util.one('#event-start-date').value;
		endTime = Util.one('#event-end-date').value;
	}
	var evt = new CalendarEvent(eventName, eventLocation, startTime, endTime);

	var repeatOption = Util.one('#recurrent-event-type-selector').value;
	if (repeatOption == 'none') {
		return evt;
	}



	evt.repeatEvery = 1;
	evt.repeatOption = repeatOption;
	var endDate = Util.one('#recurrent-event-end-date').value;
	evt.endRepeat = endDate;



	if (repeatOption == 'custom') {
		repeatOption = Util.one('#recurrent-event-time-selector').value;
		var repeatEvery;
		var repeatOn;

		if (repeatOption == 'day') {
			repeatEvery = Util.one('#dayly-recurrent-freq').value;
		} else if (repeatOption == 'week') {
			repeatEvery = Util.one('#weekly-recurrent-freq').value;
			repeatOn = getWeeklyRepeatingDays();
			if (repeatOn.length == 0) {
				return evt;
			}
		} else if (repeatOption == 'month') {
			repeatEvery = Util.one('#monthly-recurrent-freq').value;
			repeatOn = getMonthlyRepeatingDays();
			if (repeatOn.length == 0) {
				return evt;
			}
		} else { // year
			repeatEvery = Util.one('#yearly-recurrent-freq').value;
			repeatOn = getYearlyRepeatingMonths();
			if (repeatOn.length == 0) {
				return evt;
			}
		}

		evt.repeatOption = repeatOption;
		evt.repeatEvery = repeatEvery;
		evt.repeatOn = repeatOn;
	}

	return evt;
}