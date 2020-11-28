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

const dev_scene = new ENGINE.Scene((resources, container) => {

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
    player.ay = 0.003; // TODO implement gravity elsewhere

    const floor = new ENGINE.StandardBody({x: 0, y: 700}, 4000, 20, {color: colors.FLOOR}).setParent(container);

    let terrain1 = new ENGINE.StandardBody({x: 200, y: 400}, 400, 300, {color: colors.TERRAIN}).setParent(container);

    let terrain2 = new ENGINE.StandardBody({x: 800, y: 250}, 50, 450, {color: colors.TERRAIN}).setParent(container);

    let terrain3 = new ENGINE.StandardBody({x: 800, y: 200}, 200, 50, {color: colors.TERRAIN}).setParent(container);

    const debug = new PIXI.Graphics();

    container.addChild(debug);

    dev_scene.options = {
        backgroundColor: colors.BACKGROUND,
    }

    const movement = new playerInput(player);

    const movementHandler = new ENGINE.TickerFunction(() => {
        movement.movement();
    }, this, 1);

    const physics = new ENGINE.TickerFunction(() => {

        ENGINE.Physics.step();

        ENGINE.CollisionHandler.checkAllCollisions();

        ENGINE.CollisionHandler.resolveAllCollisions();

        const bodies = ENGINE.Physics.getBodies();

        debug.clear();

        for (const body of bodies) {
            debug.lineStyle(1, 0x00ff00, 1, 0);
            const screenCords = ENGINE.Camera.toScreenCoordinates(body.body.min);
            // console.log(screenCords);
            debug.drawRect(body.body.min.x, body.body.min.y, body.body.width, body.body.height);
        }

        ENGINE.Camera.x = player.body.left - 640;
        ENGINE.Camera.y = player.body.bottom  - 360;
        if (ENGINE.Camera.y + 720 > 720) {
            ENGINE.Camera.y = 0;
        }
    }, this, 0);

    dev_scene.functions.push(movementHandler, physics);
});

// Loads the default scene
ENGINE.Renderer.scene = dev_scene;