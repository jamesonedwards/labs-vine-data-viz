var VINE_PREVIEW_COUNT = 5;
var VINE_COUNT = VINE_PREVIEW_COUNT * 4;
var VINE_WIDTH = 100;
var VINE_HEIGHT = 100;
var VINE_SPACING_X = VINE_WIDTH * 1.5;
var HIGHLIGHTED_Z_INDEX = 10000;
var activeRequests = [];
var activeRequestCount = 0;
var input;
var words = [];
var EXCLUDED_WORDS = {
	'a' : [{
		'postId' : null,
		'videoUrl' : 'http://v.cdn.vine.co/r/videos/8BA297DCB0997587622287347712_138081710562825f11b6937.mp4_7QV8FeUeOHijsXu6fthsGy87j4dHjKgcSgDev_zVntZaQz0PHAWw8Ztyue3qFHEV.mp4?versionId=T4ggUxcNow6kiHJBtHpw855MtpVEeM3Y'
	}],
	'if' : [{
		'postId' : null,
		'videoUrl' : 'http://v.cdn.vine.co/r/videos/8BA297DCB0997587622287347712_138081710562825f11b6937.mp4_7QV8FeUeOHijsXu6fthsGy87j4dHjKgcSgDev_zVntZaQz0PHAWw8Ztyue3qFHEV.mp4?versionId=T4ggUxcNow6kiHJBtHpw855MtpVEeM3Y'
	}],
	'i' : [{
		'postId' : null,
		'videoUrl' : 'http://v.cdn.vine.co/r/videos/8BA297DCB0997587622287347712_138081710562825f11b6937.mp4_7QV8FeUeOHijsXu6fthsGy87j4dHjKgcSgDev_zVntZaQz0PHAWw8Ztyue3qFHEV.mp4?versionId=T4ggUxcNow6kiHJBtHpw855MtpVEeM3Y'
	}],
	'the' : [{
		'postId' : null,
		'videoUrl' : 'http://v.cdn.vine.co/r/videos/8BA297DCB0997587622287347712_138081710562825f11b6937.mp4_7QV8FeUeOHijsXu6fthsGy87j4dHjKgcSgDev_zVntZaQz0PHAWw8Ztyue3qFHEV.mp4?versionId=T4ggUxcNow6kiHJBtHpw855MtpVEeM3Y'
	}],
	'at' : [{
		'postId' : null,
		'videoUrl' : 'http://v.cdn.vine.co/r/videos/8BA297DCB0997587622287347712_138081710562825f11b6937.mp4_7QV8FeUeOHijsXu6fthsGy87j4dHjKgcSgDev_zVntZaQz0PHAWw8Ztyue3qFHEV.mp4?versionId=T4ggUxcNow6kiHJBtHpw855MtpVEeM3Y'
	}],
	'of' : [{
		'postId' : null,
		'videoUrl' : 'http://v.cdn.vine.co/r/videos/8BA297DCB0997587622287347712_138081710562825f11b6937.mp4_7QV8FeUeOHijsXu6fthsGy87j4dHjKgcSgDev_zVntZaQz0PHAWw8Ztyue3qFHEV.mp4?versionId=T4ggUxcNow6kiHJBtHpw855MtpVEeM3Y'
	}]
};
var results = {};
var selectedResults = {};

function saveSearch() {
	// TODO: Generate a unique URL based on the guid, then use http://goo.gl/ to shorten the URL. Use the python library since it's stable: https://developers.google.com/url-shortener/libraries
	// TODO: Present shortened URL to user to share.

	// FIXME: Remove this after the selection logic is built!
	for (var key in results) {
		selectedResults[key] = [results[key][0]];
	}

	// Make sure each word has at least one node before saving.
	if (words.length == 0) {
		throw 'Cannot save if search phrase is blank!';
	}

	for (var i = 0; i < words.length; i++) {
		if (!(words[i] in selectedResults) || selectedResults[words[i]].length == 0 || selectedResults[words[i]][0] == undefined || selectedResults[words[i]][0] == null || selectedResults[words[i]][0] == '')
			throw 'Cannot save if search any search results are blank!';
	}

	// Make AJAX POST request with this data.
	var queryUrl = "/save_vine_sentence/";
	$('#animation_container').show();
	$('#save').hide();
	activeRequestCount++;
	activeRequests.push($.ajax({
		type : "POST",
		url : queryUrl,
		data : 'results=' + JSON.stringify(selectedResults),
		success : function(data) {
			activeRequestCount--;
			$('#animation_container').hide();
			$('#shareUrl').show().text(data.url).attr('href', data.url);
		},
		contentType : "application/json; charset=utf-8",
		dataType : "json",
	}));
}

