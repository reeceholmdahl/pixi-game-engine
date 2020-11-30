import * as ENGINE from './engine.js';
import { getActiveKeys } from './keyboard_input.js';

// Called first, initializes the renderer
ENGINE.Renderer.init();

/**
 * Placholder for loading game assets, none currently
 */

// Player movement
class playerInput {
    
    constructor(physbody) {
        this.physbody = physbody;
        this.lastUp = false;
        this.hasDoubleJumped = false;
    }

    movement() {

        // Movement constants
        const move = 500;
        const jump = 1200;
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
    }
}

const dev_scene = new ENGINE.Scene((resources, container) => {

    const colors = {
        PLAYER: 0xf4f5f7,
        FLOOR: 0x963c2b,
        BACKGROUND: 0x2a2a2e,
        TERRAIN: 0xb04632,
        DEBUG: 0x00ff00,
    };

    // Scene options
    dev_scene.options = {
        backgroundColor: colors.BACKGROUND,
        debug: false,
    };

    // Build player
    const playerSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    playerSprite.anchor.set(0.5);
    playerSprite.width = 56;
    playerSprite.height = 56;
    playerSprite.texture = PIXI.Texture.WHITE;
    playerSprite.tint = colors.PLAYER;
    const player = new ENGINE.DynamicBody({x: 0, y: 300}, 64, 64, playerSprite).setParent(container);
    player.ay = 4000; // TODO implement gravity elsewhere

    // Build floor
    const floor = new ENGINE.StandardBody({x: -1000, y: 630}, 4000, 300, {color: colors.FLOOR}).setParent(container);

    // Build terrain
    const terrain1 = new ENGINE.StandardBody({x: 320, y: 510}, 480, 120, {color: colors.TERRAIN}).setParent(container);
    const terrain2 = new ENGINE.StandardBody({x: 1120, y: 390}, 360, 240, {color: colors.TERRAIN}).setParent(container);
    const terrain3 = new ENGINE.StandardBody({x: 1800, y: 270}, 320, 360, {color: colors.TERRAIN}).setParent(container);
    const terrain4 = new ENGINE.StandardBody({x: 2480, y: 150}, 240, 60, {color: colors.TERRAIN}).setParent(container);

    const PHYS_DT = 1 / 30;

    // Player movement class
    const movement = new playerInput(player);

    // Player movement ticker function
    const movementHandler = new ENGINE.TickerFunction(() => {
        movement.movement();
    }, this, 1);

    const physics = new ENGINE.TickerFunction(() => {

        ENGINE.Physics.step(PHYS_DT);

        ENGINE.Physics.updateSprites();

        ENGINE.Camera.x = player.lerpBody.left - 640;
        ENGINE.Camera.y = player.lerpBody.bottom  - 360;
        if (ENGINE.Camera.y + 640 > 640) {
            ENGINE.Camera.y = 0;
        }

    }, this, 0);

    dev_scene.functions.push(movementHandler, physics);
});

const test_scene = new ENGINE.Scene((resources, container) => {

    test_scene.options = {
        debug: true,
        backgroundColor: 0x222244,
    };

    const playerSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    const player = new ENGINE.DynamicBody({x: 100, y: 100}, 100, 100, playerSprite).setParent(container);
    playerSprite.anchor.set(0.5);
    playerSprite.width = 80;
    playerSprite.height = 80;
    playerSprite.tint = 0xddddff;

    const test = new ENGINE.StandardBody({x: 300, y: 250}, 200, 200).setParent(container);

    const movement = new playerInput(player);

    const movementFunction = new ENGINE.TickerFunction(() => { movement.movement() }, this, 1);

    const physics = new ENGINE.TickerFunction(() => {

        ENGINE.Physics.step(1/20);

        ENGINE.CollisionHandler.checkAllCollisions();

        ENGINE.CollisionHandler.resolveAllCollisions();

        ENGINE.Physics.updateSprites();

        // // console.log(ENGINE.Renderer.ticker.FPS);

        // const newTime = performance.now();
        // const frameTime = (newTime - currentTime) / 1000;
        // // console.log(frameTime)
        // currentTime = newTime;

        // player._lastFrame.x = player.x;
        // player._lastFrame.y = player.y;

        // const dt = 1/30;

        // accumulator += frameTime;

        // while (accumulator >= dt) {

        //     player._last.x = player.x;
        //     player._last.y = player.y;
        //     player._last.vx = player.vx;
        //     player._last.vy = player.vy;
            
        //     player.vx += player.ax * dt;
        //     player.vy += player.ay * dt;

        //     player.x += player.vx * dt
        //     player.y += player.vy * dt

        //     ENGINE.CollisionHandler.checkAllCollisions();

        //     ENGINE.CollisionHandler.resolveAllCollisions();

        //     accumulator -= dt;
        // }

        // const alpha = accumulator / dt;

        // // console.log(i);

        // // player.vx = player.vx * alpha + player._last.vx * (1.0 - alpha);
        // // player.vy = player.vy * alpha + player._last.vy * (1.0 - alpha);
        // // console.log(accumulator);

        // // ENGINE.Physics.step();

        // player.updateSprite(alpha);

        // // ENGINE.Physics.updateSprites();
    });

    test_scene.functions.push(movementFunction, physics);
});

// Loads the default scene
ENGINE.Renderer.scene = dev_scene;