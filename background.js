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


// fetch setting
// get data from local storage
// var storage = chrome.storage.local;

// storage.get(function(items) {
//     yogurt_settings = items;
//     if (chrome.runtime.lastError) {
//       console.log('Error: ' + chrome.runtime.lastError.message);
//     } else {
//       console.log('Settings loaded');
//     }
//     var should_update_storage = false;
//     if (!yogurt_settings.hasOwnProperty('site_list')) {
//       should_update_storage = true;
//       yogurt_settings.site_list = DEFAULT_SITES;
//     }
//     if (!yogurt_settings.hasOwnProperty('color_theme')) {
//       should_update_storage = true;
//       yogurt_settings.color_theme = COLOR_CHOICES[0];
//     }
//     // update the storage when necessary
//     if (should_update_storage) {
// 		storage.set(yogurt_settings, function() {
// 		    if (chrome.runtime.lastError) {
// 		      console.log('Error: ' + chrome.runtime.lastError.message);
// 		    }else{
// 		      console.log("First time options saved from app.js");
// 		    }
// 		});
//     }
//  });

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
