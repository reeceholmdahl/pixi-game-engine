import { Scene, Renderer, TickerFunction } from './modules/renderer.js';
import * as ENGINE from './modules/engine.js';
import { getActiveKeys } from './modules/player.input.js';
import { setCookie, getCookie } from './modules/cookie_monster.js';

// Called first, initializes the renderer
Renderer.init();

/**
 * Placholder for loading game assets, none currently
 */

/**
 * Standard physics games collection of ticker functions. This is the standard physics game loop with collision detection. In order: Physics step, collision detection,
 * custom collision function execution, collision resolution, update dynamic physbody sprites.
 */

const physics = new TickerFunction(ENGINE.Physics.step, this, -1);
const collisionDetection = new TickerFunction(ENGINE.CollisionHandler.checkAllCollisions, this, -2);
const customCollisionFunctions = new TickerFunction(ENGINE.CollisionHandler.runCustomCollisionFunctions, this, -3);
const collisionResolution = new TickerFunction(ENGINE.CollisionHandler.resolveAllCollisions, this, -4);
const updateSprites = new TickerFunction(ENGINE.Physics.updateSprites, this, -5);

// Standard function set
const stdSet = [physics, collisionDetection, customCollisionFunctions, collisionResolution, updateSprites];

// Player movement
class playerInput {
    
    constructor(physbody) {
        this.physbody = physbody;
        this.lastUp = false;
        this.hasDoubleJumped = false;
    }

    movement() {

        // Movement constants
        const move = 0.5;
        const jump = 1;
        const doubleJumpMod = 1.025;

        // Get current active keys
        const activeKeys = getActiveKeys();

        // Boolean key checkers for given direction movement
        const left = activeKeys.a || activeKeys.ArrowLeft;
        const right = activeKeys.d || activeKeys.ArrowRight;
        const up = activeKeys.w || activeKeys.ArrowUp || activeKeys[' '];
        const down = activeKeys.s || activeKeys.ArrowDown; // implement crouching?

        // Variables for calculated velocities for x and y
        let dx = 0;
        let dy = 0;

        // Horizontal movement
        if (left && !right) {
            dx = -move;
        } else if (right && !left) {
            dx = move;
        }

        // // Vertical movement
        // if (up && !down) {
        //     dy = -move;
        // } else if (down && !up) {
        //     dy = move;
        // }

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
        // this.physbody.vy = dy;
    }
}

const other_scene = new Scene((resources, container) => {

    other_scene.backgroundColor = 0x00ff00;
});

const dev_scene = new Scene((resources, container) => {

    const colors = {
        PLAYER: 0xf4f5f7,
        FLOOR: 0x963c2b,
        BACKGROUND: 0x2a2a2e,
        TERRAIN: 0xb04632,
        DEBUG: 0x00ff00,
    };

    const playerSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    playerSprite.x = 110;
    playerSprite.y = 210;
    playerSprite.width = 80;
    playerSprite.height = 80;
    playerSprite.texture = PIXI.Texture.WHITE;
    playerSprite.tint = colors.PLAYER;

    const player = new ENGINE.DynamicBody({x: 100, y: 200}, 100, 100, playerSprite).setParent(container);
    player.debugMode = true;
    player.ay = 0.003; // TODO implement gravity elsewhere

    const floor = new ENGINE.StandardBody({x: 0, y: 700}, 4000, 20, {color: colors.FLOOR}).setParent(container);
    floor.debugMode = true;

    let terrain1 = new ENGINE.StandardBody({x: 200, y: 400}, 400, 300, {color: colors.TERRAIN}).setParent(container);
    terrain1.debugMode = true;

    let terrain2 = new ENGINE.StandardBody({x: 800, y: 250}, 50, 450, {color: colors.TERRAIN}).setParent(container);
    terrain2.debugMode = true;

    let terrain3 = new ENGINE.StandardBody({x: 800, y: 200}, 200, 50, {color: colors.TERRAIN}).setParent(container);
    terrain3.debugMode = true;

    dev_scene.backgroundColor = colors.BACKGROUND;

    const movement = new playerInput(player);

    const movementHandler = new TickerFunction(() => {
        movement.movement();
    }, this, 1);

    const physics = new TickerFunction(() => {

        ENGINE.Physics.step();

        ENGINE.CollisionHandler.checkAllCollisions();

        ENGINE.CollisionHandler.resolveAllCollisions();

        ENGINE.Camera.x = player.body.left - 640;
        ENGINE.Camera.y = player.body.bottom  - 360;
        if (ENGINE.Camera.y + 720 > 720) {
            ENGINE.Camera.y = 0;
        }
    }, this, 0);

    dev_scene.functions.push(movementHandler, physics);
});

let scene = dev_scene;

// Loads the default scene
Renderer.loadScene(dev_scene);

document.getElementById('display').onclick = () => {
    scene = scene == dev_scene ? other_scene : dev_scene;
    Renderer.loadScene(scene);
}