/** 
 * Variable for PIXI application; to bo set in @see Renderer.init
 */
let application;

/**
 * Constants for game engine:
 * - The id of the element to set as the parent of the PIXI renderer
 * - The HTML element that is the display
 * - The normalized height of the renderer; the maximum height of the on screen coordinate system
 */
const PARENT_ID = 'display';
const DISPLAY_ELEMENT = document.getElementById(PARENT_ID);
const NORMALIZED_RENDER_HEIGHT = 640;

export class Renderer {

    /**
     * Initializes the PIXI renderer and sets up critical functions involved with the render view like fullscreen checks and size-independent view scaling
     */
    static init() {

        // Initialize the PIXI application
        application = new PIXI.Application();

        // Append the renderer view to the HTML page
        document.getElementById(PARENT_ID).appendChild(application.view);

        // Adds the automatic screen resizer and scalar to the internal PIXI ticker; should not be involved with game engine ticker
        application.ticker.add(() => {
            
            // Resize the application with respect to the HTML parent; the display div
            application.resizeTo = DISPLAY_ELEMENT;
            application.resize();

            // Generate scalar based on local game size; local coordinate system game height is 640 pixels
            const scalar = application.renderer.height / NORMALIZED_RENDER_HEIGHT;

            // Apply the scalar to the game stage; container
            application.stage.scale.set(scalar, scalar);
        });

        // Add event listener for fullscreen state change; handles renderer view adjustments and internal variables
        window.addEventListener('fullscreenchange', e => {
            Renderer._fullscreen = !Renderer._fullscreen;
            if (Renderer._fullscreen) {

                // If full screen, resize application to entire window
                application.resizeTo = document.body;
            } else {

                // If not full screen, resize application to HTML parent; display div
                application.resizeTo = DISPLAY_ELEMENT;
            }
        });

        // TODO Temporary key change full screen state
        window.addEventListener('keyup', e => {
            if (e.key == 'f') {
                if (!Renderer._fullscreen) {
                    DISPLAY_ELEMENT.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            }
        });
    }

    /**
     * Loads a scene, can also be used by setting Renderer.scene.
     * @param {Scene} newScene The scene to be loaded
     */
    static loadScene(newScene) {

        // Stop the game engine ticker while loading scene; performance and alleviates glitches
        Renderer.ticker.stop();

        // If currently loaded scene is actually a scene, perform the removal process
        if (Renderer.scene instanceof Scene) {

            // Remove all ticker functions from the old scene from the game engine ticker
            for (const tickerFunc of Renderer.scene.functions) {
                Renderer.ticker.remove(tickerFunc.func, tickerFunc.context);
            }

            // Reset the ticker function array in the old scene; in case it's loaded again
            Renderer.scene.functions.length = 0;

            // Purge all physbodies, the new scene will make new ones
            Physics.purgeEntities();

            // Reset camera coordinates
            Camera.x = 0;
            Camera.y = 0;
        }

        // Create new container object to pass to the new scene setup function
        const container = new PIXI.Container();

        // Use the PIXI loader to access game assets; resources
        application.loader.load((_, resources) => {

            // Call the scene setup method, passing the game assets and new container; builds the scene
            newScene.setup(resources, container);

            /**
             * TODO as the Scene options list grows, handle them here
             */

            // Autofill options with defaults if any are missing
            const options = Object.assign({}, Scene.DEFAULT_OPTIONS, newScene.options);

            // Set the background of the scene
            application.renderer.backgroundColor = options.backgroundColor;

            /**
             * If debug is enabled in the options, turn on the debug functions. For now, this is limited to:
             * - Physbody collision bounding-box outline
             */
            if (options.debug) {
                newScene.functions.push(DEBUG_OUTLINE_FUNCTION);
                container.addChild(DEBUG_OUTLINE_FUNCTION.graphics);
            }

            // Sort all the children in the container by its z-index. Z-index on its own doesn't seem to do anything, but sorting this works for render priority
            container.children.sort((a, b) => {
                return a.zIndex - b.zIndex;
            });

            // Add ticker functions from this scene to the game engine ticker
            newScene.functions.forEach(func => {
                Renderer.ticker.add(func.func, func.context, func.priority);
            });
        });

        // Set the current stage view to the new scene's container
        application.stage = container;

        // Last thing before ticker start; set current stage variable to the new one
        Renderer._scene = newScene;

        // Restart the game engine ticker now that the new scene has been loaded
        Renderer.ticker.start();
    }

    /**
     * Adds a game asset to the loader. Offloads to the @see AssetLoader class to allow function chaining.
     * @param {String} name The name of the game asset
     * @param {String} location The (relative or absolute) location of the game asset
     * @returns {AssetLoader} Returns @see AssetLoader class for function chaining
     */
    static addAsset(name, location) {
        return AssetLoader.addAsset(name, location);
    }   

    /**
     * Get the renderer main stage
     * @returns {PIXI.Container} Returns the stage of the PIXI renderer; the main container
     */
    static get stage() {
        return application.stage;
    }

    /**
     * Get the time between the last frame and this one in ms
     * @returns {Number} Returns the delta ms
     */
    static get deltaMS() {
        console.log(application.ticker.FPS)
        return application.ticker.deltaMS;
    }
}

// Define static ticker property of Renderer; interactable
Object.defineProperty(Renderer, 'ticker', {
    value: new PIXI.Ticker(),
    writable: false,
    enumerable: true,
    configurable: false,
});

// Define static scene property of Renderer; interactable
Object.defineProperty(Renderer, 'scene', {
    
    get() {
        return Renderer._scene;
    },

    set(newScene) {
        Renderer.loadScene(newScene);
    },
});

// Define static internal scene property of Renderer; not intended for interaction
Object.defineProperty(Renderer, '_scene', {
    value: null,
    writable: true,
    enumerable: false,
    configurable: false,
});

// Define static internal fullscreen property of Renderer; not intended for interaction
Object.defineProperty(Renderer, '_fullscreen', {
    value: false,
    writable: true,
    enumerable: false,
    configurable: false,
});


export class AssetLoader {

