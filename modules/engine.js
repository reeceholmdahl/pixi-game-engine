let application;

export const RENDER_WIDTH = 1280;
export const RENDER_HEIGHT = 720;
const HTML_PARENT_NAME = 'display';

export class Renderer {

    static init() {

        // Initialize the PIXI application
        application = new PIXI.Application({
            width: RENDER_WIDTH,
            height: RENDER_HEIGHT,
        });

        // Append the renderer view to the HTML page
        document.getElementById(HTML_PARENT_NAME).appendChild(application.view);
    }

    /**
     * @param {Scene} newScene 
     */
    static loadScene(newScene) {

        // Stop ticker while loading scene; performance and alleviates glitches
        application.ticker.stop();

        if (Renderer.scene instanceof Scene) {

            // Remove all ticker functions from the old scene from the ticker
            for (const tickerFunc of Renderer.scene.functions) {
                application.ticker.remove(tickerFunc.func, tickerFunc.context);
            }

            // Reset the ticker function array in the old scene; in case it's loaded again
            Renderer.scene.functions.length = 0;

            // Purge all physbodies
            Physics.purgeEntities();

            // Reset camera coordinates
            Camera.x = 0;
            Camera.y = 0;
        }

        // Create new container object to pass to new scene creation pipeline
        const container = new PIXI.Container();

        // Use the PIXI loader to access game assets
        application.loader.load((_, resources) => {

            // Call the scene setup method, passing the game assets and new container; builds the scene
            newScene.setup(resources, container);

            // TODO check if necessary: Sort all the children in the container by its z-index; arbitrary I think, but gives me peace of mind
            container.children.sort((a, b) => {
                return a.zIndex - b.zIndex;
            });

            // Add ticker functions from this scene to the ticker
            newScene.functions.forEach(func => {
                application.ticker.add(func.func, func.context, func.priority);
            });
        });

        // Set the current stage view to the new scene's container
        application.stage = container;

        /**
         * TODO as the Scene options list grows, handle them here
         */

        const options = Object.assign({}, Scene.DEFAULT_OPTIONS, newScene.options);

        application.renderer.backgroundColor = options.backgroundColor;

        // Last thing before ticker start; set current stage variable to the new one
        Renderer._scene = newScene;

        // Restart the ticker now that the new scene has been loaded
        application.ticker.start();
    }

    /**
     * @param {String} name 
     * @param {String} location
     * @returns {AssetLoader} returns offloaded asset loader class for chaining
     */
    static addAsset(name, location) {
        return AssetLoader.addAsset(name, location);
    }

    static get stage() {
        return application.stage;
    }

    static get deltaMS() {
        return application.ticker.deltaMS;
    }
}

Object.defineProperty(Renderer, 'scene', {
    
    get() {
        return Renderer._scene;
    },

    set(newScene) {
        Renderer.loadScene(newScene);
    },
});

