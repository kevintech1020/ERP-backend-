const rateLimit = require("express-rate-limit");
const compression = require("compression");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const { graphqlHTTP } = require("express-graphql");
const schema = require('./schema/schema');
const multer = require('multer');
const crypto = require("crypto");
const path = require("path");

/* variables */
// express app instance
const app = express();

// holds all the allowed origins for cors access
let allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5000",
  "http://localhost:5001",
];

// limit the number of requests from a single IP address
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  standardHeaders: false, // Disable rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/* Middleware */
// for compressing the response body
app.use(compression());
// helmet: secure express app by setting various HTTP headers. And serve cross origin resources.
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
// morgan: log requests to console in dev environment
app.use(morgan("dev"));
// allows cors access from allowedOrigins array
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        let msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

// generate random file name for extra security on naming
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

// store files upload folder in disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${process.env.UPLOAD_PATH}`);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = generateFileName();
    cb(null, uniqueSuffix + ".jpg");
  },
});
// multer middleware
const upload = multer({ storage: storage }).single("image");

// parse requests of content-type - application/json
app.use(express.json({ extended: true }));


app.get("/uploads/product/:id", (req, res) => {
  console.log("ddddd", __dirname + "\\uploads\\product\\" + req.params.id)
  res.sendFile(__dirname + "\\uploads\\product\\" + req.params.id, (err) => {
    if (err) {
      console.log("error");
      res.status(404).send("Not found");
    }
  });
});

app.post("/product-image", function (req, res) {
  if (!req.is('multipart/form-data')) {
    res.json({ message: "invalid upload" });
  } else {
    upload(req, res, function (err) {
      if (err) {
        res.json({ message: err })
      } else {
        res.json({ imageName: req.file.filename })
      }
    });
  }
});

app.use("/graphql", graphqlHTTP({ schema: schema, graphiql: true }));

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;