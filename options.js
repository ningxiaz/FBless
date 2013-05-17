var user = null;

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
});

function save_new_goal(goal){
	var jsonp_url = "http://fbless.herokuapp.com/save_goal?user_id="+user.fb_id+"&goal="+goal;

	var xhr = new XMLHttpRequest();
	xhr.open("GET", jsonp_url, true);
	xhr.onreadystatechange = function() {
	    if (xhr.readyState == 4) {
	       //handle the xhr response here
	       console.log("nice to hear back! " + xhr.responseText);
		   $('.notice').html("Saved!");
	    }
	}
	xhr.send();
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}