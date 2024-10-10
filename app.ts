import "dotenv/config";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import http from "node:http";
import HttpError from "./lib/HttpError";
import path from "node:path";
import indexRouter from "./routes/indexRouter";
import foldersRouter from "./routes/foldersRouter";
import filesRouter from "./routes/filesRouter";
import sharesRouter from "./routes/sharesRouter";
import mySharesRouter from "./routes/mySharesRouter";
import accountRouter from "./routes/accountRouter";
import session from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import bcrypt from "bcryptjs";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import db from "./db/db";
import logger from "morgan";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import cron from "node-cron";

const app = express();
const PORT = parseInt(process.env.PORT || "3000");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("port", PORT);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
  app.use(logger("tiny"));
  app.use(helmet());
  app.use(compression());
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    legacyHeaders: false,
  });
  app.use(limiter);
} else {
  app.use(logger("dev"));
}
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: "lax",
    },
    store: new PrismaSessionStore(db, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdFunction: undefined,
      dbRecordIdIsSessionId: true,
    }),
  }),
);

passport.use(
  new LocalStrategy.Strategy(async (username, password, done) => {
    try {
      const user = await db.user.findUnique({
        where: {
          email: username,
        },
      });

      if (!user) {
        return done(null, false, { message: "Incorrect username or password" });
      }
      const passwordsMatch = await bcrypt.compare(password, user.password);

      if (!passwordsMatch) {
        return done(null, false, { message: "Incorrect username or password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);
passport.serializeUser((user, done) => {
  //@ts-ignore
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.user.findUnique({
      where: { id: id as string | undefined },
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
});
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

app.use("/", indexRouter);
app.use("/account", accountRouter);
app.use("/folders", foldersRouter);
app.use("/files", filesRouter);
app.use("/shares", sharesRouter);
app.use("/my-shares", mySharesRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const error = new HttpError("Page does not exist.", 404);
  next(error);
});

// error handler
app.use(function (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // set locals, only providing error in development
  res.locals.title = "Error has occured";
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500).render("error");
});

const server = http.createServer(app);

server.listen(PORT);
server.on("error", onError);
server.on("listening", onListening);
async function onError(error: Error & { syscall?: string; code?: string }) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof PORT === "string" ? "Pipe " + PORT : "Port " + PORT;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      await db.$disconnect();
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      await db.$disconnect();
      process.exit(1);
      break;
    default:
      await db.$disconnect();
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr?.port;
  console.log("Listening on " + bind);
}

// cron jobs

const cleanOutShares = cron.schedule("*/1 * * * *", async () => {
  console.log("cleaning out old shares..");
  await db.share.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(Date.now()),
      },
    },
  });
});
cleanOutShares.start();

//graceful shutdowns
process.on("SIGHUP", async () => {
  await db.$disconnect();
  cleanOutShares.stop();
  server.close((err) => {
    console.log(err);
  });
  process.exit(1);
});

process.on("SIGINT", async () => {
  await db.$disconnect();
  cleanOutShares.stop();
  server.close((err) => {
    console.log(err);
  });
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await db.$disconnect();
  cleanOutShares.stop();
  server.close((err) => {
    console.log(err);
  });
  process.exit(1);
});

process.on("exit", async () => {
  await db.$disconnect();
  cleanOutShares.stop();
  server.close((err) => {
    console.log(err);
  });
  process.exit(0);
});
