# FERA CANTEEN — Static Menu (GitHub Pages)

This is a **single-page** static menu site.

## Files
- `index.html` — page
- `styles.css` — styling
- `app.js` — logic (loads & renders menu)
- `menu.json` — menu data (must be a **single valid JSON array**)
- `Fera-Canteen-Logo-DG.png` — logo

## How it connects (HTML ↔ JSON)
The site loads the menu via:
```js
fetch('./menu.json')
```
So `menu.json` must sit in the **same folder** as `index.html`.

## Deploy to GitHub Pages
1. Create / open repo: `Fera-Menu`
2. Upload **all files** from this folder to the repo root.
3. GitHub → **Settings** → **Pages**
4. Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`
5. Save. Your URL will be:
   `https://wanna-be-engineer.github.io/Fera-Menu/`

## Updating the menu
Replace `menu.json` with the new file (keep it valid JSON array) and push.

---
Footer line:
> This is what eating without overthinking feels like!