function startSearch() {
	clearResults();

	// Start loading animation.
	$('#animation_container').show();

	// Remove all non-alphanumeric characters from the input.
	var input = $("#input").val().replace(/[^a-zA-Z0-9\s]*/g, '');
	$("#input").val(input);
	//console.log(input);

	// Split input into words.
	words = input.split(/\s+/);
	//console.log(words);

	// For each trimmed word, if the word is searchable, do tag search, else pull stock vine.
	for (var i = 0; i < words.length; i++) {
		var word = words[i].trim().toLowerCase();
		if ( word in EXCLUDED_WORDS) {
			// This is a non-searchable word so use the predefined Vines.
			results[word] = EXCLUDED_WORDS[word];
		} else {
			// Do a new search for this word.
			getVinesByTag(word);
		}
	}
}

function clearResults() {
	// Reset stuff.
	results = {};
	selectedResults = {};
	words = [];

	// Remove DOM objects.
	$(".vine-boxes").empty();

	// Abort active AJAX requests.
	for (var i = 0; i < activeRequests.length; i++) {
		activeRequests[i].abort();
	}

	// Hide loading animation.
	$('#animation_container').hide();
	activeRequestCount = 0;

	// Hide/reset notification div.
	$('#notification').hide().text('');
	$('#save').hide();
}

function getVinesByTag(tag) {
	console.log('Called getVinesByTag(' + tag + ')');

	// Clean input.
	tag = tag.trim().toLowerCase();
	if (tag == '')
		return;

	// Keep track of the active requests.
	activeRequestCount++;

	// Make AJAX request for this tag.
	var queryUrl = "/search_by_tag/?page=1&pageSize=" + VINE_COUNT + "&tag=" + tag;
	activeRequests.push($.ajax({
		url : queryUrl,
		type : 'GET',
		dataType : 'JSONP',
		success : function(data) {
			var tmpResults = [];
			try {
				for (var i = 0; i < data.results.records.length; i++) {
					// Check to make sure nodes aren't repeated (by postId). Also filter out explicit content.
					if (!(data.results.records[i].postId in tmpResults) && data.results.records[i].explicitContent == 0) {
						tmpResults.push(getVineDataFromNode(data.results.records[i]));

						// If we've reached the amount we need for preview, exit loop.
						if (tmpResults.length == VINE_PREVIEW_COUNT)
							break;
					}
				}
			} catch (ex) {
				console.log('Exception occured getting data.records: ' + ex.message);
			}

			// Append to results.
			results[tag] = tmpResults;
			//console.log(results);

			// Once all AJAX requests have finished, display the results.
			activeRequestCount--;
			if (activeRequestCount == 0) {
				displayResults();
			}
		}
	}));
}

function displayResults() {
	console.log('Called displayResults()');
	//console.log(words);
	//console.log(results);

	// Stop the loading animation and show the Save button.
	$('#animation_container').hide();
	var showSaveBtn = true;
	// FIXME: UNCOMMENT THIS:
	//for (var i = 0; i < words.length; i++) {
	//	if (!(words[i] in selectedResults) || selectedResults[words[i]].length == 0 || selectedResults[words[i]][0] == undefined || selectedResults[words[i]][0] == null || selectedResults[words[i]][0] == '') {
	//		showSaveBtn = false;
	//	}
	//}

	if (showSaveBtn == true) {
		$('#save').show();
	} else {
		$('#save').hide();
		$('#notification').show().text('Cannot save if search any search results are blank!');
	}

	for (var i = 0; i < words.length; i++) {
		// Create a span element for this word.
		var columnSpan = $('<span>', {
			'id' : 'column_' + words[i],
			'css' : {
				'position' : 'absolute',
				'top' : '100px',
				'left' : (i + 1) * VINE_SPACING_X
			}
		});

		// This span should have a column of divs starting with the word and including all results for that word in order (top to bottom).
		columnSpan.append($('<div>').text(words[i]));

		var nodes = results[words[i]];
		//console.log('word: ' + words[i]);
		//console.log('nodes: ');
		//console.log(nodes);
		for (var j = 0; j < nodes.length; j++) {
			columnSpan.append(displayNode(nodes[j]));
		}

		// Append to document.
		$('.vine-boxes').append(columnSpan);
	}
}

