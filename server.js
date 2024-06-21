const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const logger = require("./logger");
const { connectToDo, getDb } = require("./config/database");
const { ObjectId } = require("mongodb");
const upload = require("./middleware/upload");
const sendEmail = require("./utils/emailVerification");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
debugger;
const urlfront= "https://conciliation-complain.vercel.app/resetPassword"
//*   Middleware
app.use(helmet());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(
  cors({
    origin: "https://conciliation-complain.vercel.app",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

/* GET TIME  */
const time = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const formattedDate = `${year}-${month}-${day}`;
  const formattedTime = `${hours}:${minutes}:${seconds}`;
  const dateTime = `${formattedDate} ${formattedTime}`;
  return dateTime;
};

//* Database Connection
let db;
connectToDo((err) => {
  if (!err) {
    db = getDb();
    logger.info("Database connected successfully");
  } else {
    logger.error("Error connecting to database:", err);
  }
});

app.get("/", cors(), (req, res) => {});

///?  <<-------   NOTE:  API FOR AUTHORIZATION   ------>>

//* register user
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password, role, activeSession } = req.body;
  const createdOn = time();
  console.log(createdOn);

  try {
    // Check if username or email already exists
    const existingUser = await db.collection("users").findOne({ username });
    const existingEmail = await db.collection("users").findOne({ email });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Username already taken. Try another username." });
    }

    if (existingEmail) {
      return res
        .status(409)
        .json({ message: "Email already taken. Try another email." });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPwd = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    const newUser = {
      username,
      email,
      password: hashedPwd,
      role,
      activeSession,
      createdOn,
    };
    const result = await db.collection("users").insertOne(newUser);

    res.status(201).json({ message: "User registered successfully", result });
  } catch (err) {
    console.error("Error during signup:", err);
    res
      .status(500)
      .json({ message: "Error during signup. Please try again later." });
  }
});

//* login
app.post("/api/auth/login", async (req, res) => {
  const { username, password, role } = req.body;
  console.log({ username, role });
  console.log(req.body.username);
  const userName = username.toLowerCase();
  // console.log(${userName} :-lowercase)

  try {
    // Validate input
    if (!userName || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    } else {
      // Define user variable
      let user;

      // Role-based user retrieval
      switch (role) {
        case "user":
          user = await db.collection("users").findOne({ username });
          console.log(user);
          console.log("User login attempt:- switch case");
          break;
        case "technician":
          user = await db.collection("technician").findOne({ username });
          console.log("Technician login attempt");
          break;
        case "admin":
          user = await db.collection("admin").findOne({ username });
          console.log("Admin login attempt");
          break;
        default:
          return res.status(400).json({ error: "Invalid role" });
      }

      // Check if user exists
      if (!user || user === null) {
        console.log(user);
        return res.status(404).json({ error: "User not found" });
      } else {
        console.log("correct user !!");
        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          console.log("wrong  in !!");
          res.status(400).json({ error: "Invalid password" });
        } else {
          const lastLoggedIn = time();
          if (!user.activeSession) {
            switch (role) {
              case "user":
                user = await db.collection("users").updateOne(
                  { username },
                  {
                    $set: { activeSession: true, lastLoggedIn: lastLoggedIn },
                  }
                );
                break;
              case "technician":
                user = await db.collection("technician").updateOne(
                  { username },
                  {
                    $set: { activeSession: true, lastLoggedIn: lastLoggedIn },
                  }
                );
                break;
              case "admin":
                user = await db.collection("admin").updateOne(
                  { username },
                  {
                    $set: { activeSession: true, lastLoggedIn: lastLoggedIn },
                  }
                );
                break;
              default:
                return res.status(400).json({ error: "Invalid role" });
            }
            // Successful login
            console.log("Data Matched");
            res.status(200).json({
              message: "User logged in successfully",
              role,
            });
          } else {
            console.log("logged in !!");
            console.log(user.activeSession);
            res.status(400).json({ error: "User already active" });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ error: "Error logging in" });
  }
});

//*LOG OUT

app.post("/api/auth/logout", async (req, res) => {
  const { username, role } = req.body;
  console.log({ username, role });
  console.log(req.body.username);
  console.log(req.body);
  try {
    // Validate input
    if (!username || !role) {
      return res.status(400).json({ error: "All fields are required" });
    } else {
      // Define user variable
      let user;
      // Role-based user retrieval
      switch (role) {
        case "user":
          user = await db.collection("users").findOne({ username });
          console.log(user);
          console.log("User loging out attempt:- switch case");
          break;
        case "technician":
          user = await db.collection("technician").findOne({ username });
          console.log("Technician loging out attempt");
          break;
        case "admin":
          user = await db.collection("admin").findOne({ username });
          console.log("Admin loging out attempt");
          break;
        default:
          return res.status(400).json({ error: "Invalid role" });
      }
      // Check if user exists
      if (!user || user === null) {
        console.log(user);
        return res.status(404).json({ error: "User not found" });
      } else {
        const loggedOutAt = time();
        switch (role) {
          case "user":
            user = await db
              .collection("users")
              .updateOne(
                { username },
                { $set: { activeSession: false, loggedOutAt: loggedOutAt } }
              );
            console.log(user);
            break;
          case "technician":
            user = await db
              .collection("technician")
              .updateOne(
                { username },
                { $set: { activeSession: false, loggedOutAt: loggedOutAt } }
              );
            console.log(user);
            break;
          case "admin":
            user = await db
              .collection("admin")
              .updateOne(
                { username },
                { $set: { activeSession: false, loggedOutAt: loggedOutAt } }
              );
            console.log(user);
            break;
          default:
            return res.status(400).json({ error: "Invalid role" });
        }
        // Successful logged out
        console.log("User logged out successfully");
        res.status(200).json({ message: "User logged out successfully" });
        console.log("logged out !!");
      }
    }
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ error: "Error logging out" });
  }
});

