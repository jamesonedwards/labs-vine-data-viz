var CENTER_X = window.innerWidth / 2;
var CENTER_Y = window.innerHeight / 2;
var VINE_COUNT = 20;
var VINE_WIDTH = 100;
var VINE_HEIGHT = 100;
var POPULAR_VINE_MAX = 10;
var VINE_SPACING_Y = 120;
var START_X = CENTER_X - VINE_WIDTH / 2;
var START_Y = VINE_HEIGHT;
var MAX_TREE_DEPTH = 3;
var MAX_CHILD_COUNT = 3;
var HIGHLIGHTED_Z_INDEX = 1000;
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
	document.getElementById("input").value = document.getElementById("input").value.replace('#', '');
	var tag = document.getElementById("input").value;
	tag = tag.trim().toLowerCase();
	if (tag == "")
		return;
	clearTree();
	$('#animation_container').show();
	getNode(tag, START_X, START_Y, 1, '', null);
}

function suggestRootNode() {
	console.log('Called suggestRootNode()');
	clearTree();
	$('#input').val('');
	$('#animation_container').show();

	// Get the first popular Vine and start the process from there.
	var queryUrl = "/get_popular/?page=1&pageSize=" + VINE_COUNT;

	activeRequests.push($.ajax({
		url : queryUrl,
		type : 'GET',
		dataType : 'JSONP',
		success : function(data) {
			// Pick a random number between 0 and POPULAR_VINE_MAX - 1, and then choose that number in the list.
			var rand = Math.floor(Math.random() * POPULAR_VINE_MAX);
			//console.log('rand: ' + rand);
			var popCnt = 0;
			var record = null;
			try {
				//console.log('get_popular returned ' + data.results.records.length + ' records');
				for (var i = 0; i < data.results.records.length; i++) {
					// HACK: (11.12.2013): The Vine API seems to be broken. The tags array is empty for all values. Since this is probably temporary, leave it in but check for tags in the entities node as a backup.
					if (data.results.records[i].tags.length == 0) {
						data.results.records[i].tags = getEntityTags(data.results.records[i].entities);
					}

					// Check to make sure nodes aren't repeated (by postId), and that nodes have at least 2 tags. Also filter out explicit content.
					if (tree.indexOf(data.results.records[i].postId) == -1 && data.results.records[i].tags.length > 1) {
						record = data.results.records[i];

						// When we have enough matching nodes, exit the loop.
						if (popCnt == rand)
							break;

						popCnt++;
					}
				}
			} catch (ex) {
				console.log('Exception occured getting data.records: ' + ex.message);
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
			var tag = record.tags[0].tag.trim().toLowerCase();
			$('#input').val(tag);
			$('#input').keyup();
			var newDivId = displayNode(record, START_X, START_Y, tag, null);

			// Now handle child tags.
			spreadVines(record.tags, START_X, START_Y, 1, newDivId);

			// Not sure if this is actually necessary but playing it safe...
			checkForEnd();
		},
		error : function(data) {
			console.log('SuggestRootNode() AJAQ request returned an error: ' + data);
		}
	}));
}

function getEntityTags(entities) {
	var tags = [];
	var tagCnt = 0;
	for (var i = 0; i < entities.length; i++) {
		if (entities[i].type = 'tag') {
			tags.push({
				'tagId' : 'hack',
				'tag' : entities[i].title
			});
			// Cap at max children.
			tagCnt++;
			if (tagCnt >= MAX_CHILD_COUNT)
				break;
		}
	}
	return tags;
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

						// HACK: (11.12.2013): The Vine API seems to be broken. The tags array is empty for all values. Since this is probably temporary, leave it in but check for tags in the entities node as a backup.
						if (data.results.records[i].tags.length == 0) {
							data.results.records[i].tags = getEntityTags(data.results.records[i].entities);
						}

						// Check to make sure nodes aren't repeated (by postId), and that nodes have at least 2 tags. Also filter out explicit content.
						if (data.results.records[i].tags.length > 1 && tree.indexOf(data.results.records[i].postId) == -1 && data.results.records[i].explicitContent == 0) {
							// Take the first matching node and exit loop.
							record = data.results.records[i];
							break;
						}

						// If there are no nodes with more than 1 tag, use any node.
						if (record === undefined || record == null) {
							// Check to make sure nodes aren't repeated (by postId). Also filter out explicit content.
							if (tree.indexOf(data.results.records[i].postId) == -1 && data.results.records[i].explicitContent == 0) {
								// Take the first matching node and exit loop.
								record = data.results.records[i];
								break;
							}
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

function showVideo(node, tag) {
	// Build new video element.
	var videoId = 'video_' + node.postId;
	var video = $('<video>', {
		'id' : videoId,
		'text' : 'Your browser does not support HTML5 video.',
		'poster' : node.thumbnailUrl,
		'css' : {
			'position' : 'relative',
			'width' : VINE_WIDTH,
			'height' : VINE_HEIGHT
		}
	}).addClass('vine-video').prop('muted', 'muted').on('click', function() {
		toggleVideoHighlight(videoId);
	}).on('dblclick', function() {
		restartWithNode(node, tag);
	});

	var source = $('<source>', {
		'src' : node.videoUrl,
		'type' : 'video/mp4'
	});
	video.append(source);

	// Replace image with video.
	var imageId = 'image_' + node.postId;
	$('#' + imageId).replaceWith(video);
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

	// Add the image div.
	var imageId = 'image_' + node.postId;
	var image = $('<img>', {
		'id' : imageId,
		'src' : node.thumbnailUrl,
		'css' : {
			'position' : 'relative',
			'width' : VINE_WIDTH,
			'height' : VINE_HEIGHT
		}
	}).on('click', function() {
		// On click, show and expand video.
		showVideo(node, tag);
		toggleVideoHighlight('video_' + node.postId);
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

	parentTagDiv.append(parentTagSpan);
	containerDiv.append(parentTagDiv);
	containerDiv.append(metricsDiv);
	containerDiv.append(image);
	containerDiv.append(childTagsDiv);
	$(".vine-boxes").append(containerDiv);

	// Cheesy animations...wee!
	containerDiv.animate({
		left : x,
		top : y
	}, 100, function() {
		// Now add/append to the edges. Note: This needs to be placed inside the completed callback of the animation, or the lines may be placed in the wrong spot (i.e. before the animation has finished).
		if (parentContainerDivId != undefined && parentContainerDivId != null && parentContainerDivId.length > 0) {
			var edge;
			var parentTagsDiv;
			try {
				parentTagsDiv = $('#' + parentContainerDivId.replace('post_', 'child_tags_'));
				var parentTagsBufferY = 0;
				var startX = parentTagsDiv.offset().left + VINE_WIDTH / 2;
				var startY = parentTagsDiv.offset().top + parentTagsDiv.height() + parentTagsBufferY;

				edge = {
					'start' : {
						'x' : Math.floor(startX),
						'y' : Math.floor(startY)
					},
					'end' : {
						'x' : Math.floor(x + VINE_WIDTH / 2),
						'y' : Math.floor(y)
					}
				};

				//console.log(edge);
				edges.push(edge);
			} catch (err) {
				console.log('OOPS');
				console.log(parentContainerDivId);
				console.log(tag);
			}
		}
	});

	// Fincally, return the ID.
	return postId;
}

// Not used at the moment:
function getCurvePointsFromEdge(edge) {
	// Calculate the intermediate point(s)
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
/**
 * If specified video is highlighted, unhighlight. Else highlight it and unhighlight all other videos.
 * The highlighted state is determined by whether or not the width is greater than the default VINE_WIDTH.
 */
function toggleVideoHighlight(id) {
	if ($('#' + id).width() > VINE_WIDTH) {
		unhighlightVideo(id);
	} else {
		$('.vine-video').each(function(test) {
			if ($(this).width() > VINE_WIDTH) {
				unhighlightVideo($(this).attr('id'));
			}
		});
		highlightVideo(id);
	}
}

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

	// Position animation div.
	var animationDiv = $('#animation_container');
	animationDiv.css({
		'left' : (window.innerWidth - animationDiv.width()) / 2
	});

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
	var edgeBufferY = 20;
	ctx.beginPath();
	ctx.moveTo(edge.start.x, edge.start.y);
	ctx.lineTo(edge.start.x, edge.start.y + edgeBufferY);
	ctx.lineTo(edge.end.x, edge.start.y + edgeBufferY);
	ctx.lineTo(edge.end.x, edge.end.y);
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
		displayError();
	}
}

function getUrlParameter(name) {
	return decodeURI((RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]);
}

function start() {
	var query = getUrlParameter('q');
	if (query == null || query == 'null' || query == undefined || query.length == 0) {
		suggestRootNode();
	} else {
		// Start the search by triggering the submit button's click event.
		$("#submit").click();
	}
}

/// HANDLE BUTTON CLICKS ///
$("#submit").click(getRootNode);
$("#clear").click(clearTree);
$("#suggest").click(suggestRootNode);

//window.onload = function() {
// Canvas init.
init();

// Start the experiment.
start();
//};
