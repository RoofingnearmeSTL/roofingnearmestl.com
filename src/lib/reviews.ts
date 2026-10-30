// ─────────────────────────────────────────────────────────────────────────────
// HOW TO ADD A REVIEW (takes 1 minute)
// Copy a review from your Google Business Profile (or Facebook) and add an entry
// to the list below. Newest first. Use the reviewer's name exactly as it shows
// publicly (first name + last initial is fine), and copy the text word for word.
//
//   {
//     author: "Jane D.",
//     rating: 5,
//     date: "2026-10-21",           // date the review was posted (YYYY-MM-DD)
//     text: "Mike found the leak and showed me photos...",
//     source: "google",             // "google" or "facebook"
//     town: "Waterloo",             // optional, only if the reviewer mentioned it
//   },
//
// Rules: only real reviews, unedited (you may shorten with "…"), never paid for
// or rewarded. The homepage review section updates automatically.
// ─────────────────────────────────────────────────────────────────────────────

export type Review = {
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  text: string;
  source: "google" | "facebook";
  town?: string;
};

export const reviews: Review[] = [
  {
    author: "Mason Tinker",
    rating: 5,
    date: "2026-10-20",
    text: "Mike showed up and offered an inspection. I was skeptical but agreed. He was up and down in less than 20 minutes and gave me an honest photo report that showed my roof was still in good standing. If and when I need to replace I will be calling him based on honesty alone!",
    source: "google",
  },
  {
    author: "Kile K",
    rating: 5,
    date: "2026-10-20",
    text: "If you’re looking for a roofer who truly goes above and beyond, Mike is your guy! His professionalism, attention to detail, and dedication to quality workmanship are second to none. From start to finish, Mike makes the entire process smooth, stress-free, and easy to understand. What really sets Mike apart is his honesty, reliability, and genuine pride in his work. He doesn’t just aim to get the job done—he aims to get it done RIGHT. It’s rare to find someone who combines exceptional craftsmanship with outstanding customer service. Mike sets the gold standard for what a roofing professional should be. If you want quality work, peace of mind, and someone you can trust, look no further. I can’t recommend Mike highly enough.",
    source: "google",
  },
  {
    author: "Sherry Daly",
    rating: 5,
    date: "2026-10-19",
    text: "I can't say enough good things about Mike and the work he did for me. I have been with the same insurance company for 20 years, and when my roof needed to be replaced, they initially offered me only a small amount toward the repairs. Mike went above and beyond to help me work through the insurance process. He worked extremely hard, provided the documentation needed, and continued to follow up with the insurance company for months. There were several times when I was ready to give up, but Mike never did. He stayed persistent and kept fighting on my behalf. Because of Mike's hard work and dedication, the insurance company ultimately approved a substantial amount more than they initially offered, which made a huge difference in being able to pay for my new roof. Mike was professional, hardworking, persistent, and truly looked out for my best interest throughout the entire process. I'm incredibly grateful for everything he did and would absolutely recommend him to anyone who needs a roofer. He didn't just do a great job on the roof — he went the extra mile to make sure I received what I was entitled to from my insurance company.",
    source: "google",
  },
];
