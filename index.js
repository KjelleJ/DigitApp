import * as tf from '@tensorflow/tfjs';
tf.ENV.set('WEBGL_PACK', false); // fix Edge problem
// as MNIST data.
var fillStyle = "#000000"; //  black
var strokeStyle = "#FFFFFF"; //  white
var lineWidth = 5;

var rimage = new Image(); // image saved for rotation
var rangle = 0; // angle for rotatation

const click = document.getElementById("click_sound"); 

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var crect = canvas.getBoundingClientRect();

var inter; // 360 running
var eraser = 0;
var norm = 1; // normalize

var model_name = "white";
var histo_toggle = 0;

ctx.fillStyle = fillStyle;
ctx.strokeStyle = strokeStyle;

clear();

// last known position
var pos = { x: 0, y: 0 };

window.addEventListener('resize', resize);
document.getElementById('canvas').addEventListener('mousemove', draw);
document.getElementById('canvas').addEventListener('mousedown', setPosition);
document.getElementById('canvas').addEventListener('mouseenter', setPosition);
document.getElementById("clear_btn").addEventListener("click", clear);
document.getElementById("inverse_btn").addEventListener("click", inverse);
document.getElementById("left_btn").addEventListener("click", left);
document.getElementById("right_btn").addEventListener("click", right);
document.getElementById("up_btn").addEventListener("click", up);
document.getElementById("down_btn").addEventListener("click", down);
document.getElementById("predict_btn").addEventListener("click", predict_btn);
document.getElementById("toggle_btn").addEventListener("click", toggle);
document.getElementById("toggle_norm_btn").addEventListener("click", toggle_normalize);
document.getElementById("zoom_in_btn").addEventListener("click", zoom_in);
document.getElementById("zoom_out_btn").addEventListener("click", zoom_out);
document.getElementById("rright_btn").addEventListener("click", rright);
document.getElementById("rleft_btn").addEventListener("click", rleft);
document.getElementById("r360_btn").addEventListener("click", r360);
document.getElementById("eraser_btn").addEventListener("click", toggle_eraser);
document.getElementById("normalize_btn").addEventListener("click", normalize_action);

document.getElementById('canvas').addEventListener("touchstart", setTouchPos, true);
document.getElementById('canvas').addEventListener("touchmove", touchDraw, true);
document.getElementById('canvas').addEventListener("touchend", setTouchPos, true);

var model;
var preds = [[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]];

load_model();
histo('?');

//--------------------- Draw canvas functions ---------------------------------------

// new position from mouse event
function setPosition(e) {
  crect = canvas.getBoundingClientRect();
  pos.x = e.clientX - crect.left;
  pos.y = e.clientY - crect.top;
}

// new position from touch event
function setTouchPos(e) {
	crect = canvas.getBoundingClientRect();
	var touches = event.changedTouches;
    var first = touches[0];
	pos.x = first.clientX - crect.left;
	pos.y = first.clientY - crect.top;
}

function draw(e) {
  // mouse left button must be pressed 
  if (e.buttons !== 1) return;
  ctx.beginPath(); // begin
  ctx.lineWidth = lineWidth;
  if (eraser) {
	ctx.lineWidth = 4*lineWidth;
	ctx.strokeStyle = fillStyle;
  }
  ctx.lineCap = 'round';
  ctx.moveTo(pos.x, pos.y); // from
  setPosition(e);
  ctx.lineTo(pos.x, pos.y); // to
  ctx.stroke(); // draw it!
  if (eraser) {
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = strokeStyle;
  }
  reset_rot();
}

function touchDraw(e) {
  ctx.beginPath(); // begin
  ctx.lineWidth = lineWidth;
   if (eraser) {
	ctx.lineWidth = 4*lineWidth;
	ctx.strokeStyle = fillStyle;
  } 
  ctx.lineCap = 'round';
  ctx.moveTo(pos.x, pos.y); // from
  setTouchPos(e);
  ctx.lineTo(pos.x, pos.y); // to
  ctx.stroke(); // draw it!
  event.preventDefault();
  if (eraser) {
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = strokeStyle;
  }
  reset_rot();
}

// resize - handle screen rotation - not handled

function resize() {
	crect = canvas.getBoundingClientRect();
	reset_rot();
}

//--------------------- Presentation functions ---------------------------------------
function clear() {
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	reset_rot();
	document.getElementById("model").innerHTML = model_name;
}

function toggle() {
	if (model_name.length ==  5)
		model_name = 'black_white';
	else
		model_name = 'white';
	document.getElementById("model").innerHTML = model_name;
	load_model();
}

function toggle_normalize() {
	var predict_btn = document.getElementById("predict_btn");
	if (norm) {
		norm = 0;
		$("#predict_btn").removeClass("btn-danger").addClass("btn-primary");
	//	predict_btn.classlist.remove("btn-danger");
	//	predict_btn.classlist.add("btn-primary");
	} else {
		norm = 1;
		$("#predict_btn").removeClass("btn-primary").addClass("btn-danger");
		//predict_btn.classlist.remove("btn-primary");
		//predict_btn.classlist.add("btn-danger");
	}
}

