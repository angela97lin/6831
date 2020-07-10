/**
 * Event Object
 * args start and end time are Javascript Date objects
 */

var CalendarEvent = function(name, loc, startTime, endTime) {
    Object.defineProperty(this, 'name', {value: name, writable: false});
    Object.defineProperty(this, 'loc', {value: loc, writable: false});
    Object.defineProperty(this, 'startTime', {value: startTime, writable: false});
    Object.defineProperty(this, 'endTime', {value: endTime, writable: false});

    this.endRepeat = "";
    this.repeatEvery = "";
    this.repeatOption = "";
    this.repeatOn = "[]";

    this.toString = function() {
        var eventString = "event:\n    name: " + name +
            "\n    location: " + loc + 
            "\n    start time: " + startTime.toString() + 
            "\n    end time: " + endTime.toString();
        if (this.repeatOption.length) {
            eventString += "\n    repeating every " + this.repeatEvery + " " + this.repeatOption + "s on " + this.repeatOn + 
                "\n    end repeat: " + this.endRepeat;
        }
        return eventString;
    }
};