    /**
     * @param {String} name 
     * @param {String} location 
     */
    static addAsset(name, location) {

        application.loader.add(name, location);

        return this;
    }
}

export class TickerFunction {

    /**
     * A function that will be run by the ticker when its scene is loaded
     * @param {Function} func The function to be run
     * @param {*} context The context of the function; helps with removal, usually this or the scene it resides in. Defaults to null.
     * @param {Number} priority The priority of the function; functions are executed in descending order based on priority. Defaults to 0.
     */
    constructor(func, context, priority) {
        this.func = func;
        this.context = context;
        this.priority = priority;
    }
}

const DEBUG_OUTLINE_FUNCTION = new TickerFunction(() => {

    DEBUG_OUTLINE_FUNCTION.graphics.clear();

    const bodies = Physics.getBodies();

    for (const body of bodies) {
        DEBUG_OUTLINE_FUNCTION.graphics.lineStyle(1, 0x00ff00, 1, 0);
        const screenCords = Camera.toScreenCoordinates(body.body.min);
        DEBUG_OUTLINE_FUNCTION.graphics.drawRect(screenCords.x, screenCords.y, body.body.width, body.body.height);
    }
}, this, -10);

DEBUG_OUTLINE_FUNCTION.graphics = new PIXI.Graphics();

export class Scene {

