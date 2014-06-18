/*
   This module detects a convex contour which satisfies specific conditions,
   identifies the center of the contour, and checks its positioning with respect
   to the center of the image. Also, it the contour is lost after previously being 
   detected it will increment a variable. Various other functions exists for checking
   the right angles of a contour or for contour detection using the bottom camera.
*/

var cv = require('../../../node_modules/opencv/lib/opencv');

//thresholds for HSV space for red colour for the front camera(found experimentally)
var LOWER_THRESHOLD = [0,100, 160];
var UPPER_THRESHOLD = [10,220, 255];
var LOWER_THRESHOLD1 = [160, 100, 160];
var UPPER_THRESHOLD1 = [180,200, 255];

//thresholds for HSV space for red colour for the bottom camera
var LOWER_THRESHOLD_B = [0,200, 160];
var UPPER_THRESHOLD_B = [10,255, 255];
var LOWER_THRESHOLD1_B = [160, 140, 160];
var UPPER_THRESHOLD1_B = [180,255, 255];
	
//canny high and low threshold
var lowThresh = 20;
var highThresh = 3*lowThresh;

//values used for the detection using the front camera
var NB_VERTICES = 4;
var MIN_AREA = 500;
var CENTER_THRES = 15;
var count = 0;

//values used for the detection using the bottom camera
var MIN_AREA_BOTTOM = 4000;

//left-right threshold for bottom camera
var LR_THRES_BOTTOM = 20;

//forward threshold for the bottom camera
var FOR_THRES_BOTTOM = 50;

//bachward threshold for the bottom camera
var BACK_THRES_BOTTOM = 20;

var WHITE = [255, 255, 255]; //B, G, R

console.time('proc');

function squareDetection(client, options){

	options = options || {};

	this._client = client;
	this._left = 0;
	this._right = 0;
	this._forward = 0;
	this._back = 0;
	this._lost =0;
	this._detected =0;
	this._detectedBottom = 0;
	this._detectedSquare = 0;
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

//function to check the condition for the contour to be a square/rectangle
squareDetection.prototype.checkRightAngles = function(im){

	im_copy = im.copy();

	im_copy.save("./checking angles.png");

	contours = im_copy.findContours();

	for(var i=0; i<contours.size();i++){

		//calculates the contour perimenter
		var arcLength = contours.arcLength(i, true);

		var max_cosine = 0;

		//approximates the contour to a polygonal curve
		contours.approxPolyDP(i, 0.05 * arcLength, true);

		//checks if the contour is convex, has 4 vertices and an area bigger than a  and then calculates the 
		//cosine between all the edges
		if(contours.cornerCount(i)== NB_VERTICES && contours.isConvex(i) == true && contours.area(i)>MIN_AREA_BOTTOM){

			for(var j=0; j<NB_VERTICES;j++){
				cos = Math.abs(this.cosine(contours.point(i,j),contours.point(i,(j+1)%4),contours.point(i,(j+3)%4)));
				max_cosine = Math.max(max_cosine, cos);
			}

			if (max_cosine < 0.1){
				this._detectedSquare =1;
				console.log("square detected");
			}

		}
	}
}

//function which detects a contour of the specified colour on the 
//bottom camera and tries to center it with respect to the 
//center of the camera imahe
squareDetection.prototype.detectBottomCamera = function(im){
	
	//new image
	var all = new cv.Matrix(im.height(), im.width());

	//convert the image to HSV
	im.convertHSVscale();

	im1=im.copy();
	im2=im.copy();

	im1.inRange(LOWER_THRESHOLD_B, UPPER_THRESHOLD_B);
	im2.inRange(LOWER_THRESHOLD1_B, UPPER_THRESHOLD1_B);
	im.addWeighted(im1,1,im2,1);

	//blur and dilate the result
	im.gaussianBlur();
	//im.canny(lowThresh, highThresh,3);
	im.dilate(2);

	im_copy = im.copy();

	contours = im_copy.findContours();

	this._detectedBottom = 0;

	for(var i=0; i<contours.size();i++){

		//calculates the contour perimenter
		var arcLength = contours.arcLength(i, true);

		var max_cosine = 0;

		//approximates the contour to a polygonal curve
		contours.approxPolyDP(i, 0.05 * arcLength, true);

		//checks if the contour is convex and an area bigger than a specified area
		if(contours.isConvex(i) == true && contours.area(i)>MIN_AREA_BOTTOM){

			this._detectedBottom = 1;

			//calculate the moments of the contour and calculate the x,y centers 
			var moments = contours.moments(i);
			var cgx = Math.round(moments.m10/moments.m00);
			var cgy = Math.round(moments.m01/moments.m00);
			im.ellipse(cgx,cgy, 5, 5);

			//check if the center is within a predefined center threshold and set the right, left
			//variables accordingly

			//variables to store the amount of distance for the center of the image if the 
			//threshold contraints are violated
			var right_violation, left_violation, forward_violation, backward_violation;

			if(cgx<((100-LR_THRES_BOTTOM)/200)*im.width()){
				this._left = 1;
				left_violation = im.width()/2 - cgx;
			}
			else{
				this._left = 0;
			}

			if(cgx>((100+LR_THRES_BOTTOM)/200)*im.width()){
				this._right = 1;
				right_violation = cgx - im.width()/2;
			}
			else{
				this._right = 0;
			}

			if(cgy<((100-FOR_THRES_BOTTOM)/200)*im.height()){
				this._forward = 1;
				forward_violation = im.height()/2 - cgy;
			}
			else{
				this._forward = 0;
			}

			if(cgy>((100+BACK_THRES_BOTTOM)/200)*im.height()){
				this._back = 1;
				back_violation = cgy - im.height()/2;
			}
			else{
				this._back = 0;
			}

			//check which violation is higher to decide which direction to take
			if(this._forward && this._left){
				if (forward_violation > left_violation){
					this._left =0;
				}
				else{
					this._forward = 0;
				}
			}
			if(this._forward && this._right){
				if(forward_violation > right_violation){
					this._right =0;
				}
				else{
					this._forward = 0;
				}
			}
			
			if(this._back && this._left){
				if(back_violation > left_violation){
					this._left = 0;
				}
				else{
					this._back = 0;
				}
			}
			if(this.back && this._right){
				if(back_violation > right_violation){
					this._right = 0;
				}
				else{
					this._back = 0;
				}

			}

		}		
	}
}

squareDetection.prototype.detect = function(im){

	//new image
	var all = new cv.Matrix(im.height(), im.width());

	//convert the image to HSV
	im.convertHSVscale();

	im1=im.copy();
	im2=im.copy();

	im1.inRange(LOWER_THRESHOLD, UPPER_THRESHOLD);
	im2.inRange(LOWER_THRESHOLD1, UPPER_THRESHOLD1);
	im.addWeighted(im1,1,im2,1);

	//blur and dilate the result
	im.gaussianBlur();
	//im.canny(lowThresh, highThresh,3);
	im.dilate(2);

	im_copy = im.copy();

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
		if(contours.cornerCount(i)== NB_VERTICES && contours.isConvex(i) == true && contours.area(i)>MIN_AREA){

			//calculate the moments of the contour and calculate the x,y centers 
			var moments = contours.moments(i);
			var cgx = Math.round(moments.m10/moments.m00);
			var cgy = Math.round(moments.m01/moments.m00);
			im.ellipse(cgx,cgy, 5, 5);

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

