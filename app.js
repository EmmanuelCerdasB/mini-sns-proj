const express = require("express");
var morgan = require("morgan");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const session = require("express-session");
const chalk = require("chalk");
const path = require("path");
const { error } = require("console");
const e = require("express");

// express setting
app.set("view engine", "ejs"); // EJS setup
app.set("views", path.join(__dirname, "views")); // Set views directory

// COnnect to MongoDB (only when the server starts)
mongoose
  .connect("mongodb://localhost:27017/my_first_db")
  .then(() =>
    console.log(chalk.bgHex("#b2ebf2").black.bold("🌤️  MongoDB Connected🌤️"))
  )
  .catch(console.error);

const Feed = require("./models/feed");
const User = require("./models/user");

// const sampleFeed = new Feed({
//   content: "This is my first SNS feed!!!",
//   author: "TEST_USER",
// });

// sampleFeed
//   .save()
//   .then(() => console.log("✅ Test feed saved"))
//   .then(() => {
//     Feed.find().then((feeds) => {
//       console.log(feeds);
//     });
//   })
//   .catch((err) => console.error("❌ Error:", err));

// Middleware congiguration
app.use(
  session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 5,
    }, // 5 minutes
  })
);

// Body parser middleware register
app.use(express.urlencoded({ extended: true }));

app.use("/css", express.static(path.join(__dirname, "public", "css")));
app.use("/js", express.static(path.join(__dirname, "public", "js")));
app.use(morgan("common"));

app.get("/", (req, res) => {
  res.render("index", { username: req.session.username }); //aqui en vez de index coloco register y ya accedo a la pagina de register.
});

//login routing
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // //Mock authentication logic
  // const mockUsername = "Tom";
  // const mockPassword = "123456";

  // if (username === mockUsername && password === mockPassword) {
  //   req.session.username = username;
  //   res.redirect("/");
  // } else {
  //   res.send("Login failed!");
  // }

  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.send("Invalid username or password!");
    }
    req.session.username = user.username;
    res.redirect("/posts");
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send("Error during login");
  }
});

//logout routing
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out.");
    }
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

app.get("/write", (req, res) => {
  if (req.session.username) {
    //res.send("Write a new post here");
    // res.sendFile(path.join(__dirname, "public", "write.html"));
    res.render("write");
  } else {
    res.redirect("/");
  }
});

app.post("/write", async (req, res) => {
  const { content } = req.body;

  if (!req.session.username) {
    return res.redirect("/");
  }

  const newFeed = new Feed({
    content,
    author: req.session.username,
  });

  //Save the new feed to the database
  //and redirect to the posts page
  await newFeed
    .save()
    .then(() => {
      console.log(chalk.bgHex("#b2ebf2").black.bold("✅ New feed saved"));
      res.redirect("/posts");
    })
    .catch((err) => {
      console.error(chalk.bgRed.white.bold("❌ Error saving feed:", err));
      res.status(500).send("Error saving feed.");
    });
});

app.get("/posts", async (req, res) => {
  if (!req.session.username) {
    return res.redirect("/");
  }

  try {
    // Buscar al usuario logueado
    const user = await User.findOne({ username: req.session.username });

    // Buscar feeds del usuario y sus amigos
    const feeds = await Feed.find({
      author: { $in: [...user.friends, user.username] },
    }).sort({
      createdAt: -1,
    });

    // Añadir campo isLiked a cada feed
    const posts = feeds.map((feed) => ({
      ...feed.toObject(),
      isLiked: feed.likes.includes(req.session.username),
    }));

    res.render("posts", { posts });
  } catch (error) {
    console.error("Error loading posts", error);
    res.status(500).send("Error loading posts");
  }
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { username, password, name } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send("Username already exists!");
    }
    const newUser = new User({ username, password, name });
    await newUser.save();
    res.redirect("/");
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).send("Error during registration");
  }
});

app.get("/friends/list", async (req, res) => {
  if (!req.session.username) {
    return res.redirect("/");
  }
  try {
    const user = await User.findOne({ username: req.session.username });
    res.render("friends", { friends: user.friends, findedfriends: [] });
  } catch (err) {
    console.error("Error fetching friends list:", err);
    res.status(500).send("Error fetching friends list");
  }
});

app.post("/friends/search", async (req, res) => {
  const { friendUsername } = req.body;
  if (!req.session.username) {
    return res.redirect("/");
  }
  try {
    // Search for the logged-in user
    const user = await User.findOne({ username: req.session.username });
    // Search for users whose username includes the search term
    const findedfriends = await User.find({
      $and: [
        // includes search term
        {
          username: { $regex: friendUsername, $options: "i" },
        },
        // exclude already added friends and self.
        {
          username: { $nin: [...user.friends, user.username] },
        },
      ],
    });
    res.render("friends", { friends: user.friends, findedfriends });
  } catch (err) {
    console.error("Error searching for friends:", err);
    res.status(500).send("Error searching for friends");
  }
});

app.post("/friends/add", async (req, res) => {
  const { friendUsername } = req.body;
  if (!req.session.username) {
    return res.redirect("/");
  }
  try {
    const user = await User.findOne({ username: req.session.username });
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) {
      return res.send("User not found!");
    }
    if (user.friends.includes(friend.username)) {
      return res.send("Already friends!");
    }
    user.friends.push(friend.username);
    await user.save();
    res.redirect("/friends/list");
  } catch (err) {
    console.error("Error adding friend:", err);
    res.status(500).send("Error adding friend");
  }
});

app.post("/posts/:uuid/like", async (req, res) => {
  if (!req.session.username) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const feed = await Feed.findOne({ uuid: req.params.uuid }); // Find feed by uuid

    if (!feed) {
      return res.status(404).send("Feed not found");
    }

    const username = req.session.username;

    // Toggle like
    if (feed.likes.includes(username)) {
      // Remove like if already liked
      feed.likes = feed.likes.filter((user) => user !== username);
    } else {
      // Add like if not already liked
      feed.likes.push(username);
    }

    await feed.save();
    res.json({ likesCount: feed.likes.length }); // Return updated likes count
  } catch (err) {
    console.error("Error toggling like:", err);
    res.status(500).send("Error toggling like");
  }
});

app.listen(3000, () => {
  console.log(chalk.bgHex("#9333ff").white.bold(" 🎉EXPRESS SERVER STARTED🎉"));
  console.log(
    chalk.green("Running at: ") + chalk.cyan("http://localhost:3000")
  );
  console.log(chalk.gray("Press Ctrl+C to stop the server."));
});
