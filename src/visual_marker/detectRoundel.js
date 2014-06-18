/*
   This module is setting configuring the drone to detect the black and 
   white roundel and print the detection results.
*/

var arDrone = require('ar-drone');
var PaVEParser = require('../../../node_modules/ar-drone/lib/video/PaVEParser')
var util = require('util');
var output = require('fs').createWriteStream(__dirname + '/detectionResults.log', {flags : 'w'});
var outputVideo = require('fs').createWriteStream('./vid.h264')

var client = arDrone.createClient();
var foundRoundel =0;

client.config('control:flying_mode','1');

//detects the roundel on bottom camera
client.config('detect:detect_type','12');

client.config('video:video_channel', '1');

//print information about the detected roundel(e.g. distance from drone, orientation angle etc.)
/*
function printState(data){

	if(data.visionDetect.nbDetected>0){
	
	}
	output.write(util.format("distance: "));
	output.write(util.format(data.visionDetect.dist) + '\n');
	output.write(util.format("orientationAngle: "));
	output.write(util.format(data.visionDetect.orientationAngle) + '\n');
	output.write(util.format("xc: "));
	output.write(util.format(data.visionDetect.xc) + '\n');
	output.write(util.format("yc: "));
	output.write(util.format(data.visionDetect.yc) + '\n');
	output.write(util.format("width: "));
	output.write(util.format(data.visionDetect.width) + '\n');
	output.write(util.format("height: "));
	output.write(util.format(data.visionDetect.height) + '\n');
	output.write('\n');
}*/

function detected(){
	
	client.animateLeds('snakeGreenRed', 10, 3);
	client.land();

	console.log("Roundel found");
}

client.on('navdata', function(data){

	if(data.visionDetect){
		if(data.visionDetect.nbDetected>0 && foundRoundel==0){
			foundRoundel=1;		
			detected();
		}	
	}
});

var video = client.getVideoStream();
var parser = new PaVEParser();

parser
  .on('data', function(data) {
    outputVideo.write(data.payload);
  })
  .on('end', function() {
    outputVideo.end();
  });

video.pipe(parser);

client.ftrim();
client.takeoff();


//move the drone forward
client
  .after(4000, function() {
    this.front(0.05);
  })
  .after(7000, function() {
    this.stop();
    this.land();
  });


