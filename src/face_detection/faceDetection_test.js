/*
   This module tests the face detection module.
*/

var arDrone = require('ar-drone');
var cv = require('../../../node_modules/opencv/lib/opencv');
var client  = arDrone.createClient();

var png = client.getPngStream();

var faceDetection = require('../face_detection/faceDetection');

//face detection constructor
var faceDet = new faceDetection(client);

png
	.on('error', console.log)
	.on('data', function(data){

		cv.readImage(data, function(err,im){
			if(im){
				faceDet.detectFaces(im);
    			if(faceDet._near){
    				console.log("stop");
    			}
			}
			
    	});
	});
