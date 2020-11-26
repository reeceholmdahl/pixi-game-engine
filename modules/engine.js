/**
 * HOLISTIC NOTES:
 * - engine class, update sprites for all physbodies
 * - stats html area
 * - debug mode, displays to debug section in HTML; create debug html section first
 */

export class Vector2 {

    /**
     * Creates a 2d vector
     * @param {Number} x x-coordinate of vector
     * @param {Number} y y-coordinate of vector
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Using two vectors as coordinates, calculates the slope between them
     * @param {*} vector1 First coordinate of slope calculation
     * @param {*} vector2 Second coordinate of slope calculation
     * @returns {Number} Returns the slope of the two vectors
     */
    static slope(vector1, vector2) {
        if (vector2.x > vector1.x) {
            return (vector2.y - vector1.y) / (vector2.x - vector1.x);
        } else {
            return (vector1.y - vector2.y) / (vector1.x - vector2.x);
        }
    }
}

export class Physbody {

    /**
     * A physics entity; called here a physbody. Using axis-aligned bounding-box collision system, the parameters create an AABB that represents the sprite attached to it.
     * @param {Number} x The x-coordinate of the bounding-box
     * @param {Number} y The y-coordinate of the bounding-box
     * @param {Number} width The width of the bounding-box
     * @param {Number} height The height of the bounding-box
     * @param {Physbody.TYPE} type The type of this physbody; dynamic is moving, static is stationary. Defaults to static.
     * @param {Number} renderPriority The priority dictating when this physbody is rendered; rendered in descending order. Defaults to 0
     * @param {PIXI.Texture} texture The texture for the sprite attached to this physbody. Defaults to white texture
     */
    constructor(x, y, width, height, type = Physbody.TYPE.STATIC, renderPriority = 0, texture = PIXI.Texture.WHITE) {

        // Position
        this.x = x;
        this.y = y;

        // Velocity
        this.vx = 0;
        this.vy = 0;

        // Acceleration
        this.ax = 0;
        this.ay = 0;

        // Bounding box
        this.width = width;
        this.height = height;

        // Cache bounding box representing this physbody's location and size
        this.cache = new PIXI.Rectangle(x, y, width, height);

        // Physbody type
        this.type = type;

        // Gravity
        this.gravity = false;

        // Wrapping y-axis
        this.wrapY = false;

        // Variable for whether or not physbody is on the ground
        this.grounded = false;

        // Custom collision functions array
        this.customFunctions = [];

        // Create and update sprite
        this.sprite = new PIXI.Sprite(texture);
        this.sprite.name = renderPriority;
        this.updateSprite();

        // Add this physbody to, depending on the type, the static bodies array or dynamic bodies array
        if (type == Physbody.TYPE.STATIC) {
            Physics.staticBodies.push(this);
        } else if (type == Physbody.TYPE.DYNAMIC) {
            Physics.dynamicBodies.push(this);
        } else {
            Physics.symbolicBodies.push(this);
        }
    }

    /**
     * The left edge of this physbody
     */
    getLeft() {
        return this.x;
    }

    /**
     * The right edge of this physbody
     */
    getRight() {
        return this.x + this.width;
    }

    /**
     * The top edge of this physbody
     */
    getTop() {
        return this.y;
    }

    /**
     * The bottom edge of this physbody
     */
    getBottom() {
        return this.y + this.height;
    }

    /**
     * The x-coordinate of the center of this physbody
     */
    getMidX() {
        return this.x + this.width / 2;
    }

    /**
     * The y-coordinate of the center of this physbody
     */
    getMidY() {
        return this.y + this.height / 2;
    }

    /**
     * Adds this physbody to the passed container
     * @param {PIXI.Container} container The container to add this physbody to
     * @returns {Physbody} Returns self in order to allow chaining
     */
    addToContainer(container) {
        container.addChild(this.sprite);
        return this;
    }

    /**
     * Updates the attached sprites x and y coordinate, and height and width according to the current physbody values
     */
    updateSprite() {
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.sprite.width = this.width;
        this.sprite.height = this.height;
    }