function toggle_eraser() {
	if (eraser)
		eraser = 0;
	else
		eraser = 1;
}

function right() {
	const pos = 5;
	var cData = ctx.getImageData(0, 0, canvas.width - pos, canvas.height);
	ctx.putImageData(cData, pos, 0);
	ctx.fillRect(0, 0, pos, canvas.height);	
	reset_rot();
}

function left() {
	const pos = 5;
	var cData = ctx.getImageData(pos, 0, canvas.width, canvas.height);
	ctx.putImageData(cData, 0, 0);
	ctx.fillRect(canvas.width - pos, 0, canvas.width, canvas.height);	
	reset_rot();
}

function up() {
	const pos = 5;
	var cData = ctx.getImageData(0, pos, canvas.width, canvas.height);
	ctx.putImageData(cData, 0, 0);
	ctx.fillRect(0, canvas.height - pos, canvas.width, canvas.height);
	reset_rot();	
}

function down() {
	const pos = 5;
	var cData = ctx.getImageData(0, 0, canvas.width, canvas.height - pos);
	ctx.putImageData(cData, 0, pos);
	ctx.fillRect(0, 0, canvas.width, pos);	
	reset_rot();
}

function inverse() {
	const save = fillStyle;
	fillStyle = strokeStyle;
	strokeStyle = save;
	ctx.fillStyle = fillStyle;
	ctx.strokeStyle = strokeStyle;

	var cData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var cdata = cData.data;	
	for (var i = 0; i < cdata.length; i += 4) { // inverse
      cdata[i] = 255 - cdata[i];
	  cdata[i+1] = 255 - cdata[i+1];
	  cdata[i+2] = 255 - cdata[i+2];
    }
	ctx.putImageData(cData, 0, 0);
	reset_rot();
}

function zoom_out() {
	//var cData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	ctx.drawImage(canvas, 0, 0 , canvas.width, canvas.height, 10, 10, canvas.width - 20, canvas.height - 20);
	ctx.fillRect(0, 0, canvas.width, 10);
	ctx.fillRect(0, canvas.height - 10, canvas.width, canvas.height);
	ctx.fillRect(0, 0, 10, canvas.height);
	ctx.fillRect(canvas.width - 10, 0, canvas.width, canvas.height);
	reset_rot();
}

function zoom_in() {
	//var cData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	ctx.drawImage(canvas, 10, 10 , canvas.width - 20, canvas.height - 20, 0, 0, canvas.width, canvas.height);
	reset_rot();	
}

function rright() {
	rangle = rangle + 10;
	rotate(rangle);
}

function rleft() {
	rangle = rangle - 10;	
	rotate(rangle);
}

function r360() {
	var r360_btn = document.getElementById('r360_btn');	
	if (inter != null) {
		clearInterval(inter);
		r360_btn.innerHTML ='360';
		inter = null;
	} else {
		var rright_btn = document.getElementById("rright_btn");
		r360_btn.innerHTML = 'Stop';
		predict(0);
		rright_btn.click();
		var i = 1;
		inter = setInterval(function(){ 
			predict(0);
			rright_btn.click();
			if (i == 35) r360_btn.click();
			i++;
		}, 500);
	}
}

function rotate(angle) {
	ctx.save(); // save current coord system
	ctx.translate(canvas.width/2, canvas.height/2); // move to middle of canvas
	ctx.rotate(angle * Math.PI / 180); // rotate
	ctx.drawImage(rimage, -(rimage.width/2), -(rimage.height/2)); // will be rotated
	ctx.restore();
}

function reset_rot() {
	rimage.src = canvas.toDataURL('image/png', 1.0); // save canvas as image
	rangle = 0;
}

function normalize_action() {
	normalize(1); //with rectangle and timeout
}

function normalize(timeout) {
	var lx, ty, rx, by; // bounding rectangle
	var fix, lix;
	var fillpix = 255;
	if (fillStyle.indexOf("00") > 0) fillpix = 0;
	var cData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var cdata = cData.data;

	lx = getLx(cdata, fillpix, canvas.width, canvas.height);
	if (lx == -1) return; // canvas is empty
	rx = getRx(cdata, fillpix, canvas.width, canvas.height);
	ty = getTy(cdata, fillpix, canvas.width, canvas.height);
	by = getBy(cdata, fillpix, canvas.width, canvas.height);

	if (timeout) {
		draw_rect(lx - 2, ty - 2, rx + 2, by + 2, "#FF0000"); // bounding rectangle
		setTimeout(function() { do_norm(lx, ty, rx, by);
			}, 500); // end setTimeout
	} else 
		do_norm(lx, ty, rx, by);
}

