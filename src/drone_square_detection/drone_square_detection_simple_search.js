/*
  This module detects a square in an image and then starts moving towards it
  until the square is lost when the drone starts going up. Then it performs a simple
  search (going forward) until the square is detected by the bottom camera. The frame 
  processing is done using a setInterval which means the latest frame is processed at 
  a set interval.
*/

var arDrone = require('ar-drone');
var PaVEParser = require('../../../node_modules/ar-drone/lib/video/PaVEParser');
var cv = require('../../../node_modules/opencv/lib/opencv');
var output = require('fs').createWriteStream('./vid.h264');
var client  = arDrone.createClient();

//increase the amount of event listeners to allow more movements to be initiated
client.setMaxListeners(20);

var squareDetection = require('../square_detection/squareDetection')

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

//variable to check if the detected of the square should be activated
var deactivateDetection = 0;

//variable to state which detection function should be used
var bottomDetection = 0;

//variable to determine if the search for the bottom camera should be terminated
var searchBottom =0;

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

//function which starts hovering when the contour is lost
//in a predefined number of consecutive frames 
function lost(){

  //change video channel to bottom camera
  client.config('video:video_channel', '1');

  //deactivate square detection while the square is going up
  deactivateDetection = 1;

  //reset skippedFrames count
  skippedFrames=0;

  //decrease the processing timeout for the bottom camera processing
  PROCESSING_TIMEOUT = 50;
  
  client.stop();
  console.log("lost");
}

function landing(){
  deactivateDetection=1;
  client.land();
  console.log("land");
}

function up(speed){
  client.up(speed);
  console.log("up");
}

function backward(speed){
  client.back(speed);
  console.log("back");
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
          if(bottomDetection){

            square.detectBottomCamera(im);

            if(square._detectedBottom){
              searchBottom = 0;
              if(square._right){
                right(0.02);
              }
              if(square._left){
                left(0.02);
              }
              if(square._forward){
                front(0.02);
              }
              if(square._back){
                backward(0.02);
              }
              if(!square._right && !square._left && !square._forward && !square._back){
               
                landing();
              }  

            }
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

            if(square._lost == 10){
              lost();
              square._lost = 0;
              bottomDetection=1;
            }
          }
        } 
      });
    }

    //after the square is lost go up
    if(deactivateDetection && skippedFrames < 50){
      up(0.2);
    }
    else if(deactivateDetection && skippedFrames == 51){
      deactivateDetection = 0;
      searchBottom = 1;
    }

    //look for the square for some distance in front of the lost position until something is detected
    if(searchBottom && skippedFrames < 127 && skippedFrames >51){
      front(0.04);
      console.log("search");
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

client
  .after(2000, function(){
    this.takeoff();
  })
  .after(50000, function(){
    this.stop();
    this.land();
  });