
var delta = [ 0, 0 ];
var stage = [ window.screenX, window.screenY, window.innerWidth, window.innerHeight ];
getBrowserDimensions();

var isRunning = false;
var isMouseDown = false;

var worldAABB;
var world;
var iterations = 1;
var timeStep = 1 / 25; 

var walls = [];
var wall_thickness = 200;
var wallsSetted = false;

var mouseJoint;
var mouse = { x: 0, y: 0 };

var mouseOnClick = [];

var elements = [];
var bodies = [];
var properties = [];

var gravity = { x: 0, y: 1 };

var searchTerms = {};
var intervalHandle = null;

init();

if (document.getElementById('input').value != "")
	generateBoxes("search");
else 
	generateBoxes("popular");
	
function init() {

	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener( 'mouseup', onDocumentMouseUp, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	document.addEventListener( 'keyup', onDocumentKeyUp, false );
	document.addEventListener( 'touchstart', onDocumentTouchStart, false );
	document.addEventListener( 'touchmove', onDocumentTouchMove, false );
	document.addEventListener( 'touchend', onDocumentTouchEnd, false );
	window.addEventListener( 'deviceorientation', onWindowDeviceOrientation, false );

	// init box2d
	worldAABB = new b2AABB();
	worldAABB.minVertex.Set( - 200, - 200 );
	worldAABB.maxVertex.Set( window.innerWidth + 200, window.innerHeight + 200 );
	world = new b2World( worldAABB, new b2Vec2( 0, 0 ), true );

	// walls
	setWalls();

	// Get box2d elements
	elements = getElementsByClass("box2d");

	for ( var i = 0; i < elements.length; i ++ ) {
		properties[i] = getElementProperties( elements[i] );
	}

	for ( var i = 0; i < elements.length; i ++ ) {
		var element = elements[i];
		element.style.position = 'absolute';
		element.style.left = properties[i][0] + 'px';
		element.style.top = properties[i][1] + 'px';
		element.style.width = properties[i][2] + 'px';
		element.addEventListener('mousedown', onElementMouseDown, false );
		element.addEventListener('mouseup', onElementMouseUp, false );
		element.addEventListener('click', onElementClick, false );

		bodies[i] = createBox(world, properties[i][0] + (properties[i][2] >> 1), properties[i][1] + (properties[i][3] >> 1), properties[i][2] / 2, properties[i][3] / 2, false );

		// Clean position dependencies
		while (element.offsetParent) {
			element = element.offsetParent;
			element.style.position = 'static';
		}
	}
	
	if (!isRunning) run();
}

function run() {
	isRunning = true;
	clearInterval(intervalHandle);
	intervalHandle = setInterval(loop, 25);
}

function pause() {
	isRunning = false;
	clearInterval(intervalHandle);
}


function onDocumentMouseDown( event ) {
	isMouseDown = true;
}

function onDocumentMouseUp( event ) {
	isMouseDown = false;
}

function onDocumentMouseMove( event ) {
	//if (!isRunning) run();

	mouse.x = event.clientX;
	mouse.y = event.clientY;
}

function onDocumentKeyUp( event ) {
	if (event.keyCode == 13) generateBoxes();
}

function onDocumentTouchStart( event ) {
	if (event.touches.length == 1) {
		if (!isRunning) {
			run();
		}

		mouse.x = event.touches[0].pageX;
		mouse.y = event.touches[0].pageY;
		isMouseDown = true;
	}
}

function onDocumentTouchMove( event ) {
	if (event.touches.length == 1) {
		event.preventDefault();
		mouse.x = event.touches[0].pageX;
		mouse.y = event.touches[0].pageY;
	}
}

function onDocumentTouchEnd( event ) {
	if (event.touches.length == 0) {
		isMouseDown = false;
	}
}

function onWindowDeviceOrientation( event ) {
	if (event.beta) {
		gravity.x = Math.sin(event.gamma * Math.PI / 180);
		gravity.y = Math.sin(( Math.PI / 4 ) + event.beta * Math.PI / 180);
	}
}

function onElementMouseDown( event ) {
	event.preventDefault();
	mouseOnClick[0] = event.clientX;
	mouseOnClick[1] = event.clientY;
}

function onElementMouseUp( event ) {
	event.preventDefault();
}

function onElementClick( event ) {
	var range = 5;
	if ( mouseOnClick[0] > event.clientX + range || mouseOnClick[0] < event.clientX - range &&
	     mouseOnClick[1] > event.clientY + range || mouseOnClick[1] < event.clientY - range ) {
		event.preventDefault();
	}

	//if ( event.target == document.getElementById( 'btnG' ) ) search();
	//if ( event.target == document.getElementById( 'btnI' ) ) imFeelingLucky();
	//if ( event.target == document.getElementById( 'q' ) ) document.getElementById('q').focus();
}

//

function loop() {

	if (getBrowserDimensions())
		setWalls();

	delta[0] += (0 - delta[0]) * .5;
	delta[1] += (0 - delta[1]) * .5;

	world.m_gravity.x = gravity.x * 350 + delta[0];
	world.m_gravity.y = gravity.y * 350 + delta[1];

	mouseDrag();
	world.Step(timeStep, iterations);

	for ( i = 0; i < elements.length; i++ ) {
		var body = bodies[i];
		var element = elements[i];

		element.style.left = (body.m_position0.x - (properties[i][2] >> 1)) + 'px';
		element.style.top = (body.m_position0.y - (properties[i][3] >> 1)) + 'px';

		var style = 'rotate(' + (body.m_rotation0 * 57.2957795) + 'deg)';

		element.style.transform = style;
		element.style.WebkitTransform = style + ' translateZ(0)'; // Force HW Acceleration
		element.style.MozTransform = style;
		element.style.OTransform = style;
		element.style.msTransform = style;
	}
}


// .. BOX2D UTILS
function createBox(world, x, y, width, height, fixed, element) {
	if (typeof(fixed) == 'undefined')
		fixed = true;

	var boxSd = new b2BoxDef();

	if (!fixed)
		boxSd.density = 1.0;

	boxSd.extents.Set(width, height);

	var boxBd = new b2BodyDef();
	boxBd.AddShape(boxSd);
	boxBd.position.Set(x,y);
	boxBd.userData = {element: element};

	return world.CreateBody(boxBd);
}

function mouseDrag() {
	// mouse press
	if (isMouseDown && !mouseJoint) {
		var body = getBodyAtMouse();
		if (body) {
			var md = new b2MouseJointDef();
			md.body1 = world.m_groundBody;
			md.body2 = body;
			md.target.Set(mouse.x, mouse.y);
			md.maxForce = 30000.0 * body.m_mass;
			md.timeStep = timeStep;
			mouseJoint = world.CreateJoint(md);
			body.WakeUp();
		}
	}

	// mouse release
	if (!isMouseDown) {
		if (mouseJoint) {
			world.DestroyJoint(mouseJoint);
			mouseJoint = null;
		}
	}

	// mouse move
	if (mouseJoint) {
		var p2 = new b2Vec2(mouse.x, mouse.y);
		mouseJoint.SetTarget(p2);
	}
}

function getBodyAtMouse() {
	// Make a small box.
	var mousePVec = new b2Vec2();
	mousePVec.Set(mouse.x, mouse.y);

	var aabb = new b2AABB();
	aabb.minVertex.Set(mouse.x - 1, mouse.y - 1);
	aabb.maxVertex.Set(mouse.x + 1, mouse.y + 1);

	// Query the world for overlapping shapes.
	var k_maxCount = 10;
	var shapes = [];
	var count = world.Query(aabb, shapes, k_maxCount);
	var body = null;

	for ( var i = 0; i < count; i ++ ) {
		if (shapes[i].m_body.IsStatic() == false) {
			if ( shapes[i].TestPoint(mousePVec) ) {
				body = shapes[i].m_body;
				break;
			}
		}
	}
	return body;
}

function setWalls() {
	if (wallsSetted) {
		world.DestroyBody(walls[0]);
		world.DestroyBody(walls[1]);
		world.DestroyBody(walls[2]);
		world.DestroyBody(walls[3]);

		walls[0] = null; 
		walls[1] = null;
		walls[2] = null;
		walls[3] = null;
	}

	walls[0] = createBox(world, stage[2] / 2, - wall_thickness - 100, stage[2], wall_thickness);           // top - made it 100px higher)
	walls[1] = createBox(world, stage[2] / 2, stage[3] + wall_thickness, stage[2], wall_thickness);        // bottom
	walls[2] = createBox(world, - wall_thickness, stage[3] / 2, wall_thickness, stage[3] + 100);           // left (100px higher)
	walls[3] = createBox(world, stage[2] + wall_thickness, stage[3] / 2, wall_thickness, stage[3] + 100);  // right (100px higher)

	wallsSetted = true;
}

// .. UTILS

function getElementsByClass( searchClass ) {
	var classElements = [];
	var els = document.getElementsByTagName('*');
	var elsLen = els.length;

	for (i = 0, j = 0; i < elsLen; i++) {
		var classes = els[i].className.split(' ');
		for (k = 0; k < classes.length; k++)
			if ( classes[k] == searchClass )
				classElements[j++] = els[i];
	}
	return classElements;
}

function getElementProperties( element ) {
	var x = 0;
	var y = 0;
	var width = element.offsetWidth;
	var height = element.offsetHeight;

	do {
		x += element.offsetLeft;
		y += element.offsetTop;

	} while ( element = element.offsetParent );

	return [ x, y, width, height ];
}

function getBrowserDimensions() {
	var changed = false;

	if ( stage[0] != window.screenX ) {
		delta[0] = (window.screenX - stage[0]) * 50;
		stage[0] = window.screenX;
		changed = true;
	}

	if ( stage[1] != window.screenY ) {
		delta[1] = (window.screenY - stage[1]) * 50;
		stage[1] = window.screenY;
		changed = true;
	}

	if ( stage[2] != window.innerWidth ) {
		stage[2] = window.innerWidth;
		changed = true;
	}

	if ( stage[3] != window.innerHeight ) {
		stage[3] = window.innerHeight;
		changed = true;
	}
	return changed;
}

/////////////////////////////////////////////////////

$("#submit").click(function(){ generateBoxes("search"); });
$("#suggest").click(function(){ generateBoxes("popular"); });

function generateBoxes(type) {
	var numVines = 4;
	var tag = document.getElementById("input").value;
	
	// if tag is empty and submit was clicked, do nothing
	if (tag.trim() == "" && type == "search") return;
	
	// if tag is not empty and popular was clicked, do nothing
	if (tag.trim() != "" && type == "popular") return;
	
    // add search term to dictionary
	if (searchTerms[tag] == undefined)
		searchTerms[tag] = 1;
	else
		searchTerms[tag]++;
	
	
	var queryUrl = "/search_by_tag/?page=" + searchTerms[tag] + "&pageSize=4&tag=" + tag;
	if (type == "popular")
		queryUrl = "/get_popular/?page=" + searchTerms[tag] + "&pageSize=4";
		
	console.log(queryUrl);

	$.ajax({
	    url: queryUrl,
	    type: 'GET',
	    dataType: 'JSONP',
	    success: function(data){
	    	
	    	if (data.results.records.length == 0) {
	    		displayError();
	    		return;
	    	}

			var numExistingVines = bodies.length;
			
	    	for (var i = 0; i < numVines; i++) {
	    		var record = data.results.records[i];
	    		if (record === undefined) break;
	    	    
	    	    var shareUrl = data.results.records[i].shareUrl;
	    	    var randomX = Math.floor(Math.random() * window.innerWidth - 120) + 1;
	    	    var randomY = Math.floor(Math.random() * -150) - 50;
	    	    var randomId = Math.floor(Math.random() * 1000000);
	    	    
	    	    var popularity = record.likes.count + record.comments.count; // record.reposts.count doesn't always exist
				popularity = Math.min(popularity, 12);
				var vineSize = 100 + popularity * 10;
				
				var vineBox = document.createElement('div');
				vineBox.className = 'vine-box box2d';			
				vineBox.style.position = 'absolute';
				vineBox.style.width = vineSize + 'px';
				vineBox.style.height = vineSize + 'px';
				vineBox.style.left = randomX + 'px';
				vineBox.style.top = randomY + 'px';
				
				var vine = vineBox.appendChild(document.createElement('video'));
				vine.className = 'vine';
				vine.originalSize = vineSize;
				vine.width = vineSize;
				vine.height = vineSize;
				vine.poster = record.thumbnailUrl;
				vine.src = record.videoUrl;
				vine.autoplay = 'true';
				vine.loop = 'true';
				vine.muted = 'true';
				vine.pause();
				vine.idx = i + numExistingVines;
				vine.selected = 'false';
				
				var vineBoxes = document.getElementsByClassName("vine-boxes")[0];
				vineBoxes.appendChild(vineBox);

				var vineBoxProps = getElementProperties(vineBox);

				vineBox.addEventListener('mousedown', onElementMouseDown, false);
				vineBox.addEventListener('mouseup', onElementMouseUp, false);
				vineBox.addEventListener('click', onElementClick, false);
				
				vine.addEventListener('dblclick', onVineDoubleClick, false);
				vine.addEventListener('mouseover', onVineMouseOver, false);
				vine.addEventListener('mouseout', onVineMouseOut, false);
				//vine.addEventListener('click', onVineClick, false);
		
				properties.push(vineBoxProps);
				elements.push(vineBox);
				bodies.push(createBox( world, vineBoxProps[0] + (vineBoxProps[2] >> 1), vineBoxProps[1] + (vineBoxProps[3] >> 1), vineBoxProps[2] / 2, vineBoxProps[3] / 2, false));

				// Clean position dependencies
				while ( vineBox.offsetParent ) {
					vineBox = vineBox.offsetParent;
					vineBox.style.position = 'static';
				}
			}
	    }
	});
}

function onVineMouseOver(e){
	var vine = (e.target) ? e.target : e.srcElement;
	vine.play();
	vine.muted = '';
}

function onVineMouseOut(e){
	var vine = (e.target) ? e.target : e.srcElement;
	vine.pause();
	vine.muted = 'true';
}

function onVineClick(e){
	var vine = (e.target) ? e.target : e.srcElement;
	console.log("single click");
	
	var degrees = 180;
	var power = 8;
	
	var body = bodies[vine.idx];
	console.log(body);
    body.ApplyImpulse(new b2Vec2(Math.cos(degrees * (Math.PI / 180)) * power,
                                 Math.sin(degrees * (Math.PI / 180)) * power),
                      new body.GetCenterPosition());
	
}

function onVineDoubleClick(e){
	var vine = (e.target) ? e.target : e.srcElement;

	//pause();
	//setTimeout(run, 1000);
	var duration = 200;
	var expandedSize = 300;
	var moveDistance = (expandedSize - vine.originalSize);

	if ($(this).hasClass('animating')) return;

	if ($(this).hasClass('expanded')) {
		$(this).addClass('animating');
		$(this).removeClass('expanded'); 
		$(this).animate({width: vine.originalSize + 'px', height: vine.originalSize + 'px'}, duration, function() { $(this).removeClass('animating'); });
		$(this).parent().animate({width: vine.originalSize + 'px', height: vine.originalSize + 'px', top: "+=" + moveDistance*0, left: "+=" + moveDistance/2}, {
			duration: duration,
			progress: function(animation, progress, remainingMs) {
				var vineBoxProps = getElementProperties(animation.elem);
				properties.splice(vine.idx, 1, vineBoxProps);
				elements.splice(vine.idx, 1, animation.elem);
				world.DestroyBody(bodies[vine.idx]);
				bodies.splice(vine.idx, 1, createBox( world, vineBoxProps[0] + (vineBoxProps[2] >> 1), vineBoxProps[1] + (vineBoxProps[3] >> 1), vineBoxProps[2] / 2, vineBoxProps[3] / 2, false));
			}
		});
	} else {
		$(this).addClass('animating');
		$(this).addClass('expanded'); 
		$(this).animate({width: "300px", height: "300px"}, duration, function() { $(this).removeClass('animating'); });
		$(this).parent().animate({width: "300px", height: "300px", top: "-=" + moveDistance, left: "-=" + moveDistance/2}, {
			duration: duration,
			progress: function(animation, progress, remainingMs) {
				var vineBoxProps = getElementProperties(animation.elem);
				properties.splice(vine.idx, 1, vineBoxProps);
				elements.splice(vine.idx, 1, animation.elem);
				world.DestroyBody(bodies[vine.idx]);
				bodies.splice(vine.idx, 1, createBox( world, vineBoxProps[0] + (vineBoxProps[2] >> 1), vineBoxProps[1] + (vineBoxProps[3] >> 1), vineBoxProps[2] / 2, vineBoxProps[3] / 2, false));
			}
		});
	}
	
}

