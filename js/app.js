import { TokenManager } from './TokenManager.js';
import { InputHandler } from './InputHandler.js';
import { Renderer } from './Renderer.js';

class App {
    constructor() {
        this.canvas = document.getElementById('whiteboard');
        this.ctx = this.canvas.getContext('2d');
        this.tokenManager = new TokenManager();
        this.renderer = new Renderer(this.canvas, this.ctx, this.tokenManager);
        this.inputHandler = new InputHandler(this.canvas, this.tokenManager, this.renderer);
        
        // Set initial canvas size
        this.resizeCanvas();
        
        // Bind events
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Start the app
        this.renderer.startRenderLoop();
    }

    resizeCanvas() {
        // Get the display size of the canvas's container
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Set the canvas size to match its CSS size
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Force a render after resize
        if (this.renderer) {
            this.renderer.render();
        }
    }

    handleResize() {
        this.resizeCanvas();
    }
}

// Initialize the application when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new App();
});