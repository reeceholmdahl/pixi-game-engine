import * as ENGINE from './modules/engine.js';
import { getActiveKeys } from './modules/player.input.js'

// Create PIXI renderer
const renderer = new PIXI.Application({
    width: 1280,
    height: 720,
});

// Load PIXI renderer and assets
renderer.loader
    .add('player', '/buddadawg.png')    
    .load(setup);

let player;

function playerInputTesting(physbody = player) {

    // Movement speed constant, using old engine to new conversion factor
    const move = 0.4;

    // Get current active keys
    const activeKeys = getActiveKeys();

    // Boolean key checkers for given direction movement
    const left = activeKeys.a || activeKeys.ArrowLeft;
    const right = activeKeys.d || activeKeys.ArrowRight;
    const up = activeKeys.w || activeKeys.ArrowUp || activeKeys[' '];
    const down = activeKeys.s || activeKeys.ArrowDown;

    // Variables for calculated velocities for x and y
    let dx = 0;
    let dy = 0;

    // Horizontal movement
    if (left && !right) {
        dx = -move;
    } else if (right && !left) {
        dx = move;
    }

    // Vertical movement
    if (up && !down) {
        dy = -move;
    } else if (down && !up) {
        dy = move;
    }

    // Constant movement speed in when travelling at angle
    if (dx != 0 && dy != 0) {
        dx = Math.sign(dx) * Math.sqrt(Math.abs(dx / 2));
        dy = Math.sign(dy) * Math.sqrt(Math.abs(dy / 2));
    }

    // Set physbody velocities to calculated velocities
    physbody.vx = dx;
    physbody.vy = dy;
}

let hasDoubleJumped = false;
let lastUp = false;

/**
 * Function for moving player using keyboard input. Player input should be first execution in physics stack
 * @param {Physbody} physbody Physbody to manipulate as player
 */
function playerInput(physbody = player) {

    // Movement constants
    const move = 0.5; // 0.5
    const jump = 1.15; // 1.15
    const doubleJumpMod = 1.025; // 1.025

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
    if (up && physbody.grounded && !lastUp) {
        physbody.vy = -jump;
    } else if (up && !physbody.grounded && !hasDoubleJumped && !lastUp) {
        physbody.vy = -jump * doubleJumpMod;
        hasDoubleJumped = true;
    } else if (physbody.grounded) {
        hasDoubleJumped = false;
    }

    // Logic to check if the up key has been released or not
    if (up) {
        lastUp = true;
    } else {
        lastUp = false;
    }

    // Set physbody velocities to calculated velocities
    physbody.vx = dx;
}

function setup(loader, resources) {

    // Constant for game stage container
    const stage = renderer.stage;

    // Build player
    player = new ENGINE.Physbody(0, 530 , 100, 100, ENGINE.Physbody.TYPE.DYNAMIC, 0, resources.player.texture).addToContainer(stage);
    player.setGravity(true);
    player.setWrapY(true);

    // // Build floor
    // const floor = new ENGINE.Physbody(0, 695, 1280, 25).addToContainer(stage);
    // floor.sprite.tint = 0x59a608;

    // // Testing platforms
    // const obstacle = new ENGINE.Physbody(300, 300, 200, 100).addToContainer(stage);
    // const obstacle2 = new ENGINE.Physbody(300, 100, 200, 100).addToContainer(stage);
    // const platform = new ENGINE.Physbody(350, 450, 200, 25).addToContainer(stage);

    // // Testing platforms
    // const obstacle = new ENGINE.Physbody(300, 350, 200, 200).addToContainer(stage);
    // const obstacle2 = new ENGINE.Physbody(300, 125, 200, 200).addToContainer(stage);
    // const platform = new ENGINE.Physbody(350, 450, 200, 25).addToContainer(stage);

    // // Start gate
    // const startGate = new ENGINE.Physbody(200, 350, 10, 345, ENGINE.Physbody.TYPE.SYMBOLIC, -1).addToContainer(stage);
    // startGate.sprite.tint = 0xffd700;
    // startGate.customFunctions.push(() => {
    //     console.log('colliding with symbolic! custom functions work!!');
    //     // Write function to start match timer
    // });

    // // Build platforms
    // const overGatePlatform = new ENGINE.Physbody(100, 350, 100, 20).addToContainer(stage);
    // overGatePlatform.sprite.tint = 0xb3192d;

    /**
     * LONGEVITY RENDERER NOTES:
     * - if not a physbody (e.g. gui element or something) need to remake this to include that and make a 'custom render' superclass/interface
     */

     // Reorder all stage elements according to its name (the name of each sprite added to the stage should be its render priority)
    renderer.stage.children.sort((a, b) => {
        return Number(b.name) - Number(a.name);
    });

    /* START OLD BUDDA DAWG STAGE */

    // Place floor
    const floor = new ENGINE.Physbody(0, 690, 405, 20).addToContainer(stage);

    // Platforms
    const platform1 = new ENGINE.Physbody(250, 475, 150, 25).addToContainer(stage); 
    const platform2 = new ENGINE.Physbody(500, 175, 100, 25).addToContainer(stage);
    const platform3 = new ENGINE.Physbody(750, 475, 100, 25).addToContainer(stage);
    const platform4 = new ENGINE.Physbody(850, 575, 50, 25).addToContainer(stage);
    const platform5 = new ENGINE.Physbody(1180, 575, 100, 25).addToContainer(stage);

    // Final jump platforms
    const jumpPlatform1 = new ENGINE.Physbody(1250, 475, 20, 25).addToContainer(stage);
    const jumpPlatform2 = new ENGINE.Physbody(1150, 325, 20, 25).addToContainer(stage);
    const jumpPlatform3 = new ENGINE.Physbody(1250, 175, 20, 25).addToContainer(stage);
    const jumpPlatform4 = new ENGINE.Physbody(1150, 25, 20, 25).addToContainer(stage);

    // Level fillers
    const filler1 = new ENGINE.Physbody(750, 175, 400, 200).addToContainer(stage);
    const filler2 = new ENGINE.Physbody(950, -425, 200, 600).addToContainer(stage);
    const filler3 = new ENGINE.Physbody(1270, 0, 50, 720).addToContainer(stage);
    const filler4 = new ENGINE.Physbody(375, 500, 25, 190).addToContainer(stage);

    /* END OLD BUDDA DAWG STAGE */

    /**
     * PIXI TICKER NOTES:
     * - ticker is executed in descending order; e.g. 5..4..3..-1..-2..
     * - player input can happen synchronously with other game logic happening at standard priority
     * - physics and graphics updates must happen after player input and other logic
     */

    // 1:Player input
    renderer.ticker.add(() => {
        playerInput();
    }, 'game_step', 0);

    // 2: Step physics
    renderer.ticker.add(() => {
        ENGINE.Physics.step(renderer.ticker.deltaMS);
    }, 'game_step', -1);

    // 3: Collision checking
    renderer.ticker.add(() => {
        ENGINE.CollisionHandler.checkCollisions();
    }, 'game_step', -2);

    // 4: Collision resolution
    renderer.ticker.add(ENGINE.CollisionHandler.resolveCollisions, 'game_step', -3)

    // 5: Custom collision function execution
    renderer.ticker.add(ENGINE.CollisionHandler.executeCustomCollisionFunctions, 'game_step', -4)

    // 6: Update graphical location of sprite
    renderer.ticker.add(() => {
        player.updateSprite();
    }, 'game_step', -5);
}

// Add PIXI to DOM
document.getElementById('display').appendChild(renderer.view);
