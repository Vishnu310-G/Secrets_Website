//jshint esversion:6

const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false

}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);


const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);


const Users = mongoose.model("User", userSchema);

passport.use(Users.createStrategy());
passport.serializeUser(Users.serializeUser());
passport.deserializeUser(Users.deserializeUser());




app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});


app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    Users.find({secret:{$ne:null}},function(err,foundUsers){
      if(err){
        console.log(err);
      }else{
        if(foundUsers){
          res.render("secrets",{usersWithSecret:foundUsers});
        }
      }
    })
  } else {
    res.redirect("/login");
  }
});


app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});


app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;

  Users.findById(req.user.id, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function() {
          res.redirect("/secrets");
        })
      }
    }
  })

});

app.post("/register", function(req, res) {

  Users.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      })
    }

  })

});


app.post("/login", function(req, res) {
  const userName = req.body.username;
  const password = req.body.password;

  const user = new Users({
    username: userName,
    password: password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err)
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  })


});



app.listen(3000, function(req, res) {
  console.log("Server listening on port 3000");
})
