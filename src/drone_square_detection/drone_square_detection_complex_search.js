/*
  This module detects a rectangle in an image and then starts moving towards it
  until the rectangle is lost when the drone starts moving upward. Then it moves 
  forward, right, forward, left and so on until the rectangle is detected. The 
  frame processing is done using a setInterval which means the latest frame is 
  processed at a set interval.
*/

var arDrone = require('ar-drone');
var PaVEParser = require('../../../node_modules/ar-drone/lib/video/PaVEParser');
var cv = require('../../../node_modules/opencv/lib/opencv');
var output = require('fs').createWriteStream('./vid.h264');
var client  = arDrone.createClient();

//increase the amount of event listeners to allow more movements to be initiated
client.setMaxListeners(0);

var squareDetection = require('../square_detection/squareDetection');

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

//number of frames to move left or right during search
var LF_FRAMES = 30;

//number of frames to move forward
var FOR_FRAMES = 20;

//number of frames to move up
var UP_FRAMES = 50;

//number of frames used for search
var COUNT_FRAMES = UP_FRAMES + 1;

//variable to determine previous search movement: 0=forward after right 1=left
// 2=forward after left 3=right
var pre_movement = 1;

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
  PROCESSING_TIMEOUT = 80;
  
  //client.up(0.1);
  client.stop();
  console.log("lost");
}

//land command
function landing(){

  if(square._detectedSquare){
    deactivateDetection=1;
    skippedFrames = 0;
    client.land();
  }

  console.log("land");
}

//function which performs upward movement
function up(speed){
  client.up(speed);
  console.log("up");
}

//function which performs downward movemern
function down(speed){
  client.down(speed);
  console.log("down");
}

//function which performs backward movement
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

          //Bottom Camera Controller
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
                square.checkRightAngles(im);
                landing();
              }  
             
            }
          }

          //Front Camera Controller
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
                front(0.08);
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
    if(!square._detectedSquare && deactivateDetection && skippedFrames < UP_FRAMES){
      up(0.2);
    }
    else if(!square._detectedSquare && deactivateDetection && skippedFrames == UP_FRAMES){
      deactivateDetection = 0;
      searchBottom = 1;
    }

    // move forward after moving left
    if(searchBottom && skippedFrames < (COUNT_FRAMES + FOR_FRAMES) && skippedFrames >COUNT_FRAMES && pre_movement==1 ){
      front(0.04);
      console.log("search");
    }
    else if(searchBottom && skippedFrames == (COUNT_FRAMES + FOR_FRAMES) && pre_movement==1){
      COUNT_FRAMES = COUNT_FRAMES + FOR_FRAMES;
      pre_movement = 2;
    }

    //move forward after moving right
    if(searchBottom && skippedFrames < (COUNT_FRAMES + FOR_FRAMES) && skippedFrames >COUNT_FRAMES && pre_movement==3 ){
      front(0.04);
      console.log("search");
    }
    else if(searchBottom && skippedFrames == (COUNT_FRAMES + FOR_FRAMES) && pre_movement==3){
      COUNT_FRAMES = COUNT_FRAMES + FOR_FRAMES;
      pre_movement = 0;
    }

    //move right
    if(searchBottom && skippedFrames < (COUNT_FRAMES + LF_FRAMES) && skippedFrames > COUNT_FRAMES && pre_movement==2 ){
      right(0.04);
      console.log("search");
    }
    else if(searchBottom && skippedFrames == (COUNT_FRAMES + LF_FRAMES) && pre_movement==2){
      COUNT_FRAMES = COUNT_FRAMES + LF_FRAMES;
      pre_movement = 3;
    }

    //move left
    if(searchBottom && skippedFrames < (COUNT_FRAMES + LF_FRAMES) && skippedFrames >COUNT_FRAMES && pre_movement==0 ){
      left(0.04);
      console.log("search");
    }
    else if(searchBottom && skippedFrames == (COUNT_FRAMES + LF_FRAMES) && pre_movement==0){
      COUNT_FRAMES = COUNT_FRAMES + LF_FRAMES;
      pre_movement = 1;
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
  .after(65000, function(){
    this.stop();
    this.land();
  });