# Preston's site

Open `index.html` in a browser to view it. No install, no server.

## Add a project
1. Create a folder `projects/<slug>/` (lowercase, dashes, e.g. `projects/my-drone/`).
2. Put your photos in it. Name the main photo `cover.jpg`. That's the slide image.
3. Open `content.js`, copy one project block, paste it at the top of `PROJECTS`, edit the text,
   and list your gallery photos under `images`.

Newest project at the top = first slide.

## Add a 3D model
Put a `.glb` in the project's folder and list it under `models` in `content.js` (see the VEX project).
Raw CAD STLs are too big for the web. Shrink them first, e.g. with `gltfpack -i robot.glb -o small.glb -si 0.15 -cc -noq`,
and keep each file under ~3 MB.

## Edit the About page
Change `ABOUT` at the top of `content.js`.

## Files
- `content.js`: all your text and projects (the only file you edit)
- `app.js`: slider and page logic
- `style.css`: colors and layout (cyan is `--cyan` at the top)
