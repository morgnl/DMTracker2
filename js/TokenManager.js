class Token {
    constructor(x, y, name, maxHp, monsterSize = 'Medium') {
        this.x = x;
        this.y = y;
        this.name = name;
        this.maxHp = maxHp;
        this.currentHp = maxHp;
        this.tempHp = 0;
        this.selected = false;
        this.monsterSize = monsterSize;
        const baseSize = 60; // Default token size
        this.size = this.calculateSize(baseSize, monsterSize);
        this.image = null;
    }

    calculateSize(baseSize, size) {
        const sizeMultipliers = {
            'Tiny': 0.5,
            'Small': 0.75,
            'Medium': 1,
            'Large': 1.5,
            'Huge': 2,
            'Gargantuan': 2.5
        };
        return baseSize * (sizeMultipliers[size] || 1);
    }

    loadImage(url) {
        this.image = new Image();
        this.image.src = url;
        this.imageUrl = url;
    }

    isPointInside(x, y) {
        const radius = this.size / 2;
        const dx = x - this.x;
        const dy = y - this.y;
        return (dx * dx + dy * dy) <= (radius * radius);
    }

    modifyHp(amount) {
        const numAmount = parseInt(amount);
        if (isNaN(numAmount)) return;
        
        if (amount.startsWith('+') || numAmount > 0) {
            // Handle healing - allow it to exceed max HP
            this.currentHp = this.currentHp + Math.abs(numAmount);
        } else {
            // Handle damage (negative numbers)
            // First reduce temp HP, then current HP
            const damage = Math.abs(numAmount);
            const remainingDamage = damage - this.tempHp;
            this.tempHp = Math.max(0, this.tempHp - damage);
            if (remainingDamage > 0) {
                this.currentHp = Math.max(0, this.currentHp - remainingDamage);
            }
        }
    }

    getDisplayHp() {
        const totalHp = this.currentHp + this.tempHp;
        return `${totalHp}/${this.maxHp}`;
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
}

export class TokenManager {
    constructor() {
        this.tokens = [];
        this.selectedTokens = new Set();
        this.clipboard = [];
        this.lastPastePosition = null;  // Track the last paste position
    }

    createToken(x, y, name, hp, monsterSize = 'Medium') {
        console.log('Creating token:', { x, y, name, hp, monsterSize });
        const token = new Token(x, y, name, hp, monsterSize);
        this.tokens.push(token);
        return token;
    }

    selectToken(token, addToSelection = false) {
        if (!addToSelection) {
            this.clearSelection();
        }
        token.selected = true;
        this.selectedTokens.add(token);
    }

    deselectToken(token) {
        token.selected = false;
        this.selectedTokens.delete(token);
    }

    clearSelection() {
        this.selectedTokens.forEach(token => token.selected = false);
        this.selectedTokens.clear();
        this.lastPastePosition = null; // Reset paste position when selection changes
    }

    getTokenAt(x, y) {
        // Search in reverse order so we select the top-most token
        for (let i = this.tokens.length - 1; i >= 0; i--) {
            if (this.tokens[i].isPointInside(x, y)) {
                return this.tokens[i];
            }
        }
        return null;
    }

    getTokensInRect(x1, y1, x2, y2) {
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);

        return this.tokens.filter(token => {
            const tokenLeft = token.x - token.size/2;
            const tokenRight = token.x + token.size/2;
            const tokenTop = token.y - token.size/2;
            const tokenBottom = token.y + token.size/2;

            return tokenRight >= left && tokenLeft <= right &&
                   tokenBottom >= top && tokenTop <= bottom;
        });
    }

    selectAll() {
        this.tokens.forEach(token => {
            token.selected = true;
            this.selectedTokens.add(token);
        });
    }

    moveSelected(dx, dy) {
        this.selectedTokens.forEach(token => token.move(dx, dy));
    }

    copySelected() {
        this.clipboard = Array.from(this.selectedTokens).map(token => ({
            name: token.name,
            maxHp: token.maxHp,
            monsterSize: token.monsterSize,
            imageUrl: token.imageUrl
        }));
        this.lastPastePosition = null; // Reset paste position when copying new tokens
    }

    paste() {
        if (this.clipboard.length === 0) return [];

        const newTokens = [];
        const padding = 20; // Additional padding between tokens
        const textHeight = 40; // Approximate height needed for name and HP text

        // Find the largest token size in the clipboard
        let maxTokenSize = 0;
        this.clipboard.forEach(tokenData => {
            const tempToken = new Token(0, 0, tokenData.name, tokenData.maxHp, tokenData.monsterSize);
            maxTokenSize = Math.max(maxTokenSize, tempToken.size);
        });

        // Calculate starting position
        let baseX, baseY;
        if (this.lastPastePosition) {
            // If we have pasted before, start beneath the last paste
            baseX = this.lastPastePosition.x;
            baseY = this.lastPastePosition.y + maxTokenSize + textHeight + padding;
        } else {
            // First paste - position beneath the original tokens
            const selectedTokens = Array.from(this.selectedTokens);
            if (selectedTokens.length > 0) {
                // Find the bottom-most selected token
                const bottomToken = selectedTokens.reduce((bottom, current) => {
                    return (current.y > bottom.y) ? current : bottom;
                });
                baseX = bottomToken.x;
                baseY = bottomToken.y + bottomToken.size + textHeight + padding;
            } else {
                // Default position if no tokens selected
                baseX = 300;
                baseY = 300;
            }
        }

        let offsetY = 0;
        this.clipboard.forEach((tokenData, index) => {
            const token = this.createToken(
                baseX,
                baseY + offsetY,
                tokenData.name,
                tokenData.maxHp,
                tokenData.monsterSize
            );

            if (tokenData.imageUrl) {
                token.loadImage(tokenData.imageUrl);
            }

            newTokens.push(token);

            // Calculate offset for next token based on largest token size
            offsetY += maxTokenSize + textHeight + padding;
        });

        // Update the last paste position to the position of the last token
        if (newTokens.length > 0) {
            const lastToken = newTokens[newTokens.length - 1];
            this.lastPastePosition = {
                x: lastToken.x,
                y: lastToken.y
            };
        }

        return newTokens;
    }

    deleteSelected() {
        this.tokens = this.tokens.filter(token => !token.selected);
        this.selectedTokens.clear();
    }

    modifySelectedHp(amount) {
        this.selectedTokens.forEach(token => token.modifyHp(amount));
    }
}