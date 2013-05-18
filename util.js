function Site(domain,distraction) {
  this.domain = domain;
  this.distraction = distraction;
}

function x_days_ago_date(x){
	var today = new Date();
	var ago = new Date( today.getTime() - (x * 24 * 60 * 60 * 1000) );
	var dd = ago.getDate();
	var mm = ago.getMonth() + 1;
	var yyyy = ago.getFullYear();
	if(dd < 10){
		dd = '0' + dd;
	}
	if(mm < 10){
		mm = '0' + mm;
	}
	return yyyy+'-'+mm+'-'+dd;
}

function secondsToTime(secs)
{
    var divisor_for_minutes = secs % (60 * 60);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var obj = {
        "h ": Math.floor(secs / (60 * 60)),
        "m ": Math.floor(divisor_for_minutes / 60),
        "s": Math.ceil(divisor_for_seconds)
    };
    var str = "";
    for (key in obj){
    	if(obj[key] != 0){
    		str += obj[key] + key;
    	}
    }
    return str;
}
function secondsSinceDay(secs)
{
    var divisor_for_minutes = secs % (60 * 60);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var p1  = (Math.floor(secs / (60 * 60)) < 10)? "0" + Math.floor(secs / (60 * 60)) : Math.floor(secs / (60 * 60));
    var p2  = (Math.floor(divisor_for_minutes / 60) < 10)? "0" + Math.floor(divisor_for_minutes / 60) : Math.floor(divisor_for_minutes / 60);
    var p3  = (Math.ceil(divisor_for_seconds) < 10)? "0" + Math.ceil(divisor_for_seconds) : Math.ceil(divisor_for_seconds);
    return "" + p1+":" + p2+":"+ p3;
}

/**
 *  Returns the first int we found in the str
 */
function str_to_int(str) {
	var match = str.match(/\d+/);
	return parseInt(match[0], 10);
}

// helper function to get domain from an url
// need improvement to only intercept doamin name
function get_domain(url){
	if(url == "") return "";
	var arr = url.split("/");
	// ignore non http and https headers
	if(arr[0] !== "http:" && arr[0] !== "https:") return "";
	return arr[2].split("/")[0].split("www.").join("");
}

function str_cut(str,length){
	var s = str;
	if(s.length > length){
		s = s.substr(0,length) + ".."; 
	}
	return s;
}

function format_date(date){
	var tokens = date.split("-");
	var formatted = "";

	switch(tokens[1]){
		case "01": formatted+="Jan "; break;
		case "02": formatted+="Feb "; break;
		case "03": formatted+="Mar "; break;
		case "04": formatted+="Apr "; break;
		case "05": formatted+="May "; break;
		case "06": formatted+="Jun "; break;
		case "07": formatted+="Jul "; break;
		case "08": formatted+="Aug "; break;
		case "09": formatted+="Sep "; break;
		case "10": formatted+="Oct "; break;
		case "11": formatted+="Nov "; break;
		case "12": formatted+="Dec "; break;
	}

	formatted+=tokens[2]+", "+tokens[0];
	return formatted;
}

function same_day(date1, date2){
	return (date1.getFullYear() == date2.getFullYear())&&(date1.getMonth() == date2.getMonth())&&(date1.getDate() == date2.getDate());
}

function format_query_date(date){
	var dd = date.getDate();
	var mm = date.getMonth() + 1;
	var yyyy = date.getFullYear();
	if(dd < 10){
		dd = '0' + dd;
	}
	if(mm < 10){
		mm = '0' + mm;
	}
	return yyyy+'-'+mm+'-'+dd;
}

