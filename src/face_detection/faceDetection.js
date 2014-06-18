/*
   This module detects faces in an image and draws a rectangle around it.
*/

var cv = require('../../../node_modules/opencv/lib/opencv');

//colour used to draw the rectangle
var COLOR = [0, 0, 255];

//thickness of the draw rectangle
var THICKNESS = 2;

THRESHOLD = 60; 

MAX_AREA = 10000;

var stopMov = 0;


function faceDetection(client, options){

	options = options || {};

	this._client = client;

	this._near = 0;

}


//function which detected the faces and draws a rectangle around them
faceDetection.prototype.detectFaces = function(im){

	//x-y centers of the rectangle 
	var cgx, cgy;

	image_copy = im.copy();

	if(!image_copy.empty() && image_copy.channels() > 1){

		image_copy.detectObject('../../../node_modules/opencv/data/haarcascade_frontalface_alt.xml', {}, function(err, faces) {

			if (err) throw err; 

			stopMov = 0;

			if(!faces.lenght){

				for(var k = 0; k < faces.length; k++) {


					var face = faces[k];

					//draw a rectangle around the detected face
					image_copy.rectangle([face.x, face.y], [face.x + face.width, face.y + face.height], COLOR, THICKNESS);
					console.log("found face");


					//calculate the center of the face rectangle
					cgx = face.x + face.width/2;
					cgy = face.y + face.height/2;

					//determine if the face is too close by checking the area and the thresholds
					if(face.width*face.height > MAX_AREA){
						stopMov = 1;
					}

				}
			} 

		image_copy.save('./face.png');

		}); 

		this._near = stopMov;
	}

}

module.exports = faceDetection;