    /**
     * A scene to render to the application. The convention I've established for this is to construct a scene and open an anonymous function as the
     * receipt for the "setup" parameter and write all of the logic inside of it. It looks nice and keeps scenes neatly organized and separated
     * from each other.
     * @param {Function<Resources, PIXI.Container>} setup The setup function for the scene; is called when loading the scene
     */
    constructor(setup) {

        // Setup function
        this.setup = setup

        // Define readonly function array property of each scene
        Object.defineProperty(this, 'functions', {
            value: [],
            writable: false,
            enumerable: true,
            configurable: false,
        });

        // Options object
        this.options = {};
    }
}

// Define default scene options constant
Object.defineProperty(Scene, 'DEFAULT_OPTIONS', {
    value: {
        backgroundColor: 0x999999,
        debug: false,
    },
    writable: false,
    enumerable: false,
    configurable: false,
});

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
     * Clones this vector
     */
    clone() {
        return Object.assign({}, this);
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

// Define zero vector constant
Object.defineProperty(Vector2, 'zero', {
    get() {
        return new Vector2(0, 0);
    },
});

export class AABB {

    /**
     * Makes an axis-aligned bounding-box. A rectangle residing on the two prime axes.
     * @param {Vector2} min The minimal vector of the AABB; smallest x and y coordinates
     * @param {Vector2} max The maximal vector of the AABB; largest x and y coordinates
     */
    constructor(min, max) {

        // 2D vector positions
        this.min = new Vector2(min.x, min.y);
        this.max = new Vector2(max.x, max.y);

        // Calculate height and width off of coordinate difference
        this.width = this.max.x - this.min.x;
        this.height = this.max.y - this.min.y;
    }


    /**
     * @returns {Number} Returns the x-coordinate of this AABB
     */
    get x() {
        return this.min.x;
    }

    /**
     * @param {Number} x The new x-coordinate of the AABB
     */
    set x(x) {
        this.min.x = x;
    }

    /**
     * @returns {Number} Returns the y-coordinate of this AABB
     */
    get y() {
        return this.min.y;
    }

    /**
     * @param {Number} x The new y-coordinate of the AABB
     */
    set y(y) {
        this.min.y = y;
    }

    /**
     * @returns {Number} Returns the left-side (x) coordinate of this AABB
     */
    get left() {
        return this.min.x;
    }

    /**
     * @returns {Number} Returns the right-side (x) coordinate of this AABB
     */
    get right() {
        return this.min.x + this.width;
    }

    /**
     * @returns {Number} Returns the top-side (y) coordinate of this AABB
     */
    get top() {
        return this.min.y;
    }

    /**
     * @returns {Number} Returns the bottom-side (y) coordinate of this AABB
     */
    get bottom() {
        return this.min.y + this.height;
    }

    /**
     * @returns {Vector2} Returns the midpoint of this AABB as a 2D vector
     */
    get mid() {
        return new Vector2(this.min.x + this.width / 2, this.min.y + this.height / 2)
    }

    /**
     * Clones this AABB
     * @returns {AABB} Returns an exact clone of this AABB
     */
    clone() {
        return new AABB(this.min.clone(), this.max.clone());
    }
}

export class Physbody {

    /**
     * Creates a physbody, or a physics entity with dimension, position, and capable of "defending" its position in space
     * @param {Vector2} pos The top-left coordinate, or position, of this physbody
     * @param {Number} width The width of this physbody
     * @param {Number} height The height of this physbody
     * @param {PIXI.Sprite} sprite The sprite component attached to this physbody
     */
    constructor(pos, width, height, sprite = new PIXI.Sprite(PIXI.Texture.WHITE)) {

        // Assign AABB
        this.body = new AABB(pos, {x: pos.x + width, y: pos.y + height});

        // Assign sprite
        this.sprite = sprite;

        // Add to different physbody array depending on type; for physics updates
        if (this instanceof DynamicBody) {
            Physics.dynamicBodies.push(this);
        } else {
            Physics.staticBodies.push(this);
        }
    }

    /**
     * @returns {Number} Returns the x-coordinate of the physbody
     */
    get x() {
        return this.body.x;
    }
    
    /**
     * @returns {Number} Returns the y-coordinate of the physbody
     */
    get y() {
        return this.body.y;
    }

    /**
     * Sets the parent of this physbody to the container supplied
     * @param {PIXI.Container} container The container to make this physbody's parent
     * @returns {Physbody} Returns self for chaining or single line declarations
     */
    setParent(container) {
        this.sprite.setParent(container);
        return this;
    }
}

export class DynamicBody extends Physbody {

    /**
     * Creates a dynamic physbody, or a physbody which is able to move around in the world and receive forces
     * @param {Vector2} pos The top-left coordinate, or position, of this physbody
     * @param {Number} width The width of this physbody
     * @param {Number} height The height of this physbody
     * @param {PIXI.Sprite} sprite The sprite component attached to this physbody
     */
    constructor(pos, width, height, sprite = new PIXI.Sprite(PIXI.Texture.WHITE)) {

        /**
         * Calls super constructor, @see Physbody
         */
        super(pos, width, height, sprite);

        // Velocity properties
        this.vx = 0;
        this.vy = 0;
        
        // Acceleration properties
        this.ax = 0;
        this.ay = 0;

        this.alpha = 0;

        // Boolean for if this physbody is "grounded," or on the ground
        this.grounded = false;

        // Internal last state of this physbody
        this._last = this.body.clone();

        // Internal body for linearly interpolated position
        this._lerpBody = this.body.clone();
    }

    /**
     * @returns {Number} Returns the x-coordinate of the physbody
     */
    get x() {
        return this.body.x;
    }

    /**
     * Updates the x-coordinate of this physbody to the new value, and updates the sprite and cached body
     * @param {Number} x The new x-coordinate of this physbody
     */
    set x(x) {
        const dx = x - this.body.x;
        this.body.x += dx;
        // this.sprite.x += dx;
        // this._last.x = this.body.x - dx;
    }

    /**
     * @returns {Number} Returns the y-coordinate of the physbody
     */
    get y() {
        return this.body.y;
    }

    /**
     * Updates the y-coordinate of this physbody to the new value, and updates the sprite and cached body
     * @param {Number} y The new y-coordinate of this physbody
     */
    set y(y) {
        const dy = y - this.body.y;
        this.body.y += dy;
        // this.sprite.y += dy;
        // this._last.y = this.body.y - dy;
    }

    get lerpBody() {
        this._lerpBody.x = this.body.mid.x * this.alpha + this._last.mid.x * (1.0 - this.alpha);
        this._lerpBody.y = this.body.mid.y * this.alpha + this._last.mid.y * (1.0 - this.alpha);
        return this._lerpBody;
    }

    updateCache() {
        this._last.x = this.x;
        this._last.y = this.y;
    }

    updateSprite() {
        const localVector = Camera.toScreenCoordinates(this.lerpBody.min);
        this.sprite.x = localVector.x;
        this.sprite.y = localVector.y;
    }
}

export class StandardBody extends Physbody {

    /**
     * 
     * @param {Vector2} pos The top-left coordinate, or position, of this physbody
     * @param {Number} width The width of this physbody
     * @param {Number} height The height of this physbody
     * @param {*} appearance An options object containing a color and or texture. This parameter is optional, as it has defaults.
     */
    constructor(pos, width, height, appearance = {}) {

        // The default appearance options object, used to fill in gaps of missing parameters
        const defaults = {
            color: 0xFFFFFF,
            texture: PIXI.Texture.WHITE,
        };

        // Fill in missing gaps in supplied appearence options
        appearance = Object.assign({}, defaults, appearance);

        // Make sprite
        const sprite = new PIXI.Sprite(appearance.texture);

        /**
         * Call super constructor, @see Physbody
         */
        super(pos, width, height, sprite);

        // Assign attributes to attached sprite
        this.sprite.x = pos.x;
        this.sprite.y = pos.y;
        this.sprite.width = width;
        this.sprite.height = height;
        this.sprite.tint = appearance.color;
    }
}

export class Camera {

    /**
     * @param {Vector2} global 
     */
    static toScreenCoordinates(global) {
        return new Vector2(global.x - Camera.x, global.y - Camera.y);
    }

    static toGlobalCoordinates(screen) {
        return new Vector2(screen.x + Camera.x, screen.y + Camera.y);
    }
}

// Define static internal camera position property
Object.defineProperty(Camera, '_pos', {
    value: Vector2.zero,
    writable: false,
    enumerable: true,
    configurable: false,
});

// Define getter and setter for the Camera x-coordinate property
Object.defineProperty(Camera, 'x', {
    get() {
        return Camera._pos.x;
    },

    set(x) {
        const diff = x - Camera._pos.x;
        Camera._pos.x = x;
        for (const body of Physics.getBodies()) {
            body.sprite.x -= diff;
        }
    },
});

// Define getter and setter for the Camera y-coordinate property
Object.defineProperty(Camera, 'y', {
    get() {
        return Camera._pos.y;
    },

    set(y) {
        const diff = y - Camera._pos.y;
        Camera._pos.y = y;
        for (const body of Physics.getBodies()) {
            body.sprite.y -= diff;
        }
    },
});

export class Physics {

    /**
     * Step the game physics one iteration forwards with respect to the data of all the dynamic physbodies. Uses linear interpolation formula along
     * with passed dt parameter, or the amount of time a physics update takes in order to update physics independently of render updates.
     * The step function is handled in three distinct sections:
     * - Timing handling
     * - Physics calculations
     * - Linear interpolation
     * 
     * @param {Number} dt Delta time, or the change in time required for a physics update to occur. Measured in seconds.
     */
    static step(dt) {

        /**
         * Timing handling
         */
        
        // Uses perf.now to grab high resolution time in ms
        const now = performance.now();

        // Amount of time between last frame and this frame in seconds
        let frameTime = (now - Physics.lastFrame) / 1000;

        // If the frame time is larger then the specified maximum, cap it; slows down physics but alleviates "sprial of death"
        if (frameTime > Physics.MAX_PHYS_FRAME_TIME) {
            frameTime = Physics.MAX_PHYS_FRAME_TIME;
        }

        // Set the last frame time to now for next step
        Physics.lastFrame = now;

        // Add the frame time to the physics accumulator
        Physics.accumulator += frameTime;

        /**
         * Physics calculations
         */

        while (Physics.accumulator >= dt) {

            // Iterate through dynamic bodies array and apply physics calculations to them; Sympletic Euclidian physics update
            for (const body of Physics.dynamicBodies) {

                body.updateCache();

                // Update the physbody's velocity first
                body.vx += body.ax * dt;
                body.vy += body.ay * dt;

                // Then, update the physbody's position
                body.x += body.vx * dt;
                body.y += body.vy * dt;
            }

            CollisionHandler.checkAllCollisions();

            CollisionHandler.resolveAllCollisions();

            Physics.accumulator -= dt;
        }

        const alpha = Physics.accumulator / dt;
        
        // Iterate through dynamic bodies array and apply physics calculations to them; Sympletic Euclidian physics update
        for (const body of Physics.dynamicBodies) {

            if (body.vy == 0) {
                body.grounded = true;
                // console.log('hi');
            } else {
                body.grounded = false;
                // console.log('fuck you');
            }
            
            body.alpha = alpha;
            
        }
    }

    /**
     * Returns all currently "alive" physbodies, starting with the dynamic bodies
     */
    static getBodies() {
        return Physics.dynamicBodies.concat(Physics.staticBodies);
    }

    /**
     * Purges all physics entities by clearing each physbody type's respective array
     */
    static purgeEntities() {
        Physics.dynamicBodies.length = 0;
        Physics.staticBodies.length = 0;
    }

    static updateSprites() {
        for (const body of Physics.dynamicBodies) {

            body.updateSprite();
            
        }
    }
}

Physics.lastFrame = performance.now();
Physics.accumulator = 0;

// Define static property as a constant determining the largest frame time allowed to impact physics calculations
Object.defineProperty(Physics, 'MAX_PHYS_FRAME_TIME', {
    value: 0.25,
    writable: false,
    enumerable: false,
    configurable: false,
});

// Defines static property as an array containing all the currently "alive" dynamic bodies
Object.defineProperty(Physics, 'dynamicBodies', {
    value: [],
    writable: false,
    enumerable: false,
    configurable: false,
});

// Defines static property as an array containing all the currently "alive" dynamic bodies
Object.defineProperty(Physics, 'staticBodies', {
    value: [],
    writable: false,
    enumerable: false,
    configurable: false,
});

export class CollisionHandler {

    /**
     * AABB vs ABBB collision tester: checks if it is possible for there to be any overlap between the supplied AABBs
     * @param {AABB} body1 The moving body in this collision instance
     * @param {AABB} body2 The stationary body in this collision instance
     * @returns {Boolean} The boolean outcome of the collision test; true if colliding, false if not
     */
    static isColliding(body1, body2) {

        // If any of the following conditions are true, the bodies cannot be colliding
        if (body1.right < body2.left
            || body1.left > body2.right
            || body1.top > body2.bottom
            || body1.bottom < body2.top) {
            return false;
        }

        // If it's made it this far, there is a collision
        return true;
    }

    /**
     * AABB vs AABB collision manifold calculator: calculates the current overlap of two AABBs
     * @param {AABB} body1 The dynamic body in the collision
     * @param {AABB} body2 The static body in the collision
     * @returns {Vector2} Returns the overlap in both axes as a 2D vector
     */
    static calculateCollisionManifold(body1, body2) {

        // Difference between the mid points of the two bodies; x and y coordinate
        const dMidX = Math.abs(body2.mid.x - body1.mid.x);
        const dMidY = Math.abs(body2.mid.y - body1.mid.y);

        // Calculates the overlap depth on both the x and y axes
        const overlapX = Math.abs(dMidX - (body1.width + body2.width) / 2);
        const overlapY = Math.abs(dMidY - (body1.height + body2.height) / 2);

        // Returns both overlaps in a vector form
        return new Vector2(overlapX, overlapY);
    }

    /**
     * Checks the collisions between all dynamic bodies and all static bodies. If there is a collision, push to an array containing all collisions this game step.
     * The collision array is ordered by overlap area; significance of collision, the most important collision is resolved first.
     */
    static checkAllCollisions() {

        // Arrays for dynamic bodies and static bodies
        const dynamicBodies = Physics.dynamicBodies;
        const staticBodies = Physics.staticBodies;

        // Iterate through array of dynamic bodies
        for (const dynamicBody of dynamicBodies) {

            // Iterate through array of static bodies to check for collisions between each dynamic body and each static body
            for (const staticBody of staticBodies) {

                // If there is a collision between these bodies, calculate its overlap area and push it to the collisions array
                if (CollisionHandler.isColliding(dynamicBody.body, staticBody.body)) {

                    const overlap = CollisionHandler.calculateCollisionManifold(dynamicBody.body, staticBody.body);

                    // Add this collision to the array of collisions this game step
                    CollisionHandler.collisions.push({
                        dynamicBody: dynamicBody,
                        staticBody: staticBody,
                        overlapArea: overlap.x * overlap.y,
                    });
                }
            }
        }

        // Sort array containing collisions this physics by descending order, pertaining to each collision's overlap area
        CollisionHandler.collisions.sort((a, b) => {
            return a.overlapArea - b.overlapArea
        });
    }

    /**
     * TODO new name for parameters?
     * Resolve a collision between two physbodies; one dynamic, or moving, and one static, or stationary
     * @param {Physbody} dynamicBody The moving body in this collision equation
     * @param {Physbody} staticBody The static body in this collision equation
     */
    static resolveCollision(dynamicBody, staticBody) {

        // Determine what collision section
        const lastState = dynamicBody._last;

        // Booleans for whether or not the last state was within the width or height
        const lastInWidth = lastState.right > staticBody.body.left && lastState.left < staticBody.body.right;
        const lastInHeight = lastState.bottom > staticBody.body.top && lastState.top < staticBody.body.bottom;

        // Calculate the collision manifold, or the overlap of the two AABBs representing the physbodies' hitboxes
        const overlap = CollisionHandler.calculateCollisionManifold(dynamicBody.body, staticBody.body);

        // Collision checking for simple collisions; last state of dynamic body is directly above, below, left, or right of the static body
        if (lastInWidth && lastState.bottom <= staticBody.body.top) {
            // Will be top collision
            // console.log('top collision')
            dynamicBody.y -= overlap.y;
            dynamicBody.vy = 0;
        } else if (lastInWidth && lastState.top >= staticBody.body.bottom) {
            // Will be bottom collision
            // console.log('bottom collision')
            dynamicBody.y += overlap.y;
            dynamicBody.vy = 0;
        } else if (lastInHeight && lastState.right <= staticBody.body.left) {
            // Will be left collision
            // console.log('left collision')
            dynamicBody.x -= overlap.x;
            dynamicBody.vx = 0;
        } else if (lastInHeight && lastState.left >= staticBody.body.right) {
            // Will be right collision
            // console.log('right collision')
            dynamicBody.x += overlap.x;
            dynamicBody.vx = 0;
        }
        
        /**
         * Handling corner slope cases where dynamic body cached position isn't directly in line to collide with any specific edge, and slope needs to be calculated to ensure
         * realistic looking collisions occur. Handles each corner quadrant separately; top left, top right, bottom right, bottom left. Depending on the difference between the
         * cached body and dynamic body's current position vs the difference between the cached body and corner of static body's position, it determines which way the dynamic
         * body should collide.
         */
        else {

            // console.log('corner collision')

            // Get midpoints of last state of dyanmic body and static body
            const staticBodyMid = staticBody.body.mid;
            const dynamicBodyChangeSlope = Vector2.slope(dynamicBody.body.mid, lastState.mid);

            // last state of dynamic body is above the static body
            if (lastState.mid.y < staticBodyMid.y) {
                
                // last state of dynamic body is to the left of the static body
                if (lastState.mid.x < staticBodyMid.x) {

                    // Set up position vectors for the vertices involved in the calculations of this test
                    const lastStateBottomRight = new Vector2(lastState.right, lastState.bottom);
                    const staticBodyTopLeft = new Vector2(staticBody.body.left, staticBody.body.top);
                    
                    // Calculate slope between the contraposing vertices of the last state and the static body
                    const lastStateToCornerSlope = Vector2.slope(lastStateBottomRight, staticBodyTopLeft);

                    // TODO experiment with the comparison here
                    if (dynamicBodyChangeSlope > lastStateToCornerSlope) {
                        dynamicBody.y -= overlap.y;
                        dynamicBody.grounded = true; // remove if glitchy
                    } else {
                        dynamicBody.x -= overlap.x;
                    }
                }
                
                // last state of dynamic body is to the right of the static body
                else if (lastState.mid.x > staticBodyMid.x) {

                    // Set up position vectors for the vertices involved in the calculations of this test
                    const lastStateBottomLeft = new Vector2(lastState.left, lastState.bottom);
                    const staticBodyTopRight = new Vector2(staticBody.body.right, staticBody.body.top);

                    // Calculate slope between the contraposing vertices of the last state and the static body
                    const lastStateToCornerSlope = Vector2.slope(lastStateBottomLeft, staticBodyTopRight);

                    // TODO experiment with the comparison here
                    if (dynamicBodyChangeSlope > lastStateToCornerSlope) {
                        dynamicBody.y -= overlap.y;
                        dynamicBody.grounded = true; // remove if glitchy
                    } else {
                        dynamicBody.x += overlap.x;
                    }
                }        
            }
            
            // last state of dynamic body is below the static body
            else if (lastState.mid.y > staticBodyMid.y) {

                // last state of dynamic body is to the left of the static body
                if (lastState.mid.x < staticBodyMid.x) {

                    // Set up position vectors for the vertices involved in the calculations of this test
                    const lastStateTopRight = new Vector2(lastState.right, lastState.top);
                    const staticBodyBottomLeft = new Vector2(staticBody.body.left, staticBody.body.bottom);

                    // Calculate slope between the contraposing vertices of the last state and the static body
                    const lastStateToCornerSlope = Vector2.slope(lastStateTopRight, staticBodyBottomLeft);

                    // TODO experiment with the comparison here
                    if (dynamicBodyChangeSlope < lastStateToCornerSlope) {
                        dynamicBody.y += overlap.y;
                    } else {
                        dynamicBody.x -= overlap.x;
                    }
                }
                
                // last state of dynamic body is to the right of the static body
                else if (lastState.mid.x > staticBodyMid.x) {

                    // Set up position vectors for the vertices involved in the calculations of this test
                    const lastStateTopLeft = new Vector2(lastState.left, lastState.top);
                    const staticBodyBottomRight = new Vector2(staticBody.body.right, staticBody.body.bottom);

                    // Calculate slope between the contraposing vertices of the last state and the static body
                    const lastStateToCornerSlope = Vector2.slope(lastStateTopLeft, staticBodyBottomRight);

                    // TODO experiment with the comparison here
                    if (dynamicBodyChangeSlope < lastStateToCornerSlope) {
                        dynamicBody.y += overlap.y;
                    } else {
                        dynamicBody.x += overlap.x;
                    }      
                }
            }
        }
    }

    /**
     * Iterates through the collisions array (with respect to overlap area) and resolves each collisionwwww
     */
    static resolveAllCollisions() {

        // Array of all collisions this game step
        const collisions = CollisionHandler.collisions;

        // Iterate through each collision
        for (const collision of collisions) {

            // Resolve the collision
            CollisionHandler.resolveCollision(collision.dynamicBody, collision.staticBody);
        }

        // After collisions have been resolved, clear array for next game step
        CollisionHandler.collisions.length = 0;
    }
}

// Define static property as an array containing all of the collisions that have occured during the most recent physics step
Object.defineProperty(CollisionHandler, 'collisions', {
    value: [],
    writable: false,
    enumerable: false,
    configurable: false,
});