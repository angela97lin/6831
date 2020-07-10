// A simple Google-spreadsheet-based event logging framework.
//
// This is currently set up to log every mousedown and keydown
// event, as well as any events that might be triggered within
// the app by triggering the 'log' event anywhere in the doc
// as follows:
//
// $(element).trigger('log', ['myevent', {key1: val1, key2: val2}]);

var ENABLE_NETWORK_LOGGING = false; // Controls network logging.
var ENABLE_CONSOLE_LOGGING = true; // Controls console logging.
var LOG_VERSION = 'A';             // Labels every entry with version: "A".

// These event types are intercepted for logging before jQuery handlers.
var EVENT_TYPES_TO_LOG = {
	mousedown: true,
	keydown: true
};

// These event properties are copied to the log if present.
var EVENT_PROPERTIES_TO_LOG = {
	which: true,
	pageX: true,
	pageY: true
};

// This function is called to record some global state on each event.
var GLOBAL_STATE_TO_LOG = function() {
	return {};
};

(function() {
	// A persistent unique id for the user.
	var uid = getUniqueId();

	// Hooks up all the event listeners.
	function hookEventsToLog() {
		// Set up low-level event capturing.  This intercepts all
		// native events before they bubble, so we log the state
		// *before* normal event processing.
		for (var event_type in EVENT_TYPES_TO_LOG) {
			document.addEventListener(event_type, logEvent, true);
		}

		// Once the page is loaded, show our own unique id.
		Util.events(document, {
			// Final initalization entry point: the Javascript code inside this block
			// runs at the end of start-up when the DOM is ready
			"DOMContentLoaded": function() {
				console.log('Your unique id is', uid);
				Util.one('#bottomtext').innerHTML = 'Logging to the network as <nobr>' + uid + '</nobr>';
			},
			// Listen to 'log' events which are triggered anywhere in the document.
			"log": function(evt) {
				var detail = evt.detail;
				logEvent(null, detail.name, detail.info);
			}
		});
	}

	// Returns a CSS selector that is descriptive of
	// the element, for example, "td.left div" for
	// a class-less div within a td of class "left".
	function elementDesc(elt) {
		if (elt == document) {
			return 'document';
		} else if (elt == window) {
			return 'window';
		}
		function descArray(elt) {
			var desc = [elt.tagName.toLowerCase()];
			if (elt.id) {
				desc.push('#' + elt.id);
			}
			for (var j = 0; j < elt.classList.length; j++) {
				desc.push('.' + elt.classList[j]);
			}
			return desc;
		}
		var desc = [];
		while (elt && desc.length <= 1) {
			var desc2 = descArray(elt);
			if (desc.length == 0) {
				desc = desc2;
			} else if (desc2.length > 1) {
				desc2.push(' ', desc[0]);
				desc = desc2;
			}
			elt = elt.parentElement;
		}
		return desc.join('');
	}

	// Parse user agent string by looking for recognized substring.
	function findFirstString(str, choices) {
		for (var j = 0; j < choices.length; j++) {
			if (str.indexOf(choices[j]) >= 0) {
				return choices[j];
			}
		}
		return '?';
	}

	// Genrates or remembers a somewhat-unique ID with distilled user-agent info.
	function getUniqueId() {
	  if (!('uid' in localStorage)) {
	    var browser = findFirstString(navigator.userAgent, [
	      'Seamonkey', 'Firefox', 'Chromium', 'Chrome', 'Safari', 'OPR', 'Opera',
	      'Edge', 'MSIE', 'Blink', 'Webkit', 'Gecko', 'Trident', 'Mozilla']);
	    var os = findFirstString(navigator.userAgent, [
	      'Android', 'iOS', 'Symbian', 'Blackberry', 'Windows Phone', 'Windows',
	      'OS X', 'Linux', 'iOS', 'CrOS']).replace(/ /g, '_');
	    var unique = ('' + Math.random()).substr(2);
	    localStorage['uid'] = os + '-' + browser + '-' + unique;
	  }
	  return localStorage['uid'];
	}

	// Log the given event.
	function logEvent(event, customName, customInfo) {
		var time = (new Date).getTime();
		var name = customName || event.type;
		// By default, monitor some global state on every event.
		var infoObj = GLOBAL_STATE_TO_LOG();
		// And monitor a few interesting fields from the event, if present.
		for (var key in EVENT_PROPERTIES_TO_LOG) {
			if (event) {
				if (key in event) {
					infoObj[key] = event[key];
				}
			}
		}
		// Let a custom event add fields to the info.
		if (customInfo) {
			infoObj = Object.assign(infoObj, customInfo);
		}
		var info = JSON.stringify(infoObj);
		var target = document;
		if (event) {
			var target = elementDesc(event.target);
		}
		var state = location.hash;

		if (ENABLE_CONSOLE_LOGGING) {
			console.log(uid, time, name, target, info, state, LOG_VERSION);
		}
		console.log("enabled network logging")

		if (ENABLE_NETWORK_LOGGING) {
			sendNetworkLog(uid, time, name, target, info, state, LOG_VERSION);
		}
	}

	// OK, go.
	if (ENABLE_NETWORK_LOGGING) {
		hookEventsToLog();
	}

})();

