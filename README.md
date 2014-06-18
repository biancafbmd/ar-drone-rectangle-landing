
This code is the result of my Final Year Project at Imperial College London.
The title of my project is "Achieving autonomous flight in a quadcopter". 

This code is built on top of [node-ar-drone](https://github.com/felixge/node-ar-drone)
and uses [node-opencv](https://github.com/peterbraden/node-opencv) for image processing.
I would like to thank the authors and contributors of these two node.js modules for their
amazing work and comprehensive examples.

**WARNING** This is an indoor experiment. IT REQUIRES A LOT OF PRECAUTIONS. Make sure you 
have enough space when running these programs. The drone can easily become unstable 
especially in the proximity of walls. The drone also loses connection with the computer quite 
often. In this case, it will either timeout or keep executing the last command issued. 

**EMERGENCY MOVE:** flip the drone carefully and it will enter emergency mode which will 
stop the propellers. After this it is recommended to reset the drone 
(there is a small reset button under the baterry holder).

## Content

This project is split into five different programs:

* Landing on the Black-White Roundel (initial test)

The drone assumes the roundel is a few meters in front of it so it moves forward and if the 
roundel is detected, then a land command is issued.

* Landing on a red rectangle with simple search

The drone assumes a red rectangle is in the field of vision of the front camera. The red rectangle
is then detected and the drone starts moving towards it until it is lost from the view of the front
camera. After losing the rectangle, the drone moves upward and forward until it detects the rectangle
with its bottom camera. Commands are issued to centre the rectangle in the image received from the 
bottom camera. When the rectangle is centred, the drone is sent a land command. There is a timeout in
place.

* Landing on a red rectangle with complex search

The drone assumes a red rectangle is in the field of vision of the front camera. The red rectangle
is then detected and the drone starts moving towards it until it is lost from the view of the front
camera. After losing the rectangle, the drone moves upward and then forward, right, forward, left, 
forward and so on,  until it detects the rectangle with its bottom camera. Commands are issued to 
centre the rectangle in the image received from the bottom camera. When the rectangle is centred, 
it is checked if the contour has right angles and four vertices and if this is the case, then the drone 
is sent a land command. There is a timeout in place.

* Rectangle follower

The drone assumes there is a red rectangle on a moving target(person) or on a wall. The drone starts
moving towards the rectangle stopping within maximum 80cm from it. There is a timeout in place.

* Rectangle follower with basic people avoidance

The drone assumes there is a red rectangle on a moving target(person) or on a wall. The drone starts
moving towards the rectangle stopping within maximum 80cm from it. If there is a face too close to the 
drone then the drone starts to hover. There is a timeout in place.

## User guide

In order to run any of these programs, the user needs to make sure that node-ar-drone, node-opencv and 
OpenCV 2.3.1 are installed on the computer. 

In order to run:

* Landing on the Black-White Roundel

```bash
	node detectRoundel.js
```

* Landing on a red rectangle with simple search

```bash
	node drone_square_detection_simple_search.js
```

* Landing on a red rectangle with complex search

```bash
	node drone_square_detection_complex_search.js
```

* Rectangle follower
```bash
	node drone_square_detection_follower.js
```

* Rectangle follower with basic people avoidance
```bash
	node drone_square_detection_face_detection.js
```

**REMARK** The image filtering might not always work due to the fact that it was configured
specifically for the environment were the tests were performed. Also make sure all the paths 
used in the files are correct. 