import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["user", "admin", "theater_manager"],
      default: "user",
    },
    phone: { type: String, default: "" },
    watchlist: [{ type: Schema.Types.ObjectId, ref: "Movie" }],
    termsAcceptedAt: Date,
  },
  { timestamps: true },
);
const movieSchema = new Schema(
  {
    title: { type: String, required: true, index: true },
    slug: { type: String, unique: true, sparse: true },
    description: String,
    synopsis: String,
    posterUrl: String,
    backdropUrl: String,
    trailerUrl: String,
    genre: [String],
    language: { type: String, default: "English" },
    duration: { type: Number, default: 120 },
    releaseDate: Date,
    ageRating: String,
    cast: [String],
    crew: [String],
    rating: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["now_showing", "coming_soon", "archived"],
      default: "now_showing",
      index: true,
    },
    popularity: { type: Number, default: 0 },
  },
  { timestamps: true },
);
movieSchema.index(
  { title: "text", description: "text", genre: "text" },
  {
    default_language: "english",
    language_override: "textIndexLanguage",
  }
);
const theaterSchema = new Schema(
  {
    name: { type: String, required: true },
    address: String,
    city: { type: String, required: true, index: true },
    state: String,
    postalCode: String,
    contact: String,
    facilities: [String],
    timezone: { type: String, default: "Asia/Kolkata" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const screenSchema = new Schema(
  {
    theater: {
      type: Schema.Types.ObjectId,
      ref: "Theater",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    seatLayout: [
      {
        row: String,
        seats: [
          {
            number: Number,
            type: {
              type: String,
              enum: ["standard", "premium", "recliner"],
              default: "standard",
            },
            accessible: { type: Boolean, default: false },
          },
        ],
      },
    ],
    formats: [String],
    totalSeats: Number,
  },
  { timestamps: true },
);
const showSchema = new Schema(
  {
    movie: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
      index: true,
    },
    screen: {
      type: Schema.Types.ObjectId,
      ref: "Screen",
      required: true,
      index: true,
    },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    language: String,
    format: { type: String, default: "2D" },
    basePrice: { type: Number, required: true, min: 0 },
    categoryPrices: { type: Map, of: Number, default: {} },
    bookingCutoffMinutes: { type: Number, default: 15 },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
      index: true,
    },
  },
  { timestamps: true },
);
showSchema.index({ screen: 1, startTime: 1, endTime: 1 });
const holdSchema = new Schema(
  {
    show: {
      type: Schema.Types.ObjectId,
      ref: "Show",
      required: true,
      index: true,
    },
    seatIds: { type: [String], required: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "confirmed", "released", "expired"],
      default: "active",
      index: true,
    },
    booking: { type: Schema.Types.ObjectId, ref: "Booking" },
  },
  { timestamps: true },
);
holdSchema.index({ expiresAt: 1, status: 1 });
const bookingSchema = new Schema(
  {
    reference: { type: String, unique: true, index: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    show: {
      type: Schema.Types.ObjectId,
      ref: "Show",
      required: true,
      index: true,
    },
    hold: { type: Schema.Types.ObjectId, ref: "SeatHold" },
    seatIds: [String],
    seatLabels: [String],
    movieTitle: String,
    theaterName: String,
    showSnapshot: {
      startTime: Date,
      screenName: String,
      language: String,
      format: String,
    },
    subtotal: { type: Number, required: true },
    fees: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: [
        "pending",
        "payment_pending",
        "confirmed",
        "cancelled",
        "expired",
        "refund_pending",
        "refunded",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refund_pending",
        "refunded",
      ],
      default: "unpaid",
    },
    ticketToken: String,
    audit: [{ state: String, at: Date, by: String, note: String }],
  },
  { timestamps: true },
);
bookingSchema.index({ show: 1, seatIds: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
const paymentSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: {
      type: String,
      enum: ["demo", "razorpay", "stripe"],
      required: true,
    },
    providerOrderId: { type: String, index: true, sparse: true },
    providerPaymentId: { type: String, index: true, sparse: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refund_pending",
        "refunded",
      ],
      default: "created",
      index: true,
    },
    verifiedAt: Date,
    rawReference: String,
  },
  { timestamps: true },
);
const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    type: String,
    title: String,
    message: String,
    readAt: Date,
  },
  { timestamps: true },
);
const auditSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    action: String,
    entityType: String,
    entityId: String,
    metadata: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true },
);
const webhookSchema = new Schema(
  {
    provider: String,
    eventId: { type: String, required: true, unique: true },
    eventType: String,
    processedAt: Date,
    status: { type: String, default: "received" },
  },
  { timestamps: true },
);
export const User = models.User || model("User", userSchema);
export const Movie = models.Movie || model("Movie", movieSchema);
export const Theater = models.Theater || model("Theater", theaterSchema);
export const Screen = models.Screen || model("Screen", screenSchema);
export const Show = models.Show || model("Show", showSchema);
export const SeatHold = models.SeatHold || model("SeatHold", holdSchema);
export const Booking = models.Booking || model("Booking", bookingSchema);
export const Payment = models.Payment || model("Payment", paymentSchema);
export const Notification =
  models.Notification || model("Notification", notificationSchema);
export const AuditLog = models.AuditLog || model("AuditLog", auditSchema);
export const WebhookEvent =
  models.WebhookEvent || model("WebhookEvent", webhookSchema);