//?                            <<<<<<<<<<< PASSWORD MANAGER >>>>>>>>>>>>>>>>>>>

//*! ----------------- RESET PASSWORD LINK -----------------

app.post("/api/auth/password/reset/request", async (req, res) => {
  const { email, role } = req.body;
  const lastLinkRequestedAt = time();
  try {
    const db = getDb();
    let user;
    let collectionName;

    // Determine the correct collection based on the role
    switch (role) {
      case "user":
        collectionName = "users";
        break;
      case "technician":
        collectionName = "technician";
        break;
      case "admin":
        collectionName = "admin";
        break;
      default:
        return res.status(400).json({ error: "Invalid role" });
    }

    // Find the user in the correct collection
    user = await db.collection(collectionName).findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 2 * 60 * 1000; // 2 min expiry
    await db.collection(collectionName).updateOne(
      { email },
      {
        $set: {
          resetToken: token,
          resetTokenExpiry: expiry,
          lastLinkRequestedAt: lastLinkRequestedAt,
        },
      }
    );
    const resetLink = `https://conciliation-complain.vercel.app/resetPassword?token=${token}&role=${role}`;
    console.log(resetLink);
    const emailResponse = await sendEmail(
      email,
      "Password Reset Link",
      `${resetLink}`
    );

    res.status(200).json({ message: emailResponse.message });
  } catch (err) {
    console.error("Error requesting password reset:", err);
    res.status(500).json({ error: "Error requesting password reset" });
  }
});

//*!  ----------------- Reset  password   -----------------

app.post("/api/auth/password/reset-password", async (req, res) => {
  const { password, role, token } = req.body;
  const lastPasswordChangedAt = time();
  try {
    let user;
    let collectionName;

    // Determine the correct collection based on the role
    switch (role) {
      case "user":
        collectionName = "users";
        break;
      case "technician":
        collectionName = "technician";
        break;
      case "admin":
        collectionName = "admin";
        break;
      default:
        return res.status(400).json({ error: "Invalid role" });
    }

    // Finding the user with the reset token and valid expiry time in the correct collection
    user = await db.collection(collectionName).findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection(collectionName).updateOne(
      { resetToken: token },
      {
        $set: {
          password: hashedPassword,
          lastPasswordChangedAt: lastPasswordChangedAt,
        },
        $unset: { resetToken: "", resetTokenExpiry: "" },
      }
    );

    res.status(200).json({ message: "Password has been reset" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ error: "Error resetting password" });
  }
});

