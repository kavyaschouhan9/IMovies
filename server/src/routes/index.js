import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { z } from "zod";
import Razorpay from "razorpay";
import QRCode from "qrcode";
import {
  User,
  Movie,
  Theater,
  Screen,
  Show,
  SeatHold,
  Booking,
  Payment,
  AuditLog,
} from "../models/index.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import {
  createHold,
  createBooking,
  confirmDemoPayment,
  expireHolds,
} from "../services/booking.js";
const router = Router();
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const parse = (schema, data) => {
  const r = schema.safeParse(data);
  if (!r.success)
    throw Object.assign(new Error(r.error.issues[0].message), { status: 400 });
  return r.data;
};
const cookieOpts = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax",
  path: "/",
  maxAge: 1000 * 60 * 30,
});
const sign = (user) =>
  jwt.sign({ sub: String(user._id) }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "30m",
    issuer: "imovies",
  });
const authPayload = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
});
router.get("/health", (req, res) =>
  res.json({
    status: "ok",
    service: "imovies-api",
    time: new Date().toISOString(),
  }),
);
router.post(
  "/auth/register",
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(2).max(80),
        email: z.string().email().max(254),
        password: z.string().min(8).max(128),
        termsAccepted: z.literal(true),
      }),
      req.body,
    );
    const email = b.email.toLowerCase();
    if (await User.exists({ email }))
      return res
        .status(409)
        .json({ message: "Unable to create an account with those details" });
    const user = await User.create({
      name: b.name,
      email,
      passwordHash: await bcrypt.hash(b.password, 12),
      termsAcceptedAt: new Date(),
    });
    res
      .cookie("imovies_access", sign(user), cookieOpts())
      .status(201)
      .json({ user: authPayload(user) });
  }),
);
router.post(
  "/auth/login",
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        email: z.string().email(),
        password: z.string().min(1).max(128),
      }),
      req.body,
    );
    const user = await User.findOne({ email: b.email.toLowerCase() }).select(
      "+passwordHash",
    );
    if (!user || !(await bcrypt.compare(b.password, user.passwordHash)))
      return res
        .status(401)
        .json({ message: "Email or password is incorrect" });
    res
      .cookie("imovies_access", sign(user), cookieOpts())
      .json({ user: authPayload(user) });
  }),
);
router.post("/auth/logout", (req, res) =>
  res
    .clearCookie("imovies_access", {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      path: "/",
    })
    .json({ ok: true }),
);
router.get("/auth/me", optionalAuth, (req, res) =>
  res.json({ user: req.user ? authPayload(req.user) : null }),
);
router.post(
  "/auth/forgot-password",
  wrap(async (req, res) => {
    parse(z.object({ email: z.string().email() }), req.body);
    res.json({
      message:
        "If an account matches that email, password reset instructions will be sent when email delivery is configured.",
    });
  }),
);
router.post("/auth/reset-password", (_req, res) =>
  res.status(501).json({
    message:
      "Password reset token delivery is not enabled. Configure a verified email provider before enabling this endpoint.",
  }),
);
router.get(
  "/movies",
  wrap(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1),
      limit = Math.min(40, Math.max(1, Number(req.query.limit) || 12));
    const filter = { status: { $ne: "archived" } };
    if (
      req.query.status &&
      ["now_showing", "coming_soon"].includes(req.query.status)
    )
      filter.status = req.query.status;
    if (req.query.genre)
      filter.genre = {
        $in: [
          new RegExp(
            `^${String(req.query.genre).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        ],
      };
    if (req.query.language)
      filter.language = new RegExp(
        `^${String(req.query.language).slice(0, 40)}$`,
        "i",
      );
    if (req.query.q)
      filter.title = new RegExp(
        String(req.query.q)
          .slice(0, 80)
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
    const sortMap = {
      popularity: { popularity: -1 },
      releaseDate: { releaseDate: -1 },
      title: { title: 1 },
      rating: { rating: -1 },
    };
    const sort = sortMap[req.query.sort] || { popularity: -1 };
    const [movies, total] = await Promise.all([
      Movie.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Movie.countDocuments(filter),
    ]);
    res.json({
      movies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);
router.get(
  "/movies/:id",
  wrap(async (req, res) => {
    const movie = await Movie.findById(req.params.id).lean();
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    res.json({ movie });
  }),
);
router.post(
  "/movies",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const movie = await Movie.create(req.body);
    await AuditLog.create({
      actor: req.user._id,
      action: "movie.create",
      entityType: "Movie",
      entityId: String(movie._id),
    });
    res.status(201).json({ movie });
  }),
);
router.patch(
  "/movies/:id",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    await AuditLog.create({
      actor: req.user._id,
      action: "movie.update",
      entityType: "Movie",
      entityId: String(movie._id),
    });
    res.json({ movie });
  }),
);
router.delete(
  "/movies/:id",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { status: "archived" },
      { new: true },
    );
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    await AuditLog.create({
      actor: req.user._id,
      action: "movie.archive",
      entityType: "Movie",
      entityId: String(movie._id),
    });
    res.json({ movie });
  }),
);
router.get(
  "/theaters",
  wrap(async (req, res) => {
    const filter = { active: true };
    if (req.query.city)
      filter.city = new RegExp(`^${String(req.query.city).slice(0, 60)}$`, "i");
    const theaters = await Theater.find(filter)
      .sort({ city: 1, name: 1 })
      .limit(100)
      .lean();
    res.json({ theaters });
  }),
);
router.get(
  "/theaters/:id",
  wrap(async (req, res) => {
    const theater = await Theater.findById(req.params.id).lean();
    if (!theater) return res.status(404).json({ message: "Theater not found" });
    const screens = await Screen.find({ theater: theater._id }).lean();
    res.json({ theater, screens });
  }),
);
router.get(
  "/shows",
  wrap(async (req, res) => {
    const filter = { status: "scheduled", startTime: { $gte: new Date() } };
    if (req.query.movie) filter.movie = req.query.movie;
    if (req.query.date) {
      const d = new Date(`${req.query.date}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) {
        filter.startTime = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
      }
    }
    const shows = await Show.find(filter)
      .sort({ startTime: 1 })
      .limit(100)
      .populate("movie", "title posterUrl language")
      .populate("screen", "name theater")
      .lean();
    res.json({ shows });
  }),
);
router.get(
  "/shows/:id",
  wrap(async (req, res) => {
    const show = await Show.findById(req.params.id)
      .populate("movie", "title posterUrl language duration")
      .populate({
        path: "screen",
        select: "name theater",
        populate: { path: "theater", select: "name city address" },
      })
      .lean();
    if (!show) return res.status(404).json({ message: "Show not found" });
    res.json({ show });
  }),
);
router.get(
  "/shows/:id/seats",
  wrap(async (req, res) => {
    await expireHolds();
    const show = await Show.findById(req.params.id).populate("screen");
    if (!show) return res.status(404).json({ message: "Show not found" });
    const [bookings, holds] = await Promise.all([
      Booking.find({ show: show._id, status: "confirmed" }).select("seatIds"),
      SeatHold.find({
        show: show._id,
        status: "active",
        expiresAt: { $gt: new Date() },
      }).select("seatIds user"),
    ]);
    const booked = new Set(bookings.flatMap((b) => b.seatIds)),
      locked = new Set(holds.flatMap((h) => h.seatIds));
    const seats = (show.screen.seatLayout || []).map((row) => ({
      row: row.row,
      seats: row.seats.map((s) => ({
        id: `${row.row}${s.number}`,
        number: s.number,
        type: s.type,
        accessible: s.accessible,
        status: booked.has(`${row.row}${s.number}`)
          ? "booked"
          : locked.has(`${row.row}${s.number}`)
            ? "locked"
            : "available",
      })),
    }));
    res.json({ seats });
  }),
);
router.post(
  "/shows/:id/holds",
  requireAuth,
  wrap(async (req, res) => {
    const b = parse(
      z.object({ seats: z.array(z.string().min(2).max(6)).min(1).max(8) }),
      req.body,
    );
    const hold = await createHold({
      showId: req.params.id,
      userId: req.user._id,
      seatIds: b.seats,
    });
    req.app
      .get("io")
      ?.to(`show:${req.params.id}`)
      .emit("seats:changed", { showId: req.params.id });
    res.status(201).json({
      hold: {
        _id: hold._id,
        seatIds: hold.seatIds,
        expiresAt: hold.expiresAt,
      },
    });
  }),
);
router.delete(
  "/holds/:id",
  requireAuth,
  wrap(async (req, res) => {
    const hold = await SeatHold.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "active" },
      { $set: { status: "released" } },
      { new: true },
    );
    if (!hold)
      return res.status(404).json({ message: "Active hold not found" });
    req.app
      .get("io")
      ?.to(`show:${hold.show}`)
      .emit("seats:changed", { showId: String(hold.show) });
    res.json({ ok: true });
  }),
);
router.post(
  "/bookings",
  requireAuth,
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        showId: z.string(),
        holdId: z.string(),
        seats: z.array(z.string()).min(1).max(8),
      }),
      req.body,
    );
    const booking = await createBooking({
      userId: req.user._id,
      showId: b.showId,
      holdId: b.holdId,
      seatIds: b.seats,
    });
    res.status(201).json({ booking });
  }),
);
router.get(
  "/bookings/my",
  requireAuth,
  wrap(async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ bookings });
  }),
);
router.get(
  "/bookings/:id",
  requireAuth,
  wrap(async (req, res) => {
    const filter =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user._id };
    const booking = await Booking.findOne(filter)
      .populate({
        path: "show",
        populate: [
          { path: "movie", select: "title posterUrl" },
          { path: "screen", select: "name" },
        ],
      })
      .lean();
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    let ticketQr = null;
    if (booking.status === "confirmed" && booking.ticketToken)
      ticketQr = await QRCode.toDataURL(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/api/v1/tickets/verify/${booking.ticketToken}`,
      );
    res.json({ booking, ticketQr });
  }),
);
router.post(
  "/bookings/:id/cancel",
  requireAuth,
  wrap(async (req, res) => {
    const b = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (b.status !== "confirmed")
      return res
        .status(409)
        .json({ message: "Only confirmed bookings can be cancelled" });
    const show = await Show.findById(b.show);
    if (!show || Date.now() > show.startTime.getTime() - 2 * 60 * 60 * 1000)
      return res
        .status(400)
        .json({ message: "This booking is outside the cancellation window" });
    b.status = "refund_pending";
    b.paymentStatus = "refund_pending";
    b.audit.push({
      state: "refund_pending",
      at: new Date(),
      by: String(req.user._id),
      note: "Cancellation requested",
    });
    await b.save();
    res.json({
      booking: b,
      message:
        "Cancellation requested. Refund processing requires a configured payment provider.",
    });
  }),
);
router.post(
  "/payments/orders",
  requireAuth,
  wrap(async (req, res) => {
    const b = parse(z.object({ bookingId: z.string() }), req.body);
    const booking = await Booking.findOne({
      _id: b.bookingId,
      user: req.user._id,
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "pending" && booking.status !== "payment_pending")
      return res.status(409).json({ message: "Booking is not payable" });
    const hold = await SeatHold.findOne({
      _id: booking.hold,
      user: req.user._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    });
    if (!hold) return res.status(409).json({ message: "Seat hold expired" });
    if (
      process.env.PAYMENT_MODE === "razorpay" &&
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET
    ) {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const order = await razorpay.orders.create({
        amount: booking.totalAmount * 100,
        currency: booking.currency,
        receipt: booking.reference,
        notes: { bookingId: String(booking._id) },
      });
      booking.status = "payment_pending";
      await booking.save();
      await Payment.create({
        booking: booking._id,
        user: req.user._id,
        provider: "razorpay",
        providerOrderId: order.id,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: "created",
      });
      return res.json({
        mode: "razorpay",
        keyId: process.env.RAZORPAY_KEY_ID,
        order: { id: order.id, amount: order.amount, currency: order.currency },
      });
    }
    const order = {
      id: `demo_order_${booking._id}`,
      amount: booking.totalAmount * 100,
      currency: booking.currency,
    };
    booking.status = "payment_pending";
    await booking.save();
    await Payment.create({
      booking: booking._id,
      user: req.user._id,
      provider: "demo",
      providerOrderId: order.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      status: "created",
    });
    res.json({
      mode: "demo",
      label: "SIMULATED PAYMENT — NO REAL MONEY IS CHARGED",
      order,
    });
  }),
);
router.post(
  "/payments/verify",
  requireAuth,
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        bookingId: z.string(),
        provider: z.enum(["demo", "razorpay"]),
        success: z.boolean().optional(),
        razorpay_order_id: z.string().optional(),
        razorpay_payment_id: z.string().optional(),
        razorpay_signature: z.string().optional(),
        orderId: z.string().optional(),
      }),
      req.body,
    );

    // Keep demo payment behavior for local development.
    if (b.provider === "demo") {
      if (process.env.PAYMENT_MODE === "razorpay") {
        return res.status(400).json({
          message: "Demo payments are disabled",
        });
      }

      const booking = await confirmDemoPayment({
        bookingId: b.bookingId,
        userId: req.user._id,
        success: b.success !== false,
        orderId: b.orderId,
      });

      req.app
        .get("io")
        ?.to(`show:${booking.show}`)
        .emit("seats:changed", {
          showId: String(booking.show),
        });

      return res.json({ booking });
    }

    // Ensure the required payment information is present.
    if (
      !b.razorpay_order_id ||
      !b.razorpay_payment_id ||
      !b.razorpay_signature ||
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      return res.status(400).json({
        message: "Missing payment verification fields",
      });
    }

    // Verify the signature using the Razorpay secret.
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`)
      .digest("hex");

    const received = b.razorpay_signature;

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(received, "hex"),
      )
    ) {
      return res.status(400).json({
        message: "Payment signature verification failed",
      });
    }

    // Find the payment order created for this user and booking.
    const payment = await Payment.findOne({
      provider: "razorpay",
      providerOrderId: b.razorpay_order_id,
      user: req.user._id,
      booking: b.bookingId,
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment order not found",
      });
    }

    // Retrieve the booking.
    const booking = await Booking.findOne({
      _id: b.bookingId,
      user: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    // Idempotency: don't confirm the same booking twice.
    if (
      booking.status === "confirmed" &&
      payment.status === "captured" &&
      payment.providerPaymentId === b.razorpay_payment_id
    ) {
      return res.json({ booking });
    }

    if (booking.status !== "pending" && booking.status !== "payment_pending") {
      return res.status(409).json({
        message: "Booking is not payable",
      });
    }

    // Ask Razorpay for the actual payment status.
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const rpPayment = await razorpay.payments.fetch(b.razorpay_payment_id);

    // Confirm that the fetched payment belongs to this order.
    if (rpPayment.order_id !== b.razorpay_order_id) {
      return res.status(400).json({
        message: "Payment order does not match",
      });
    }

    // Confirm the amount and currency match the booking.
    if (
      rpPayment.amount !== Math.round(booking.totalAmount * 100) ||
      rpPayment.currency !== booking.currency
    ) {
      return res.status(400).json({
        message: "Payment amount or currency does not match booking",
      });
    }

    // Don't issue a ticket for authorized or failed payments.
    if (rpPayment.status !== "captured") {
      return res.status(409).json({
        message: `Payment is not captured. Current status: ${rpPayment.status}`,
      });
    }

    // Check that the seat hold is still valid.
    const hold = await SeatHold.findOne({
      _id: booking.hold,
      user: req.user._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (!hold) {
      return res.status(409).json({
        message:
          "Seat hold expired. Payment may have succeeded; contact support for recovery.",
      });
    }

    // Ensure these seats have not already been confirmed by another booking.
    const conflicting = await Booking.findOne({
      _id: { $ne: booking._id },
      show: booking.show,
      status: "confirmed",
      seatIds: { $in: booking.seatIds },
    });

    if (conflicting) {
      return res.status(409).json({
        message:
          "Seat conflict detected. Payment may have succeeded; contact support for recovery.",
      });
    }

    // Update the existing payment record.
    payment.providerPaymentId = b.razorpay_payment_id;
    payment.status = "captured";
    payment.verifiedAt = new Date();
    await payment.save();

    // Confirm the booking and generate its ticket token.
    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    booking.ticketToken =
      booking.ticketToken || crypto.randomBytes(24).toString("hex");

    booking.audit.push({
      state: "confirmed",
      at: new Date(),
      by: "system",
      note: "Razorpay payment verified and captured",
    });

    await booking.save();

    // Mark the seat hold as confirmed.
    hold.status = "confirmed";
    await hold.save();

    // Notify clients viewing the same show.
    req.app
      .get("io")
      ?.to(`show:${booking.show}`)
      .emit("seats:changed", {
        showId: String(booking.show),
      });

    return res.json({ booking });
  }),
);
router.get("/users/me", requireAuth, (req, res) =>
  res.json({ user: authPayload(req.user) }),
);
router.patch(
  "/users/me",
  requireAuth,
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(2).max(80).optional(),
        phone: z.string().max(30).optional(),
      }),
      req.body,
    );
    const user = await User.findByIdAndUpdate(req.user._id, b, {
      new: true,
      runValidators: true,
    });
    res.json({ user: authPayload(user) });
  }),
);
router.patch(
  "/users/me/password",
  requireAuth,
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8).max(128),
      }),
      req.body,
    );
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!(await bcrypt.compare(b.currentPassword, user.passwordHash)))
      return res.status(400).json({ message: "Current password is incorrect" });
    user.passwordHash = await bcrypt.hash(b.newPassword, 12);
    await user.save();
    res.json({ ok: true });
  }),
);
router.get(
  "/users/me/watchlist",
  requireAuth,
  wrap(async (req, res) => {
    const user = await User.findById(req.user._id).select("watchlist");
    res.json({ movieIds: user.watchlist.map(String) });
  }),
);
router.post(
  "/users/me/watchlist/:movieId",
  requireAuth,
  wrap(async (req, res) => {
    if (!(await Movie.exists({ _id: req.params.movieId })))
      return res.status(404).json({ message: "Movie not found" });
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { watchlist: req.params.movieId } },
    );
    res.json({ ok: true });
  }),
);
router.delete(
  "/users/me/watchlist/:movieId",
  requireAuth,
  wrap(async (req, res) => {
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { watchlist: req.params.movieId } },
    );
    res.json({ ok: true });
  }),
);
// ADMIN: Create a theater
router.post(
  "/theaters",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(2).max(120),
        address: z.string().trim().min(3).max(250),
        city: z.string().trim().min(2).max(80),
        state: z.string().trim().optional(),
        postalCode: z.string().trim().optional(),
        contact: z.string().trim().optional(),
        facilities: z.array(z.string()).optional(),
      }),
      req.body,
    );

    const theater = await Theater.create(b);

    await AuditLog.create({
      actor: req.user._id,
      action: "theater.create",
      entityType: "Theater",
      entityId: String(theater._id),
    });

    res.status(201).json({ theater });
  }),
);

