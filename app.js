//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const app = express();

// CLIENT_ID=197506817647-rk8jca7kg2i9tc90464n79hkaf1tapak.apps.googleusercontent.com
// CLIENT_SECRET=z8MFgjWIds2CcFwljXgS9M-W


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: 'whatever you want',
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.initialize());
app.use(passport.session());

var dbURL = "mongodb+srv://prueba:prueba@cluster0.hysjb.mongodb.net/prove2";
// var dbURL = "mongodb://localhost:27017/userDB"

mongoose.connect(dbURL, { useUnifiedTopology: true, useNewUrlParser: true});

// mongoose.set("useCreateIndex", true);
// mongoose.set('useNewUrlParser', true);
// mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());
//
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// callbackURL: "http://localhost:3000/auth/google/secrets"

passport.use(new GoogleStrategy({
    clientID: "197506817647-rk8jca7kg2i9tc90464n79hkaf1tapak.apps.googleusercontent.com",
    clientSecret: "z8MFgjWIds2CcFwljXgS9M-W",
    callbackURL: "https://metric-sorry-98327.herokuapp.com/auth/google/secrets",
    // userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      // console.log(user);
      return cb(err, user);
    });
  }
));

// CLIENT_ID_FB=829895580991269
// CLIENT_SECRET_FB=41f3674261ef4dfab27ea5378014e2dd

passport.use(new FacebookStrategy({
    clientID: "829895580991269",
    clientSecret: "41f3674261ef4dfab27ea5378014e2dd",
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'], prompt: 'select_account' })
);

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook', { authType: 'reauthenticate' })
);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  //We're no loger gonna use the authentication here instead it'll be in submit route
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers){
        console.log(foundUsers, typeof(foundUsers));
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  })
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
})

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  // console.log(req, req.user.id, typeof(req.user.id));
  User.findById(req.user.id, function(err, foundUser){
    if (err){
      console.log(err);
    } else {
      if (foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  })
})

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      })
    }
  })
})


app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return (
        res.redirect('/secrets')
      );
    });
  })(req, res, next);
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){
  console.log("Server running on port 3000");
});