//?                            <<<<<<<<<<< PASSWORD MANAGER ends here>>>>>>>>>>>>>>>>>>>

///!  <<-------   NOTE:  API FOR COMPLAINTS   ------>>

//todo <---- API to  raise a new  complaints  ----->

app.post(
  "/api/user/complaints/new",
  upload.single("file"),
  async (req, res) => {
    const {
      complaint_id,
      title,
      details,
      status,
      technicianId,
      complaintDate,
    } = req.body;
    const newComplain = {
      complaint_id,
      title,
      details,
      status,
      technicianAssigned: false,
      technicianId,
      verified: false,
      complaintClosed: false,
      complaintDate,
    };
    const msg = { msg: "Complaint raised Successfully" };
    try {
      const complaints = await db
        .collection("complaints")
        .insertOne(newComplain);

      //todo  <----- Changing file name according to id ----->
      const currentFilePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname);
      // Getting the inserted document ID and creating the new file name to rename according to each complain
      const insertId = complaints.insertedId.toString();
      console.log(insertId);
      const newFileName = `${insertId}${fileExtension}`;
      const newFilePath = path.join(path.dirname(currentFilePath), newFileName);
      // Rename the file
      fs.rename(currentFilePath, newFilePath, (err) => {
        if (err) {
          console.error("Error renaming file:", err);
        }
        console.log(`File renamed from ${currentFilePath} to ${newFilePath}`);
      });
      //todo  <----- End of changing file name according to id ----->

      //? <----Updating the file name in database with a new fileName ----->
      const updatePath = await db 
        .collection("complaints")
        .updateOne(
          { _id: new ObjectId(insertId) },
          { $set: { fileName: newFileName } }
        ); 
      console. log(updatePath);
      res.status(201).json(msg);
      console.log(complaints);
    } catch (error) {
      console.error("Error Raising complaints:", error);
      res
        .status(500)
        .json({ msg: "An error occurred while processing your request" });
    }
  }
);



///!  <<-------   NOTE:  API to send  image to frontend   ------>>

app.get("/api/complaints/image", async (req, res) => {
  const { fileName } = req.body;
  console.log(fileName);

  const filePath = path.join(__dirname, "uploads", fileName); //  directory tp get image

  try {
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ msg: "File not found" });
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).json({ Error: "Error fetching image" });
  }
});



/* <----------- FETCHING DATA FROM THE DATABASE  ---------------->*/

// ?   <<<<<<<< USER API's >>>>>>>>>>

//todo  <---- API to get specific user complaints ALL complaints---->
app.get("/api/user/complaints/all", async (req, res) => {
  try {
    const username = req.query.username;
    console.log(username);
    console.log(`complaints fetched by ${username}`);
    const complaints = await db
      .collection("complaints")
      .find({ complaint_id: username })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      // console.log(complaints)
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching complaints" });
  }
});

//todo  <---- API to get specific user complaints PENDING COMPLAINTS---->
app.get("/api/user/complaints/pending", async (req, res) => {
  try {
    const username = req.query.username;
    const msg = {
      msg: "Successfully fetched pending complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({ complaint_id: username, status: "pending" })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching pending complaints" });
  }
});

//todo  <---- API to get specific user  ASSIGNED COMPLAINTS---->
app.get("/api/user/complaints/assigned", async (req, res) => {
  try {
    const username = req.query.username;
    const msg = {
      msg: "Successfully fetched assigned complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({
        complaint_id: username,
        status: "assigned",
        technicianAssigned: true,
      })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching assigned complaints" });
  }
});

//todo  <---- API to get specific user complaints RESOLVED COMPLAINTS---->
app.get("/api/user/complaints/resolved", async (req, res) => {
  try {
    const username = req.query.username;
    const msg = {
      msg: "Successfully fetched resolved complaints",
    };
    console.log(username);

    const complaints = await db
      .collection("complaints")
      .find({
        complaint_id: username,
        status: "resolved",
        verified: false,
      })
      .toArray();

    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching resolved complaints" });
  }
});

//todo  <---- API to get specific user complaints CLOSED COMPLAINTS---->
app.get("/api/user/complaints/closed", async (req, res) => {
  try {
    const username = req.query.username;
    const msg = {
      msg: "Successfully fetched closed complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({ complaint_id: username, complaintClosed: true })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching closed complaints" });
  }
});