    updateCache() {
        this.cache.x = this.x;
        this.cache.y = this.y;
        this.cache.width = this.width;
        this.cache.height = this.height;
    }

    /**
     * Controls whether or not gravity is on for this physbody. Only works if the type is dynamic.
     * @param {Boolean} enabled Whether or not gravity should be enabled
     */
    setGravity(enabled) {
        this.gravity = enabled;
    }

    /**
     * Controls whether or not y-axis wrapping is on for this physbody. Only works if the type is dynamic.
     * @param {Boolean} enabled Whether or not y-axis wrapping should be enabled
     */
    setWrapY(enabled) {
        this.wrapY = enabled;
    }
}

/**
 * The type of the physbody, dynamic; moving, or static; stationary
 */
Physbody.TYPE = {
    DYNAMIC: 'dynamic',
    STATIC: 'static',
    SYMBOLIC: 'symbolic',
};

export class Physics {

    /**
     * Step the game physics one iteration forwards with respect to the data of all the dynamic physbodies
     * @param {Number} elapsedMS The elapsed time in ms from the last frame to this one
     */
    static step(elapsedMS) {

        // Local array containing all the physbodies
        const entities = Physics.dynamicBodies;

        // Iterate through array and apply physics calculations to them; velocity and position iterations
        for (const entity of entities) {

            // Apply old position to physbody cache
            entity.updateCache();

            // Update the entity's position cache
            entity.cache_x = entity.x;
            entity.cache_y = entity.y;

            // Set the physbody's gravity, if enabled
            if (entity.gravity) Physics.gravity(entity);
            
            // Update the physbody's velocity
            entity.vx += entity.ax * elapsedMS;
            entity.vy += entity.ay * elapsedMS;

            // Update the physbody's position
            entity.x += entity.vx * elapsedMS;
            entity.y += entity.vy * elapsedMS;

            if (entity.wrapY) Physics.wrapY(entity);
        }
    }

    /**
     * Returns an array containing all physbodies; dynamic first, then static
     * @returns {Array<Physbody>} An array containing all physbodies
     */
    static getBodies() {
        return Physics.dynamicBodies.concat(Physics.staticBodies, Physics.symbolicBodies);
    }

    /**
     * Set the y-axis acceleration to the gravity modifier
     * @param {Physbody} physbody The physbody to apply gravity to
     */
    static gravity(physbody) {
        physbody.ay = physbody.grounded ? 0 : Physics.GRAVITY_AY;
        if (physbody.vy > Physics.TERMINAL_VELOCITY) {
            physbody.vy = Physics.TERMINAL_VELOCITY;
        }
    }

    static wrapY(physbody) {
        if (physbody.y > Physics.WRAP_Y_BOTTOM) {
            physbody.y = Physics.WRAP_Y_TOP - physbody.height;
        } else if (physbody.y < Physics.WRAP_Y_TOP - physbody.height) {
            physbody.y = Physics.WRAP_Y_BOTTOM;
        }
    }
}

/**
 * Create arrays which contain each physbody in the game, split into separate arrays by their type
 * @see Physbody.TYPE
 * @see Physics.getBodies
 */
Physics.staticBodies = [];
Physics.dynamicBodies = [];
Physics.symbolicBodies = [];

/**
 * Create static constants for the Physics class; gravity acceleration, terminal velocity, and screen wrapping bounds
 * @see Physics.gravity
 * @see Physics.wrapY
 */
Physics.GRAVITY_AY = 0.0035;
Physics.TERMINAL_VELOCITY = 4.5;
Physics.WRAP_Y_BOTTOM = 920;
Physics.WRAP_Y_TOP = -200;

export class CollisionHandler {

