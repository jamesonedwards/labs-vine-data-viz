var CENTER_X = window.innerWidth / 2;
var CENTER_Y = window.innerHeight / 2;
var VINE_COUNT = 40;
var VINE_WIDTH = 100;
var VINE_HEIGHT = 100;
var VINE_SPACING_Y = 100;
var START_X = CENTER_X - VINE_WIDTH / 2;
var START_Y = VINE_HEIGHT;
var MAX_TREE_DEPTH = 3;
var MAX_CHILD_COUNT = 3;
var HIGHLIGHTED_Z_INDEX = 10000;
var DEFAULT_TAG = 'loop';
var tree = [];
var usedTags = [];
var activeRequests = [];
var activeRequestCount = 0;
var canvas;
var ctx;
var edges = [];

// The full tree depth should be 3 levels, but if the screen is too narrow, reduce that to 2.
if (window.innerWidth < 1500)
	MAX_TREE_DEPTH = 2;

/// START ///
function getRootNode() {
	clearTree();
	document.getElementById("input").value = document.getElementById("input").value.replace('#', '');
	var tag = document.getElementById("input").value;
	$('#animation_container').show();
	getNode(tag, START_X, START_Y, 1, '', null);
}

// This isn't used at the moment:
function restartWithTag(tag) {
	console.log('Calling restartWithTag(\'' + tag + '\')');
	clearTree();
	document.getElementById("input").value = tag;
	$('#animation_container').show();
	getNode(tag, START_X, START_Y, 1, '', null);
}

function restartWithNode(node, tag) {
	console.log('Calling restartWithNode(' + node.postId + ', ' + tag + ')');
	clearTree();
	document.getElementById("input").value = tag;
	$('#animation_container').show();
	getNode(tag, START_X, START_Y, 1, '', node);
}

function clearTree() {
	// Reset stuff.
	tree = [];
	usedTags = [];
	edges = [];

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
}

function getNode(tag, x, y, treeDepth, parentContainerDivId, startNode) {
	console.log('Called getNode(' + tag + ', ' + x + ', ' + y + ', ' + treeDepth + ', ' + parentContainerDivId + ', ' + startNode + ')');

	activeRequestCount++;
	// Exit condition.
	if (treeDepth > MAX_TREE_DEPTH) {
		console.log('Exit condition: max depth');
		checkForEnd();
		return;
	}

	tag = tag.trim().toLowerCase();
	if (tag == "")
		return;
	usedTags.push(tag);
	var queryUrl = "/search_by_tag/?page=1&pageSize=" + VINE_COUNT + "&tag=" + tag;

	activeRequests.push($.ajax({
		url : queryUrl,
		type : 'GET',
		dataType : 'JSONP',
		success : function(data) {
			var record = null;
			// If we have a start node, use that, else pick first node matching criteria.
			if (startNode != null) {
				// HACK: Take this out of the ajax request since it doesn't need to be made.
				record = startNode;
			} else {
				try {
					for (var i = 0; i < data.results.records.length; i++) {
						// Check to make sure nodes aren't repeated (by postId), and that nodes have at least 2 tags. Also filter out explicit content.
						if (data.results.records[i].tags.length > 1 && tree.indexOf(data.results.records[i].postId) == -1 && data.results.records[i].explicitContent == 0) {
							// Take the first matching node and exit loop.
							record = data.results.records[i];
							break;
						}
					}
				} catch (ex) {
					console.log('Exception occured getting data.records: ' + ex.message);
				}
			}

			// Exit condition.
			if (record === undefined || record == null) {
				console.log('Exit condition: null record');
				checkForEnd();
				return;
			}

			// Add this node to the tree.
			tree.push(record.postId);
			//console.log('tree: ' + tree);

			// Display the Vine.
			var newDivId = displayNode(record, x, y, tag, parentContainerDivId);

			// Now handle child tags.
			spreadVines(record.tags, x, y, treeDepth, newDivId);

			// Not sure if this is actually necessary but playing it safe...
			checkForEnd();
		}
	}));
}

