import crypto from "node:crypto";
import {
  Booking,
  SeatHold,
  Show,
  Screen,
  Theater,
  Movie,
  Payment,
} from "../models/index.js";
export async function expireHolds() {
  const now = new Date();
  const expired = await SeatHold.find({
    status: "active",
    expiresAt: { $lte: now },
  }).select("_id");
  if (expired.length)
    await SeatHold.updateMany(
      {
        _id: { $in: expired.map((x) => x._id) },
        status: "active",
        expiresAt: { $lte: now },
      },
      { $set: { status: "expired" } },
    );
  await Booking.updateMany(
    {
      status: { $in: ["pending", "payment_pending"] },
      hold: { $in: expired.map((x) => x._id) },
    },
    {
      $set: { status: "expired" },
      $push: {
        audit: {
          state: "expired",
          at: now,
          by: "system",
          note: "Seat hold expired",
        },
      },
    },
  );
  return expired.length;
}
export async function createHold({ showId, userId, seatIds }) {
  if (
    !Array.isArray(seatIds) ||
    seatIds.length < 1 ||
    seatIds.length > 8 ||
    new Set(seatIds).size !== seatIds.length
  )
    throw Object.assign(new Error("Choose between 1 and 8 unique seats"), {
      status: 400,
    });
  await expireHolds();
  const show = await Show.findById(showId).populate("screen");
  if (!show || show.status !== "scheduled")
    throw Object.assign(new Error("Show is not available"), { status: 404 });
  const cutoff =
    show.startTime.getTime() - (show.bookingCutoffMinutes ?? 15) * 60000;
  if (Date.now() >= cutoff)
    throw Object.assign(new Error("Booking has closed for this show"), {
      status: 400,
    });
  const valid = new Set(
    (show.screen?.seatLayout || []).flatMap((r) =>
      r.seats.map((s) => `${r.row}${s.number}`),
    ),
  );
  if (seatIds.some((s) => !valid.has(s)))
    throw Object.assign(
      new Error("One or more seats are not part of this screen"),
      { status: 400 },
    );
  const booked = await Booking.find({
    show: showId,
    status: { $in: ["confirmed", "payment_pending", "pending"] },
    seatIds: { $in: seatIds },
  }).select("seatIds hold");
  const blocked = new Set(booked.flatMap((b) => b.seatIds));
  const holds = await SeatHold.find({
    show: showId,
    status: "active",
    expiresAt: { $gt: new Date() },
    seatIds: { $in: seatIds },
  }).select("seatIds user");
  for (const h of holds)
    if (String(h.user) !== String(userId))
      h.seatIds.forEach((s) => blocked.add(s));
  if (seatIds.some((s) => blocked.has(s)))
    throw Object.assign(
      new Error("One or more selected seats are no longer available"),
      { status: 409 },
    );
  const hold = await SeatHold.create({
    show: showId,
    seatIds,
    user: userId,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    status: "active",
  });
  return hold;
}
export async function createBooking({ userId, showId, holdId, seatIds }) {
  const hold = await SeatHold.findOne({
    _id: holdId,
    show: showId,
    user: userId,
    status: "active",
    expiresAt: { $gt: new Date() },
  });
  if (
    !hold ||
    seatIds.some((s) => !hold.seatIds.includes(s)) ||
    seatIds.length !== hold.seatIds.length
  )
    throw Object.assign(
      new Error("Seat hold expired or does not match the booking"),
      { status: 409 },
    );
  const show = await Show.findById(showId).populate("movie screen");
  if (!show) throw Object.assign(new Error("Show not found"), { status: 404 });
  const screen = show.screen;
  const seats = (screen.seatLayout || [])
    .flatMap((r) =>
      r.seats.map((s) => ({ ...s, row: r.row, id: `${r.row}${s.number}` })),
    )
    .filter((s) => seatIds.includes(s.id));
  if (seats.length !== seatIds.length)
    throw Object.assign(new Error("Invalid seats"), { status: 400 });
  const subtotal = seats.reduce(
    (sum, s) => sum + (show.categoryPrices?.get?.(s.type) || show.basePrice),
    0,
  );
  const fees = Math.round(subtotal * 0.025);
  const taxes = Math.round((subtotal + fees) * 0.18);
  const theater = await Theater.findById(screen.theater);
  const labels = seats.map((s) => s.id);
  const booking = await Booking.create({
    reference: `IM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    user: userId,
    show: showId,
    hold: hold._id,
    seatIds: labels,
    seatLabels: labels,
    movieTitle: show.movie?.title || "Movie",
    theaterName: theater?.name || "Cinema",
    showSnapshot: {
      startTime: show.startTime,
      screenName: screen.name,
      language: show.language,
      format: show.format,
    },
    subtotal,
    fees,
    taxes,
    totalAmount: subtotal + fees + taxes,
    currency: "INR",
    status: "pending",
    paymentStatus: "unpaid",
    audit: [
      {
        state: "pending",
        at: new Date(),
        by: String(userId),
        note: "Booking created",
      },
    ],
  });
  hold.booking = booking._id;
  await hold.save();
  return booking;
}
export async function confirmDemoPayment({
  bookingId,
  userId,
  success = true,
  orderId,
}) {
  const booking = await Booking.findOne({ _id: bookingId, user: userId });
  if (!booking)
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  if (booking.status === "confirmed") return booking;
  if (booking.status !== "pending" && booking.status !== "payment_pending")
    throw Object.assign(new Error("Booking is not payable"), { status: 409 });
  const hold = await SeatHold.findOne({
    _id: booking.hold,
    user: userId,
    status: "active",
    expiresAt: { $gt: new Date() },
  });
  if (!hold)
    throw Object.assign(
      new Error("Seat hold expired; payment cannot confirm these seats"),
      { status: 409 },
    );
  if (!success) {
    booking.status = "failed";
    booking.paymentStatus = "failed";
    booking.audit.push({
      state: "failed",
      at: new Date(),
      by: "system",
      note: "Demo payment failed",
    });
    await booking.save();
    hold.status = "released";
    await hold.save();
    return booking;
  }
  const conflicting = await Booking.findOne({
    _id: { $ne: booking._id },
    show: booking.show,
    status: "confirmed",
    seatIds: { $in: booking.seatIds },
  });
  if (conflicting)
    throw Object.assign(
      new Error(
        "A seat conflict was detected; contact support for payment recovery",
      ),
      { status: 409 },
    );
  const payment = await Payment.create({
    booking: booking._id,
    user: userId,
    provider: "demo",
    providerOrderId: orderId || `demo_${booking._id}`,
    providerPaymentId: `demo_pay_${crypto.randomBytes(5).toString("hex")}`,
    amount: booking.totalAmount,
    currency: booking.currency,
    status: "captured",
    verifiedAt: new Date(),
  });
  booking.status = "confirmed";
  booking.paymentStatus = "paid";
  booking.ticketToken = crypto.randomBytes(24).toString("hex");
  booking.audit.push({
    state: "confirmed",
    at: new Date(),
    by: "system",
    note: "Demo payment confirmed",
  });
  await booking.save();
  hold.status = "confirmed";
  await hold.save();
  return booking;
}
