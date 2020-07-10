Util.events(document, {
	// Final initalization entry point: the Javascript code inside this block
	// runs at the end of start-up when the DOM is ready
	"DOMContentLoaded": function() {
        Util.one("#event-name").focus();
        Util.one("#all-day-event-checkbox").addEventListener("click", onAllDayChange, false);
        Util.one("#recurrent-event-type-selector").addEventListener("change", onRecurrentEventChange, false);
        Util.one("#recurrent-event-time-selector").addEventListener("change", onReccurentTimeChange, false);
    }
});

function onAllDayChange() {
    var allday = Util.one("#all-day-event-checkbox");
    if (allday.checked) {
        showAllDayEventOptions();
    } else {
        hideAllDayEventOptions();
    }
}

function onRecurrentEventChange(){
    var val = Util.one("#recurrent-event-type-selector").value
    hideRecurrentEventOptions();
    hideRecurrentEventDetails();
    
    if (val == "custom") {
        showRecurrentEventOptions();
    } else {
        resetAllRecurrentEventDetails();
    }

    if (val == ("none")) {
        hideRecurrentEventEndDetails();
    } else {
        showRecurrentEventEndDetails();
    }
}

function onReccurentTimeChange(){
    var val = Util.one("#recurrent-event-time-selector").value;
    hideRecurrentEventDetails();

    if (val == "day") {
        Util.one('#daily-recurrent-details').classList.remove("hidden");
    } else if (val == "week") {
        Util.one('#weekly-recurrent-details').classList.remove("hidden");
    } else if (val == "month") {
        Util.one('#monthly-recurrent-details').classList.remove("hidden");
    } else if (val == "year") {
        Util.one('#yearly-recurrent-details').classList.remove("hidden");
    }
}

// Functions to reset recurrent event interface
function hideRecurrentEventDetails() {
    Util.one('#daily-recurrent-details').classList.add("hidden");
    Util.one('#weekly-recurrent-details').classList.add("hidden");
    Util.one('#monthly-recurrent-details').classList.add("hidden");
    Util.one('#yearly-recurrent-details').classList.add("hidden");
}
function hideRecurrentEventOptions() {
    Util.one('#recurrent-event-details-line').classList.add("hidden");
    Util.one('#recurrent-event-details').classList.add("hidden");
}
function showRecurrentEventOptions() {
    Util.one('#recurrent-event-details-line').classList.remove("hidden");
    Util.one('#recurrent-event-details').classList.remove("hidden");
    Util.one('#daily-recurrent-details').classList.remove("hidden");
}
function resetAllRecurrentEventDetails() {
    Util.one('#recurrent-event-time-selector').value = 'day';
    Util.all('.weekday-checkbox').forEach(check => check.checked = false);
    Util.all('.day-checkbox').forEach(check => check.checked = false);
    Util.all('.month-checkbox').forEach(check => check.checked = false);
}
function showAllDayEventOptions() {
    Util.one('#start-time-row').classList.add("hidden");
    Util.one('#end-time-row').classList.add("hidden");
    Util.one('#all-day-event-row').classList.remove("hidden");
}
function hideAllDayEventOptions() {
    Util.one('#all-day-event-row').classList.add("hidden");
    Util.one('#start-time-row').classList.remove("hidden");
    Util.one('#end-time-row').classList.remove("hidden");
    Util.one('#all-day-event-date').value = '';
}
function showRecurrentEventEndDetails() {
    Util.one('#recurrent-event-end-date-row').classList.remove("hidden");
}
function hideRecurrentEventEndDetails() {
    Util.one('#recurrent-event-end-date-row').classList.add("hidden");
    Util.one('#recurrent-event-end-date').value = '';
}

// hacky way to get the button to accommodate size of hidden divs in Safari
function hideAndShowCreateEventButtom() {
    Util.one('#create-event-button').classList.add("hidden");
    Util.one('#create-event-button').classList.remove("hidden");
}