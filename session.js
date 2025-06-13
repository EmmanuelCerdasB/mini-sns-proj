const express = require("express");
const app = express();
const session = require("express-session");
app.use(
  session({
    secret: "myserverPassword@@#",
    resave: false,
    saveUninitialized: true,
  })
);
app.get("/login", (req, res) => {
  req.session.username = "John";
  res.send("Login success! Session saved.");
});
app.get("/profile", (req, res) => {
  if (req.session.username) {
    res.send(`Hola ${req.session.username}-${req.sessionID}`);
  } else {
    res.send("Please login first");
  }
});
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out.");
    }
    res.clearCookie("connect.sid");
    res.send("Loogged out successfully");
  });
});
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
