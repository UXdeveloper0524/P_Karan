import type { SiteInfo, Stop } from "@/types/story";

/**
 * All portfolio content lives here, typed. Edit the words in this file;
 * the camera path, layout and timing live in `lib/journey.ts` and
 * `lib/world/layout.ts`.
 */
export const SITE: SiteInfo = {
  name: "P. Karan",
  role: "Front-end developer",
  location: "Kochi, Kerala",
  description:
    "Front-end developer from Kochi with 5+ years of experience designing and building responsive e-commerce interfaces in Next.js.",
};

export const CREDITS: readonly string[] = [
  "3D models: Racing Kit by Kenney (CC0).",
];

export const STOPS: readonly Stop[] = [
  {
    id: "grid",
    kind: "text",
    eyebrow: "On the grid",
    heading: "P. Karan",
    body: "Front-end developer from Kochi, Kerala. I build the parts of a website people touch.",
  },
  {
    id: "about",
    kind: "text",
    eyebrow: "Pit lane",
    heading: "Designer first, then engineer.",
    body: "More than 5 years designing and building responsive web interfaces. I started as a designer and now ship front-end for e-commerce platforms in Next.js.",
  },
  {
    id: "climb",
    kind: "text",
    eyebrow: "The grandstands",
    heading: "From campus to Technopark.",
    body: "Computer science at M.G College of Engineering, CUSAT, 2014 to 2018. In October 2018 I joined Sristhi Innovative at Technopark, Trivandrum, as an intern.",
  },
  {
    id: "design",
    kind: "text",
    eyebrow: "The paddock",
    heading: "70+ sites designed.",
    body: "Over two years at Sristhi Innovative I designed 25+ e-commerce websites, 15+ educational institution websites and 30+ admin dashboards, working in Figma, Adobe XD and Photoshop.",
  },
  {
    id: "speed",
    kind: "text",
    eyebrow: "The speed gates",
    heading: "30% faster page loads.",
    body: "I reduced page load times by 30% through better asset management and code optimization.",
  },
  {
    id: "engineering",
    kind: "text",
    eyebrow: "The pit bay",
    heading: "Shipping Next.js storefronts.",
    body: "Since March 2021 I have been a software engineer at Webcastle Media in Kochi. I work on the front end of 5+ e-commerce platforms built with Next.js, and I have worked on 25+ service projects across e-commerce, real estate and education. I use GSAP, Framer Motion and AOS for animation.",
  },
  {
    id: "projects",
    kind: "projects",
    eyebrow: "The gallery",
    heading: "Eight billboards, eight projects.",
    body: "One platform and seven storefronts built on it.",
    projects: [
      {
        id: "storedada",
        name: "StoreDada",
        url: "https://storedada.com",
        domain: "storedada.com",
        role: "Front-end engineer",
        summary:
          "A Result as a Service e-commerce platform with 50+ integrations. Clients control the homepage design from the admin dashboard.",
      },
      {
        id: "mattressland",
        name: "Mattressland",
        url: "https://mattressland.ae",
        domain: "mattressland.ae",
        role: "Front-end engineer",
        summary:
          "E-commerce site on StoreDada, with a Next.js front end and a Node.js back end.",
      },
      {
        id: "sidcofoods",
        name: "Sidcofoods",
        url: "https://sidcofoods.ae",
        domain: "sidcofoods.ae",
        role: "Front-end engineer",
        summary:
          "E-commerce site powered by StoreDada, responsive across screen sizes and browsers.",
      },
      {
        id: "the-fresh-market-dubai",
        name: "The Fresh Market Dubai",
        url: "https://thefreshmarketdubai.com",
        domain: "thefreshmarketdubai.com",
        role: "Led front-end engineering",
        summary:
          "E-commerce site powered by StoreDada, tuned for responsiveness, cross-browser support and performance.",
      },
      {
        id: "knowear",
        name: "Knowear",
        url: "https://knowear.me",
        domain: "knowear.me",
        role: "Led front-end engineering",
        summary:
          "A women's activewear brand focused on sustainability, style and social impact. Product pages and e-commerce features.",
      },
      {
        id: "mamame",
        name: "Mamame",
        url: "https://mamame.iq",
        domain: "mamame.iq",
        role: "Led front-end engineering",
        summary:
          "E-commerce site powered by StoreDada, with intricate design elements and a fine-tuned interface.",
      },
      {
        id: "secondskin",
        name: "Secondskin",
        url: "https://secondskin.ae",
        domain: "secondskin.ae",
        role: "Front-end engineer",
        summary:
          "E-commerce site powered by StoreDada, with complex design elements and a smooth interface.",
      },
      {
        id: "alershad",
        name: "Alershad",
        url: "https://alershadonline.com",
        domain: "alershadonline.com",
        role: "Led front-end engineering",
        summary:
          "Electronics e-commerce site on StoreDada, built with Next.js for the electronics market.",
      },
    ],
  },
  {
    id: "toolbox",
    kind: "skills",
    eyebrow: "The toolbox",
    heading: "Everything in the pit box.",
    body: "What I reach for every day.",
    groups: [
      { label: "Front end", items: ["HTML", "CSS", "SCSS", "JavaScript", "jQuery"] },
      { label: "Frameworks", items: ["Next.js", "Tailwind CSS", "Bootstrap"] },
      { label: "Animation", items: ["GSAP", "Framer Motion", "AOS"] },
      { label: "Design", items: ["Figma", "Adobe XD", "Photoshop"] },
      {
        label: "Practice",
        items: [
          "Git and GitHub",
          "Code splitting",
          "Lazy loading",
          "Responsive design",
          "Cross-browser support",
          "Accessibility",
        ],
      },
    ],
  },
  {
    id: "contact",
    kind: "contact",
    eyebrow: "Finish line",
    heading: "Building something? Let's talk.",
    body: "Send a message and I will reply.",
    email: "karanp0524@gmail.com",
    linkedinLabel: "linkedin.com/in/karan-p-47a33a192",
    linkedinUrl: "https://www.linkedin.com/in/karan-p-47a33a192",
  },
];
