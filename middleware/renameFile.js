const fs = require("fs");
const path = require("path");

// Middleware function to rename a file
const renameFileMiddleware = (req, res, next) => {
  const { oldFileName, newFileName } = req.body;
  const directory = path.join(__dirname, "../uploads"); // Change 'images' to your directory if necessary

  if (!oldFileName || !newFileName) {
    return res.status(400).send("Old file name and new file name are required");
  }

  const oldPath = path.join(directory, oldFileName);
  const newPath = path.join(directory, newFileName);

  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      return res.status(500).send(`Error renaming file: ${err.message}`);
    }
    console.log(`File renamed from ${oldFileName} to ${newFileName}`);
    next();
  });
};

module.exports = renameFileMiddleware;