// ?   <<<<<<<< TECHNICIAN API's >>>>>>>>>>

//todo  <---- API to get specific TECHNICIAN   Pending COMPLAINTS ---->
app.get("/api/technician/complaints/pending", async (req, res) => {
  try {
    const technicianId = req.query.technicianId;
    console.log("Data started to be fetched");
    console.log(technicianId);
    const msg = {
      msg: "Successfully fetched pending complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({
        technicianId: technicianId,
        technicianAssigned: true,
        status: "assigned",
      })
      .toArray();
    if (complaints.length === 0) {
      console.log("Data  fetched");
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching pending complaints" });
  }
});

//todo  <---- API to get specific TECHNICIAN   Verified COMPLAINTS by user ---->
app.get("/api/technician/complaints/verified", async (req, res) => {
  try {
    const technicianId = req.query.technicianId;
    const msg = {
      msg: "Successfully fetched verified complaints by user",
    };
    const complaints = await db
      .collection("complaints")
      .find({
        technicianId: technicianId,
        verified: true,
        status: "resolved",
        complaintClosed: false,
      })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching verified complaints by user" });
  }
});
//todo  <---- API to get specific TECHNICIAN   Resolved COMPLAINTS ---->
app.get("/api/technician/complaints/resolved", async (req, res) => {
  try {
    const technicianId = req.query.technicianId;
    const msg = {
      msg: "Successfully fetched closed complaints",
    };
    console.log(`${technicianId}--resolved`);
    const complaints = await db
      .collection("complaints")
      .find({
        technicianId: technicianId,
        status: "resolved",
        verified: false,
      })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
      console.log(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching closed complaints" });
  }
});
//todo  <---- API to get specific TECHNICIAN   CLOSED COMPLAINTS ---->
app.get("/api/technician/complaints/closed", async (req, res) => {
  try {
    const technicianId = req.query.technicianId;
    const msg = {
      msg: "Successfully fetched closed complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({
        technicianId: technicianId,
        status: "resolved",
        verified: true,
        complaintClosed: true,
      })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching closed complaints" });
  }
});

// ?   <<<<<<<< ADMIN API's >>>>>>>>>>

//todo   <-----  API to access all  complaints by ADMIN  ----->
app.get("/api/admin/complaints/all", async (req, res) => {
  try {
    // const username = req.body.username;
    const msg = {
      msg: "All  complaints fetched",
    };
    const complaints = await db.collection("complaints").find().toArray();
    if (complaints.length === 0) {
      res.status(200).json({ msg: "No data found" });
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching all  complaints" });
  }
});

//todo   <-----  API to access all PENDING complaints by ADMIN  ----->
app.get("/api/admin/complaints/pending", async (req, res) => {
  try {
    // const username = req.body.username;
    const msg = {
      msg: "All pending complaints fetched",
    };
    const complaints = await db
      .collection("complaints")
      .find({ status: "pending" })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching all pending complaints" });
  }
});

//todo  <---- API to get  ALL user complaints ASSIGNED COMPLAINTS  TO ADMIN ---->
app.get("/api/admin/complaints/assigned", async (req, res) => {
  try {
    const msg = {
      msg: "Successfully fetched assigned technician to complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({ status: "assigned", technicianAssigned: true })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching assigned technician complaints" });
  }
});

//todo  <---- API to get  ALL user complaints Resolved COMPLAINTS  TO ADMIN ---->
app.get("/api/admin/complaints/resolved", async (req, res) => {
  try {
    const msg = {
      msg: "Successfully fetched verified complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({ status: "resolved", verified: false })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching verified complaints" });
  }
});

//todo  <---- API to get  ALL user complaints VERIFIED COMPLAINTS  TO ADMIN ---->
app.get("/api/admin/complaints/verified", async (req, res) => {
  try {
    const msg = {
      msg: "Successfully fetched verified complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({ verified: true, complaintClosed: false })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching verified complaints" });
  }
});

