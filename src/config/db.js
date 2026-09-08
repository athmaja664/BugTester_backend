require("dotenv").config();
const { Pool } = require("pg");

const con = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl:
    process.env.DB_HOST === "localhost" ||
    process.env.DB_HOST === "127.0.0.1"
      ? false
      : { rejectUnauthorized: false },
});

con
  .connect()
  .then((client) => {
    console.log("Supabase PostgreSQL connected");
    client.release();
  })
  .catch((err) => console.log(err));

con.on("error", (err) => {
  console.error("Unexpected error on idle client", err.message);
});

module.exports = con;