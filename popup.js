var duration = "";
var duration_timer = null;
var curr_domain = "";
var facebook_domain = "facebook.com";
var user = null;
var cur_goal = 0;

$(document).ready(function(){
	console.log("[FBless] From console!");
	chrome.extension.sendMessage({"action":"get_user"},function(response){
		user = response.user;
		//not logged in
		if(user == null){
			$('.login').show();
		}
		else{
			$('.content').show();
			chrome.extension.sendMessage({"action":"get_goal"},function(response){
				cur_goal = response.goal;
				$('.goal').html(response.goal);
			});

			chrome.extension.sendMessage({"action":"check_report"},function(response){
				console.log(response);
			});
			fill_stats();

		}
	});

	$('.submit').click(function(){
		$('.notice').html("Logging in...");
		var email = $('#email').val();
		var password = $('#password').val();
		authenticate(email, password);
	});	
});

function authenticate(email, password){
	var jsonp_url = "http://fbless.herokuapp.com/simple_auth?email="+email+"&password="+password;

	var xhr = new XMLHttpRequest();
	xhr.open("GET", jsonp_url, true);
	xhr.onreadystatechange = function() {
	    if (xhr.readyState == 4) {
	       //handle the xhr response here
	       console.log("nice to hear back! ");
	       var rs = JSON.parse(xhr.responseText);
	       console.log(rs);

	       if(rs.fb_id != undefined){
	       		chrome.extension.sendMessage({"user":rs ,"action":"set_user"},function(response){
	       			user = rs;
	       			$('.login').hide();
	       			$('.content').show();
	       			chrome.extension.sendMessage({"action":"get_goal"},function(response){
	       				cur_goal = response.goal;
	       				$('.goal').html(response.goal);
	       			});
					fill_stats();
	       		});
	       }

	       else{
	       		$('.notice').html("Oops, wrong email or password");
	       }
	  }
	}
	xhr.send();
}

function fill_stats(){
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

			if(cur_goal*60 < duration){
				$('.suggestion').html("Oops, you've failed your goal today :-(");
			}
			else if((cur_goal*60 - duration) < 300){
				$('.suggestion').html("Watch out! You're getting close to your goal.");
			}
		});

	});
}