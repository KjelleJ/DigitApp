import * as tf from '@tensorflow/tfjs';
tf.ENV.set('WEBGL_PACK', false); // fix Edge problem
// as MNIST data.
var fillStyle = "#000000"; //  black
var strokeStyle = "#FFFFFF"; //  white

const click = document.getElementById("click_sound"); 

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var crect = canvas.getBoundingClientRect();

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
document.getElementById("predict_btn").addEventListener("click", predict);
document.getElementById("toggle_btn").addEventListener("click", toggle);
document.getElementById("zoom_in_btn").addEventListener("click", zoom_in);
document.getElementById("zoom_out_btn").addEventListener("click", zoom_out);

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
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.moveTo(pos.x, pos.y); // from
  setPosition(e);
  ctx.lineTo(pos.x, pos.y); // to
  ctx.stroke(); // draw it!
}

function touchDraw(e) {
  ctx.beginPath(); // begin
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.moveTo(pos.x, pos.y); // from
  setTouchPos(e);
  ctx.lineTo(pos.x, pos.y); // to
  ctx.stroke(); // draw it!
  event.preventDefault();
}

// resize - handle screen rotation - not handled

function resize() {
	crect = canvas.getBoundingClientRect();
}


//--------------------- Presentation functions ---------------------------------------
function clear() {
	ctx.fillRect(0, 0, canvas.width, canvas.height);
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

function right() {
	var cData = ctx.getImageData(0, 0, canvas.width - 5, canvas.height);
	ctx.putImageData(cData, 5, 0);
	ctx.fillRect(0, 0, 5, canvas.height);	
}

function left() {
	var cData = ctx.getImageData(5, 0, canvas.width, canvas.height);
	ctx.putImageData(cData, 0, 0);
	ctx.fillRect(canvas.width - 5, 0, canvas.width, canvas.height);	
}

function up() {
	var cData = ctx.getImageData(0, 5, canvas.width, canvas.height);
	ctx.putImageData(cData, 0, 0);
	ctx.fillRect(0, canvas.height - 5, canvas.width, canvas.height);	
}

function down() {
	var cData = ctx.getImageData(0, 0, canvas.width, canvas.height - 5);
	ctx.putImageData(cData, 0, 5);
	ctx.fillRect(0, 0, canvas.width, 5);	
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
}

function zoom_out() {
	//var cData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	ctx.drawImage(canvas, 0, 0 , canvas.width, canvas.height, 10, 10, canvas.width - 20, canvas.height - 20);
	ctx.fillRect(0, 0, canvas.width, 10);
	ctx.fillRect(0, canvas.height - 10, canvas.width, canvas.height);
	ctx.fillRect(0, 0, 10, canvas.height);
	ctx.fillRect(canvas.width - 10, 0, canvas.width, canvas.height);
}

function zoom_in() {
	//var cData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	ctx.drawImage(canvas, 10, 10 , canvas.width - 20, canvas.height - 20, 0, 0, canvas.width, canvas.height);
	
}

function histo(prediction) {
	var num;
	var result = [];
	for (var i = 0; i < 10; i++) {
		num = preds[0][i];
		if (num < 0.0001) num = 0.0;
		result[i] = num.toFixed(2);	
	}
	//console.log(preds);
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
		//console.log(i*20); 
		//console.log(histo.height - parseInt(result[i]*histo.height));
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

function predict() {
	click.play();
	var cData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var cdata = cData.data;	
	for (var i = 0; i < cdata.length; i += 4) { // to grayscale
      cdata[i] = (cdata[i] + cdata[i + 1] + cdata[i + 2]) / 3;
    }

	var x = tf.browser.fromPixels(cData, 1).asType('float32'); // keep only one channel	
	x = tf.image.resizeNearestNeighbor(x, [28, 28]);	// resize
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

	