    /**
     * Test if there is a collision between the two supplied physbodies
     * @param {Physbody} dynamicBody The moving body in this collision instance
     * @param {Physbody} staticBody The stationary body in this collision instance
     * @returns {Boolean} The boolean outcome of the collision test; true if colliding, false if not
     */
    static isColliding(dynamicBody, staticBody) {

        // If any of the following conditions are true, the bodies cannot be colliding
        if (dynamicBody.getRight() < staticBody.getLeft()
            || dynamicBody.getLeft() > staticBody.getRight()
            || dynamicBody.getTop() > staticBody.getBottom()
            || dynamicBody.getBottom() < staticBody.getTop()) {
            return false;
        }

        // If it's made it this far, there is a collision
        return true;
    }

    /**
     * Calculates the overlap of the two bodies, returning a vector of the overlap in the x and y axes respectively
     * @param {Physbody} dynamicBody The dynamic body in the collision
     * @param {Physbody} staticBody The static body in the collision
     * @returns {Vector2} Returns the overlap in both axes as a 2D vector
     */
    static calculateOverlap(dynamicBody, staticBody) {

        // Difference between the mid points of the two bodies; x and y coordinate
        const dMidX = staticBody.getMidX() - dynamicBody.getMidX();
        const dMidY = staticBody.getMidY() - dynamicBody.getMidY();

        // Calculates the overlap depth on both the x and y axes
        const overlapX = Math.abs((Math.abs(dMidX) - (dynamicBody.width + staticBody.width) / 2));
        const overlapY = Math.abs((Math.abs(dMidY) - (dynamicBody.height + staticBody.height) / 2));

        // Returns both overlaps in a vector form
        return new Vector2(overlapX, overlapY);
    }

    /**
     * Checks the collisions between all dynamic bodies and all static bodies. If there is a collision, push to an array containing all collisions this game step.
     * The collision array is ordered by overlap area; significance of collision, the most important collision is resolved first.
     */
    static checkCollisions() {

        // Arrays for dynamic bodies and static bodies
        const dynamicBodies = Physics.dynamicBodies;
        const staticBodies = Physics.staticBodies;
        const symbolicBodies = Physics.symbolicBodies;

        // Iterate through array of dynamic bodies
        for (const dynamicBody of dynamicBodies) {

            dynamicBody.grounded = false;

            // Iterate through array of static bodies to check for collisions between each dynamic body and each static body
            for (const staticBody of staticBodies) {

                // If there is a collision between these bodies, calculate its overlap area and push it to the collisions array
                if (CollisionHandler.isColliding(dynamicBody, staticBody)) {

                    const overlap = CollisionHandler.calculateOverlap(dynamicBody, staticBody);

                    // // If the dynamic body if this collision has a custom collision function, add it to the custom collision function execution array
                    // if (dynamicBody.customFunctions.length > 0) CollisionHandler.customFunctionsThisStep.push.apply(CollisionHandler.customFunctionsThisStep, dynamicBody.customFunctions);

                    // // If the static body if this collision has a custom collision function, add it to the custom collision function execution array
                    // if (staticBody.customFunctions.length > 0) CollisionHandler.customFunctionsThisStep.push.apply(CollisionHandler.customFunctionsThisStep, staticBody.customFunctions);

                    // Add this collision to the array of collisions this game step
                    CollisionHandler.collisionsThisStep.push({
                        dynamicBody: dynamicBody,
                        staticBody: staticBody,
                        overlapArea: overlap.x * overlap.y,
                    });
                }
            }

            // Iterate through the array of symbolic bodies to check for collisions between each dynamic body and each symbolic body
            for (const symbolicBody of symbolicBodies) {

                // If there is a collision between these bodies, add their custom collision function to the custom collision function execution array
                if (CollisionHandler.isColliding(dynamicBody, symbolicBody, 0)) {

                    // console.log('symbolic collision');

                    // If the dynamic body has custom collision function(s), add them to the array
                    if (dynamicBody.customFunctions.length > 0) CollisionHandler.customFunctionsThisStep.push.apply(CollisionHandler.customFunctionsThisStep, dynamicBody.customFunctions);

                    // If the symbolic body has custom collision function(s), add them to the array
                    if (symbolicBody.customFunctions.length > 0) CollisionHandler.customFunctionsThisStep.push.apply(CollisionHandler.customFunctionsThisStep, symbolicBody.customFunctions);
                }
            }

            /**
             * IF THERE IS NEED TO COLLIDE TWO DYNAMIC BODIES, IMPLEMENT HERE
             */
        }

        // Sort array containing collisions this physics by descending order, pertaining to each collision's overlap area
        CollisionHandler.collisionsThisStep.sort((a, b) => {
            return b.overlapArea - a.overlapArea
        });
    }

