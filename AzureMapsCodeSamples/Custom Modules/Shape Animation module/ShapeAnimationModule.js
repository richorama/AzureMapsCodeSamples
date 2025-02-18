/** An animation manager for classes that extend from the AnimatedShape class. */
class ShapeAnimationManager {
    /****************************
    * Constructor
    ***************************/
    constructor() {
        /****************************
        * Private Properties
        ***************************/
        this._animation = null;
        this._queue = [];
        this._minFrameRate = 33; //roughly 30 frames per second is the fastest that the animation will update.
        this.stopped = true;
        this._lastTime = performance.now();
        this.play();
    }
    /****************************
    * Public functions
    ***************************/
    /** Stops all animations. */
    stop() {
        if (!this.stopped) {
            this.stopped = true;
            cancelAnimationFrame(this._animation);
        }
    }
    /** Continues playing all animations. */
    play() {
        if (this.stopped) {
            this.stopped = false;
            this._animation = requestAnimationFrame(this.animate.bind(this));
        }
    }
    /**
     * Adds an animated shape to the animation queue.
     * @param shape The shape to animate.
     */
    add(shape) {
        var idx = this._queue.indexOf(shape);
        //Only add the point to the queue if it isn't already in it.
        if (idx === -1) {
            this._queue.push(shape);
        }
    }
    /**
     * Removes a shape from the animation queue.
     * @param shape The shape to remove from the queue.
     */
    remove(shape) {
        var idx = this._queue.indexOf(shape);
        if (idx >= 0) {
            this._queue = this._queue.splice(idx, 1);
        }
    }
    /****************************
    * Private functions
    ***************************/
    /** Loops through the queue and animates a frame for each shape. */
    animate() {
        if (!this.stopped) {
            var t = performance.now();
            if (t - this._lastTime >= this._minFrameRate) {
                for (var i = 0, len = this._queue.length; i < len; i++) {
                    this._queue[i].animateFrame(t);
                }
                //Request the next frame of the animation.
                this._lastTime = t;
            }
            this._animation = requestAnimationFrame(this.animate.bind(this));
        }
    }
}
/****************************
* Public static properties
***************************/
/** A blobal static instance of the ShapeAnimationManager. */
ShapeAnimationManager.instance = new ShapeAnimationManager();
/** Abstract class for creating shapes that can be animated. */
class AnimatedShape extends atlas.Shape {
    /**
     * Abstract function that defines the animation logic for an animation frame.
     * @param timestamp The time stamp of animation frame.
     */
    animateFrame(timestamp) {
        throw 'You must extend this method.';
    }
}
/** A Point shape object that can be easily animated.*/
class AnimatedPoint extends AnimatedShape {
    /**
     * A Point shape object that can be easily animated.
     * @param point A Point object.
     * @param id The id of the point.
     * @param properties Properties to associate with the point.
     */
    constructor(point, id, properties) {
        super(point, id, properties);
        this._baseSetCoordinates = super.setCoordinates;
        ShapeAnimationManager.instance.add(this);
    }
    /****************************
    * Public Methods
    ***************************/
    /**
     * Sets the coordinate position of the point.
     * @param coord The coordinate position to animate the point to.
     * @param duration The duration of the animation in ms. Default: 0
     * @param geodesic Specifies if the point should follow the geodesic curvature of the map or not. By default straight, pixel accurate paths are used.
     */
    setCoordinates(coord, duration, geodesic) {
        //Stop any currently running animations.
        if (this._start) {
            this._start = null;
        }
        this._duration = 0;
        this._geodesic = false;
        //Validate the user specified options.
        if (typeof duration === 'number' && !isNaN(duration)) {
            this._duration = Math.abs(duration);
        }
        if (typeof geodesic === 'boolean') {
            this._geodesic = geodesic;
        }
        //If duration is 0, don't animate.
        if (this._duration === 0) {
            this._baseSetCoordinates(coord);
        }
        else {
            //Capture the current and new coordinate, and start time.  
            this._originPosition = super.getCoordinates();
            this._destinationPosition = coord;
            if (this._geodesic) {
                //Calculate the distance and heading between the points. 
                this._dx = atlas.math.getDistanceTo(this._originPosition, this._destinationPosition);
                this._heading = atlas.math.getHeading(this._originPosition, this._destinationPosition);
            }
            else {
                //Calculate the mercator pixels of the coordinates at zoom level 21.
                var pixels = atlas.math.mercatorPositionsToPixels([this._originPosition, this._destinationPosition], 21);
                this._originPixel = pixels[0];
                //Calculate the distance and heading between the pixels. 
                this._dx = Math.sqrt(Math.pow(pixels[0][0] - pixels[1][0], 2) + Math.pow(pixels[0][1] - pixels[1][1], 2));
                this._heading = atlas.math.getPixelHeading(this._originPosition, this._destinationPosition) - 90;
            }
            //Start the animation.
            this._start = performance.now();
        }
    }
    /**
    * Defines the animation logic for an animation frame.
    * @param timestamp The time stamp of animation frame.
    */
    animateFrame(timestamp) {
        //Calculate elapsed time since start of animation.
        var dt = timestamp - this._start;
        if (dt >= this._duration) {
            //Animation is done.
            this._baseSetCoordinates(this._destinationPosition);
            this._start = null;
        }
        else if (dt < 0) {
            this._baseSetCoordinates(this._originPosition);
        }
        else if (dt >= 0) {
            var progress = dt / this._duration;
            var dx = this._dx * progress;
            //Calculate the coordinate part way between the origin and destination.
            if (this._geodesic) {
                this._baseSetCoordinates(atlas.math.getDestination(this._originPosition, this._heading, dx));
            }
            else {
                this._baseSetCoordinates(atlas.math.mercatorPixelsToPositions([[
                        this._originPixel[0] + dx * Math.cos(this._heading * Math.PI / 180),
                        this._originPixel[1] + dx * Math.sin(this._heading * Math.PI / 180),
                    ]], 21)[0]);
            }
        }
    }
}
//# sourceMappingURL=ShapeAnimationModule.js.map