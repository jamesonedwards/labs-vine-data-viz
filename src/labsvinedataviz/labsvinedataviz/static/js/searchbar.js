
// populate top bar
document.getElementById('input').value = getParameter('q');

// center top bar
$.fn.centerMe = function () { this.css('left', $(this).parent().outerWidth()/2 - $(this).outerWidth()/2); };
$(window).resize(function() { $('.top-bar').centerMe(); });
$('.top-bar').centerMe();
$('.top-bar-tab').centerMe();

// top bar expand/collapse animations
$('.top-bar-tab').click(function() {
	if ($('.top-bar').hasClass('expanded')) {
		$('.top-bar').animate({top: '-35px'}, 500);
		$('.top-bar').removeClass('expanded');
		//$(this).html('&#x2C5;');
		$(this).html('+');
	} else {
		$('.top-bar').animate({top: '0px'}, 500);
		$('.top-bar').addClass('expanded');
		$(this).html('X');
	}
});
$('.top-bar-tab').click();

// if field is blank, grey out go button, else un-grey
$('#input').bind('keyup', function(e) {
    if ($(this).val() == '') {
    	disableSubmitButton();
    	enableSuggestButton();
    } else {
		enableSubmitButton();
    	disableSuggestButton();
    }
});
$('#input').keyup();


function enableSubmitButton() {
	$('#submit').css('opacity', '1');
	$('#submit').css('cursor', 'pointer');
	$('#submit').on('mouseover', function(e){ $(this).attr('src','/static/img/btn_go-over.png'); });
	$('#submit').on('mouseout', function(e){ $(this).attr('src','/static/img/btn_go-off.png'); });
}

function disableSubmitButton() {
	$('#submit').css('opacity', '.5');
	$('#submit').css('cursor', 'default');
	$('#submit').off('mouseover');
	$('#submit').off('mouseout');
}

function enableSuggestButton() {
	$('#suggest').css({
		'opacity' : '1',
		'cursor' : 'pointer'
	}).on('mouseover', function(e) {
		$(this).attr('src', '/static/img/btn_randomize-over.png');
	}).on('mouseout', function(e) {
		$(this).attr('src', '/static/img/btn_randomize-off.png');
	})/*.on('click', function(e) {
		$('body').fadeOut(400, function() {
			window.location = "/" + targetPage + "?q=";
		});
	})*/;
}

function disableSuggestButton() {
	$('#suggest').css({
		'opacity' : '.5',
		'cursor' : 'default'
	}).off('mouseover').off('mouseout')/*.off('click')*/;
}

// show, make opaque, make transparent, hide
function displayError(){
	$('.error-msg').show();
	$('.error-msg').animate({"opacity": 1}, 250, function(){
		setTimeout(function() {
			$('.error-msg').animate({"opacity": 0}, 250, function(){ $('.error-msg').hide(); });
		}, 3000);
	});
}

// helper functions

function getParameter(paramName) {
	var searchString = window.location.search.substring(1),
    	i, val, params = searchString.split("&");

	for (i=0;i<params.length;i++) {
		val = params[i].split("=");
		if (val[0] == paramName)
	  		return unescape(val[1]);
	}
	return null;
}