// ADMIN: Create a screen inside a theater
router.post(
  "/screens",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        theater: z.string(),
        name: z.string().trim().min(1).max(80),
        rows: z.number().int().min(1).max(26),
        seatsPerRow: z.number().int().min(1).max(40),
        formats: z.array(z.string()).optional(),
      }),
      req.body,
    );

    const theater = await Theater.findById(b.theater);

    if (!theater || !theater.active) {
      return res.status(404).json({ message: "Active theater not found" });
    }

    const seatLayout = Array.from({ length: b.rows }, (_, i) => ({
      row: String.fromCharCode(65 + i),
      seats: Array.from({ length: b.seatsPerRow }, (_, j) => ({
        number: j + 1,
        type: "standard",
        accessible: false,
      })),
    }));

    const totalSeats = b.rows * b.seatsPerRow;

    const screen = await Screen.create({
      theater: theater._id,
      name: b.name,
      seatLayout,
      formats: b.formats || ["2D"],
      totalSeats,
    });

    await AuditLog.create({
      actor: req.user._id,
      action: "screen.create",
      entityType: "Screen",
      entityId: String(screen._id),
    });

    res.status(201).json({ screen });
  }),
);

// ADMIN: Create a show
router.post(
  "/shows",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const b = parse(
      z.object({
        movie: z.string(),
        screen: z.string(),
        startTime: z.string().datetime(),
        language: z.string().optional(),
        format: z.string().default("2D"),
        basePrice: z.number().positive(),
      }),
      req.body,
    );

    const [movie, screen] = await Promise.all([
      Movie.findById(b.movie),
      Screen.findById(b.screen),
    ]);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    if (!screen) {
      return res.status(404).json({ message: "Screen not found" });
    }

    const startTime = new Date(b.startTime);
    const endTime = new Date(startTime.getTime() + movie.duration * 60 * 1000);

    if (startTime <= new Date()) {
      return res.status(400).json({
        message: "Show must be scheduled for a future time",
      });
    }

    const conflict = await Show.findOne({
      screen: screen._id,
      status: "scheduled",
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflict) {
      return res.status(409).json({
        message: "This screen already has a show scheduled during that time",
      });
    }

    const show = await Show.create({
      movie: movie._id,
      screen: screen._id,
      startTime,
      endTime,
      language: b.language || movie.language,
      format: b.format,
      basePrice: b.basePrice,
      status: "scheduled",
    });

    await AuditLog.create({
      actor: req.user._id,
      action: "show.create",
      entityType: "Show",
      entityId: String(show._id),
    });

    res.status(201).json({ show });
  }),
);
router.get(
  "/admin/overview",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const [users, movies, theaters, shows, bookings, rev] = await Promise.all([
      User.countDocuments(),
      Movie.countDocuments({ status: { $ne: "archived" } }),
      Theater.countDocuments({ active: true }),
      Show.countDocuments({ status: "scheduled" }),
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);
    res.json({
      users,
      movies,
      theaters,
      shows,
      bookings,
      grossRevenue: rev[0]?.total || 0,
    });
  }),
);
router.get(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const users = await User.find()
      .select("name email role createdAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ users });
  }),
);
router.get(
  "/admin/bookings",
  requireAuth,
  requireRole("admin"),
  wrap(async (req, res) => {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ bookings });
  }),
);
router.get(
  "/tickets/verify/:token",
  wrap(async (req, res) => {
    const booking = await Booking.findOne({
      ticketToken: req.params.token,
      status: "confirmed",
    }).select(
      "reference movieTitle theaterName seatLabels showSnapshot status",
    );
    if (!booking)
      return res.status(404).json({
        valid: false,
        message: "Ticket is invalid or no longer active",
      });
    res.json({
      valid: true,
      ticket: {
        reference: booking.reference,
        movieTitle: booking.movieTitle,
        theaterName: booking.theaterName,
        seats: booking.seatLabels,
        showtime: booking.showSnapshot?.startTime,
        status: booking.status,
      },
    });
  }),
);
router.post("/payments/webhook", async (req, res) => {
  const signature = req.get("x-razorpay-signature");
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !signature)
    return res.status(400).json({ message: "Webhook signature is required" });
  const raw = req.rawBody;
  if (!raw)
    return res.status(400).json({ message: "Raw webhook body is unavailable" });
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(raw)
    .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)))
    return res.status(400).json({ message: "Invalid webhook signature" });
  const eventId =
    req.get("x-razorpay-event-id") ||
    crypto.createHash("sha256").update(raw).digest("hex");
  try {
    const body = JSON.parse(raw.toString());
    await (
      await import("../models/index.js")
    ).WebhookEvent.create({
      provider: "razorpay",
      eventId,
      eventType: body.event,
      status: "received",
    });
  } catch (e) {
    if (e.code === 11000)
      return res.json({ received: true, deduplicated: true });
    throw e;
  }
  return res.json({
    received: true,
    processed: false,
    message:
      "Webhook event recorded for reconciliation; booking state is not changed by unreviewed events.",
  });
});
export default router;