/////////////////////////////////////////////////////////////////////////////
// CHANGE ME:
// ** Replace the function below by substituting your own google form. **
/////////////////////////////////////////////////////////////////////////////
//
// 1. Create a Google form called "Network Log" at forms.google.com.
// 2. Set it up to have several "short answer" questions; here we assume
//    seven questions: uid, time, name, target, info, state, version.
// 3. Run googlesender.py (at goo.gl/jUkahv) to make a javascript
//    function that submits records directly to the form.
// 4. Put that function in here, and replace the current sendNetworkLog
//    so that your version is called to log events to your form.
//
// For example, the following code was written as follows:
// curl -sL goo.gl/jUkahv | python - https://docs.google.com/forms/d/1A...0/edit
//
// This preocess changes the ids below to direct your data into your own
// form and spreadsheet. The formid must be customized, and also the form
// field names such as "entry.1291686978" must be matched to your form.
// (The numerical field names for a Google form can be found by inspecting
// the form input fields.) This can be done manually, but since this is an
// error-prone process, it can be easier to use googlesender.py.
//
/////////////////////////////////////////////////////////////////////////////

// Network Logging - Calendar submission function
// submits to the google form at this URL:
//https://docs.google.com/forms/d/1Aq4PixH1acNzdqNfds8K-w2WkneddCh5krGHf7sUDF4/edit

//curl -sL goo.gl/jUkahv | python - https://docs.google.com/forms/d/1Aq4PixH1acNzdqNfds8K-w2WkneddCh5krGHf7sUDF4/edit
// Network Log submission function
// submits to the google form at this URL:
// docs.google.com/forms/d/1Aq4PixH1acNzdqNfds8K-w2WkneddCh5krGHf7sUDF4/edit
function sendNetworkLog(
    uid,
    time,
    name,
    target,
    info,
    state,
    version) {
  var formid = "e/1FAIpQLScTgowyOwZA2hhalzpiKLvOMH0M4YXCk5DgRT16oA3UOCMJJg";
  var data = {
    "entry.686313524": uid,
    "entry.1157774426": time,
    "entry.2086698982": name,
    "entry.1149597951": target,
    "entry.810141259": info,
    "entry.872730891": state,
    "entry.380175422": version
  };
	console.log("hello");

  var params = [];
  for (key in data) {
    params.push(key + "=" + encodeURIComponent(data[key]));
  }
  // Submit the form using an image to avoid CORS warnings.
  (new Image).src = "https://docs.google.com/forms/d/" + formid +
     "/formResponse?" + params.join("&");
}








// Network Logging - Calendar submission function
// submits to the google form at this URL:
// docs.google.com/forms/d/19bkuePohAipfHsq4XIOOrIVDAVrKWa4wL7GOIi0JjbM/edit

// function sendNetworkLog(
//     uid,
//     time,
//     name,
//     target,
//     info,
//     state,
//     version) {
// 	var formid = "e/1FAIpQLSdyb7EXSjlFgy06DzsdXtnNjQar9LuqyARAtmvKDcbk7YjLMA";
// 	var data = {
// 	  "entry.1656660557": uid,
// 	  "entry.541739178": time,
// 	  "entry.892515877": name,
// 	  "entry.253988900": target,
// 	  "entry.1188237291": info,
// 	  "entry.386309755": state,
// 	  "entry.204824055": version
// 	};
// 	var params = [];
// 	for (key in data) {
// 		params.push(key + "=" + encodeURIComponent(data[key]));
// 	}
// 	// Submit the form using an image to avoid CORS warnings.
// 	(new Image).src = "https://docs.google.com/forms/d/" + formid +
// 	   "/formResponse?" + params.join("&");
// }
//
// // DELETE THE FOLLOWING CODE WHEN YOU SET UP YOUR OWN FORM
// Util.events(document, {
// 	"DOMContentLoaded": function() {
// 		if (!/^web.mit.edu\/6.813/.test(location.host + location.pathname)) {
// 			window.sendNetworkLog = function() {
// 				console.log.apply(console, arguments);
// 			}
// 			var bottomtext = Util.one('#bottomtext');
// 			bottomtext.innerHTML = 'Not saving the log to the network';
// 			Util.css(bottomtext, {color: 'red'});
// 		}
// 	}
// });
