import { Physics } from './engine.js';

// Screen dimension constants, in pixels
const RENDER_WIDTH = 1280;
const RENDER_HEIGHT = 720;
const HTML_PARENT_NAME = 'display';

/**
 * The variable for the PIXI renderer. @see Renderer.init
 */
let RENDERER

class AssetLoader {
    
    /**
     * Loads an asset to the renderer. Can be chained.
     * @param {String} name Identifiable name of the asset
     * @param {String} location Location of the asset
     */
    static add(name, location) {

        // Access the loader and add the resource to the list
        RENDERER.loader.add(name, location);

        // Return self for nice, easy method chaining
        return this;
    }
}

export class TickerFunction {

    /**
     * A function that will be run by the ticker when its respective scene is loaded
     * @param {Function} func The function to be run
     * @param {*} context The context of the function; helps with removal, usually this or the scene it resides in. Defaults to null.
     * @param {Number} priority The priority of the function; functions are executed in descending order based on priority. Defaults to 0.
     */
    constructor(func, context = null, priority = 0) {
        this.func = func;
        this.context = context;
        this.priority = priority;
    }
}

export class Scene {

    /**
     * Create a new scene. Should be constructed using an anonymous function in the constructor; passing the resources property and the container property
     * into the body of the function, where the scene building happens.
     * @param {Function<Resources, PIXI.Container>} setup The setup function; the Renderer class passes it the resources that were loaded, and a container to add sprites to
     */
    constructor(setup) {
        
        // Setup function
        this.setup = setup;

        // Function array
        this.functions = [];

        // Sprite container
        this.container = new PIXI.Container();
    }
}

export class Renderer {

    /**
     * Initializes the PIXI renderer. Needs to be called before any asset loading or calls to this class.
     */
    static init() {

        // Initialize the PIXI application
        RENDERER = new PIXI.Application({
            width: RENDER_WIDTH,
            height: RENDER_HEIGHT,
        });

        // Append the renderer view to the HTML page
        document.getElementById(HTML_PARENT_NAME).appendChild(RENDERER.view);
    }

    /**
     * Add a game asset; image, spritesheet, etc.
     * @param {String} name The retrievable name of the asset; used later to get from resources
     * @param {String} location The location of the asset
     */
    static add(name, location) {
        return AssetLoader.add(name, location);
    }

    /**
     * Loads a scene to the PIXI renderer. @see Scene
     * @param {Scene} scene The scene to load
     */
    static loadScene(scene) {

        // Stop the ticker during scene loads
        RENDERER.ticker.stop();

        // If the current scene was previously set, clean up Render class scene property for new scene to load
        if (Renderer.scene instanceof Scene) {

            // Set all sprites of the old scene to invisible
            for (const sprite of Renderer.scene.container.children) {
                sprite.visible = false;
            }

            // After setting all of the old scene sprites invisible, purge them from the physics
            Physics.purgeUnrendered();

            // Remove all functions from the old scene from the ticker
            for (const func of Renderer.scene.functions) {
                RENDERER.ticker.remove(func.func, func.context);
            }

            // Reset the functions array in the old scene
            Renderer.scene.functions = [];
        }

        // Set the renderer scene to the new one
        Renderer.scene = scene;

        // Set the renderer stage to the scene's container
        const container = new PIXI.Container();

        // Call new scene setup method
        RENDERER.loader.load((loader, resources) => {

            // Call the scene setup method; build the scene
            scene.setup(resources, container);

            // Make all sprites part of this scene visible
            for (const sprite of container.children) {
                sprite.visible = true;
            }

            container.children.sort((a, b) => {
                return a.zIndex - b.zIndex;
            });

            // Add new scene functions to ticker
            Renderer.scene.functions.forEach(func => {
                RENDERER.ticker.add(func.func, func.context, func.priority);
            });
        });

        // Set the container of the new scene to the one generated through the setup method
        Renderer.scene.container = container;

        // Set the current stage view to the new scene's container
        RENDERER.stage = container;

        // Restart the ticker now that everything has been loaded
        RENDERER.ticker.start();
    }

    /**
     * Gets the delta time in ms. Capped based on the minimum FPS set in the ticker, and scaled by the ticker's speed.
     * @returns {Number} The time in ms between the last frame and this one
     */
    static getDeltaMS() {
        return RENDERER.ticker.deltaMS;
    }
}

// Static container property underneath the Renderer class
Renderer.scene = null;