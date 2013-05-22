var user = null;
var first_day = null;
var cur_goal = 0;

$(document).ready(function(){
	chrome.extension.sendMessage({"action":"get_user"},function(response){
		user = response.user;
		//not logged in
		if(user == null){
			$('.not_login').show();
		}
		else{
			$('#goal_form').show();
			$('.stats').show();
		}
	});

	chrome.extension.sendMessage({"action":"get_goal"},function(response){
		//console.log(response);
		cur_goal = response.goal;
		$('.notice').html("Your current goal is <em>"+response.goal+"</em> minites :)");
	});

	$('#goal_form .submit').click(function(){
		var goal = $('#goal').val();
		if(!isNumber(goal)){
			$('.notice').html("That doesn't look like a number, plese input the number of minites ;)");
		}
		else{
			$('.notice').html("Saving...");
			chrome.extension.sendMessage({"action":"save_goal", "goal": goal},function(response){
				save_new_goal(goal);
			});
			
		}
	});

	fill_stats_table();
});

function save_new_goal(goal){
	var jsonp_url = "http://fbless.herokuapp.com/save_goal?user_id="+user.fb_id+"&goal="+goal;

	var xhr = new XMLHttpRequest();
	xhr.open("GET", jsonp_url, true);
	xhr.onreadystatechange = function() {
	    if (xhr.readyState == 4) {
	       //handle the xhr response here
	       console.log("nice to hear back! " + xhr.responseText);
	       cur_goal = goal;
		   $('.notice').html("Saved!");
	    }
	}
	xhr.send();
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function fill_stats_table(){
	var today = new Date();

	chrome.extension.sendMessage({"action":"get_first_day"},function(response){
		first_day = new Date(response.first_day);

		console.log(first_day);
		var i = new Date();
		i.setDate(first_day.getDate());

		while(true){
			chrome.extension.sendMessage({"action":"get_daily_stats", "date": i}, function(response){
				//console.log(response);
				if(response.fb_time > cur_goal*60){
					$('.stats').append("<div class=\"record\"><span class=\"date\">"+format_date(response.date)+"</span><span class=\"fb_times\">"+response.fb_times+"</span><span class=\"fb_time red\">"+secondsToTime(response.fb_time)+"</span><span class=\"total_time\">"+secondsToTime(response.total_time)+"</span></div>");
				}
				else{
					$('.stats').append("<div class=\"record\"><span class=\"date\">"+format_date(response.date)+"</span><span class=\"fb_times\">"+response.fb_times+"</span><span class=\"fb_time\">"+secondsToTime(response.fb_time)+"</span><span class=\"total_time\">"+secondsToTime(response.total_time)+"</span></div>");
				}
			});

			if(same_day(i, today)){
				return;
			}

			i.setDate(i.getDate() + 1);
		}
	});
}