import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Film,
  Search,
  MapPin,
  Menu,
  X,
  UserRound,
  Ticket,
  Heart,
  ChevronRight,
  Play,
  Clock3,
  Star,
  SlidersHorizontal,
  ArrowRight,
  LogOut,
  ShieldCheck,
  CalendarDays,
  Check,
  Armchair,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "./lib/api";
import { useAuth } from "./context/AuthContext";
const fallbackMovies = [
  {
    _id: "demo-1",
    title: "Dune: Part Two",
    genre: ["Sci-Fi", "Adventure"],
    language: "English",
    duration: 166,
    rating: 8.8,
    status: "now_showing",
    releaseDate: "2024-03-01",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdropUrl:
      "https://image.tmdb.org/t/p/w1280/ xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    description:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
  },
  {
    _id: "demo-2",
    title: "The Batman",
    genre: ["Action", "Crime"],
    language: "English",
    duration: 176,
    rating: 7.8,
    status: "now_showing",
    releaseDate: "2022-03-04",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    description:
      "A brooding detective follows a trail of corruption in Gotham City.",
  },
  {
    _id: "demo-3",
    title: "Spider-Man: Across the Spider-Verse",
    genre: ["Animation", "Action"],
    language: "English",
    duration: 140,
    rating: 8.6,
    status: "now_showing",
    releaseDate: "2023-06-02",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    description:
      "Miles Morales swings into the multiverse and meets a new team of Spider-People.",
  },
  {
    _id: "demo-4",
    title: "Oppenheimer",
    genre: ["Drama", "History"],
    language: "English",
    duration: 180,
    rating: 8.3,
    status: "now_showing",
    releaseDate: "2023-07-21",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg",
    description:
      "The story of J. Robert Oppenheimer and the creation of the atomic bomb.",
  },
  {
    _id: "demo-5",
    title: "Interstellar",
    genre: ["Sci-Fi", "Drama"],
    language: "English",
    duration: 169,
    rating: 8.7,
    status: "now_showing",
    releaseDate: "2014-11-07",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6Mnt6fR6.jpg",
    description:
      "A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.",
  },
  {
    _id: "demo-6",
    title: "Jawan",
    genre: ["Action", "Thriller"],
    language: "Hindi",
    duration: 169,
    rating: 7.2,
    status: "now_showing",
    releaseDate: "2023-09-07",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/jFt1gS4BGHlK8xt76Y81Alp4dbt.jpg",
    description:
      "A man driven by a personal vendetta takes on a system to correct the wrongs of society.",
  },
  {
    _id: "demo-7",
    title: "Inside Out 2",
    genre: ["Animation", "Comedy"],
    language: "English",
    duration: 96,
    rating: 7.6,
    status: "coming_soon",
    releaseDate: "2026-11-14",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
    description:
      "A new chapter of emotions arrives as Riley enters a new stage of life.",
  },
  {
    _id: "demo-8",
    title: "Kalki 2898 AD",
    genre: ["Sci-Fi", "Action"],
    language: "Telugu",
    duration: 181,
    rating: 7.5,
    status: "coming_soon",
    releaseDate: "2026-12-05",
    posterUrl: "https://image.tmdb.org/t/p/w500/1kK6Z9R7Y8dWwTz5W6H7x8g9.jpg",
    description:
      "A futuristic epic set in a world where ancient myth and technology collide.",
  },
];
const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  return (
    <header className="nav">
      <Link className="brand" to="/">
        <span className="brand-mark">
          <Film size={19} />
        </span>
        iMovies<span className="brand-dot">.</span>
      </Link>
      <nav className={open ? "nav-links show" : "nav-links"}>
        <NavLink to="/movies">Movies</NavLink>
        <NavLink to="/theaters">Theaters</NavLink>
        <NavLink to="/my-bookings">My bookings</NavLink>
        <NavLink to="/watchlist">Watchlist</NavLink>
      </nav>
      <form
        className="nav-search"
        onSubmit={(e) => {
          e.preventDefault();
          nav("/movies?q=" + encodeURIComponent(q));
          setOpen(false);
        }}
      >
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search movies..."
          aria-label="Search movies"
        />
        <kbd>↵</kbd>
      </form>
      <div className="nav-account">
        {user ? (
          <>
            <span className="avatar">{user.name?.[0] || "U"}</span>
            <button
              className="icon-button"
              title="Log out"
              onClick={() => logout().then(() => toast.success("Signed out"))}
            >
              <LogOut size={17} />
            </button>
            {user.role === "admin" && (
              <Link to="/admin" className="admin-link">
                Admin
              </Link>
            )}
          </>
        ) : (
          <Link className="login-link" to="/login">
            <UserRound size={17} /> Sign in
          </Link>
        )}
      </div>
      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Film size={19} />
          </span>
          iMovies<span className="brand-dot">.</span>
        </Link>
        <p>Your next great movie night starts here.</p>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 iMovies Entertainment</span>
        <span>
          Made for the love of cinema <span className="red">♥</span>
        </span>
      </div>
    </footer>
  );
}
function Poster({ movie, className = "" }) {
  const [bad, setBad] = useState(false);
  return (
    <div className={"poster " + className}>
      {!bad && movie.posterUrl ? (
        <img
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          loading="lazy"
          onError={() => setBad(true)}
        />
      ) : (
        <div className="poster-fallback">
          <Film size={32} />
          <span>{movie.title}</span>
        </div>
      )}
    </div>
  );
}
function MovieCard({ movie }) {
  return (
    <article className="movie-card">
      <Link to={`/movies/${movie._id}`} className="poster-link">
        <Poster movie={movie} />
        <span className="poster-rating">
          <Star size={13} fill="currentColor" /> {movie.rating || "—"}
        </span>
        <span className="poster-play">
          <Play size={18} fill="currentColor" />
        </span>
      </Link>
      <div className="movie-info">
        <Link to={`/movies/${movie._id}`} className="movie-title">
          {movie.title}
        </Link>
        <div className="movie-meta">
          {(movie.genre || []).slice(0, 2).join(" · ")} <span>•</span>{" "}
          {movie.duration ? `${movie.duration} min` : movie.language}
        </div>
        <Link to={`/movies/${movie._id}`} className="book-small">
          Book tickets <ChevronRight size={14} />
        </Link>
      </div>
    </article>
  );
}
function useMovies() {
  const [movies, setMovies] = useState(fallbackMovies);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get("/movies", { params: { limit: 24 } })
      .then((r) => {
        if (active && r.data.movies?.length) setMovies(r.data.movies);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  return { movies, loading };
}
function SectionTitle({ eyebrow, title, link, to = "/movies" }) {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {link && (
        <Link className="text-link" to={to}>
          {link}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
function Home() {
  const { movies, loading } = useMovies();
  const [city, setCity] = useState("Mumbai");
  const featured =
    movies.find((m) => m.title === "Dune: Part Two") || movies[0];
  return (
    <>
      <section className="hero">
        <div
          className="hero-backdrop"
          style={{
            backgroundImage: `linear-gradient(90deg,#09090b 0%,rgba(9,9,11,.93) 28%,rgba(9,9,11,.45) 66%,rgba(9,9,11,.2) 100%),linear-gradient(0deg,#09090b 0%,transparent 45%),url('${featured?.backdropUrl || featured?.posterUrl || ""}')`,
          }}
        />
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="live-dot" /> NOW SHOWING{" "}
            <span className="kicker-line" /> EXPERIENCE THE BIG SCREEN
          </div>
          <h1>
            Stories worth
            <br /> <span>showing up for.</span>
          </h1>
          <p className="hero-copy">
            Your seat to the stories everyone will be talking about. Find your
            next favourite film and make a night of it.
          </p>
          <div className="hero-actions">
            <Link
              to={`/movies/${featured?._id || "demo-1"}`}
              className="btn btn-primary"
            >
              <Ticket size={17} /> Book tickets
            </Link>
            <Link to="/movies" className="btn btn-ghost">
              <Play size={16} /> Explore movies
            </Link>
          </div>
          <div className="hero-foot">
            <div className="avatar-stack">
              <span>✦</span>
              <span>★</span>
              <span>●</span>
            </div>
            <span>
              <strong>Great stories.</strong> Unforgettable nights.
            </span>
          </div>
        </div>
        <div className="hero-feature">
          <span className="feature-label">EDITOR'S PICK</span>
          <h3>{featured?.title || "Dune: Part Two"}</h3>
          <div className="feature-meta">
            <Star size={14} fill="currentColor" /> {featured?.rating || "8.8"}{" "}
            <span>•</span> {featured?.duration || 166} min <span>•</span>{" "}
            {featured?.language || "English"}
          </div>
        </div>
        <div className="hero-index">
          <span>01</span>
          <div />
          <span>04</span>
        </div>
      </section>
      <main className="page-wrap">
        <div className="discovery-bar">
          <div className="discovery-intro">
            <MapPin size={18} />
            <div>
              <strong>Find a cinema near you</strong>
              <span>Discover what's playing in your city</span>
            </div>
          </div>
          <select
            aria-label="Select city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option>Mumbai</option>
            <option>Delhi</option>
            <option>Bengaluru</option>
            <option>Satna</option>
            <option>Pune</option>
            <option>Hyderabad</option>
          </select>
          <Link to={`/theaters?city=${city}`} className="discovery-button">
            Explore cinemas <ArrowRight size={16} />
          </Link>
        </div>
        <section className="content-section">
          <SectionTitle
            eyebrow="THE BIG SCREEN, RIGHT NOW"
            title="Now showing"
            link="View all movies"
          />
          <div className="movie-grid">
            {movies
              .filter((m) => m.status !== "coming_soon")
              .slice(0, 4)
              .map((m) => (
                <MovieCard key={m._id} movie={m} />
              ))}
          </div>
        </section>
        <section className="content-section coming-section">
          <SectionTitle
            eyebrow="SAVE THE DATE"
            title="Coming soon"
            link="See what's next"
          />
          <div className="movie-grid">
            {movies
              .filter((m) => m.status === "coming_soon")
              .concat(
                movies.filter((m) => m.status !== "coming_soon").slice(4, 6),
              )
              .slice(0, 4)
              .map((m) => (
                <MovieCard key={m._id} movie={m} />
              ))}
          </div>
        </section>
        <section className="promo">
          <div className="promo-icon">
            <Ticket size={26} />
          </div>
          <div>
            <span className="eyebrow">MAKE IT A MOVIE NIGHT</span>
            <h2>Big screen. Big feelings.</h2>
            <p>
              Pick your film, grab your favourite seats, and let the story take
              over.
            </p>
          </div>
          <Link className="btn btn-primary" to="/movies">
            Find your movie <ArrowRight size={16} />
          </Link>
          <div className="promo-decoration">IM</div>
        </section>
      </main>
    </>
  );
}
function Movies() {
  const { movies, loading } = useMovies();
  const [q, setQ] = useState(
    new URLSearchParams(location.search).get("q") || "",
  );
  const [genre, setGenre] = useState("All");
  const [status, setStatus] = useState("All");
  const genres = [
    "All",
    "Action",
    "Drama",
    "Sci-Fi",
    "Comedy",
    "Animation",
    "Thriller",
    "Adventure",
  ];
  const filtered = movies.filter(
    (m) =>
      m.title.toLowerCase().includes(q.toLowerCase()) &&
      (genre === "All" ||
        (m.genre || []).some((g) => g.toLowerCase() === genre.toLowerCase())) &&
      (status === "All" || m.status === status),
  );
  return (
    <main className="page-wrap inner-page">
      <div className="page-heading">
        <span className="eyebrow">YOUR NEXT FAVOURITE FILM</span>
        <h1>
          Explore movies<span className="red">.</span>
        </h1>
        <p>From edge-of-your-seat thrillers to stories that stay with you.</p>
      </div>
      <div className="filter-row">
        <div className="filter-search">
          <Search size={17} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles..."
          />
        </div>
        <div className="genre-pills">
          {genres.map((g) => (
            <button
              key={g}
              className={genre === g ? "pill active" : "pill"}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <select
          className="status-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="All">All movies</option>
          <option value="now_showing">Now showing</option>
          <option value="coming_soon">Coming soon</option>
        </select>
      </div>
      {filtered.length ? (
        <div className="movie-grid movie-grid-wide">
          {filtered.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Film size={32} />
          <h3>No movies found</h3>
          <p>Try a different title or filter.</p>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setQ("");
              setGenre("All");
              setStatus("All");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </main>
  );
}
function MovieDetails() {
  const { id } = useParams();
  const { movies } = useMovies();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    const local = movies.find((m) => m._id === id);
    if (local) setMovie(local);
    api
      .get(`/movies/${id}`)
      .then((r) => setMovie(r.data.movie))
      .catch(() => {});
    api
      .get("/shows", { params: { movie: id, date } })
      .then((r) => setShows(r.data.shows || []))
      .catch(() => setShows([]));
  }, [id, movies, date]);
  if (!movie)
    return (
      <main className="page-wrap inner-page">
        <div className="empty-state">
          <Film />
          <h2>Movie not found</h2>
          <Link to="/movies" className="btn btn-primary">
            Browse movies
          </Link>
        </div>
      </main>
    );
  return (
    <main className="page-wrap inner-page">
      <div className="detail-layout">
        <Poster movie={movie} className="detail-poster" />
        <div className="detail-copy">
          <span className="eyebrow">
            {movie.status === "coming_soon" ? "COMING SOON" : "NOW SHOWING"}
          </span>
          <h1>{movie.title}</h1>
          <div className="detail-meta">
            <span>
              <Star size={15} fill="currentColor" /> {movie.rating || "—"}
            </span>
            <span>
              <Clock3 size={15} /> {movie.duration || "—"} min
            </span>
            <span>{movie.language || "Multiple languages"}</span>
          </div>
          <div className="genre-tags">
            {(movie.genre || []).map((g) => (
              <span key={g}>{g}</span>
            ))}
          </div>
          <p>
            {movie.description ||
              movie.synopsis ||
              "Discover this movie in cinemas near you."}
          </p>
          <div className="show-picker">
            <div className="show-picker-heading">
              <h3>
                <CalendarDays size={18} /> Choose a showtime
              </h3>
              <input
                aria-label="Show date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            {shows.length ? (
              <div className="show-list">
                {shows.map((s) => (
                  <Link
                    key={s._id}
                    to={`/shows/${s._id}/seats`}
                    className="showtime"
                  >
                    <strong>
                      {new Date(s.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                    <span>
                      {s.screen?.name || "Screen"} · {s.format || "2D"}
                    </span>
                    <b>{money(s.basePrice || 250)}</b>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="no-shows">
                No live showtimes available for this date yet. Try another date
                or browse all cinemas.
              </div>
            )}
            <Link to="/theaters" className="text-link">
              Browse all theaters <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
function Theaters() {
  const [theaters, setTheaters] = useState([]);
  const [city, setCity] = useState("Mumbai");
  useEffect(() => {
    api
      .get("/theaters", { params: { city } })
      .then((r) => setTheaters(r.data.theaters || []))
      .catch(() => setTheaters([]));
  }, [city]);
  return (
    <main className="page-wrap inner-page">
      <div className="page-heading">
        <span className="eyebrow">YOUR LOCAL CINEMA GUIDE</span>
        <h1>
          Find your cinema<span className="red">.</span>
        </h1>
        <p>Great seats, giant screens, and the magic of being there.</p>
      </div>
      <div className="filter-row">
        <MapPin size={18} />
        <select
          className="status-select"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option>Mumbai</option>
          <option>Delhi</option>
          <option>Bengaluru</option>
        </select>
      </div>
      {theaters.length ? (
        <div className="theater-grid">
          {theaters.map((t) => (
            <article className="theater-card" key={t._id}>
              <div className="theater-icon">
                <Film size={25} />
              </div>
              <div>
                <h3>{t.name}</h3>
                <p>
                  {t.address}, {t.city}
                </p>
                <span>
                  {(t.facilities || ["Reserved seating", "Snacks"]).join(" · ")}
                </span>
              </div>
              <Link
                to={`/theaters/${t._id}`}
                className="icon-button"
                aria-label={`View ${t.name}`}
              >
                <ChevronRight />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <MapPin size={32} />
          <h3>More cinemas coming soon</h3>
          <p>We're adding theaters in {city}. Check back shortly.</p>
        </div>
      )}
    </main>
  );
}
function Seats() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .get(`/shows/${id}`)
      .then((r) => setShow(r.data.show))
      .catch(() =>
        setShow({
          movie: { title: "Cinema night" },
          screen: { name: "Screen 1" },
          basePrice: 250,
        }),
      );
    api
      .get(`/shows/${id}/seats`)
      .then((r) => setSeats(r.data.seats || []))
      .catch(() =>
        setSeats(
          Array.from({ length: 8 }, (_, row) => ({
            row: String.fromCharCode(65 + row),
            seats: Array.from({ length: 10 }, (_, i) => ({
              id: `${String.fromCharCode(65 + row)}${i + 1}`,
              number: i + 1,
              type: row < 2 ? "premium" : "standard",
              status: ["B4", "D7", "F2"].includes(
                `${String.fromCharCode(65 + row)}${i + 1}`,
              )
                ? "booked"
                : "available",
            })),
          })),
        ),
      );
  }, [id]);
  const flat = seats.flatMap((r) =>
    (r.seats || []).map((s) => ({ ...s, row: r.row })),
  );
  const total = selected.reduce(
    (sum, s) =>
      sum +
      (s.type === "premium"
        ? 350
        : s.type === "recliner"
          ? 500
          : show?.basePrice || 250),
    0,
  );
  const toggle = (s) =>
    setSelected((prev) =>
      prev.some((x) => x.id === s.id)
        ? prev.filter((x) => x.id !== s.id)
        : prev.length >= 8
          ? prev
          : [...prev, s],
    );
  const hold = async () => {
    if (!user) {
      toast("Sign in to reserve your seats");
      nav("/login");
      return;
    }
    setBusy(true);
    try {
      const r = await api.post(`/shows/${id}/holds`, {
        seats: selected.map((s) => s.id),
      });
      const b = await api.post("/bookings", {
        showId: id,
        holdId: r.data.hold._id,
        seats: selected.map((s) => s.id),
      });
      nav(`/checkout/${b.data.booking._id}`);
    } catch (e) {
      toast.error(e.message || "Could not reserve seats");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page-wrap inner-page">
      <div className="page-heading">
        <span className="eyebrow">YOUR NIGHT, YOUR SEATS</span>
        <h1>
          Choose your seats<span className="red">.</span>
        </h1>
        <p>
          {show?.movie?.title || "Movie"} · {show?.screen?.name || "Screen 1"}
        </p>
      </div>
      <div className="seat-layout">
        <div className="screen-wrap">
          <div className="screen-glow" />
          <div className="screen-shape">SCREEN</div>
          <span className="screen-caption">All eyes this way</span>
        </div>
        <div className="seat-map">
          {seats.map((row, i) => (
            <div className="seat-row" key={row.row || i}>
              <span className="row-label">
                {row.row || String.fromCharCode(65 + i)}
              </span>
              {row.seats?.map((s) => {
                const isSelected = selected.some((x) => x.id === s.id);
                return (
                  <button
                    key={s.id}
                    aria-label={`Seat ${row.row || ""}${s.number}: ${s.status || "available"}`}
                    title={`${row.row || ""}${s.number} · ${s.type || "standard"}`}
                    disabled={s.status === "booked" || s.status === "locked"}
                    className={`seat ${s.type || "standard"} ${s.status === "booked" ? "booked" : ""} ${s.status === "locked" ? "locked" : ""} ${isSelected ? "selected" : ""}`}
                    onClick={() =>
                      toggle({
                        ...s,
                        id: s.id || `${row.row}${s.number}`,
                        row: row.row,
                      })
                    }
                  >
                    {isSelected ? <Check size={13} /> : s.number}
                  </button>
                );
              })}
              <span className="row-label">
                {row.row || String.fromCharCode(65 + i)}
              </span>
            </div>
          ))}
        </div>
        <div className="seat-legend">
          <span>
            <i className="legend-seat" /> Available
          </span>
          <span>
            <i className="legend-seat selected" /> Selected
          </span>
          <span>
            <i className="legend-seat booked" /> Booked
          </span>
          <span>
            <i className="legend-seat premium" /> Premium
          </span>
        </div>
        <div className="seat-summary">
          <div>
            <span className="muted-label">SELECTED SEATS</span>
            <strong>
              {selected.length
                ? selected.map((s) => `${s.row || ""}${s.number}`).join(", ")
                : "Choose your seats"}
            </strong>
          </div>
          <div>
            <span className="muted-label">TOTAL AMOUNT</span>
            <strong>{money(total)}</strong>
          </div>
          <button
            className="btn btn-primary"
            disabled={!selected.length || busy}
            onClick={hold}
          >
            {busy ? "Reserving..." : "Continue to checkout"}{" "}
            <ArrowRight size={16} />
          </button>
        </div>
        <p className="seat-note">
          <ShieldCheck size={14} /> Seats are confirmed only after successful
          payment. Availability is revalidated by the server.
        </p>
      </div>
    </main>
  );
}
function AuthPage({ mode }) {
  const { login, register, user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    terms: false,
  });
  useEffect(() => {
    if (user) nav("/");
  }, [user]);
  const submit = async (e) => {
    e.preventDefault();
    if (mode === "register" && form.password !== form.confirm)
      return toast.error("Passwords do not match");
    if (mode === "register" && !form.terms)
      return toast.error("Please accept the terms to continue");
    setBusy(true);
    try {
      if (mode === "login")
        await login({ email: form.email, password: form.password });
      else
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          termsAccepted: form.terms,
        });
      toast.success(
        mode === "login" ? "Welcome back!" : "Your account is ready",
      );
      nav("/");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <div className="auth-art">
        <div className="auth-art-content">
          <span className="brand-mark">
            <Film />
          </span>
          <span className="eyebrow">THE MAGIC STARTS HERE</span>
          <h2>
            Every seat has
            <br />a story.
          </h2>
          <p>Find your film. Bring your people. Make a memory.</p>
          <div className="auth-art-line" />
        </div>
      </div>
      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <Link to="/" className="back-link">
            ← Back to iMovies
          </Link>
          <span className="eyebrow">
            {mode === "login" ? "WELCOME BACK" : "JOIN THE MOVIE CLUB"}
          </span>
          <h1>
            {mode === "login"
              ? "Good to see you."
              : "Your next movie night awaits."}
          </h1>
          <p>
            {mode === "login"
              ? "Sign in to pick up where the previews left off."
              : "Create an account and get the best seats in the house."}
          </p>
          {mode === "register" && (
            <label>
              Full name
              <input
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                minLength={2}
              />
            </label>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              minLength={8}
            />
          </label>
          {mode === "register" && (
            <>
              <label>
                Confirm password
                <input
                  required
                  type="password"
                  value={form.confirm}
                  onChange={(e) =>
                    setForm({ ...form, confirm: e.target.value })
                  }
                  placeholder="Enter password again"
                  minLength={8}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(e) =>
                    setForm({ ...form, terms: e.target.checked })
                  }
                />{" "}
                I agree to the <Link to="/terms">Terms</Link> and Privacy
                Policy.
              </label>
            </>
          )}
          {mode === "login" && (
            <div className="forgot-row">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          )}
          <button className="btn btn-primary auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}{" "}
            <ArrowRight size={16} />
          </button>
          <div className="auth-switch">
            {mode === "login" ? (
              <>
                New to iMovies? <Link to="/register">Create an account</Link>
              </>
            ) : (
              <>
                Already a member? <Link to="/login">Sign in</Link>
              </>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
function Checkout() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((r) => setBooking(r.data.booking))
      .catch(() => {});
  }, [bookingId]);
  const pay = async () => {
    setBusy(true);

    try {
      // Ask our backend to create a Razorpay order
      const r = await api.post("/payments/orders", { bookingId });

      if (r.data.mode !== "razorpay") {
        toast.error("Razorpay is not enabled on the backend.");
        return;
      }

      // Load Razorpay Checkout script
      const loadRazorpay = () =>
        new Promise((resolve) => {
          if (window.Razorpay) {
            resolve(true);
            return;
          }

          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

      const loaded = await loadRazorpay();

      if (!loaded) {
        toast.error("Could not load Razorpay. Please try again.");
        return;
      }

      const options = {
        key: r.data.keyId,
        amount: r.data.order.amount,
        currency: r.data.order.currency,
        name: "iMovies",
        description: "Movie ticket booking",
        order_id: r.data.order.id,

        handler: async function (response) {
          try {
            // Verify the payment with our backend
            const v = await api.post("/payments/verify", {
              bookingId,
              provider: "razorpay",
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (v.data.booking) {
              toast.success("Payment successful!");
              nav(`/booking/success/${bookingId}`);
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (e) {
            toast.error(
              e.response?.data?.message || "Payment verification failed.",
            );
          }
        },

        modal: {
          ondismiss: function () {
            toast("Payment cancelled.");
          },
        },

        theme: {
          color: "#e11d48",
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function () {
        toast.error("Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (e) {
      toast.error(
        e.response?.data?.message || e.message || "Could not start payment.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page-wrap inner-page">
      <div className="page-heading">
        <span className="eyebrow">ONE LAST STEP</span>
        <h1>
          Confirm your night<span className="red">.</span>
        </h1>
        <p>Review your booking and complete payment securely.</p>
      </div>
      {booking ? (
        <div className="checkout-card">
          <div>
            <span className="eyebrow">BOOKING SUMMARY</span>
            <h2>
              {booking.movieTitle || booking.show?.movie?.title || "Your movie"}
            </h2>
            <p>
              {booking.seatLabels?.join(", ") || "Selected seats"} ·{" "}
              {booking.theaterName || "Your cinema"}
            </p>
            <span className="payment-demo">
              <ShieldCheck size={15} />{" "}
              {import.meta.env.VITE_PAYMENT_MODE === "razorpay"
                ? "Secure payment"
                : "Demo payment mode"}
            </span>
          </div>
          <div className="checkout-total">
            <span>Total to pay</span>
            <strong>{money(booking.totalAmount || booking.total || 0)}</strong>
            <button className="btn btn-primary" disabled={busy} onClick={pay}>
              {busy ? "Processing…" : "Pay & confirm"} <ArrowRight size={16} />
            </button>
            <small>Payment details are handled by the payment provider.</small>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <h3>Booking not available</h3>
          <p>
            Sign in with the account used to create this booking, or start
            again.
          </p>
          <Link to="/movies" className="btn btn-primary">
            Browse movies
          </Link>
        </div>
      )}
    </main>
  );
}
function BookingSuccess() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  useEffect(() => {
    api
      .get(`/bookings/${bookingId}`)
      .then((r) => setBooking(r.data.booking))
      .catch(() => {});
  }, [bookingId]);
  return (
    <main className="page-wrap inner-page">
      <div className="success-card">
        <div className="success-check">
          <Check size={30} />
        </div>
        <span className="eyebrow">IT'S MOVIE TIME</span>
        <h1>
          {booking?.status === "confirmed"
            ? "You’re all booked."
            : "Your booking is being checked."}
        </h1>
        <p>
          {booking?.status === "confirmed"
            ? "Your seats are saved. Get ready for the big screen."
            : "We’ll show your ticket here once payment has been confirmed."}
        </p>
        {booking && (
          <div className="ticket-card">
            <div>
              <span>BOOKING REFERENCE</span>
              <strong>{booking.reference || booking._id}</strong>
            </div>
            <div>
              <span>STATUS</span>
              <strong>{booking.status}</strong>
            </div>
            <div>
              <span>TOTAL PAID</span>
              <strong>{money(booking.totalAmount || 0)}</strong>
            </div>
          </div>
        )}
        <Link to="/my-bookings" className="btn btn-primary">
          View my bookings <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    if (user)
      api
        .get("/bookings/my")
        .then((r) => setBookings(r.data.bookings || []))
        .catch(() => {});
  }, [user]);
  if (!user)
    return (
      <main className="page-wrap inner-page">
        <div className="empty-state">
          <Ticket size={32} />
          <h2>Your tickets live here</h2>
          <p>Sign in to see your bookings and digital tickets.</p>
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </main>
    );
  return (
    <main className="page-wrap inner-page">
      <div className="page-heading">
        <span className="eyebrow">YOUR CINEMA DIARY</span>
        <h1>
          My bookings<span className="red">.</span>
        </h1>
        <p>All your upcoming movie nights, in one place.</p>
      </div>
      {bookings.length ? (
        <div className="booking-list">
          {bookings.map((b) => (
            <Link
              className="booking-row"
              to={`/my-bookings/${b._id}`}
              key={b._id}
            >
              <div className="booking-icon">
                <Ticket />
              </div>
              <div>
                <h3>
                  {b.movieTitle || b.show?.movie?.title || "Movie booking"}
                </h3>
                <p>
                  {b.reference} · {(b.seatLabels || []).join(", ")}
                </p>
              </div>
              <span className={`status-badge ${b.status}`}>{b.status}</span>
              <strong>{money(b.totalAmount || 0)}</strong>
              <ChevronRight />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Ticket size={32} />
          <h3>No bookings yet</h3>
          <p>Your next great night out is just a few clicks away.</p>
          <Link to="/movies" className="btn btn-primary">
            Explore movies
          </Link>
        </div>
      )}
    </main>
  );
}
function Watchlist() {
  const { user } = useAuth();
  const { movies } = useMovies();
  const [ids, setIds] = useState([]);
  useEffect(() => {
    if (user)
      api
        .get("/users/me/watchlist")
        .then((r) => setIds(r.data.movieIds || []))
        .catch(() => {});
  }, [user]);
  const list = movies.filter((m) => ids.includes(m._id));
  return (
    <main className="page-wrap inner-page">
      <div className="page-heading">
        <span className="eyebrow">KEEP YOUR MUST-WATCH LIST CLOSE</span>
        <h1>
          Watchlist<span className="red">.</span>
        </h1>
        <p>Movies you want to experience on the big screen.</p>
      </div>
      {list.length ? (
        <div className="movie-grid">
          {list.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={32} />
          <h3>Your watchlist is waiting</h3>
          <p>Save films you don't want to miss. Sign in to sync your list.</p>
          <Link to="/movies" className="btn btn-primary">
            Explore movies
          </Link>
        </div>
      )}
    </main>
  );
}
function StaticPage({ title, copy }) {
  return (
    <main className="page-wrap inner-page">
      <div className="page-heading">
        <span className="eyebrow">IMOVIES</span>
        <h1>
          {title}
          <span className="red">.</span>
        </h1>
        <p>{copy}</p>
      </div>
      <div className="static-content">
        <p>
          iMovies makes finding a film and planning your cinema visit simple.
          This page is part of the project foundation; add your finalized
          company information and policies before launching publicly.
        </p>
        <Link className="btn btn-primary" to="/movies">
          Explore movies <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
function Admin() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [movies, setMovies] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [screens, setScreens] = useState([]);
  const [message, setMessage] = useState("");

  const [theaterForm, setTheaterForm] = useState({
    name: "",
    address: "",
    city: "Satna",
    state: "Madhya Pradesh",
    postalCode: "",
    contact: "",
  });

  const [screenForm, setScreenForm] = useState({
    theater: "",
    name: "Screen 1",
    rows: 8,
    seatsPerRow: 10,
    formats: ["2D"],
  });

  const [showForm, setShowForm] = useState({
    movie: "",
    screen: "",
    startTime: "",
    language: "Hindi",
    format: "2D",
    basePrice: 150,
  });

  async function loadAdminData() {
    const [overview, movieResult, theaterResult] = await Promise.all([
      api.get("/admin/overview"),
      api.get("/movies?limit=40"),
      api.get("/theaters"),
    ]);

    setData(overview.data);
    setMovies(movieResult.data.movies || []);
    setTheaters(theaterResult.data.theaters || []);
  }

  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminData().catch((err) =>
        setMessage(err.response?.data?.message || "Could not load admin data"),
      );
    }
  }, [user]);

  useEffect(() => {
    if (screenForm.theater) {
      api
        .get(`/theaters/${screenForm.theater}`)
        .then((r) => setScreens(r.data.screens || []))
        .catch(() => setScreens([]));
    } else {
      setScreens([]);
    }
  }, [screenForm.theater]);

  if (user?.role !== "admin") {
    return (
      <main className="page-wrap inner-page">
        <div className="empty-state">
          <h2>Admin access required</h2>
          <p>This area is available to authorized administrators only.</p>
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  async function submitTheater(e) {
    e.preventDefault();
    setMessage("");

    try {
      await api.post("/theaters", theaterForm);
      setMessage("Theatre created successfully!");
      setTheaterForm({
        name: "",
        address: "",
        city: "Satna",
        state: "Madhya Pradesh",
        postalCode: "",
        contact: "",
      });
      await loadAdminData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not create theatre");
    }
  }

  async function submitScreen(e) {
    e.preventDefault();
    setMessage("");

    try {
      await api.post("/screens", {
        ...screenForm,
        rows: Number(screenForm.rows),
        seatsPerRow: Number(screenForm.seatsPerRow),
      });
      setMessage("Screen created successfully!");
      const r = await api.get(`/theaters/${screenForm.theater}`);
      setScreens(r.data.screens || []);
      await loadAdminData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not create screen");
    }
  }

  async function submitShow(e) {
    e.preventDefault();
    setMessage("");

    try {
      await api.post("/shows", {
        ...showForm,
        basePrice: Number(showForm.basePrice),
        startTime: new Date(showForm.startTime).toISOString(),
      });
      setMessage("Show created successfully!");
      await loadAdminData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not create show");
    }
  }

  return (
    <main className="page-wrap inner-page">
      <div className="page-heading">
        <span className="eyebrow">PLATFORM CONTROL</span>
        <h1>Admin overview.</h1>
        <p>Create theatres, screens, and movie shows.</p>
      </div>

      {message && <div className="admin-note">{message}</div>}

      <div className="stats-grid">
        {[
          ["Users", data?.users],
          ["Movies", data?.movies],
          ["Theaters", data?.theaters],
          ["Shows", data?.shows],
          ["Bookings", data?.bookings],
          ["Gross revenue", data ? money(data.grossRevenue || 0) : "—"],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </div>

      <div className="admin-forms">
        <section className="admin-form-card">
          <div className="admin-form-heading">
            <div>
              <span className="eyebrow">LOCATION</span>
              <h2>Add a theatre</h2>
            </div>
            <span className="admin-form-step">01</span>
          </div>
          <p className="admin-form-description">
            Add a cinema location before setting up its screens.
          </p>
          <form onSubmit={submitTheater} className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              Theatre name
              <input
                required
                placeholder="e.g. PVR City Centre"
                value={theaterForm.name}
                onChange={(e) =>
                  setTheaterForm({ ...theaterForm, name: e.target.value })
                }
              />
            </label>
            <label className="admin-field admin-field-wide">
              Street address
              <input
                required
                placeholder="Street, building, area"
                value={theaterForm.address}
                onChange={(e) =>
                  setTheaterForm({ ...theaterForm, address: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              City
              <input
                required
                placeholder="City"
                value={theaterForm.city}
                onChange={(e) =>
                  setTheaterForm({ ...theaterForm, city: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              State
              <input
                placeholder="State"
                value={theaterForm.state}
                onChange={(e) =>
                  setTheaterForm({ ...theaterForm, state: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              Postal code
              <input
                placeholder="Postal code"
                value={theaterForm.postalCode}
                onChange={(e) =>
                  setTheaterForm({ ...theaterForm, postalCode: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              Contact number
              <input
                type="tel"
                placeholder="Phone number"
                value={theaterForm.contact}
                onChange={(e) =>
                  setTheaterForm({ ...theaterForm, contact: e.target.value })
                }
              />
            </label>
            <div className="admin-form-actions">
              <button className="btn btn-primary">
                Create theatre <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </section>

        <section className="admin-form-card">
          <div className="admin-form-heading">
            <div>
              <span className="eyebrow">AUDITORIUM</span>
              <h2>Add a screen</h2>
            </div>
            <span className="admin-form-step">02</span>
          </div>
          <p className="admin-form-description">
            Choose a theatre and define the seating layout for its screen.
          </p>
          <form onSubmit={submitScreen} className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              Theatre
              <select
                required
                value={screenForm.theater}
                onChange={(e) =>
                  setScreenForm({ ...screenForm, theater: e.target.value })
                }
              >
                <option value="">Select a theatre</option>
                {theaters.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} — {t.city}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field admin-field-wide">
              Screen name
              <input
                required
                placeholder="e.g. Screen 1"
                value={screenForm.name}
                onChange={(e) =>
                  setScreenForm({ ...screenForm, name: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              Rows
              <input
                type="number"
                min="1"
                max="26"
                value={screenForm.rows}
                onChange={(e) =>
                  setScreenForm({ ...screenForm, rows: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              Seats per row
              <input
                type="number"
                min="1"
                max="40"
                value={screenForm.seatsPerRow}
                onChange={(e) =>
                  setScreenForm({ ...screenForm, seatsPerRow: e.target.value })
                }
              />
            </label>
            <div className="admin-form-actions">
              <button className="btn btn-primary" disabled={!theaters.length}>
                Create screen <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </section>

        <section className="admin-form-card admin-form-card-wide">
          <div className="admin-form-heading">
            <div>
              <span className="eyebrow">SCHEDULE</span>
              <h2>Create a show</h2>
            </div>
            <span className="admin-form-step">03</span>
          </div>
          <p className="admin-form-description">
            Schedule a movie screening and set its language, format, and
            starting price.
          </p>
          <form
            onSubmit={submitShow}
            className="admin-form-grid admin-show-grid"
          >
            <label className="admin-field">
              Movie
              <select
                required
                value={showForm.movie}
                onChange={(e) =>
                  setShowForm({ ...showForm, movie: e.target.value })
                }
              >
                <option value="">Select a movie</option>
                {movies.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              Screen
              <select
                required
                value={showForm.screen}
                onChange={(e) =>
                  setShowForm({ ...showForm, screen: e.target.value })
                }
              >
                <option value="">Select a screen</option>
                {screens.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              Start date and time
              <input
                type="datetime-local"
                required
                value={showForm.startTime}
                onChange={(e) =>
                  setShowForm({ ...showForm, startTime: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              Language
              <input
                placeholder="e.g. Hindi"
                value={showForm.language}
                onChange={(e) =>
                  setShowForm({ ...showForm, language: e.target.value })
                }
              />
            </label>
            <label className="admin-field">
              Format
              <select
                value={showForm.format}
                onChange={(e) =>
                  setShowForm({ ...showForm, format: e.target.value })
                }
              >
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="IMAX">IMAX</option>
              </select>
            </label>
            <label className="admin-field">
              Base ticket price (₹)
              <input
                type="number"
                min="1"
                required
                value={showForm.basePrice}
                onChange={(e) =>
                  setShowForm({ ...showForm, basePrice: e.target.value })
                }
              />
            </label>
            <div className="admin-form-actions">
              <button
                className="btn btn-primary"
                disabled={!movies.length || !screens.length}
              >
                Create show <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
function App() {
  const { ready } = useAuth();
  return (
    <>
      <Navbar />
      {!ready && <div className="loading-strip" />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        <Route path="/theaters" element={<Theaters />} />
        <Route path="/theaters/:id" element={<Theaters />} />
        <Route path="/shows/:id/seats" element={<Seats />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route
          path="/forgot-password"
          element={
            <StaticPage
              title="Reset your password"
              copy="Password reset is available when outbound email is configured."
            />
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <StaticPage
              title="Choose a new password"
              copy="Follow the secure password reset link sent to your email."
            />
          }
        />
        <Route path="/checkout/:bookingId" element={<Checkout />} />
        <Route
          path="/booking/success/:bookingId"
          element={<BookingSuccess />}
        />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/my-bookings/:id" element={<MyBookings />} />
        <Route
          path="/profile"
          element={
            <StaticPage
              title="Your profile"
              copy="Manage your account details and preferences."
            />
          }
        />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route
          path="/notifications"
          element={
            <StaticPage
              title="Notifications"
              copy="Your booking and cinema updates will appear here."
            />
          }
        />
        <Route path="/admin/*" element={<Admin />} />
        <Route
          path="/about"
          element={
            <StaticPage
              title="About iMovies"
              copy="A better way to make a night at the movies."
            />
          }
        />
        <Route
          path="/contact"
          element={
            <StaticPage
              title="Get in touch"
              copy="Questions, feedback, or a movie recommendation? We'd love to hear from you."
            />
          }
        />
        <Route
          path="/terms"
          element={
            <StaticPage
              title="Terms & conditions"
              copy="Terms for using the iMovies ticket booking service."
            />
          }
        />
        <Route
          path="/privacy"
          element={
            <StaticPage
              title="Privacy policy"
              copy="How iMovies handles account and booking information."
            />
          }
        />
        <Route
          path="*"
          element={
            <StaticPage
              title="Page not found"
              copy="Looks like this scene got cut. Let's get you back to the movies."
            />
          }
        />
      </Routes>
      <Footer />
    </>
  );
}
export default App;
