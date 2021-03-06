/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */
// Requiring our models and passport as we've configured it
var db = require("../models");
var passport = require("../config/passport");
var aws = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const upload = multer({});

const Op = db.sequelize.Op;
const S3_BUCKET = process.env.S3_BUCKET;
aws.config.region = "us-west-2";

module.exports = function(app) {
  // Using the passport.authenticate middleware with our local strategy.
  // If the user has valid login credentials, send them to the members page.
  // Otherwise the user will be sent an error
  app.post("/api/login", passport.authenticate("local"), function(req, res) {
    // Sending back a password, even a hashed password, isn't a good idea
    res.json({
      email: req.user.email,
      id: req.user.id
    });
  });

  // Route for signing up a user. The user's password is automatically hashed and stored securely thanks to
  // how we configured our Sequelize User Model. If the user is created successfully, proceed to log the user in,
  // otherwise send back an error
  app.post("/api/signup", function(req, res) {
    db.User.create({
      email: req.body.email,
      password: req.body.password,
      name: req.body.name
    })
      .then(function() {
        res.redirect(307, "/api/login");
      })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  });

  // Route for logging user out
  app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
  });

  // Route for getting some data about our user to be used client side
  app.get("/api/user_data", (req, res) => {
    if (!req.user) {
      // The user is not logged in, send back an empty object
      res.json({});
    } else {
      // Otherwise send back the user's email and id
      // Sending back a password, even a hashed password, isn't a good idea
      res.json({
        user: { id: req.user.id, name: req.user.name }
      });
    }
  }); //end of user_data
  app.post("/api/user", function(res, req) {
    db.User.create({
      name: req.body.name,
      address: req.body.address
    }).then(function(result) {
      res.json(result);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });

  });
  app.get("/api/user", function(res) {
    db.User.findAll({}).then(function(result) {
      res.json(result);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  });
  app.delete("/api/user/:id", function(res) {
    db.User.destroy({
      where: {
        id: req.params.id
      }
    }).then(function(result) {
      res.json(result);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  });
  app.get("/api/user/:id", function(req, res) {
    db.User.findOne({
      where: {
        id: req.params.id
      }
    }).then(function(result) {
      res.json(result);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  });

  app.get("/api/user/user-events/:id", (req, res) => {
    db.EventDayTimePark.findAll({
      where: {
        UserId: req.params.id
      },
      include: [
        {
          model: db.Park,
          required: true,
          attributes: ["name"]
        }
      ]
    }).then(response => {
      res.json(response);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  });
  app.get("/api/event/user-events/:id", (req, res) => {
    db.EventDayTimePark.findAll({
      attributes: [["date", "start"]],
      group: ["date"]
    }).then(response => {
      res.json(response);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  }); //end of currentevents

  // **** dog api routes *****
  app.get("/api/dog/:id", (req, res) => {
    db.Dog.findAll({
      where: {
        UserID: req.params.id
      },
      include: [
        {
          model: db.User,
          required: true,
          attributes: ["name"]
        }
      ]
    })
      .then(dogs => {
        res.json(dogs);
      })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  }); //end of get all dogs by user id
  app.post("/api/dog", (request, response) => {
    db.Dog.create(request.body).then(dog => {
      response.json(dog);
    });
  }); //end of create new dog
  app.delete("/api/dog/:id", (request, response) => {
    db.Dog.destroy({
      where: {
        id: request.params.id
      }
    }).then(dog => {
      response.json(dog);
    })
      .catch(function(err) {
        console.log(err);
        response.status(401).json(err);
      });
  }); //end of dog delete

  //      Event API Routes

  app.get("/api/event/date", (request, response) => {
    const options = {
      attributes: [
        [db.sequelize.fn("DISTINCT", db.sequelize.col("date")), "date"]
      ]
    };

    // This allows getting event dates for a month by specifying it like `/api/event/date?month=2019-03`.
    if (request.query.month) {
      const startDate = new Date(request.query.month + "-01T00:00:00");
      const endDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        1
      );

      options.where = {
        date: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      };
    }

    db.Event.findAll(options).then(events => {
      response.json(events);
    })
      .catch(function(err) {
        console.log(err);
        response.status(401).json(err);
      });
  }); // end of get event dates

  app.get("/api/event/current/:date", (req, res) => {
    db.EventDayTimePark.findAll({
      where: {
        date: req.params.date
      },
      include: [
        {
          model: db.User,
          required: true,
          attributes: ["id"]
        }
      ]
    }).then(response => {
      res.json(response);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  }); //end of current events on this date

  app.get("/api/events", (req, res) => {
    db.EventDayTimePark.findAll({
      attributes: [["date", "start"]],
      group: ["date"]
    }).then(response => {
      res.json(response);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  }); //end of currentevents

  app.get("/api/user/user-events/:id", (req, res) => {
    db.EventDayTimePark.findAll({
      where: {
        UserId: req.params.id
      },
      include: [
        {
          model: db.Park,
          required: true,
          attributes: ["name"]
        }
      ]
    }).then(response => {
      res.json(response);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  });
  app.get("/api/event/user-events/:id", (req, res) => {
    db.EventDayTimePark.findAll({
      attributes: [["date", "start"]],
      group: ["date"]
    }).then(response => {
      res.json(response);
    });
  }); //end of currentevents

  app.post("/api/event/attend", (req, res) => {
    console.log(req.body);
    db.EventDayTimePark.create({
      date: req.body.date,
      time: req.body.time,
      parkId: req.body.parkId,
      UserId: req.body.userId
    }).then(attendee => {
      console.log(attendee.dataValues);
      res.json(attendee);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
    //end of dbEventDayTimePark create
  });

  app.delete("/api/event/attend", (req, res) => {
    console.log("reqbody: ", req.body);
    db.EventDayTimePark.destroy({
      where: {
        date: req.body.date,
        time: req.body.time,
        parkId: req.body.parkId,
        UserId: req.body.userId
      }
    }).then(destroyed => {
      res.json(destroyed);
      console.log(destroyed);
    })
      .catch(function(err) {
        console.log(err);
        res.status(401).json(err);
      });
  });

  //uploading image for user and for dog(s)
  app.patch(
    "/api/dog/:id/profile-image",
    upload.single("file"),
    (request, response) => {
      const fileName = generateFileName(request.file.originalname);

      const s3 = new aws.S3();
      const s3Params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        ContentType: request.file.mimetype,
        ACL: "public-read",
        Body: request.file.buffer
      };

      s3.putObject(s3Params, (error, data) => {
        if (error) {
          console.error(error);
          return response.status(500).end();
        }

        const url = `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`;

        db.Dog.update(
          {
            profileImage: url
          },
          {
            where: {
              id: request.params.id
            }
          }
        )
          .then(affectedRows => {
            if (affectedRows[0] !== 1) {
              return response.status(500).end();
            }

            const returnData = {
              profileImage: url
            };

            response.write(returnData);
            response.end();
          })
          .catch(reason => {
            console.error(reason);
            response.status(500).end();
          });
      });
    }
  ); //end of update dog profile image

  //update user's public name
  app.put("/api/user/name/:id", (req, res) => {
    db.User.update(
      {
        name: req.body.name
      },
      {
        where: {
          id: req.params.id
        }
      }
    ).then(name => {
      res.json(name);
    });
  });
};
//functions
function generateFileName(originalName) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  let id = "";
  for (let i = 0; i < 21; i++) {
    const index = Math.floor(64 * Math.random());
    id += alphabet[index];
  }

  return id + path.extname(originalName);
}