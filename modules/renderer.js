import { Physics } from './engine.js';

// Screen dimension constants, in pixels
const RENDER_WIDTH = 1280;
const RENDER_HEIGHT = 720;
const HTML_PARENT_NAME = 'display';

const renderer = new PIXI.Application({
    width: RENDER_WIDTH,
    height: RENDER_HEIGHT,
});

class AssetLoader {
    
    /**
     * Loads an asset to the renderer. Can be chained.
     * @param {String} name Identifiable name of the asset
     * @param {String} location Location of the asset
     */
    static add(name, location) {
        renderer.loader.add(name, location);
        return this;
    }
}

export class TickerFunction {

    /**
     * A function that will be run by the ticker
     * @param {Function} func 
     * @param {*} context 
     * @param {Number} priority 
     */
    constructor(func, context, priority) {
        this.func = func;
        this.context = context;
        this.priority = priority;
    }
}

export class Scene {

    constructor(setup) {
        this.setup = setup;
        this.container = new PIXI.Container();
        this.functions = [];
    }
}

export class Renderer {

    static add(name, location) {
        return AssetLoader.add(name, location);
    }

    static load() {
        document.getElementById(HTML_PARENT_NAME).appendChild(renderer.view);
    }

    static getDeltaMS() {
        return renderer.ticker.deltaMS;
    }

    static loadScene(scene) {

        // If the current scene was previously set, clean up Render class scene property for new scene to load
        if (Renderer.scene instanceof Scene) {

            // Set all sprites of the old scene to invisible
            for (const sprite of Renderer.scene.container.children) {
                sprite.visible = false;
            }

            Physics.purgeUnrendered();

            // Remove all functions from the old scene from the ticker
            for (const func of Renderer.scene.functions) {
                renderer.ticker.remove(func.func, func.context);
            }
        }

        // Set the renderer scene to the new one
        Renderer.scene = scene;

        // Set the renderer stage to the scene's container
        const container = new PIXI.Container();

        // Call new scene setup method
        renderer.loader.load((loader, resources) => {
            scene.setup(resources, container);

            // Make all sprites part of this scene visible
            for (const sprite of container.children) {
                sprite.visible = true;
            }

            // Add new scene functions to ticker
            Renderer.scene.functions.forEach(func => {
                renderer.ticker.add(func.func, func.context, func.priority);
            });
        });

        Renderer.scene.container = container;
        renderer.stage = container;
    }
}

Renderer.scene = null;