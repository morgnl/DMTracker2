import { MonsterAPI } from './MonsterAPI.js';

export class InputHandler {
    constructor(canvas, tokenManager, renderer) {
        this.canvas = canvas;
        this.tokenManager = tokenManager;
        this.renderer = renderer;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.lastPos = { x: 0, y: 0 };
        this.selectionRect = null;
        this.isPasting = false;
        this.numberBuffer = '';
        this.numberBufferTimeout = null;
        this.currentMousePos = { x: 0, y: 0 };
        this.pendingNumber = '';
        this.selectedMonster = null;
        this.searchTimeout = null;

        // Bind methods
        this.handleDblClick = this.handleDblClick.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.createTokenFromDialog = this.createTokenFromDialog.bind(this);
        this.hideDialog = this.hideDialog.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        // Mouse events for canvas
        this.canvas.addEventListener('dblclick', this.handleDblClick);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        
        // Global keyboard events
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        // Dialog events
        const dialog = document.getElementById('tokenDialog');
        const nameInput = document.getElementById('monsterName');
        const hpInput = document.getElementById('monsterHP');
        const createBtn = document.getElementById('createToken');
        const cancelBtn = document.getElementById('cancelToken');

        if (dialog) {
            dialog.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createTokenFromDialog();
            });

            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.isComposing) {
                    e.preventDefault();
                }
            });
        }

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchMonsters(nameInput.value);
                }, 300);
            });

            // Handle monster selection from datalist
            nameInput.addEventListener('change', async () => {
                const monsterSuggestions = document.getElementById('monsterSuggestions');
                if (!monsterSuggestions) return;
                
                const selectedOption = Array.from(monsterSuggestions.options)
                    .find(option => option.value === nameInput.value);
                
                if (selectedOption && selectedOption.dataset.index) {
                    const monster = await MonsterAPI.getMonsterDetails(selectedOption.dataset.index);
                    if (monster && hpInput) {
                        this.selectedMonster = monster;
                        hpInput.value = monster.hit_points.toString();
                    }
                }
            });
        }

        if (createBtn) {
            createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.createTokenFromDialog();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideDialog();
            });
        }

        if (hpInput) {
            hpInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.isComposing) {
                    e.preventDefault();
                    this.createTokenFromDialog();
                }
            });
        }
    }

    async searchMonsters(query) {
        console.log('Searching monsters:', query);
        const monsters = await MonsterAPI.searchMonsters(query);
        const datalist = document.getElementById('monsterSuggestions');
        
        if (!datalist) {
            console.error('Datalist element not found');
            return;
        }
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Add new options
        monsters.forEach(monster => {
            const option = document.createElement('option');
            option.value = monster.name;
            option.dataset.index = monster.index;
            datalist.appendChild(option);
        });

        console.log('Added monster suggestions:', monsters.length);
    }

    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleDblClick(e) {
        e.preventDefault(); // Prevent default double-click behavior
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.showDialog(e.clientX, e.clientY, coords);
    }

    handleMouseDown(e) {
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        
        this.isDragging = true;
        this.dragStart = coords;
        this.lastPos = coords;

        const token = this.tokenManager.getTokenAt(coords.x, coords.y);
        if (token) {
            if (e.ctrlKey) {
                // Toggle selection with Ctrl key
                if (token.selected) {
                    this.tokenManager.deselectToken(token);
                } else {
                    this.tokenManager.selectToken(token, true);
                }
            } else if (!token.selected) {
                // If clicking an unselected token without Ctrl, clear others and select this one
                this.tokenManager.clearSelection();
                this.tokenManager.selectToken(token, false);
            }
            // If clicking an already selected token without Ctrl, keep the current selection
        } else if (!this.isPasting) {
            // Clicking empty space starts selection rectangle
            this.tokenManager.clearSelection();
            this.selectionRect = { x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y };
            this.renderer.setSelectionRect(this.selectionRect);
        }
        
        if (this.isPasting) {
            this.finalizePaste(coords.x, coords.y);
        }

        this.renderer.render();
    }

    handleMouseMove(e) {
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.currentMousePos = coords;

        // If we're in paste preview mode, update the preview position
        if (this.isPasting) {
            this.renderer.setPastePosition(coords);
            return;
        }

        if (!this.isDragging) return;

        if (this.selectionRect) {
            this.selectionRect.x2 = coords.x;
            this.selectionRect.y2 = coords.y;
            this.renderer.setSelectionRect(this.selectionRect);
            
            const tokens = this.tokenManager.getTokensInRect(
                this.selectionRect.x1, 
                this.selectionRect.y1,
                this.selectionRect.x2,
                this.selectionRect.y2
            );
            this.tokenManager.clearSelection();
            tokens.forEach(token => this.tokenManager.selectToken(token, true));
        } else if (this.tokenManager.selectedTokens.size > 0) {
            const dx = coords.x - this.lastPos.x;
            const dy = coords.y - this.lastPos.y;
            this.tokenManager.moveSelected(dx, dy);
        }

        this.lastPos = coords;
        this.renderer.render();
    }

    handleMouseUp() {
        this.isDragging = false;
        if (this.selectionRect) {
            this.selectionRect = null;
            this.renderer.setSelectionRect(null);
        }
    }

    handleKeyDown(e) {
        if (e.key === 'a' && e.ctrlKey) {
            e.preventDefault();
            this.tokenManager.selectAll();
            this.renderer.render();
        } else if (e.key === 'c' && e.ctrlKey) {
            this.tokenManager.copySelected();
        } else if (e.key === 'v' && e.ctrlKey) {
            e.preventDefault();
            this.paste();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            this.tokenManager.deleteSelected();
            this.renderer.render();
        } else if (e.key === 'Escape') {
            // Clear any pending input
            this.pendingNumber = '';
            this.renderer.setPendingNumber('');
            this.renderer.render();
        } else if (this.tokenManager.selectedTokens.size > 0) {
            if (e.key === '-' || e.key === '+') {
                // Start a new number input with the sign
                this.pendingNumber = e.key;
                this.renderer.setPendingNumber(this.pendingNumber);
            } else if (e.key >= '0' && e.key <= '9' && this.pendingNumber !== '') {
                // Only accept numbers if we've started with a sign
                this.pendingNumber += e.key;
                this.renderer.setPendingNumber(this.pendingNumber);
            } else if (e.key === 'Enter' && this.pendingNumber !== '') {
                // Pass the full string including sign to modifySelectedHp
                this.tokenManager.modifySelectedHp(this.pendingNumber);
                this.pendingNumber = '';
                this.renderer.setPendingNumber('');
                this.renderer.render();
            }
        }
        
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            // Get the largest selected token's size for movement distance
            let maxSize = 60; // Default size
            this.tokenManager.selectedTokens.forEach(token => {
                maxSize = Math.max(maxSize, token.size);
            });
            
            const movements = {
                'ArrowUp': [0, -maxSize],
                'ArrowDown': [0, maxSize],
                'ArrowLeft': [-maxSize, 0],
                'ArrowRight': [maxSize, 0]
            };
            const [dx, dy] = movements[e.key];
            this.tokenManager.moveSelected(dx, dy);
            this.renderer.render();
        }
    }

    handleKeyUp(e) {
        // Key up handling if needed
    }

    startNumberBufferTimeout() {
        if (this.numberBufferTimeout) {
            clearTimeout(this.numberBufferTimeout);
        }
        this.numberBufferTimeout = setTimeout(() => {
            if (this.numberBuffer) {
                const amount = parseInt(this.numberBuffer);
                if (!isNaN(amount)) {
                    this.tokenManager.modifySelectedHp(amount);
                    this.renderer.render();
                }
                this.numberBuffer = '';
            }
        }, 1000);
    }

    showDialog(clientX, clientY, canvasCoords) {
        const dialog = document.getElementById('tokenDialog');
        if (!dialog) return;

        // Store canvas coordinates for token creation
        dialog.dataset.canvasX = canvasCoords.x;
        dialog.dataset.canvasY = canvasCoords.y;

        // Position dialog near click but ensure it's visible
        dialog.style.left = `${clientX}px`;
        dialog.style.top = `${clientY}px`;
        dialog.classList.remove('hidden');

        // Reset and focus input
        const nameInput = document.getElementById('monsterName');
        const hpInput = document.getElementById('monsterHP');
        if (nameInput && hpInput) {
            nameInput.value = '';
            hpInput.value = '';
            nameInput.focus();
        }
    }

    hideDialog() {
        const dialog = document.getElementById('tokenDialog');
        if (dialog) {
            dialog.classList.add('hidden');
            this.selectedMonster = null;
        }
    }

    async createTokenFromDialog() {
        const dialog = document.getElementById('tokenDialog');
        const nameInput = document.getElementById('monsterName');
        const hpInput = document.getElementById('monsterHP');

        if (!dialog || !nameInput || !hpInput) return;

        const name = nameInput.value.trim();
        const hp = parseInt(hpInput.value);

        if (name && !isNaN(hp) && hp > 0) {
            const x = parseFloat(dialog.dataset.canvasX);
            const y = parseFloat(dialog.dataset.canvasY);
            
            const monsterSize = this.selectedMonster?.size || 'Medium';
            const token = this.tokenManager.createToken(x, y, name, hp, monsterSize);

            if (this.selectedMonster?.image) {
                const imageUrl = `${MonsterAPI.IMG_BASE_URL}${this.selectedMonster.image}`;
                token.loadImage(imageUrl);
            }

            this.hideDialog();
            this.renderer.render();
        }
    }

    paste() {
        const tokens = this.tokenManager.paste();
        this.tokenManager.clearSelection();
        tokens.forEach(token => this.tokenManager.selectToken(token, true));
        this.renderer.render();
    }

    startPaste() {
        this.paste();
    }

    finalizePaste() {
        // This is no longer needed
    }
}