function do_norm(lx, ty, rx, by) {
		draw_rect(lx - 2, ty - 2, rx + 2, by + 2, fillStyle);

		// We have 200x200, MNIST is 28x28 where the margin is 4 => Our margin should be around 28.
		var marg = 28;
		var sw = rx + 1 - lx;
		var sh = by + 1 - ty;
		var prop = sw/sh;
		var ax, ay; // actual x and y
		var aw, ah; // actual with and height
		if (sh > sw) {
			ah = canvas.height - 2*marg;
			ax = Math.floor(0.5*(canvas.width - prop*ah));
			ay = marg;
			aw = Math.floor(prop*(canvas.height - 2*marg));
		} else {
			aw = canvas.width - 2*marg;
			ax = marg
			ay = Math.floor(0.5*(canvas.height - aw/prop));
			ah = Math.floor((canvas.width - 2*marg)/prop);		
		}
		ctx.drawImage(canvas, lx, ty, sw, sh, ax, ay, aw, ah);
		
		ctx.fillRect(0, 0, canvas.width, ay);
		ctx.fillRect(0, ay + ah, canvas.width, canvas.height);
		ctx.fillRect(0, 0, ax, canvas.height);
		ctx.fillRect(ax + aw, 0, canvas.width, canvas.height);
		
		reset_rot();	
}

function getTy(cdata, fillpix, width, height) {
	var fix;
	for (fix=0; fix < cdata.length; fix+=4) {
		if (cdata[fix] != fillpix) break;	
	}
	if (fix == cdata.length) return -1; // canvas is empty
	return Math.floor(fix/(width*4));
}

function getBy(cdata, fillpix, width, height) {
	var lix;
	for (lix=cdata.length - 4; lix >= 0; lix-=4) {
		if (cdata[lix] != fillpix) break;	
	}
	return Math.floor(lix/(width*4));
}

function getLx(cdata, fillpix, width, height) {
	var fix=0;
	var row, col;
	for (col=0; col < width; col++) {
		for (row=0; row < height; row++) {
			fix = (row*width + col)*4;
			if (cdata[fix] != fillpix) return col;		
		}
	}
	return -1; // canvas is empty
}

function getRx(cdata, fillpix, width, height) {
	var lix;
	var row, col;
	for (col=width-1; col >= 0; col--) {
		for (row=height-1; row >= 0; row--) {
			lix = (row*width + col)*4;
			if (cdata[lix] != fillpix) return col;	
		}
	}
	return -1;
}

function draw_rect(lx, ty, rx, by, color) {
	var savStroke = ctx.strokeStyle;
	ctx.lineWidth = 2;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.rect(lx, ty, rx - lx, by - ty);
	ctx.stroke();
	ctx.strokeStyle = savStroke;
}

function histo(prediction) {
	var num;
	var result = [];
	for (var i = 0; i < 10; i++) {
		num = preds[0][i];
		if (num < 0.0001) num = 0.0;
		result[i] = num.toFixed(2);	
	}
	document.getElementById("pred").innerHTML = 'Digit: ' + prediction;
	var results ='';
	var sec = '<span id="res" class="badge badge-secondary">';
	var suc = '<span id="res" class="badge badge-success">';
	for (var i = 0; i<10; i++) {
		if (i == prediction)
			results = results + suc + result[i] + '</span>';
		else
			results = results + sec + result[i] + '</span>';			
		if (i == 4) results = results + "<br>";
	}
	document.getElementById("res").innerHTML = results;	
	var histo = document.getElementById('histo');
	var hctx = histo.getContext('2d');
	hctx.fillStyle="#FFFFFF";
	hctx.fillRect(0, 0, histo.width, histo.height);;
	if (histo_toggle == 0) {
		hctx.fillStyle="#00FF00";
		histo_toggle = 1;
	} else {
		hctx.fillStyle="#00AEED";
		histo_toggle = 0;
	}
	hctx.strokeStyle="#000000";
	hctx.textBaseline = "bottom";
	hctx.font = "20px Arial";
	for (var i=0; i < 10; i++) {
		hctx.fillRect(i*20, histo.height - parseInt(result[i]*histo.height), 20, parseInt(result[i]*histo.height));
		hctx.strokeText(i, i*20+3, histo.height/2); 
	}
}
//--------------------- Prediction functions ---------------------------------------
function load_model() {
	var load_pr = tf.loadLayersModel('./' + model_name + '/model.json');
	load_pr.then(function(value) { // handle promise
		model = value;
	});
}

function predict_btn() {
	predict(1);
}

function predict(sound) {
	if (sound) {
		if (norm) normalize(0);
		click.play();
	}
	var cData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var cdata = cData.data;	
	for (var i = 0; i < cdata.length; i += 4) { // to grayscale
      cdata[i] = (cdata[i] + cdata[i + 1] + cdata[i + 2]) / 3;
    }
	var x = tf.browser.fromPixels(cData, 1).asType('float32'); // keep only one channel	
	x = tf.image.resizeNearestNeighbor(x, [28, 28]);	// resize, no normalization
	x = x.expandDims();
	x = x.div(255);
	var prediction;
		
	tf.tidy(() => { 
    const output = model.predict(x);
    const axis = 1;
    prediction = Array.from(output.argMax(axis).dataSync());
	preds = output.arraySync();
	});
	histo(prediction);
}

	