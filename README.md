# DMTracker2

A digital whiteboard application designed for Dungeon Masters to track combat encounters in D&D 5E. This tool helps DMs manage monster tokens, hit points, and positions during combat without the need for a physical whiteboard.

## Features

- **Dynamic Token Management**
  - Double-click anywhere to add monster tokens
  - Enter monster name and hit points when creating tokens
  - Visual health indicator ring showing remaining HP percentage
  - Automatic marking of defeated monsters (0 HP)

- **Easy Health Tracking**
  - Quick HP modification with number keys
  - Add HP with number keys
  - Subtract HP using minus + number
  - Visual health indicator changes from green to red as HP decreases

- **Token Manipulation**
  - Drag and drop tokens to reposition
  - Select multiple tokens by dragging selection box
  - Copy and paste tokens (Ctrl+C, Ctrl+V)
  - Move selected tokens with arrow keys
  - Edit monster names by clicking on them
  - Delete defeated monsters

- **Interface**
  - Auto-scaling whiteboard that shows all tokens
  - Zoom in/out functionality
  - Resizable window for vertical or horizontal orientation
  - Clean interface with just the whiteboard and window controls

## Getting Started

1. Run `start_dmtracker.bat` to launch the application
2. Double-click anywhere on the whiteboard to add your first monster
3. Enter the monster name and hit points
4. Use the following controls:
   - Click to select/deselect tokens
   - Drag to move tokens
   - Numbers to add HP
   - Minus + number to subtract HP
   - Ctrl+A to select all tokens
   - Ctrl+C/Ctrl+V to copy/paste tokens
   - Arrow keys to move selected tokens
   - Click monster names to edit them

## Closing the Application

Simply close the window or run `stop_dmtracker.bat`. Token data is not preserved between sessions.