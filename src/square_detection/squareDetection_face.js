/*
   This module detects a convex contour which satisfies specific conditions,
   identifies the center of the contour, and checks its positioning with respect
   to the center of the image. This squareDetection module is specifically designed 
   for a square follower. 
   */

var cv = require('../../../node_modules/opencv/lib/opencv');

//thresholds for HSV space for red colour for the front camera(found experimentally)
var LOWER_THRESHOLD = [0,120, 100];
var UPPER_THRESHOLD = [10,255, 255];
var LOWER_THRESHOLD1 = [160, 170, 85];
var UPPER_THRESHOLD1 = [180,255, 255];
	
//canny high and low threshold
var lowThresh = 20;
var highThresh = 3*lowThresh;

//values used for the detection using the front camera
var NB_VERTICES = 4;
var MIN_AREA = 1200;
var CENTER_THRES = 15;
var count = 0;

//value used to determine when the contour is too close to the drone and it should just hover in place
var MAX_AREA = 9000;


var WHITE = [255, 255, 255]; //B, G, R

console.time('proc');

function squareDetection(client, options){

	options = options || {};

	this._client = client;
	this._left = 0;
	this._right = 0;
	this._forward = 0;
	this._lost =0;
	this._detected =0;
}

//function which returns the cosine of the angle between
//two vectors which start at point0 and end at point1, point2
squareDetection.prototype.cosine = function(point0, point1, point2){

	vx1 = point1.x - point0.x;
	vx2 = point2.x - point0.x;
	vy1 = point1.y - point0.y;
	vy2 = point2.y - point0.y;

	v1 = Math.sqrt(vx1*vx1+vy1*vy1);
	v2 = Math.sqrt(vx2*vx2+vy2*vy2);
	dotProduct = vx1*vx2+vy1*vy2;

	return dotProduct/(v1*v2);

}


squareDetection.prototype.detect = function(im){

	//new image
	var all = new cv.Matrix(im.height(), im.width());

	image = im.copy();

	//convert the image to HSV
	image.convertHSVscale();

	im1=image.copy();
	im2=image.copy();

	im1.inRange(LOWER_THRESHOLD, UPPER_THRESHOLD);
	im2.inRange(LOWER_THRESHOLD1, UPPER_THRESHOLD1);
	image.addWeighted(im1,1,im2,1);

	//blur and dilate the result
	image.gaussianBlur();
	image.dilate(2);

	im_copy = image.copy();

	//find the contours in the filtered image
	contours = im_copy.findContours();
	
	//if the contour have previously been detected or lost, increment the lost variable
	//which will be reset if the contour is detected
	if( (this._detected > 0) || (this._lost>0) ){
		this._lost = this._lost +1;
	}
	
	//reset detected
	this._detected = 0;

	for(var i=0; i<contours.size();i++){

		//calculates the contour perimenter
		var arcLength = contours.arcLength(i, true);

		var max_cosine = 0;

		//approximates the contour to a polygonal curve
		contours.approxPolyDP(i, 0.05 * arcLength, true);

		//checks if the contour is convex, has 4 vertices and an area bigger than a  and then calculates the 
		//cosine between all the edges
		//if(contours.cornerCount(i)== NB_VERTICES && contours.isConvex(i) == true && contours.area(i)>MIN_AREA && contours.area(i)< MAX_AREA){
		if(contours.area(i)>MIN_AREA && contours.area(i)< MAX_AREA){

			//calculate the moments of the contour and calculate the x,y centers 
			var moments = contours.moments(i);
			var cgx = Math.round(moments.m10/moments.m00);
			var cgy = Math.round(moments.m01/moments.m00);
			image.ellipse(cgx,cgy, 5, 5);

			//check if the center is within a predefined center threshold and set the right, left
			//variables accordingly
			if(cgx<((100-CENTER_THRES)/200)*im.width()){
				this._left = 1;
			}
			else{
				this._left = 0;
			}

			if(cgx>((100+CENTER_THRES)/200)*im.width()){
				this._right = 1;
			}
			else{
				this._right = 0;
			}

			//increment detected and reset lost
			this._detected = this._detected + 1;
			this._lost =0;
		}		
	}	
}

module.exports = squareDetection;