function displayNode(node, x, y, tag, parentContainerDivId) {
	// Stopped and muted on load. Unmute on hover.
	// On Vine hover, show metrics: #likes, #comments, #reports, etc.

	// Add the container div for all Vine elements.
	var postId = 'post_' + node.postId;
	var containerDiv = $('<div>', {
		'id' : postId,
	});

	// Add the video div.
	var videoId = 'video_' + node.postId;
	var video = $('<video>', {
		'id' : videoId,
		'text' : 'Your browser does not support HTML5 video.',
		'css' : {
			'position' : 'relative',
			'width' : VINE_WIDTH,
			'height' : VINE_HEIGHT
		}
	}).prop('muted', 'muted').on('mouseover', function() {
		highlightVideo(videoId);
	}).on('mouseout', function() {
		unhighlightVideo(videoId);
	});

	var source = $('<source>', {
		'src' : node.videoUrl,
		'type' : 'video/mp4'
	});

	// Add the metrics div.
	var likeCnt = 0;
	var repostCnt = 0;
	var commentCnt = 0;
	try {
		likeCnt = node.likes.count;
		repostCnt = node.reposts.count;
		commentCnt = node.comments.count;
	} catch (ex) {
		console.log('Error getting metrics: ' + ex.message);
	}
	var metricsDiv = $('<div>', {
		'id' : 'metrics_' + node.postId,
		'text' : 'Likes: ' + likeCnt + ', Reposts: ' + repostCnt + ', Comments: ' + commentCnt,
		'css' : {
			'left' : -VINE_WIDTH,
			'top' : -VINE_HEIGHT
		}
	}).addClass('metrics-div div-text-padding').css('z-index', HIGHLIGHTED_Z_INDEX);

	video.append(source);
	containerDiv.append(metricsDiv);
	containerDiv.append(video);
	return containerDiv;
}

function getVineDataFromNode(node) {
	// TODO: This function currently just returns the entire node, but in the future may change.
	return node;
}

/// EVENT HANDLERS ///
function highlightVideo(id) {
	var video = $('#' + id);
	var postId = id.replace('video_', '');
	video.prop('muted', false);
	video.get(0).play();
	video.attr({
		'loop' : 'true'
	});
	video.stop(true, true).animate({
		height : (VINE_HEIGHT * 3) + 'px',
		width : (VINE_WIDTH * 3) + 'px',
		left : '-=' + VINE_WIDTH + 'px',
		top : '-=' + VINE_HEIGHT + 'px'
	}, 100);

	// Bring to front.
	video.css('z-index', HIGHLIGHTED_Z_INDEX);

	// Show metrics.
	var metricsId = id.replace('video_', 'metrics_');
	$('#' + metricsId).show();
}

function unhighlightVideo(id) {
	var video = $('#' + id);
	var postId = id.replace('video_', '');
	video.prop('muted', true);
	video.get(0).pause();
	video.attr({
		'loop' : 'false'
	});
	video.stop(true, true).animate({
		height : VINE_HEIGHT + 'px',
		width : VINE_WIDTH + 'px',
		left : '+=' + VINE_WIDTH + 'px',
		top : '+=' + VINE_HEIGHT + 'px'
	}, 100);

	// Send to back.
	video.css('z-index', 1);

	// Hide metrics.
	var metricsId = id.replace('video_', 'metrics_');
	$('#' + metricsId).hide();
}

function getUrlParameterByName(name) {
	if (name == undefined || name == null || name.length == 0)
		return null;
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
	return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/// HANDLE BUTTON CLICKS ///
$("#submit").click(startSearch);
$("#save").click(saveSearch);

$(document).ready(function() {
	// Check URL for uniqueId.
	var uniqueId = getUrlParameterByName('uniqueId');
	// If uniqueId exists, use that data, else load page normally.
	if (uniqueId != null && uniqueId != undefined && uniqueId.length > 0) {
		$('#animation_container').show();
		// Get data from this uniqueId.
		var queryUrl = '/get_saved_vine_sentence/' + uniqueId + '/';
		activeRequests.push($.ajax({
			url : queryUrl,
			type : 'GET',
			dataType : 'JSONP',
			error : function(data) {
				$('#notification').show().text(JSON.stringify(data));
			},
			success : function(data) {
				try {
					// Set results and selectedResults from data.results
					results = data.results.sentence_nodes;
					selectedResults = data.results.sentence_nodes;
					//console.log(results);

					// Set words from data.results.keys
					words = Object.keys(results);
					//console.log(words);

					// Set input box from words.
					$('#input').val(data.results.sentence_words);

					// Display results.
					displayResults();
				} catch (ex) {
					console.log('Exception occured getting data for uniqueId "' + uniqueId + '": ' + ex.message);
				}
			}
		}));
	}
});
