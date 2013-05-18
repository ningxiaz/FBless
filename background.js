/**
 *  background JS for FBless
 *  ningxiaz@stanford.edu
 */

// yogurt background launched
console.log("[FBless] Background page fired");

// attach listeners to tab actions
attach_tab_listeners();

// attach listeners to window actions
attach_window_listeners();

// attach listener to app icon
//attach_browser_action();

// attach listener to content scripts
//attach_content_script_listeners();
attach_popup_script_listeners();

// this object records the last attention from a web browser tab
var last_attention = {
	domain: "",
	url: "",
	time_start : "",
	time_end : "",
};


// temporary variables to keep the current state of the web browsers
var app_page_addr = "app.html";
var fb_domain = "facebook.com";
var app_page_tab_id = 0;
var current_highlight_tab_index = 0;
var log_level = 3;
var yogurt_settings;
var time_so_far = 0;
var goal_failed_date = "";

//for storage variables
var storage = chrome.storage.local;

//set last sent date if undefined, which means first time to use this plug in
if(storage.last_date_sent == undefined){
	console.log("First time usage, set default report status");
	var today = new Date();
	var yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);	
	
	//save to local storage
	storage.last_date_sent = yesterday;

	//also save first day of usage
	storage.first_day = today;
}

//goal is not set, default to be 30 minutes
if(storage.goal == undefined){
	storage.goal = 30;
}

function check_goal_failed(){
	console.log("Checking goal!!!");
	var today = x_days_ago_date(0);

	if(today != goal_failed_date){
		var fb_time = 0;
		query_attention_by_domain_on_date(today,fb_domain,function(results){
			for(var r =0; r<results.length; r++){
				fb_time += results[r].life_duration;
			}

			fb_time = Math.round(fb_time/1000);//in seconds
			if(fb_time > storage.goal*60){
				console.log("AHHHHHH Goal failed!");
				goal_failed_date = today;
			}
		});
	}
}

// generate user attention from a tab/domain
function gen_attention(full_url, time){

	// only preserve site name
	domain_trimed = get_domain(full_url);

	// ignore devtool window and chrome new tab and chrome configuration pages
	if(domain_trimed==""){
		domain_trimed = "New tab";
	}

	// ignore if attention does not change
	if (domain_trimed == last_attention.domain){
		return;
	}

	// update the end time for last attention and get ready to start a new attention
	last_attention.time_end = time;
	//save attention to database
	save_last_attention(time);

	//see if it's a Facebook visit, if so, check whether it exceeds limit!
	if(last_attention.domain == fb_domain){
		check_goal_failed();
	}

	// refresh last attention
	//console.log("Current: " + domain_trimed +"  at " + time.toISOString());
	last_attention.domain = domain_trimed;
	last_attention.url = full_url;
	last_attention.time_start = time;
}

// print stats for last attention
function save_last_attention(time){
	console.log("Stats: "
		+ last_attention.domain
		+ " time_start:" + last_attention.time_start
		+ " time_end:" + last_attention.time_end
	);

	// build a new attention object compatable with the database
	if(last_attention.time_start!=""){
		var attn = new Attention();
		Attention.init_with_last_attention(attn, last_attention);
		Attention.save(attn);
		console.log(attn);
	}
	// update_app_page(last_attention);
}

// handle multiple broser windows and the condition where all window lose focus
function attach_window_listeners(){
	//when a window is created
	chrome.windows.onCreated.addListener(function(windowId) {
		console.log('new window created, check report status');

		var last_date_sent = storage.last_date_sent;
		console.log(last_date_sent);

		var today = new Date();
		var yesterday = new Date();
		yesterday.setDate(today.getDate() - 1);

		//first time usage, set yesterday as default
		if(last_date_sent == undefined){	
			//save to local storage
			storage.last_date_sent = yesterday;
			return;
		}

		//the user is not logged in yet, don't need to worry about report
		if(storage.user == undefined){
			return;
		}

		var test = new Date();
		test.setDate(last_date_sent.getDate());

		while(true){
			test.setDate(test.getDate() + 1);
			//all date reports are sent except today, which is still in progress!
			if(same_day(test, today)){
				console.log("no need to send report now");
				return;
			}

			send_daily_report(test);
		}

	});

	// check if window focus changed
	chrome.windows.onFocusChanged.addListener(function(windowId) {
		
		// window lost focus
		if(windowId == chrome.windows.WINDOW_ID_NONE){
			gen_attention("http://not_in_browser", new Date());
			console.log("not in browser generated!");
		}else{
			chrome.windows.getCurrent({populate:true}, function(window){
				chrome.tabs.query({windowId:window.id,highlighted:true}, function(tabs){
					for(var t=0;t<tabs.length;t++){
						//console.log(tabs[t].url);
						gen_attention(tabs[t].url, new Date());
						break; // because only one tab can be highlighted
					}
				})
			});
		}
		
	});
}

function send_daily_report(date){
	console.log("ready to send daily report for "+date.toDateString());

	var query_date = format_query_date(date);
	var fb_time = 0;
	var total_time = 0;

	//query facebook data
	query_attention_by_domain_on_date(query_date,fb_domain,function(results){
		for(var r =0; r<results.length; r++){
			fb_time += results[r].life_duration;
		}

		query_attention_by_date(query_date, function(results){
			for(var r =0; r<results.length; r++){
				if(results[r].tab_domain != "not_in_browser"){
					total_time += results[r].life_duration;
				}
			}

			//all time information is ready, send via AJAX
			var report = {user_id: storage.user.fb_id, date: query_date, fb_time: fb_time, total_time: total_time};
			//console.log(report);
			ajax_send_report(report, date);
		});
	});

}

