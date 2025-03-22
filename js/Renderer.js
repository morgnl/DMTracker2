export class Renderer {
    constructor(canvas, ctx, tokenManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.tokenManager = tokenManager;
        this.scale = 1;
        this.animationFrameId = null;
        this.selectionRect = null;
        this.pendingNumber = '';
    }

    startRenderLoop() {
        this.render();
    }

    render() {
        // Clear the entire canvas with white background
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply scaling
        this.ctx.scale(this.scale, this.scale);

        // Draw all tokens
        this.tokenManager.tokens.forEach(token => {
            this.drawToken(token, 1);
            
            if (this.pendingNumber && token.selected) {
                this.drawPendingNumber(token);
            }
        });

        // Draw selection rectangle if active
        if (this.selectionRect) {
            this.drawSelectionRect(this.selectionRect);
        }

        this.ctx.restore();
    }

    drawToken(token, opacity = 1) {
        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        // Draw health ring
        const healthPercent = token.currentHp / token.maxHp;
        this.drawHealthRing(token.x, token.y, token.size/2, healthPercent);

        // Draw token circle and image
        this.ctx.beginPath();
        this.ctx.arc(token.x, token.y, token.size/2 - 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();

        // If we have an image, draw it clipped to the circle
        if (token.image && token.image.complete) {
            this.ctx.save();
            this.ctx.clip();
            const imgSize = token.size - 8; // Leave space for border
            this.ctx.drawImage(token.image, 
                token.x - imgSize/2, 
                token.y - imgSize/2,
                imgSize,
                imgSize);
            this.ctx.restore();
        }
        
        // Draw selection indicator if selected
        if (token.selected) {
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        // Scale text size based on token size
        const baseSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--token-size'));
        const textScale = token.size / baseSize;
        const fontSize = Math.max(14, Math.floor(14 * Math.sqrt(textScale)));
        
        // Draw HP with scaled position
        this.ctx.fillStyle = '#000';
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `${token.currentHp}/${token.maxHp}`, 
            token.x, 
            token.y + token.size/2 + fontSize + 5
        );

        // Draw name below HP with scaled position
        this.ctx.fillText(
            token.name, 
            token.x, 
            token.y + token.size/2 + (fontSize * 2) + 10
        );

        // Draw dead indicator scaled to token size
        if (token.currentHp <= 0) {
            this.drawDeadIndicator(token);
        }

        this.ctx.restore();
    }

    drawHealthRing(x, y, radius, percentage) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, -Math.PI/2, Math.PI * 2 * percentage - Math.PI/2);
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        if (percentage < 1) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, Math.PI * 2 * percentage - Math.PI/2, -Math.PI/2);
            this.ctx.strokeStyle = '#f44336';
            this.ctx.stroke();
        }
    }

    drawDeadIndicator(token) {
        const size = token.size * 0.4;
        this.ctx.strokeStyle = '#f44336';
        this.ctx.lineWidth = 4;
        
        // Draw X
        this.ctx.beginPath();
        this.ctx.moveTo(token.x - size, token.y - size);
        this.ctx.lineTo(token.x + size, token.y + size);
        this.ctx.moveTo(token.x + size, token.y - size);
        this.ctx.lineTo(token.x - size, token.y + size);
        this.ctx.stroke();
    }

    drawSelectionRect(rect) {
        this.ctx.save();
        this.ctx.strokeStyle = '#007bff'; // Blue color matching selection
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]); // Create dotted line effect
        
        const x = Math.min(rect.x1, rect.x2);
        const y = Math.min(rect.y1, rect.y2);
        const width = Math.abs(rect.x2 - rect.x1);
        const height = Math.abs(rect.y2 - rect.y1);
        
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.restore();
    }

    drawPendingNumber(token) {
        this.ctx.save();
        
        // Draw pending number feedback above the token
        this.ctx.fillStyle = '#007bff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.pendingNumber, token.x, token.y - token.size/2 - 10);
        
        this.ctx.restore();
    }

    setPendingNumber(number) {
        this.pendingNumber = number;
        this.render();
    }

    setInitialZoom() {
        // Set initial zoom to fit all tokens
        if (this.tokenManager.tokens.length === 0) {
            this.scale = 1;
            return;
        }

        const padding = 50;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        this.tokenManager.tokens.forEach(token => {
            minX = Math.min(minX, token.x - token.size/2);
            maxX = Math.max(maxX, token.x + token.size/2);
            minY = Math.min(minY, token.y - token.size/2);
            maxY = Math.max(maxY, token.y + token.size/2);
        });

        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;
        
        this.scale = Math.min(
            this.canvas.width / width,
            this.canvas.height / height,
            1 // Don't zoom in, only out
        );

        this.render();
    }

    setSelectionRect(rect) {
        this.selectionRect = rect;
        this.render();
    }

    getTokenGroupCenter(tokens) {
        if (!tokens.size) return { x: 0, y: 0 };
        
        let totalX = 0;
        let totalY = 0;
        tokens.forEach(token => {
            totalX += token.x;
            totalY += token.y;
        });
        
        return {
            x: totalX / tokens.size,
            y: totalY / tokens.size
        };
    }

    setPastePreview(enabled) {
        this.render();
    }

    setPastePosition(pos) {
        this.render();
    }
}