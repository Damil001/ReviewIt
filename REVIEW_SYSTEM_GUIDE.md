# Review System - How It Works

## Quick Start

1. **Start the backend:**

   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend (in a new terminal):**

   ```bash
   cd frontend
   npm run dev
   ```

3. **Open your browser** to `http://localhost:5173`

## Using the Comment System

### Step 1: Open a Project

- Log in or register
- Create a new project or open an existing one
- The project view shows breakpoints (Mobile, Tablet, Laptop, Desktop)

### Step 2: Enable Comment Mode

- Look at the **Toolbar** at the top of the screen
- Click the **"💬 Comment"** button
- The button will turn blue when active
- Your cursor will change to a crosshair inside the breakpoint frames

### Step 3: Add a Comment

- Click **anywhere inside a breakpoint frame** (e.g., Mobile, Tablet)
- A popup modal will appear in the center of the screen
- Type your comment
- Click **"Add Comment"** or press **Ctrl+Enter**

### Step 4: View Comments

- Comments appear as colored pins on the iframe
- Red pins = unresolved comments
- Green pins = resolved comments
- Click a pin to view the comment thread

### Step 5: Manage Comments

- In the comment thread panel:
  - Add replies
  - Click "Resolve" to mark as done
  - Click "Delete" to remove

## Toolbar Buttons

| Button        | Function                              |
| ------------- | ------------------------------------- |
| 🖱️ Pan        | Normal mode - pan and zoom the canvas |
| 💬 Comment    | Click to add comments on breakpoints  |
| ✏️ Draw       | Draw annotations (coming soon)        |
| ✓ Resolve All | Mark all comments as resolved         |
| 🗑️ Clear All  | Delete all comments                   |
| 📥 Export     | Download comments as JSON             |

## Technical Flow

```
User clicks "Comment" button
    ↓
Toolbar sets overlayMode = 'comment'
    ↓
ProjectView passes overlayMode to Canvas
    ↓
Canvas passes mode to BreakpointFrame
    ↓
BreakpointFrame passes mode to ReviewOverlay
    ↓
ReviewOverlay sends postMessage to iframe: TOGGLE_COMMENT_MODE
    ↓
overlay-script.js sets window.__COMMENT_MODE__ = true
    ↓
User clicks inside iframe
    ↓
overlay-script.js captures click, sends ADD_COMMENT_REQUEST to parent
    ↓
ReviewOverlay receives message, shows comment modal
    ↓
User types and submits
    ↓
Comment saved to backend API
    ↓
Pin appears on iframe
```

## Troubleshooting

### Comments not working?

1. **Check the console for errors** (F12 → Console tab)

2. **Make sure backend is running:**

   - Should see "🚀 Server running on http://localhost:3001"
   - Should see "🔌 Socket.io ready for real-time connections"

3. **Check if Comment mode is active:**

   - Console should show "Comment mode toggled: true"
   - The Comment button should be blue

4. **Check if iframe loaded:**

   - Console should show "Review overlay initialized"
   - Console should show "Iframe loaded for breakpoint: mobile" etc.

5. **Check network requests:**
   - F12 → Network tab
   - Should see requests to `/api/comments`

### White screen?

- Check console for JavaScript errors
- Make sure all components render correctly

### Modal not appearing?

- Make sure you're in Comment mode (button is blue)
- Click directly on the content inside a breakpoint frame
- Check console for "Comment request received" message

## API Endpoints

| Method | Endpoint                  | Description          |
| ------ | ------------------------- | -------------------- |
| GET    | /api/comments?url=X       | Get comments for URL |
| POST   | /api/comments             | Create new comment   |
| PATCH  | /api/comments/:id         | Update comment       |
| DELETE | /api/comments/:id         | Delete comment       |
| POST   | /api/comments/:id/replies | Add reply            |

## Files Involved

- `frontend/src/components/Toolbar.jsx` - Mode buttons
- `frontend/src/pages/ProjectView.jsx` - Main page, manages overlayMode state
- `frontend/src/components/Canvas.jsx` - Passes mode to breakpoints
- `frontend/src/components/BreakpointFrame.jsx` - Contains iframe + ReviewOverlay
- `frontend/src/components/ReviewOverlay.jsx` - Handles comment logic
- `backend/public/overlay-script.js` - Injected into iframes
- `backend/routes/comments.js` - Comment API
- `backend/routes/comments.json` - Comment storage