//todo  <---- API to get ALL   CLOSED COMPLAINTS  FOR ADMIN ---->
app.get("/api/admin/complaints/closed", async (req, res) => {
  try {
    const msg = {
      msg: "Successfully fetched closed complaints",
    };
    const complaints = await db
      .collection("complaints")
      .find({ complaintClosed: true })
      .toArray();
    if (complaints.length === 0) {
      res.status(200).json(complaints);
    } else {
      res.status(200).json(complaints);
    }
  } catch (err) {
    res.status(500).json({ error: "Error fetching closed complaints" });
  }
});

//?  <----------- API FOR MODIFYING COMPLAINT DATA ---------->

//todo  <---- API to update verified status by user ---->
app.post("/api/user/complaints/verified", async (req, res) => {
  try {
    // const username = req.body.username;er
    const verifiedByUserAt = time();
    const id = req.body._id.id;
    console.log(id);
    const msg = { msg: "complaint verification successful" };
    if (ObjectId.isValid(id)) {
      const complaints = await db
        .collection("complaints")
        .updateOne(
          { _id: new ObjectId(id), status: "resolved" },
          { $set: { verified: true, verifiedByUserAt: verifiedByUserAt } }
        );
      res.status(200).json(msg);
      console.log(complaints);
    } else {
      console.log("error ID");
      res.status(500).json({ error: "Wrong id format" });
    }
  } catch (err) {
    res.status(500).json({ error: "Error updating  verification status" });
  }
});

//todo  <---- API to update reopen complain by user ---->
app.post("/api/user/complaints/reopen", async (req, res) => {
  try {
    const reopenedByUserAt = time();
    const id = req.body._id.id;
    console.log(id);
    const msg = { msg: "complaint Reopened successful" };
    if (ObjectId.isValid(id)) {
      const complaints = await db
        .collection("complaints")
        .updateOne(
          { _id: new ObjectId(id), status: "resolved" },
          { $set: { status: "assigned", reopenedByUserAt: reopenedByUserAt } }
        );
      res.status(200).json(msg);
      console.log(complaints);
      console.log(complaints);
    } else {
      console.log("error ID");
      res.status(500).json({ error: "Wrong id format" });
    }
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error updating  reopening complain status" });
  }
});

//todo  <---- API to update COMPLAINT RESOLVED status by TECHNICIAN ---->
app.post("/api/technician/complaints/resolved", async (req, res) => {
  try {
    // const technician_Id = req.body.technicianId;
    // const complaint_id = req.body.complaint_id;
    const complainResolvedAt = time();
    const id = req.body._id.id;
    const msg = { msg: "complaint resolved status updated successfully" };
    const complaints = await db
      .collection("complaints")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "resolved", complainResolvedAt: complainResolvedAt } }
      );
    res.status(200).json(msg);
    console.log(complaints);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error updating resolved status of  the complaint" });
  }
});

//todo  <---- API to assign Technician to  a COMPLAINT by ADMIN ---->
app.post("/api/admin/complaints/assignedtechnician", async (req, res) => {
  try {
    const technicianAssignedAt = time();
    const technician_Id = req.body.technicianId;
    const id = req.body._id.id;
    console.log(technician_Id);
    console.log(id);
    const msg = { msg: "Technician assigned and  status updated successfully" };
    const complaints = await db.collection("complaints").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "assigned",
          technicianAssigned: true,
          technicianId: technician_Id,
          technicianAssignedAt: technicianAssignedAt,
        },
      }
    );
    res.status(200).json(msg);
    console.log(complaints);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error updating resolved status of  the complaint" });
  }
});

//todo  <---- API to update COMPLAINT CLOSED status by ADMIN ---->
app.post("/api/admin/complaints/closecomplain", async (req, res) => {
  try {
    // const complaint_id = req.body.complaint_id;
    const complainClosedAt = time();
    const id = req.body._id.id;
    console.log(id);
    const msg = { msg: "complaint closed successfully" };
    const complaints = await db
      .collection("complaints")
      .updateOne(
        { _id: new ObjectId(id), verified: true },
        { $set: { complaintClosed: true, complainClosedAt: complainClosedAt } }
      );
    res.status(200).json(msg);
  } catch (err) {
    res.status(500).json({ error: "Error closing the complaint" });
  }
});

/* <----- PORT RUNNING  ----> */

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});
