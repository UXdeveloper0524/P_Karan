import type { SiteInfo, Stop } from "@/types/story";

/**
 * All portfolio content lives here, typed. Edit the words in this file;
 * the camera path, layout and timing live in `lib/journey.ts` and
 * `lib/world/layout.ts`. Stops must stay in the same order as `JOURNEY`.
 */
export const SITE: SiteInfo = {
  name: "P. Karan",
  role: "Front-end engineer",
  location: "Kochi, Kerala",
  description:
    "Front-end engineer from Kochi with eight years of experience, from designing interfaces to shipping Next.js platforms.",
};

export const CREDITS: readonly string[] = [
  "3D models: Racing Kit and Car Kit by Kenney (CC0).",
];

export const STOPS: readonly Stop[] = [
  {
    id: "grid",
    kind: "text",
    eyebrow: "Lights out",
    short: "Lights out",
    heading: "P. Karan",
    body: "Front-end engineer from Kochi. Eight years, one lap: wireframe, then code, then motion, then scale. Press on and drive it.",
  },
  {
    id: "qualifying",
    kind: "timeline",
    eyebrow: "Qualifying laps",
    short: "Qualifying",
    heading: "The foundation.",
    body: "Where curiosity turned into craft.",
    entries: [
      {
        years: "2011 – 2012",
        title: "Board-level milestone",
        place: "Jawahar Navodaya Vidyalaya, Mahe",
        note: "Where curiosity began. Finished with a 9.8 GPA.",
      },
      {
        years: "2012 – 2014",
        title: "Higher Secondary",
        place: "Jawahar Navodaya Vidyalaya, Mahe",
        note: "Discipline took shape. Two focused years closed with 85%, and a clear lean towards technology.",
      },
      {
        years: "2014 – 2018",
        title: "B.Tech, Computer Science & Engineering",
        place: "M.G. College of Engineering, Thiruvananthapuram (CUSAT)",
        note: "Four years of logic, systems and problem-solving, finished with a 7.77 GPA. Code stopped being a subject and became a craft.",
      },
    ],
  },
  {
    id: "rookie",
    kind: "chapter",
    eyebrow: "Rookie season",
    short: "Rookie season",
    heading: "The Apprentice.",
    body: "Learning how interfaces are born.",
    role: "UI/UX Developer & Designer Intern",
    company: "Sristhi Innovative, Technopark Trivandrum",
    logo: "/logos/sristhi-innovative.jpg",
    period: "Oct 2018 – Dec 2018",
    bullets: [
      "Built responsive web and mobile interfaces with the team.",
      "Moved from wireframes to prototypes to high-fidelity designs in Figma, Adobe XD and Photoshop.",
      "Ran user research and usability testing, and checked every design across browsers and devices.",
      "Shipped features for e-commerce platforms, educational institution websites and admin dashboards.",
    ],
    shift: "Student → working designer-developer",
    meters: [
      { label: "Design", value: 8 },
      { label: "Code", value: 4 },
      { label: "Research", value: 6 },
    ],
  },
  {
    id: "design",
    kind: "chapter",
    eyebrow: "Design sector",
    short: "Design sector",
    heading: "The Designer-Developer.",
    body: "Two and a half years of designing at volume.",
    role: "UI/UX Developer & Designer",
    company: "Sristhi Innovative, Technopark Trivandrum",
    logo: "/logos/sristhi-innovative.jpg",
    period: "Jan 2019 – Mar 2021",
    bullets: [
      "Designed 25+ e-commerce websites, 15+ educational institution websites and 30+ admin panel dashboards, tailored to client requirements.",
      "Added interaction with jQuery and JavaScript, and built responsive components with Bootstrap, improving mobile usability scores.",
      "Cut page load times by 30% through efficient asset management and code optimisation.",
    ],
    shift: "Designer who codes → designer-developer who ships",
    meters: [
      { label: "Design", value: 10 },
      { label: "Code", value: 7 },
      { label: "Performance", value: 6 },
    ],
  },
  {
    id: "throttle",
    kind: "chapter",
    eyebrow: "Full throttle",
    short: "Full throttle",
    heading: "The Frontend Engineer.",
    body: "Design sense met production engineering.",
    role: "Software Engineer",
    company: "Webcastle Media Pvt Ltd, Kochi",
    logo: "/logos/webcastle-media.png",
    period: "Mar 2021 – Aug 2025",
    bullets: [
      "Frontend developer on 5+ Next.js e-commerce platforms, resolving interface issues and improving functionality and user experience.",
      "Contributed to 25+ service projects across e-commerce, real estate and educational institutions, focused on polished, seamless interfaces.",
      "Built engaging, animated interfaces with GSAP, Framer Motion and AOS.",
    ],
    shift: "Designer-developer → framework-level frontend engineer",
    meters: [
      { label: "React / Next.js", value: 9 },
      { label: "Animation", value: 8 },
      { label: "Scale", value: 8 },
    ],
  },
  {
    id: "present",
    kind: "chapter",
    eyebrow: "Current lap",
    short: "Current lap",
    heading: "The Present.",
    body: "Eight years of design instinct and engineering depth, applied to new problems.",
    role: "Software Engineer",
    company: "Impreza Technologies Pvt Ltd, Kochi",
    logo: "/logos/impreza-technologies.jpg",
    period: "Sept 2025 – Present",
    bullets: [
      "Building web experiences and platforms at a Kochi digital agency. The selected work is just ahead.",
    ],
    shift: "Engineer → senior-level craftsman, still growing",
    meters: [
      { label: "Craft", value: 10 },
      { label: "Ownership", value: 9 },
    ],
  },
  {
    id: "live",
    kind: "projects",
    eyebrow: "Live on track",
    short: "Live on track",
    heading: "Live in the world.",
    body: "Three builds that are out there right now.",
    projects: [
      {
        id: "landmark-builders",
        name: "Landmark Builders",
        preview: "/previews/landmark-builders.jpg",
        status: "live",
        summary:
          "Twenty-five years of real estate told as a timeline, with animated stats, project pages and five enquiry forms.",
      },
      {
        id: "varma-wellage",
        name: "Varma Wellage",
        preview: "/previews/varma-wellage.jpg",
        status: "live",
        summary:
          "Senior living made warm: a layered hero, location pages, a brochure download and visit booking.",
      },
      {
        id: "asian-developers",
        name: "Asian Developers",
        preview: "/previews/asian-developers.jpg",
        status: "live",
        summary:
          "Kochi apartments and offices filtered by status and type, with RERA details, events and a pop-up enquiry form.",
      },
    ],
  },
  {
    id: "garage",
    kind: "projects",
    eyebrow: "In the garage",
    short: "In the garage",
    heading: "In development.",
    body: "Six builds still on the bench.",
    projects: [
      {
        id: "impreza-rewamp",
        name: "Impreza Rewamp",
        preview: "/previews/impreza-rewamp.jpg",
        status: "in-development",
        stack: "Next.js",
        summary: "A scroll-driven brand intro with a skip button and a reduced-motion toggle.",
      },
      {
        id: "first-cart",
        name: "First Cart",
        preview: "/previews/first-cart.jpg",
        status: "in-development",
        stack: "Next.js",
        summary:
          "An appliance store with shop, offers, store locator and support pages, fed by a separate admin.",
      },
      {
        id: "vaidyamadham",
        name: "Vaidyamadham",
        preview: "/previews/vaidyamadham.jpg",
        status: "in-development",
        stack: "Next.js",
        summary:
          "Ashtavaidya heritage online: treatments, nursing home, tariff and international-patient pages.",
      },
      {
        id: "wedding-invitation",
        name: "Wedding invitation",
        preview: "/previews/wedding-invitation.jpg",
        status: "in-development",
        stack: "Next.js",
        summary:
          "A preloader, live countdown, add-to-calendar, 4-step RSVP and WhatsApp share, hosted on Vercel.",
      },
      {
        id: "eioz",
        name: "EIOZ",
        preview: "/previews/eioz.jpg",
        status: "in-development",
        summary:
          "A lighting brand's “Journey of Light” process timeline, client and partner sections, and a pause-animation control.",
      },
      {
        id: "spatialx",
        name: "SpatialX",
        preview: "/previews/spatialx.jpg",
        status: "in-development",
        summary:
          "Luxury private-cinema branding with background video, a product catalogue and a testimonial slider.",
      },
    ],
  },
  {
    id: "laptime",
    kind: "stats",
    eyebrow: "Lap time",
    short: "Lap time",
    heading: "The through-line.",
    body: "2018 → today. In most of these builds a clear story meets a working system: forms that capture leads, content that stays editable, and motion readers can pause or reduce.",
    stats: [
      { value: "70+", label: "websites and dashboards designed" },
      { value: "25+", label: "service projects delivered" },
      { value: "5+", label: "Next.js e-commerce platforms" },
      { value: "8", label: "years" },
    ],
  },
  {
    id: "finish",
    kind: "contact",
    eyebrow: "Finish line",
    short: "Finish line",
    heading: "Let's build the next chapter together.",
    body: "Send a message and I will reply.",
    email: "karanp0524@gmail.com",
    linkedinLabel: "linkedin.com/in/karan-p-47a33a192",
    linkedinUrl: "https://www.linkedin.com/in/karan-p-47a33a192",
  },
];