    /**

     * Resolve a collision between two physbodies; one dynamic, or moving, and one static, or stationary
     * @param {Physbody} dynamicBody The moving body in this collision equation
     * @param {Physbody} staticBody The static body in this collision equation
     */
    static resolveCollision(dynamicBody, staticBody) {

        // Determine what collision section
        const cachedDyanmicBody = dynamicBody.cache;

        const cacheInWidth = cachedDyanmicBody.right > staticBody.getLeft() && cachedDyanmicBody.left < staticBody.getRight();
        const cacheInHeight = cachedDyanmicBody.bottom > staticBody.getTop() && cachedDyanmicBody.top < staticBody.getBottom();

        const overlap = CollisionHandler.calculateOverlap(dynamicBody, staticBody);

        if (cacheInWidth && cachedDyanmicBody.bottom <= staticBody.getTop()) {
            // will be top collision
            dynamicBody.y -= overlap.y;
            dynamicBody.vy = 0;
            dynamicBody.grounded = true;
        } else if (cacheInWidth && cachedDyanmicBody.top >= staticBody.getBottom()) {
            // will be bottom collision
            dynamicBody.y += overlap.y;
            dynamicBody.vy = 0;
        } else if (cacheInHeight && cachedDyanmicBody.right <= staticBody.getLeft()) {
            // will be left collision
            dynamicBody.x -= overlap.x;
            dynamicBody.vx = 0;
        } else if (cacheInHeight && cachedDyanmicBody.left >= staticBody.getRight()) {
            // will be right collision
            dynamicBody.x += overlap.x;
            dynamicBody.vx = 0;
        } else {

            /**
             * Handling corner slope cases where dynamic body cached position isn't directly in line to collide with any specific edge, and slope needs to be calculated to ensure
             * realistic looking collisions occur. Handles each corner quadrant separately; top left, top right, bottom right, bottom left. Depending on the difference between the
             * cached body and dynamic body's current position vs the difference between the cached body and corner of static body's position, it determines which way the dynamic
             * body should collide.
             */

            // Get midpoints of cached dyanmic body and static body
            let cachedBodyMid = new Vector2(cachedDyanmicBody.x + cachedDyanmicBody.width / 2, cachedDyanmicBody.y + cachedDyanmicBody.height / 2);
            let staticBodyMid = new Vector2(staticBody.getMidX(), staticBody.getMidY());

            // Cached dynamic body is above the static body
            if (cachedBodyMid.y < staticBodyMid.y) {
                
                // Cached dynamic body is to the left of the static body
                if (cachedBodyMid.x < staticBodyMid.x) {

                    const dynamicBodyBottomRight = new Vector2(dynamicBody.getRight(), dynamicBody.getBottom());
                    const cachedBodyBottomRight = new Vector2(cachedDyanmicBody.right, cachedDyanmicBody.bottom);
                    const staticBodyTopLeft = new Vector2(staticBody.getLeft(), staticBody.getTop());
                    
                    const dynamicBodyChangeSlope = Vector2.slope(dynamicBodyBottomRight, cachedBodyBottomRight);
                    const cachedToCornerSlope = Vector2.slope(cachedBodyBottomRight, staticBodyTopLeft);

                    if (dynamicBodyChangeSlope > cachedToCornerSlope) {
                        dynamicBody.y -= overlap.y;
                    } else {
                        dynamicBody.x -= overlap.x;
                    }
                }
                
                // Cached dynamic body is to the right of the static body
                else if (cachedBodyMid.x > staticBodyMid.x) {

                    const dynamicBodyBottomLeft = new Vector2(dynamicBody.getLeft(), dynamicBody.getBottom());
                    const cachedBodyBottomLeft = new Vector2(cachedDyanmicBody.left, cachedDyanmicBody.bottom);
                    const staticBodyTopRight = new Vector2(staticBody.getRight(), staticBody.getTop());

                    const dynamicBodyChangeSlope = Vector2.slope(dynamicBodyBottomLeft, cachedBodyBottomLeft);
                    const cachedToCornerSlope = Vector2.slope(cachedBodyBottomLeft, staticBodyTopRight);

                    if (dynamicBodyChangeSlope > cachedToCornerSlope) {
                        dynamicBody.y -= overlap.y;
                    } else {
                        dynamicBody.x += overlap.x;
                    }
                }        
            }
            
            // Cached dynamic body is below the static body
            else if (cachedBodyMid.y > staticBodyMid.y) {

                // Cached dynamic body is to the left of the static body
                if (cachedBodyMid.x < staticBodyMid.x) {

                    const dynamicBodyTopRight = new Vector2(dynamicBody.getRight(), dynamicBody.getTop());
                    const cachedBodyTopRight = new Vector2(cachedDyanmicBody.right, cachedDyanmicBody.top);
                    const staticBodyBottomLeft = new Vector2(staticBody.getLeft(), staticBody.getBottom());

                    const dynamicBodyChangeSlope = Vector2.slope(dynamicBodyTopRight, cachedBodyTopRight);
                    const cachedToCornerSlope = Vector2.slope(cachedBodyTopRight, staticBodyBottomLeft);

                    if (dynamicBodyChangeSlope < cachedToCornerSlope) {
                        dynamicBody.y += overlap.y;
                    } else {
                        dynamicBody.x -= overlap.x;
                    }
                }
                
                // Cached dynamic body is to the right of the static body
                else if (cachedBodyMid.x > staticBodyMid.x) {

                    const dynamicBodyTopLeft = new Vector2(dynamicBody.getLeft(), dynamicBody.getTop());
                    const cachedBodyTopLeft = new Vector2(cachedDyanmicBody.left, cachedDyanmicBody.top);
                    const staticBodyBottomRight = new Vector2(staticBody.getRight(), staticBody.getBottom());

                    const dynamicBodyChangeSlope = Vector2.slope(dynamicBodyTopLeft, cachedBodyTopLeft);
                    const cachedToCornerSlope = Vector2.slope(cachedBodyTopLeft, staticBodyBottomRight);

                    if (dynamicBodyChangeSlope < cachedToCornerSlope) {
                        dynamicBody.y += overlap.y;
                    } else {
                        dynamicBody.x += overlap.x;
                    }      
                }
            }
        }
    }

    /**
     * Resolve all collisions this game step
     */
    static resolveCollisions() {

        // Array of all collisions this game step
        const collisions = CollisionHandler.collisionsThisStep;

        // Iterate through each collision
        for (const collision of collisions) {

            // Resolve the collision
            CollisionHandler.resolveCollision(collision.dynamicBody, collision.staticBody);
        }

        // After collisions have been resolved, clear array for next game step
        CollisionHandler.collisionsThisStep = [];
    }

    /**
     * Execute all custom collision functions this step in the execution array
     */
    static executeCustomCollisionFunctions() {

        // Array of all custom collision functions this step
        const customFunctions = CollisionHandler.customFunctionsThisStep;

        // Execute each function
        for (const func of customFunctions) {
            func();
        }

        // Clear the array for the next step
        CollisionHandler.customFunctionsThisStep = [];
    }
}

// An array containing all of the collisions this game step
CollisionHandler.collisionsThisStep = [];

// An array containing all of the custom collision functions to be executed this game step
CollisionHandler.customFunctionsThisStep = [];