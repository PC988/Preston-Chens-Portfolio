/* =====================================================================
   CONTENT.JS  ·  The only file you need to edit.
   ---------------------------------------------------------------------
   ADD A PROJECT IN 3 STEPS
   1. Make a folder:   projects/<slug>/          e.g. projects/my-drone/
   2. Put photos in it. Name the main one  cover.jpg  (it becomes the slide).
   3. Copy one { ... } block below, paste it at the TOP of PROJECTS,
      and change the text. Newest project first = first slide.

   Fields
   - slug     folder name, lowercase, dashes, no spaces (also the URL)
   - title    shown on the slide and the project page
   - year     shown next to the title
   - tags     short labels (parts, tools, skills)
   - summary  1 to 3 sentences, shown on the project page
   - cover    optional. Defaults to projects/<slug>/cover.jpg
   - images   gallery photos inside the folder. Either "file.jpg"
              or { src: "file.jpg", caption: "what this shows" }
   - links    optional buttons, e.g. { label: "GitHub", href: "https://..." }

   No photo yet? Leave it. The slide shows a cyan placeholder instead.
   ===================================================================== */

const ABOUT = {
  name: "Preston Chen",

  // Big statement on the About page. One line per entry.
  statement: [
    "Preston",
    "is a student",
    "engineer in Taiwan",
    "building hardware",
    "and designing projects.",
  ],

  // Short paragraphs under the statement.
  bio: [
    "I design, prototype and test my own hardware: wearables, robots and medical devices. Most of it starts in CAD, gets 3D printed, and goes through a lot of versions before it works.",
  ],

  // Contact / social links. Delete any you don't want.
  links: [
    { label: "Email", href: "prestonc988@gmail.com" },
    { label: "GitHub", href: "https://github.com/" },
    { label: "Instagram", href: "https://www.instagram.com/prestonc_988/" },
  ],
};

const PROJECTS = [
  
  {
    slug: "ai-reader",
    title: "Assistive Reading Device",
    year: "2026",
    tags: ["Raspberry Pi Zero 2 W", "Camera Module 3", "OCR", "TTS"],
    summary:
      "An cheap assistive pointer that reads printed text out loud. A Raspberry Pi Zero 2 W and Camera Module 3 capture the page, and a custom button HAT controls it.",
    images: [],
    links: [],
  },
  {
    slug: "adaptive-insole",
    title: "Adaptive Insole",
    year: "2026",
    tags: ["ESP32", "Servo", "TPU", "Onshape", "Three.js"],
    summary:
      "A pressure-offloading insole designed to help prevent foot ulcers. Pods deflate under high-pressure zones instead of lifting the foot. Two prototypes: a static 3D-printed four-zone insole and a servo-driven single-pod demonstrator.",
    images: [
      // { src: "prototype-1.jpg", caption: "Four-zone static insole, printed in TPU" },
      // { src: "pod-demo.jpg", caption: "Servo-driven single-pod demonstrator" },
    ],
    links: [],
  },
  {
    slug: "vex-4253z",
    title: "VEX Robots · 4253Z",
    year: "2024–27",
    tags: ["VEX V5", "CAD", "Team 4253Z"],
    summary:
      "Three seasons of competition robots for VEX team 4253Z Raid Zero Z. Every robot is modeled in CAD before it's built, then rebuilt as the season teaches us what breaks. Spin them below.",
    images: [],
    links: [],
    // 3D models: put the .glb in this folder. Fields: src, name, season, game, description, tags, rotate (deg)
    models: [
      {
        src: "chainbar.glb",
        name: "Chainbar",
        season: "2026–27",
        description: [
          "This season's robot, built around a chain bar lift. Twin towers run a chain on each side, so the end of the arm stays level as it swings up instead of tipping the game piece.",
          "Low, wide drive base under a tall lift, with the electronics mounted high on the towers to keep the base clear.",
        ],
        tags: ["Chain bar", "Sprockets", "V5 motors"],
      },
      {
        src: "push-back-v2.glb",
        name: "Push Back V2",
        season: "2025–26",
        game: "Push Back",
        description: [
          "The rebuild. Same idea as V1, an angled roller tower that pulls blocks off the floor and up into the goals, but with plate side walls to guide the blocks and pneumatics added up top.",
          "Built after V1 showed us where blocks jammed and where the structure flexed.",
        ],
        tags: ["Roller intake", "Pneumatics", "Rebuild"],
      },
      {
        src: "push-back.glb",
        name: "Push Back V1",
        season: "2025–26",
        game: "Push Back",
        description: [
          "First robot of the Push Back season. Two angled towers carry a stack of sprocket-driven rollers that lift blocks from the floor intake to goal height.",
          "A front plate on a long arm reaches out ahead of the drive, and the whole intake is mounted on an open frame to keep it light.",
        ],
        tags: ["Roller intake", "Sprocket drive", "V1"],
      },
      {
        src: "high-stakes.glb",
        name: "High Stakes",
        season: "2024–25",
        game: "High Stakes",
        description: [
          "Our High Stakes robot. Rings ride up an angled conveyor tower and drop onto the stakes, with pneumatic cylinders running the mechanisms on the base.",
          "Six-wheel drive with a tall rear structure, the starting point for everything that came after.",
        ],
        tags: ["Conveyor", "Pneumatics", "6-wheel drive"],
      },
    ],
  },
];
