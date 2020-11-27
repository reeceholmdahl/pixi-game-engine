import { Scene, Renderer, TickerFunction } from './modules/renderer.js';
import * as ENGINE from './modules/engine.js';
import { getActiveKeys } from './modules/player.input.js';
import { setCookie, getCookie } from './modules/cookie_monster.js';

// Called first, initializes the renderer
Renderer.init();

// Add game assets; images, etc.
Renderer.add('buddadawg', './img/buddadawg.png')
        .add('budda', './img/budda.png');

class oldPlayerInput {

    constructor(physbody) {
        this.physbody = physbody;
        this.lastUp = false;
        this.upReleased = false;
        this.lastY = 0;
        this.lastJumpDate = Date.now();
    }

    movement() {
        
        // Movement constants
        const move = 0.60;
        const jump = 1.06;
        const high_jump_ms = 2000;
        const high_jump_velocity = 0.023;

        // Get current active keys
        const activeKeys = getActiveKeys();

        // Boolean key checkers for given direction movement
        const left = activeKeys.a || activeKeys.ArrowLeft;
        const right = activeKeys.d || activeKeys.ArrowRight;
        const up = activeKeys.w || activeKeys.ArrowUp || activeKeys[' '];

        // Variables for calculated velocities for x and y
        let dx = 0;

        // Horizontal movement
        if (left && !right) {
            dx = -move;
        } else if (right && !left) {
            dx = move;
        }

        // Jump logic
        if (up) {
            if (!this.lastUp && this.physbody.grounded) {
                this.physbody.vy -= jump;
                this.upReleased = false;
                this.lastJumpDate = Date.now();
            } else if (!this.upReleased && Date.now() - this.lastJumpDate < high_jump_ms && this.physbody.y < this.lastY && !this.physbody.grounded) {
                this.physbody.vy -= high_jump_velocity;
            }
        } else {
            this.upReleased = true;
        }

        // Logic to check if the up key has been released or not
        if (up) {
            this.lastUp = true;
        } else {
            this.lastUp = false;
        }

        // Update last y-axis position; height of jump
        this.lastY = this.physbody.y;

        // Set physbody velocities to calculated velocities
        this.physbody.vx = dx;
    }
}

// New player input, for all stages besides the og_buddadawg stage
class newPlayerInput {

    constructor(physbody) {
        this.physbody = physbody;
        this.lastUp = false;
        this.hasDoubleJumped = false;
    }

    movement() {
        // Movement constants
        const move = 0.55;
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

// Standard function set
const stdSet = [physics, collisionDetection, customCollisionFunctions, collisionResolution, updateSprites];

/**
 * Level building starts here. Using the Scene class and building an anonymous function right in the constructor because that looks the best. Almost identical to the
 * setup function you'd build in a single file PIXI system, just with a passed container instead of a stage property underneath the renderer.
 */

// OG Buddadawg level scene ported to new engine
const og_buddadawg = new Scene((resources, container) => {

    // Make character
    const player = new ENGINE.Physbody(0, 530, 100, 100, ENGINE.Physbody.TYPE.DYNAMIC, 0, resources.buddadawg.texture).addToContainer(container);
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

    // Level ender
    const offScreenReset = new ENGINE.Physbody(-720, 1000, 2000, 100, ENGINE.Physbody.TYPE.SYMBOLIC).addToContainer(container);
    offScreenReset.customFunctions.push(() => {
        restart(false)
    });

    // Level finisher; dog got da budda
    const win = new ENGINE.Physbody(1200, 0, 50, 47, ENGINE.Physbody.TYPE.SYMBOLIC, 0, resources.budda.texture).addToContainer(container);
    win.customFunctions.push(() => {
        restart(true)
    });

    /**
     * Restarts the level, with a parameter to indicate whether or not the player won
     * @param {Boolean} justWon Whether or not the restart was after a win
     */
    function restart(justWon) {
        
        // Reset game has started variable
        og_buddadawg.hasStarted = false;

        // Set restart time to now to make sure there is key delay before begin
        og_buddadawg.restartTime = Date.now();

        // If restarting after a win, additional functionality
        if (justWon) {

            // How long this run took
            const runTime = Date.now() - og_buddadawg.startTime;

            // Push the run time to the highscores array and sort it
            og_buddadawg.highscores.push(runTime);
            og_buddadawg.highscores.sort((a,b) => { return a-b });

            // Limit the array size to 5 so there aren't cookie issues this time
            og_buddadawg.highscores.splice(5, og_buddadawg.highscores.length - 5);

            // Set the highscore cookie to the array
            setCookie('og_highscores', og_buddadawg.highscores.join('+'));
        }
    }

    og_buddadawg.restartTime = Date.now();

    // OG Buddadawg game loop ticker function
    const gameLoop = new TickerFunction(() => {

        // Functionality to loop while game hasn't started
        if (!og_buddadawg.hasStarted || false) {
        
            // If the highscore array doesn't exist, create it
            if (!(og_buddadawg.highscores instanceof Array)) og_buddadawg.highscores = [];

            // Import the saved highscores cookie, if it exists
            const savedHighscores = getCookie('og_highscores') || '';
            if (savedHighscores.includes('+')) {
                og_buddadawg.highscores = savedHighscores.split('+');
            }

            // HTML page functionality: timer and highscores table
            document.getElementById('og_timer').innerHTML = 'Not started';
            const table = document.getElementById('og_highscores_table');
            let i = 0;
            for (const el of table.children) {
                el.innerHTML = `${i < og_buddadawg.highscores.length ? og_buddadawg.highscores[i] + 'ms' : 'No score yet'}`;
                i++;
            }

            // If the run hasn't started, lock the player in place; fixes collision issues
            player.vx = 0;
            player.vy = 0;
            player.x = 0;
            player.y = 590;

            // Ensure that this variable is initialized
            og_buddadawg.startTime = 0;

            // Get the current active keys
            const activeKeys = getActiveKeys();

            // Movement keys for this game
            const left = activeKeys.a || activeKeys.ArrowLeft || false;
            const right = activeKeys.d || activeKeys.ArrowRight || false;
            const up = activeKeys.w || activeKeys.ArrowUp || activeKeys[' '] || false;

            // Checks if the time since restart has exceeded 150ms; fixes instant restart, and a key has been re-activated since restart
            if (Date.now() - og_buddadawg.restartTime > 150 && ((left && left != (og_buddadawg.lastLeft || false)) || (right && right != (og_buddadawg.lastRight || false)) || (up && up != (og_buddadawg.lastUp || false)))) {
                og_buddadawg.hasStarted = true;
                og_buddadawg.startTime = Date.now();
            }

            // Set the last pressed state for the keys; helps with instant restart fix
            og_buddadawg.lastLeft = left;
            og_buddadawg.lastRight = right;
            og_buddadawg.lastUp = up;
        } else {

            // Update the timer while game is running
            const runTime = Date.now() - og_buddadawg.startTime;
            document.getElementById('og_timer').innerHTML = `${runTime}ms`;
        }
    }, this, 2);

    // Player movement handling
    const playerInput = new oldPlayerInput(player);

    // Movement ticker function
    const movement = new TickerFunction(() => {
        if (og_buddadawg.hasStarted) {
            playerInput.movement();
        }
    }, this, 1);

    // Set up functions
    og_buddadawg.functions = stdSet.concat(movement, gameLoop);
});

// Loads the default scene
Renderer.loadScene(og_buddadawg);