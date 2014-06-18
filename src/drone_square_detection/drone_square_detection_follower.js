/*
  This module detects a square in an image and then starts moving towards it
  always centering the center of the square. This implements a Rectangle Follower. 
*/

var arDrone = require('ar-drone');
var PaVEParser = require('../../../node_modules/ar-drone/lib/video/PaVEParser');
var cv = require('../../../node_modules/opencv/lib/opencv');
var output = require('fs').createWriteStream('./vid.h264');
var client  = arDrone.createClient();

var squareDetection = require('../square_detection/squareDetection_follower');

//square detection constructor
var square = new squareDetection(client);

//flag for process frame in progress
var processFrame = 0;

//variable to hold the most recent Png
var recentPng;

//variable used to skip frames
var skippedFrames = 0;

//set the period of the timeout in milliseconds
var PROCESSING_TIMEOUT = 60;

//variable for command when square is to be detected by the bottom camera
var squareBottom = 0;


//change video channel to 0 for the front camera
client.config('video:video_channel', '0');

var video = client.getVideoStream();
var png = client.getPngStream();
var parser = new PaVEParser();

var start = process.hrtime();

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

//function which performs the image processing and establishes 
//the next move of the drone 
var detectSquare = function(){  


  if( (!processFrame) && recentPng){
    processFrame = 1;

    client.stop();
    
    cv.readImage(recentPng, function(err,im){

      if (im){
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
    });

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

//timeout after 25 sec
client
  .after(2000, function(){
    this.takeoff();
  })
  .after(25000, function(){
    this.stop();
    this.land();
  });