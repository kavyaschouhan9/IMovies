import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import { Movie, Theater, Screen, Show, User } from "./models/index.js";
const movies = [
  [
    "Dune: Part Two",
    "Sci-Fi",
    "English",
    166,
    8.8,
    "2024-03-01",
    "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  ],
  [
    "The Batman",
    "Action",
    "English",
    176,
    7.8,
    "2022-03-04",
    "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
  ],
  [
    "Spider-Man: Across the Spider-Verse",
    "Animation",
    "English",
    140,
    8.6,
    "2023-06-02",
    "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
  ],
  [
    "Oppenheimer",
    "Drama",
    "English",
    180,
    8.3,
    "2023-07-21",
    "https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg",
  ],
  [
    "Interstellar",
    "Sci-Fi",
    "English",
    169,
    8.7,
    "2014-11-07",
    "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6Mnt6fR6.jpg",
  ],
  [
    "Jawan",
    "Action",
    "Hindi",
    169,
    7.2,
    "2023-09-07",
    "https://image.tmdb.org/t/p/w500/jFt1gS4BGHlK8xt76Y81Alp4dbt.jpg",
  ],
  [
    "Inside Out 2",
    "Animation",
    "English",
    96,
    7.6,
    "2026-11-14",
    "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
  ],
  ["Kalki 2898 AD", "Sci-Fi", "Telugu", 181, 7.5, "2026-12-05", ""],
  [
    "Barbie",
    "Comedy",
    "English",
    114,
    7.0,
    "2023-07-21",
    "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
  ],
  [
    "12th Fail",
    "Drama",
    "Hindi",
    147,
    8.8,
    "2023-10-27",
    "https://image.tmdb.org/t/p/w500/9y6b7x7u8b2h8Y1Z8x9f7Q2s5.jpg",
  ],
  [
    "The Wild Robot",
    "Animation",
    "English",
    102,
    8.2,
    "2024-09-27",
    "https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg",
  ],
  [
    "Mission: Impossible – Dead Reckoning",
    "Action",
    "English",
    163,
    7.7,
    "2023-07-12",
    "https://image.tmdb.org/t/p/w500/NNxYkU70HPurnNCSiCjYAmacwm.jpg",
  ],
];
const seatLayout = Array.from({ length: 8 }, (_, i) => ({
  row: String.fromCharCode(65 + i),
  seats: Array.from({ length: 10 }, (_, j) => ({
    number: j + 1,
    type: i < 2 ? "premium" : i > 5 ? "recliner" : "standard",
    accessible: i === 7 && j === 0,
  })),
}));
async function seed() {
  await connectDB();
  for (const [
    title,
    genre,
    language,
    duration,
    rating,
    date,
    posterUrl,
  ] of movies) {
    await Movie.findOneAndUpdate(
      { title },
      {
        $set: {
          title,
          slug: title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          genre: [genre],
          language,
          duration,
          rating,
          releaseDate: new Date(date),
          posterUrl,
          status: new Date(date) > new Date() ? "coming_soon" : "now_showing",
          description: `Discover ${title}, a ${genre.toLowerCase()} film made for the big screen.`,
          popularity: Math.round(rating * 100),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  const movieDocs = await Movie.find({ status: { $ne: "archived" } });
  const cities = [
    ["Mumbai", "Maharashtra", "PVR Icon, Andheri West"],
    ["Delhi", "Delhi", "Cinepolis, Saket"],
    ["Bengaluru", "Karnataka", "INOX, Koramangala"],
  ];
  for (const [city, state, name] of cities) {
    let theater = await Theater.findOne({ city, name });
    if (!theater)
      theater = await Theater.create({
        name,
        city,
        state,
        address: `${name.split(",")[0]} Cinema Complex, ${city}`,
        postalCode: "400001",
        facilities: ["Dolby Atmos", "Snacks", "Accessible seating"],
        timezone: "Asia/Kolkata",
      });
    let screen = await Screen.findOne({
      theater: theater._id,
      name: "Screen 1",
    });
    if (!screen)
      screen = await Screen.create({
        theater: theater._id,
        name: "Screen 1",
        seatLayout,
        totalSeats: 80,
        formats: ["2D", "3D"],
      });
    const existing = await Show.exists({
      screen: screen._id,
      startTime: { $gt: new Date() },
    });
    if (!existing) {
      for (let i = 0; i < Math.min(4, movieDocs.length); i++) {
        const start = new Date();
        start.setDate(start.getDate() + 1);
        start.setHours(12 + i * 3, 0, 0, 0);
        await Show.create({
          movie: movieDocs[i]._id,
          screen: screen._id,
          startTime: start,
          endTime: new Date(
            start.getTime() + movieDocs[i].duration * 60000 + 20 * 60000,
          ),
          language: movieDocs[i].language,
          format: "2D",
          basePrice: 250,
          categoryPrices: { standard: 250, premium: 350, recliner: 500 },
        });
      }
    }
  }
  console.log(
    `Seeded ${movieDocs.length} movies and theaters across 3 cities.`,
  );
  if (
    process.env.BOOTSTRAP_ADMIN_EMAIL &&
    process.env.BOOTSTRAP_ADMIN_PASSWORD
  ) {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (password.length < 14)
      throw new Error(
        "BOOTSTRAP_ADMIN_PASSWORD must be at least 14 characters",
      );
    const hash = await bcrypt.hash(password, 12);
    await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: process.env.BOOTSTRAP_ADMIN_NAME || "iMovies Admin",
          passwordHash: hash,
          role: "admin",
        },
        $setOnInsert: { email },
      },
      { upsert: true, new: true },
    );
    console.log(`Admin account bootstrapped for ${email}`);
  } else
    console.log(
      "Admin not created. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for a private bootstrap.",
    );
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
}
seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