function ajax_send_report(report, date){
    var jsonp_url = "http://fbless.herokuapp.com/save_report?user_id="+report.user_id+"&date="+report.date+"&fb_time="+report.fb_time+"&total_time="+report.total_time;

	var xhr = new XMLHttpRequest();
	xhr.open("GET", jsonp_url, true);
	xhr.onreadystatechange = function() {
	    if (xhr.readyState == 4) {
	       //handle the xhr response here
	       console.log("nice to hear back! " + xhr.responseText);

	       //update last date sent
	       storage.last_date_sent = date;
	  }
	}
	xhr.send();
}

// attach listeners to activities in web browser tabs
function attach_tab_listeners(){
	// listen to onCreated event
	chrome.tabs.onCreated.addListener(function(tab) {
		if(log_level == 3){
			console.log('tabs.onCreated --'
						+ ' window: ' + tab.windowId
						+ ' tab: '    + tab.id
						+ ' index: '  + tab.index
						+ ' url: '    + tab.url);
		}
		// we need this when user opens a new tab and then changes the url (the default tab is removed and a new tab is opened)
		gen_attention(tab.url,new Date());
	});

	// listen to onUpdated event
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
		//only capture update when page load is completed
		if (changeInfo.status == "loading"){
			return;
		}
		if(log_level == 3){
			console.log('tabs.onUpdated --'
						+ ' window: ' + tab.windowId
						+ ' tab: '    + tab.id
						+ ' index: '  + tab.index
						+ ' url: '    + tab.url
						+ ' changeinfo: ' + changeInfo.status);
		}
		// only create when user pay attention to current tab, don't use id because id might change once the tab is updated
		if(current_highlight_tab_index == tab.index){
			gen_attention(tab.url,new Date());
		}
		
	});

	// listen to onRemoved event
	chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
		//only capture remove then remove is complete
		if(removeInfo.isWindowClosing == true){
			return;
		}
		if(log_level == 3){
			console.log('tabs.onRemoved --'
					+ ' tab: '    + tabId
					+ ' removeInfo: ' + removeInfo.isWindowClosing);
		}
	});

	// listen to onHighlighted event
	chrome.tabs.onHighlighted.addListener(function(highlightInfo){
		if(log_level == 3){
			console.log('tabs.onHighlighted --'
					+ ' window: '    + highlightInfo.windowId
					+ ' tabs: ' + highlightInfo.tabIds);
		}
		try{
			chrome.tabs.get(highlightInfo.tabIds[0], function(tab){
				current_highlight_tab_index = tab.index;
				gen_attention(tab.url,new Date());
			});
		}catch(err){
			//tab window closed
		}
		
	});

}

function attach_popup_script_listeners(){
	chrome.extension.onMessage.addListener(
		function(request,sender,sendResponse){
			console.log(sender.tab? "from a content script:" + sender.tab.url : "from the extention");
			if(request.action == "get_stats"){
				var date = x_days_ago_date(0);
				query_attention_by_domain_on_date(date,request.domain,function(results){
					var dura = 0;
					for(var r =0; r<results.length; r++){
						dura += results[r].life_duration;
					}

					//if on Facebook
					if(last_attention.domain.indexOf(fb_domain) != -1){
						time_so_far = (new Date()) - last_attention.time_start;
					}
					else{
						time_so_far = 0;
					}

					sendResponse({
						"times":results.length,
						"duration":Math.round((dura + time_so_far)/1000)
					});
				});
			}

			if(request.action == "get_user"){
				var user = storage.user;

				if(user == undefined){
					sendResponse({
						"user": null
					});
				}
				else{
					sendResponse({
						"user": user
					});
				}
			}

			if(request.action == "set_user"){
				storage.user = request.user;

				sendResponse({
					"success": true
				});
			}

			if(request.action == "save_goal"){
				storage.goal = request.goal;
				check_goal_failed(); //check goal settings to see whether goal is failed

				sendResponse({
					"success": true
				});
			}

			if(request.action == "get_goal"){
				sendResponse({
					"goal": storage.goal
				});
			}

			if(request.action == "get_first_day"){
				sendResponse({
					"first_day": storage.first_day
				});
			}

			if(request.action == "get_daily_stats"){
				var date = new Date(request.date);
				var query_date = format_query_date(date);
				var fb_time = 0;
				var total_time = 0;
				var fb_times = 0;

				query_attention_by_domain_on_date(query_date, fb_domain, function(results){
					for(var r =0; r<results.length; r++){
						fb_time += results[r].life_duration;
					}

					fb_times = results.length;

					query_attention_by_date(query_date, function(results){
						for(var r =0; r<results.length; r++){
							if(results[r].tab_domain != "not_in_browser"){
								total_time += results[r].life_duration;
							}
						}

						sendResponse({
							"date": query_date,
							"fb_time": Math.round(fb_time/1000),
							"fb_times": fb_times,
							"total_time": Math.round(total_time/1000)
						});
					});

					
				});
			}
			return true;
			//sendResponse({"status":"ok"});
			
	});
	return true;
}

function query_attention_by_date(date,callback){
	Attention.query_date(date, function(results) {
		callback(results);
	});
}

function query_attention_by_domain_on_date(date, domain,callback){
	Attention.query_domain_on_date(date, domain, function(results) {
		callback(results);
	});
}
