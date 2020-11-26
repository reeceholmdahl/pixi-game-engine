import { Scene, Renderer, TickerFunction } from './modules/renderer.js';
import * as ENGINE from './modules/engine.js';
import { getActiveKeys } from './modules/player.input.js';

// Called first, initializes the renderer
Renderer.init();

// Add game assets; images, etc.
Renderer.add('buddadawg', '/buddadawg.png');

// New player input, for all stages besides the og_buddadawg stage
class newPlayerInput {

    constructor(physbody) {
        this.physbody = physbody;
        this.lastUp = false;
        this.hasDoubleJumped = false;
    }

    movement() {
        // Movement constants
        const move = 0.5;
        const jump = 1.15;
        const doubleJumpMod = 1.025;

        // Get current active keys
        const activeKeys = getActiveKeys();

        // Boolean key checkers for given direction movement
        const left = activeKeys.a || activeKeys.ArrowLeft;
        const right = activeKeys.d || activeKeys.ArrowRight;
        const up = activeKeys.w || activeKeys.ArrowUp || activeKeys[' '];
        const down = activeKeys.s || activeKeys.ArrowDown;

        // Variables for calculated velocities for x and y
        let dx = 0;

        // Horizontal movement
        if (left && !right) {
            dx = -move;
        } else if (right && !left) {
            dx = move;
        }

        // Jumping and double jump logic
        if (up && this.physbody.grounded && !this.lastUp) {
            this.physbody.vy = -jump;
        } else if (up && !this.physbody.grounded && !this.hasDoubleJumped && !this.lastUp) {
            this.physbody.vy = -jump * doubleJumpMod;
            this.hasDoubleJumped = true;
        } else if (this.physbody.grounded) {
            this.hasDoubleJumped = false;
        }

        // Logic to check if the up key has been released or not
        if (up) {
            this.lastUp = true;
        } else {
            this.lastUp = false;
        }

        // Set physbody velocities to calculated velocities
        this.physbody.vx = dx;
    }
}

/**
 * Standard physics games collection of ticker functions. This is the standard physics game loop with collision detection. In order: Physics step, collision detection,
 * custom collision function execution, collision resolution, update dynamic physbody sprites.
 */

const physics = new TickerFunction(ENGINE.Physics.step, this, -1);
const collisionDetection = new TickerFunction(ENGINE.CollisionHandler.checkCollisions, this, -2);
const customCollisionFunctions = new TickerFunction(ENGINE.CollisionHandler.executeCustomCollisionFunctions, this, -3);
const collisionResolution = new TickerFunction(ENGINE.CollisionHandler.resolveCollisions, this, -4);
const updateSprites = new TickerFunction(ENGINE.Physics.updateSprites, this, -5);

const stdSet = [physics, collisionDetection, customCollisionFunctions, collisionResolution, updateSprites];

/**
 * Level building starts here. Using the Scene class and building an anonymous function right in the constructor because that looks the best. Almost identical to the
 * setup function you'd build in a single file PIXI system, just with a passed container instead of a stage property underneath the renderer.
 */

// OG Buddadawg level scene ported to new engine
const og_buddadawg = new Scene((resources, container) => {

    // Make character
    const player = new ENGINE.Physbody(0, 10, 100, 100, ENGINE.Physbody.TYPE.DYNAMIC, 0, resources.buddadawg.texture).addToContainer(container);
    player.setGravity(true);

    // Build floor
    const floor = new ENGINE.Physbody(0, 690, 405, 20).addToContainer(container);

    // Build platforms
    const platform1 = new ENGINE.Physbody(250, 475, 150, 25).addToContainer(container); 
    const platform2 = new ENGINE.Physbody(500, 175, 100, 25).addToContainer(container);
    const platform3 = new ENGINE.Physbody(750, 475, 100, 25).addToContainer(container);
    const platform4 = new ENGINE.Physbody(850, 575, 50, 25).addToContainer(container);
    const platform5 = new ENGINE.Physbody(1180, 575, 100, 25).addToContainer(container);

    // Build final jump platforms
    const jumpPlatform1 = new ENGINE.Physbody(1250, 475, 20, 25).addToContainer(container);
    const jumpPlatform2 = new ENGINE.Physbody(1150, 325, 20, 25).addToContainer(container);
    const jumpPlatform3 = new ENGINE.Physbody(1250, 175, 20, 25).addToContainer(container);
    const jumpPlatform4 = new ENGINE.Physbody(1150, 25, 20, 25).addToContainer(container);

    // Build level fillers
    const filler1 = new ENGINE.Physbody(750, 175, 400, 200).addToContainer(container);
    const filler2 = new ENGINE.Physbody(950, -425, 200, 600).addToContainer(container);
    const filler3 = new ENGINE.Physbody(1270, 0, 50, 720).addToContainer(container);
    const filler4 = new ENGINE.Physbody(375, 500, 25, 190).addToContainer(container);

    // Player movement handling
    const playerInput = new newPlayerInput(player);

    // Movement ticker function
    const movement = new TickerFunction(() => {
        playerInput.movement();
    }, this, 1);

    // Set up functions
    og_buddadawg.functions = stdSet.concat(movement);
});

const testScene = new Scene((resources, container) => {

    const stage = container;

    // Build player
    const player = new ENGINE.Physbody(100, 10, 80, 80, ENGINE.Physbody.TYPE.DYNAMIC, 0, resources.buddadawg.texture).addToContainer(stage);
    player.setGravity(true);

    // Build floor
    const floor = new ENGINE.Physbody(0, 695, 1280, 25).addToContainer(stage);
    floor.sprite.tint = 0x59a608;

    // Testing platforms
    const obstacle = new ENGINE.Physbody(300, 300, 200, 100).addToContainer(stage);
    const obstacle2 = new ENGINE.Physbody(300, 100, 200, 100).addToContainer(stage);
    const platform = new ENGINE.Physbody(350, 450, 200, 25).addToContainer(stage);

    // Player movement handling
    const playerInput = new newPlayerInput(player);

    // Movement ticker function
    const movement = new TickerFunction(() => {
        playerInput.movement();
    }, this, 1);

    // Set up functions
    testScene.functions = stdSet.concat(movement);
});


// Loads the default scene
const DEFAULT_SCENE = og_buddadawg;
Renderer.loadScene(DEFAULT_SCENE);