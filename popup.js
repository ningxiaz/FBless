var duration = "";
var duration_timer = null;
var curr_domain = "";
var facebook_domain = "facebook.com";

$(document).ready(function(){
	console.log("[FBless] From console!");
	chrome.extension.sendMessage({"domain":facebook_domain ,"action":"get_stats"},function(response){
		console.log(response);
		$('.times').text((response.times == 0)? "1" : response.times);
		duration = response.duration;
		chrome.tabs.getSelected(null, function(tab) {
			curr_domain = get_domain(tab.url);

			//currently not on Facebook
			if(curr_domain.indexOf(facebook_domain) == -1){
				$(".time").text(secondsToTime(duration));
			}
			//currently on Facebook
			else{
				$(".time").text(secondsToTime(duration));
				duration_timer = setInterval(function(){
					duration = duration + 1;
					$(".time").text(secondsToTime(duration));
				},1000);
			}
		});

		
	});
});