function displayNode(node, x, y, tag, parentContainerDivId) {
	// Stopped and muted on load. Unmute on hover.
	// On Vine click, take the tag used for clicked Vine, clear results, and restart search but keep that same Vine as the root node.
	// On Vine hover, show metrics: #likes, #comments, #reports, etc.

	// Add the container div for all Vine elements.
	var postId = 'post_' + node.postId;
	var containerDiv = $('<div>', {
		'id' : postId,
		'css' : {
			'position' : 'absolute',
			'left' : START_X + 'px',
			'top' : START_Y + 'px'
		}
	});

	// Add the div for the parent hashtag.
	var parentTagDiv = $('<div>').addClass('parent-tag-div');
	var parentTagSpan = $('<span>', {
		'text' : '#' + tag
	}).addClass('parent-tag-text div-text-padding');

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
	}).on('click', function() {
		restartWithNode(node, tag);
	});

	var source = $('<source>', {
		'src' : node.videoUrl,
		'type' : 'video/mp4'
	});

	// Add the metrics div.
	var likeCnt = 0;
	var respostCnt = 0;
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

	// Add child tags container.
	var childTagsDivId = 'child_tags_' + node.postId;
	var childTagsDivBufferY = 25;
	var childTagsDiv = $('<div>', {
		'id' : childTagsDivId,
		'css' : {
			'width' : VINE_WIDTH,
			'top' : (VINE_HEIGHT + childTagsDivBufferY)
		}
	}).addClass('child-tags-div');

	// Add a div for each individual child tag.
	var tmpCnt = 0;
	for (var i = 0; i < node.tags.length; i++) {
		var tmp = node.tags[i].tag.trim().toLowerCase();
		if (usedTags.indexOf(tmp) == -1) {
			childTagsDiv.append($('<div>').append($('<span>', {
				'text' : '#' + tmp,
			})));
			tmpCnt++;
		}
		if (tmpCnt == MAX_CHILD_COUNT)
			break;
	}

	video.append(source);
	parentTagDiv.append(parentTagSpan);
	containerDiv.append(parentTagDiv);
	containerDiv.append(metricsDiv);
	containerDiv.append(video);
	containerDiv.append(childTagsDiv);
	$(".vine-boxes").append(containerDiv);

	// Cheesy animations...wee!
	containerDiv.animate({
		left : x,
		top : y
	}, 100);

	// Now add/append to the edges dictionary.
	if (parentContainerDivId.length > 0) {
		var edge;
		var parentTagsSpan;
		try {
			parentTagsSpan = $('#' + parentContainerDivId.replace('post_', 'child_tags_') + ' div:contains("' + tag + '") span');
			var startX;
			var startY = parentTagsSpan.offset().top + parentTagsSpan.height() / 2;

			// Right children start from right side of div. Left and center children start from left side of div.
			var bufferHack = 10;
			if (parentTagsSpan.offset().left < x - bufferHack) {
				startX = parentTagsSpan.offset().left + parentTagsSpan.width();
			} else {
				startX = parentTagsSpan.offset().left;
			}

			edge = {
				'start' : {
					'x' : Math.floor(startX),
					'y' : Math.floor(startY)
				},
				'end' : {
					'x' : Math.floor(x),
					'y' : Math.floor(y)
				}
			};

			edges.push(getCurvePointsFromEdge(edge));
		} catch (err) {
			console.log('OOPS');
			console.log(parentContainerDivId);
			console.log(tag);
		}
	}

	return postId;
}

function getCurvePointsFromEdge(edge) {
	// Calculate the intermediate point(s);
	var points = [];
	var heightX, heightY;
	var diff = Math.abs(edge.end.x - edge.start.x);
	var heightMultiplier = Math.max(Math.floor(diff / 6), 20);
	if (edge.end.x > edge.start.x)
		heightX = heightMultiplier;
	else
		heightX = -heightMultiplier;
	var centerX = ((edge.end.x + edge.start.x) / 2) + heightX;
	var centerY = ((edge.end.y + edge.start.y) / 2) - heightMultiplier;
	return [edge.start.x, edge.start.y, Math.floor(centerX), Math.floor(centerY), edge.end.x, edge.end.y];
}

