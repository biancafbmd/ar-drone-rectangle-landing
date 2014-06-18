/*
  This module is a Rectangle Follower with basic people avoidance. It detects a 
  square and start moving towards it unless there is a face detected too close 
  to the drone in which case the drone start hovering.
*/

var arDrone = require('ar-drone');
var PaVEParser = require('../../../node_modules/ar-drone/lib/video/PaVEParser');
var cv = require('../../../node_modules/opencv/lib/opencv');
var output = require('fs').createWriteStream('./vid.h264');
var client  = arDrone.createClient();

//increase the amount of event listeners to allow more movements to be initiated
client.setMaxListeners(0);

var squareDetection = require('../square_detection/squareDetection_face')

//square detection constructor
var square = new squareDetection(client);

var faceDetection = require('../face_detection/faceDetection');

//face detection constructor
var faceDet = new faceDetection(client);

//flag for process frame in progress
var processFrame = 0;

//variable to hold the most recent Png
var recentPng;

//variable used to skip frames
var skippedFrames = 0;

//set the period of the timeout in milliseconds
var PROCESSING_TIMEOUT = 102;

//variable to check if the detected of the square should be activated
var deactivateDetection = 0;

//change video channel to 0 for the front camera
client.config('video:video_channel', '0');


var video = client.getVideoStream();
var png = client.getPngStream();
var parser = new PaVEParser();


//save video
parser
  .on('data', function(data) {
    output.write(data.payload);
  })
  .on('end', function() {
    output.end();
  });

video.pipe(parser);

//function which perfoms left movement when the center of the 
//contour is found at the left of the image
function left(speed){

  client.left(speed);

  console.log("left move \n");
}

//function which perfoms right movement when the center of the 
//contour is found at the right of the image
function right(speed){

  client.right(speed);

  console.log("right move");
}

//function which perfoms left movement when the center of the 
//contour is found within the center threshold
function front(speed){

  client.front(speed);

  console.log("front move");
}


function up(speed){
  client.up(speed);
  console.log("up");
}

//function which performs the image processing and establishes 
//the next move of the drone 
var detectSquare = function(){  

  if( (!processFrame) && recentPng){
    processFrame = 1;

    client.stop();

    if(!deactivateDetection){
      cv.readImage(recentPng, function(err,im){

        if (im){

          //check for faces
          faceDet.detectFaces(im);

          //if a face is too near start hovering
          if(faceDet._near){
            console.log("stop");
          }

          else{
            square.detect(im);

            if(square._detected){

              if(square._right){
                right(0.05);
              } 

              if(square._left){
                left(0.05);
              }
              
              if( (!square._left) && (!square._right)){
                front(0.1);
              }
            }
          }
        } 
      });
    }

    //initially go up in order to be able to detect faces
    if(deactivateDetection && skippedFrames < 70 && skippedFrames > 30){
      up(0.2);
    }
    else if(deactivateDetection && skippedFrames == 71){
      deactivateDetection = 0;
    }

    skippedFrames = skippedFrames + 1;  
    processFrame = 0;
  }
};

//save the most recent Png
png
  .on('error', console.log)
	.on('data', function(data){
		recentPng = data;    
	});

//set the time delays between each image processing
var imageProcessing = setInterval(detectSquare,PROCESSING_TIMEOUT);

client.ftrim();

//timeout after 30 secs
client
  .after(2000, function(){
    this.takeoff();
    deactivateDetection = 1;
  })
  .after(30000, function(){
    this.stop();
    this.land();
  });