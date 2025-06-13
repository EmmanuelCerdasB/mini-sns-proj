const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();

app.use(cookieParser());

app.get("/set", (req, res) => {
  res.cookie("username", "John", { maxAge: 60000 }); // 1 min
  res.send("Cookie set!");
});

app.get("/get", (req, res) => {
  res.send(req.cookies);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
