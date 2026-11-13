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
   - models   optional 3D models (.glb), see the VEX project
   - sections optional write-up under the model, see the Robotic Arm project

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
    slug: "robotic-arm",
    title: "Robotic Arm",
    year: "2026",
    tags: ["Onshape", "3D printed", "MG996R × 4", "Inverse kinematics"],
    summary:
      "A 3D-printed desktop arm with four MG996R servos: base yaw, shoulder, elbow and a gear-driven claw. Below is the math that turns a target point into servo angles, and the torque budget that decides what the arm can actually lift. Every length and mass comes straight from the CAD.",
    images: [{ src: "cover.jpg", caption: "Onshape render" }],
    links: [],
    models: [
      {
        src: "arm.glb",
        name: "Robotic Arm",
        season: "2026",
        description: [
          "Four joints, all MG996R. The base servo spins a turntable, the shoulder and elbow pitch the two links, and a fourth servo drives two meshed gears so both claw fingers close together.",
          "Shoulder axis 90 mm above the table, 110 mm upper link, 184 mm from elbow to the jaw tips. Max reach 294 mm from the shoulder.",
        ],
        tags: ["4 DOF", "Gear claw", "Turntable base"],
      },
    ],
    // Write-up below the model. Blocks: "paragraph", { math }, { list }, { table }, { note }, { embed }
    sections: [
      {
        title: "Geometry",
        blocks: [
          "Measured off the CAD with the joint axes as reference points. The claw sits 16 mm to the side of the base axis, so the arm plane is offset from the turntable center. Small, but the base angle has to correct for it.",
          {
            table: {
              head: ["Symbol", "What", "Value"],
              rows: [
                ["h", "Shoulder axis height above table", "90 mm"],
                ["L₁", "Shoulder to elbow", "110 mm"],
                ["L₂", "Elbow to jaw tips", "184 mm"],
                ["d", "Claw offset from base axis", "16 mm"],
                ["L₁ + L₂", "Max reach from shoulder", "294 mm"],
                ["|L₂ − L₁|", "Min reach from shoulder", "74 mm"],
              ],
            },
          },
        ],
      },
      {
        title: "Inverse kinematics",
        blocks: [
          "Forward kinematics is easy: plug in joint angles, get where the claw ends up. Controlling the arm needs the reverse. I want the claw at a point (x, y, z), so what angles do the servos need? That is inverse kinematics.",
          "The trick is splitting it in two. The base servo only decides which way the arm faces. Once that's set, the shoulder and elbow live in a single vertical plane, which turns a 3D problem into a 2D two-link problem.",
          "Step 1, base yaw. Find the horizontal distance to the target, remove the side offset, and rotate to face it:",
          {
            math: [
              "ρ  = √(x² + y²)",
              "r  = √(ρ² − d²)",
              "θ₀ = atan2(y, x) − atan2(d, r)",
            ],
          },
          "Step 2, shoulder and elbow. In the arm plane the target is r out and s = z − h up from the shoulder. The shoulder, elbow and target form a triangle with sides L₁, L₂ and √(r² + s²), so the law of cosines gives the elbow angle directly:",
          {
            math: [
              "s  = z − h",
              "D  = (r² + s² − L₁² − L₂²) / (2·L₁·L₂)",
              "θ₂ = −acos(D)        (elbow up)",
              "θ₁ = atan2(s, r) − atan2(L₂·sin θ₂, L₁ + L₂·cos θ₂)",
            ],
          },
          "If |D| > 1 the target is out of reach and there is no real solution, so the code checks that first. acos also has two answers, ±θ₂: elbow up or elbow down. Elbow down drags the forearm through the base and table for most targets, so I use elbow up.",
          "Step 3, servo angles. θ₀, θ₁, θ₂ are joint angles, not servo commands. Each servo gets a fixed offset (and sometimes a flipped sign) from how its horn was mounted, found by calibrating, then mapped to a 500 to 2500 µs pulse.",
          "One limit of this design: with three positioning joints the claw's pitch is not free. It always points at θ₁ + θ₂, so the arm reaches the point but can't choose the angle it arrives at. A wrist servo would fix that, at the cost of another 55 g at the far end of the arm, which the next section shows is the worst place to add weight.",
          { embed: "ik-demo.js" },
        ],
      },
      {
        title: "Torque budget",
        blocks: [
          "Holding still, each servo is fighting gravity. The torque on a joint is the weight of everything past it times its horizontal distance from the axis:",
          { math: ["τ = g · Σ mᵢ · xᵢ        xᵢ = horizontal distance from the joint"] },
          "Worst case is the arm stretched straight out, where every moment arm is longest. Masses come from the CAD volumes, assuming PLA at roughly half density once walls and infill are counted, plus 55 g per servo:",
          {
            table: {
              head: ["Part", "Mass", "Distance from shoulder (extended)"],
              rows: [
                ["Lower link", "44 g", "62 mm"],
                ["Elbow servo", "55 g", "100 mm"],
                ["Forearm", "59 g", "175 mm"],
                ["Claw servo", "55 g", "226 mm"],
                ["Claw fingers", "38 g", "254 mm"],
                ["Payload", "m", "294 mm"],
              ],
            },
          },
          {
            table: {
              head: ["MG996R", "4.8 V", "6.0 V"],
              rows: [
                ["Stall torque", "9.4 kg·cm (0.92 N·m)", "11 kg·cm (1.08 N·m)"],
                ["No-load speed", "0.17 s / 60°", "0.14 s / 60°"],
                ["Stall current", "", "2.5 A"],
              ],
            },
          },
          "Unloaded and fully extended, the shoulder needs 0.40 N·m. That is already 43% of stall at 4.8 V. The elbow only carries the forearm, so it sits at 0.15 N·m.",
          "Stall torque is the point where the motor stops turning, not a working load. Near it the servo pulls around 2.5 A, heats up and buzzes as its potentiometer feedback hunts. I keep continuous load under 50% of stall, and that sets the real payload:",
          {
            table: {
              head: ["Payload at full reach", "4.8 V", "6.0 V"],
              rows: [
                ["Under 50% stall (design limit)", "~21 g", "~49 g"],
                ["At stall (servo gives up)", "~182 g", "~236 g"],
              ],
            },
          },
          "Pull the target closer and the payload climbs fast, since every moment arm shrinks. Drag the claw inward in the demo above to watch the shoulder bar drop.",
        ],
      },
      {
        title: "Moving, tipping, precision",
        blocks: [
          "Moving adds an inertia term on top of gravity:",
          {
            math: [
              "τ = I·α + τ_gravity",
              "I_shoulder ≈ Σ mᵢ·rᵢ² ≈ 0.0082 kg·m²        (extended)",
              "α_max = (1.08 − 0.40) / 0.0082 ≈ 83 rad/s²   (6 V)",
            ],
          },
          "The servo's no-load speed is 60° per 0.14 s, about 7.5 rad/s. At 83 rad/s² it takes roughly 0.09 s and 19° just to get up to speed with the arm extended. Jump the setpoint across the workspace and the shoulder saturates and overshoots, so the code should ramp the angle (a trapezoidal speed profile) instead of snapping to it.",
          "Tipping is why the base is screwed down. The base, turntable and two lower servos weigh about 336 g, and the edge of the feet is 72 mm from the center. With the arm straight out between two feet, the arm's own weight creates almost exactly as much tipping moment as a loose base can resist:",
          {
            math: [
              "Overturning  = Σ m·(x − 72 mm)  ≈ 22.6 g·m   (unloaded)",
              "Restoring    = 336 g × 72 mm    ≈ 24.2 g·m",
            ],
          },
          "That's a 7% margin, so free-standing, a 7 g object at the claw would tip the whole arm. Holding 50 g at full reach with a 1.5× safety factor would take about 370 g of ballast. Instead, the feet are screwed to a large baseboard, which moves the tipping edge far out and takes it off the table as a failure mode.",
          "Precision is set by the servo's 5 µs dead band. Across a 2000 µs range for 180°, that's about 0.45° of slop per joint. At 294 mm of reach, 0.45° moves the claw about 2.3 mm, before any gear backlash.",
          "The claw: the servo turns one finger gear, which drives the other 1:1, so both fingers share the torque. With about 71 mm from finger pivot to jaw, grip force ≈ τ / (2 × 0.071 m) ≈ 6.5 N at 4.8 V stall, so roughly 3 N of squeeze at a safe 50%.",
        ],
      },
      {
        title: "What the numbers say",
        blocks: [
          "With the base screwed down, the shoulder is the bottleneck, and 55% of its load is the claw servo and fingers hanging at the far end. That points to the next version:",
          {
            list: [
              "Swap the claw servo for a micro servo like an SG90 (9 g). Cuts shoulder load by about a quarter.",
              "Move the elbow servo down to the base and drive the elbow through a parallel linkage, like a MeArm. Another 55 g off the arm.",
              "Add a counterweight or spring behind the shoulder so the servo only handles the difference.",
            ],
          },
          { note: "Assumptions: PLA at ~0.62 g/cm³ effective, servo mass 55 g, static torques except where noted, screws and wiring ignored. Real printed parts and servos vary, so treat these as estimates to test against." },
        ],
      },
    ],
  },
  {
    slug: "ai-reader",
    title: "Assistive Reading Device",
    year: "2026",
    tags: ["Raspberry Pi Zero 2 W", "Camera Module 3", "OCR", "TTS"],
    summary:
      "A clip-on device that reads printed text out loud. Press a button and a Raspberry Pi Zero 2 W with a Camera Module 3 photographs the page, pulls the text out with OCR, and speaks it. Built as a low-cost alternative to commercial assistive readers, with a custom button HAT so it runs without a screen.",
    images: [],
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