Object.defineProperty(Renderer, '_scene', {
    value: null,
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

export class Scene {

    constructor(setup) {

        this.setup = setup

        Object.defineProperty(this, 'functions', {
            value: [],
            writable: false,
            enumerable: true,
            configurable: false,
        });

        this.options = {};
    }
}

Object.defineProperty(Scene, 'DEFAULT_OPTIONS', {
    value: {
        backgroundColor: 0x999999,
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

Object.defineProperty(Vector2, 'zero', {
    value: new Vector2(0, 0),
    writable: false,
    enumerable: false,
    configurable: false,
});

export class AABB {

    /**
     * @param {Vector2} min 
     * @param {Vector2} max 
     */
    constructor(min, max) {
        this.min = new Vector2(min.x, min.y);
        this.max = new Vector2(max.x, max.y);
        this.width = this.max.x - this.min.x;
        this.height = this.max.y - this.min.y;
    }

    get x() {
        return this.min.x;
    }

    set x(x) {
        this.min.x = x;
    }

    get y() {
        return this.min.y;
    }

    set y(y) {
        this.min.y = y;
    }

    get left() {
        return this.min.x;
    }

    get right() {
        return this.min.x + this.width;
    }

    get top() {
        return this.min.y;
    }

    get bottom() {
        return this.min.y + this.height;
    }

    get mid() {
        return new Vector2(this.min.x + this.width / 2, this.min.y + this.height / 2)
    }

    clone() {
        return new AABB(this.min.clone(), this.max.clone());
    }
}

export class Physbody {

    /**
     * @param {Vector2} pos
     * @param {Number} width
     * @param {Number} height 
     * @param {PIXI.Sprite} sprite 
     */
    constructor(pos, width, height, sprite = new PIXI.Sprite(PIXI.Texture.WHITE)) {

        this.body = new AABB(pos, {x: pos.x + width, y: pos.y + height});

        this.sprite = sprite;

        if (this instanceof DynamicBody) {
            Physics.dynamicBodies.push(this);
        } else {
            Physics.staticBodies.push(this);
        }
    }

    get x() {
        return this.body.x;
    }
    
    get y() {
        return this.body.y;
    }

    /**
     * @param {PIXI.Container} container 
     * @returns {Physbody} returns self for chaining or single line declarations
     */
    setParent(container) {
        this.sprite.setParent(container);
        return this;
    }
}

export class DynamicBody extends Physbody {

    /**
     * @param {Vector2} pos 
     * @param {Number} width 
     * @param {Number} height 
     * @param {PIXI.Sprite} sprite 
     */
    constructor(pos, width, height, sprite = new PIXI.Sprite(PIXI.Texture.WHITE)) {

        super(pos, width, height, sprite);

        this.vx = 0;
        this.vy = 0;
        
        this.ax = 0;
        this.ay = 0;

        this.grounded = false;

        this._last = this.body.clone();
    }

    get x() {
        return this.body.x;
    }

    /**
     * @param {Number} x
     */
    set x(x) {
        const dx = x - this.body.x;
        this.body.x += dx;
        this.sprite.x += dx;
        this._last.x = this.body.x - dx;

        this._onPositionUpdate();
    }

    get y() {
        return this.body.y;
    }

    /**
     * @param {Number} y
     */
    set y(y) {
        const dy = y - this.body.y;
        this.body.y += dy;
        this.sprite.y += dy;
        this._last.y = this.body.y - dy;

        this._onPositionUpdate();
    }

    _onPositionUpdate() {

        // TODO move functionality elsewhere
        // Code to remove sprite from container for render performance
        // const BUFFER = 100;
        // const SCREEN_SIZE = Renderer.getRenderSize();

        // const spriteMin = new Vector2(this.sprite.x, this.sprite.y);
        // const spriteMax = new Vector2(this.sprite.x + this.sprite.width, this.sprite.y + this.sprite.height);

        // if (spriteMax.x > SCREEN_SIZE.x + BUFFER
        //     || spriteMin.x < -BUFFER - this.sprite.width
        //     || spriteMax.y > SCREEN_SIZE.y + BUFFER
        //     || spriteMin.y < -BUFFER - this.sprite.height) {
        //     this.container.removeChild(this.sprite);
        // } else if (!this.sprite.parent.children.includes(this.sprite)) {
        //     this.addToContainer(this.container);
        // }

        // Debug draw outline
        if (this.debugMode) {
            this._drawHitbox();
        }
    }
}

export class StandardBody extends Physbody {

    constructor(pos, width, height, appearance = {}) {

        const defaults = {
            color: 0xFFFFFF,
            texture: PIXI.Texture.WHITE,
        };

        appearance = Object.assign({}, defaults, appearance);

        const sprite = new PIXI.Sprite(appearance.texture);

        super(pos, width, height, sprite);

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
}

Camera.pos = Vector2.zero;

Object.defineProperty(Camera, 'x', {
    get() {
        return Camera.pos.x;
    },

    set(x) {
        const diff = x - Camera.pos.x;
        Camera.pos.x = x;
        for (const sprite of Renderer.stage.children) {
            sprite.x -= diff;
        }
    },
});

Object.defineProperty(Camera, 'y', {
    get() {
        return Camera.pos.y;
    },

    set(y) {
        const diff = y - Camera.pos.y;
        Camera.pos.y = y;
        for (const sprite of Renderer.stage.children) {
            sprite.y -= diff;
        }
    },
});

export class Physics {

    /**
     * Step the game physics one iteration forwards with respect to the data of all the dynamic physbodies
     */
    static step() {

        // Get delta ms from renderer; amount of time between last frame and this frame in ms
        const deltaMS = Renderer.deltaMS;

        // Local array containing all the physbodies
        const dynamicBodies = Physics.dynamicBodies;

        // Iterate through array and apply physics calculations to them; velocity and position iterations
        for (const body of dynamicBodies) {

            // Sympletic Euclidian physics updates
            
            // Update the physbody's velocity
            body.vx += body.ax * deltaMS;
            body.vy += body.ay * deltaMS;

            // Update the physbody's position
            body.x += body.vx * deltaMS;
            body.y += body.vy * deltaMS;
        }
    }

    static getBodies() {
        return Physics.staticBodies.concat(Physics.dynamicBodies);
    }

    static purgeEntities() {
        Physics.dynamicBodies.length = 0;
        Physics.staticBodies.length = 0;
    }
}

Object.defineProperty(Physics, 'dynamicBodies', {
    value: [],
    writable: false,
    enumerable: false,
    configurable: false,
});

Object.defineProperty(Physics, 'staticBodies', {
    value: [],
    writable: false,
    enumerable: false,
    configurable: false,
});

export class CollisionHandler {

    /**
     * Test if there is a collision between the two supplied physbodies
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
     * Calculates the overlap of the two bodies, returning a vector of the overlap in the x and y axes respectively
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

            dynamicBody.grounded = false;

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

        // TODO check =?
        const lastInWidth = lastState.right > staticBody.body.left && lastState.left < staticBody.body.right;
        const lastInHeight = lastState.bottom > staticBody.body.top && lastState.top < staticBody.body.bottom;

        const overlap = CollisionHandler.calculateCollisionManifold(dynamicBody.body, staticBody.body);

        if (lastInWidth && lastState.bottom <= staticBody.body.top) {
            // will be top collision
            dynamicBody.y -= overlap.y;
            dynamicBody.vy = 0;
            dynamicBody.grounded = true;
        } else if (lastInWidth && lastState.top >= staticBody.body.bottom) {
            // will be bottom collision
            dynamicBody.y += overlap.y;
            dynamicBody.vy = 0;
        } else if (lastInHeight && lastState.right <= staticBody.body.left) {
            // will be left collision
            dynamicBody.x -= overlap.x;
            dynamicBody.vx = 0;
        } else if (lastInHeight && lastState.left >= staticBody.body.right) {
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
            let lastStateMid = lastState.mid;
            let staticBodyMid = staticBody.body.mid;

            // Cached dynamic body is above the static body
            if (lastStateMid.y < staticBodyMid.y) {
                
                // Cached dynamic body is to the left of the static body
                if (lastStateMid.x < staticBodyMid.x) {

                    const dynamicBodyBottomRight = new Vector2(dynamicBody.body.right, dynamicBody.body.bottom);
                    const lastStateBottomRight = new Vector2(lastState.right, lastState.bottom);
                    const staticBodyTopLeft = new Vector2(staticBody.body.left, staticBody.body.top);
                    
                    const dynamicBodyChangeSlope = Vector2.slope(dynamicBodyBottomRight, lastStateBottomRight);
                    const lastStateToCornerSlope = Vector2.slope(lastStateBottomRight, staticBodyTopLeft);

                    if (dynamicBodyChangeSlope > lastStateToCornerSlope) {
                        dynamicBody.y -= overlap.y;
                        dynamicBody.grounded = true; // remove if glitchy
                    } else {
                        dynamicBody.x -= overlap.x;
                    }
                }
                
                // Cached dynamic body is to the right of the static body
                else if (lastStateMid.x > staticBodyMid.x) {

                    const dynamicBodyBottomLeft = new Vector2(dynamicBody.body.left, dynamicBody.body.bottom);
                    const lastStateBottomLeft = new Vector2(lastState.left, lastState.bottom);
                    const staticBodyTopRight = new Vector2(staticBody.body.right, staticBody.body.top);

                    const dynamicBodyChangeSlope = Vector2.slope(dynamicBodyBottomLeft, lastStateBottomLeft);
                    const lastStateToCornerSlope = Vector2.slope(lastStateBottomLeft, staticBodyTopRight);

                    if (dynamicBodyChangeSlope > lastStateToCornerSlope) {
                        dynamicBody.y -= overlap.y;
                        dynamicBody.grounded = true; // remove if glitchy
                    } else {
                        dynamicBody.x += overlap.x;
                    }
                }        
            }
            
            // Cached dynamic body is below the static body
            else if (lastStateMid.y > staticBodyMid.y) {

                // Cached dynamic body is to the left of the static body
                if (lastStateMid.x < staticBodyMid.x) {

                    const dynamicBodyTopRight = new Vector2(dynamicBody.body.right, dynamicBody.body.top);
                    const lastStateTopRight = new Vector2(lastState.right, lastState.top);
                    const staticBodyBottomLeft = new Vector2(staticBody.body.left, staticBody.body.bottom);

                    const dynamicBodyChangeSlope = Vector2.slope(dynamicBodyTopRight, lastStateTopRight);
                    const lastStateToCornerSlope = Vector2.slope(lastStateTopRight, staticBodyBottomLeft);

                    if (dynamicBodyChangeSlope < lastStateToCornerSlope) {
                        dynamicBody.y += overlap.y;
                    } else {
                        dynamicBody.x -= overlap.x;
                    }
                }
                
                // Cached dynamic body is to the right of the static body
                else if (lastStateMid.x > staticBodyMid.x) {

                    const dynamicBodyTopLeft = new Vector2(dynamicBody.body.left, dynamicBody.body.top);
                    const lastStateTopLeft = new Vector2(lastState.left, lastState.top);
                    const staticBodyBottomRight = new Vector2(staticBody.body.right, staticBody.body.bottom);

                    const dynamicBodyChangeSlope = Vector2.slope(dynamicBodyTopLeft, lastStateTopLeft);
                    const lastStateToCornerSlope = Vector2.slope(lastStateTopLeft, staticBodyBottomRight);

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
     * Resolve all collisions this game step
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

// An array containing all of the collisions this game step
Object.defineProperty(CollisionHandler, 'collisions', {
    value: [],
    writable: false,
    enumerable: false,
    configurable: false,
});