function spreadVines(tags, x, y, treeDepth, parentContainerDivId) {
	// For each of the tags, call function recursively.
	var childCount = 0;

	// Calculate child node spread based on window width and treeDepth, accounting for a buffer on either side.
	var spacing = (window.innerWidth - VINE_WIDTH) / (Math.pow(MAX_CHILD_COUNT, treeDepth));

	for (var i = 0; i < tags.length; i++) {
		tmp = tags[i].tag.trim().toLowerCase();
		if (usedTags.indexOf(tmp) == -1) {
			//console.log('tag: ' + tmp);
			var newX, newY;
			newY = y + VINE_HEIGHT + VINE_SPACING_Y;

			// Limit number of children (simplifies the design/layout).
			if (childCount == 0) {
				// Left child.
				newX = x - spacing + (VINE_WIDTH / 2);
				//console.log('Left child at (' + newX + ', ' + newY + ')');
			} else if (childCount == 1) {
				// Middle child.
				newX = x;
				//console.log('Middle child at (' + newX + ', ' + newY + ')');
			} else if (childCount == 2) {
				// Right child.
				newX = x + spacing - (VINE_WIDTH / 2);
				//console.log('Right child at (' + newX + ', ' + newY + ')');
			} else {
				break;
				//console.log('No more children for you!');
			}
			childCount++;
			getNode(tmp, newX, newY, treeDepth + 1, parentContainerDivId);
		}
	}
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

	// Hide text.
	var childTagsId = id.replace('video_', 'child_tags_');
	$('#' + childTagsId).css("visible", "false");

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

	// Show text.
	var childTagsId = id.replace('video_', 'child_tags_');
	$('#' + childTagsId).css("visible", "true");

	// Send to back.
	video.css('z-index', 1);

	// Hide metrics.
	var metricsId = id.replace('video_', 'metrics_');
	$('#' + metricsId).hide();
}

/// CANVAS STUFF ///
function init() {
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
	return setInterval(draw, 100);
}

// Not used at the moment:
function drawCircle(x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2, true);
	ctx.fill();
}

function draw() {
	ctx.canvas.width = window.innerWidth;
	ctx.canvas.height = window.innerHeight;

	for (var i = 0; i < edges.length; i++) {
		drawEdge(edges[i]);
	}
}

/**
 * Source: http://www.codeproject.com/Tips/562175/Draw-Smooth-Line-through-points-with-HTML5-Canvas
 * @param {Object} edge
 */
function drawEdge(edge) {
	//console.log(edge);
	drawCurve(ctx, edge);
	ctx.strokeStyle = '#ECA809';
	ctx.stroke();
}

/// UTIL ///
// Not used at the moment:
function concatTags(parentTag, childTags) {
	var tagString = '';
	var tmpCnt = 0;
	for (var i = 0; i < childTags.length; i++) {
		var tmp = childTags[i].tag.trim().toLowerCase();
		if (tmp != parentTag) {
			tagString += '#' + childTags[i].tag + ' ';
			tmpCnt++;
		}
		if (tmpCnt == MAX_CHILD_COUNT)
			break;
	}
	return tagString.trim();
}

function checkForEnd() {
	// Hide the loading animation when there are no more requests.
	activeRequestCount--;
	if (activeRequestCount == 0)
		$('#animation_container').hide();
	//console.log('activeRequestCount: ' + activeRequestCount);

	// If there were no Vines found display message.
	if (tree.length == 0) {
		$('#notification').show().text('No Vines found for that hashtag at this time.');
	}
}

/// HANDLE BUTTON CLICKS ///
$("#submit").click(getRootNode);
$("#clear").click(clearTree);

// Canvas init.
init();

// Start the search with the default tag.
restartWithTag(DEFAULT_TAG);
